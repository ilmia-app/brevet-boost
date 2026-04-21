import { Target, Calendar, BookOpen, FileText, Sparkles } from "lucide-react";

const Landing = () => {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#0f0f1e] p-4">
      <div
        className="relative overflow-hidden flex flex-col items-center justify-between text-white shadow-2xl"
        style={{
          width: "1080px",
          height: "1080px",
          maxWidth: "100vw",
          maxHeight: "100vw",
          aspectRatio: "1 / 1",
          background:
            "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3a3e 100%)",
          padding: "70px 80px",
          fontFamily: "'Inter', system-ui, sans-serif",
        }}
      >
        {/* Decorative blobs */}
        <div
          className="absolute rounded-full opacity-30 blur-3xl pointer-events-none"
          style={{
            width: 500,
            height: 500,
            background: "radial-gradient(circle, #22d3ee, transparent 70%)",
            top: -150,
            right: -150,
          }}
        />
        <div
          className="absolute rounded-full opacity-25 blur-3xl pointer-events-none"
          style={{
            width: 600,
            height: 600,
            background: "radial-gradient(circle, #10b981, transparent 70%)",
            bottom: -200,
            left: -200,
          }}
        />

        {/* Top: Logo + Hook */}
        <div className="relative z-10 flex flex-col items-center text-center">
          <div
            className="flex items-center justify-center rounded-3xl shadow-2xl mb-6"
            style={{
              width: 140,
              height: 140,
              background:
                "linear-gradient(135deg, #3b82f6 0%, #10b981 100%)",
              boxShadow: "0 20px 60px rgba(16, 185, 129, 0.4)",
            }}
          >
            <Target size={80} strokeWidth={2.5} className="text-white" />
          </div>
          <h1
            className="font-black tracking-tight mb-3"
            style={{
              fontSize: 72,
              background:
                "linear-gradient(90deg, #ffffff 0%, #a7f3d0 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              lineHeight: 1,
            }}
          >
            Sprint DNB
          </h1>
          <p
            className="font-medium text-slate-200"
            style={{ fontSize: 28, letterSpacing: "0.5px" }}
          >
            Le coach brevet des élèves CNED
          </p>
        </div>

        {/* Middle: 4 key points */}
        <div className="relative z-10 w-full grid grid-cols-2 gap-5 my-6">
          {[
            { icon: Calendar, text: "Planning personnalisé adapté à ta date d'examen" },
            { icon: BookOpen, text: "Méthode pas-à-pas sur chaque exercice" },
            { icon: FileText, text: "Vraies annales avec corrigés détaillés" },
            { icon: Sparkles, text: "Exercices générés par IA" },
          ].map(({ icon: Icon, text }, i) => (
            <div
              key={i}
              className="flex items-center gap-4 rounded-2xl backdrop-blur-sm border border-white/10"
              style={{
                background: "rgba(255, 255, 255, 0.06)",
                padding: "22px 24px",
              }}
            >
              <div
                className="flex-shrink-0 flex items-center justify-center rounded-xl"
                style={{
                  width: 56,
                  height: 56,
                  background:
                    "linear-gradient(135deg, #10b981 0%, #06b6d4 100%)",
                }}
              >
                <Icon size={30} strokeWidth={2.5} className="text-white" />
              </div>
              <span
                className="font-semibold text-white leading-tight"
                style={{ fontSize: 20 }}
              >
                {text}
              </span>
            </div>
          ))}
        </div>

        {/* Badge */}
        <div className="relative z-10 flex flex-col items-center">
          <div
            className="rounded-full font-bold shadow-2xl"
            style={{
              background:
                "linear-gradient(90deg, #fbbf24 0%, #f59e0b 100%)",
              color: "#1a1a2e",
              padding: "18px 44px",
              fontSize: 26,
              boxShadow: "0 10px 40px rgba(251, 191, 36, 0.5)",
            }}
          >
            ✨ Accès gratuit — 20 places
          </div>
        </div>

        {/* Bottom: URL + mention */}
        <div className="relative z-10 flex flex-col items-center text-center mt-4">
          <div
            className="rounded-xl border border-white/20"
            style={{
              padding: "12px 28px",
              background: "rgba(255, 255, 255, 0.08)",
              fontSize: 24,
              fontWeight: 700,
              letterSpacing: "0.5px",
              color: "#a7f3d0",
            }}
          >
            ilmia-app.github.io/brevet-boost
          </div>
          <p
            className="mt-4 italic text-slate-400"
            style={{ fontSize: 18 }}
          >
            Par une maman CNED, pour les familles CNED
          </p>
        </div>
      </div>
    </div>
  );
};

export default Landing;
