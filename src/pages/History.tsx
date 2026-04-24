import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, CheckCircle2, Clock, Play, Trash2, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface SessionRow {
  id: string;
  bloc_id: string;
  bloc_titre: string | null;
  bloc_matiere: string | null;
  duration_seconds: number | null;
  is_ai_generated: boolean | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  questions: unknown;
  answers: unknown;
}

const SUBJECT_COLORS: Record<string, string> = {
  Maths: "bg-blue-500 text-white",
  "Français": "bg-purple-500 text-white",
  Histoire: "bg-orange-500 text-white",
  "Géographie": "bg-emerald-500 text-white",
  EMC: "bg-yellow-500 text-white",
  Physique: "bg-red-500 text-white",
  SVT: "bg-green-700 text-white",
  Techno: "bg-gray-500 text-white",
};

const formatDuration = (s: number | null) => {
  if (!s) return "—";
  const m = Math.floor(s / 60);
  if (m < 1) return `${s}s`;
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  return `${h}h${(m % 60).toString().padStart(2, "0")}`;
};

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })
    + " · " + d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
};

const History = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("sessions_travail")
      .select("id, bloc_id, bloc_titre, bloc_matiere, duration_seconds, is_ai_generated, completed_at, created_at, updated_at, questions, answers")
      .order("updated_at", { ascending: false })
      .limit(100);
    if (error) {
      console.error("[History] load error:", error);
      toast.error("Impossible de charger l'historique");
    } else {
      setSessions(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleResume = (s: SessionRow) => {
    const params = new URLSearchParams();
    params.set("bloc_id", s.bloc_id);
    params.set("session_id", s.id);
    if (s.is_ai_generated) params.set("mode", "ai");
    navigate(`/work?${params.toString()}`);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer cette session de l'historique ?")) return;
    const { error } = await supabase.from("sessions_travail").delete().eq("id", id);
    if (error) {
      toast.error("Suppression impossible");
    } else {
      setSessions((prev) => prev.filter((s) => s.id !== id));
    }
  };

  const computeProgress = (s: SessionRow): string | null => {
    const qs = Array.isArray(s.questions) ? (s.questions as unknown[]) : null;
    const ans = s.answers && typeof s.answers === "object" ? (s.answers as Record<string, string>) : {};
    if (!qs || qs.length === 0) return null;
    const answered = Object.values(ans).filter((v) => typeof v === "string" && v.trim().length > 0).length;
    return `${answered}/${qs.length} réponses`;
  };

  return (
    <div className="min-h-screen bg-background pb-8">
      <div className="max-w-3xl mx-auto px-4 pt-4 space-y-6">
        <button
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Retour au tableau de bord
        </button>

        <header className="space-y-1">
          <h1 className="text-2xl font-bold">Historique</h1>
          <p className="text-sm text-muted-foreground">Retrouve et reprends tes sessions de travail.</p>
        </header>

        {loading ? (
          <p className="text-sm text-muted-foreground">Chargement…</p>
        ) : sessions.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center space-y-2">
              <p className="text-sm text-muted-foreground">Aucune session pour l'instant.</p>
              <Button size="sm" onClick={() => navigate("/dashboard")}>Aller au tableau de bord</Button>
            </CardContent>
          </Card>
        ) : (
          <ul className="space-y-3">
            {sessions.map((s) => {
              const isDone = !!s.completed_at;
              const progress = computeProgress(s);
              return (
                <li key={s.id}>
                  <Card className="border-l-4 border-l-primary/40">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            {s.bloc_matiere && (
                              <Badge className={SUBJECT_COLORS[s.bloc_matiere] || "bg-muted text-foreground"}>
                                {s.bloc_matiere}
                              </Badge>
                            )}
                            {s.is_ai_generated && (
                              <Badge variant="outline" className="text-xs gap-1">
                                <Sparkles className="w-3 h-3" /> IA
                              </Badge>
                            )}
                            {isDone ? (
                              <Badge variant="outline" className="text-xs gap-1 border-primary/40 text-primary">
                                <CheckCircle2 className="w-3 h-3" /> Terminée
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs gap-1">
                                En cours
                              </Badge>
                            )}
                          </div>
                          <h2 className="font-semibold text-sm leading-snug truncate">
                            {s.bloc_titre || s.bloc_id}
                          </h2>
                          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                            <span>{formatDate(s.updated_at)}</span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" /> {formatDuration(s.duration_seconds)}
                            </span>
                            {progress && <span>{progress}</span>}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(s.id)}
                          className="h-8 text-xs text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleResume(s)}
                          className="h-8 text-xs gap-1.5 sprint-gradient text-primary-foreground"
                        >
                          <Play className="w-3.5 h-3.5" />
                          {isDone ? "Revoir" : "Reprendre"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

export default History;
