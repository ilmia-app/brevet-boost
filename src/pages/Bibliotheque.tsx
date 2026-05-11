import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ArrowLeft, BookOpen, Eye, EyeOff, Loader2 } from "lucide-react";

interface Exo {
  id: string;
  bloc_id: string;
  formule_cible: string;
  titre: string;
  enonce: string;
  corrige: string;
}

type BlocDef = {
  bloc_id: string;
  label: string;
  formules: string[];
};

const STRUCTURE: Record<"maths" | "physique", BlocDef[]> = {
  maths: [
    { bloc_id: "MAT-02", label: "Identités remarquables", formules: ["(a+b)²", "(a-b)²", "(a+b)(a-b)"] },
    { bloc_id: "MAT-03", label: "Pythagore et Thalès", formules: ["Pythagore", "Réciproque de Pythagore", "Thalès"] },
  ],
  physique: [
    { bloc_id: "PHY-01", label: "Loi d'Ohm", formules: ["U = R × I", "Circuit en série", "Circuit en dérivation"] },
    { bloc_id: "PHY-02", label: "Vitesse et énergie", formules: ["v = d/t", "Ec = ½ × m × v²"] },
  ],
};

const ExerciceCard = ({ exo }: { exo: Exo }) => {
  const [show, setShow] = useState(false);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{exo.titre}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="whitespace-pre-wrap text-sm text-foreground leading-relaxed">{exo.enonce}</p>
        <Button variant="outline" size="sm" onClick={() => setShow((s) => !s)}>
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          {show ? "Masquer le corrigé" : "Voir le corrigé"}
        </Button>
        {show && (
          <div className="rounded-md border bg-muted/40 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Corrigé</p>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{exo.corrige}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const BlocSection = ({ bloc, exosByFormule }: { bloc: BlocDef; exosByFormule: Record<string, Exo[]> }) => {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold">{bloc.label}</h2>
      <Tabs defaultValue={bloc.formules[0]} className="w-full">
        <TabsList className="flex w-full flex-wrap h-auto justify-start gap-1">
          {bloc.formules.map((f) => (
            <TabsTrigger key={f} value={f} className="text-xs sm:text-sm">
              {f}
            </TabsTrigger>
          ))}
        </TabsList>
        {bloc.formules.map((f) => {
          const exos = exosByFormule[f] ?? [];
          return (
            <TabsContent key={f} value={f} className="space-y-4 mt-4">
              {exos.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun exercice disponible.</p>
              ) : (
                exos.map((e) => <ExerciceCard key={e.id} exo={e} />)
              )}
            </TabsContent>
          );
        })}
      </Tabs>
    </section>
  );
};

const Bibliotheque = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [exos, setExos] = useState<Exo[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("exercices_bibliotheque")
        .select("id, bloc_id, formule_cible, titre, enonce, corrige")
        .order("created_at", { ascending: true });
      if (data) setExos(data as Exo[]);
      setLoading(false);
    })();
  }, []);

  const grouped = useMemo(() => {
    const map: Record<string, Record<string, Exo[]>> = {};
    for (const e of exos) {
      (map[e.bloc_id] ||= {});
      (map[e.bloc_id][e.formule_cible] ||= []).push(e);
    }
    return map;
  }, [exos]);

  return (
    <div className="min-h-screen bg-background pb-12">
      <div className="max-w-3xl mx-auto px-4 pt-6 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-primary" /> Bibliothèque d'exercices
            </h1>
            <p className="text-sm text-muted-foreground">Entraîne-toi sur les formules essentielles</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <Tabs defaultValue="maths" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="maths">Mathématiques</TabsTrigger>
              <TabsTrigger value="physique">Physique</TabsTrigger>
            </TabsList>

            <TabsContent value="maths" className="space-y-8 mt-6">
              {STRUCTURE.maths.map((bloc) => (
                <BlocSection key={bloc.bloc_id} bloc={bloc} exosByFormule={grouped[bloc.bloc_id] ?? {}} />
              ))}
            </TabsContent>

            <TabsContent value="physique" className="space-y-8 mt-6">
              {STRUCTURE.physique.map((bloc) => (
                <BlocSection key={bloc.bloc_id} bloc={bloc} exosByFormule={grouped[bloc.bloc_id] ?? {}} />
              ))}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
};

export default Bibliotheque;