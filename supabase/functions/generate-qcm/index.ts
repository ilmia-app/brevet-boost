// Edge function : génère un QCM (5 questions à choix multiples) via Lovable AI Gateway
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface QcmQuestion {
  question: string;
  choix: string[];
  bonne_reponse: number; // index 0..3
  explication: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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
    const userId = userData.user.id;

    const body = await req.json();
    const subjects: string[] = Array.isArray(body.subjects) ? body.subjects : [];
    const themes: string[] = Array.isArray(body.themes) ? body.themes : [];
    const force_new: boolean = !!body.force_new;

    if (subjects.length === 0) {
      return new Response(JSON.stringify({ error: "subjects requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Pseudo-bloc_id pour mutualiser le pool : QCM-<matières triées>
    const poolBlocId = `QCM-${[...subjects].sort().join("-").toUpperCase()}`;

    // 1) Tenter de piocher dans le pool partagé un QCM jamais vu
    if (!force_new) {
      try {
        const { data: seen } = await supabaseAdmin
          .from("exercices_vus")
          .select("exercice_id")
          .eq("user_id", userId);
        const seenIds = (seen || []).map((s: { exercice_id: string }) => s.exercice_id);

        let query = supabaseAdmin
          .from("exercices_generes")
          .select("id, questions")
          .eq("bloc_id", poolBlocId)
          .limit(50);
        if (seenIds.length > 0) {
          query = query.not("id", "in", `(${seenIds.join(",")})`);
        }
        const { data: pool } = await query;

        if (pool && pool.length > 0) {
          const picked = pool[Math.floor(Math.random() * pool.length)];
          await supabaseAdmin
            .from("exercices_vus")
            .insert({ user_id: userId, exercice_id: picked.id });

          return new Response(
            JSON.stringify({
              questions: picked.questions,
              source: "pool",
              exercice_id: picked.id,
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
      } catch (e) {
        console.error("[generate-qcm] pool lookup failed:", e);
      }
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY non configurée" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const themesText = themes.length > 0
      ? `Thèmes prioritaires à couvrir : ${themes.slice(0, 8).join(" ; ")}.`
      : "Couvre des notions classiques du programme de 3ème.";

    const systemPrompt = `Tu es un professeur expert du Brevet des collèges (DNB) niveau 3ème.
Tu génères un QCM rapide de 5 questions pour réviser. Niveau : élève de 3ème.

Matières concernées : ${subjects.join(", ")}.
${themesText}

CONTRAINTES STRICTES :
- 5 questions au total, réparties sur les matières indiquées si possible.
- Chaque question a EXACTEMENT 4 choix (A, B, C, D) dont UNE SEULE bonne réponse.
- Questions courtes, claires, sans piège tordu. Pas de double négation.
- L'index "bonne_reponse" est un entier 0..3 (0 = premier choix).
- "explication" : 1-2 phrases expliquant pourquoi c'est la bonne réponse.
- Pas de markdown, pas de LaTeX, du texte brut.`;

    const tools = [
      {
        type: "function",
        function: {
          name: "return_qcm",
          description: "Retourne un QCM de 5 questions",
          parameters: {
            type: "object",
            properties: {
              questions: {
                type: "array",
                minItems: 5,
                maxItems: 5,
                items: {
                  type: "object",
                  properties: {
                    question: { type: "string" },
                    choix: {
                      type: "array",
                      minItems: 4,
                      maxItems: 4,
                      items: { type: "string" },
                    },
                    bonne_reponse: { type: "integer", minimum: 0, maximum: 3 },
                    explication: { type: "string" },
                  },
                  required: ["question", "choix", "bonne_reponse", "explication"],
                  additionalProperties: false,
                },
              },
            },
            required: ["questions"],
            additionalProperties: false,
          },
        },
      },
    ];

    const callGateway = async () =>
      fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: "Génère le QCM maintenant en appelant l'outil return_qcm." },
          ],
          tools,
          tool_choice: { type: "function", function: { name: "return_qcm" } },
        }),
      });

    let response: Response | null = null;
    let lastErr = "";
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        response = await callGateway();
        if (response.ok) break;
        if (response.status === 429 || response.status === 402) break;
        lastErr = `status ${response.status}`;
      } catch (e) {
        lastErr = String(e);
      }
      await new Promise((r) => setTimeout(r, 500 * Math.pow(2, attempt)));
    }

    if (!response) {
      console.error("[generate-qcm] no response after retries:", lastErr);
      return new Response(JSON.stringify({ error: "Service IA injoignable. Réessaye." }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
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
      console.error("[generate-qcm] gateway error:", response.status, errText);
      return new Response(JSON.stringify({ error: "Le service IA est temporairement indisponible." }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    let parsed: { questions?: QcmQuestion[] } = {};
    if (toolCall?.function?.arguments) {
      try {
        parsed = JSON.parse(toolCall.function.arguments);
      } catch (e) {
        console.error("[generate-qcm] JSON parse failed:", e);
      }
    }

    const questions = parsed.questions;
    if (!Array.isArray(questions) || questions.length === 0) {
      console.error("[generate-qcm] invalid questions:", JSON.stringify(parsed).slice(0, 500));
      return new Response(JSON.stringify({ error: "Réponse IA invalide, réessaye." }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Persister dans le pool partagé (réutilisable par d'autres users avec mêmes matières)
    let exerciceId: string | null = null;
    try {
      const { data: inserted, error: insErr } = await supabaseAdmin
        .from("exercices_generes")
        .insert({
          bloc_id: poolBlocId,
          enonce: `QCM ${subjects.join(" / ")}`,
          corrige: "",
          questions: questions as unknown as Record<string, unknown>[],
          created_by: userId,
        })
        .select("id")
        .single();
      if (insErr || !inserted) {
        console.error("[generate-qcm] insert pool failed:", insErr);
      } else {
        exerciceId = inserted.id;
        await supabaseAdmin
          .from("exercices_vus")
          .insert({ user_id: userId, exercice_id: inserted.id });
      }
    } catch (e) {
      console.error("[generate-qcm] save pool failed:", e);
    }

    return new Response(
      JSON.stringify({
        questions,
        source: "ai",
        exercice_id: exerciceId,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("[generate-qcm] unhandled error:", e);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});