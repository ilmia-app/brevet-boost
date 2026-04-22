import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, CheckCircle2, Loader2, FileText, ChevronRight, BookOpen, ExternalLink } from "lucide-react";
import { getBlocIdOrFilter, blocIdMatchesMatiere, cleanEnonce } from "@/lib/annales";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";


interface Exercice {
  id: string;
  bloc_id: string | null;
  annale_source: string | null;
  annee: number | null;
  session: string | null;
  enonce: string | null;
  corrige: string | null;
}

interface Bloc {
  id: string;
  titre: string;
  matiere: string;
}

interface Annale {
  id: string;
  titre: string;
  annee: number;
  session: string;
  matiere: string;
  pdf_url: string;
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
  "Histoire-Géo": "bg-orange-500 text-white",
  Sciences: "bg-red-500 text-white",
};

/**
 * Returns a normalized matiere "category" used for grouping in the annales list.
 * We group HIS/GEO/EMC together as "Histoire-Géo" and PHY/SVT/TEC as "Sciences"
 * so that the dashboard filters (?matiere=Histoire-Géo / Sciences) match.
 */
const inferMatiere = (blocId: string | null, _blocsMap: Map<string, Bloc>): string => {
  if (!blocId) return "Autre";
  if (blocId.startsWith("MAT")) return "Maths";
  if (blocId.startsWith("FRA")) return "Français";
  if (blocId.startsWith("HIS") || blocId.startsWith("GEO") || blocId.startsWith("EMC"))
    return "Histoire-Géo";
  if (blocId.startsWith("PHY") || blocId.startsWith("SVT") || blocId.startsWith("TEC"))
    return "Sciences";
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
  const [openCorriges, setOpenCorriges] = useState<Set<string>>(new Set());
  const [annalePdf, setAnnalePdf] = useState<Annale | null>(null);
  const [annalesList, setAnnalesList] = useState<Annale[]>([]);

  useEffect(() => {
    const load = async () => {
      let exercicesQuery = supabase
        .from("exercices")
        .select("id, bloc_id, annale_source, annee, session, enonce, corrige")
        .not("annale_source", "is", null);

      if (annaleSource) {
        exercicesQuery = exercicesQuery.eq("annale_source", annaleSource);
      }
      const orFilter = getBlocIdOrFilter(matiereFilter);
      if (orFilter) {
        exercicesQuery = exercicesQuery.or(orFilter);
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

      // Load all available annales (PDFs) so we can restrict the list view
      // to only those that actually have a PDF in Supabase.
      let allAnnalesQuery = supabase
        .from("annales")
        .select("id, titre, annee, session, matiere, pdf_url");
      if (matiereFilter) {
        allAnnalesQuery = allAnnalesQuery.eq("matiere", matiereFilter);
      }
      const { data: allAnnales } = await allAnnalesQuery;
      setAnnalesList((allAnnales || []) as Annale[]);

      // Fetch matching PDF when viewing a single annale
      if (annaleSource) {
        // Build keyword-based ilike filters from annaleSource so we match
        // partial titles even when wording differs slightly.
        const keywords = annaleSource
          .split(/[^A-Za-zÀ-ÿ0-9]+/)
          .map((k) => k.trim())
          .filter((k) => k.length > 2);
        let annalesQuery = supabase
          .from("annales")
          .select("id, titre, annee, session, matiere, pdf_url");
        if (matiereFilter) {
          annalesQuery = annalesQuery.eq("matiere", matiereFilter);
        }
        for (const kw of keywords) {
          annalesQuery = annalesQuery.ilike("titre", `%${kw}%`);
        }
        const { data: annData, error: annErr } = await annalesQuery;
        console.log("[Annales] PDF lookup", {
          annaleSource,
          matiereFilter,
          keywords,
          error: annErr,
          results: annData,
        });
        setAnnalePdf(((annData || [])[0] as Annale) || null);
      } else {
        setAnnalePdf(null);
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

  // Only keep groups whose annale_source matches an existing PDF in `annales`.
  const availableGroups = useMemo(() => {
    if (annalesList.length === 0) return [] as SubjectGroup[];
    const norm = (s: string) =>
      s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const titles = annalesList.map((a) => norm(a.titre || ""));
    return groups.filter((g) => {
      const src = norm(g.annale_source);
      const tokens = src.split(/[^a-z0-9]+/).filter((x) => x.length > 2);
      return titles.some(
        (t) =>
          t.startsWith(src) ||
          t.includes(src) ||
          (tokens.length > 0 && tokens.every((tok) => t.includes(tok))),
      );
    });
  }, [groups, annalesList]);

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
          <div className="space-y-3">
            {availableGroups.length === 0 && (
              <p className="text-center text-muted-foreground text-sm py-12">
                Aucune annale disponible pour cette matière.
              </p>
            )}
            {availableGroups.map((g) => (
              <Card
                key={g.key}
                onClick={() =>
                  navigate(
                    `/annales/${encodeURIComponent(g.annale_source)}${matiereFilter ? `?matiere=${encodeURIComponent(matiereFilter)}` : ""}`,
                  )
                }
                className="cursor-pointer hover:border-primary/50 hover:shadow-sm transition-all"
              >
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={`${SUBJECT_COLORS[g.matiere] || "bg-muted text-foreground"} text-[10px] px-1.5 py-0`}>
                        {g.matiere}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {g.count} question{g.count > 1 ? "s" : ""}
                      </span>
                    </div>
                    <p className="font-medium text-sm leading-snug truncate">
                      {g.annale_source}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {g.annee}{g.session ? ` · ${g.session}` : ""}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {annaleSource && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground italic line-clamp-2">
              {annaleSource}
            </p>
            {annalePdf?.pdf_url ? (
              <Card className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex items-center justify-between gap-2 px-4 py-2 border-b border-border bg-muted/30">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="w-4 h-4 text-primary shrink-0" />
                      <p className="text-xs font-medium truncate">{annalePdf.titre}</p>
                    </div>
                    <a
                      href={annalePdf.pdf_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary inline-flex items-center gap-1 shrink-0 hover:underline"
                    >
                      Ouvrir <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <iframe
                    src={`${annalePdf.pdf_url}#view=FitH`}
                    title={annalePdf.titre}
                    className="w-full h-[80vh] bg-background"
                  />
                </CardContent>
              </Card>
            ) : (
              <p className="text-center text-muted-foreground text-sm py-12">
                Sujet PDF non disponible pour cette annale.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Annales;
