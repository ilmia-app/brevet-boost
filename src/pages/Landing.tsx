import { Target, Calendar, BookOpen, FileText, Sparkles } from "lucide-react";

const Landing = () => {
  return (
    <div
      className="min-h-screen w-full flex items-center justify-center px-4 py-8"
      style={{
        background: "linear-gradient(160deg, #1a1a2e 0%, #16213e 60%, #0f3a3a 100%)",
      }}
    >
      <div className="w-full max-w-md mx-auto flex flex-col items-center text-center space-y-6 text-white">
        {/* Logo */}
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center shadow-2xl"
          style={{
            background: "linear-gradient(135deg, #3b82f6 0%, #10b981 100%)",
          }}
        >
          <Target className="w-10 h-10 text-white" strokeWidth={2.5} />
        </div>

        {/* Titre */}
        <div className="space-y-2">
          <h1 className="text-5xl font-extrabold tracking-tight text-white">
            Sprint DNB
          </h1>
          <p className="text-base text-white/80 font-medium">
            Le coach brevet des élèves CNED
          </p>
        </div>

        {/* Grille 2x2 fonctionnalités */}
        <div className="grid grid-cols-2 gap-3 w-full">
          {[
            { icon: Calendar, emoji: "📅", text: "Planning personnalisé adapté à ta date d'examen" },
            { icon: BookOpen, emoji: "📖", text: "Méthode pas-à-pas sur chaque exercice" },
            { icon: FileText, emoji: "📋", text: "Vraies annales avec corrigés détaillés" },
            { icon: Sparkles, emoji: "✨", text: "Exercices générés par IA" },
          ].map((feature, i) => (
            <div
              key={i}
              className="rounded-2xl p-4 flex flex-col items-center justify-start gap-2 text-center"
              style={{ backgroundColor: "rgba(255,255,255,0.08)", backdropFilter: "blur(8px)" }}
            >
              <span className="text-2xl" aria-hidden>{feature.emoji}</span>
              <p className="text-xs leading-snug text-white/95 font-medium">
                {feature.text}
              </p>
            </div>
          ))}
        </div>

        {/* CTA orange */}
        <button
          className="w-full rounded-2xl py-4 px-6 font-bold text-white shadow-xl"
          style={{
            background: "linear-gradient(135deg, #f97316 0%, #fb923c 100%)",
          }}
        >
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-base">🎁 Gratuit jusqu'au 30 avril</span>
            <span className="text-sm font-semibold opacity-95">
              puis 9,90€ jusqu'au brevet
            </span>
          </div>
        </button>

        <p className="text-xs text-white/80 -mt-2">
          Paiement unique · Accès jusqu'au 01 juillet 2026
        </p>

        <p className="text-sm font-semibold" style={{ color: "#6ee7b7" }}>
          ⭐ -20% pour les 20 premiers inscrits
        </p>

        {/* Encadré rassurance */}
        <div
          className="w-full rounded-2xl p-4 space-y-2 text-left"
          style={{ backgroundColor: "rgba(0,0,0,0.35)" }}
        >
          <p className="text-xs text-white/95">✅ Inscription sans carte bancaire</p>
          <p className="text-xs text-white/95">📧 Email de rappel envoyé le 30 avril</p>
          <p className="text-xs text-white/95">💳 Paiement uniquement si tu choisis de continuer</p>
        </div>

        {/* Mention finale */}
        <p className="text-xs text-white/70 italic pt-2">
          Par une maman CNED pour les familles CNED 💙
        </p>
      </div>
    </div>
  );
};

export default Landing;