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
      style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)" }}
    >
      <div className="w-full max-w-md mx-auto flex flex-col items-center text-center text-white">
        {/* Logo */}
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center shadow-2xl mb-5">
          <Target className="w-11 h-11 text-white" strokeWidth={2.5} />
        </div>

        {/* Title */}
        <h1 className="text-5xl font-extrabold tracking-tight mb-2">Sprint DNB</h1>
        <p className="text-base text-blue-100/90 mb-8">
          Le coach brevet des élèves en IEF
        </p>

        {/* Features grid 2x2 */}
        <div className="grid grid-cols-2 gap-3 w-full mb-7">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className="rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm p-4 flex flex-col items-center text-center"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/30 to-emerald-500/30 flex items-center justify-center mb-2">
                  <Icon className="w-5 h-5 text-emerald-300" />
                </div>
                <div className="text-sm font-semibold leading-tight">{f.title}</div>
                <div className="text-xs text-blue-100/70 leading-tight mt-1">{f.desc}</div>
              </div>
            );
          })}
        </div>

        {/* Orange CTA */}
        <div className="w-full rounded-2xl px-5 py-4 mb-3 shadow-xl bg-gradient-to-br from-orange-400 to-orange-600 text-white">
          <div className="text-base font-bold leading-snug">
            🎁 Gratuit jusqu'au 30 avril 2026
          </div>
          <div className="text-[11px] font-semibold opacity-95 mt-0.5">
            (INSCRIPTION SANS CARTE BANCAIRE)
          </div>
          <div className="text-sm font-semibold mt-1.5">
            puis 9,90€ jusqu'au brevet !
          </div>
        </div>

        {/* Dark info box */}
        <div className="w-full rounded-2xl bg-white/5 border border-white/10 px-4 py-3 mb-3 text-xs text-blue-100/85 leading-relaxed">
          Un paiement unique à partir du 1er Avril 2026 • Un accès illimité jusqu'au 01 juillet 2026
        </div>

        {/* Green highlight */}
        <div className="text-emerald-300 font-bold text-sm mb-6">
          ⭐ -20% pour les 20 premiers inscrits
        </div>

        {/* Footer mention */}
        <p className="text-xs text-blue-100/70">
          Par une maman CNED pour les familles CNED 💙
        </p>
      </div>
    </main>
  );
};

export default Landing;