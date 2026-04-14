import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Sparkles } from "lucide-react";

interface EndOfDayModalProps {
  open: boolean;
  onClose: () => void;
  message: string;
  taux: number;
  mode: string;
}

const MODE_LABELS: Record<string, string> = {
  normal: "Mode normal",
  maintien: "Mode maintien",
  allegement: "Mode allégement",
  reset_doux: "Mode reset doux",
};

const MODE_EMOJIS: Record<string, string> = {
  normal: "💪",
  maintien: "🔄",
  allegement: "🌿",
  reset_doux: "🧘",
};

const EndOfDayModal = ({ open, onClose, message, taux, mode }: EndOfDayModalProps) => {
  const percent = Math.round(taux * 100);

  return (
    <AlertDialog open={open} onOpenChange={(v) => !v && onClose()}>
      <AlertDialogContent className="max-w-sm mx-auto animate-in fade-in-0 zoom-in-95">
        <AlertDialogHeader className="text-center space-y-3">
          <div className="mx-auto w-14 h-14 rounded-full sprint-gradient flex items-center justify-center">
            <Sparkles className="w-7 h-7 text-primary-foreground" />
          </div>
          <AlertDialogTitle className="text-xl">
            Journée terminée ! {percent >= 80 ? "🎉" : ""}
          </AlertDialogTitle>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Taux de complétion : <span className="font-semibold text-foreground">{percent}%</span>
            </p>
            <p className="text-xs text-muted-foreground">
              {MODE_EMOJIS[mode] || "📋"} Demain : {MODE_LABELS[mode] || mode}
            </p>
          </div>
          <AlertDialogDescription className="text-sm text-foreground/80 leading-relaxed pt-2">
            {message}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="sm:justify-center pt-2">
          <AlertDialogAction
            onClick={onClose}
            className="sprint-gradient text-primary-foreground px-8 rounded-xl"
          >
            À demain 👋
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default EndOfDayModal;
