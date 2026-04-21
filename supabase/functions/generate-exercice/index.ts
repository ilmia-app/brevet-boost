// Edge function : génère un exercice + corrigé via Lovable AI Gateway
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { titre, matiere, objectifs, etapes, theme, bloc_id } = await req.json();
    const isChartBloc = bloc_id === "MAT-04";

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY non configurée" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const chartSystem = `Tu es le meilleur professeur de collège français, expert du Brevet (DNB) niveau 3ème.
Tu génères un exercice original de lecture/exploitation de graphique, niveau 3ème, faisable en 10-15 min.
- L'exercice s'appuie sur UN graphique (barres, courbe ou camembert) avec des données réalistes.
- 2 à 4 questions progressives.
- Le corrigé est détaillé étape par étape, pédagogique.
- Énoncé et questions en texte brut, sans markdown. Le corrigé peut utiliser markdown (### **gras** listes - $...$).
- "labels" et "donnees" doivent avoir la même longueur (4 à 8 valeurs).`;

    const standardSystem = `Tu es le meilleur professeur de collège français, expert du Brevet (DNB) niveau 3ème.
Tu génères un exercice original ET son corrigé détaillé, niveau 3ème, faisable en 10-15 min.
- Pas de tableau, pas de graphique, pas de figure géométrique complexe : que du texte et formules LaTeX inline ($...$).
- 2 à 4 questions progressives (a, b, c…).
- Corrigé détaillé étape par étape, pédagogique.
- Énoncé en texte brut SANS markdown (pas de **, pas de __, pas de ##), sans mise en gras des réponses, sans soulignement, sans indice visuel.
- Corrigé en markdown : ### titres, **gras**, listes -, séparateurs ---, formules $...$.`;

    const systemPrompt = isChartBloc ? chartSystem : standardSystem;

    const userPrompt = `Génère l'exercice + corrigé pour la notion suivante :
- Matière : ${matiere || "non précisée"}
- Thème / bloc : ${titre || "non précisé"}
${theme ? `- Sous-thème : ${theme}` : ""}
${objectifs ? `- Objectifs pédagogiques : ${objectifs}` : ""}
${etapes ? `- Méthode attendue : ${etapes}` : ""}`;

    const tool = isChartBloc
      ? {
          type: "function",
          function: {
            name: "rendre_exercice_graphique",
            description: "Renvoie un exercice de lecture de graphique avec énoncé, graphique, questions et corrigé.",
            parameters: {
              type: "object",
              properties: {
                enonce: { type: "string", description: "Court contexte introductif, texte brut sans markdown." },
                graphique: {
                  type: "object",
                  properties: {
                    type: { type: "string", enum: ["bar", "line", "pie"] },
                    titre: { type: "string" },
                    labels: { type: "array", items: { type: "string" } },
                    donnees: { type: "array", items: { type: "number" } },
                    unite: { type: "string" },
                  },
                  required: ["type", "titre", "labels", "donnees"],
                  additionalProperties: false,
                },
                questions: { type: "array", items: { type: "string" } },
                corrige: { type: "string", description: "Corrigé détaillé en markdown." },
              },
              required: ["enonce", "graphique", "questions", "corrige"],
              additionalProperties: false,
            },
          },
        }
      : {
          type: "function",
          function: {
            name: "rendre_exercice",
            description: "Renvoie un exercice avec énoncé et corrigé détaillé.",
            parameters: {
              type: "object",
              properties: {
                enonce: { type: "string", description: "Énoncé en texte brut sans markdown." },
                corrige: { type: "string", description: "Corrigé détaillé en markdown." },
              },
              required: ["enonce", "corrige"],
              additionalProperties: false,
            },
          },
        };

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [tool],
        tool_choice: { type: "function", function: { name: tool.function.name } },
      }),
    });

    if (response.status === 429) {
      return new Response(JSON.stringify({ error: "Trop de requêtes, réessaye dans un instant." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (response.status === 402) {
      return new Response(JSON.stringify({ error: "Crédits IA épuisés. Ajoute des crédits dans Settings > Workspace > Usage." }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!response.ok) {
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      return new Response(JSON.stringify({ error: "Le service IA est temporairement indisponible. Réessaye dans un instant." }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    let parsed: {
      enonce?: string;
      corrige?: string;
      graphique?: { type: string; titre: string; labels: string[]; donnees: number[]; unite?: string };
      questions?: string[];
    } = {};

    if (toolCall?.function?.arguments) {
      try {
        parsed = JSON.parse(toolCall.function.arguments);
      } catch (e) {
        console.error("Failed to parse tool arguments:", e, toolCall.function.arguments);
      }
    } else {
      // Fallback : essayer de parser le contenu textuel
      const raw = data.choices?.[0]?.message?.content || "{}";
      try {
        parsed = JSON.parse(raw);
      } catch {
        const match = raw.match(/\{[\s\S]*\}/);
        if (match) {
          try { parsed = JSON.parse(match[0]); } catch { /* noop */ }
        }
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
