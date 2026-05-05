import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Play, CheckCircle2, Loader2, FileText, Clock, BookOpen, ChevronRight, ExternalLink } from "lucide-react";
import { getBlocIdLikePattern } from "@/lib/annales";

interface Exercice {
  id: string;
  bloc_id: string | null;
  annale_source: string | null;
  annee: number | null;
  session: string | null;
  titre: string | null;
}

interface Bloc {
  id: string;
  titre: string;
  matiere: string;
}

interface Annale {
  id: string;
  matiere: string;
  annee: number;
  session: string;
  titre: string;
  pdf_url: string;
}

interface SubjectGroup {
  key: string;
  annale_source: string;
  annee: number;
  session: string;
  matiere: string;
  count: number;
  exercices: Exercice[];
}

type ExamStep = "briefing" | "pdf" | "exercices";

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

const DUREES: Record<string, string> = {
  Maths: "2h",
  Français: "3h",
  "Histoire-Géo": "2h",
  Sciences: "1h30",
};

const inferMatiere = (blocId: string | null, blocsMap: Map<string, Bloc>): string => {
  if (!blocId) return "Autre";
  const b = blocsMap.get(blocId);
  if (b) return b.matiere;
  if (blocId.startsWith("MAT")) return "Maths";
  if (blocId.startsWith("FRA")) return "Français";
  if (blocId.startsWith("HIS")) return "Histoire";
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
  const [annaleData, setAnnaleData] = useState<Annale | null>(null);

  // Mode examen : briefing → pdf → exercices
  const [examStep, setExamStep] = useState<ExamStep>("briefing");

  useEffect(() => {
    // Réinitialiser au briefing à chaque changement d'annale
    if (annaleSource) setExamStep("briefing");
  }, [annaleSource]);

  useEffect(() => {
    const load = async () => {
      let exercicesQuery = supabase
        .from("exercices")
        .select("id, bloc_id, annale_source, annee, session, titre")
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

      // Charger les métadonnées PDF de l'annale
      if (annaleSource && matiereFilter && exData && exData.length > 0) {
        const firstEx = exData[0];
        const MATIERE_TO_ANNALE: Record<string, string> = {
          maths: "Maths",
          français: "Français",
          francais: "Français",
          histoire: "Histoire-Géo",
          géographie: "Histoire-Géo",
          geographie: "Histoire-Géo",
          emc: "Histoire-Géo",
          physique: "Sciences",
          svt: "Sciences",
          techno: "Sciences",
        };
        const annaleMatiere = MATIERE_TO_ANNALE[matiereFilter.toLowerCase()] ?? matiereFilter;
        const { data: annData } = await supabase
          .from("annales")
          .select("*")
          .eq("matiere", annaleMatiere)
          .eq("annee", firstEx.annee || 0)
          .eq("session", firstEx.session || "")
          .limit(1)
          .maybeSingle();
        setAnnaleData(annData as Annale | null);
      }

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
      const key = `${ex.annale_source}|${ex.annee}|${ex.session || ""}`;
      if (!m.has(key)) {
        m.set(key, {
          key,
          annale_source: ex.annale_source,
          annee: ex.annee,
          session: ex.session || "",
          matiere: inferMatiere(ex.bloc_id, blocsMap),
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

  // ─── ÉCRAN 1 : BRIEFING ───────────────────────────────────────────────────
  if (annaleSource && examStep === "briefing") {
    const duree = DUREES[matiereFilter || ""] || "2h";
    const likePattern = getBlocIdLikePattern(matiereFilter);
    const blocPrefix = likePattern?.replace("%", "");
    const nbExercices = exercices.filter(
      (e) => e.annale_source === annaleSource && (!blocPrefix || e.bloc_id?.startsWith(blocPrefix))
    ).length;

    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="max-w-lg mx-auto px-4 pt-6 w-full flex-1 flex flex-col">

          {/* Header */}
          <div className="flex items-center gap-2 mb-8">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(`/annales${matiereFilter ? `?matiere=${matiereFilter}` : ""}`)}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </div>

          {/* Contenu centré */}
          <div className="flex-1 flex flex-col justify-center space-y-8 pb-12">

            {/* Badge matière */}
            <div className="text-center space-y-3">
              <Badge className={`${SUBJECT_COLORS[matiereFilter || ""] || "bg-muted"} text-sm px-3 py-1`}>
                {matiereFilter || "Toutes matières"}
              </Badge>
              <h1 className="text-2xl font-bold leading-tight">{annaleSource}</h1>
              <p className="text-muted-foreground text-sm">Mode Examen</p>
            </div>

            {/* Consignes */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 space-y-3">
              <p className="font-semibold text-amber-900 text-sm">📋 Conditions d'examen</p>
              <ul className="space-y-2 text-sm text-amber-800">
                <li className="flex items-start gap-2">
                  <Clock className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>Durée conseillée : <strong>{duree}</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <BookOpen className="w-4 h-4 mt-0.5 shrink-0" />
                  <span><strong>{nbExercices} exercice{nbExercices > 1 ? "s" : ""}</strong> — travaille sur papier d'abord</span>
                </li>
                <li className="flex items-start gap-2">
                  <ChevronRight className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>Les corrigés et méthodes sont disponibles <strong>après</strong> chaque exercice</span>
                </li>
              </ul>
            </div>

            {/* CTA */}
            <div className="space-y-3">
              <Button
                className="w-full h-12 text-base font-semibold sprint-gradient text-primary-foreground"
                onClick={() => setExamStep("pdf")}
              >
                Voir le sujet complet →
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── ÉCRAN 2 : PDF ────────────────────────────────────────────────────────
  if (annaleSource && examStep === "pdf") {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="max-w-lg mx-auto px-4 pt-6 w-full flex-1 flex flex-col">

          {/* Header */}
          <div className="flex items-center gap-2 mb-4">
            <Button variant="ghost" size="icon" onClick={() => setExamStep("briefing")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-lg font-bold">{annaleSource}</h1>
              <p className="text-xs text-muted-foreground">Lis le sujet, travaille sur papier</p>
            </div>
          </div>

          {/* Bouton ouvrir le sujet officiel */}
          <div className="flex-1 flex items-center justify-center mb-4">
            {annaleData?.pdf_url ? (
              <Button
                variant="outline"
                className="w-full h-12 text-base font-semibold"
                onClick={() => window.open(annaleData.pdf_url, "_blank", "noopener,noreferrer")}
              >
                📄 Ouvrir le sujet officiel
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground text-center">
                PDF non disponible pour cette session
              </p>
            )}
          </div>

          {/* CTA */}
          <Button
            className="w-full h-12 text-base font-semibold sprint-gradient text-primary-foreground mb-8"
            onClick={() => setExamStep("exercices")}
          >
            J'ai travaillé sur papier → Voir les corrections
          </Button>
        </div>
      </div>
    );
  }

  // ─── ÉCRAN 3 : LISTE DES EXERCICES ────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background pb-12">
      <div className="max-w-lg mx-auto px-4 pt-6 space-y-6">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              if (annaleSource) setExamStep("briefing");
              else navigate("/dashboard");
            }}
            aria-label="Retour"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">
              {annaleSource || (matiereFilter ? `Annales ${matiereFilter}` : "Annales du brevet")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {annaleSource ? "Corrections exercice par exercice" : "Entraîne-toi sur de vrais sujets"}
            </p>
          </div>
        </div>

        {/* Liste matières (page principale) */}
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

        {/* Exercices (écran 3) */}
        {annaleSource && (
          <div className="space-y-3">
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
                            {ex.titre || bloc?.titre || ex.bloc_id || "Exercice"}
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
