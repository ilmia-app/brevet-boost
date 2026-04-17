// Edge function : génère un corrigé type via Lovable AI Gateway
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { titre, objectifs, etapes, matiere } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY non configurée" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `Tu es un professeur expert du Brevet des Collèges français.
Génère un exemple de corrigé type pour un exercice de niveau 3ème sur la notion suivante : ${titre}.
Matière : ${matiere || "non précisée"}.
Objectifs : ${objectifs || "non précisés"}.
Méthode à suivre : ${etapes || "non précisée"}.
Le corrigé doit montrer étape par étape comment appliquer la méthode correctement, avec un exemple chiffré concret.
Sois précis, clair, niveau 3ème. Maximum 200 mots.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Génère le corrigé type pour : ${titre}` },
        ],
      }),
    });

    if (response.status === 429) {
      return new Response(JSON.stringify({ error: "Trop de requêtes, réessaye dans un instant." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (response.status === 402) {
      return new Response(JSON.stringify({ error: "Crédits IA épuisés." }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!response.ok) {
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      return new Response(JSON.stringify({ error: "Erreur de génération" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const corrige = data.choices?.[0]?.message?.content || "Aucun corrigé généré.";

    return new Response(JSON.stringify({ corrige }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-corrige error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
