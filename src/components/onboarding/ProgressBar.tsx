interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
}

const ProgressBar = ({ currentStep, totalSteps }: ProgressBarProps) => {
  const progress = (currentStep / totalSteps) * 100;

  return (
    <div className="w-full px-6 pt-6 pb-2">
      <div className="flex justify-between mb-2 text-xs text-muted-foreground font-medium">
        <span>Étape {currentStep} / {totalSteps}</span>
        <span>{Math.round(progress)}%</span>
      </div>
      <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full sprint-gradient transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

export default ProgressBar;
