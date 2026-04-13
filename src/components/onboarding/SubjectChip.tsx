import { cn } from "@/lib/utils";

interface SubjectChipProps {
  label: string;
  selected: boolean;
  onClick: () => void;
}

const SubjectChip = ({ label, selected, onClick }: SubjectChipProps) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-5 py-3 rounded-xl border-2 font-medium text-sm transition-all duration-200",
        "hover:scale-105 active:scale-95",
        selected
          ? "border-primary bg-primary text-primary-foreground shadow-md"
          : "border-border bg-card text-foreground hover:border-primary/40"
      )}
    >
      {label}
    </button>
  );
};

export default SubjectChip;
