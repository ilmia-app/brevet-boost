// Edge function : génère un exercice + corrigé via Anthropic Claude
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    console.log("[generate-exercice] Clé présente:", !!ANTHROPIC_API_KEY);
    console.log("[generate-exercice] Longueur clé:", ANTHROPIC_API_KEY?.length || 0);

    if (!ANTHROPIC_API_KEY) {
      console.error("[generate-exercice] ANTHROPIC_API_KEY manquante dans les secrets");
      return new Response(
        JSON.stringify({ error: "ANTHROPIC_API_KEY n'est pas configurée dans les secrets Supabase." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { titre, matiere, objectifs, etapes, theme, bloc_id } = await req.json();
    console.log("[generate-exercice] Requête pour bloc:", bloc_id, "matière:", matiere);
    const isChartBloc = bloc_id === "MAT-04";

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
- Le corrigé doit être **détaillé étape par étape**, pédagogique.

RÈGLES ABSOLUES DE MISE EN FORME DE L'ÉNONCÉ :
- Pas de markdown dans l'énoncé (pas de **, pas de __, pas de ##)
- Pas de mise en gras des réponses, pas de soulignement, pas d'indice visuel
(Ces règles s'appliquent UNIQUEMENT au champ "enonce". Le champ "corrige" peut rester en markdown détaillé.)

FORMAT DE RÉPONSE (JSON STRICT, rien d'autre) :
{
  "enonce": "texte brut de l'énoncé, sans markdown...",
  "corrige": "markdown du corrigé détaillé..."
}

Dans le corrigé uniquement, le markdown peut utiliser : ### titres, **gras**, listes -, séparateurs ---, et formules $...$.`;

    const systemPrompt = isChartBloc ? chartPrompt : standardPrompt;

    console.log("[generate-exercice] Appel API Anthropic...");
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: `Génère l'exercice + corrigé pour : ${titre}. Réponds UNIQUEMENT avec un objet JSON strict, sans aucun texte autour.`,
          },
        ],
      }),
    });

    console.log("[generate-exercice] Réponse API status:", response.status);

    if (!response.ok) {
      const errText = await response.text();
      console.error("[generate-exercice] Erreur Anthropic:", response.status, errText);

      if (response.status === 401) {
        return new Response(
          JSON.stringify({ error: "Clé ANTHROPIC_API_KEY invalide ou expirée." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Trop de requêtes Anthropic, réessaye dans un instant." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      return new Response(
        JSON.stringify({ error: `Anthropic API error ${response.status}: ${errText.slice(0, 300)}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await response.json();
    const raw = data.content?.[0]?.text || "";
    console.log("[generate-exercice] Réponse reçue, longueur:", raw.length);

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
        try {
          parsed = JSON.parse(match[0]);
        } catch (e) {
          console.error("[generate-exercice] Échec parse JSON même après extraction:", e);
        }
      } else {
        console.error("[generate-exercice] Pas de JSON détecté dans la réponse:", raw.slice(0, 500));
      }
    }

    if (!parsed.enonce || !parsed.corrige) {
      console.error("[generate-exercice] Réponse mal formée. Raw:", raw.slice(0, 500));
      return new Response(
        JSON.stringify({ error: "L'IA a renvoyé une réponse mal formée. Réessaye." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log("[generate-exercice] Succès — exercice généré");
    return new Response(
      JSON.stringify({
        enonce: parsed.enonce,
        corrige: parsed.corrige,
        graphique: parsed.graphique || null,
        questions: parsed.questions || null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("[generate-exercice] Erreur non gérée:", e);
    return new Response(
      JSON.stringify({ error: `Erreur serveur: ${e instanceof Error ? e.message : String(e)}` }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
