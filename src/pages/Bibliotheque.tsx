import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { ArrowLeft, Loader2, BookOpen, ChevronRight } from "lucide-react";

const SUBJECT_COLORS: Record<string, string> = {
  Maths: "bg-blue-500 text-white hover:bg-blue-500",
  Français: "bg-purple-500 text-white hover:bg-purple-500",
  Histoire: "bg-orange-500 text-white hover:bg-orange-500",
  Géographie: "bg-emerald-500 text-white hover:bg-emerald-500",
  EMC: "bg-yellow-500 text-white hover:bg-yellow-500",
  Physique: "bg-red-500 text-white hover:bg-red-500",
  SVT: "bg-green-700 text-white hover:bg-green-700",
  Techno: "bg-gray-500 text-white hover:bg-gray-500",
};

const SUBJECT_ORDER = ["Maths", "Français", "Histoire", "Géographie", "EMC", "Physique", "SVT", "Techno"];

interface Bloc {
  id: string;
  matiere: string;
  titre: string;
}

interface Exercise {
  id: string;
  titre: string | null;
  bloc_id: string;
}

const Bibliotheque = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [blocs, setBlocs] = useState<Bloc[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [openBloc, setOpenBloc] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [blocsRes, exRes] = await Promise.all([
        supabase.from("blocs_examen").select("id, matiere, titre"),
        supabase.from("exercices").select("id, titre, bloc_id"),
      ]);
      if (blocsRes.data) setBlocs(blocsRes.data as Bloc[]);
      if (exRes.data) setExercises(exRes.data as Exercise[]);
      setLoading(false);
    })();
  }, []);

  const exerciseCountByBloc = useMemo(() => {
    const map: Record<string, number> = {};
    exercises.forEach((e) => {
      map[e.bloc_id] = (map[e.bloc_id] || 0) + 1;
    });
    return map;
  }, [exercises]);

  const blocsByMatiere = useMemo(() => {
    const map: Record<string, Bloc[]> = {};
    blocs.forEach((b) => {
      (map[b.matiere] ||= []).push(b);
    });
    Object.values(map).forEach((arr) => arr.sort((a, b) => a.titre.localeCompare(b.titre)));
    return map;
  }, [blocs]);

  const orderedMatieres = useMemo(() => {
    const present = Object.keys(blocsByMatiere);
    return [
      ...SUBJECT_ORDER.filter((s) => present.includes(s)),
      ...present.filter((s) => !SUBJECT_ORDER.includes(s)),
    ];
  }, [blocsByMatiere]);

  const exercisesForBloc = (blocId: string) =>
    exercises.filter((e) => e.bloc_id === blocId).sort((a, b) => a.id.localeCompare(b.id));

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-12">
      <div className="max-w-4xl mx-auto px-4 pt-6 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-primary" /> Bibliothèque
            </h1>
            <p className="text-sm text-muted-foreground">
              Tous les blocs du brevet et leurs exercices disponibles.
            </p>
          </div>
        </div>

        {orderedMatieres.map((matiere) => {
          const items = blocsByMatiere[matiere];
          const colorClass = SUBJECT_COLORS[matiere] ?? "bg-primary text-primary-foreground";
          return (
            <section key={matiere} className="space-y-3">
              <div className="flex items-center gap-3">
                <Badge className={colorClass}>{matiere}</Badge>
                <span className="text-sm text-muted-foreground">{items.length} bloc{items.length > 1 ? "s" : ""}</span>
              </div>
              <Card>
                <CardContent className="p-0">
                  <Accordion
                    type="single"
                    collapsible
                    value={openBloc ?? undefined}
                    onValueChange={(v) => setOpenBloc(v || null)}
                  >
                    {items.map((bloc) => {
                      const count = exerciseCountByBloc[bloc.id] || 0;
                      const blocExercises = openBloc === bloc.id ? exercisesForBloc(bloc.id) : [];
                      return (
                        <AccordionItem key={bloc.id} value={bloc.id} className="px-4">
                          <AccordionTrigger className="hover:no-underline">
                            <div className="flex flex-1 items-center justify-between gap-3 pr-2">
                              <div className="text-left">
                                <div className="font-medium text-foreground">{bloc.titre}</div>
                                <div className="text-xs text-muted-foreground">{bloc.id}</div>
                              </div>
                              <Badge variant="secondary" className="shrink-0">
                                {count} exo{count > 1 ? "s" : ""}
                              </Badge>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            {blocExercises.length === 0 ? (
                              <p className="text-sm text-muted-foreground py-2">
                                Aucun exercice disponible pour ce bloc.
                              </p>
                            ) : (
                              <ul className="divide-y">
                                {blocExercises.map((ex) => (
                                  <li key={ex.id}>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        navigate(`/work?bloc_id=${encodeURIComponent(bloc.id)}&exercise_id=${encodeURIComponent(ex.id)}`)
                                      }
                                      className="w-full flex items-center justify-between gap-3 py-3 text-left hover:bg-accent/40 rounded-md px-2 transition-colors"
                                    >
                                      <div className="min-w-0">
                                        <div className="text-sm font-medium text-foreground truncate">
                                          {ex.titre || "Exercice sans titre"}
                                        </div>
                                        <div className="text-xs text-muted-foreground truncate">{ex.id}</div>
                                      </div>
                                      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </AccordionContent>
                        </AccordionItem>
                      );
                    })}
                  </Accordion>
                </CardContent>
              </Card>
            </section>
          );
        })}
      </div>
    </div>
  );
};

export default Bibliotheque;