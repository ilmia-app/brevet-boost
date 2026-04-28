import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { EvaluatedTrophy } from "@/lib/trophies";

interface Props {
  trophies: EvaluatedTrophy[];
  onClose: () => void;
}

/** Full-screen celebration modal — cycles through multiple new trophies. */
const TrophyCelebrationModal = ({ trophies, onClose }: Props) => {
  const [index, setIndex] = useState(0);
  const open = trophies.length > 0;

  useEffect(() => {
    setIndex(0);
  }, [trophies]);

  if (!open) return null;
  const current = trophies[index];
  const Icon = current.icon;
  const isLast = index === trophies.length - 1;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm overflow-hidden border-0 p-0 bg-gradient-to-br from-background to-accent/40">
        {/* Confetti */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {Array.from({ length: 24 }).map((_, i) => (
            <span
              key={i}
              className="absolute block w-2 h-2 rounded-sm animate-fade-in"
              style={{
                left: `${(i * 37) % 100}%`,
                top: `${(i * 53) % 100}%`,
                background: ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#a855f7"][i % 5],
                animationDelay: `${(i % 8) * 80}ms`,
                transform: `rotate(${i * 23}deg)`,
                opacity: 0.85,
              }}
            />
          ))}
        </div>

        <div className="relative px-6 pt-8 pb-6 text-center space-y-5">
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
            Trophée débloqué !
          </p>
          <div
            className={`mx-auto w-28 h-28 rounded-full bg-gradient-to-br ${current.color} flex items-center justify-center shadow-xl animate-scale-in`}
          >
            <Icon className="w-14 h-14 text-white drop-shadow" strokeWidth={2.2} />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-2xl font-bold">{current.name}</h2>
            <p className="text-sm text-muted-foreground">{current.description}</p>
          </div>
          {trophies.length > 1 && (
            <p className="text-xs text-muted-foreground">
              {index + 1} / {trophies.length}
            </p>
          )}
          <Button
            className="w-full"
            onClick={() => {
              if (isLast) onClose();
              else setIndex((i) => i + 1);
            }}
          >
            {isLast ? "Continuer" : "Suivant"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TrophyCelebrationModal;