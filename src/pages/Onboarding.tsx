import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ProgressBar from "@/components/onboarding/ProgressBar";
import SelectableCard from "@/components/onboarding/SelectableCard";
import SubjectChip from "@/components/onboarding/SubjectChip";
import { Rocket, ArrowRight, ArrowLeft, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

const TOTAL_STEPS = 5;
const SUBJECTS = ["Maths", "Français", "Histoire", "Géographie", "EMC", "Physique", "SVT", "Techno"];

const Onboarding = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      toast({ title: "Crée ton compte pour commencer ton sprint" });
      navigate("/login", { replace: true });
    }
  }, [user, loading, navigate]);

  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [examDate, setExamDate] = useState("");
  const [rhythm, setRhythm] = useState("");
  const [level, setLevel] = useState("");
  const [subjects, setSubjects] = useState<string[]>([]);

  const toggleSubject = (s: string) => {
    setSubjects(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };

  const daysUntilExam = examDate
    ? Math.max(0, Math.ceil((new Date(examDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))
    : null;

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

  const handleFinish = async () => {
    // Map rhythm to volume_quotidien values
    const volumeMap: Record<string, string> = {
      "1h30": "leger",
      "2h30": "moyen",
      "3h30": "intensif",
    };
    // Map level to retard_initial values
    const retardMap: Record<string, string> = {
      on_track: "aucun",
      slightly_behind: "modere",
      behind: "important",
    };

    if (!user) {
      toast({ title: "Erreur", description: "Tu dois être connecté.", variant: "destructive" });
      return;
    }

    const { error } = await supabase.from("users").insert({
      id: user.id,
      prenom: name,
      date_examen: examDate,
      volume_quotidien: volumeMap[rhythm] || rhythm,
      retard_initial: retardMap[level] || level,
      matieres_faibles: subjects,
    });

    if (error) {
      toast({ title: "Erreur", description: "Impossible de sauvegarder ton profil.", variant: "destructive" });
      return;
    }

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
              {daysUntilExam !== null && daysUntilExam < 14 && (
                <div className="rounded-xl border border-red-300 bg-red-50 dark:bg-red-950/30 dark:border-red-800 px-4 py-3 text-sm text-red-900 dark:text-red-200">
                  🎯 Phase finale ! Ton planning est optimisé pour les derniers jours avant le brevet. Concentre-toi sur l'essentiel.
                </div>
              )}
              {daysUntilExam !== null && daysUntilExam >= 14 && daysUntilExam < 35 && (
                <div className="rounded-xl border border-orange-300 bg-orange-50 dark:bg-orange-950/30 dark:border-orange-800 px-4 py-3 text-sm text-orange-900 dark:text-orange-200">
                  ⚡ Ton brevet arrive vite — Sprint DNB adapte ton planning en mode intensif. Chaque jour compte !
                </div>
              )}
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
