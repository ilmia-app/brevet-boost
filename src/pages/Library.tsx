import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Clock, Repeat, Loader2, Play } from "lucide-react";

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

const SUBJECTS = ["Toutes", "Maths", "Français", "Histoire", "Géographie", "EMC", "Physique", "SVT", "Techno"];

interface Bloc {
  id: string;
  matiere: string;
  titre: string;
  duree_min: number | null;
  priorite: number | null;
  iterations_recommandees: number | null;
}

const Library = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [blocs, setBlocs] = useState<Bloc[]>([]);
  const [completionsCount, setCompletionsCount] = useState<Record<string, number>>({});
  const [filter, setFilter] = useState("Toutes");
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState<number>(1);

  useEffect(() => {
    const load = async () => {
      const { data: blocsData } = await supabase
        .from("blocs_examen")
        .select("id, matiere, titre, duree_min, priorite, iterations_recommandees");

      if (blocsData) setBlocs(blocsData);

      if (user) {
        const { data: userData } = await supabase
          .from("users")
          .select("date_examen")
          .eq("id", user.id)
          .maybeSingle();
        if (userData?.date_examen) {
          const diff = new Date(userData.date_examen).getTime() - Date.now();
          const days = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
          setPhase(days > 21 ? 1 : days > 7 ? 2 : 3);
        }

        const { data: comps } = await supabase
          .from("completions")
          .select("bloc_id")
          .eq("user_id", user.id)
          .eq("completed", true);
        if (comps) {
          const counts: Record<string, number> = {};
          comps.forEach((c) => {
            counts[c.bloc_id] = (counts[c.bloc_id] || 0) + 1;
          });
          setCompletionsCount(counts);
        }
      }
      setLoading(false);
    };
    load();
  }, [user]);

  const getStatus = (bloc: Bloc) => {
    const count = completionsCount[bloc.id] || 0;
    const target = bloc.iterations_recommandees || 1;
    if (count >= target) return { label: "Maîtrisé", className: "bg-emerald-100 text-emerald-700 border-emerald-200" };
    if (count >= 1) return { label: "En cours", className: "bg-yellow-100 text-yellow-700 border-yellow-200" };
    return { label: "Non commencé", className: "bg-muted text-muted-foreground border-border" };
  };

  const filteredBlocs = useMemo(() => {
    const list = filter === "Toutes" ? blocs : blocs.filter((b) => b.matiere === filter);
    return [...list].sort((a, b) => {
      const pa = a.priorite ?? 99;
      const pb = b.priorite ?? 99;
      if (pa !== pb) return pa - pb;
      return a.matiere.localeCompare(b.matiere);
    });
  }, [blocs, filter]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-12">
      <div className="max-w-lg mx-auto px-4 pt-6 space-y-5">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Toutes les notions</h1>
            <p className="text-sm text-muted-foreground">Choisis ce que tu veux travailler aujourd'hui</p>
          </div>
        </div>

        {/* Filtres */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
          {SUBJECTS.map((s) => (
            <Button
              key={s}
              size="sm"
              variant={filter === s ? "default" : "outline"}
              onClick={() => setFilter(s)}
              className="rounded-full whitespace-nowrap shrink-0"
            >
              {s}
            </Button>
          ))}
        </div>

        {/* Grille de cartes */}
        <div className="space-y-3">
          {filteredBlocs.map((bloc) => {
            const status = getStatus(bloc);
            return (
              <Card key={bloc.id} className="transition-all hover:shadow-md">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={SUBJECT_COLORS[bloc.matiere] || "bg-muted text-foreground"}>
                      {bloc.matiere}
                    </Badge>
                    {bloc.priorite === 1 && (
                      <Badge className="bg-red-500 text-white">P1</Badge>
                    )}
                    {bloc.priorite === 2 && (
                      <Badge className="bg-orange-500 text-white">P2</Badge>
                    )}
                    <Badge variant="outline" className={`text-xs border ${status.className}`}>
                      {status.label}
                    </Badge>
                  </div>

                  <p className="font-medium text-sm leading-snug">{bloc.titre}</p>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    {bloc.duree_min && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {bloc.duree_min} min
                      </span>
                    )}
                    {bloc.iterations_recommandees && (
                      <span className="flex items-center gap-1">
                        <Repeat className="w-3 h-3" /> {bloc.iterations_recommandees}× recommandé
                      </span>
                    )}
                  </div>

                  <Button
                    size="sm"
                    className="w-full sprint-gradient text-primary-foreground rounded-lg"
                    onClick={() => navigate(`/work?bloc=${bloc.id}&slot=medium`)}
                  >
                    <Play className="w-3.5 h-3.5 mr-1" /> Travailler ce bloc
                  </Button>
                </CardContent>
              </Card>
            );
          })}
          {filteredBlocs.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">
              Aucune notion pour ce filtre.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Library;
