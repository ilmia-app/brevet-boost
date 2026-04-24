import { useState, useEffect, useRef, useCallback } from "react";
import katex from "katex";
import DOMPurify from "dompurify";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, Play, Pause, CheckCircle2, Sparkles, Loader2, RefreshCw } from "lucide-react";
import ExerciseChart, { type GraphiqueData } from "@/components/work/ExerciseChart";

const SUBJECT_COLORS: Record<string, string> = {
  Maths: "bg-blue-500 text-white",
  Français: "bg-purple-500 text-white",
  Histoire: "bg-orange-500 text-white",
  Géographie: "bg-emerald-500 text-white",
  EMC: "bg-yellow-500 text-white",
  Physique: "bg-red-500 text-white",
  SVT: "bg-green-700 text-white",
  Techno: "bg-gray-500 text-white",
};

const SUBJECT_BG_COLORS: Record<string, string> = {
  Maths: "bg-blue-50 border-blue-400",
  Français: "bg-purple-50 border-purple-400",
  Histoire: "bg-orange-50 border-orange-400",
  Géographie: "bg-emerald-50 border-emerald-400",
  EMC: "bg-yellow-50 border-yellow-400",
  Physique: "bg-red-50 border-red-400",
  SVT: "bg-green-50 border-green-600",
  Techno: "bg-gray-50 border-gray-400",
};

interface BlocData {
  id: string;
  matiere: string;
  titre: string;
  consigne_eleve: string | null;
  objectifs_pedagogiques: string | null;
  methode_id: string | null;
}

interface Exercise {
  id: string;
  enonce: string | null;
  corrige: string | null;
  annale_source: string | null;
  graphique?: GraphiqueData | null;
  questions?: string[] | null;
}

const WorkSession = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const blocId = searchParams.get("bloc_id") || searchParams.get("bloc") || "";
  const annaleSource = searchParams.get("annale_source") || "";
  const mode = searchParams.get("mode") || "";
  const isAiMode = mode === "ai";
  console.log("[WorkSession] bloc_id reçu:", blocId, "mode:", mode);

  const [bloc, setBloc] = useState<BlocData | null>(null);
  const [methodeSteps, setMethodeSteps] = useState<string[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [notes, setNotes] = useState("");
  const [completed, setCompleted] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiCorrigeCache, setAiCorrigeCache] = useState<string>("");
  const [regenLoading, setRegenLoading] = useState(false);
  const [switchAiLoading, setSwitchAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string>("");

  // Timer
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Corrigé modal
  const [corrigeOpen, setCorrigeOpen] = useState(false);
  const [corrigeContent, setCorrigeContent] = useState<string>("");
  const [corrigeIsAI, setCorrigeIsAI] = useState(false);
  const [corrigeLoading, setCorrigeLoading] = useState(false);

  // Fetch bloc + méthode + exercice (simple, robuste)
  useEffect(() => {
    if (!blocId) return;
    let cancelled = false;

    (async () => {
      // 1. Bloc
      const { data: blocData, error: blocErr } = await supabase
        .from("blocs_examen")
        .select("id, matiere, titre, consigne_eleve, objectifs_pedagogiques, methode_id")
        .eq("id", blocId)
        .maybeSingle();
      if (blocErr) console.error("[WorkSession] bloc error:", blocErr);
      if (cancelled) return;
      if (blocData) setBloc(blocData);

      // 2. Méthode
      if (blocData?.methode_id) {
        const { data: methData } = await supabase
          .from("methodes")
          .select("etapes")
          .eq("id", blocData.methode_id)
          .maybeSingle();
        if (cancelled) return;
        if (methData?.etapes) {
          try {
            const parsed = JSON.parse(methData.etapes);
            setMethodeSteps(Array.isArray(parsed) ? parsed : methData.etapes.split("\n").filter(Boolean));
          } catch {
            setMethodeSteps(methData.etapes.split("\n").filter(Boolean));
          }
        }
      }

      // 3. Exercice
      if (isAiMode && blocData) {
        // Mode IA : générer un exo + corrigé via edge function
        setAiLoading(true);
        setAiError("");
        let gen: any = null;
        let lastErr: any = null;
        // Retry jusqu'à 3 tentatives pour FORCER la génération
        for (let attempt = 0; attempt < 3 && !cancelled; attempt++) {
          try {
            const { data, error: genErr } = await supabase.functions.invoke("generate-exercice", {
              body: {
                bloc_id: blocData.id,
                titre: blocData.titre,
                matiere: blocData.matiere,
                objectifs: blocData.objectifs_pedagogiques,
                etapes: methodeSteps.join("\n"),
              },
            });
            if (genErr) throw genErr;
            if (data?.enonce && data?.corrige) {
              gen = data;
              break;
            }
            lastErr = new Error("Réponse IA incomplète");
          } catch (e) {
            lastErr = e;
            console.error(`[WorkSession] tentative ${attempt + 1} échouée:`, e);
          }
          await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
        }
        if (cancelled) return;
        if (gen) {
          setExercise({
            id: `ai-${blocData.id}`,
            enonce: gen.enonce,
            corrige: null,
            annale_source: null,
            graphique: gen.graphique || null,
            questions: gen.questions || null,
          });
          setAiCorrigeCache(gen.corrige || "");
        } else {
          console.error("[WorkSession] génération IA impossible après 3 tentatives:", lastErr);
          setAiError("La génération a échoué. Réessaye dans un instant.");
        }
        if (!cancelled) setAiLoading(false);
      } else {
        let exerciseQuery = supabase
          .from("exercices")
          .select("id, enonce, corrige, annale_source")
          .eq("bloc_id", blocId);

        if (annaleSource) {
          exerciseQuery = exerciseQuery.eq("annale_source", annaleSource);
        }

        const { data: exData, error: exErr } = await exerciseQuery.limit(1);
        console.log("[WorkSession] filtre annale:", annaleSource || "aucun");
        console.log("[WorkSession] exercices trouvés pour", blocId, ":", exData?.length || 0, exErr || "");
        if (cancelled) return;
        if (exData && exData.length > 0) setExercise(exData[0]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [blocId, isAiMode, annaleSource]);

  // Timer tick
  useEffect(() => {
    if (timerRunning) {
      intervalRef.current = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [timerRunning]);

  const renderMathText = useCallback((text: string) => {
    const escaped = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    const withKatex = escaped.replace(/\$([^$]+)\$/g, (_, math) => {
      try {
        return katex.renderToString(math, { throwOnError: false });
      } catch {
        return math;
      }
    });
    return DOMPurify.sanitize(withKatex);
  }, []);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  const handleComplete = useCallback(async () => {
    setTimerRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (user && blocId) {
      const today = new Date().toISOString().split("T")[0];
      await supabase.from("completions").upsert(
        { user_id: user.id, bloc_id: blocId, date_completion: today, completed: true },
        { onConflict: "user_id,bloc_id,date_completion" }
      );
    }

    // Ouvrir la modale de corrigé
    setCorrigeOpen(true);

    if (isAiMode && aiCorrigeCache) {
      // Mode IA : corrigé déjà généré avec l'énoncé
      setCorrigeContent(aiCorrigeCache);
      setCorrigeIsAI(true);
    } else if (exercise?.corrige) {
      // Corrigé officiel
      setCorrigeContent(exercise.corrige);
      setCorrigeIsAI(false);
    } else {
      // Fallback : générer un corrigé générique via l'ancienne function
      setCorrigeIsAI(true);
      setCorrigeLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke("generate-corrige", {
          body: {
            titre: bloc?.titre,
            matiere: bloc?.matiere,
            objectifs: bloc?.objectifs_pedagogiques,
            etapes: methodeSteps.join("\n"),
          },
        });
        if (error) throw error;
        setCorrigeContent(data?.corrige || "Impossible de générer le corrigé.");
      } catch (e) {
        console.error("[WorkSession] erreur génération corrigé:", e);
        setCorrigeContent("Désolé, impossible de générer le corrigé pour le moment. Réessaye plus tard.");
      } finally {
        setCorrigeLoading(false);
      }
    }
  }, [user, blocId, exercise, bloc, methodeSteps, isAiMode, aiCorrigeCache]);

  const handleCloseAndReturn = useCallback(() => {
    setCorrigeOpen(false);
    setCompleted(true);
    setTimeout(() => navigate(`/dashboard?task_completed=${blocId}`), 800);
  }, [blocId, navigate]);

  const handleGenerateAlternative = useCallback(async () => {
    if (!bloc) return;
    setRegenLoading(true);
    setAiError("");
    let gen: any = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const { data, error: genErr } = await supabase.functions.invoke("generate-exercice", {
          body: {
            bloc_id: bloc.id,
            titre: bloc.titre,
            matiere: bloc.matiere,
            objectifs: bloc.objectifs_pedagogiques,
            etapes: methodeSteps.join("\n"),
          },
        });
        if (genErr) throw genErr;
        if (data?.enonce && data?.corrige) { gen = data; break; }
      } catch (e) {
        console.error(`[WorkSession] alternative tentative ${attempt + 1}:`, e);
      }
      await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
    }
    if (gen) {
      setExercise({
        id: `ai-${bloc.id}-${Date.now()}`,
        enonce: gen.enonce,
        corrige: null,
        annale_source: null,
        graphique: gen.graphique || null,
        questions: gen.questions || null,
      });
      setAiCorrigeCache(gen.corrige || "");
    } else {
      setAiError("La génération a échoué. Réessaye dans un instant.");
    }
    setRegenLoading(false);
  }, [bloc, methodeSteps]);

  const handleSwitchToAi = useCallback(async () => {
    if (!bloc) return;
    setSwitchAiLoading(true);
    setAiError("");
    let gen: any = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const { data, error: genErr } = await supabase.functions.invoke("generate-exercice", {
          body: {
            bloc_id: bloc.id,
            titre: bloc.titre,
            matiere: bloc.matiere,
            objectifs: bloc.objectifs_pedagogiques,
            etapes: methodeSteps.join("\n"),
          },
        });
        if (genErr) throw genErr;
        if (data?.enonce && data?.corrige) { gen = data; break; }
      } catch (e) {
        console.error(`[WorkSession] switch IA tentative ${attempt + 1}:`, e);
      }
      await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
    }
    if (gen) {
      setExercise({
        id: `ai-${bloc.id}-${Date.now()}`,
        enonce: gen.enonce,
        corrige: null,
        annale_source: null,
        graphique: gen.graphique || null,
        questions: gen.questions || null,
      });
      setAiCorrigeCache(gen.corrige || "");
      const url = new URL(window.location.href);
      url.searchParams.set("mode", "ai");
      window.history.replaceState({}, "", url.toString());
    } else {
      setAiError("La génération a échoué. Réessaye dans un instant.");
    }
    setSwitchAiLoading(false);
  }, [bloc, methodeSteps]);

  if (!blocId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <p className="text-muted-foreground text-sm text-center">Aucun bloc sélectionné. Reviens au tableau de bord.</p>
      </div>
    );
  }

  if (!bloc) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Chargement…</p>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-4">
        <div className="w-16 h-16 rounded-full sprint-gradient flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-primary-foreground" />
        </div>
        <h2 className="text-xl font-bold text-center">Bravo, séance terminée ! 🎉</h2>
        <p className="text-muted-foreground text-sm text-center">Retour au tableau de bord…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-8">
      <div className="max-w-lg mx-auto px-4 pt-4 space-y-6">
        <button onClick={() => navigate("/dashboard")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> Retour au tableau de bord
        </button>

        {/* Header */}
        <section className="space-y-3">
          <Badge className={SUBJECT_COLORS[bloc.matiere] || "bg-muted text-foreground"}>
            {bloc.matiere}
          </Badge>
          <h1 className="text-xl font-bold leading-tight">{bloc.titre}</h1>

          {/* Timer */}
          <div className="flex flex-col items-center gap-3 pt-2">
            <div className="text-4xl font-bold tabular-nums">{formatTime(elapsedSeconds)}</div>
            <Button
              onClick={() => setTimerRunning((r) => !r)}
              size="sm"
              className="rounded-full sprint-gradient text-primary-foreground gap-1.5"
            >
              {timerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {timerRunning ? "Pause" : "Démarrer"}
            </Button>
          </div>
        </section>

        {/* Exercise section - conditionnel */}
        {aiLoading ? (
          <section className="space-y-3">
            <Card className="border-l-4 border-l-primary">
              <CardContent className="p-6 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <p className="text-sm text-muted-foreground text-center">
                  Je te prépare un exercice personnalisé !
                </p>
              </CardContent>
            </Card>
          </section>
        ) : aiError && !exercise ? (
          <section className="space-y-3">
            <Card className="border-l-4 border-l-destructive">
              <CardContent className="p-6 flex flex-col items-center justify-center gap-3 text-center">
                <p className="text-sm text-foreground font-medium">{aiError}</p>
                <Button
                  size="sm"
                  onClick={handleGenerateAlternative}
                  disabled={regenLoading}
                  className="gap-1.5"
                >
                  {regenLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  Réessayer
                </Button>
              </CardContent>
            </Card>
          </section>
        ) : exercise ? (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" /> Ton exercice
            </h2>
            {exercise.annale_source && (
              <Badge variant="outline" className="text-xs font-medium border-primary/30 text-primary bg-primary/5">
                {isAiMode ? "✨" : "📜"} {exercise.annale_source}
              </Badge>
            )}
            {exercise.enonce && (
              <Card className="border-l-4 border-l-primary">
                <CardContent className="p-4 bg-accent/30 rounded-r-lg">
                  <div className="text-sm leading-relaxed prose prose-sm max-w-none prose-headings:font-semibold prose-headings:text-foreground prose-strong:text-foreground">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm, remarkMath]}
                      rehypePlugins={[rehypeKatex]}
                    >
                      {exercise.enonce}
                    </ReactMarkdown>
                  </div>
                  {exercise.graphique && exercise.graphique.labels?.length > 0 && (
                    <div className="mt-4 bg-background rounded-lg p-3 border border-border">
                      <ExerciseChart graphique={exercise.graphique} />
                    </div>
                  )}
                  {exercise.questions && exercise.questions.length > 0 && (
                    <ol className="mt-4 space-y-2 text-sm leading-relaxed list-decimal list-inside marker:text-primary marker:font-semibold">
                      {exercise.questions.map((q, i) => (
                        <li key={i}>{q}</li>
                      ))}
                    </ol>
                  )}
                </CardContent>
              </Card>
            )}
            {exercise.id.startsWith("ai-") ? (
              <div className="flex justify-center pt-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleGenerateAlternative}
                  disabled={regenLoading}
                  className="h-7 px-2 text-xs text-muted-foreground hover:text-primary hover:bg-primary/10 gap-1"
                >
                  {regenLoading ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" /> Génération…
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-3 h-3" /> Autre exercice sur ce thème
                    </>
                  )}
                </Button>
              </div>
            ) : !exercise.annale_source ? (
              <div className="flex items-center justify-center gap-2 pt-1 flex-wrap">
                <span className="text-xs text-muted-foreground">
                  ✨ Préfères-tu un exercice généré par IA sur ce thème ?
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSwitchToAi}
                  disabled={switchAiLoading}
                  className="h-7 px-2 text-xs text-primary hover:text-primary hover:bg-primary/10 gap-1"
                >
                  {switchAiLoading ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" /> Génération…
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3 h-3" /> Générer
                    </>
                  )}
                </Button>
              </div>
            ) : null}
            <p className="text-xs text-muted-foreground text-center italic px-2">
              Suis la méthode ci-dessous étape par étape pendant que tu travailles ✨
            </p>
          </section>
        ) : (
          /* Carte "Prends ton exercice" quand aucun exercice n'existe */
          <section className="space-y-3">
            <Card className={`border-l-4 ${SUBJECT_BG_COLORS[bloc.matiere] || "bg-muted/30 border-muted-foreground"}`}>
              <CardContent className="p-4 space-y-2">
                <h2 className="font-semibold flex items-center gap-2">
                  <span className="text-lg">📖</span> Prends ton exercice
                </h2>
                <p className="text-sm text-foreground/80 leading-relaxed">
                  Choisis un exercice de ton choix sur ce thème puis suis la méthode ci-dessous étape par étape pendant que tu travailles.
                </p>
              </CardContent>
            </Card>
          </section>
        )}

        {/* Méthode */}
        {methodeSteps.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Ta méthode</h2>
            <Progress value={((currentStep + 1) / methodeSteps.length) * 100} className="h-2 rounded-full" />
            <div className="space-y-2">
              {methodeSteps.map((step, i) => (
                <Card
                  key={i}
                  onClick={() => i !== currentStep && setCurrentStep(i)}
                  className={`transition-all ${
                    i === currentStep
                      ? "border-primary shadow-md"
                      : i < currentStep
                      ? "opacity-60 cursor-pointer hover:opacity-90"
                      : "opacity-40 cursor-pointer hover:opacity-70"
                  }`}
                >
                  <CardContent className="p-3 flex items-start gap-3">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      i === currentStep ? "sprint-gradient text-primary-foreground" : i < currentStep ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                    }`}>
                      {i + 1}
                    </span>
                    <p className="text-sm leading-relaxed">{step}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Consigne / objectifs / notes */}
        {(bloc.consigne_eleve || bloc.objectifs_pedagogiques) && (
          <section className="space-y-3">
            {bloc.consigne_eleve && (
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm leading-relaxed">{bloc.consigne_eleve}</p>
                </CardContent>
              </Card>
            )}
            {bloc.objectifs_pedagogiques && (
              <Card className="border-primary/20 bg-accent/30">
                <CardContent className="p-4 space-y-1">
                  <p className="text-xs font-semibold text-primary">Objectifs</p>
                  <p className="text-sm leading-relaxed text-foreground/80">{bloc.objectifs_pedagogiques}</p>
                </CardContent>
              </Card>
            )}
          </section>
        )}

        <section className="space-y-1.5">
          <label className="text-sm font-medium">Tes notes</label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Écris tes notes, brouillons ou réponses ici…"
            className="min-h-[120px]"
          />
        </section>

        {/* Validation */}
        <section className="pb-4">
          <Button
            onClick={handleComplete}
            className="w-full h-12 text-base font-semibold sprint-gradient text-primary-foreground rounded-xl gap-2"
          >
            <CheckCircle2 className="w-5 h-5" /> J'ai terminé cet exercice ✓
          </Button>
        </section>
      </div>

      {/* Modale de corrigé */}
      <Dialog open={corrigeOpen} onOpenChange={setCorrigeOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              {corrigeIsAI ? "Exemple de corrigé" : "Corrigé de l'exercice"}
            </DialogTitle>
          </DialogHeader>

          <div className="py-2">
            {corrigeLoading ? (
              <div className="flex flex-col items-center justify-center py-8 gap-3">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <p className="text-sm text-muted-foreground">Génération du corrigé en cours…</p>
              </div>
            ) : (
              <>
                <div className="text-sm leading-relaxed text-foreground/90 prose prose-sm max-w-none prose-headings:font-semibold prose-headings:text-foreground prose-strong:text-foreground prose-hr:my-4 prose-ul:my-2 prose-li:my-0.5">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[rehypeKatex]}
                  >
                    {corrigeContent}
                  </ReactMarkdown>
                </div>
                {corrigeIsAI && !corrigeLoading && (
                  <p className="mt-4 text-xs text-muted-foreground italic text-center border-t pt-3">
                    Exemple de corrigé type — compare ta démarche avec cet exemple
                  </p>
                )}
              </>
            )}
          </div>

          <DialogFooter className="flex flex-row gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => setCorrigeOpen(false)}
              className="flex-1"
              disabled={corrigeLoading}
            >
              Fermer
            </Button>
            <Button
              onClick={handleCloseAndReturn}
              className="flex-1 sprint-gradient text-primary-foreground"
              disabled={corrigeLoading}
            >
              Retour au planning
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WorkSession;
