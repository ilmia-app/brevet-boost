import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Require authentication to prevent abuse of paid AI credits
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
    );
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { matiere, titre, objectifs_pedagogiques, duree_examen_min, tags, methode_etapes } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "API key not configured", fallback: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const methodeText = methode_etapes
      ? `Méthode à suivre étape par étape :\n${methode_etapes}`
      : "Aucune méthode spécifique.";

    // Déterminer le prompt utilisateur selon la matière et les tags
    const tagsLower = (tags || "").toLowerCase();
    const objectifsLower = (objectifs_pedagogiques || "").toLowerCase();
    const hasTableauOrGraphique = tagsLower.includes("graphique") || 
                                    tagsLower.includes("tableau") || 
                                    tagsLower.includes("statistiques") ||
                                    objectifsLower.includes("graphique") || 
                                    objectifsLower.includes("tableau") || 
                                    objectifsLower.includes("statistiques");

    let userPrompt = "";

    if (matiere === "Fran\u00e7ais") {
      // Prompt spécial pour Français
      const titreLower = (titre || "").toLowerCase();
      if (titreLower.includes("r\u00e9daction") || objectifsLower.includes("r\u00e9daction")) {
        userPrompt = `G\u00e9n\u00e8re un \u00e9nonc\u00e9 de [${titre}] niveau brevet CNED.

Pour une r\u00e9daction : fournis un sujet complet avec contexte, situation de d\u00e9part et consigne pr\u00e9cise (minimum 80 mots).

Style officiel brevet. Pas de titre, pas d'introduction.

Mati\u00e8re : ${matiere}. Objectifs : ${objectifs_pedagogiques || "aucun"}.`;
      } else if (titreLower.includes("compr\u00e9hension") || objectifsLower.includes("compr\u00e9hension")) {
        userPrompt = `G\u00e9n\u00e8re un \u00e9nonc\u00e9 de [${titre}] niveau brevet CNED.

Pour une compr\u00e9hension : fournis un texte court (150-200 mots) suivi de 2 questions pr\u00e9cises.

Style officiel brevet. Pas de titre, pas d'introduction.

Mati\u00e8re : ${matiere}. Objectifs : ${objectifs_pedagogiques || "aucun"}.`;
      } else {
        // Grammaire ou orthographe par défaut
        userPrompt = `G\u00e9n\u00e8re un \u00e9nonc\u00e9 de [${titre}] niveau brevet CNED.

Pour grammaire ou orthographe : fournis 3 \u00e0 5 phrases \u00e0 analyser.

Style officiel brevet. Pas de titre, pas d'introduction.

Mati\u00e8re : ${matiere}. Objectifs : ${objectifs_pedagogiques || "aucun"}.`;
      }
    } else if (matiere === "Maths" && hasTableauOrGraphique) {
      // Prompt spécial pour Maths avec tableau/graphique
      userPrompt = `G\u00e9n\u00e8re un \u00e9nonc\u00e9 niveau brevet CNED sur [${titre}].

L'exercice DOIT inclure un tableau de donn\u00e9es chiffr\u00e9es (4 \u00e0 6 valeurs) pr\u00e9sent\u00e9 en texte comme ceci :

| Valeur | Effectif |
| 10 | 3 |
| 15 | 5 |
etc.

Puis 2 ou 3 questions exploitant ce tableau.

Pas de titre, pas d'introduction.

Mati\u00e8re : ${matiere}. Objectifs : ${objectifs_pedagogiques || "aucun"}.`;
    } else {
      // Prompt par défaut pour les autres matières
      userPrompt = `G\u00e9n\u00e8re un exercice de type : ${titre || "exercice"}. Mati\u00e8re : ${matiere || "inconnue"}. Objectifs : ${objectifs_pedagogiques || "aucun"}. Dur\u00e9e cible : ${duree_examen_min || 15} minutes. Tags : ${tags || "aucun"}.

M\u00e9thode de r\u00e9solution (contexte uniquement, NE PAS inclure dans l'\u00e9nonc\u00e9) :
${methodeText}`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content:
              `Tu es un g\u00e9n\u00e9rateur d'exercices pour le Brevet des Coll\u00e8ges fran\u00e7ais, sp\u00e9cialis\u00e9 pour les \u00e9l\u00e8ves CNED.

G\u00e9n\u00e8re UN \u00e9nonc\u00e9 court, style brevet officiel, niveau 3\u00e8me.

R\u00c8GLES STRICTES :
- Commence directement par l'\u00e9nonc\u00e9 (ex: 'Un rectangle...', 'Soit...')
- Aucun titre, aucune dur\u00e9e, aucune introduction
- Aucune indication de m\u00e9thode ou d'\u00e9tapes dans l'\u00e9nonc\u00e9
- Aucune mise en forme markdown (pas de ** ni de *)
- Expressions math\u00e9matiques en texte simple : x\u00b2, (a+b)\u00b2, 3/5
- Maximum 80 mots
- Un seul exercice, une seule notion

La m\u00e9thode ci-dessous est fournie UNIQUEMENT pour que l'exercice soit coh\u00e9rent avec elle. Ne JAMAIS l'inclure dans l'\u00e9nonc\u00e9.`,
          },
          {
            role: "user",
            content: userPrompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Trop de requêtes, réessaie dans quelques instants.", fallback: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Crédits IA épuisés.", fallback: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "Génération temporairement indisponible.", fallback: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const exercise = data?.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({ exercise }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-exercise error:", e);
    return new Response(
      JSON.stringify({ error: "Erreur inattendue.", fallback: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
