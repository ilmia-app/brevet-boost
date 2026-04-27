import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import ProgressBar from "@/components/onboarding/ProgressBar";
import SelectableCard from "@/components/onboarding/SelectableCard";
import SubjectChip from "@/components/onboarding/SubjectChip";
import { Rocket, ArrowRight, ArrowLeft, Sparkles, Mail, User, Calendar, Clock, GaugeCircle, BookOpen, AlertCircle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

const TOTAL_STEPS = 6;
const SUBJECTS = ["Maths", "Français", "Histoire", "Géographie", "EMC", "Physique", "SVT", "Techno"];
const MAX_SUBJECTS = 5;

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
  const [showEmailConfirm, setShowEmailConfirm] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState<string>("");

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
      case 5: return subjects.length > 0 && subjects.length <= MAX_SUBJECTS;
      case 6: return subjects.length > 0 && subjects.length <= MAX_SUBJECTS;
      default: return false;
    }
  };

  const rhythmLabel = (() => {
    const map: Record<string, string> = { "1h30": "1h30 — Léger", "2h30": "2h30 — Moyen", "3h30": "3h30 — Intensif" };
    return map[rhythm] ?? "—";
  })();
  const levelLabel = (() => {
    const map: Record<string, string> = {
      on_track: "À jour",
      slightly_behind: "Un peu en retard",
      behind: "Assez en retard",
    };
    return map[level] ?? "—";
  })();
  const formattedExamDate = examDate
    ? new Date(examDate).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
    : "—";

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
      phase_actuelle: daysUntilExam !== null
        ? (daysUntilExam <= 14 ? 3 : daysUntilExam <= 35 ? 2 : 1)
        : 1,
    });

    if (error) {
      toast({ title: "Erreur", description: "Impossible de sauvegarder ton profil.", variant: "destructive" });
      return;
    }

    // Envoi de l'email de bienvenue (non bloquant) — email récupéré depuis supabase.auth
    const { data: authData } = await supabase.auth.getUser();
    const authEmail = authData?.user?.email;
    if (authEmail) {
      console.log("Envoi email bienvenue à:", authEmail);
      supabase.functions
        .invoke("send-welcome-email", {
          body: { email: authEmail, prenom: name },
        })
        .then(({ data, error: fnErr }) => {
          if (fnErr) {
            console.error("send-welcome-email error", fnErr);
          } else {
            console.log("send-welcome-email response", data);
          }
        })
        .catch((err) => console.error("send-welcome-email failed", err));
    } else {
      console.warn("Aucun email auth trouvé pour l'utilisateur courant");
    }

    setConfirmEmail(authEmail ?? "");
    setShowEmailConfirm(true);
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
                <p className="text-muted-foreground">
                  Sélectionne entre 1 et {MAX_SUBJECTS} matières
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                {SUBJECTS.map(s => (
                  <SubjectChip
                    key={s}
                    label={s}
                    selected={subjects.includes(s)}
                    onClick={() => {
                      if (!subjects.includes(s) && subjects.length >= MAX_SUBJECTS) {
                        toast({
                          title: `Maximum ${MAX_SUBJECTS} matières`,
                          description: "Concentre-toi sur tes priorités 💪",
                        });
                        return;
                      }
                      toggleSubject(s);
                    }}
                  />
                ))}
              </div>
              <div
                className={cn(
                  "flex items-center gap-2 text-sm rounded-lg px-3 py-2 border",
                  subjects.length === 0
                    ? "border-destructive/30 bg-destructive/5 text-destructive"
                    : "border-primary/20 bg-primary/5 text-primary"
                )}
              >
                {subjects.length === 0 ? (
                  <AlertCircle className="w-4 h-4" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                <span className="font-medium">
                  {subjects.length === 0
                    ? "Choisis au moins 1 matière"
                    : `${subjects.length} matière${subjects.length > 1 ? "s" : ""} sélectionnée${subjects.length > 1 ? "s" : ""}`}
                </span>
              </div>
            </div>
          )}

          {/* Step 6 — Recap */}
          {step === 6 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-400">
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">Récapitulatif de ton sprint</h2>
                <p className="text-muted-foreground">Vérifie tes infos avant de lancer ton plan</p>
              </div>

              <div className="rounded-2xl border border-border bg-card divide-y divide-border overflow-hidden">
                <RecapRow icon={<User className="w-4 h-4" />} label="Prénom" value={name || "—"} onEdit={() => setStep(2)} />
                <RecapRow
                  icon={<Calendar className="w-4 h-4" />}
                  label="Date d'examen"
                  value={formattedExamDate + (daysUntilExam !== null ? ` (J-${daysUntilExam})` : "")}
                  onEdit={() => setStep(2)}
                />
                <RecapRow icon={<Clock className="w-4 h-4" />} label="Rythme quotidien" value={rhythmLabel} onEdit={() => setStep(3)} />
                <RecapRow icon={<GaugeCircle className="w-4 h-4" />} label="Niveau actuel" value={levelLabel} onEdit={() => setStep(4)} />
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <BookOpen className="w-4 h-4" />
                      <span>Matières prioritaires</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setStep(5)}
                      className="text-xs font-semibold text-primary hover:underline"
                    >
                      Modifier
                    </button>
                  </div>
                  {subjects.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {subjects.map(s => (
                        <span
                          key={s}
                          className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-destructive">Aucune matière sélectionnée</p>
                  )}
                </div>
              </div>

              {subjects.length === 0 && (
                <div className="flex items-center gap-2 text-sm text-destructive rounded-lg px-3 py-2 border border-destructive/30 bg-destructive/5">
                  <AlertCircle className="w-4 h-4" />
                  <span>Sélectionne au moins une matière pour continuer</span>
                </div>
              )}
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

      <Dialog
        open={showEmailConfirm}
        onOpenChange={(open) => {
          if (!open) {
            setShowEmailConfirm(false);
            navigate("/dashboard");
          }
        }}
      >
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader className="items-center text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl sprint-gradient flex items-center justify-center shadow-lg">
              <Mail className="w-7 h-7 text-primary-foreground" />
            </div>
            <DialogTitle className="text-xl">Vérifie ta boîte mail 📬</DialogTitle>
            <DialogDescription className="text-base">
              On vient de t'envoyer un email de confirmation
              {confirmEmail ? <> à <span className="font-semibold text-foreground">{confirmEmail}</span></> : null}.
              Clique sur le lien à l'intérieur pour valider ton inscription et lancer ton sprint !
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              className="w-full sprint-gradient text-primary-foreground font-semibold rounded-xl h-12 hover:opacity-90 transition-opacity"
              onClick={() => {
                setShowEmailConfirm(false);
                navigate("/dashboard");
              }}
            >
              J'ai compris <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Onboarding;
