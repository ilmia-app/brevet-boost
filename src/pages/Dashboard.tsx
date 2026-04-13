import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Play, Clock, MessageCircle, Loader2 } from "lucide-react";

interface ProfileData {
  id: string;
  name: string;
  examDate: string;
  rhythm: string;
  level: string;
  subjects: string[];
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
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [blocs, setBlocs] = useState<BlocExamen[]>([]);
  const [feedback, setFeedback] = useState<MessageFeedback | null>(null);
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // Load profile from Supabase
  useEffect(() => {
    const userId = localStorage.getItem("sprint_dnb_user_id");
    if (!userId) {
      navigate("/");
      return;
    }
    const fetchProfile = async () => {
      const { data } = await supabase
        .from("users")
        .select("id, prenom, date_examen, volume_quotidien, retard_initial, matieres_faibles")
        .eq("id", userId)
        .single();
      if (!data) {
        navigate("/");
        return;
      }
      console.log("matieres_faibles brut depuis Supabase:", data.matieres_faibles);
      setProfile({
        id: data.id,
        name: data.prenom || "",
        examDate: data.date_examen || "",
        rhythm: data.volume_quotidien || "",
        level: data.retard_initial || "",
        subjects: data.matieres_faibles || [],
      });
      setLoading(false);
    };
    fetchProfile();
  }, [navigate]);

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

  // Feedback fetch moved below currentPhase

  // Computed values
  const daysUntilExam = useMemo(() => {
    if (!profile?.examDate) return 0;
    const diff = new Date(profile.examDate).getTime() - new Date().getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }, [profile]);

  const totalSprintDays = useMemo(() => {
    return Math.max(daysUntilExam, 1);
  }, [daysUntilExam]);

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


  const dailyTasks = useMemo(() => {
    const userSubjects = profile?.subjects || [];
    console.log("Subjects pour le planning:", userSubjects);

    const usedIds = new Set<string>();
    const slots: Array<{ bloc: BlocExamen; weight: "heavy" | "medium" | "light" }> = [];
    const weights: Array<"heavy" | "medium" | "light"> = ["heavy", "medium", "light"];

    // Case-insensitive match helper
    const matchesSubject = (blocMatiere: string, subject: string) =>
      blocMatiere.toLowerCase() === subject.toLowerCase();

    // Step 1: For each subject in matieres_faibles, pick a bloc (one per subject)
    for (let i = 0; i < Math.min(userSubjects.length, 3); i++) {
      const subject = userSubjects[i];
      const bloc = blocs.find(
        (b) => !usedIds.has(b.id) && matchesSubject(b.matiere, subject)
      );
      if (bloc) {
        usedIds.add(bloc.id);
        slots.push({ bloc, weight: weights[i] });
      }
    }

    // Step 2: Fill remaining slots (up to 3) with any priorite=1 bloc not yet used
    while (slots.length < 3) {
      const weight = weights[slots.length];
      const bloc = blocs.find((b) => !usedIds.has(b.id));
      if (!bloc) break;
      usedIds.add(bloc.id);
      slots.push({ bloc, weight });
    }

    return slots;
  }, [blocs, profile]);

  const todayDayIndex = new Date().getDay(); // 0=Sun
  const dayIndexMondayBased = todayDayIndex === 0 ? 6 : todayDayIndex - 1;

  const toggleTask = (id: string) => {
    setCompletedTasks((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (!profile || loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
        <p className="text-muted-foreground text-sm">Chargement de ton planning...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background pb-8">
      <div className="max-w-lg mx-auto px-4 pt-6 space-y-6">
        {/* SECTION 1 — Header */}
        <section className="space-y-3">
          <h1 className="text-2xl font-bold">Bonjour {profile.name} 👋</h1>
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

        {/* SECTION 2 — Planning du jour */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Ton programme d'aujourd'hui</h2>
          {dailyTasks.map(({ bloc, weight }) => (
            <Card
              key={bloc!.id}
              className={`transition-all ${
                completedTasks.has(bloc!.id) ? "opacity-60" : ""
              }`}
            >
              <CardContent className="p-4 flex items-start gap-3">
                <Checkbox
                  checked={completedTasks.has(bloc!.id)}
                  onCheckedChange={() => toggleTask(bloc!.id)}
                  className="mt-1"
                />
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={SUBJECT_COLORS[bloc!.matiere] || "bg-muted text-foreground"}>
                      {bloc!.matiere}
                    </Badge>
                    <Badge variant="outline" className={`text-xs font-semibold border ${TASK_LABEL_COLORS[weight]}`}>
                      {TASK_ICONS[weight]} {TASK_LABELS[weight]}
                    </Badge>
                  </div>
                  <p
                    className={`font-medium text-sm leading-snug ${
                      completedTasks.has(bloc!.id) ? "line-through" : ""
                    }`}
                  >
                    {bloc!.titre}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {bloc!.duree_min} min
                    </span>
                    <Button
                      size="sm"
                      className="h-7 text-xs rounded-lg sprint-gradient text-primary-foreground"
                      onClick={() => navigate(`/work?bloc=${bloc!.id}&slot=${weight}`)}
                    >
                      <Play className="w-3 h-3 mr-1" /> Commencer
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {dailyTasks.length === 0 && (
            <p className="text-muted-foreground text-sm text-center py-4">
              Aucune tâche disponible pour tes matières.
            </p>
          )}
        </section>

        {/* SECTION 3 — Progression semaine */}
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Progression de la semaine</h2>
          <div className="flex justify-between px-2">
            {DAYS.map((day, i) => {
              const isPast = i < dayIndexMondayBased;
              const isToday = i === dayIndexMondayBased;
              return (
                <div key={i} className="flex flex-col items-center gap-1">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
                      isPast
                        ? "sprint-gradient text-primary-foreground"
                        : isToday
                        ? "border-2 border-primary text-primary bg-transparent"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {day}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* SECTION 4 — Feedback */}
        {feedback?.message && (
          <section>
            <Card className="border-primary/20 bg-accent/30">
              <CardContent className="p-4 flex items-start gap-3">
                <MessageCircle className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <p className="text-sm text-foreground/80 leading-relaxed">
                  {feedback.message}
                </p>
              </CardContent>
            </Card>
          </section>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
