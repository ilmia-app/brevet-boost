import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Loader2, RefreshCw, Sparkles, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface QcmRow {
  id: string;
  bloc_id: string;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  reponse_correcte: string; // "A" | "B" | "C" | "D"
  explication: string;
}

interface QcmQuestion {
  id: string;
  bloc_id: string;
  question: string;
  choix: string[];
  bonne_reponse: number; // 0..3
  reponse_correcte_lettre: string; // "A".."D"
  explication: string;
}

const LETTERS = ["A", "B", "C", "D"];

const storageKey = (userId: string) => {
  const today = new Date().toISOString().split("T")[0];
  return `sprint-qcm:${userId}:${today}`;
};

const seriesCountKey = (userId: string) => {
  const today = new Date().toISOString().split("T")[0];
  return `sprint-qcm-series:${userId}:${today}`;
};

const MAX_SERIES_PER_DAY = 5;

const readSeriesCount = (userId: string): number => {
  try {
    const v = parseInt(localStorage.getItem(seriesCountKey(userId)) || "0", 10);
    return Number.isFinite(v) ? v : 0;
  } catch {
    return 0;
  }
};

const writeSeriesCount = (userId: string, n: number) => {
  try {
    localStorage.setItem(seriesCountKey(userId), String(n));
  } catch { /* noop */ }
};

const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const Qcm = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<QcmQuestion[] | null>(null);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [finished, setFinished] = useState(false);
  const [completionWritten, setCompletionWritten] = useState(false);
  const [pendingChoice, setPendingChoice] = useState<number | null>(null);
  const [seriesCount, setSeriesCount] = useState(0);
  const [completionCounted, setCompletionCounted] = useState(false);

  const persist = (patch: Partial<{ questions: QcmQuestion[]; current: number; answers: number[]; finished: boolean; completionWritten: boolean }>) => {
    if (!user) return;
    try {
      const key = storageKey(user.id);
      const prev = JSON.parse(localStorage.getItem(key) || "{}");
      localStorage.setItem(key, JSON.stringify({ ...prev, ...patch }));
    } catch (e) {
      console.error("[Qcm] persist failed:", e);
    }
  };

  const loadQcm = async (force = false) => {
    if (!user) return;
    if (readSeriesCount(user.id) >= MAX_SERIES_PER_DAY) {
      toast({ title: "Limite atteinte", description: "Tu as fait tes 5 séries du jour, bravo ! 💪" });
      return;
    }
    setLoading(true);
    setQuestions(null);
    setCurrent(0);
    setAnswers([]);
    setFinished(false);
    setCompletionWritten(false);
    setCompletionCounted(false);
    if (force) {
      try { localStorage.removeItem(storageKey(user.id)); } catch { /* noop */ }
    }

    try {
      const { data, error } = await supabase
        .from("qcm")
        .select("id, bloc_id, question, option_a, option_b, option_c, option_d, reponse_correcte, explication")
        // Techno volontairement exclue du QCM
        .not("bloc_id", "ilike", "TEC-%");
      if (error) throw new Error(error.message);

      const rows = (data as QcmRow[] | null) || [];
      if (rows.length === 0) {
        throw new Error("Aucune question disponible pour le moment.");
      }

      const picked = shuffle(rows).slice(0, 5).map<QcmQuestion>((r) => {
        const lettre = (r.reponse_correcte || "").trim().toUpperCase();
        const idx = LETTERS.indexOf(lettre);
        if (idx === -1) {
          console.warn("[Qcm] reponse_correcte invalide pour question", r.id, "=", r.reponse_correcte);
        }
        return {
          id: r.id,
          bloc_id: r.bloc_id,
          question: r.question,
          choix: [r.option_a, r.option_b, r.option_c, r.option_d],
          bonne_reponse: idx >= 0 ? idx : 0,
          reponse_correcte_lettre: lettre,
          explication: r.explication,
        };
      });

      setQuestions(picked);
      persist({ questions: picked, current: 0, answers: [], finished: false, completionWritten: false });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erreur de chargement";
      toast({ title: "Impossible de charger le QCM", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    try {
      setSeriesCount(readSeriesCount(user!.id));
      const raw = localStorage.getItem(storageKey(user.id));
      if (raw) {
        const saved = JSON.parse(raw) as {
          questions?: QcmQuestion[];
          current?: number;
          answers?: number[];
          finished?: boolean;
          completionWritten?: boolean;
        };
        if (saved.questions && Array.isArray(saved.questions) && saved.questions.length > 0) {
          setQuestions(saved.questions);
          setCurrent(saved.current ?? 0);
          setAnswers(saved.answers ?? []);
          setFinished(!!saved.finished);
          setCompletionWritten(!!saved.completionWritten);
          setCompletionCounted(!!saved.finished);
          setLoading(false);
          return;
        }
      }
    } catch (e) {
      console.error("[Qcm] restore failed:", e);
    }
    loadQcm();
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

  const saveAnswer = async (q: QcmQuestion, chosenIdx: number) => {
    if (!user) return;
    try {
      const reponse_choisie = LETTERS[chosenIdx];
      const est_correcte = reponse_choisie === q.reponse_correcte_lettre;
      const prochaine = new Date();
      prochaine.setDate(prochaine.getDate() + (est_correcte ? 7 : 1));
      const prochaine_revision = prochaine.toISOString().split("T")[0];
      await supabase.from("qcm_results").insert({
        user_id: user.id,
        bloc_id: q.bloc_id,
        question: q.question,
        reponse_correcte: q.reponse_correcte_lettre,
        reponse_choisie,
        est_correcte,
        date_reponse: new Date().toISOString(),
        prochaine_revision,
      });
    } catch (e) {
      console.error("[Qcm] saveAnswer failed:", e);
    }
  };

  const handleSelect = (idx: number) => {
    if (!questions) return;
    if (answers[current] !== undefined) return;
    setPendingChoice(idx);
  };

  const handleValidate = () => {
    if (!questions || pendingChoice === null) return;
    if (answers[current] !== undefined) return;
    const next = [...answers];
    next[current] = pendingChoice;
    setAnswers(next);
    saveAnswer(questions[current], pendingChoice);
    persist({ answers: next });
  };

  const writeCompletion = async () => {
    if (!user || completionWritten) return;
    try {
      const today = new Date().toISOString().split("T")[0];
      await supabase.from("completions").upsert(
        { user_id: user.id, bloc_id: "QCM-DAILY", date_completion: today, completed: true },
        { onConflict: "user_id,bloc_id,date_completion" },
      );
      setCompletionWritten(true);
      persist({ completionWritten: true });
    } catch (e) {
      console.error("[Qcm] completion write failed:", e);
    }
  };

  const handleNext = () => {
    if (!questions) return;
    if (current + 1 < questions.length) {
      const nextIdx = current + 1;
      setCurrent(nextIdx);
      persist({ current: nextIdx });
    } else {
      setFinished(true);
      persist({ finished: true });
      writeCompletion();
      if (user && !completionCounted) {
        const next = readSeriesCount(user.id) + 1;
        writeSeriesCount(user.id, next);
        setSeriesCount(next);
        setCompletionCounted(true);
      }
    }
    setPendingChoice(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3 p-6 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Je prépare ton Sprint QCM…</p>
      </div>
    );
  }

  if (!questions || questions.length === 0) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-base font-medium">Erreur !</p>
        <p className="text-sm text-muted-foreground max-w-sm">
          Contacte-nous, nous réglerons le problème immédiatement !
        </p>
        <div className="flex gap-2">
          <Button onClick={() => loadQcm()}>Réessayer</Button>
          <Button variant="ghost" onClick={() => navigate("/dashboard")}>Retour</Button>
        </div>
      </div>
    );
  }

  if (finished) {
    const ratio = total > 0 ? score / total : 0;
    const message =
      ratio === 1 ? "Parfait, sans-faute ! 🎯" :
      ratio >= 0.8 ? "Excellent travail ! 💪" :
      ratio >= 0.6 ? "Solide, continue comme ça !" :
      ratio >= 0.4 ? "Pas mal, encore un peu d'entraînement." :
      "Ne lâche rien, recommence !";
    const limitReached = seriesCount >= MAX_SERIES_PER_DAY;

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
              disabled={limitReached}
              onClick={() => loadQcm(true)}
            >
              <RefreshCw className="w-4 h-4 mr-2" /> Nouvelle série
            </Button>
            <Button className="flex-1 sprint-gradient text-primary-foreground" onClick={() => navigate("/dashboard")}>
              Terminer
            </Button>
          </div>
          <p className="text-xs text-center text-muted-foreground">
            {limitReached
              ? "Tu as fait tes 5 séries du jour, bravo ! 💪"
              : `Série ${seriesCount} / ${MAX_SERIES_PER_DAY} effectuée${seriesCount > 1 ? "s" : ""} aujourd'hui.`}
          </p>
        </div>
      </div>
    );
  }

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

        <Card className="rounded-2xl">
          <CardContent className="p-5 space-y-4">
            <p className="text-base font-medium leading-snug">{q.question}</p>
            <div className="space-y-2">
              {q.choix.map((c, idx) => {
                const isChosen = answered ? chosen === idx : pendingChoice === idx;
                const isCorrect = idx === q.bonne_reponse;
                let cls = "border-border bg-card hover:bg-accent/30";
                if (answered) {
                  if (isCorrect) cls = "border-secondary/60 bg-secondary/10";
                  else if (chosen === idx) cls = "border-destructive/60 bg-destructive/10";
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
                      {LETTERS[idx]}
                    </span>
                    <span className="text-sm flex-1">{c}</span>
                    {answered && isCorrect && (
                      <CheckCircle2 className="w-5 h-5 text-secondary shrink-0" />
                    )}
                    {answered && chosen === idx && !isCorrect && (
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

        {answered ? (
          <Button
            className="w-full sprint-gradient text-primary-foreground"
            onClick={handleNext}
          >
            {current + 1 < total ? "Question suivante" : "Voir mon score"}
          </Button>
        ) : (
          <Button
            className="w-full sprint-gradient text-primary-foreground"
            disabled={pendingChoice === null}
            onClick={handleValidate}
          >
            Valider ma réponse
          </Button>
        )}
      </div>
    </div>
  );
};

export default Qcm;