/**
 * Núcleo de IA del Laboratorio: llamadas a cada proveedor, cancelación y recuperación de
 * respuestas vacías, cortadas o degeneradas. Es el mismo motor de la app Fase 1; las
 * herramientas lo usan desde sus propios servicios (territorialStudy, ideation,
 * innovationTree, prototyping) y sus prompts nunca se muestran al usuario.
 */
import { GoogleGenAI } from '@google/genai';
import { useStore, type AIProvider } from '@/store/useStore';
import { resolveAnthropicModel } from '@/constants/aiProviders';
import { generateContentUnadGemini } from '@/lib/unadGeminiProxy';
import { cargarTextoFamilia, cargarTextoGrupo } from '@/repositorio/cargarRepositorio';
import type { GrupoRepositorio } from '@/repositorio/tipos';

/** Lee un recurso del núcleo metodológico; sin `familia` devuelve el grupo completo concatenado. */
export async function leerNucleoTexto(grupo: GrupoRepositorio, familia?: string): Promise<string | null> {
  return familia ? cargarTextoFamilia(grupo, familia) : cargarTextoGrupo(grupo);
}

/** Error distintivo cuando el usuario pulsa «Detener generación»: la UI lo silencia. */
export class GenerationCancelledError extends Error {
  constructor() {
    super('Generación detenida por el usuario.');
    this.name = 'GenerationCancelledError';
  }
}

let activeAbort: AbortController | null = null;

/**
 * Bandera pegajosa: en flujos de varias llamadas (estudio, árbol)
 * el «Detener» puede llegar entre dos peticiones, cuando no hay aborto activo.
 * La bandera hace que la siguiente llamada falle de inmediato.
 */
let cancelRequested = false;

/** Detiene la mediación IA en curso (aborta la petición activa y las siguientes del mismo flujo). */
export function cancelActiveGeneration() {
  cancelRequested = true;
  activeAbort?.abort();
}

/** Debe llamarse al inicio de cada flujo de generación para limpiar una cancelación anterior. */
export function beginGenerationFlow() {
  cancelRequested = false;
}

/**
 * Prueba mínima de conexión con el proveedor configurado: envía un prompt diminuto
 * y espera cualquier respuesta. Lanza el error original si las claves o la red fallan.
 */
export async function testAIConnection(): Promise<void> {
  beginGenerationFlow();
  // Tope holgado: los modelos «pensantes» (gemini-2.5) gastan parte del presupuesto razonando
  // y con un tope diminuto devolverían texto vacío aunque la conexión funcione.
  await callAI('Responde únicamente con la palabra: OK', { maxOutputTokens: 256 });
}

export type CallAIOptions = {
  /** Tokens de salida (documentos largos necesitan valores altos) */
  maxOutputTokens?: number;
  /**
   * Activa la búsqueda web (Google Search grounding). Solo tiene efecto con los
   * proveedores Gemini (directo y proxy UNAD); los demás no ofrecen navegación.
   */
  googleSearch?: boolean;
  /** Llamada independiente de la generación en curso: «Detener» no la afecta ni ella a «Detener». */
  detached?: boolean;
};

/** Si el modelo ignora la instrucción y envuelve todo en ```markdown ... ```, quita el fence exterior. */
export function stripOuterMarkdownFence(text: string): string {
  const t = text.trim();
  const m = t.match(/^```(?:markdown|md)?\s*\r?\n([\s\S]*?)\r?\n```\s*$/i);
  return m ? m[1].trim() : t;
}

function getGeminiAI(customKey?: string) {
  if (!customKey) {
    throw new Error('Falta la API Key de Google Gemini. Escríbela en el botón «IA» de la cabecera.');
  }
  return new GoogleGenAI({ apiKey: customKey });
}

type CallAIResult = {
  text: string;
  /** true si el proveedor informó corte por límite de tokens de salida. */
  truncated: boolean;
};

async function callAIOnce(prompt: string, options?: CallAIOptions): Promise<CallAIResult> {
  const detached = Boolean(options?.detached);
  if (cancelRequested && !detached) throw new GenerationCancelledError();
  const state = useStore.getState();
  const { aiProvider, apiKeys, ollamaUrl, ollamaModel, openaiModel, anthropicModel, providerModels, unadGeminiBearer } = state;
  const maxOut = options?.maxOutputTokens;

  const controller = new AbortController();
  if (!detached) activeAbort = controller;
  const signal = controller.signal;

  try {
    if (aiProvider === 'unadGemini') {
      const r = await generateContentUnadGemini(prompt, {
        maxOutputTokens: maxOut,
        model: providerModels?.unadGemini,
        xApiKey: apiKeys.unadGemini,
        bearer: unadGeminiBearer,
        googleSearch: options?.googleSearch,
        signal,
      });
      return { text: r.text, truncated: r.finishReason === 'MAX_TOKENS' };
    }

    if (aiProvider === 'gemini') {
      const aiClient = getGeminiAI(apiKeys.gemini);
      const geminiModel = (providerModels?.gemini || import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.5-flash').trim();
      // El SDK no expone la señal de aborto: se corta con una carrera contra el botón «Detener».
      const abortPromise = new Promise<never>((_, reject) => {
        signal.addEventListener('abort', () => reject(new GenerationCancelledError()), { once: true });
      });
      // 503 (high demand) y 429 (rate limit) son transitorios: reintenta con espera progresiva.
      const maxAttempts = 4;
      let lastError: unknown = null;
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        if (signal.aborted) throw new GenerationCancelledError();
        try {
          const response = await Promise.race([
            aiClient.models.generateContent({
              model: geminiModel,
              contents: prompt,
              config: {
                maxOutputTokens: maxOut ?? 8192,
                // En modelos 2.5 el razonamiento descuenta de maxOutputTokens: sin límite corta la salida; con 0 el modelo degenera en prompts largos.
                ...(/2\.5/.test(geminiModel) ? { thinkingConfig: { thinkingBudget: Math.min(1024, Math.floor((maxOut ?? 8192) / 2)) } } : {}),
                ...(options?.googleSearch ? { tools: [{ googleSearch: {} }] } : {}),
              },
            }),
            abortPromise,
          ]);
          return {
            text: response.text || '',
            truncated: String(response.candidates?.[0]?.finishReason ?? '') === 'MAX_TOKENS',
          };
        } catch (e: unknown) {
          lastError = e;
          const msg = e instanceof Error ? e.message : String(e);
          const isTransient = /"code"\s*:\s*(503|429)|UNAVAILABLE|RESOURCE_EXHAUSTED|high demand|overloaded/i.test(msg);
          if (!isTransient || attempt === maxAttempts) throw e;
          const waitMs = 3000 * attempt;
          console.warn(`Gemini ocupado (intento ${attempt}/${maxAttempts}); reintentando en ${waitMs / 1000}s…`);
          // La espera respeta «Detener generación»: sin esto, el botón quedaba sin efecto durante el retardo.
          await new Promise<void>((resolve, reject) => {
            const timer = setTimeout(resolve, waitMs);
            signal.addEventListener(
              'abort',
              () => {
                clearTimeout(timer);
                reject(new GenerationCancelledError());
              },
              { once: true },
            );
          });
        }
      }
      throw lastError;
    }

    if (aiProvider === 'openai') {
      const apiKey = apiKeys.openai;
      if (!apiKey) throw new Error('OpenAI API Key is required.');
      const modelId = (providerModels?.openai || openaiModel || 'gpt-4o').trim();
      // Los modelos de razonamiento (o1/o3/o4, gpt-5*) rechazan max_tokens y exigen max_completion_tokens.
      const isReasoningModel = /^o\d/i.test(modelId) || modelId.toLowerCase().startsWith('gpt-5');
      const tokenCap = Math.min(maxOut ?? 4096, 16384);

      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: modelId,
          messages: [{ role: 'user', content: prompt }],
          ...(isReasoningModel ? { max_completion_tokens: tokenCap } : { max_tokens: tokenCap }),
        }),
        signal,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || 'Error calling OpenAI API');
      }

      const data = await res.json();
      return {
        text: data.choices[0].message.content ?? '',
        truncated: data.choices?.[0]?.finish_reason === 'length',
      };
    }

    if (aiProvider === 'anthropic') {
      const apiKey = apiKeys.anthropic;
      if (!apiKey) throw new Error('Anthropic API Key is required.');
      const selectedAnthropicModel = resolveAnthropicModel(providerModels?.anthropic || anthropicModel || import.meta.env.VITE_ANTHROPIC_MODEL);

      // En desarrollo pasa por el proxy de Vite; en producción Anthropic admite la llamada directa con la cabecera de abajo.
      const endpoint = import.meta.env.DEV ? '/api-anthropic/v1/messages' : 'https://api.anthropic.com/v1/messages';

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerously-allow-browser': 'true',
        },
        body: JSON.stringify({
          model: selectedAnthropicModel,
          max_tokens: Math.min(maxOut ?? 8192, 8192),
          messages: [{ role: 'user', content: prompt }],
        }),
        signal,
      });

      if (!res.ok) {
        const err = await res.json();
        const msg = err.error?.message || 'Error calling Anthropic API';
        if (err.error?.type === 'not_found_error' || /^model:/i.test(msg)) {
          throw new Error(
            `El modelo «${selectedAnthropicModel}» no está disponible en tu cuenta de Anthropic. Elige otro en el panel IA (p. ej. Claude Sonnet 5). Detalle: ${msg}`,
          );
        }
        throw new Error(msg);
      }

      const data = await res.json();
      return {
        text: data.content?.[0]?.text ?? '',
        truncated: data.stop_reason === 'max_tokens',
      };
    }

    if (aiProvider === 'ollama') {
      if (!ollamaUrl) throw new Error('Ollama URL is required.');
      const modelId = (providerModels?.ollama || ollamaModel || 'llama3').trim();

      const ollamaBody: Record<string, unknown> = {
        model: modelId,
        messages: [{ role: 'user', content: prompt }],
        stream: false,
      };
      if (maxOut) {
        ollamaBody.options = { num_predict: Math.min(maxOut, 32768) };
      }

      const res = await fetch(`${ollamaUrl.replace(/\/$/, '')}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(ollamaBody),
        signal,
      });

      if (!res.ok) {
        throw new Error(`Error calling Ollama API: ${res.statusText}`);
      }

      const data = await res.json();
      return {
        text: data.message?.content ?? '',
        truncated: data.done_reason === 'length',
      };
    }

    throw new Error(`Unsupported AI Provider: ${aiProvider}`);
  } catch (error: any) {
    // Abort del usuario: se propaga tal cual para que la UI lo silencie.
    if (error instanceof GenerationCancelledError || signal.aborted || error?.name === 'AbortError') {
      throw new GenerationCancelledError();
    }
    console.error('AI Generation Error:', error);
    throw new Error(`Error con ${aiProvider}: ${error.message}`);
  } finally {
    if (activeAbort === controller) activeAbort = null;
  }
}

/** Máximo de llamadas de continuación cuando la salida se corta por límite de tokens. */
const MAX_CONTINUATIONS = 2;

function buildContinuationPrompt(originalPrompt: string, partial: string): string {
  const tail = partial.slice(-6_000);
  return `${originalPrompt}

══════════════════════════════════════════════════
CONTINUACIÓN OBLIGATORIA — tu respuesta anterior se cortó por límite de tokens
══════════════════════════════════════════════════

Ya generaste una parte de la respuesta. Este es el FINAL EXACTO de lo que llevas escrito:

<<<FIN_DEL_PARCIAL
${tail}
FIN_DEL_PARCIAL>>>

Continúa la MISMA respuesta desde ese punto exacto (puede ser a mitad de frase, de lista o de fila de tabla):
- NO repitas texto ya escrito ni reinicies encabezados, listas o tablas.
- NO agregues preámbulos ("claro", "continúo…") ni cierres de asistente.
- Tu salida debe empezar con el texto que sigue inmediatamente al corte.`;
}

/** Une la continuación al parcial eliminando el solape si el modelo repitió el final ya escrito. */
function joinContinuation(partial: string, continuation: string): string {
  const c = stripOuterMarkdownFence(continuation);
  const window = Math.min(400, c.length, partial.length);
  for (let k = window; k >= 12; k--) {
    if (partial.endsWith(c.slice(0, k))) {
      return partial + c.slice(k);
    }
  }
  return partial + c;
}

/** Línea sin contenido real: solo guiones, pipes y símbolos (p. ej. `|---|---|` o `-----`). */
function isJunkLine(line: string): boolean {
  const t = line.trim();
  return t.length > 0 && /^[-_*=~·.|:+\s]+$/.test(t);
}

/**
 * Bucles de degeneración del modelo (agotan los tokens sin contenido útil). Se detectan cuatro formas:
 * 1) racha de 8+ líneas basura consecutivas (típico: fila separadora de tabla `|---|` repetida);
 * 2) mayoría de líneas de solo guiones/símbolos («---»);
 * 3) enumeraciones numéricas interminables (p. ej. «[cita: 1, 2, 3, … 400]»);
 * 4) cola con vocabulario casi nulo (las mismas pocas palabras repetidas en bucle).
 */
function isDegenerateOutput(text: string): boolean {
  const t = text.trim();
  if (!t) return false;

  const lines = t
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  // Racha de líneas basura consecutivas: una tabla legítima tiene UNA fila separadora;
  // 8 seguidas solo ocurren en bucles (aunque el resto del bloque tenga texto bueno).
  let run = 0;
  for (const l of lines) {
    if (isJunkLine(l)) {
      run++;
      if (run >= 8) return true;
    } else {
      run = 0;
    }
  }

  if (lines.length >= 10) {
    const junk = lines.filter(isJunkLine).length;
    if (junk / lines.length > 0.6) return true;
  }

  // 40+ números seguidos separados por comas nunca son contenido legítimo.
  if (/(?:\d{1,4}\s*[,;]\s*){40,}/.test(t)) return true;

  const tail = t.slice(-3_000);
  const words = tail.toLowerCase().match(/[a-záéíóúñü]{3,}/g) ?? [];
  if (words.length > 120 && new Set(words).size / words.length < 0.12) return true;

  return false;
}

/**
 * Rescate cuando el bucle aparece al FINAL de un bloque que empezó bien (caso típico:
 * texto correcto y luego una tabla que repite `|---|` hasta agotar los tokens).
 * Recorta la cola basura (y el encabezado de tabla huérfano si quedó sin filas);
 * devuelve null si lo restante no se sostiene solo y conviene regenerar todo el bloque.
 */
function salvageDegenerateTail(text: string): string | null {
  const lines = text.split(/\r?\n/);
  let end = lines.length;
  while (end > 0 && (lines[end - 1].trim().length === 0 || isJunkLine(lines[end - 1]))) end--;

  // Encabezado de tabla huérfano: la fila separadora y los datos se perdieron en el bucle.
  if (end > 0 && /^\|.*\|\s*$/.test(lines[end - 1].trim())) {
    let prev = end - 2;
    while (prev >= 0 && lines[prev].trim().length === 0) prev--;
    if (prev < 0 || !lines[prev].trim().startsWith('|')) end--;
  }

  const salvaged = lines.slice(0, end).join('\n').trim();
  if (salvaged.length < 400 || isDegenerateOutput(salvaged)) return null;
  return salvaged;
}

const DEGENERATE_TAIL_ALERT =
  '\n\n**ALERTA DE VERIFICACIÓN HUMANA: el final de este bloque se recortó porque el modelo entró en un bucle de repetición; revisar si falta contenido (p. ej. una tabla).**';

type RecoveredResult = { text: string; degenerate: boolean };

/** Una pasada completa: reintento de respuesta vacía + continuaciones si hubo corte por tokens. */
async function callAIWithRecovery(prompt: string, options?: CallAIOptions): Promise<RecoveredResult> {
  let { text, truncated } = await callAIOnce(prompt, options);

  if (!text.trim()) {
    ({ text, truncated } = await callAIOnce(prompt, options));
    if (!text.trim()) {
      throw new Error(
        'El modelo devolvió una respuesta vacía dos veces seguidas. Reintenta en unos minutos; si persiste, cambia de proveedor de IA en Configuración o reduce el tamaño de las fuentes.',
      );
    }
  }

  // Si la salida es un bucle de guiones, no tiene sentido continuarla. Cuando el bucle está
  // solo al final de un bloque que empezó bien, se rescata la parte buena; si no, se
  // reintenta desde cero (nivel superior).
  if (isDegenerateOutput(text)) {
    const salvaged = salvageDegenerateTail(text);
    if (salvaged) {
      console.warn('[IA] El modelo entró en bucle al final del bloque; se conservó la parte válida y se marcó con alerta.');
      return { text: salvaged + DEGENERATE_TAIL_ALERT, degenerate: false };
    }
    return { text, degenerate: true };
  }

  for (let i = 0; truncated && i < MAX_CONTINUATIONS; i++) {
    console.info(`[IA] El bloque alcanzó el límite de tokens; se completa con una continuación automática (${i + 1}/${MAX_CONTINUATIONS}). No es un error.`);
    const cont = await callAIOnce(buildContinuationPrompt(prompt, text), options);
    if (!cont.text.trim() || isDegenerateOutput(cont.text)) break;
    text = joinContinuation(text, cont.text);
    truncated = cont.truncated;
  }

  // Revisión final: la degeneración puede aparecer al final del texto (tras las continuaciones).
  if (isDegenerateOutput(text)) {
    const salvaged = salvageDegenerateTail(text);
    if (salvaged) {
      console.warn('[IA] El modelo entró en bucle al final del bloque; se conservó la parte válida y se marcó con alerta.');
      return { text: salvaged + DEGENERATE_TAIL_ALERT, degenerate: false };
    }
    return { text, degenerate: true };
  }

  if (truncated) {
    text += '\n\n**ALERTA DE VERIFICACIÓN HUMANA: este bloque pudo quedar incompleto por límite de tokens del modelo; revisar su parte final.**';
  }

  return { text, degenerate: false };
}

/**
 * Llama al modelo con tres protecciones:
 * 1) respuesta vacía → un reintento y luego error claro;
 * 2) corte por límite de tokens (finishReason) → continuaciones automáticas y alerta si queda incompleto;
 * 3) salida degenerada (bucles de «---» sin contenido) → un reintento completo y luego error claro.
 */
export async function callAI(prompt: string, options?: CallAIOptions): Promise<string> {
  let result = await callAIWithRecovery(prompt, options);
  if (result.degenerate) {
    console.warn('Salida degenerada (solo líneas repetidas, sin contenido); reintentando la generación completa…');
    result = await callAIWithRecovery(prompt, options);
    if (result.degenerate) {
      throw new Error(
        'El modelo devolvió una salida sin contenido útil (líneas repetidas). Suele ser transitorio: vuelve a intentarlo; si persiste, cambia de proveedor de IA en Configuración.',
      );
    }
  }
  return result.text;
}

/** Tokens de salida por llamada; el proxy UNAD falla con valores muy altos. */
export function defaultCallOptions(provider: AIProvider): { maxOutputTokens: number } {
  return { maxOutputTokens: provider === 'unadGemini' ? getUnadGeminiMaxOutputTokens() : 8192 };
}

export function getUnadGeminiMaxOutputTokens(): number {
  const raw = import.meta.env.VITE_UNAD_GEMINI_MAX_OUTPUT_TOKENS?.trim();
  if (raw) {
    const n = Number(raw);
    if (Number.isFinite(n) && n >= 256) return Math.min(Math.floor(n), 65_536);
  }
  /** El proxy UNAD suele fallar (500) con valores muy altos o con respuestas enormes en una sola llamada. */
  return 8192;
}

/** Extrae el primer objeto JSON de una respuesta del modelo, tolerando cercas y texto alrededor. */
export function parseJsonResponse<T>(raw: string): T {
  const clean = stripOuterMarkdownFence(raw)
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
  const start = clean.indexOf('{');
  const end = clean.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('La respuesta del modelo no contiene un objeto JSON.');
  return JSON.parse(clean.slice(start, end + 1)) as T;
}
