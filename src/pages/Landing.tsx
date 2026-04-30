import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Target, Calendar, BookOpen, ClipboardList, Sparkles, Zap, HelpCircle, FileText } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const features = [
  { icon: Calendar, title: "Planning personnalisé", desc: "adapté à ta date d'examen" },
  { icon: BookOpen, title: "Méthode pas-à-pas", desc: "sur chaque exercice" },
  { icon: ClipboardList, title: "Vraies annales", desc: "avec corrigés détaillés" },
  { icon: Sparkles, title: "Exercices personnalisés", desc: "selon les besoins" },
];

const Landing = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, loading, navigate]);

  return (
    <main
      className="min-h-screen w-full flex items-center justify-center px-6 py-10"
      style={{ background: "linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%)" }}
    >
      <div className="w-full max-w-md mx-auto flex flex-col items-center text-center text-slate-900">
        {/* Logo */}
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center shadow-2xl mb-5">
          <Target className="w-11 h-11 text-white" strokeWidth={2.5} />
        </div>

        {/* Title */}
        <h1 className="text-5xl font-extrabold tracking-tight mb-2">Sprint DNB</h1>
        <p className="text-base text-slate-600 mb-8">
          Le coach digital qui organise ta révision jusqu'au brevet
        </p>

        {/* Hero CTA */}
        <Link
          to="/login"
          className="w-full inline-block rounded-2xl px-5 py-4 mb-8 shadow-xl bg-gradient-to-br from-blue-500 to-emerald-500 text-white text-base font-bold text-center hover:opacity-95 transition-opacity"
        >
          Commencer — c'est gratuit
        </Link>
        <p className="text-xs text-slate-500 -mt-6 mb-8">Gratuit · Sans engagement</p>

        {/* Aperçu du sprint */}
        <div className="w-full mb-6">
          <h2 className="text-lg font-bold text-slate-900 mb-3 text-left">Aperçu du sprint</h2>
          <div className="flex flex-col gap-3">
            {/* Carte 1 — Sprint du jour */}
            <div className="rounded-2xl bg-white border border-slate-200 shadow-md p-4 text-left">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-white" />
                </div>
                <div className="text-sm font-bold text-slate-900">Sprint du jour</div>
              </div>
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                <div className="text-[11px] uppercase tracking-wide text-emerald-600 font-semibold mb-1">Maths · 20 min</div>
                <div className="text-sm text-slate-900 font-medium leading-snug">Théorème de Pythagore — calculer une longueur</div>
                <div className="text-xs text-slate-500 mt-1">Méthode pas-à-pas + exercice corrigé</div>
              </div>
            </div>

            {/* Carte 2 — Sprint QCM */}
            <div className="rounded-2xl bg-white border border-slate-200 shadow-md p-4 text-left">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center">
                  <HelpCircle className="w-4 h-4 text-white" />
                </div>
                <div className="text-sm font-bold text-slate-900">Sprint QCM</div>
              </div>
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                <div className="text-[11px] uppercase tracking-wide text-emerald-600 font-semibold mb-1">Question 1 / 5</div>
                <div className="text-sm text-slate-900 font-medium leading-snug mb-2">Quelle est la formule de l'aire d'un disque ?</div>
                <div className="grid grid-cols-2 gap-1.5">
                  <div className="text-xs text-slate-700 bg-white border border-slate-200 rounded-md px-2 py-1">A. 2πr</div>
                  <div className="text-xs text-slate-700 bg-white border border-slate-200 rounded-md px-2 py-1">B. πr²</div>
                  <div className="text-xs text-slate-700 bg-white border border-slate-200 rounded-md px-2 py-1">C. πd</div>
                  <div className="text-xs text-slate-700 bg-white border border-slate-200 rounded-md px-2 py-1">D. 4πr²</div>
                </div>
              </div>
            </div>

            {/* Carte 3 — Passe un vrai sujet */}
            <div className="rounded-2xl bg-white border border-slate-200 shadow-md p-4 text-left">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-white" />
                </div>
                <div className="text-sm font-bold text-slate-900">Passe un vrai sujet</div>
              </div>
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                <div className="text-[11px] uppercase tracking-wide text-emerald-600 font-semibold mb-1">Annales</div>
                <div className="text-sm text-slate-900 font-medium leading-snug">Mathématiques — Brevet 2024</div>
                <div className="text-xs text-slate-500 mt-1">Sujet complet + corrigé détaillé</div>
              </div>
            </div>
          </div>
        </div>

        {/* Features grid 2x2 */}
        <div className="grid grid-cols-2 gap-3 w-full mb-7 mt-2">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className="rounded-2xl bg-white border border-slate-200 shadow-sm p-4 flex flex-col items-center text-center"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center mb-2">
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div className="text-sm font-semibold leading-tight text-slate-900">{f.title}</div>
                <div className="text-xs text-slate-500 leading-tight mt-1">{f.desc}</div>
              </div>
            );
          })}
        </div>

        {/* Secondary login button */}
        <Link
          to="/login"
          className="w-full rounded-2xl px-5 py-4 mb-3 border border-slate-300 bg-white text-slate-900 text-base font-semibold text-center hover:bg-slate-50 transition-colors"
        >
          J'ai déjà un compte
        </Link>

        {/* Footer mention */}
        <p className="text-xs text-slate-500 mt-6">
          Créé par une maman concernée 💙
        </p>
      </div>
    </main>
  );
};

export default Landing;