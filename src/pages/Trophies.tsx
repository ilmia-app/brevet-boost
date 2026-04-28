import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress as ProgressBar } from "@/components/ui/progress";
import { useTrophies } from "@/hooks/useTrophies";
import TrophyCard from "@/components/trophies/TrophyCard";

const CATEGORIES: Array<{ id: "regularite" | "defi"; label: string }> = [
  { id: "regularite", label: "Régularité" },
  { id: "defi", label: "Défis spéciaux" },
];

const TrophiesPage = () => {
  const navigate = useNavigate();
  const { trophies, loading, stats } = useTrophies();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const pct = stats.total > 0 ? Math.round((stats.unlocked / stats.total) * 100) : 0;

  return (
    <div className="min-h-screen bg-background pb-8">
      <div className="max-w-lg mx-auto px-4 pt-6 space-y-6">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/dashboard")}
            aria-label="Retour au tableau de bord"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold">Tes trophées</h1>
        </div>

        <section className="rounded-2xl border bg-gradient-to-br from-accent/40 to-background p-5 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full sprint-gradient flex items-center justify-center shadow-md">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Collection</p>
              <p className="text-xl font-bold">
                {stats.unlocked} / {stats.total} trophées
              </p>
            </div>
          </div>
          <ProgressBar value={pct} className="h-2.5 rounded-full" />
        </section>

        {CATEGORIES.map((cat) => {
          const list = trophies.filter((t) => t.category === cat.id);
          if (list.length === 0) return null;
          const unlockedInCat = list.filter((t) => t.unlocked).length;
          return (
            <section key={cat.id} className="space-y-3">
              <div className="flex items-baseline justify-between">
                <h2 className="text-lg font-semibold">{cat.label}</h2>
                <span className="text-xs text-muted-foreground">
                  {unlockedInCat}/{list.length}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {list.map((t) => (
                  <TrophyCard key={t.id} trophy={t} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
};

export default TrophiesPage;