import { Target, Calendar, BookOpen, ClipboardList, Sparkles } from "lucide-react";

const features = [
  { icon: Calendar, title: "Planning personnalisé", desc: "adapté à ta date d'examen" },
  { icon: BookOpen, title: "Méthode pas-à-pas", desc: "sur chaque exercice" },
  { icon: ClipboardList, title: "Vraies annales", desc: "avec corrigés détaillés" },
  { icon: Sparkles, title: "Exercices générés", desc: "par IA" },
];

const Landing = () => {
  return (
    <main
      className="min-h-screen w-full flex items-center justify-center px-6 py-10"
      style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3a3a 100%)" }}
    >
      <div className="w-full max-w-md mx-auto flex flex-col items-center text-center text-white space-y-7">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-20 h-20 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center ring-1 ring-white/20 shadow-2xl">
            <Target className="w-11 h-11 text-emerald-400" strokeWidth={2.5} />
          </div>
          <h1 className="text-5xl font-extrabold tracking-tight">Sprint DNB</h1>
          <p className="text-lg text-blue-100/90 font-medium">
            Le coach brevet des élèves en IEF
          </p>
        </div>

        {/* Features grid */}
        <div className="grid grid-cols-2 gap-3 w-full">
          {features.map((f) => (
            <div
              key={f.title}
              className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 flex flex-col items-center text-center gap-2"
            >
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <f.icon className="w-5 h-5 text-emerald-300" />
              </div>
              <div className="text-sm font-semibold leading-tight">{f.title}</div>
              <div className="text-xs text-blue-100/70 leading-snug">{f.desc}</div>
            </div>
          ))}
        </div>

        {/* CTA orange */}
        <div className="w-full rounded-2xl px-5 py-4 text-center font-bold shadow-lg"
          style={{ background: "linear-gradient(135deg, #ff8a3d, #ff6b1a)" }}
        >
          <div className="text-base">🎁 Gratuit jusqu'au 30 avril 2026</div>
          <div className="text-xs font-semibold opacity-90 mt-0.5">(SANS CARTE BANCAIRE)</div>
          <div className="text-sm mt-1.5">puis 9,90€ jusqu'au brevet !</div>
        </div>

        {/* Encadré gris foncé */}
        <div className="w-full rounded-xl bg-slate-800/70 border border-white/10 px-4 py-3 text-sm text-blue-100/90">
          Paiement unique • Accès illimité jusqu'au 01 juillet 2026
        </div>

        {/* Texte vert clair */}
        <div className="text-emerald-300 font-semibold text-base">
          ⭐ -20% pour les 20 premiers inscrits
        </div>

        {/* Mention finale */}
        <div className="text-sm text-blue-100/80 pt-2">
          Par une maman CNED pour les familles CNED 💙
        </div>
      </div>
    </main>
  );
};

export default Landing;
