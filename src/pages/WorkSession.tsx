import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";
import DOMPurify from "dompurify";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Play, Pause, CheckCircle2, ChevronRight, Target, Zap, Rocket, Clock, Sparkles, RefreshCw, Printer, Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

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

const SLOT_CONFIG: Record<string, { label: string; icon: React.ReactNode; colors: string }> = {
  heavy: { label: "Défi du jour", icon: <Target className="w-3.5 h-3.5" />, colors: "bg-red-100 text-red-700 border-red-200" },
  medium: { label: "Entraînement", icon: <Zap className="w-3.5 h-3.5" />, colors: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  light: { label: "Sprint final", icon: <Rocket className="w-3.5 h-3.5" />, colors: "bg-emerald-100 text-emerald-700 border-emerald-200" },
};

interface BlocData {
  id: string;
  matiere: string;
  titre: string;
  duree_min: number | null;
  duree_examen_min: number | null;
  consigne_eleve: string | null;
  objectifs_pedagogiques: string | null;
  methode_id: string | null;
}

const getTimerKey = (blocId: string) => {
  const today = new Date().toISOString().split("T")[0];
  return `timer_${blocId}_${today}`;
};

const WorkSession = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const blocId = searchParams.get("bloc");
  const slotType = searchParams.get("slot") || "medium";

  const [bloc, setBloc] = useState<BlocData | null>(null);
  const [phase, setPhase] = useState<number>(1);
  const [methodeSteps, setMethodeSteps] = useState<string[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [notes, setNotes] = useState("");
  const [completed, setCompleted] = useState(false);
  const [showNotEnough, setShowNotEnough] = useState(false);
  const [showTimeUp, setShowTimeUp] = useState(false);
  const [remainingMinutes, setRemainingMinutes] = useState(0);
  const [generatedExercise, setGeneratedExercise] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Timer: always counts UP (elapsed seconds)
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeUpShownRef = useRef(false);

  // Load saved elapsed time from localStorage
  useEffect(() => {
    if (!blocId) return;
    const saved = localStorage.getItem(getTimerKey(blocId));
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed) && parsed > 0) {
        setElapsedSeconds(parsed);
      }
    }
  }, [blocId]);

  // Fetch bloc + user phase in parallel
  useEffect(() => {
    if (!blocId || !user) return;

    const fetchBloc = async () => {
      const { data } = await supabase
        .from("blocs_examen")
        .select("id, matiere, titre, duree_min, duree_examen_min, consigne_eleve, objectifs_pedagogiques, methode_id")
        .eq("id", blocId)
        .limit(1);
      if (data && data.length > 0) {
        setBloc(data[0]);
      }
    };

    const fetchPhase = async () => {
      const { data } = await supabase
        .from("users")
        .select("phase_actuelle")
        .eq("id", user.id)
        .limit(1);
      if (data && data.length > 0 && data[0].phase_actuelle) {
        setPhase(data[0].phase_actuelle);
      }
    };

    fetchBloc();
    fetchPhase();
  }, [blocId, user]);

  // Fetch methode
  useEffect(() => {
    if (!bloc?.methode_id) return;
    const fetchMethode = async () => {
      const { data } = await supabase
        .from("methodes")
        .select("etapes")
        .eq("id", bloc.methode_id!)
        .limit(1);
      if (data && data.length > 0 && data[0].etapes) {
        try {
          const parsed = JSON.parse(data[0].etapes);
          if (Array.isArray(parsed)) setMethodeSteps(parsed);
          else setMethodeSteps(data[0].etapes.split("\n").filter(Boolean));
        } catch {
          setMethodeSteps(data[0].etapes.split("\n").filter(Boolean));
        }
      }
    };
    fetchMethode();
  }, [bloc?.methode_id]);

  // Derived values
  const isPhase3 = phase >= 3;
  const dureeRevision = bloc?.duree_min || 30;
  const dureeExamen = bloc?.duree_examen_min || dureeRevision;
  const countdownTotalSec = dureeExamen * 60;

  // Timer tick — always counts UP
  useEffect(() => {
    if (timerRunning) {
      intervalRef.current = setInterval(() => {
        setElapsedSeconds((prev) => {
          const next = prev + 1;
          if (blocId) {
            localStorage.setItem(getTimerKey(blocId), String(next));
          }
          return next;
        });
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [timerRunning, blocId]);

  // Phase 3: detect time up
  useEffect(() => {
    if (isPhase3 && elapsedSeconds >= countdownTotalSec && !timeUpShownRef.current && timerRunning) {
      timeUpShownRef.current = true;
      setTimerRunning(false);
      if (intervalRef.current) clearInterval(intervalRef.current);
      setShowTimeUp(true);
    }
  }, [isPhase3, elapsedSeconds, countdownTotalSec, timerRunning]);

  const toggleTimer = () => setTimerRunning((r) => !r);

  const renderMathText = useCallback((text: string) => {
    // Escape HTML first to prevent XSS from AI-generated content
    const escaped = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
    // Replace $...$ with KaTeX rendered HTML (KaTeX output is safe)
    const withKatex = escaped.replace(/\$([^$]+)\$/g, (_, math) => {
      try {
        return katex.renderToString(math, { throwOnError: false });
      } catch {
        return math;
      }
    });
    // Sanitize final HTML as defense-in-depth
    return DOMPurify.sanitize(withKatex, {
      ADD_TAGS: ["math", "semantics", "annotation", "mrow", "mi", "mo", "mn", "msup", "msub", "mfrac", "msqrt"],
      ADD_ATTR: ["class", "style", "aria-hidden"],
    });
  }, []);

  const handleGenerateExercise = useCallback(async () => {
    if (!bloc) return;
    setIsGenerating(true);
    try {
      const methodeText = methodeSteps.length > 0
        ? methodeSteps.map((s, i) => `${i + 1}. ${s}`).join("\n")
        : null;

      const { data, error } = await supabase.functions.invoke("generate-exercise", {
        body: {
          bloc_id: bloc.id,
          matiere: bloc.matiere,
          titre: bloc.titre,
          objectifs_pedagogiques: bloc.objectifs_pedagogiques,
          duree_examen_min: bloc.duree_examen_min,
          tags: null,
          methode_etapes: methodeText,
        },
      });
      if (error) throw error;
      if (data?.fallback) {
        setGeneratedExercise(data.error || "Génération temporairement indisponible.");
      } else {
        setGeneratedExercise(data?.exercise || "Impossible de générer l'exercice.");
      }
    } catch (e) {
      console.error("Exercise generation error:", e);
      setGeneratedExercise("Erreur lors de la génération. Réessaie plus tard.");
    } finally {
      setIsGenerating(false);
    }
  }, [bloc, methodeSteps]);

  // Display values
  const displaySeconds = isPhase3
    ? Math.max(0, countdownTotalSec - elapsedSeconds)
    : elapsedSeconds;

  const timerPercent = useMemo(() => {
    if (isPhase3) {
      if (countdownTotalSec === 0) return 0;
      return Math.round((Math.max(0, countdownTotalSec - elapsedSeconds) / countdownTotalSec) * 100);
    }
    // Phase 1-2: fill up based on duree_min
    const totalSec = dureeRevision * 60;
    if (totalSec === 0) return 100;
    return Math.min(100, Math.round((elapsedSeconds / totalSec) * 100));
  }, [isPhase3, elapsedSeconds, countdownTotalSec, dureeRevision]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  const canComplete = isPhase3
    ? true
    : elapsedSeconds >= dureeExamen * 60;

  const handleComplete = useCallback(async () => {
    if (!bloc || !user || !blocId) return;

    if (!isPhase3) {
      const requiredSeconds = dureeExamen * 60;
      if (elapsedSeconds < requiredSeconds) {
        const remaining = Math.ceil((requiredSeconds - elapsedSeconds) / 60);
        setRemainingMinutes(remaining);
        setShowNotEnough(true);
        return;
      }
    }

    setTimerRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);

    const today = new Date().toISOString().split("T")[0];
    await supabase.from("completions").upsert(
      { user_id: user.id, bloc_id: blocId, date_completion: today, completed: true },
      { onConflict: "user_id,bloc_id,date_completion" }
    );

    setCompleted(true);
    setTimeout(() => navigate(`/dashboard?task_completed=${blocId}`), 2000);
  }, [bloc, user, blocId, elapsedSeconds, navigate, isPhase3, dureeRevision]);

  const slot = SLOT_CONFIG[slotType] || SLOT_CONFIG.medium;

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
        <h2 className="text-xl font-bold text-center">Bravo, exercice terminé ! 🎉</h2>
        <p className="text-muted-foreground text-sm text-center">Tu progresses à chaque séance. Retour au tableau de bord…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-8">
      <div className="max-w-lg mx-auto px-4 pt-4 space-y-6">
        {/* Back button */}
        <button onClick={() => navigate("/dashboard")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> Retour
        </button>

        {/* Phase badge */}
        {isPhase3 ? (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-50 border border-red-200 w-fit text-sm font-medium text-red-700">
            🎯 Conditions brevet — {dureeExamen} min
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent border border-border w-fit text-sm font-medium text-muted-foreground">
            ⏱ Temps examen : {dureeExamen} min
          </div>
        )}

        {/* SECTION 1 — Header */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={SUBJECT_COLORS[bloc.matiere] || "bg-muted text-foreground"}>
              {bloc.matiere}
            </Badge>
            <Badge variant="outline" className={`text-xs font-semibold border ${slot.colors}`}>
              {slot.icon} {slot.label}
            </Badge>
          </div>
          <h1 className="text-xl font-bold leading-tight">{bloc.titre}</h1>

          {/* Timer circle */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative w-32 h-32">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="52" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
                <circle
                  cx="60" cy="60" r="52" fill="none"
                  stroke="url(#timerGrad)"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 52}
                  strokeDashoffset={2 * Math.PI * 52 * (1 - timerPercent / 100)}
                  className="transition-all duration-1000"
                />
                <defs>
                  <linearGradient id="timerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="hsl(217 72% 53%)" />
                    <stop offset="100%" stopColor="hsl(160 50% 45%)" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold tabular-nums">{formatTime(displaySeconds)}</span>
                <span className="text-xs text-muted-foreground">
                  {isPhase3 ? `${dureeExamen} min` : `${dureeRevision} min`}
                </span>
              </div>
            </div>
            <Button
              onClick={toggleTimer}
              size="sm"
              className="rounded-full sprint-gradient text-primary-foreground gap-1.5"
            >
              {timerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {timerRunning ? "Pause" : "Démarrer"}
            </Button>
            {elapsedSeconds > 0 && (
              <p className="text-xs text-muted-foreground">
                Temps travaillé : {formatTime(elapsedSeconds)}
              </p>
            )}
            {!isPhase3 && (
              <p className="text-xs text-muted-foreground text-center max-w-[280px]">
                Prends le temps qu'il te faut — en phase finale tu travailleras en conditions réelles
              </p>
            )}
          </div>
        </section>

        {/* AI Exercise Section — Phase 1 & 2 only */}
        {!isPhase3 && (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" /> Ton exercice du jour
            </h2>
            {!generatedExercise && !isGenerating && (
              <Button
                onClick={handleGenerateExercise}
                variant="outline"
                className="w-full gap-2"
              >
                <Sparkles className="w-4 h-4" /> Générer un exercice
              </Button>
            )}
            {isGenerating && (
              <Card>
                <CardContent className="p-4 flex items-center justify-center gap-2 text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" /> Génération de ton exercice…
                </CardContent>
              </Card>
            )}
            {generatedExercise && !isGenerating && (
              <>
                <Card className="border-l-4 border-l-primary">
                  <CardContent className="p-4 bg-accent/30 rounded-r-lg">
                    <div
                      className="text-sm leading-relaxed whitespace-pre-wrap"
                      dangerouslySetInnerHTML={{ __html: renderMathText(generatedExercise) }}
                    />
                  </CardContent>
                </Card>
                <div className="flex gap-2">
                  <Button
                    onClick={handleGenerateExercise}
                    variant="outline"
                    size="sm"
                    className="gap-1.5 flex-1"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Autre exercice
                  </Button>
                  <Button
                    onClick={() => window.print()}
                    variant="outline"
                    size="sm"
                    className="gap-1.5 flex-1"
                  >
                    <Printer className="w-3.5 h-3.5" /> Imprimer
                  </Button>
                </div>
              </>
            )}
          </section>
        )}

        {/* SECTION 2 — Méthode pas-à-pas */}
        {methodeSteps.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Ta méthode</h2>
            <Progress value={((currentStep + 1) / methodeSteps.length) * 100} className="h-2 rounded-full" />
            <div className="space-y-2">
              {methodeSteps.map((step, i) => (
                <Card
                  key={i}
                  className={`transition-all ${
                    i === currentStep
                      ? "border-primary shadow-md"
                      : i < currentStep
                      ? "opacity-50"
                      : "opacity-40"
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
            {currentStep < methodeSteps.length - 1 && (
              <Button
                onClick={() => setCurrentStep((s) => s + 1)}
                variant="outline"
                className="w-full gap-1"
              >
                Étape suivante <ChevronRight className="w-4 h-4" />
              </Button>
            )}
          </section>
        )}

        {/* SECTION 3 — Espace de travail */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Ta consigne</h2>
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
                <p className="text-xs font-semibold text-primary">Objectifs de cette séance</p>
                <p className="text-sm leading-relaxed text-foreground/80">{bloc.objectifs_pedagogiques}</p>
              </CardContent>
            </Card>
          )}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Tes notes</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Écris tes notes, brouillons ou réponses ici…"
              className="min-h-[120px]"
            />
          </div>
        </section>

        {/* SECTION 4 — Validation */}
        <section className="pb-4">
          <Button
            onClick={handleComplete}
            disabled={!canComplete}
            className="w-full h-12 text-base font-semibold sprint-gradient text-primary-foreground rounded-xl gap-2 disabled:opacity-50"
          >
            <CheckCircle2 className="w-5 h-5" /> J'ai terminé cet exercice ✓
          </Button>
          {!canComplete && !isPhase3 && (
            <p className="text-xs text-muted-foreground text-center mt-2">
              Disponible après {dureeExamen} min de travail
            </p>
          )}
        </section>
      </div>

      {/* Not enough time modal (Phase 1-2) */}
      <AlertDialog open={showNotEnough} onOpenChange={setShowNotEnough}>
        <AlertDialogContent className="max-w-sm mx-auto">
          <AlertDialogHeader className="text-center space-y-3">
            <div className="mx-auto w-12 h-12 rounded-full bg-accent flex items-center justify-center">
              <Clock className="w-6 h-6 text-primary" />
            </div>
            <AlertDialogTitle>Tu y es presque !</AlertDialogTitle>
            <AlertDialogDescription className="text-sm leading-relaxed">
              Continue encore <span className="font-semibold text-foreground">{remainingMinutes} minute{remainingMinutes > 1 ? "s" : ""}</span> pour valider cet exercice.
              Le travail régulier fait toute la différence. 💪
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center">
            <AlertDialogAction
              onClick={() => {
                setShowNotEnough(false);
                setTimerRunning(true);
              }}
              className="sprint-gradient text-primary-foreground rounded-xl px-8"
            >
              Continuer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Time's up modal (Phase 3) */}
      <AlertDialog open={showTimeUp} onOpenChange={setShowTimeUp}>
        <AlertDialogContent className="max-w-sm mx-auto">
          <AlertDialogHeader className="text-center space-y-3">
            <div className="mx-auto w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
              <Clock className="w-6 h-6 text-red-600" />
            </div>
            <AlertDialogTitle>Temps écoulé !</AlertDialogTitle>
            <AlertDialogDescription className="text-sm leading-relaxed">
              Au brevet tu devrais t'arrêter ici. Tu peux continuer ou valider ce que tu as fait.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-col gap-2 sm:flex-col">
            <Button
              onClick={() => {
                setShowTimeUp(false);
                setTimerRunning(true);
              }}
              variant="outline"
              className="w-full"
            >
              Continuer quand même
            </Button>
            <Button
              onClick={() => {
                setShowTimeUp(false);
                handleComplete();
              }}
              className="w-full sprint-gradient text-primary-foreground"
            >
              Valider et passer à la suite
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default WorkSession;
