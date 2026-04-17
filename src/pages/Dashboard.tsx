import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Play, Clock, MessageCircle, Loader2, LogOut, CheckCircle2, BarChart3, FileText } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import EndOfDayModal from "@/components/dashboard/EndOfDayModal";

interface ProfileData {
  id: string;
  name: string;
  examDate: string;
  rhythm: string;
  level: string;
  subjects: string[];
  modeActuel: string;
  phaseActuelle: number;
}

interface BlocExamen {
  id: string;
  matiere: string;
  titre: string;
  duree_min: number | null;
  priorite: number | null;
  phase_min: number | null;
  type: string | null;
}

interface MessageFeedback {
  message: string | null;
  ton: string | null;
  phase: number | null;
}

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

const TASK_LABELS: Record<string, string> = {
  heavy: "Défi du jour",
  medium: "Entraînement",
  light: "Sprint final",
};

const TASK_ICONS: Record<string, string> = {
  heavy: "🎯",
  medium: "⚡",
  light: "🚀",
};

const TASK_LABEL_COLORS: Record<string, string> = {
  heavy: "bg-red-100 text-red-700 border-red-200",
  medium: "bg-yellow-100 text-yellow-700 border-yellow-200",
  light: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

const DAYS = ["L", "M", "M", "J", "V", "S", "D"];

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [blocs, setBlocs] = useState<BlocExamen[]>([]);
  const [feedback, setFeedback] = useState<MessageFeedback | null>(null);
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [endOfDayOpen, setEndOfDayOpen] = useState(false);
  const [endOfDayMessage, setEndOfDayMessage] = useState("");
  const [endOfDayTaux, setEndOfDayTaux] = useState(0);
  const [endOfDayMode, setEndOfDayMode] = useState("normal");
  const [endingDay, setEndingDay] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [yesterdayBlocIds, setYesterdayBlocIds] = useState<Set<string>>(new Set());
  

  // Load profile from Supabase
  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    const fetchProfile = async () => {
      const { data } = await supabase
        .from("users")
        .select("id, prenom, date_examen, volume_quotidien, retard_initial, matieres_faibles, mode_actuel, phase_actuelle")
        .eq("id", user.id)
        .maybeSingle();
      if (!data) {
        navigate("/onboarding");
        return;
      }
      console.log("matieres_faibles brut depuis Supabase:", data.matieres_faibles);
      console.log("mode_actuel:", data.mode_actuel);
      setProfile({
        id: data.id,
        name: data.prenom || "",
        examDate: data.date_examen || "",
        rhythm: data.volume_quotidien || "",
        level: data.retard_initial || "",
        subjects: data.matieres_faibles || [],
        modeActuel: data.mode_actuel || "normal",
        phaseActuelle: data.phase_actuelle || 1,
      });
      setLoading(false);
    };
    fetchProfile();
  }, [user, navigate]);

  // Load today's completions from Supabase
  useEffect(() => {
    if (!user) return;
    const loadCompletions = async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data } = await supabase
        .from("completions")
        .select("bloc_id")
        .eq("user_id", user.id)
        .eq("date_completion", today)
        .eq("completed", true);
      if (data) {
        setCompletedTasks(new Set(data.map((c) => c.bloc_id)));
      }
    };
    loadCompletions();
  }, [user]);

  // Load yesterday's completions for "maintien" mode
  useEffect(() => {
    if (!user) return;
    const loadYesterday = async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yStr = yesterday.toISOString().split("T")[0];
      const { data } = await supabase
        .from("completions")
        .select("bloc_id")
        .eq("user_id", user.id)
        .eq("date_completion", yStr);
      if (data) {
        setYesterdayBlocIds(new Set(data.map((c) => c.bloc_id)));
      }
    };
    loadYesterday();
  }, [user]);

  // Fetch blocs_examen
  useEffect(() => {
    const fetchBlocs = async () => {
      const { data } = await supabase
        .from("blocs_examen")
        .select("id, matiere, titre, duree_min, priorite, phase_min, type")
        .eq("priorite", 1)
        .order("duree_min", { ascending: false });
      if (data) setBlocs(data);
    };
    fetchBlocs();
  }, []);

  // Computed values
  const daysUntilExam = useMemo(() => {
    if (!profile?.examDate) return 0;
    const diff = new Date(profile.examDate).getTime() - new Date().getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }, [profile]);

  const totalSprintDays = useMemo(() => Math.max(daysUntilExam, 1), [daysUntilExam]);

  const currentPhase = useMemo(() => {
    if (daysUntilExam > 21) return 1;
    if (daysUntilExam > 7) return 2;
    return 3;
  }, [daysUntilExam]);

  const currentWeek = useMemo(() => {
    const elapsed = totalSprintDays - daysUntilExam;
    return Math.max(1, Math.ceil(elapsed / 7));
  }, [totalSprintDays, daysUntilExam]);

  const progressPercent = useMemo(() => {
    const elapsed = totalSprintDays - daysUntilExam;
    return Math.min(100, Math.round((elapsed / totalSprintDays) * 100));
  }, [totalSprintDays, daysUntilExam]);

  // Fetch feedback message
  useEffect(() => {
    const fetchFeedback = async () => {
      const { data } = await supabase
        .from("messages_feedback")
        .select("message, ton, phase")
        .eq("phase", currentPhase)
        .limit(1);
      if (data && data.length > 0) setFeedback(data[0]);
    };
    if (profile) fetchFeedback();
  }, [profile, currentPhase]);

  // Generate daily tasks based on mode_actuel
  const dailyTasks = useMemo(() => {
    const mode = profile?.modeActuel || "normal";
    const userSubjects = profile?.subjects || [];
    console.log("Subjects pour le planning:", userSubjects, "Mode:", mode);

    const usedIds = new Set<string>();
    const slots: Array<{ bloc: BlocExamen; weight: "heavy" | "medium" | "light" }> = [];
    const weights: Array<"heavy" | "medium" | "light"> = ["heavy", "medium", "light"];

    const matchesSubject = (blocMatiere: string, subject: string) =>
      blocMatiere.toLowerCase() === subject.toLowerCase();

    // Filter blocs based on mode
    let availableBlocs = [...blocs];
    if (mode === "maintien") {
      availableBlocs = availableBlocs.filter((b) => !yesterdayBlocIds.has(b.id));
    }

    // Determine max slots based on mode
    let maxSlots = 3;
    if (mode === "allegement") maxSlots = 2;
    if (mode === "reset_doux") maxSlots = 1;

    if (mode === "reset_doux") {
      // Pick the shortest available bloc
      const shortest = [...availableBlocs].sort(
        (a, b) => (a.duree_min || 0) - (b.duree_min || 0)
      )[0];
      if (shortest) {
        slots.push({ bloc: shortest, weight: "light" });
      }
      return slots;
    }

    // Step 1: For each subject in matieres_faibles, pick a bloc
    for (let i = 0; i < Math.min(userSubjects.length, maxSlots); i++) {
      const subject = userSubjects[i];
      const bloc = availableBlocs.find(
        (b) => !usedIds.has(b.id) && matchesSubject(b.matiere, subject)
      );
      if (bloc) {
        usedIds.add(bloc.id);
        slots.push({ bloc, weight: weights[i] });
      }
    }

    // Step 2: Fill remaining slots
    while (slots.length < maxSlots) {
      const weight = weights[slots.length];
      const bloc = availableBlocs.find((b) => !usedIds.has(b.id));
      if (!bloc) break;
      usedIds.add(bloc.id);
      slots.push({ bloc, weight });
    }

    return slots;
  }, [blocs, profile, yesterdayBlocIds]);

  const todayDayIndex = new Date().getDay();
  const dayIndexMondayBased = todayDayIndex === 0 ? 6 : todayDayIndex - 1;

  // Checkboxes are read-only on dashboard — completion is driven by WorkSession

  // End of day logic
  const handleEndDay = useCallback(async () => {
    if (!user || !profile) return;
    setEndingDay(true);

    const total = dailyTasks.length;
    const completed = dailyTasks.filter((t) => completedTasks.has(t.bloc.id)).length;
    const taux = total > 0 ? completed / total : 0;

    // Check last 3 days for consecutive low performance
    let newMode = "normal";
    if (taux >= 0.8) {
      newMode = "normal";
    } else if (taux >= 0.6) {
      newMode = "maintien";
    } else {
      // Check consecutive days < 0.6
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      const { data: recentCompletions } = await supabase
        .from("completions")
        .select("date_completion, completed")
        .eq("user_id", user.id)
        .gte("date_completion", threeDaysAgo.toISOString().split("T")[0])
        .order("date_completion", { ascending: true });

      // Group by day and compute taux per day
      const dayMap = new Map<string, { total: number; done: number }>();
      if (recentCompletions) {
        for (const c of recentCompletions) {
          const d = c.date_completion;
          if (!dayMap.has(d)) dayMap.set(d, { total: 0, done: 0 });
          const entry = dayMap.get(d)!;
          entry.total++;
          if (c.completed) entry.done++;
        }
      }

      const days = Array.from(dayMap.values());
      const consecutiveLow = days.filter((d) => d.total > 0 && d.done / d.total < 0.6).length;

      newMode = consecutiveLow >= 3 ? "reset_doux" : "allegement";
    }

    // Update user mode
    await supabase
      .from("users")
      .update({ mode_actuel: newMode })
      .eq("id", user.id);

    // Fetch feedback message
    const niveauTaux = taux >= 0.8 ? "validation" : taux >= 0.6 ? "encouragement" : "alerte";
    const { data: fbData } = await supabase
      .from("messages_feedback")
      .select("message")
      .eq("phase", profile.phaseActuelle || currentPhase)
      .eq("niveau_taux", niveauTaux)
      .limit(1);

    const msg =
      fbData && fbData.length > 0 && fbData[0].message
        ? fbData[0].message
        : taux >= 0.8
        ? "Excellente journée ! Continue comme ça 💪"
        : taux >= 0.6
        ? "Pas mal ! Encore un petit effort demain 🔥"
        : "C'est pas grave, on reprend doucement demain 🌱";

    setEndOfDayTaux(taux);
    setEndOfDayMode(newMode);
    setEndOfDayMessage(msg);
    setEndOfDayOpen(true);
    setShowFeedback(true);
    setEndingDay(false);

    // Update local profile
    setProfile((prev) => (prev ? { ...prev, modeActuel: newMode } : prev));
  }, [user, profile, dailyTasks, completedTasks, currentPhase]);

  const completionRate = dailyTasks.length > 0
    ? dailyTasks.filter((t) => completedTasks.has(t.bloc.id)).length / dailyTasks.length
    : 0;
  const allDone = dailyTasks.length > 0 && dailyTasks.every((t) => completedTasks.has(t.bloc.id));

  if (!profile || loading)
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground text-sm">Chargement de ton planning...</p>
        </div>
      </div>
    );

  const firstPendingTask = dailyTasks.find((t) => !completedTasks.has(t.bloc.id)) || dailyTasks[0];

  return (
    <div className="min-h-screen bg-background pb-8">
      <div className="max-w-6xl mx-auto px-4 pt-6 space-y-6">
        {/* HEADER */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Bonjour {profile.name} 👋</h1>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={() => navigate("/progress")} aria-label="Progression">
                <BarChart3 className="w-5 h-5 text-primary" />
              </Button>
            </div>
          </div>
          <p className="text-muted-foreground text-sm">
            J-{daysUntilExam} · Phase {currentPhase} · Semaine {currentWeek} du sprint
          </p>
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Progression du sprint</span>
              <span>{progressPercent}%</span>
            </div>
            <Progress value={progressPercent} className="h-2.5 rounded-full" />
          </div>
        </section>

        {/* GRILLE 2 COLONNES */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
          {/* COLONNE GAUCHE — Programme du jour */}
          <Card className="rounded-2xl flex flex-col">
            <CardContent className="p-5 flex flex-col flex-1 space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">🎯</span>
                <h2 className="text-base font-semibold">Ton programme du jour</h2>
              </div>

              <div className="space-y-2 flex-1">
                {dailyTasks.map(({ bloc, weight }) => {
                  const done = completedTasks.has(bloc.id);
                  return (
                    <div
                      key={bloc.id}
                      className={`flex items-center gap-2 rounded-lg border bg-card p-3 ${done ? "opacity-60" : ""}`}
                    >
                      <Checkbox checked={done} disabled />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap mb-1">
                          <Badge className={`${SUBJECT_COLORS[bloc.matiere] || "bg-muted text-foreground"} text-[10px] px-1.5 py-0`}>
                            {bloc.matiere}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">
                            {TASK_ICONS[weight]} {bloc.duree_min} min
                          </span>
                        </div>
                        <p className={`text-xs leading-snug truncate ${done ? "line-through text-muted-foreground" : "font-medium"}`}>
                          {bloc.titre}
                        </p>
                      </div>
                    </div>
                  );
                })}
                {dailyTasks.length === 0 && (
                  <p className="text-muted-foreground text-xs text-center py-4">
                    Aucune tâche disponible.
                  </p>
                )}
              </div>

              {firstPendingTask && !allDone && (
                <Button
                  className="w-full rounded-xl h-11 text-sm font-semibold sprint-gradient text-primary-foreground"
                  onClick={() =>
                    navigate(
                      `/work?bloc_id=${encodeURIComponent(firstPendingTask.bloc.id)}&slot=${firstPendingTask.weight}`,
                    )
                  }
                >
                  <Play className="w-4 h-4 mr-1" /> Démarrer mon programme
                </Button>
              )}

              {dailyTasks.length > 0 && (
                <p className="text-xs text-muted-foreground text-center">
                  {dailyTasks.filter((t) => completedTasks.has(t.bloc.id)).length}/{dailyTasks.length} tâches complétées aujourd'hui
                </p>
              )}

              {dailyTasks.length > 0 && allDone && (
                <Button
                  onClick={handleEndDay}
                  disabled={endingDay}
                  className="w-full rounded-xl h-10 text-sm font-medium sprint-gradient text-primary-foreground animate-in fade-in duration-500"
                >
                  {endingDay ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                  )}
                  Terminer ma journée
                </Button>
              )}

              {/* Progression semaine */}
              <div className="pt-2 border-t space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Progression de la semaine</p>
                <div className="flex justify-between">
                  {DAYS.map((day, i) => {
                    const isPast = i < dayIndexMondayBased;
                    const isToday = i === dayIndexMondayBased;
                    return (
                      <div
                        key={i}
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold transition-all ${
                          isPast
                            ? "sprint-gradient text-primary-foreground"
                            : isToday
                            ? "border-2 border-primary text-primary bg-transparent"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {day}
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* COLONNE DROITE — Annales */}
          <Card className="rounded-2xl flex flex-col">
            <CardContent className="p-5 flex flex-col flex-1 space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">📄</span>
                <h2 className="text-base font-semibold">S'entraîner sur une annale</h2>
              </div>
              <p className="text-xs text-muted-foreground -mt-2">Simule les conditions du brevet</p>

              <div className="space-y-3 flex-1 flex flex-col justify-center">
                <button
                  onClick={() => navigate("/annales?matiere=Maths")}
                  className="w-full text-left rounded-xl border border-blue-200 bg-blue-50 p-4 hover:bg-blue-100 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-blue-900">Annales Maths</p>
                      <p className="text-xs text-blue-700/80 mt-0.5">4 sujets disponibles</p>
                    </div>
                    <Badge className="bg-blue-500 text-white">Maths</Badge>
                  </div>
                </button>

                <button
                  onClick={() => navigate("/annales?matiere=Français")}
                  className="w-full text-left rounded-xl border border-purple-200 bg-purple-50 p-4 hover:bg-purple-100 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-purple-900">Annales Français</p>
                      <p className="text-xs text-purple-700/80 mt-0.5">4 sujets disponibles</p>
                    </div>
                    <Badge className="bg-purple-500 text-white">Français</Badge>
                  </div>
                </button>
              </div>

              {currentPhase === 3 && (
                <p className="text-xs text-primary/80 text-center italic">
                  Phase finale — entraîne-toi sur de vrais sujets 🎯
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* SECTION 4 — Feedback */}
        {showFeedback && feedback?.message && (
          <section>
            <Card className="border-primary/20 bg-accent/30">
              <CardContent className="p-4 flex items-start gap-3">
                <MessageCircle className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <p className="text-sm text-foreground/80 leading-relaxed">{feedback.message}</p>
              </CardContent>
            </Card>
          </section>
        )}

        {/* Déconnexion */}
        <section className="pt-4">
          <Button
            variant="ghost"
            className="w-full text-muted-foreground text-sm hover:text-destructive"
            onClick={async () => {
              await signOut();
              navigate("/login");
            }}
          >
            <LogOut className="w-4 h-4 mr-2" /> Se déconnecter
          </Button>
        </section>
      </div>

      {/* End of day modal */}
      <EndOfDayModal
        open={endOfDayOpen}
        onClose={() => setEndOfDayOpen(false)}
        message={endOfDayMessage}
        taux={endOfDayTaux}
        mode={endOfDayMode}
      />
    </div>
  );
};

export default Dashboard;
