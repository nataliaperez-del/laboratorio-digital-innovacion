/**
 * Cliente del proxy Gemini institucional UNAD (IA 360).
 * En desarrollo y `vite preview` las peticiones van al mismo origen `/api/unad-gemini`
 * para evitar CORS; el servidor Vite reenvía a chatbot-ia-360.unad.edu.co.
 */

import { sanitizeCredential } from '@/lib/sanitizeCredential';

/** Modelo por defecto: mejor equilibrio calidad/velocidad que flash-lite para contenedores y documentos largos. */
export const DEFAULT_UNAD_GEMINI_MODEL = 'gemini-3.5-flash';

export type UnadGeminiGenerateResponse = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }>; role?: string };
    finishReason?: string;
  }>;
  error?: { message?: string; code?: number };
};

export type UnadGeminiGenerateResult = {
  text: string;
  /** p. ej. "STOP" (completo) o "MAX_TOKENS" (salida cortada por límite). */
  finishReason: string | null;
};

/**
 * Los modelos Gemini son «pensantes»: sus tokens de razonamiento interno descuentan
 * del mismo maxOutputTokens. Sin límite, un tope de 8192 puede agotarse pensando y devolver
 * texto cortado o vacío; pero con 0 (pensamiento desactivado) el modelo degenera en prompts
 * largos (bucles de «---»). 1024 equilibra coherencia y presupuesto de salida.
 * Override: VITE_UNAD_GEMINI_THINKING_BUDGET (0 permite desactivarlo).
 */
function resolveThinkingBudget(): number {
  const raw = import.meta.env.VITE_UNAD_GEMINI_THINKING_BUDGET?.trim();
  if (raw) {
    const n = Number(raw);
    if (Number.isFinite(n) && n >= 0) return Math.min(Math.floor(n), 24_576);
  }
  return 1024;
}

function resolveModelAndCredentials(opts: {
  model?: string;
  xApiKeyUi?: string;
  bearerUi?: string;
}): { model: string; xApiKey: string; bearer: string } {
  const model = opts.model?.trim() || import.meta.env.VITE_UNAD_GEMINI_MODEL?.trim() || DEFAULT_UNAD_GEMINI_MODEL;
  // Las credenciales del servidor las pone el proxy; aquí solo viajan las escritas en el panel de IA.
  return { model, xApiKey: sanitizeCredential(opts.xApiKeyUi), bearer: sanitizeCredential(opts.bearerUi) };
}

function formatApiErrorField(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'object') {
    const o = value as Record<string, unknown>;
    if (typeof o.message === 'string' && o.message.trim()) return o.message.trim();
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

function parseProxyResponse(rawText: string, status: number): UnadGeminiGenerateResult {
  if (!status.toString().startsWith('2')) {
    try {
      const err = JSON.parse(rawText) as {
        error?: unknown;
        message?: unknown;
        detail?: unknown;
      };
      const msg =
        formatApiErrorField(err.error) ||
        formatApiErrorField(err.message) ||
        formatApiErrorField(err.detail) ||
        rawText.slice(0, 500) ||
        '(sin mensaje)';
      const hint =
        status === 500
          ? ' Suele deberse a un prompt demasiado grande para el proxy UNAD: reduce `VITE_MAX_COMBINED_SOURCE_CHARS` y `VITE_MAX_C2_PROMPT_DOC_CHARS`.'
          : status === 404
            ? ' La ruta /api/unad-gemini no existe en el servidor: revisa el .htaccess y includes/gemini_proxy.php.'
            : status === 401 || status === 403
              ? ' Revisa las credenciales: define UNAD_GEMINI_X_API_KEY y UNAD_GEMINI_BEARER en el servidor o escríbelas en el botón «IA» de la cabecera.'
              : '';
      throw new Error(`UNAD Gemini (${status}): ${msg}${hint}`);
    } catch (e) {
      if (e instanceof Error && e.message.startsWith('UNAD Gemini')) throw e;
      throw new Error(`UNAD Gemini (${status}): ${rawText.slice(0, 400)}`);
    }
  }

  let data: UnadGeminiGenerateResponse;
  try {
    data = JSON.parse(rawText) as UnadGeminiGenerateResponse;
  } catch {
    throw new Error(`UNAD Gemini: respuesta no JSON (${status}): ${rawText.slice(0, 400)}`);
  }

  const candidate = data.candidates?.[0];
  const parts = candidate?.content?.parts;
  const text = parts?.map((p) => p.text ?? '').join('') ?? '';
  if (!text.trim() && data.error?.message) {
    throw new Error(data.error.message);
  }
  return { text, finishReason: candidate?.finishReason ?? null };
}

/**
 * Envía un único turno usuario al proxy (formato compatible con el ejemplo institucional).
 */
export async function generateContentUnadGemini(
  prompt: string,
  options?: {
    maxOutputTokens?: number;
    model?: string;
    xApiKey?: string;
    bearer?: string;
    /** Búsqueda web (Google Search grounding); si el proxy la rechaza se reintenta sin ella. */
    googleSearch?: boolean;
    /** Señal de aborto (botón «Detener generación»). */
    signal?: AbortSignal;
  },
): Promise<UnadGeminiGenerateResult> {
  const { model, xApiKey, bearer } = resolveModelAndCredentials({
    model: options?.model,
    xApiKeyUi: options?.xApiKey,
    bearerUi: options?.bearer,
  });

  const body: Record<string, unknown> = {
    model,
    contents: [{ parts: [{ text: prompt }] }],
  };

  const maxOut = options?.maxOutputTokens;

  // Envía lo que haya (aunque sea una sola credencial): el servidor completa la que
  // falte desde sus variables de entorno. Antes se exigían ambas y, si faltaba una,
  // no se enviaba ninguna → 401 confuso.
  if (xApiKey || bearer) {
    body.credentials = {
      ...(xApiKey ? { xApiKey } : {}),
      ...(bearer ? { bearer } : {}),
    };
  }

  /**
   * Escalones de degradación ante 500 «frágil» del proxy. Se detiene en 4096:
   * bajar más producía secciones muy cortas sin aviso. El corte por límite ahora
   * se detecta vía finishReason y se recupera con continuación automática (ai.ts).
   */
  const budgets = (() => {
    const cap = maxOut != null && maxOut > 0 ? maxOut : 8192;
    const tiers = [cap, 8192, 4096].filter((n) => n > 0);
    const nums = [...new Set(tiers)].filter((n) => n <= cap).sort((a, b) => b - a);
    return [...nums, null] as (number | null)[];
  })();

  let lastStatus = 500;
  let lastRaw = '';
  let withSearch = Boolean(options?.googleSearch);
  let withThinking = true;
  const thinkingBudget = resolveThinkingBudget();

  for (let i = 0; i < budgets.length; i++) {
    const maxOutTry = budgets[i];
    const tryBody = { ...body };
    const genConfig: Record<string, unknown> = {};
    if (maxOutTry != null && maxOutTry > 0) {
      genConfig.maxOutputTokens = maxOutTry;
    }
    if (withThinking) {
      // El pensamiento descuenta de maxOutputTokens: nunca darle más de la mitad del tope
      // (con topes pequeños, p. ej. la prueba de conexión, un presupuesto fijo dejaría la salida vacía).
      const effectiveThinking =
        maxOutTry != null && maxOutTry > 0 ? Math.min(thinkingBudget, Math.floor(maxOutTry / 2)) : thinkingBudget;
      genConfig.thinkingConfig = { thinkingBudget: effectiveThinking };
    }
    if (Object.keys(genConfig).length > 0) {
      tryBody.generationConfig = genConfig;
    } else {
      delete tryBody.generationConfig;
    }
    if (withSearch) {
      tryBody.tools = [{ google_search: {} }];
    }

    const res = await fetch('/api/unad-gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tryBody),
      signal: options?.signal,
    });

    lastRaw = await res.text();
    lastStatus = res.status;
    if (res.ok) {
      return parseProxyResponse(lastRaw, lastStatus);
    }
    // 401/403 son de credenciales: reintentar sin búsqueda o sin thinkingConfig no los arregla.
    const maybeCausedByExtras = res.status === 400 || res.status === 422 || res.status === 500;
    if (withSearch && maybeCausedByExtras) {
      // El proxy institucional puede no aceptar herramientas: reintenta este mismo presupuesto sin búsqueda web.
      console.warn(`UNAD Gemini rechazó la petición con búsqueda web (${res.status}); reintentando sin ella.`);
      withSearch = false;
      i--;
      continue;
    }
    if (withThinking && (res.status === 400 || res.status === 422)) {
      // Gateway antiguo o modelo sin soporte de thinkingConfig: reintenta sin él.
      console.warn(`UNAD Gemini rechazó thinkingConfig (${res.status}); reintentando sin él.`);
      withThinking = false;
      i--;
      continue;
    }
    if (res.status !== 500) {
      return parseProxyResponse(lastRaw, lastStatus);
    }
    const fragile =
      lastRaw.includes('"detail":""') ||
      lastRaw.includes('"detail": ""') ||
      /"detail"\s*:\s*""/.test(lastRaw) ||
      lastRaw.trim() === '' ||
      lastRaw.trim() === '{}';
    if (!fragile || i === budgets.length - 1) {
      return parseProxyResponse(lastRaw, lastStatus);
    }
  }

  return parseProxyResponse(lastRaw, lastStatus);
}
