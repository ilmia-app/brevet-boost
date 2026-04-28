import { Flame, Calendar, Trophy, Star, Zap, Award, Sunrise, Moon, Target, Rocket, Crown, Medal } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type TrophyCategory = "regularite" | "defi";

export interface TrophyDef {
  id: string;
  name: string;
  description: string;
  category: TrophyCategory;
  icon: LucideIcon;
  /** Tailwind classes for the icon background gradient when unlocked. */
  color: string;
  /** Returns 0..1 progress and unlocked flag, given context. */
  evaluate: (ctx: TrophyContext) => { progress: number; unlocked: boolean; valueLabel?: string };
}

export interface SessionLite {
  completed_at: string | null;
  created_at: string;
  duration_seconds: number | null;
  bloc_matiere: string | null;
}

export interface CompletionLite {
  date_completion: string;
  completed: boolean;
  bloc_id: string;
}

export interface TrophyContext {
  completions: CompletionLite[];
  sessions: SessionLite[];
  /** Set of unique completion dates (YYYY-MM-DD). */
  completionDays: Set<string>;
  currentStreak: number;
  totalCompletions: number;
}

const ratio = (val: number, target: number) => Math.min(1, val / target);

/** Compute current consecutive-day streak ending today or yesterday. */
export function computeStreak(days: Set<string>): number {
  if (days.size === 0) return 0;
  const sorted = Array.from(days).sort().reverse();
  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  if (sorted[0] !== today && sorted[0] !== yesterday) return 0;
  let count = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const curr = new Date(sorted[i]);
    if ((prev.getTime() - curr.getTime()) / 86400000 === 1) count++;
    else break;
  }
  return count;
}

/** Number of distinct subjects worked in a single calendar day. */
function maxSubjectsInOneDay(sessions: SessionLite[]): number {
  const byDay = new Map<string, Set<string>>();
  for (const s of sessions) {
    if (!s.completed_at || !s.bloc_matiere) continue;
    const d = s.completed_at.split("T")[0];
    if (!byDay.has(d)) byDay.set(d, new Set());
    byDay.get(d)!.add(s.bloc_matiere);
  }
  let max = 0;
  for (const set of byDay.values()) max = Math.max(max, set.size);
  return max;
}

/** Number of completed sessions whose timer ran for at least N minutes. */
function longSessionsCount(sessions: SessionLite[], minMinutes: number): number {
  return sessions.filter(
    (s) => s.completed_at && (s.duration_seconds || 0) >= minMinutes * 60,
  ).length;
}

/** True if user completed at least one session before/after a given hour (local time). */
function hasSessionAtHour(sessions: SessionLite[], opts: { before?: number; after?: number }): boolean {
  return sessions.some((s) => {
    if (!s.completed_at) return false;
    const h = new Date(s.completed_at).getHours();
    if (opts.before !== undefined && h < opts.before) return true;
    if (opts.after !== undefined && h >= opts.after) return true;
    return false;
  });
}

/** Has the user completed at least one task on a Saturday AND a Sunday? */
function workedFullWeekend(days: Set<string>): boolean {
  let sat = false;
  let sun = false;
  for (const d of days) {
    const day = new Date(d).getDay();
    if (day === 6) sat = true;
    if (day === 0) sun = true;
    if (sat && sun) return true;
  }
  return false;
}

export const TROPHIES: TrophyDef[] = [
  // === Régularité ===
  {
    id: "first-step",
    name: "Premier pas",
    description: "Termine ta toute première tâche",
    category: "regularite",
    icon: Star,
    color: "from-blue-400 to-blue-600",
    evaluate: ({ totalCompletions }) => ({
      progress: ratio(totalCompletions, 1),
      unlocked: totalCompletions >= 1,
      valueLabel: `${Math.min(totalCompletions, 1)}/1`,
    }),
  },
  {
    id: "streak-3",
    name: "En route",
    description: "3 jours d'affilée",
    category: "regularite",
    icon: Flame,
    color: "from-orange-400 to-orange-600",
    evaluate: ({ currentStreak }) => ({
      progress: ratio(currentStreak, 3),
      unlocked: currentStreak >= 3,
      valueLabel: `${Math.min(currentStreak, 3)}/3 j`,
    }),
  },
  {
    id: "streak-7",
    name: "Semaine de feu",
    description: "7 jours d'affilée",
    category: "regularite",
    icon: Flame,
    color: "from-orange-500 to-red-500",
    evaluate: ({ currentStreak }) => ({
      progress: ratio(currentStreak, 7),
      unlocked: currentStreak >= 7,
      valueLabel: `${Math.min(currentStreak, 7)}/7 j`,
    }),
  },
  {
    id: "streak-14",
    name: "Inarrêtable",
    description: "14 jours d'affilée",
    category: "regularite",
    icon: Zap,
    color: "from-yellow-400 to-orange-500",
    evaluate: ({ currentStreak }) => ({
      progress: ratio(currentStreak, 14),
      unlocked: currentStreak >= 14,
      valueLabel: `${Math.min(currentStreak, 14)}/14 j`,
    }),
  },
  {
    id: "streak-30",
    name: "Légende du sprint",
    description: "30 jours d'affilée",
    category: "regularite",
    icon: Crown,
    color: "from-amber-400 to-yellow-600",
    evaluate: ({ currentStreak }) => ({
      progress: ratio(currentStreak, 30),
      unlocked: currentStreak >= 30,
      valueLabel: `${Math.min(currentStreak, 30)}/30 j`,
    }),
  },
  {
    id: "active-days-10",
    name: "Habitué",
    description: "10 jours actifs au total",
    category: "regularite",
    icon: Calendar,
    color: "from-emerald-400 to-emerald-600",
    evaluate: ({ completionDays }) => ({
      progress: ratio(completionDays.size, 10),
      unlocked: completionDays.size >= 10,
      valueLabel: `${Math.min(completionDays.size, 10)}/10 j`,
    }),
  },
  {
    id: "active-days-30",
    name: "Marathonien",
    description: "30 jours actifs au total",
    category: "regularite",
    icon: Medal,
    color: "from-emerald-500 to-teal-600",
    evaluate: ({ completionDays }) => ({
      progress: ratio(completionDays.size, 30),
      unlocked: completionDays.size >= 30,
      valueLabel: `${Math.min(completionDays.size, 30)}/30 j`,
    }),
  },
  {
    id: "weekend-warrior",
    name: "Weekend warrior",
    description: "Travaille un samedi ET un dimanche",
    category: "regularite",
    icon: Calendar,
    color: "from-purple-400 to-purple-600",
    evaluate: ({ completionDays }) => ({
      progress: workedFullWeekend(completionDays) ? 1 : 0,
      unlocked: workedFullWeekend(completionDays),
    }),
  },

  // === Défis spéciaux ===
  {
    id: "tasks-25",
    name: "Sur ta lancée",
    description: "25 tâches réalisées",
    category: "defi",
    icon: Target,
    color: "from-blue-400 to-cyan-500",
    evaluate: ({ totalCompletions }) => ({
      progress: ratio(totalCompletions, 25),
      unlocked: totalCompletions >= 25,
      valueLabel: `${Math.min(totalCompletions, 25)}/25`,
    }),
  },
  {
    id: "tasks-100",
    name: "Centurion",
    description: "100 tâches réalisées",
    category: "defi",
    icon: Trophy,
    color: "from-amber-400 to-orange-500",
    evaluate: ({ totalCompletions }) => ({
      progress: ratio(totalCompletions, 100),
      unlocked: totalCompletions >= 100,
      valueLabel: `${Math.min(totalCompletions, 100)}/100`,
    }),
  },
  {
    id: "deep-focus",
    name: "Concentration max",
    description: "Termine une session de 30 min ou +",
    category: "defi",
    icon: Target,
    color: "from-indigo-400 to-indigo-600",
    evaluate: ({ sessions }) => {
      const count = longSessionsCount(sessions, 30);
      return {
        progress: ratio(count, 1),
        unlocked: count >= 1,
      };
    },
  },
  {
    id: "polyglotte",
    name: "Touche-à-tout",
    description: "3 matières différentes en un seul jour",
    category: "defi",
    icon: Award,
    color: "from-pink-400 to-purple-500",
    evaluate: ({ sessions }) => {
      const max = maxSubjectsInOneDay(sessions);
      return {
        progress: ratio(max, 3),
        unlocked: max >= 3,
        valueLabel: `${Math.min(max, 3)}/3`,
      };
    },
  },
  {
    id: "early-bird",
    name: "Lève-tôt",
    description: "Termine une tâche avant 8h",
    category: "defi",
    icon: Sunrise,
    color: "from-yellow-300 to-amber-500",
    evaluate: ({ sessions }) => {
      const ok = hasSessionAtHour(sessions, { before: 8 });
      return { progress: ok ? 1 : 0, unlocked: ok };
    },
  },
  {
    id: "night-owl",
    name: "Couche-tard",
    description: "Termine une tâche après 22h",
    category: "defi",
    icon: Moon,
    color: "from-indigo-500 to-purple-700",
    evaluate: ({ sessions }) => {
      const ok = hasSessionAtHour(sessions, { after: 22 });
      return { progress: ok ? 1 : 0, unlocked: ok };
    },
  },
  {
    id: "perfect-day",
    name: "Journée parfaite",
    description: "Termine 5 tâches en une seule journée",
    category: "defi",
    icon: Rocket,
    color: "from-emerald-400 to-green-600",
    evaluate: ({ completions }) => {
      const counts = new Map<string, number>();
      for (const c of completions) {
        counts.set(c.date_completion, (counts.get(c.date_completion) || 0) + 1);
      }
      const max = Math.max(0, ...counts.values());
      return {
        progress: ratio(max, 5),
        unlocked: max >= 5,
        valueLabel: `${Math.min(max, 5)}/5`,
      };
    },
  },
];

export interface EvaluatedTrophy extends TrophyDef {
  progress: number;
  unlocked: boolean;
  valueLabel?: string;
}

export function evaluateAll(ctx: TrophyContext): EvaluatedTrophy[] {
  return TROPHIES.map((t) => ({ ...t, ...t.evaluate(ctx) }));
}

const SEEN_KEY = "sprintdnb.trophies.seen";

export function getSeenTrophies(): Set<string> {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

export function markTrophiesSeen(ids: string[]) {
  const seen = getSeenTrophies();
  ids.forEach((id) => seen.add(id));
  localStorage.setItem(SEEN_KEY, JSON.stringify(Array.from(seen)));
}