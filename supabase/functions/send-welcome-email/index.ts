const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const buildHtml = (prenom: string) => `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><title>Bienvenue sur Sprint DNB</title></head>
<body style="font-family: Arial, sans-serif; background:#ffffff; color:#1a1a2e; line-height:1.6; padding:24px;">
  <div style="max-width:560px; margin:0 auto;">
    <h1 style="color:#1a1a2e; font-size:24px; margin-bottom:16px;">Bienvenue sur Sprint DNB 🎯</h1>
    <p>Bonjour${prenom ? ` ${prenom}` : ""},</p>
    <p>Merci d'avoir inscrit votre enfant sur Sprint DNB — vous faites partie des premiers utilisateurs et c'est très précieux.</p>

    <h3 style="color:#16213e; margin-top:24px;">Disponible dès maintenant :</h3>
    <ul style="padding-left:20px;">
      <li>✅ Planning de révision personnalisé adapté à la date d'examen</li>
      <li>✅ Méthode pas-à-pas sur chaque exercice</li>
      <li>✅ Annales Maths avec corrigés détaillés</li>
      <li>✅ Exercices générés par IA sur toutes les matières</li>
    </ul>

    <h3 style="color:#16213e; margin-top:24px;">À venir très prochainement :</h3>
    <ul style="padding-left:20px;">
      <li>🔜 Annales complètes en Français</li>
      <li>🔜 Annales Histoire-Géographie, Sciences et toutes les autres matières</li>
    </ul>

    <p style="margin-top:24px;">Pour commencer, rendez-vous sur le <strong>"Sprint du jour"</strong> dans le tableau de bord — le planning s'adapte automatiquement à la date d'examen.</p>

    <p>Une question ou un retour ? Écrivez-nous à <a href="mailto:sprintdnb@gmail.com" style="color:#16a34a;">sprintdnb@gmail.com</a></p>

    <p style="margin-top:24px;">Bon courage pour cette dernière ligne droite 💪</p>

    <p style="margin-top:24px;">Meriem<br/><strong>Sprint DNB</strong></p>
  </div>
</body>
</html>`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY missing" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email, prenom } = await req.json();
    if (!email || typeof email !== "string") {
      return new Response(JSON.stringify({ error: "Invalid email" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Sprint DNB <onboarding@resend.dev>",
        to: [email],
        subject: "Bienvenue sur Sprint DNB 🎯",
        html: buildHtml(typeof prenom === "string" ? prenom : ""),
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error("Resend error", data);
      return new Response(JSON.stringify({ error: data }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("send-welcome-email error", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});