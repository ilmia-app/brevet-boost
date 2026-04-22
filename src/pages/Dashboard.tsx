import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Play, MessageCircle, Loader2, LogOut, CheckCircle2, BarChart3, Sparkles, Settings, X } from "lucide-react";
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
  priorite: number | null;
  phase_min: number | null;
  type: string | null;
  theme: string | null;
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

const TASK_ICONS: Record<string, string> = {
  heavy: "🎯",
  medium: "⚡",
  light: "🚀",
};

const TASK_LABELS: Record<string, string> = {
  heavy: "Défi du jour",
  medium: "Entraînement",
  light: "Sprint final",
};

const DAYS = ["L", "M", "M", "J", "V", "S", "D"];

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
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
  const [showWeeklyBanner, setShowWeeklyBanner] = useState(false);

  // Profile
  useEffect(() => {
    let isActive = true;

    const loadProfile = async () => {
      if (!user) {
        navigate("/", { replace: true });
        if (isActive) setLoading(false);
        return;
      }

      if (isActive) {
        setLoading(true);
        setProfileError(null);
      }

      try {
        const { data, error } = await supabase
          .from("users")
          .select("id, prenom, date_examen, volume_quotidien, retard_initial, matieres_faibles, mode_actuel, phase_actuelle, derniere_modif_priorites")
          .eq("id", user.id)
          .maybeSingle();

        if (error) {
          console.error("[Dashboard] erreur chargement profil:", error);
          throw error;
        }

        if (!data) {
          navigate("/onboarding", { replace: true });
          return;
        }

        if (!isActive) return;

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

        const lastModif = data.derniere_modif_priorites;
        const phase = data.phase_actuelle || 1;
        const today = new Date();
        const isMonday = today.getDay() === 1;
        const monday = new Date(today);
        monday.setHours(0, 0, 0, 0);
        const modifiedThisWeek = lastModif ? new Date(lastModif) >= monday : false;
        const dismissedKey = `weekly-banner-dismissed-${today.toISOString().split("T")[0]}`;
        const dismissed = localStorage.getItem(dismissedKey) === "1";

        setShowWeeklyBanner(phase === 2 && isMonday && !modifiedThisWeek && !dismissed);
      } catch (error) {
        console.error("[Dashboard] exception inattendue:", error);
        if (isActive) {
          setProfileError("Impossible de charger ton planning.");
        }
      } finally {
        if (isActive) setLoading(false);
      }
    };

    loadProfile();

    return () => {
      isActive = false;
    };
  }, [user, navigate]);

  // Today's completions
  useEffect(() => {
    if (!user) return;
    (async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data } = await supabase
        .from("completions")
        .select("bloc_id")
        .eq("user_id", user.id)
        .eq("date_completion", today)
        .eq("completed", true);
      if (data) setCompletedTasks(new Set(data.map((c) => c.bloc_id)));
    })();
  }, [user]);

  // Yesterday's completions
  useEffect(() => {
    if (!user) return;
    (async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yStr = yesterday.toISOString().split("T")[0];
      const { data } = await supabase
        .from("completions")
        .select("bloc_id")
        .eq("user_id", user.id)
        .eq("date_completion", yStr);
      if (data) setYesterdayBlocIds(new Set(data.map((c) => c.bloc_id)));
    })();
  }, [user]);

  // All blocs
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("blocs_examen")
        .select("id, matiere, titre, priorite, phase_min, type, theme")
        .order("priorite", { ascending: true });
      if (data) setBlocs(data);
    })();
  }, []);

  const daysUntilExam = useMemo(() => {
    if (!profile?.examDate) return 0;
    const diff = new Date(profile.examDate).getTime() - new Date().getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }, [profile]);

  const totalSprintDays = useMemo(() => Math.max(daysUntilExam, 1), [daysUntilExam]);

  const currentPhase = useMemo(() => {
    if (daysUntilExam > 35) return 1;
    if (daysUntilExam > 14) return 2;
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

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("messages_feedback")
        .select("message, ton, phase")
        .eq("phase", currentPhase)
        .limit(1);
      if (data && data.length > 0) setFeedback(data[0]);
    })();
  }, [profile, currentPhase]);

  // Daily tasks — 3 tâches : Défi du jour (matière faible) + rotation HG/EMC + rotation Sciences
  const dailyTasks = useMemo(() => {
    const mode = profile?.modeActuel || "normal";
    const userSubjects = (profile?.subjects || []).map((s) => s.toLowerCase());
    const priorityBlocs = blocs.filter((b) => b.priorite === 1);

    const matches = (bm: string, s: string) => bm.toLowerCase() === s.toLowerCase();
    const pickBloc = (subject: string, used: Set<string>) =>
      priorityBlocs.find((b) => !used.has(b.id) && matches(b.matiere, subject));

    // Rotation cyclique basée sur le jour de l'année
    const start = new Date(new Date().getFullYear(), 0, 0);
    const dayOfYear = Math.floor((new Date().getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    const rotationHGE = ["Histoire", "Géographie", "EMC"];
    const rotationSci = ["Physique", "SVT", "Techno"];

    const pickRotation = (rotation: string[], used: Set<string>, faibles: string[]) => {
      // Si une matière de la rotation est dans les faibles → avance d'un cran
      for (let offset = 0; offset < rotation.length; offset++) {
        const subject = rotation[(dayOfYear + offset) % rotation.length];
        if (faibles.includes(subject.toLowerCase())) continue;
        const bloc = pickBloc(subject, used);
        if (bloc) return bloc;
      }
      // fallback : n'importe quel bloc de la rotation non utilisé
      for (const subject of rotation) {
        const bloc = pickBloc(subject, used);
        if (bloc) return bloc;
      }
      return null;
    };

    const used = new Set<string>();
    const slots: Array<{ bloc: BlocExamen; weight: "heavy" | "medium" | "light" }> = [];

    // TÂCHE 1 — Défi du jour (matière faible prioritaire)
    let defiBloc: BlocExamen | null = null;
    for (const subject of userSubjects) {
      const bloc = priorityBlocs.find((b) => !used.has(b.id) && matches(b.matiere, subject));
      if (bloc) {
        defiBloc = bloc;
        break;
      }
    }
    if (defiBloc) {
      used.add(defiBloc.id);
      slots.push({ bloc: defiBloc, weight: "heavy" });
    }

    // Mode reset_doux : seulement le défi
    if (mode === "reset_doux") return slots;

    // TÂCHE 2 — Entraînement (rotation Histoire/Géo/EMC)
    const entrainement = pickRotation(rotationHGE, used, userSubjects);
    if (entrainement) {
      used.add(entrainement.id);
      slots.push({ bloc: entrainement, weight: "medium" });
    }

    // Mode allegement : seulement 2 tâches
    if (mode === "allegement") return slots;

    // TÂCHE 3 — Sprint final (rotation Sciences)
    const sprint = pickRotation(rotationSci, used, userSubjects);
    if (sprint) {
      used.add(sprint.id);
      slots.push({ bloc: sprint, weight: "light" });
    }

    return slots;
  }, [blocs, profile, yesterdayBlocIds]);

  const todayDayIndex = new Date().getDay();
  const dayIndexMondayBased = todayDayIndex === 0 ? 6 : todayDayIndex - 1;

  const handleEndDay = useCallback(async () => {
    if (!user || !profile) return;
    setEndingDay(true);

    const total = dailyTasks.length;
    const completed = dailyTasks.filter((t) => completedTasks.has(t.bloc.id)).length;
    const taux = total > 0 ? completed / total : 0;

    let newMode = "normal";
    if (taux >= 0.8) newMode = "normal";
    else if (taux >= 0.6) newMode = "maintien";
    else {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      const { data: recentCompletions } = await supabase
        .from("completions")
        .select("date_completion, completed")
        .eq("user_id", user.id)
        .gte("date_completion", threeDaysAgo.toISOString().split("T")[0])
        .order("date_completion", { ascending: true });

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

    await supabase.from("users").update({ mode_actuel: newMode }).eq("id", user.id);

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
    setProfile((prev) => (prev ? { ...prev, modeActuel: newMode } : prev));
  }, [user, profile, dailyTasks, completedTasks, currentPhase]);

  const allDone = dailyTasks.length > 0 && dailyTasks.every((t) => completedTasks.has(t.bloc.id));

  if (loading)
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground text-sm">Chargement de ton planning...</p>
        </div>
      </div>
    );

  if (profileError)
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center space-y-4">
          <div className="space-y-2">
            <h1 className="text-xl font-semibold">Impossible de charger ton planning</h1>
            <p className="text-sm text-muted-foreground">La connexion à Supabase répond, mais le profil n’a pas pu être chargé correctement.</p>
          </div>
          <Button onClick={() => window.location.reload()} className="w-full sprint-gradient text-primary-foreground">
            Réessayer
          </Button>
        </div>
      </div>
    );

  if (!profile) return null;

  const completedCount = dailyTasks.filter((t) => completedTasks.has(t.bloc.id)).length;

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
              <Button variant="ghost" size="icon" onClick={() => navigate("/profile")} aria-label="Profil">
                <Settings className="w-5 h-5 text-primary" />
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

        {/* Bandeau de phase selon jours restants */}
        {currentPhase === 2 && (
          <div className="rounded-xl border border-orange-300 bg-orange-50 dark:bg-orange-950/30 dark:border-orange-800 px-4 py-3 text-sm text-orange-900 dark:text-orange-200">
            ⚡ Mode entraînement intensif — ton planning est accéléré
          </div>
        )}
        {currentPhase === 3 && (
          <div className="rounded-xl border border-red-300 bg-red-50 dark:bg-red-950/30 dark:border-red-800 px-4 py-3 text-sm text-red-900 dark:text-red-200">
            🎯 Dernière ligne droite — concentre-toi sur tes points faibles
          </div>
        )}

        {/* Bandeau hebdomadaire phase 2 (lundi) */}
        {showWeeklyBanner && (
          <Card className="border-primary/30 bg-accent/30 rounded-xl">
            <CardContent className="p-3 flex items-center gap-3 flex-wrap">
              <p className="text-sm flex-1 min-w-[200px]">
                Nouvelle semaine — veux-tu ajuster tes priorités ?
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="sprint-gradient text-primary-foreground rounded-lg h-8"
                  onClick={() => navigate("/profile")}
                >
                  Oui, ajuster
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="rounded-lg h-8"
                  onClick={() => {
                    const key = `weekly-banner-dismissed-${new Date().toISOString().split("T")[0]}`;
                    localStorage.setItem(key, "1");
                    setShowWeeklyBanner(false);
                  }}
                >
                  <X className="w-3.5 h-3.5 mr-1" /> Non merci
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 3 CARTES */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
          {/* CARTE 1 — Sprint du jour */}
          <Card className="rounded-2xl flex flex-col">
            <CardContent className="p-5 flex flex-col flex-1 space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">🎯</span>
                <h2 className="text-base font-semibold">Mon sprint du jour</h2>
              </div>

              <div className="space-y-2 flex-1">
                {dailyTasks.map(({ bloc, weight }) => {
                  const done = completedTasks.has(bloc.id);
                  return (
                    <div
                      key={bloc.id}
                      className={`rounded-lg border bg-card p-3 space-y-2 ${done ? "opacity-60" : ""}`}
                    >
                      <div className="flex items-start gap-2">
                        <Checkbox checked={done} disabled className="mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap mb-1">
                            <Badge className={`${SUBJECT_COLORS[bloc.matiere] || "bg-muted text-foreground"} text-[10px] px-1.5 py-0`}>
                              {bloc.matiere}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground">
                              {TASK_ICONS[weight]}
                            </span>
                          </div>
                          <p className={`text-xs leading-snug ${done ? "line-through text-muted-foreground" : "font-medium"}`}>
                            {bloc.titre}
                          </p>
                          <p className="text-[10px] uppercase tracking-wide text-primary font-semibold mt-1">
                            {TASK_LABELS[weight]}
                          </p>
                          <p className="text-[10px] text-muted-foreground/80 mt-1 flex items-center gap-1">
                            <Sparkles className="w-2.5 h-2.5 text-primary shrink-0" />
                            L'IA va générer un exercice sur ce thème
                          </p>
                        </div>
                      </div>
                      {!done && (
                        <Button
                          size="sm"
                          onClick={() =>
                            navigate(`/work?bloc_id=${encodeURIComponent(bloc.id)}&mode=ai`)
                          }
                          className="w-full h-8 text-xs rounded-lg sprint-gradient text-primary-foreground"
                        >
                          <Play className="w-3 h-3 mr-1" /> Commencer
                        </Button>
                      )}
                    </div>
                  );
                })}
                {dailyTasks.length === 0 && (
                  <p className="text-muted-foreground text-xs text-center py-4">Aucune tâche disponible.</p>
                )}
              </div>

              {dailyTasks.length > 0 && (
                <p className="text-xs text-muted-foreground text-center">
                  {completedCount}/{dailyTasks.length} tâches complétées
                </p>
              )}

              {dailyTasks.length > 0 && allDone && (
                <Button
                  onClick={handleEndDay}
                  disabled={endingDay}
                  className="w-full rounded-xl h-10 text-sm font-medium sprint-gradient text-primary-foreground animate-in fade-in duration-500"
                >
                  {endingDay ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                  Terminer ma journée
                </Button>
              )}

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

          {/* CARTE 2 — Annales */}
          <Card className="rounded-2xl flex flex-col">
            <CardContent className="p-5 flex flex-col flex-1 space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">📄</span>
                <h2 className="text-base font-semibold">Passe un vrai sujet</h2>
              </div>
              <p className="text-xs text-muted-foreground -mt-2">Travaille un sujet officiel du brevet DNB</p>

              <div className="space-y-3 flex-1 flex flex-col justify-center">
                <button
                  onClick={() => navigate("/annales")}
                  className="w-full text-left rounded-xl border border-primary/20 bg-accent/30 p-4 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-foreground">Toutes les annales</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Tous les sujets officiels DNB</p>
                    </div>
                    <Badge className="sprint-gradient text-primary-foreground">Tout</Badge>
                  </div>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => navigate("/annales?matiere=Maths")}
                    className="rounded-lg border border-blue-200 bg-blue-50 p-2 text-xs font-medium text-blue-900 hover:bg-blue-100 transition-colors"
                  >
                    Maths
                  </button>
                  <button
                    onClick={() => navigate("/annales?matiere=Français")}
                    className="rounded-lg border border-purple-200 bg-purple-50 p-2 text-xs font-medium text-purple-900 hover:bg-purple-100 transition-colors"
                  >
                    Français
                  </button>
                  <button
                    onClick={() => navigate("/annales?matiere=Histoire-Géo")}
                    className="rounded-lg border border-orange-200 bg-orange-50 p-2 text-xs font-medium text-orange-900 hover:bg-orange-100 transition-colors"
                  >
                    Histoire-Géo
                  </button>
                  <button
                    onClick={() => navigate("/annales?matiere=Sciences")}
                    className="rounded-lg border border-red-200 bg-red-50 p-2 text-xs font-medium text-red-900 hover:bg-red-100 transition-colors"
                  >
                    Sciences
                  </button>
                </div>
              </div>

              {currentPhase === 3 && (
                <p className="text-xs text-primary/80 text-center italic">
                  Phase finale — entraîne-toi sur de vrais sujets 🎯
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Feedback */}
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
