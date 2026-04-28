import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Loader2, RefreshCw, Sparkles, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface QcmQuestion {
  question: string;
  choix: string[];
  bonne_reponse: number;
  explication: string;
}

interface BlocLite {
  id?: string;
  matiere: string;
  titre?: string;
  theme: string | null;
}

const SUBJECT_BADGE: Record<string, string> = {
  Maths: "bg-blue-500 text-white",
  Français: "bg-purple-500 text-white",
  Histoire: "bg-orange-500 text-white",
  Géographie: "bg-emerald-500 text-white",
  EMC: "bg-yellow-500 text-white",
  Physique: "bg-red-500 text-white",
  SVT: "bg-green-700 text-white",
  Techno: "bg-gray-500 text-white",
};

const Qcm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [questions, setQuestions] = useState<QcmQuestion[] | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]); // chosen index per question
  const [finished, setFinished] = useState(false);
  const [completionWritten, setCompletionWritten] = useState(false);

  // Charge les 3 bloc_id complétés aujourd'hui par l'utilisateur, puis génère le QCM
  const loadQcm = async (forceNew = false) => {
    if (!user) return;
    setGenerating(true);
    setQuestions(null);
    setErrorMsg(null);
    setCurrent(0);
    setAnswers([]);
    setFinished(false);
    setCompletionWritten(false);

    try {
      // Source unique : les bloc_id complétés aujourd'hui par l'utilisateur connecté
      const today = new Date().toISOString().split("T")[0];
      const { data: completionsRows, error: completionsErr } = await supabase
        .from("completions")
        .select("bloc_id")
        .eq("user_id", user.id)
        .eq("date_completion", today)
        .eq("completed", true);
      if (completionsErr) throw new Error(completionsErr.message);

      const blocIds = Array.from(
        new Set(
          (completionsRows || [])
            .map((c) => c.bloc_id)
            .filter((id): id is string => !!id && id !== "QCM-DAILY"),
        ),
      );

      if (blocIds.length === 0) {
        throw new Error(
          "Tu dois d'abord terminer tes 3 tâches du jour avant de lancer le QCM.",
        );
      }

      const { data: blocsRows, error: blocsErr } = await supabase
        .from("blocs_examen")
        .select("id, matiere, titre, theme")
        .in("id", blocIds);
      if (blocsErr) throw new Error(blocsErr.message);
      const dailyBlocs: BlocLite[] = (blocsRows as BlocLite[] | null) || [];

      if (dailyBlocs.length === 0) {
        throw new Error("Impossible de retrouver les blocs complétés aujourd'hui.");
      }

      const finalSubjects = Array.from(new Set(dailyBlocs.map((b) => b.matiere))).slice(0, 3);
      setSubjects(finalSubjects);

      const { data, error } = await supabase.functions.invoke("generate-qcm", {
        body: {
          subjects: finalSubjects,
          blocs: dailyBlocs.map((b) => ({
            id: b.id,
            matiere: b.matiere,
            titre: b.titre || "",
            theme: b.theme || "",
          })),
          force_new: forceNew,
        },
      });

      // Extraire un message lisible même quand l'edge function renvoie un statut d'erreur
      // (FunctionsHttpError contient la réponse brute, dont le body JSON {error: "..."})
      if (error) {
        let serverMsg = error.message || "Erreur";
        const ctx = (error as unknown as { context?: Response }).context;
        if (ctx && typeof ctx.json === "function") {
          try {
            const body = await ctx.json();
            if (body?.error) serverMsg = body.error;
          } catch { /* ignore */ }
        }
        throw new Error(serverMsg);
      }
      if (!data?.questions || !Array.isArray(data.questions)) {
        throw new Error("Réponse vide");
      }
      setQuestions(data.questions as QcmQuestion[]);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erreur de génération";
      setErrorMsg(msg);
      toast({ title: "Impossible de charger le QCM", description: msg, variant: "destructive" });
    } finally {
      setGenerating(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    loadQcm(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const score = useMemo(() => {
    if (!questions) return 0;
    let s = 0;
    answers.forEach((a, i) => {
      if (questions[i] && a === questions[i].bonne_reponse) s++;
    });
    return s;
  }, [answers, questions]);

  const total = questions?.length || 0;
  const progressPct = total > 0 ? Math.round((current / total) * 100) : 0;

  const handleSelect = (idx: number) => {
    if (!questions) return;
    if (answers[current] !== undefined) return; // déjà répondu
    const next = [...answers];
    next[current] = idx;
    setAnswers(next);
  };

  const handleNext = () => {
    if (!questions) return;
    if (current + 1 < questions.length) {
      setCurrent(current + 1);
    } else {
      setFinished(true);
      writeCompletion();
    }
  };

  // Marque la tâche QCM comme complétée pour aujourd'hui
  const writeCompletion = async () => {
    if (!user || completionWritten) return;
    try {
      const today = new Date().toISOString().split("T")[0];
      await supabase.from("completions").upsert(
        { user_id: user.id, bloc_id: "QCM-DAILY", date_completion: today, completed: true },
        { onConflict: "user_id,bloc_id,date_completion" },
      );
      setCompletionWritten(true);
    } catch (e) {
      console.error("[Qcm] completion write failed:", e);
    }
  };

  if (loading || generating) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3 p-6 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">
          Je prépare ton Sprint QCM
          {subjects.length > 0 && ` (${subjects.join(", ")})`}…
        </p>
      </div>
    );
  }

  if (!questions || questions.length === 0) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-base font-medium">
          Erreur !
        </p>
        <p className="text-sm text-muted-foreground max-w-sm">
          Contacte-nous, nous réglerons le problème immédiatement !
        </p>
        <div className="flex gap-2">
          <Button onClick={() => loadQcm(true)}>
            Réessayer
          </Button>
          <Button variant="ghost" onClick={() => navigate("/dashboard")}>
            Retour
          </Button>
        </div>
      </div>
    );
  }

  // Écran final
  if (finished) {
    const ratio = total > 0 ? score / total : 0;
    const message =
      ratio === 1 ? "Parfait, sans-faute ! 🎯" :
      ratio >= 0.8 ? "Excellent travail ! 💪" :
      ratio >= 0.6 ? "Solide, continue comme ça !" :
      ratio >= 0.4 ? "Pas mal, encore un peu d'entraînement." :
      "Ne lâche rien, recommence !";

    return (
      <div className="min-h-screen bg-background pb-8">
        <div className="max-w-lg mx-auto px-4 pt-6 space-y-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")} aria-label="Retour">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-2xl font-bold">Sprint QCM terminé</h1>
          </div>

          <Card className="rounded-2xl">
            <CardContent className="p-6 text-center space-y-4">
              <div className="w-20 h-20 mx-auto rounded-full sprint-gradient flex items-center justify-center shadow-md">
                <Sparkles className="w-10 h-10 text-white" />
              </div>
              <div>
                <p className="text-4xl font-bold">{score} / {total}</p>
                <p className="text-sm text-muted-foreground mt-1">{message}</p>
              </div>
              <Progress value={ratio * 100} className="h-2.5 rounded-full" />
            </CardContent>
          </Card>

          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Récapitulatif</h2>
            {questions.map((q, i) => {
              const ok = answers[i] === q.bonne_reponse;
              return (
                <Card key={i} className="rounded-xl">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-start gap-2">
                      {ok ? (
                        <CheckCircle2 className="w-5 h-5 text-secondary shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                      )}
                      <p className="text-sm font-medium">{q.question}</p>
                    </div>
                    {!ok && (
                      <p className="text-xs text-muted-foreground pl-7">
                        Bonne réponse : <span className="font-medium text-foreground">{q.choix[q.bonne_reponse]}</span>
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground pl-7 italic">{q.explication}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => loadQcm(true)}
            >
              <RefreshCw className="w-4 h-4 mr-2" /> Nouveau QCM
            </Button>
            <Button className="flex-1 sprint-gradient text-primary-foreground" onClick={() => navigate("/dashboard")}>
              Retour
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Écran question
  const q = questions[current];
  const chosen = answers[current];
  const answered = chosen !== undefined;

  return (
    <div className="min-h-screen bg-background pb-8">
      <div className="max-w-lg mx-auto px-4 pt-6 space-y-5">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")} aria-label="Retour">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold flex-1">Sprint QCM</h1>
          <span className="text-sm text-muted-foreground">{current + 1} / {total}</span>
        </div>

        <Progress value={progressPct} className="h-2 rounded-full" />

        <div className="flex flex-wrap gap-1.5">
          {subjects.map((s) => (
            <Badge key={s} className={cn(SUBJECT_BADGE[s] || "bg-muted text-foreground", "text-[10px]")}>
              {s}
            </Badge>
          ))}
        </div>

        <Card className="rounded-2xl">
          <CardContent className="p-5 space-y-4">
            <p className="text-base font-medium leading-snug">{q.question}</p>
            <div className="space-y-2">
              {q.choix.map((c, idx) => {
                const isChosen = chosen === idx;
                const isCorrect = idx === q.bonne_reponse;
                let cls = "border-border bg-card hover:bg-accent/30";
                if (answered) {
                  if (isCorrect) cls = "border-secondary/60 bg-secondary/10";
                  else if (isChosen) cls = "border-destructive/60 bg-destructive/10";
                  else cls = "border-border bg-card opacity-70";
                } else if (isChosen) {
                  cls = "border-primary bg-accent/40";
                }
                return (
                  <button
                    key={idx}
                    onClick={() => handleSelect(idx)}
                    disabled={answered}
                    className={cn(
                      "w-full text-left rounded-xl border p-3 transition-all flex items-start gap-3",
                      cls,
                    )}
                  >
                    <span className="w-6 h-6 rounded-full bg-muted text-xs font-semibold flex items-center justify-center shrink-0 mt-0.5">
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span className="text-sm flex-1">{c}</span>
                    {answered && isCorrect && (
                      <CheckCircle2 className="w-5 h-5 text-secondary shrink-0" />
                    )}
                    {answered && isChosen && !isCorrect && (
                      <XCircle className="w-5 h-5 text-destructive shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {answered && (
              <div className="rounded-lg bg-accent/30 border border-accent p-3">
                <p className="text-xs text-muted-foreground italic">{q.explication}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Button
          className="w-full sprint-gradient text-primary-foreground"
          disabled={!answered}
          onClick={handleNext}
        >
          {current + 1 < total ? "Question suivante" : "Voir mon score"}
        </Button>
      </div>
    </div>
  );
};

export default Qcm;