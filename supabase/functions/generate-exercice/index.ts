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

    const userId = userData.user.id;
    const body = await req.json();
    const { titre, matiere, objectifs, etapes, theme, bloc_id, force_new } = body;
    const isChartBloc = bloc_id === "MAT-04";

    // Client avec privilèges service_role pour bypass RLS sur lecture du pool
    // (et écriture côté system) tout en gardant created_by = userId.
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 1) Si on a un bloc_id et qu'on n'est PAS en mode "force_new",
    //    on tente de piocher dans le pool partagé un exercice que l'user n'a jamais vu.
    if (bloc_id && !force_new) {
      try {
        const { data: seen } = await supabaseAdmin
          .from("exercices_vus")
          .select("exercice_id")
          .eq("user_id", userId);
        const seenIds = (seen || []).map((s: { exercice_id: string }) => s.exercice_id);

        let query = supabaseAdmin
          .from("exercices_generes")
          .select("id, enonce, corrige, graphique, questions")
          .eq("bloc_id", bloc_id)
          .limit(50);
        if (seenIds.length > 0) {
          query = query.not("id", "in", `(${seenIds.join(",")})`);
        }
        const { data: pool } = await query;

        if (pool && pool.length > 0) {
          const picked = pool[Math.floor(Math.random() * pool.length)];
          // Marquer comme vu (ignore conflit unique)
          await supabaseAdmin
            .from("exercices_vus")
            .insert({ user_id: userId, exercice_id: picked.id });

          return new Response(
            JSON.stringify({
              enonce: picked.enonce,
              corrige: picked.corrige,
              graphique: picked.graphique || null,
              questions: picked.questions || null,
              source: "pool",
              exercice_id: picked.id,
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
      } catch (e) {
        console.error("[generate-exercice] pool lookup failed:", e);
        // on continue vers la génération IA
      }
    }

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

    const blocInstructions: Record<string, string> = {
      "MAT-01": "ATTENTION MATHS : Vérifie TOUS tes calculs avant de répondre. Pose l'équation, résous-la étape par étape, vérifie le résultat dans l'énoncé. Ne jamais donner un résultat non entier si le contexte implique des personnes ou des objets.",
      "MAT-02": "ATTENTION MATHS : Vérifie TOUS tes calculs. Utilise uniquement les 3 identités remarquables : (a+b)²=a²+2ab+b², (a-b)²=a²-2ab+b², (a+b)(a-b)=a²-b². Ne jamais inventer d'autres identités.",
      "MAT-03": "ATTENTION MATHS : Vérifie TOUS tes calculs. Pour Pythagore : hypoténuse² = côté1² + côté2². Pour Thalès : les rapports sont égaux. Vérifier la configuration avant d'appliquer.",
      "MAT-04": "ATTENTION MATHS : Vérifie TOUS tes calculs. Moyenne = somme des (valeur × effectif) DIVISÉ PAR l'effectif TOTAL. Médiane = valeur du milieu après rangement. Étendue = max - min. Ne jamais diviser par autre chose que l'effectif total.",
      "MAT-05": "ATTENTION MATHS : Vérifie TOUS tes calculs. Pourcentage : multiplier par taux/100. Vitesse : v = d/t. Conversion km/h vers m/s : DIVISER par 3,6. Ne jamais additionner deux remises successives.",
      "PHY-01": "ATTENTION PHYSIQUE : Loi d'Ohm : U = R × I. En série : I identique partout, tensions s'additionnent. En dérivation : U identique, intensités s'additionnent. Vérifier le type de circuit avant tout calcul.",
      "PHY-02": "ATTENTION PHYSIQUE : v = d/t. Conversion km/h vers m/s : DIVISER par 3,6 (pas par 3). Énergie cinétique : Ec = ½ × m × v² avec v EN M/S obligatoirement. Vérifier les unités à chaque étape.",
      "TEC-01": "ATTENTION TECHNO SCRATCH : Simule l'exécution du programme PAS À PAS sur papier avant de rédiger le corrigé. Pour une moyenne de N notes : diviser par N (pas par 2, pas par autre chose). Vérifier chaque boucle, chaque condition, chaque calcul de variable. Ne jamais inventer le comportement d'un bloc Scratch.",
      "SVT-01": "ATTENTION SVT : Un humain a 46 chromosomes (23 paires). Allèle dominant : une seule copie suffit pour exprimer le caractère. Allèle récessif : deux copies nécessaires. Ne jamais inventer de pourcentages sans faire le tableau de croisement.",
      "SVT-02": "ATTENTION SVT : Digestion = bouche → estomac → intestin grêle → côlon. Absorption dans l'intestin grêle. Respiration : O2 entre dans le sang, CO2 en sort. Immunité : phagocytes en premier, lymphocytes ensuite. Ne jamais confondre respiration cellulaire et pulmonaire.",
      "FRA-04": "ATTENTION FRANÇAIS : Distinguer classe grammaticale (ce qu'est le mot) et fonction syntaxique (son rôle dans la phrase). Vérifier chaque analyse avec les questions canoniques : qui ? quoi ? comment ? où ? quand ?",
      "FRA-05": "ATTENTION FRANÇAIS : Participe passé avec être : accord avec le sujet. Participe passé avec avoir : accord avec le COD uniquement si placé AVANT le verbe. Homophones : appliquer les tests de substitution (avait/à, était/et, etc.).",
    };

    const blocSpecific = blocInstructions[bloc_id] ? `\n\n${blocInstructions[bloc_id]}` : "";

    const standardPrompt = `Tu es le meilleur professeur de collège français, expert du Brevet (DNB) niveau 3ème.
Tu vas générer **un exercice original** ET **son corrigé détaillé** sur la notion suivante :

- Matière : ${matiere || "non précisée"}
- Thème / bloc : ${titre || "non précisé"}
${theme ? `- Sous-thème : ${theme}` : ""}
${objectifs ? `- Objectifs pédagogiques : ${objectifs}` : ""}
${etapes ? `- Méthode attendue : ${etapes}` : ""}${blocSpecific}

CONTRAINTES STRICTES :
- Niveau 3ème (Brevet), réaliste et faisable en 10-15 min.
- **Pas de tableau, pas de graphique, pas de figure géométrique complexe** : que du texte et des formules en LaTeX inline ($...$).
- L'exercice doit comporter 2 à 4 questions progressives (a, b, c…).
- Le corrigé doit être **détaillé étape par étape**, pédagogique, comme l'expliquerait le meilleur prof : rappels de cours brefs, calculs détaillés, justifications.
- VÉRIFIE TOUS TES CALCULS AVANT DE RÉPONDRE. Un corrigé avec une erreur de calcul est inacceptable.

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

    // Appel Anthropic avec retry exponentiel pour forcer la génération
    const callAnthropic = async () => fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5",
        max_tokens: 4096,
        system: systemPrompt,
        messages: [
          { role: "user", content: `Génère l'exercice + corrigé pour : ${titre}. Réponds UNIQUEMENT avec un objet JSON strict {"enonce": "...", "corrige": "..."} sans aucun texte autour.` },
        ],
      }),
    });

    let response: Response | null = null;
    let lastErr = "";
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        response = await callAnthropic();
        if (response.ok) break;
        if (response.status === 429 || response.status === 402) break; // surfaced below
        lastErr = `status ${response.status}`;
      } catch (e) {
        lastErr = String(e);
      }
      await new Promise((r) => setTimeout(r, 500 * Math.pow(2, attempt)));
    }
    if (!response) {
      console.error("[generate-exercice] no response after retries:", lastErr);
      return new Response(JSON.stringify({ error: "Service IA injoignable. Réessaye." }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
    const rawText = data.content?.[0]?.text || "{}";
    const stopReason = data.stop_reason;
    // Strip markdown fences (```json ... ``` or ``` ... ```)
    let raw = rawText.trim();
    const fenceMatch = raw.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
    if (fenceMatch) raw = fenceMatch[1].trim();
    else raw = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
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

    // Si l'IA n'a pas renvoyé d'énoncé exploitable, on renvoie une erreur 502
    // pour que le client puisse réessayer plutôt que d'afficher un texte de fallback.
    if (!parsed.enonce || !parsed.corrige) {
      console.error("[generate-exercice] parsing failed. stop_reason:", stopReason, "raw:", raw.slice(0, 500));
      return new Response(JSON.stringify({ error: "Réponse IA invalide, réessaye." }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Enregistrer le nouvel exercice dans le pool partagé + historique user
    let exerciceId: string | null = null;
    if (bloc_id) {
      try {
        const { data: inserted, error: insErr } = await supabaseAdmin
          .from("exercices_generes")
          .insert({
            bloc_id,
            enonce: parsed.enonce,
            corrige: parsed.corrige,
            graphique: parsed.graphique || null,
            questions: parsed.questions || null,
            created_by: userId,
          })
          .select("id")
          .single();
        if (insErr || !inserted) {
          console.error("[generate-exercice] insert pool failed:", insErr);
        } else {
          exerciceId = inserted.id;
          await supabaseAdmin
            .from("exercices_vus")
            .insert({ user_id: userId, exercice_id: inserted.id });
        }
      } catch (e) {
        console.error("[generate-exercice] save pool failed:", e);
      }
    }

    return new Response(
      JSON.stringify({
        enonce: parsed.enonce,
        corrige: parsed.corrige,
        graphique: parsed.graphique || null,
        questions: parsed.questions || null,
        source: "ai",
        exercice_id: exerciceId,
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
