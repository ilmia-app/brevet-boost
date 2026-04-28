import { useEffect, useState } from "react";
import { useTrophies } from "@/hooks/useTrophies";
import { getSeenTrophies, markTrophiesSeen, type EvaluatedTrophy } from "@/lib/trophies";
import TrophyCelebrationModal from "./TrophyCelebrationModal";

/**
 * Detects newly unlocked trophies (vs localStorage "seen" set)
 * and shows the celebration modal.
 */
const TrophyWatcher = () => {
  const { trophies, loading } = useTrophies();
  const [pending, setPending] = useState<EvaluatedTrophy[]>([]);

  useEffect(() => {
    if (loading) return;
    const seen = getSeenTrophies();
    const unlocked = trophies.filter((t) => t.unlocked);
    const fresh = unlocked.filter((t) => !seen.has(t.id));
    if (fresh.length === 0) return;
    setPending(fresh);
  }, [trophies, loading]);

  return (
    <TrophyCelebrationModal
      trophies={pending}
      onClose={() => {
        markTrophiesSeen(pending.map((t) => t.id));
        setPending([]);
      }}
    />
  );
};

export default TrophyWatcher;