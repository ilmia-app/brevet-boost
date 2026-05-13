import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, FileText, ExternalLink, Clock, BookOpen, ChevronRight, CheckCircle } from "lucide-react";

interface AnnaleItem {
  id: string;
  matiere: string;
  annee: number;
  session: string;
  titre: string;
  pdf_url: string;
  corrige_url?: string;
  sujet_dictee_url?: string;
  sujet_redaction_url?: string;
}

const SUBJECT_COLORS: Record<string, string> = {
  Maths: "bg-blue-500 text-white",
  Français: "bg-purple-500 text-white",
  "Histoire-Géo": "bg-orange-500 text-white",
  Sciences: "bg-red-500 text-white",
};

const DUREES: Record<string, string> = {
  Maths: "2h",
  Français: "3h",
  "Histoire-Géo": "2h",
  Sciences: "1h30",
};

const MATIERES = ["Maths", "Français", "Histoire-Géo", "Sciences"];

const Annales = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const matiereFilter = searchParams.get("matiere");

  const [annales, setAnnales] = useState<AnnaleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAnnale, setSelectedAnnale] = useState<AnnaleItem | null>(null);

  useEffect(() => {
    (async () => {
      let query = supabase
        .from("annales")
        .select("id, matiere, annee, session, titre, pdf_url, corrige_url, sujet_dictee_url, sujet_redaction_url")
        .order("annee", { ascending: false });
      if (matiereFilter) query = query.eq("matiere", matiereFilter);
      const { data } = await query;
      setAnnales((data || []) as AnnaleItem[]);
      setLoading(false);
    })();
  }, [matiereFilter]);

  const annalesParMatiere = useMemo(() => {
    const map = new Map<string, AnnaleItem[]>();
    for (const a of annales) {
      if (!map.has(a.matiere)) map.set(a.matiere, []);
      map.get(a.matiere)!.push(a);
    }
    return map;
  }, [annales]);

  // Écran briefing
  if (selectedAnnale) {
    const duree = DUREES[selectedAnnale.matiere] || "2h";
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="max-w-lg mx-auto px-4 pt-6 w-full flex-1 flex flex-col">
          <div className="flex items-center gap-2 mb-8">
            <Button variant="ghost" size="icon" onClick={() => setSelectedAnnale(null)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </div>
          <div className="flex-1 flex flex-col justify-center space-y-8 pb-12">
            <div className="text-center space-y-3">
              <Badge className={`${SUBJECT_COLORS[selectedAnnale.matiere] || "bg-muted"} text-sm px-3 py-1`}>
                {selectedAnnale.matiere}
              </Badge>
              <h1 className="text-2xl font-bold leading-tight">
                {selectedAnnale.annee} · {selectedAnnale.session}
              </h1>
              <p className="text-muted-foreground text-sm">Mode Examen</p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 space-y-3">
              <p className="font-semibold text-amber-900 text-sm">📋 Conditions d'examen</p>
              <ul className="space-y-2 text-sm text-amber-800">
                <li className="flex items-start gap-2">
                  <Clock className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>
                    Durée conseillée : <strong>{duree}</strong>
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <BookOpen className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>Travaille sur papier d'abord, sans aide</span>
                </li>
              </ul>
            </div>
            <div className="flex flex-col gap-3">
              {selectedAnnale.matiere === "Français" ? (
                <>
                  <div className="flex flex-row gap-2">
                    <Button
                      className="flex-1 h-12 text-xs font-semibold sprint-gradient text-primary-foreground px-2"
                      onClick={() => window.open(selectedAnnale.pdf_url, "_blank")}
                    >
                      <ExternalLink className="w-3 h-3 mr-1 shrink-0" />
                      Grammaire & Compréhension
                    </Button>
                    <Button
                      variant="secondary"
                      className="flex-1 h-12 text-xs font-semibold px-2"
                      disabled={!selectedAnnale.sujet_dictee_url}
                      onClick={() => selectedAnnale.sujet_dictee_url && window.open(selectedAnnale.sujet_dictee_url, "_blank")}
                    >
                      <ExternalLink className="w-3 h-3 mr-1 shrink-0" />
                      Dictée
                    </Button>
                    <Button
                      variant="secondary"
                      className="flex-1 h-12 text-xs font-semibold px-2"
                      disabled={!selectedAnnale.sujet_redaction_url}
                      onClick={() => selectedAnnale.sujet_redaction_url && window.open(selectedAnnale.sujet_redaction_url, "_blank")}
                    >
                      <ExternalLink className="w-3 h-3 mr-1 shrink-0" />
                      Rédaction
                    </Button>
                  </div>
                  {selectedAnnale.corrige_url && (
                    <Button
                      variant="secondary"
                      className="w-full h-12 text-base font-semibold bg-emerald-500 hover:bg-emerald-600 text-white"
                      onClick={() => window.open(selectedAnnale.corrige_url!, "_blank")}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Voir le corrigé officiel
                    </Button>
                  )}
                </>
              ) : (
                <>
                  <Button
                    className="w-full h-12 text-base font-semibold sprint-gradient text-primary-foreground"
                    onClick={() => window.open(selectedAnnale.pdf_url, "_blank")}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Ouvrir le sujet officiel
                  </Button>
                  {selectedAnnale.matiere === "Maths" && selectedAnnale.corrige_url && (
                    <Button
                      variant="secondary"
                      className="w-full h-12 text-base font-semibold bg-emerald-500 hover:bg-emerald-600 text-white"
                      onClick={() => window.open(selectedAnnale.corrige_url!, "_blank")}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Voir le corrigé officiel
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Liste des annales
  return (
    <div className="min-h-screen bg-background pb-12">
      <div className="max-w-lg mx-auto px-4 pt-6 space-y-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{matiereFilter ? `Annales ${matiereFilter}` : "Annales du brevet"}</h1>
            <p className="text-sm text-muted-foreground">Sujets officiels DNB 2018 → 2025</p>
          </div>
        </div>

        {loading ? (
          <p className="text-center text-muted-foreground text-sm py-12">Chargement...</p>
        ) : matiereFilter ? (
          <div className="space-y-3">
            {(annalesParMatiere.get(matiereFilter) || []).map((annale) => (
              <Card
                key={annale.id}
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setSelectedAnnale(annale)}
              >
                <CardContent className="p-4 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="font-medium text-sm">
                        {annale.annee} · {annale.session}
                      </p>
                      <p className="text-xs text-muted-foreground">{annale.titre}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {MATIERES.map((matiere) => {
              const list = annalesParMatiere.get(matiere) || [];
              return (
                <section key={matiere} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge className={SUBJECT_COLORS[matiere] || "bg-muted"}>{matiere}</Badge>
                    <span className="text-xs text-muted-foreground">{list.length} sujets</span>
                  </div>
                  <div className="space-y-2">
                    {list.map((annale) => (
                      <Card
                        key={annale.id}
                        className="hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => setSelectedAnnale(annale)}
                      >
                        <CardContent className="p-4 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-3 min-w-0">
                            <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                            <div>
                              <p className="font-medium text-sm">
                                {annale.annee} · {annale.session}
                              </p>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Annales;
