import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
              `Tu es un générateur d'exercices pour le Brevet des Collèges français, spécialisé pour les élèves CNED.

Génère UN énoncé court, style brevet officiel, niveau 3ème.

RÈGLES STRICTES :
- Commence directement par l'énoncé (ex: 'Un rectangle...', 'Soit...')
- Aucun titre, aucune durée, aucune introduction
- Aucune indication de méthode ou d'étapes dans l'énoncé
- Aucune mise en forme markdown (pas de ** ni de *)
- Expressions mathématiques en texte simple : x², (a+b)², 3/5
- Maximum 80 mots
- Un seul exercice, une seule notion

La méthode ci-dessous est fournie UNIQUEMENT pour que l'exercice soit cohérent avec elle. Ne JAMAIS l'inclure dans l'énoncé.`,
          },
          {
            role: "user",
            content: `Génère un exercice de type : ${titre || "exercice"}. Matière : ${matiere || "inconnue"}. Objectifs : ${objectifs_pedagogiques || "aucun"}. Durée cible : ${duree_examen_min || 15} minutes. Tags : ${tags || "aucun"}.\n\nMéthode de résolution (contexte uniquement, NE PAS inclure dans l'énoncé) :\n${methodeText}`,
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
