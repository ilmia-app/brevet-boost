import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ProgressBar from "@/components/onboarding/ProgressBar";
import SelectableCard from "@/components/onboarding/SelectableCard";
import SubjectChip from "@/components/onboarding/SubjectChip";
import { Rocket, ArrowRight, ArrowLeft, Sparkles } from "lucide-react";

const TOTAL_STEPS = 5;
const SUBJECTS = ["Maths", "Français", "Histoire", "Géographie", "EMC", "Physique", "SVT", "Techno"];

const Onboarding = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [examDate, setExamDate] = useState("");
  const [rhythm, setRhythm] = useState("");
  const [level, setLevel] = useState("");
  const [subjects, setSubjects] = useState<string[]>([]);

  const toggleSubject = (s: string) => {
    setSubjects(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };

  const canProceed = () => {
    switch (step) {
      case 1: return true;
      case 2: return name.trim().length > 0 && examDate.length > 0;
      case 3: return rhythm.length > 0;
      case 4: return level.length > 0;
      case 5: return subjects.length > 0;
      default: return false;
    }
  };

  const handleFinish = () => {
    const profileData = { name, examDate, rhythm, level, subjects };
    localStorage.setItem("sprint_dnb_profile", JSON.stringify(profileData));
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {step > 1 && <ProgressBar currentStep={step} totalSteps={TOTAL_STEPS} />}

      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">

          {/* Step 1 — Welcome */}
          {step === 1 && (
            <div className="text-center space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="w-20 h-20 rounded-2xl sprint-gradient mx-auto flex items-center justify-center shadow-lg">
                <Rocket className="w-10 h-10 text-primary-foreground" />
              </div>
              <div className="space-y-3">
                <h1 className="text-3xl font-extrabold tracking-tight">
                  <span className="sprint-gradient-text">Ton sprint brevet</span>
                  <br />commence ici
                </h1>
                <p className="text-muted-foreground text-lg">
                  5 questions pour créer ton planning personnalisé
                </p>
              </div>
              <Button
                size="lg"
                className="sprint-gradient text-primary-foreground font-semibold px-8 py-6 text-base rounded-xl shadow-lg hover:opacity-90 transition-opacity"
                onClick={() => setStep(2)}
              >
                Commencer <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </div>
          )}

          {/* Step 2 — Identity */}
          {step === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-400">
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">Comment tu t'appelles ?</h2>
                <p className="text-muted-foreground">Prénom uniquement 😊</p>
              </div>
              <Input
                placeholder="Ton prénom"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-12 text-base rounded-xl"
                autoFocus
              />
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">Quelle est la date de ton examen ?</h2>
              </div>
              <Input
                type="date"
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                className="h-12 text-base rounded-xl"
              />
            </div>
          )}

          {/* Step 3 — Rhythm */}
          {step === 3 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-400">
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">Combien de temps peux-tu travailler par jour ?</h2>
                <p className="text-muted-foreground">Choisis le rythme qui te correspond</p>
              </div>
              <div className="space-y-3">
                {[
                  { value: "1h30", label: "1h30", sublabel: "Léger" },
                  { value: "2h30", label: "2h30", sublabel: "Moyen" },
                  { value: "3h30", label: "3h30", sublabel: "Intensif" },
                ].map(opt => (
                  <SelectableCard
                    key={opt.value}
                    label={opt.label}
                    sublabel={opt.sublabel}
                    selected={rhythm === opt.value}
                    onClick={() => setRhythm(opt.value)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Step 4 — Level */}
          {step === 4 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-400">
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">Tu te sens en retard sur ton programme ?</h2>
                <p className="text-muted-foreground">Pas de jugement, c'est pour adapter ton plan !</p>
              </div>
              <div className="space-y-3">
                {[
                  { value: "on_track", label: "Non, je suis à jour" },
                  { value: "slightly_behind", label: "Un peu en retard" },
                  { value: "behind", label: "Assez en retard" },
                ].map(opt => (
                  <SelectableCard
                    key={opt.value}
                    label={opt.label}
                    selected={level === opt.value}
                    onClick={() => setLevel(opt.value)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Step 5 — Subjects */}
          {step === 5 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-400">
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">Quelles matières veux-tu booster en priorité ?</h2>
                <p className="text-muted-foreground">Sélectionne toutes celles qui s'appliquent</p>
              </div>
              <div className="flex flex-wrap gap-3">
                {SUBJECTS.map(s => (
                  <SubjectChip
                    key={s}
                    label={s}
                    selected={subjects.includes(s)}
                    onClick={() => toggleSubject(s)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Navigation buttons */}
          {step > 1 && (
            <div className="flex gap-3 mt-8">
              <Button
                variant="outline"
                className="rounded-xl"
                onClick={() => setStep(s => s - 1)}
              >
                <ArrowLeft className="w-4 h-4 mr-1" /> Retour
              </Button>
              <Button
                className="flex-1 sprint-gradient text-primary-foreground font-semibold rounded-xl h-12 hover:opacity-90 transition-opacity disabled:opacity-40"
                disabled={!canProceed()}
                onClick={step === TOTAL_STEPS ? handleFinish : () => setStep(s => s + 1)}
              >
                {step === TOTAL_STEPS ? (
                  <>Lancer mon sprint <Sparkles className="ml-2 w-5 h-5" /></>
                ) : (
                  <>Suivant <ArrowRight className="ml-2 w-4 h-4" /></>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
