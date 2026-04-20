// Edge function : génère un exercice + corrigé via Lovable AI Gateway (Gemini 2.5 Pro)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { callAIGateway } from "../_shared/aiGateway.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // --- Authentification : seuls les utilisateurs connectés peuvent appeler ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
    );
    const { data: userData, error: userErr } = await supabaseClient.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { titre, matiere, objectifs, etapes, theme } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY non configurée" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `Tu es le meilleur professeur de collège français, expert du Brevet (DNB) niveau 3ème.
Tu vas générer **un exercice original** ET **son corrigé détaillé** sur la notion suivante :

- Matière : ${matiere || "non précisée"}
- Thème / bloc : ${titre || "non précisé"}
${theme ? `- Sous-thème : ${theme}` : ""}
${objectifs ? `- Objectifs pédagogiques : ${objectifs}` : ""}
${etapes ? `- Méthode attendue : ${etapes}` : ""}

CONTRAINTES STRICTES :
- Niveau 3ème (Brevet), réaliste et faisable en 10-15 min.
- **Pas de tableau, pas de graphique, pas de figure géométrique complexe** : que du texte et des formules en LaTeX inline ($...$).
- L'exercice doit comporter 2 à 4 questions progressives (a, b, c…).
- Le corrigé doit être **détaillé étape par étape**, pédagogique, comme l'expliquerait le meilleur prof : rappels de cours brefs, calculs détaillés, justifications.

RÈGLES ABSOLUES DE MISE EN FORME DE L'ÉNONCÉ :
- Ne jamais mettre en gras les réponses attendues
- Ne jamais souligner les mots clés de la réponse
- Ne jamais utiliser de markdown dans l'énoncé (pas de **, pas de __, pas de ##)
- L'énoncé doit être du texte brut sans mise en forme
- Les seules mises en forme autorisées dans l'énoncé sont les guillemets pour les citations et les tirets pour les listes de questions
- Ne jamais donner d'indices visuels sur les réponses
(Ces règles s'appliquent UNIQUEMENT au champ "enonce". Le champ "corrige" peut rester en markdown détaillé.)

FORMAT DE RÉPONSE (JSON STRICT, rien d'autre) :
{
  "enonce": "texte brut de l'énoncé, sans markdown...",
  "corrige": "markdown du corrigé détaillé..."
}

Dans le corrigé uniquement, le markdown peut utiliser : ### titres, **gras**, listes -, séparateurs ---, et formules $...$.`;

    const { response } = await callAIGateway({
      apiKey: LOVABLE_API_KEY,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Génère l'exercice + corrigé pour : ${titre}` },
      ],
      extraBody: { response_format: { type: "json_object" } },
    });

    if (response!.status === 429) {
      return new Response(JSON.stringify({ error: "Trop de requêtes, réessaye dans un instant." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (response!.status === 402) {
      return new Response(JSON.stringify({ error: "Crédits IA épuisés." }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!response!.ok) {
      return new Response(JSON.stringify({ error: "Le service IA est temporairement indisponible. Réessaye dans un instant." }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response!.json();
    const raw = data.choices?.[0]?.message?.content || "{}";
    let parsed: { enonce?: string; corrige?: string } = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) {
        try { parsed = JSON.parse(match[0]); } catch { /* noop */ }
      }
    }

    return new Response(
      JSON.stringify({
        enonce: parsed.enonce || "Impossible de générer l'énoncé.",
        corrige: parsed.corrige || "Impossible de générer le corrigé.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("[generate-exercice] unhandled error:", e);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
