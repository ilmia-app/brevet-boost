import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2, Save, Lock, Info, Sparkles } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const ALL_SUBJECTS = ["Maths", "Français", "Histoire", "Géographie", "EMC", "Physique", "SVT", "Techno"];

const SUBJECT_COLORS: Record<string, string> = {
  Maths: "bg-blue-500 text-white",
  Français: "bg-purple-500 text-white",
  Histoire: "bg-orange-500 text-white",
  Géographie: "bg-emerald-500 text-white",
  EMC: "bg-yellow-500 text-white",
  Physique: "bg-red-500 text-white",
  SVT: "bg-green-700 text-white",
  Techno: "bg-gray-500 text-white",
};

const VOLUME_OPTIONS = [
  { value: "leger", label: "Léger", desc: "1h30 / jour" },
  { value: "moyen", label: "Moyen", desc: "2h30 / jour" },
  { value: "intensif", label: "Intensif", desc: "3h30 / jour" },
];

// Lundi de la semaine ISO de la date donnée (UTC-safe via local)
const getMonday = (d: Date) => {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
};

const Profile = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingPrios, setSavingPrios] = useState(false);

  const [name, setName] = useState("");
  const [examDate, setExamDate] = useState("");
  const [volume, setVolume] = useState("moyen");
  const [phase, setPhase] = useState(1);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [originalSubjects, setOriginalSubjects] = useState<string[]>([]);
  const [lastModif, setLastModif] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("users")
        .select("prenom, date_examen, volume_quotidien, phase_actuelle, matieres_faibles, derniere_modif_priorites")
        .eq("id", user.id)
        .maybeSingle();
      if (data) {
        setName(data.prenom || "");
        setExamDate(data.date_examen || "");
        setVolume(data.volume_quotidien || "moyen");
        setPhase(data.phase_actuelle || 1);
        setSubjects(data.matieres_faibles || []);
        setOriginalSubjects(data.matieres_faibles || []);
        setLastModif((data as any).derniere_modif_priorites || null);
      }
      setLoading(false);
    })();
  }, [user, navigate]);

  const modifiedThisWeek = useMemo(() => {
    if (!lastModif) return false;
    const monday = getMonday(new Date());
    const lm = new Date(lastModif);
    return lm >= monday;
  }, [lastModif]);

  const canEditPrios = phase === 3 || (phase === 2 && !modifiedThisWeek);
  const isPhase1 = phase === 1;
  const isPhase2 = phase === 2;

  const toggleSubject = (s: string) => {
    if (!canEditPrios) return;

    if (isPhase2) {
      // En phase 2 : on ne peut changer qu'UNE seule matière par rapport à l'original
      const wasIn = originalSubjects.includes(s);
      const isIn = subjects.includes(s);
      // Calculer le diff projeté
      const projected = isIn ? subjects.filter((x) => x !== s) : [...subjects, s];
      const diff = projected.filter((x) => !originalSubjects.includes(x)).length
        + originalSubjects.filter((x) => !projected.includes(x)).length;
      if (diff > 2) {
        toast({
          title: "Une seule modification",
          description: "En phase 2, tu ne peux modifier qu'une matière par semaine (1 retirée + 1 ajoutée max).",
        });
        return;
      }
      setSubjects(projected);
      return;
    }

    setSubjects((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  };

  const handleSaveInfos = async () => {
    if (!user) return;
    if (!name.trim() || !examDate) {
      toast({ title: "Champs requis", description: "Prénom et date d'examen requis.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("users")
      .update({ prenom: name.trim(), date_examen: examDate, volume_quotidien: volume })
      .eq("id", user.id);
    setSaving(false);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Sauvegardé ✅", description: "Tes informations sont à jour." });
  };

  const handleSavePrios = async () => {
    if (!user) return;
    if (subjects.length === 0) {
      toast({ title: "Sélectionne au moins une matière", variant: "destructive" });
      return;
    }
    setSavingPrios(true);
    const today = new Date().toISOString().split("T")[0];
    const { error } = await supabase
      .from("users")
      .update({
        matieres_faibles: subjects,
        derniere_modif_priorites: today,
      } as any)
      .eq("id", user.id);
    setSavingPrios(false);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    setOriginalSubjects(subjects);
    setLastModif(today);
    toast({ title: "Priorités mises à jour 🎯" });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-12">
      <div className="max-w-2xl mx-auto px-4 pt-6 space-y-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Retour">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold">Mon profil</h1>
        </div>

        {/* SECTION 1 — Mes informations */}
        <Card className="rounded-2xl">
          <CardContent className="p-5 space-y-5">
            <h2 className="text-base font-semibold">Mes informations</h2>

            <div className="space-y-2">
              <label className="text-sm font-medium leading-none" htmlFor="prenom">Prénom</label>
              <Input id="prenom" value={name} onChange={(e) => setName(e.target.value)} maxLength={50} />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium leading-none" htmlFor="examen">Date d'examen</label>
              <Input id="examen" type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium leading-none">Volume quotidien</label>
              <div className="grid grid-cols-3 gap-2">
                {VOLUME_OPTIONS.map((opt) => {
                  const active = volume === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setVolume(opt.value)}
                      className={`rounded-xl border-2 p-3 text-left transition-all ${
                        active ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                      }`}
                    >
                      <p className="font-semibold text-sm">{opt.label}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{opt.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <Button
              onClick={handleSaveInfos}
              disabled={saving}
              className="w-full sprint-gradient text-primary-foreground rounded-xl"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Sauvegarder
            </Button>
          </CardContent>
        </Card>

        {/* SECTION 2 — Priorités de révision */}
        <Card className="rounded-2xl">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h2 className="text-base font-semibold">Mes priorités de révision</h2>
              <Badge variant="outline" className="text-[11px]">Phase {phase}</Badge>
            </div>

            {isPhase1 && (
              <div className="rounded-xl bg-accent/40 border border-primary/20 p-3 flex items-start gap-2">
                <Lock className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <p className="text-xs text-foreground/80 leading-relaxed">
                  Le moteur gère tes priorités en phase 1 — fais confiance au processus.
                  Tu pourras ajuster à partir de la semaine 4.
                </p>
              </div>
            )}

            {isPhase2 && !modifiedThisWeek && (
              <div className="rounded-xl bg-blue-50 border border-blue-200 p-3 flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                <p className="text-xs text-blue-900 leading-relaxed">
                  Tu peux modifier <strong>1 matière</strong> cette semaine.
                </p>
              </div>
            )}

            {isPhase2 && modifiedThisWeek && (
              <div className="rounded-xl bg-muted border border-border p-3 flex items-start gap-2">
                <Lock className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                <p className="text-xs text-foreground/80 leading-relaxed">
                  Tu as déjà ajusté tes priorités cette semaine.
                  Prochain ajustement disponible lundi.
                </p>
              </div>
            )}

            {phase === 3 && (
              <div className="rounded-xl bg-accent/40 border border-primary/20 p-3 flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <p className="text-xs text-foreground/80 leading-relaxed">
                  Phase finale — tu pilotes. Cible tes vraies lacunes.
                </p>
              </div>
            )}

            {isPhase1 ? (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {ALL_SUBJECTS.filter((s) => subjects.includes(s)).map((s) => (
                    <Badge key={s} className={`${SUBJECT_COLORS[s]} text-xs px-2.5 py-1 rounded-lg`}>
                      {s}
                    </Badge>
                  ))}
                </div>
                {ALL_SUBJECTS.some((s) => !subjects.includes(s)) && (
                  <div className="flex flex-wrap gap-x-3 gap-y-1">
                    {ALL_SUBJECTS.filter((s) => !subjects.includes(s)).map((s) => (
                      <span key={s} className="text-xs text-muted-foreground">
                        {s}
                      </span>
                    ))}
                  </div>
                )}
                <p className="text-[11px] text-muted-foreground/80">
                  Modifiable à partir de la semaine 4
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {ALL_SUBJECTS.map((s) => {
                  const selected = subjects.includes(s);
                  const disabled = !canEditPrios;
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => toggleSubject(s)}
                      disabled={disabled}
                      className={`rounded-xl border-2 p-2.5 text-xs font-semibold transition-all ${
                        selected
                          ? `${SUBJECT_COLORS[s]} border-transparent`
                          : "bg-card border-border text-foreground hover:border-primary/40"
                      } ${disabled ? "opacity-70 cursor-not-allowed" : ""}`}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            )}

            {canEditPrios && (
              <Button
                onClick={handleSavePrios}
                disabled={savingPrios}
                className="w-full sprint-gradient text-primary-foreground rounded-xl"
              >
                {savingPrios ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                Sauvegarder mes priorités
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Profile;
