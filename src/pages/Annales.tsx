import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Play, CheckCircle2, Loader2, FileText } from "lucide-react";
import { getBlocIdLikePattern } from "@/lib/annales";

interface Exercice {
  id: string;
  bloc_id: string | null;
  annale_source: string | null;
  annee: number | null;
  session: string | null;
}

interface Bloc {
  id: string;
  titre: string;
  matiere: string;
}

interface SubjectGroup {
  key: string; // annale_source|annee|session
  annale_source: string;
  annee: number;
  session: string;
  matiere: string;
  count: number;
  exercices: Exercice[];
}

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

const inferMatiere = (blocId: string | null, blocsMap: Map<string, Bloc>): string => {
  if (!blocId) return "Autre";
  const b = blocsMap.get(blocId);
  if (b) return b.matiere;
  if (blocId.startsWith("MAT")) return "Maths";
  if (blocId.startsWith("FRA")) return "Français";
  if (blocId.startsWith("HIS")) return "Histoire";
  if (blocId.startsWith("GEO")) return "Géographie";
  if (blocId.startsWith("EMC")) return "EMC";
  if (blocId.startsWith("PHY")) return "Physique";
  if (blocId.startsWith("SVT")) return "SVT";
  if (blocId.startsWith("TEC")) return "Techno";
  return "Autre";
};

const Annales = () => {
  const navigate = useNavigate();
  const { annaleSource: annaleSourceParam } = useParams();
  const [searchParams] = useSearchParams();
  const matiereFilter = searchParams.get("matiere");
  const annaleSource = annaleSourceParam ? decodeURIComponent(annaleSourceParam) : null;
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [exercices, setExercices] = useState<Exercice[]>([]);
  const [blocsMap, setBlocsMap] = useState<Map<string, Bloc>>(new Map());
  const [completedBlocs, setCompletedBlocs] = useState<Set<string>>(new Set());

  useEffect(() => {
    const load = async () => {
      let exercicesQuery = supabase
        .from("exercices")
        .select("id, bloc_id, annale_source, annee, session")
        .not("annale_source", "is", null);

      const likePattern = getBlocIdLikePattern(matiereFilter);
      if (annaleSource) {
        exercicesQuery = exercicesQuery.eq("annale_source", annaleSource);
      }
      if (likePattern) {
        exercicesQuery = exercicesQuery.like("bloc_id", likePattern);
      }
      if (annaleSource) {
        exercicesQuery = exercicesQuery.order("bloc_id");
      }

      const [{ data: exData }, { data: blData }] = await Promise.all([
        exercicesQuery,
        supabase.from("blocs_examen").select("id, titre, matiere"),
      ]);

      const map = new Map<string, Bloc>();
      (blData || []).forEach((b) => map.set(b.id, b as Bloc));
      setBlocsMap(map);
      setExercices((exData || []) as Exercice[]);

      if (user) {
        const { data: comps } = await supabase
          .from("completions")
          .select("bloc_id")
          .eq("user_id", user.id)
          .eq("completed", true);
        if (comps) setCompletedBlocs(new Set(comps.map((c) => c.bloc_id)));
      }
      setLoading(false);
    };
    load();
  }, [user, annaleSource, matiereFilter]);

  const groups = useMemo<SubjectGroup[]>(() => {
    const m = new Map<string, SubjectGroup>();
    for (const ex of exercices) {
      if (!ex.annale_source || !ex.annee) continue;
      const matiere = inferMatiere(ex.bloc_id, blocsMap);
      const key = `${ex.annale_source}|${ex.annee}|${ex.session || ""}|${matiere}`;
      if (!m.has(key)) {
        m.set(key, {
          key,
          annale_source: ex.annale_source,
          annee: ex.annee,
          session: ex.session || "",
          matiere,
          count: 0,
          exercices: [],
        });
      }
      const g = m.get(key)!;
      g.count++;
      g.exercices.push(ex);
    }
    return Array.from(m.values()).sort(
      (a, b) => b.annee - a.annee || a.matiere.localeCompare(b.matiere),
    );
  }, [exercices, blocsMap]);

  const grouped = useMemo(() => {
    const filtered = matiereFilter
      ? groups.filter((g) => g.matiere.toLowerCase() === matiereFilter.toLowerCase())
      : groups;
    const byMat = new Map<string, SubjectGroup[]>();
    for (const g of filtered) {
      if (!byMat.has(g.matiere)) byMat.set(g.matiere, []);
      byMat.get(g.matiere)!.push(g);
    }
    return Array.from(byMat.entries());
  }, [groups, matiereFilter]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-12">
      <div className="max-w-lg mx-auto px-4 pt-6 space-y-6">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            aria-label="Retour"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">
              {annaleSource || (matiereFilter ? `Annales ${matiereFilter}` : "Annales du brevet")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {annaleSource
                ? "Exercices du sujet sélectionné"
                : "Entraîne-toi sur de vrais sujets"}
            </p>
          </div>
        </div>

        {!annaleSource && (
          <div className="space-y-6">
            {grouped.length === 0 && (
              <p className="text-center text-muted-foreground text-sm py-12">
                Aucune annale disponible pour le moment.
              </p>
            )}
            {grouped.map(([matiere, list]) => (
              <section key={matiere} className="space-y-3">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Badge className={SUBJECT_COLORS[matiere] || "bg-muted text-foreground"}>
                    {matiere}
                  </Badge>
                </h2>
                <div className="space-y-3">
                  {list.map((g) => (
                    <Card key={g.key} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-start gap-2">
                          <FileText className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm leading-snug">
                              {g.annee} · {g.session || "Session"}
                            </p>
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {g.annale_source}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            {g.count} exercice{g.count > 1 ? "s" : ""}
                          </span>
                          <Button
                            size="sm"
                            className="h-8 text-xs rounded-lg"
                            onClick={() =>
                              navigate(
                                `/annales/${encodeURIComponent(g.annale_source)}${
                                  matiereFilter ? `?matiere=${encodeURIComponent(matiereFilter)}` : ""
                                }`,
                              )
                            }
                          >
                            Travailler ce sujet
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        {annaleSource && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground italic line-clamp-2">
              {annaleSource}
            </p>
            {(() => {
              const likePattern = getBlocIdLikePattern(matiereFilter);
              const blocPrefix = likePattern?.replace("%", "");
              const filtered = exercices
                .filter(
                  (e) =>
                    e.annale_source === annaleSource &&
                    (!blocPrefix || e.bloc_id?.startsWith(blocPrefix)),
                )
                .sort((a, b) => (a.bloc_id || "").localeCompare(b.bloc_id || ""));
              console.log("Filtre annale:", annaleSource);
              console.log("Nb exercices:", filtered.length);
              if (filtered.length === 0) {
                return (
                  <p className="text-center text-muted-foreground text-sm py-12">
                    Aucun exercice disponible pour ce sujet
                  </p>
                );
              }
              return filtered.map((ex, idx) => {
              const bloc = ex.bloc_id ? blocsMap.get(ex.bloc_id) : null;
              const done = ex.bloc_id ? completedBlocs.has(ex.bloc_id) : false;
              return (
                <Card key={ex.id}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground mb-1">
                          Exercice {idx + 1}
                        </p>
                        <p className="font-medium text-sm leading-snug">
                          {bloc?.titre || ex.bloc_id || "Exercice"}
                        </p>
                      </div>
                      {done ? (
                        <Badge className="bg-emerald-500 text-white shrink-0">
                          <CheckCircle2 className="w-3 h-3 mr-1" /> Fait
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="shrink-0">À faire</Badge>
                      )}
                    </div>
                    <div className="flex items-center justify-end">
                      {ex.bloc_id && (
                        <Button
                          size="sm"
                          className="h-8 text-xs rounded-lg sprint-gradient text-primary-foreground"
                          onClick={() =>
                            navigate(`/work?bloc_id=${encodeURIComponent(ex.bloc_id!)}&annale_source=${encodeURIComponent(annaleSource)}`)
                          }
                        >
                          <Play className="w-3 h-3 mr-1" /> Commencer
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
              });
            })()}
          </div>
        )}
      </div>
    </div>
  );
};

export default Annales;
