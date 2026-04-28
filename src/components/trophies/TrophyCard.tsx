import { Lock } from "lucide-react";
import type { EvaluatedTrophy } from "@/lib/trophies";
import { cn } from "@/lib/utils";

interface Props {
  trophy: EvaluatedTrophy;
  compact?: boolean;
}

const TrophyCard = ({ trophy, compact }: Props) => {
  const Icon = trophy.icon;
  const pct = Math.round(trophy.progress * 100);

  return (
    <div
      className={cn(
        "relative rounded-xl border bg-card p-3 flex flex-col items-center text-center gap-2 transition-all",
        trophy.unlocked ? "border-primary/30 shadow-sm" : "border-border opacity-90",
      )}
    >
      <div
        className={cn(
          "rounded-full flex items-center justify-center shadow-sm",
          compact ? "w-12 h-12" : "w-14 h-14",
          trophy.unlocked
            ? `bg-gradient-to-br ${trophy.color}`
            : "bg-muted",
        )}
      >
        {trophy.unlocked ? (
          <Icon className={cn("text-white", compact ? "w-6 h-6" : "w-7 h-7")} strokeWidth={2.2} />
        ) : (
          <Lock className={cn("text-muted-foreground", compact ? "w-5 h-5" : "w-6 h-6")} />
        )}
      </div>
      <div className="space-y-0.5 w-full">
        <p className={cn("font-semibold leading-tight", compact ? "text-xs" : "text-sm")}>
          {trophy.name}
        </p>
        {!compact && (
          <p className="text-[11px] text-muted-foreground leading-snug">{trophy.description}</p>
        )}
      </div>
      {!trophy.unlocked && (
        <div className="w-full space-y-1">
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary/70 transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          {trophy.valueLabel && (
            <p className="text-[10px] text-muted-foreground">{trophy.valueLabel}</p>
          )}
        </div>
      )}
    </div>
  );
};

export default TrophyCard;