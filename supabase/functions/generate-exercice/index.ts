// Edge function : génère un exercice + corrigé via Lovable AI Gateway (Gemini 2.5 Pro)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

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

    const { titre, matiere, objectifs, etapes, theme, bloc_id } = await req.json();
    const isChartBloc = bloc_id === "MAT-04";

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) {
      return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY non configurée" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const chartPrompt = `Tu es le meilleur professeur de collège français, expert du Brevet (DNB) niveau 3ème.
Tu vas générer **un exercice original de lecture/exploitation de graphique** sur la notion suivante :

- Matière : ${matiere || "non précisée"}
- Thème / bloc : ${titre || "non précisé"}
${theme ? `- Sous-thème : ${theme}` : ""}
${objectifs ? `- Objectifs pédagogiques : ${objectifs}` : ""}

CONTRAINTES STRICTES :
- Niveau 3ème (Brevet), réaliste et faisable en 10-15 min.
- L'exercice s'appuie sur UN graphique (barres, courbe ou camembert) avec des données réalistes.
- 2 à 4 questions progressives basées sur la lecture/interprétation du graphique.
- Le corrigé doit être détaillé étape par étape, pédagogique.

FORMAT DE RÉPONSE (JSON STRICT, rien d'autre) :
{
  "enonce": "court contexte introductif sans markdown ni mise en forme",
  "graphique": {
    "type": "bar" | "line" | "pie",
    "titre": "titre du graphique",
    "labels": ["Lundi", "Mardi", ...],
    "donnees": [381, 363, 322, ...],
    "unite": "kWh" | "€" | "%" | ""
  },
  "questions": ["Question 1 ?", "Question 2 ?"],
  "corrige": "markdown du corrigé détaillé étape par étape, formules en $...$"
}

RÈGLES :
- "labels" et "donnees" doivent avoir la même longueur (4 à 8 valeurs).
- Pas de markdown dans "enonce" ni dans "questions".
- Le corrigé peut utiliser markdown : ### titres, **gras**, listes -, $...$ pour les formules.`;

    const standardPrompt = `Tu es le meilleur professeur de collège français, expert du Brevet (DNB) niveau 3ème.
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

    const systemPrompt = isChartBloc ? chartPrompt : standardPrompt;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        system: systemPrompt,
        messages: [
          { role: "user", content: `Génère l'exercice + corrigé pour : ${titre}. Réponds UNIQUEMENT avec un objet JSON strict {"enonce": "...", "corrige": "..."} sans aucun texte autour.` },
        ],
      }),
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
      const errText = await response!.text();
      console.error("Anthropic API error:", response!.status, errText);
      return new Response(JSON.stringify({ error: "Le service IA est temporairement indisponible. Réessaye dans un instant." }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response!.json();
    const raw = data.content?.[0]?.text || "{}";
    let parsed: {
      enonce?: string;
      corrige?: string;
      graphique?: { type: string; titre: string; labels: string[]; donnees: number[]; unite?: string };
      questions?: string[];
    } = {};
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
        graphique: parsed.graphique || null,
        questions: parsed.questions || null,
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
