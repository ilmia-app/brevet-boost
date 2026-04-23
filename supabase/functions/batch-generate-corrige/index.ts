// Edge function: génère en lot les corrigés manquants pour la table `exercices`
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
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!ANTHROPIC_API_KEY) {
      return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY non configurée" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: "Configuration Supabase manquante" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Récupère les exercices sans corrigé
    const { data: exercices, error: fetchErr } = await supabase
      .from("exercices")
      .select("id, enonce, corrige")
      .or("corrige.is.null,corrige.eq.");

    if (fetchErr) {
      console.error("[batch-generate-corrige] fetch error:", fetchErr);
      return new Response(JSON.stringify({ error: "Erreur lecture exercices" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const toProcess = (exercices ?? []).filter((e) => e.enonce && e.enonce.trim().length > 0);
    console.log(`[batch-generate-corrige] ${toProcess.length} exercices à traiter`);

    let generated = 0;
    const errors: Array<{ id: string; error: string }> = [];

    for (const ex of toProcess) {
      try {
        const systemPrompt = `Tu es un professeur expert du Brevet des Collèges français. Génère un corrigé type détaillé pour cet exercice de niveau 3ème. Énoncé : ${ex.enonce}. Sois précis, clair, niveau 3ème. Maximum 300 mots. Pas de mise en forme gras.`;

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
              { role: "user", content: `Génère le corrigé type pour cet exercice.` },
            ],
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          console.error(`[batch-generate-corrige] Anthropic error for ${ex.id}:`, response.status, errText);
          errors.push({ id: ex.id, error: `Anthropic ${response.status}` });
          if (response.status === 429) {
            // léger backoff sur rate limit
            await new Promise((r) => setTimeout(r, 2000));
          }
          continue;
        }

        const data = await response.json();
        const corrige = data.content?.[0]?.text?.trim();
        if (!corrige) {
          errors.push({ id: ex.id, error: "Réponse vide" });
          continue;
        }

        const { error: updErr } = await supabase
          .from("exercices")
          .update({ corrige })
          .eq("id", ex.id);

        if (updErr) {
          console.error(`[batch-generate-corrige] update error for ${ex.id}:`, updErr);
          errors.push({ id: ex.id, error: "DB update failed" });
          continue;
        }

        generated++;
      } catch (e) {
        console.error(`[batch-generate-corrige] exception for ${ex.id}:`, e);
        errors.push({ id: ex.id, error: String(e) });
      }
    }

    return new Response(
      JSON.stringify({
        generated,
        total: toProcess.length,
        errors_count: errors.length,
        errors: errors.slice(0, 10),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("[batch-generate-corrige] unhandled error:", e);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});