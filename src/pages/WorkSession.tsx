import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Play, Pause, CheckCircle2, ChevronRight, Target, Zap, Rocket, Clock } from "lucide-react";
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
  const [methodeSteps, setMethodeSteps] = useState<string[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [notes, setNotes] = useState("");
  const [completed, setCompleted] = useState(false);
  const [showNotEnough, setShowNotEnough] = useState(false);
  const [remainingMinutes, setRemainingMinutes] = useState(0);

  // Timer: count UP (elapsed seconds)
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const totalDurationSec = useRef(0);

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

  // Fetch bloc
  useEffect(() => {
    if (!blocId) return;
    const fetchBloc = async () => {
      const { data } = await supabase
        .from("blocs_examen")
        .select("id, matiere, titre, duree_min, consigne_eleve, objectifs_pedagogiques, methode_id")
        .eq("id", blocId)
        .limit(1);
      if (data && data.length > 0) {
        setBloc(data[0]);
        totalDurationSec.current = (data[0].duree_min || 30) * 60;
      }
    };
    fetchBloc();
  }, [blocId]);

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

  // Timer tick — counts UP
  useEffect(() => {
    if (timerRunning) {
      intervalRef.current = setInterval(() => {
        setElapsedSeconds((prev) => {
          const next = prev + 1;
          // Save to localStorage every second
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

  const toggleTimer = () => setTimerRunning((r) => !r);

  // Display as countdown
  const secondsLeft = Math.max(0, totalDurationSec.current - elapsedSeconds);

  const timerPercent = useMemo(() => {
    if (totalDurationSec.current === 0) return 100;
    return Math.round((secondsLeft / totalDurationSec.current) * 100);
  }, [secondsLeft]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  const handleComplete = useCallback(async () => {
    if (!bloc || !user || !blocId) return;

    const requiredSeconds = (bloc.duree_min || 30) * 0.5 * 60;

    if (elapsedSeconds < requiredSeconds) {
      const remaining = Math.ceil((requiredSeconds - elapsedSeconds) / 60);
      setRemainingMinutes(remaining);
      setShowNotEnough(true);
      return;
    }

    // Mark completed in Supabase
    setTimerRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);

    const today = new Date().toISOString().split("T")[0];
    await supabase.from("completions").upsert(
      { user_id: user.id, bloc_id: blocId, date_completion: today, completed: true },
      { onConflict: "user_id,bloc_id,date_completion" }
    );

    setCompleted(true);
    setTimeout(() => navigate(`/dashboard?task_completed=${blocId}`), 2000);
  }, [bloc, user, blocId, elapsedSeconds, navigate]);

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
                <span className="text-2xl font-bold tabular-nums">{formatTime(secondsLeft)}</span>
                <span className="text-xs text-muted-foreground">{bloc.duree_min} min</span>
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
          </div>
        </section>

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
            className="w-full h-12 text-base font-semibold sprint-gradient text-primary-foreground rounded-xl gap-2"
          >
            <CheckCircle2 className="w-5 h-5" /> J'ai terminé cet exercice ✓
          </Button>
        </section>
      </div>

      {/* Not enough time modal */}
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
    </div>
  );
};

export default WorkSession;
