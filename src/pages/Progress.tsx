import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress as ProgressBar } from "@/components/ui/progress";
import { Loader2, ArrowLeft, Calendar, CheckCircle2, Flame, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useTrophies } from "@/hooks/useTrophies";
import TrophyCard from "@/components/trophies/TrophyCard";

const SUBJECT_COLORS: Record<string, string> = {
  Maths: "bg-blue-500",
  Français: "bg-purple-500",
  Histoire: "bg-orange-500",
  Géographie: "bg-emerald-500",
  EMC: "bg-yellow-500",
  Physique: "bg-red-500",
  SVT: "bg-green-700",
  Techno: "bg-gray-500",
};

const SUBJECT_BAR_COLORS: Record<string, string> = {
  Maths: "bg-blue-500",
  Français: "bg-purple-500",
  Histoire: "bg-orange-500",
  Géographie: "bg-emerald-500",
  EMC: "bg-yellow-500",
  Physique: "bg-red-500",
  SVT: "bg-green-700",
  Techno: "bg-gray-500",
};

interface BlocExamen {
  id: string;
  matiere: string;
  titre: string;
}

interface CompletionRow {
  bloc_id: string;
  date_completion: string;
  completed: boolean;
}

interface QcmResultRow {
  bloc_id: string | null;
  est_correcte: boolean | null;
  prochaine_revision: string | null;
}

const ProgressPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [blocs, setBlocs] = useState<BlocExamen[]>([]);
  const [completions, setCompletions] = useState<CompletionRow[]>([]);
  const [examDate, setExamDate] = useState<string | null>(null);
  const [qcmResults, setQcmResults] = useState<QcmResultRow[]>([]);
  const { trophies, stats: trophyStats, loading: trophyLoading } = useTrophies();

  useEffect(() => {
    if (!user) { navigate("/login"); return; }
    const load = async () => {
      const [blocsRes, compRes, userRes, qcmRes] = await Promise.all([
        supabase.from("blocs_examen").select("id, matiere, titre"),
        supabase.from("completions").select("bloc_id, date_completion, completed").eq("user_id", user.id).eq("completed", true),
        supabase.from("users").select("date_examen").eq("id", user.id).maybeSingle(),
        supabase.from("qcm_results").select("bloc_id, est_correcte, prochaine_revision").eq("user_id", user.id),
      ]);
      if (blocsRes.data) setBlocs(blocsRes.data);
      if (compRes.data) setCompletions(compRes.data);
      if (userRes.data) setExamDate(userRes.data.date_examen);
      if (qcmRes.data) setQcmResults(qcmRes.data as QcmResultRow[]);
      setLoading(false);
    };
    load();
  }, [user, navigate]);

  // Global stats
  const totalBlocs = blocs.length;
  const completedBlocIds = useMemo(() => new Set(completions.map(c => c.bloc_id)), [completions]);
  const globalPercent = totalBlocs > 0 ? Math.round((completedBlocIds.size / totalBlocs) * 100) : 0;

  // Active days
  const completionDays = useMemo(() => {
    const days = new Set(completions.map(c => c.date_completion));
    return days;
  }, [completions]);

  const activeDays = completionDays.size;
  const totalCompletions = completions.length;

  // Current streak
  const streak = useMemo(() => {
    if (completionDays.size === 0) return 0;
    const sorted = Array.from(completionDays).sort().reverse();
    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
    
    // Streak must include today or yesterday
    if (sorted[0] !== today && sorted[0] !== yesterday) return 0;
    
    let count = 1;
    for (let i = 1; i < sorted.length; i++) {
      const prev = new Date(sorted[i - 1]);
      const curr = new Date(sorted[i]);
      const diff = (prev.getTime() - curr.getTime()) / 86400000;
      if (diff === 1) count++;
      else break;
    }
    return count;
  }, [completionDays]);

  // Per-subject progress
  const subjectProgress = useMemo(() => {
    const subjects = new Map<string, { total: number; done: number }>();
    for (const b of blocs) {
      if (!subjects.has(b.matiere)) subjects.set(b.matiere, { total: 0, done: 0 });
      subjects.get(b.matiere)!.total++;
      if (completedBlocIds.has(b.id)) subjects.get(b.matiere)!.done++;
    }
    return Array.from(subjects.entries())
      .map(([name, { total, done }]) => ({ name, total, done, percent: Math.round((done / total) * 100) }))
      .sort((a, b) => b.percent - a.percent);
  }, [blocs, completedBlocIds]);

  // Top 5 blocs avec le plus d'erreurs au QCM
  const blocsByIdMap = useMemo(() => {
    const m = new Map<string, BlocExamen>();
    for (const b of blocs) m.set(b.id, b);
    return m;
  }, [blocs]);

  const blocsAretravailler = useMemo(() => {
    const stats = new Map<string, { errors: number; nextRevision: string | null }>();
    for (const r of qcmResults) {
      if (!r.bloc_id || r.est_correcte !== false) continue;
      const cur = stats.get(r.bloc_id) || { errors: 0, nextRevision: null };
      cur.errors += 1;
      if (r.prochaine_revision && (!cur.nextRevision || r.prochaine_revision > cur.nextRevision)) {
        cur.nextRevision = r.prochaine_revision;
      }
      stats.set(r.bloc_id, cur);
    }
    return Array.from(stats.entries())
      .map(([blocId, s]) => ({ bloc: blocsByIdMap.get(blocId), blocId, ...s }))
      .filter((x) => x.bloc)
      .sort((a, b) => b.errors - a.errors)
      .slice(0, 5);
  }, [qcmResults, blocsByIdMap]);

  // Calendar grid (8 weeks)
  const calendarData = useMemo(() => {
    if (!examDate) return [];
    const exam = new Date(examDate);
    const sprintStart = new Date(exam);
    sprintStart.setDate(sprintStart.getDate() - 55); // ~8 weeks before

    // Count completions per day
    const dayCompletionCount = new Map<string, number>();
    const dayTotalExpected = 3; // approximate daily tasks
    for (const c of completions) {
      dayCompletionCount.set(c.date_completion, (dayCompletionCount.get(c.date_completion) || 0) + 1);
    }

    const today = new Date().toISOString().split("T")[0];
    const cells: Array<{ date: string; rate: number; isToday: boolean; isFuture: boolean }> = [];
    
    for (let i = 0; i < 56; i++) {
      const d = new Date(sprintStart);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split("T")[0];
      const count = dayCompletionCount.get(dateStr) || 0;
      const rate = count / dayTotalExpected;
      cells.push({
        date: dateStr,
        rate: Math.min(1, rate),
        isToday: dateStr === today,
        isFuture: dateStr > today,
      });
    }
    return cells;
  }, [examDate, completions]);

  // Mastered blocs (completed >= 2 times)
  const masteredBlocs = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of completions) {
      counts.set(c.bloc_id, (counts.get(c.bloc_id) || 0) + 1);
    }
    return blocs.filter(b => (counts.get(b.id) || 0) >= 2);
  }, [blocs, completions]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-8">
      <div className="max-w-lg mx-auto px-4 pt-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")} aria-label="Retour au tableau de bord">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold">Ta progression</h1>
        </div>

        {/* SECTION 1 — Vue globale */}
        <section className="space-y-4">
          <div className="space-y-1">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Progression globale</span>
              <span className="font-semibold text-foreground">{globalPercent}%</span>
            </div>
            <ProgressBar value={globalPercent} className="h-3 rounded-full" />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Card>
              <CardContent className="p-3 text-center space-y-1">
                <Calendar className="w-5 h-5 mx-auto text-primary" />
                <p className="text-2xl font-bold">{activeDays}</p>
                <p className="text-xs text-muted-foreground">Jours actifs</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center space-y-1">
                <CheckCircle2 className="w-5 h-5 mx-auto text-secondary" />
                <p className="text-2xl font-bold">{totalCompletions}</p>
                <p className="text-xs text-muted-foreground">Tâches réalisées</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center space-y-1">
                <Flame className="w-5 h-5 mx-auto text-orange-500" />
                <p className="text-2xl font-bold">{streak}</p>
                <p className="text-xs text-muted-foreground">Série en cours</p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* SECTION 2 — Par matière */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Progression par matière</h2>
          {subjectProgress.map(({ name, total, done, percent }) => (
            <div key={name} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${SUBJECT_COLORS[name] || "bg-muted"}`} />
                  <span className="text-sm font-medium">{name}</span>
                </div>
                <span className="text-xs text-muted-foreground">{done}/{total} · {percent}%</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${SUBJECT_BAR_COLORS[name] || "bg-primary"}`}
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          ))}
        </section>

        {/* SECTION 3 — Calendrier */}
        {blocsAretravailler.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Points à retravailler 🎯</h2>
            <div className="space-y-2">
              {blocsAretravailler.map(({ blocId, bloc, errors, nextRevision }) => (
                <Card key={blocId}>
                  <CardContent className="p-3 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${SUBJECT_COLORS[bloc!.matiere] || "bg-muted"}`} />
                        <p className="text-sm font-medium truncate">{bloc!.titre}</p>
                      </div>
                      {nextRevision && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Prochaine révision : {new Date(nextRevision).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-lg font-bold text-red-600 leading-none">{errors}</p>
                      <p className="text-[10px] text-muted-foreground">erreur{errors > 1 ? "s" : ""}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {calendarData.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Calendrier du sprint</h2>
            <div className="grid grid-cols-7 gap-1.5">
              {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => (
                <div key={i} className="text-center text-xs text-muted-foreground font-medium">{d}</div>
              ))}
              {calendarData.map((cell, i) => {
                let bg = "bg-muted/50"; // future
                if (cell.isToday) bg = "bg-primary";
                else if (!cell.isFuture) {
                  if (cell.rate === 0) bg = "bg-background border border-border";
                  else if (cell.rate >= 0.8) bg = "bg-green-600";
                  else if (cell.rate >= 0.6) bg = "bg-green-400";
                  else bg = "bg-green-200";
                }
                const textColor = cell.isToday || (!cell.isFuture && cell.rate >= 0.6) ? "text-white" : "";
                return (
                  <Tooltip key={i}>
                    <TooltipTrigger asChild>
                      <div className={`aspect-square rounded-md ${bg} ${textColor} flex items-center justify-center text-[10px] cursor-default`}>
                        {new Date(cell.date).getDate()}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">
                        {new Date(cell.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                        {!cell.isFuture && ` · ${Math.round(cell.rate * 100)}%`}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </section>
        )}

        {/* SECTION — Trophées */}
        {!trophyLoading && trophies.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Trophées</h2>
              <button
                onClick={() => navigate("/trophees")}
                className="text-sm text-primary hover:underline"
              >
                Voir tout ({trophyStats.unlocked}/{trophyStats.total})
              </button>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {[...trophies]
                .sort((a, b) => {
                  if (a.unlocked !== b.unlocked) return a.unlocked ? -1 : 1;
                  return b.progress - a.progress;
                })
                .slice(0, 6)
                .map((t) => (
                  <TrophyCard key={t.id} trophy={t} compact />
                ))}
            </div>
          </section>
        )}

        {/* SECTION 4 — Blocs maîtrisés */}
        {masteredBlocs.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Ce que tu maîtrises déjà ✓</h2>
            <div className="flex flex-wrap gap-2">
              {masteredBlocs.map(b => (
                <Badge key={b.id} className="bg-green-100 text-green-800 border border-green-200 hover:bg-green-200">
                  <Trophy className="w-3 h-3 mr-1" />
                  {b.titre}
                </Badge>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default ProgressPage;
