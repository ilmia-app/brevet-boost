// Helper partagé : appel à Lovable AI Gateway avec retry + fallback de modèle.
// Utilisé par les edge functions generate-exercice et generate-corrige.

export interface AIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface CallAIOptions {
  apiKey: string;
  messages: AIMessage[];
  /** Liste ordonnée des modèles à essayer. Le 1er est primaire, les suivants sont des fallbacks/retries. */
  models?: string[];
  /** Délai (ms) entre 2 tentatives en cas d'erreur transitoire. */
  retryDelayMs?: number;
  /** Champs additionnels à passer dans le body (response_format, tools, etc.). */
  extraBody?: Record<string, unknown>;
}

export interface CallAIResult {
  /** Réponse HTTP finale (peut être ok, 429, 402, ou autre). */
  response: Response;
  /** Modèle qui a effectivement répondu (ok ou non-retryable). */
  modelUsed: string;
}

const DEFAULT_MODELS = [
  "google/gemini-2.5-pro",
  "google/gemini-2.5-pro",
  "google/gemini-2.5-flash",
];

/**
 * Appelle le Lovable AI Gateway avec retry et fallback de modèle.
 * - Stoppe immédiatement sur 2xx, 429, 402 (non-retryable côté serveur).
 * - Retry sur les autres erreurs (5xx, réseau) avec le modèle suivant.
 */
export async function callAIGateway(opts: CallAIOptions): Promise<CallAIResult> {
  const { apiKey, messages, extraBody } = opts;
  const models = opts.models?.length ? opts.models : DEFAULT_MODELS;
  const retryDelayMs = opts.retryDelayMs ?? 800;

  const callOnce = (model: string) =>
    fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model, messages, ...(extraBody ?? {}) }),
    });

  let response!: Response;
  let modelUsed = models[0];

  for (let i = 0; i < models.length; i++) {
    modelUsed = models[i];
    try {
      response = await callOnce(modelUsed);
      if (response.ok || response.status === 429 || response.status === 402) {
        return { response, modelUsed };
      }
      console.warn(
        `[aiGateway] status ${response.status} avec ${modelUsed}, tentative suivante…`,
      );
    } catch (err) {
      console.warn(`[aiGateway] fetch error avec ${modelUsed}:`, err);
      // synthétise une réponse pour ne pas casser l'appelant si c'est la dernière itération
      response = new Response(
        JSON.stringify({ error: "network_error" }),
        { status: 502, headers: { "Content-Type": "application/json" } },
      );
    }
    if (i < models.length - 1) {
      await new Promise((r) => setTimeout(r, retryDelayMs));
    }
  }

  return { response, modelUsed };
}
