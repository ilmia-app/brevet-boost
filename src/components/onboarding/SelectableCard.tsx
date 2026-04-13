import { cn } from "@/lib/utils";

interface SelectableCardProps {
  label: string;
  sublabel?: string;
  selected: boolean;
  onClick: () => void;
}

const SelectableCard = ({ label, sublabel, selected, onClick }: SelectableCardProps) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full p-5 rounded-xl border-2 text-left transition-all duration-200",
        "hover:scale-[1.02] active:scale-[0.98]",
        selected
          ? "border-primary bg-primary/5 shadow-[var(--card-selected-shadow)]"
          : "border-border bg-card hover:border-primary/30 hover:shadow-[var(--card-hover-shadow)]"
      )}
    >
      <div className="flex items-center gap-3">
        <div className={cn(
          "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
          selected ? "border-primary bg-primary" : "border-muted-foreground/30"
        )}>
          {selected && <div className="w-2 h-2 rounded-full bg-primary-foreground" />}
        </div>
        <div>
          <p className={cn("font-semibold", selected ? "text-primary" : "text-foreground")}>{label}</p>
          {sublabel && <p className="text-sm text-muted-foreground">{sublabel}</p>}
        </div>
      </div>
    </button>
  );
};

export default SelectableCard;
