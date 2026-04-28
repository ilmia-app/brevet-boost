import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  computeStreak,
  evaluateAll,
  type CompletionLite,
  type EvaluatedTrophy,
  type SessionLite,
} from "@/lib/trophies";

interface State {
  loading: boolean;
  trophies: EvaluatedTrophy[];
  completions: CompletionLite[];
  sessions: SessionLite[];
}

/** Loads completions + sessions and evaluates all trophies. */
export function useTrophies() {
  const { user } = useAuth();
  const [state, setState] = useState<State>({
    loading: true,
    trophies: [],
    completions: [],
    sessions: [],
  });

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const [compRes, sessRes] = await Promise.all([
        supabase
          .from("completions")
          .select("date_completion, completed, bloc_id")
          .eq("user_id", user.id)
          .eq("completed", true),
        supabase
          .from("sessions_travail")
          .select("completed_at, created_at, duration_seconds, bloc_matiere")
          .eq("user_id", user.id),
      ]);
      if (cancelled) return;
      const completions = (compRes.data || []) as CompletionLite[];
      const sessions = (sessRes.data || []) as SessionLite[];
      const days = new Set(completions.map((c) => c.date_completion));
      const trophies = evaluateAll({
        completions,
        sessions,
        completionDays: days,
        currentStreak: computeStreak(days),
        totalCompletions: completions.length,
      });
      setState({ loading: false, trophies, completions, sessions });
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const stats = useMemo(() => {
    const unlocked = state.trophies.filter((t) => t.unlocked).length;
    return { unlocked, total: state.trophies.length };
  }, [state.trophies]);

  return { ...state, stats };
}