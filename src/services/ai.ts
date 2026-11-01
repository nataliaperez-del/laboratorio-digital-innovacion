import { GoogleGenAI } from '@google/genai';
import { useStore, type AIProvider } from '@/store/useStore';
import {
  getMaxCombinedSourceChars,
  getMaxC2TerritorialPromptDocCharsForContainer,
  getMaxDocumentContainerChars,
  getMaxFundantePreviousContextChars,
  getMaxInstruccionFundantePromptChars,
  getMaxSupplementaryDocumentChars,
  getMaxThemeStepContainerChars,
  truncateAtBoundary,
  truncateContainerForDocument,
} from '@/lib/promptBudget';
import {
  assembleFundanteDocument,
  buildFundanteSectionPrompt,
  buildSelfRepairSuffix,
  FUNDANTE_SECTIONS,
  reviewFundanteSection,
  sanitizeFundanteSectionMarkdown,
  type FundanteSectionProgress,
  type FundanteSectionResult,
  type FundanteSectionStatus,
} from '@/prompts/fundantePhase3Sections';
import {
  assembleContenedor2Document,
  buildContenedor2AppPoint,
  buildContenedor2SectionPrompt,
  buildContenedor2SelfRepairSuffix,
  contenedor2Points,
  CONTENEDOR2_SECTIONS,
  extractContenedor2Section,
  reviewContenedor2Section,
  sanitizeContenedor2SectionMarkdown,
  type Contenedor2DocumentResult,
  type Contenedor2Point,
  type Contenedor2SectionProgress,
  type Contenedor2SectionResult,
  type Contenedor2SectionStatus,
} from '@/prompts/contenedor2Sections';
import { cipDisplayName, cipIdentity } from '@/lib/cipIdentity';
import {
  assembleInnovationTreeDocument,
  assembleVocationDocument,
  buildInnovationTreePartPrompt,
  buildInnovationTreeSelfRepairSuffix,
  buildThemeVocationPartPrompt,
  buildVocationSelfRepairSuffix,
  INNOVATION_TREE_PARTS,
  reviewInnovationTreePart,
  reviewVocationPart,
  sanitizeInnovationTreeMarkdown,
  sanitizeVocationMarkdown,
  VOCATION_PARTS,
  type GenerationPartProgress,
  type InnovationTreeDocumentResult,
  type InnovationTreePartResult,
  type InnovationTreePartStatus,
  type VocationDocumentResult,
  type VocationPartResult,
  type VocationPartStatus,
  type VocationPromptInputs,
} from '@/prompts/themeAndInnovationPrompts';
import { resolveAnthropicModel } from '@/constants/aiProviders';
import { generateContentUnadGemini } from '@/lib/unadGeminiProxy';
import {
  DRIVE_REFERENCE_CONTENEDOR_1,
  DRIVE_REFERENCE_CONTENEDOR_1_ALT,
  DRIVE_REFERENCE_CONTENEDOR_1_CANDIDATES,
  DRIVE_REFERENCE_INSTRUCCION_FUNDANTE,
  DRIVE_REFERENCE_INSTRUCCION_FUNDANTE_CANDIDATES,
  DRIVE_REFERENCE_PROMPT_VOCACION_CIP,
  DRIVE_REFERENCE_PROMPT_VOCACION_CIP_CANDIDATES,
  DRIVE_REFERENCE_PROMPTS_FUENTES_C2_TERRITORIAL,
  DRIVE_REFERENCE_PROMPTS_FUENTES_C2_TERRITORIAL_CANDIDATES,
  DRIVE_REFERENCE_PROMPT_ARBOL_INNOVACION,
  DRIVE_REFERENCE_PROMPT_ARBOL_INNOVACION_CANDIDATES,
} from '@/constants/cipDocumentReferences';
import {
  buildSigiipPromptBlock,
  getSigiipProjectLimit,
  parseSigiipRegistry,
  selectSigiipProjects,
} from '@/lib/sigiipRegistry';
import type { Prompt0Data, SigiipSnapshot } from '@/store/useStore';
import {
  buildPrioritizedInstitutionalBlock,
  extractFirstInstitutionalFileFromBundle,
  fetchContenedor1FromDrive,
  fetchContenedor2TerritorialPromptsDocFromDrive,
  fetchInnovationTreePromptFromDrive,
  fetchInstruccionFundanteFromDrive,
  fetchVocacionCipPromptFromDrive,
  findTerritoryMatch,
  findTerritorySources,
} from '@/services/institutionalDrive';
import {
  DEMO_CONTAINER_MD,
  DEMO_DOCUMENT_MD,
  DEMO_INNOVATION_TREE_MD,
  DEMO_THEME_PROPOSAL_MD,
} from '@/constants/demoData';
import { getRepositorioOrigen } from '@/constants/repositorio';
import { cargarTextoFamilia, cargarTextoGrupo, manifestActual } from '@/repositorio/cargarRepositorio';
import type { GrupoRepositorio } from '@/repositorio/tipos';
import { construirProcedencia, type Procedencia } from '@/repositorio/procedencia';

export type {
  FundanteSectionProgress,
  FundanteSectionResult,
  FundanteSectionStatus,
} from '@/prompts/fundantePhase3Sections';

/**
 * Lee un recurso del núcleo metodológico. Con VITE_REPOSITORIO_ORIGEN=repo (por defecto)
 * proviene del repositorio versionado en Git (servido desde public/, sin llamadas de red).
 * Con `drive` (legado, @deprecated) se extrae del bundle de Drive y, si falta, se descarga
 * con el fetcher indicado. Si `familia` se omite, en modo repo devuelve el grupo completo
 * concatenado (p. ej. CONTENEDOR_1.md + el listado de investigación SIGIIP).
 */
async function leerNucleoTexto(opts: {
  candidates: string[];
  grupo: GrupoRepositorio;
  familia?: string;
  driveCombined: string;
  driveFetcher?: () => Promise<string | null>;
}): Promise<string | null> {
  if (getRepositorioOrigen() === 'repo') {
    return opts.familia ? cargarTextoFamilia(opts.grupo, opts.familia) : cargarTextoGrupo(opts.grupo);
  }
  let texto = opts.driveCombined
    ? extractFirstInstitutionalFileFromBundle(opts.driveCombined, opts.candidates)
    : null;
  if (!texto?.trim() && opts.driveFetcher) texto = await opts.driveFetcher();
  return texto;
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
 * Bandera pegajosa: en flujos de varias llamadas (proyecto de innovación, 13 apartados)
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
function beginGenerationFlow() {
  cancelRequested = false;
}

/**
 * Espera `ms` en el MODO DEMOSTRACIÓN, respetando el botón «Detener generación»:
 * si el usuario cancela, rechaza con GenerationCancelledError como haría una llamada real.
 */
function demoSleep(ms: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const tick = () => {
      if (cancelRequested) return reject(new GenerationCancelledError());
      if (Date.now() - start >= ms) return resolve();
      setTimeout(tick, 80);
    };
    tick();
  });
}

/**
 * Simula un flujo de generación por pasos: emite el progreso de cada elemento con
 * un retardo realista y devuelve el Markdown de ejemplo. Reutiliza los mismos
 * metadatos de secciones/partes que el flujo real, de modo que la UI (loaders,
 * «Bloque 3/12…», «Apartado 4/13…») se comporta igual que en producción.
 */
async function simulateGeneration<T>(
  items: readonly T[],
  emit: (item: T, index: number) => void,
  result: string,
  msPerItem = 420,
): Promise<string> {
  for (let i = 0; i < items.length; i++) {
    emit(items[i], i);
    await demoSleep(msPerItem);
  }
  return result;
}

/**
 * Prueba mínima de conexión con el proveedor configurado: envía un prompt diminuto
 * y espera cualquier respuesta. Lanza el error original si las claves o la red fallan.
 */
export async function testAIConnection(): Promise<void> {
  beginGenerationFlow();
  // MODO DEMOSTRACIÓN: simula una conexión exitosa (semáforo verde) sin llamar a ningún proveedor.
  if (useStore.getState().demoMode) {
    await new Promise((r) => setTimeout(r, 600));
    return;
  }
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
};

/** Si el modelo ignora la instrucción y envuelve todo en ```markdown ... ```, quita el fence exterior. */
function stripOuterMarkdownFence(text: string): string {
  const t = text.trim();
  const m = t.match(/^```(?:markdown|md)?\s*\r?\n([\s\S]*?)\r?\n```\s*$/i);
  return m ? m[1].trim() : t;
}

function getGeminiAI(customKey?: string) {
  const apiKey = customKey || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set. Please configure it in your environment variables or in the AI Settings.");
  }
  // Re-instantiate if a custom key is provided and it's different, or if not instantiated
  return new GoogleGenAI({ apiKey });
}

type CallAIResult = {
  text: string;
  /** true si el proveedor informó corte por límite de tokens de salida. */
  truncated: boolean;
};

async function callAIOnce(prompt: string, options?: CallAIOptions): Promise<CallAIResult> {
  if (cancelRequested) throw new GenerationCancelledError();
  const state = useStore.getState();
  const { aiProvider, apiKeys, ollamaUrl, ollamaModel, openaiModel, anthropicModel, providerModels, unadGeminiBearer } = state;
  const maxOut = options?.maxOutputTokens;

  const controller = new AbortController();
  activeAbort = controller;
  const signal = controller.signal;

  try {
    if (aiProvider === 'unadGemini') {
      const r = await generateContentUnadGemini(prompt, {
        maxOutputTokens: maxOut,
        xApiKey: apiKeys.unadGemini,
        bearer: unadGeminiBearer,
        googleSearch: options?.googleSearch,
        signal,
      });
      return { text: r.text, truncated: r.finishReason === 'MAX_TOKENS' };
    }

    if (aiProvider === 'gemini') {
      const aiClient = getGeminiAI(apiKeys.gemini);
      const geminiModel =
        (providerModels?.gemini || import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.5-flash').trim();
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
                ...(/2\.5/.test(geminiModel)
                  ? { thinkingConfig: { thinkingBudget: Math.min(1024, Math.floor((maxOut ?? 8192) / 2)) } }
                  : {}),
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
      if (!apiKey) throw new Error("OpenAI API Key is required.");
      const modelId = (providerModels?.openai || openaiModel || 'gpt-4o').trim();
      // Los modelos de razonamiento (o1/o3/o4, gpt-5*) rechazan max_tokens y exigen max_completion_tokens.
      const isReasoningModel = /^o\d/i.test(modelId) || modelId.toLowerCase().startsWith('gpt-5');
      const tokenCap = Math.min(maxOut ?? 4096, 16384);

      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
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
      if (!apiKey) throw new Error("Anthropic API Key is required.");
      const selectedAnthropicModel = resolveAnthropicModel(
        providerModels?.anthropic || anthropicModel || import.meta.env.VITE_ANTHROPIC_MODEL,
      );

      // En navegador se usa el proxy local /api-anthropic para evitar bloqueo CORS de Anthropic
      const endpoint = typeof window !== 'undefined' ? '/api-anthropic/v1/messages' : 'https://api.anthropic.com/v1/messages';

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerously-allow-browser': 'true'
        },
        body: JSON.stringify({
          model: selectedAnthropicModel,
          max_tokens: Math.min(maxOut ?? 8192, 8192),
          messages: [{ role: 'user', content: prompt }]
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
      if (!ollamaUrl) throw new Error("Ollama URL is required.");
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
    console.error("AI Generation Error:", error);
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
      console.warn('[Centro de Innovación] El modelo entró en bucle al final del bloque; se conservó la parte válida y se marcó con alerta.');
      return { text: salvaged + DEGENERATE_TAIL_ALERT, degenerate: false };
    }
    return { text, degenerate: true };
  }

  for (let i = 0; truncated && i < MAX_CONTINUATIONS; i++) {
    console.info(
      `[Centro de Innovación] El bloque alcanzó el límite de tokens; se completa con una continuación automática (${i + 1}/${MAX_CONTINUATIONS}). No es un error.`,
    );
    const cont = await callAIOnce(buildContinuationPrompt(prompt, text), options);
    if (!cont.text.trim() || isDegenerateOutput(cont.text)) break;
    text = joinContinuation(text, cont.text);
    truncated = cont.truncated;
  }

  // Revisión final: la degeneración puede aparecer al final del texto (tras las continuaciones).
  if (isDegenerateOutput(text)) {
    const salvaged = salvageDegenerateTail(text);
    if (salvaged) {
      console.warn('[Centro de Innovación] El modelo entró en bucle al final del bloque; se conservó la parte válida y se marcó con alerta.');
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
async function callAI(prompt: string, options?: CallAIOptions): Promise<string> {
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

export type {
  Contenedor2SectionProgress,
  Contenedor2SectionResult,
  Contenedor2SectionStatus,
  Contenedor2DocumentResult,
} from '@/prompts/contenedor2Sections';

export type {
  GenerationPartProgress,
  VocationDocumentResult,
  VocationPartResult,
  VocationPartStatus,
  InnovationTreeDocumentResult,
  InnovationTreePartResult,
  InnovationTreePartStatus,
} from '@/prompts/themeAndInnovationPrompts';

/**
 * Error por archivo de referencia ausente en el repositorio de Drive, con la evidencia
 * de lo que sí se leyó en esa carpeta: la causa habitual no es que el archivo falte,
 * sino que su nombre en Drive no corresponde al esperado.
 */
function missingDriveReferenceError(options: {
  fileName: string;
  folder: string;
  alternativeNames?: string[];
  extraHint?: string;
}): Error {
  const { fileName, folder, alternativeNames = [], extraHint } = options;
  const diagnostics = useStore.getState().institutionalDriveBundle?.diagnostics;
  const folderKey = folder.replace(/\/+$/, '').toUpperCase();
  const folderWasVisited = (diagnostics?.folderPaths ?? []).some(
    (path) => path.toUpperCase() === folderKey || path.toUpperCase().startsWith(`${folderKey}/`),
  );
  const readHere = (diagnostics?.filePaths ?? [])
    .filter((path) => path.toUpperCase().startsWith(`${folderKey}/`))
    .map((path) => path.slice(folderKey.length + 1));

  const lines = [`No se encontró **${fileName}** en el repositorio de Google Drive (debe estar en \`${folder}\`).`];
  if (!diagnostics) {
    lines.push('Conecta el Contenedor 1 en la Fase 2 para que la app lea el repositorio y vuelve a intentar.');
  } else if (!folderWasVisited) {
    lines.push(`La carpeta \`${folder}\` no se recorrió: no existe con ese nombre o tu cuenta no tiene acceso.`);
  } else if (readHere.length) {
    lines.push(
      `En \`${folder}\` sí se leyeron: ${readHere.join(', ')}. Si el archivo está ahí con otro nombre, renómbralo.`,
    );
  } else {
    lines.push(`La carpeta \`${folder}\` se recorrió, pero está vacía o sin archivos legibles.`);
  }
  if (alternativeNames.length) {
    lines.push(`También se acepta el nombre anterior: ${alternativeNames.join(', ')}.`);
  }
  if (extraHint) lines.push(extraHint);
  lines.push('Corrige el nombre o sube el archivo y pulsa «Reconectar Contenedor 1» en la Fase 2.');
  return new Error(lines.join('\n'));
}

/**
 * Nota de trazabilidad documental literal (§6.1). Se reproduce sin cambios en el documento
 * cuando no hubo fuentes propias. `version` es la del núcleo (Contenedor 1) con el que se generó.
 */
function notaTrazabilidadSinFuentes(version: string): string {
  const v = version || 's. v.';
  return (
    'Nota de trazabilidad documental. Para la construcción de este Contenedor 2 no se incorporaron ' +
    'fuentes primarias propias del territorio. El repositorio de fuentes propias no fue habilitado por el ' +
    'equipo responsable en el momento de la generación. En consecuencia, el contenido territorial de este ' +
    'documento proviene exclusivamente de fuentes secundarias públicas y del núcleo metodológico institucional ' +
    `(Contenedor 1, versión ${v}). Todo dato territorial aquí registrado debe entenderse como candidato ` +
    'pendiente de verificación y no puede ser citado en documentos oficiales sin contraste previo con fuente primaria.'
  );
}

/**
 * Bloque de CONDICIÓN DE PROCEDENCIA que se inyecta en el prompt del sistema, antes de las
 * instrucciones de fase (§6). No negociable: fija qué puede y qué no puede afirmar el modelo
 * según haya o no fuentes primarias propias del territorio.
 */
function buildProcedenceSystemBlock(procedencia: Procedencia): string {
  const version = procedencia.repositorio.version;
  if (procedencia.fuentesPropias.modo === 'sin_fuentes') {
    return [
      '══════════════════════════════════════════════════',
      'CONDICIÓN DE PROCEDENCIA: SIN FUENTES PRIMARIAS PROPIAS.',
      '══════════════════════════════════════════════════',
      'El equipo del territorio no habilitó repositorio de fuentes propias para esta generación.',
      'Reglas obligatorias:',
      '1. No afirmes, insinúes ni supongas que existen fuentes primarias del territorio.',
      '2. No atribuyas ningún dato territorial a fuente primaria, entrevista, acta o registro interno.',
      '3. Todo dato territorial se marca como CANDIDATO — PENDIENTE DE VERIFICACIÓN, con la fuente secundaria de la que proviene.',
      '4. La aplicación añadirá al final del documento la «Nota de trazabilidad documental» literal; respeta su contenido y no la reproduzcas tú (para no duplicarla).',
      '5. Si una sección exige fuente primaria y no la hay, declara el vacío en la matriz de vacíos. No lo rellenes con inferencia.',
      '',
      'Texto de referencia de la nota (la añade la aplicación, no la copies):',
      notaTrazabilidadSinFuentes(version),
    ].join('\n');
  }

  const docs = procedencia.fuentesPropias.documentos;
  const inventario = docs.length
    ? docs
        .map((d) => `- ${d.nombre} (${d.mimeType}${d.modificado ? `, modificado ${d.modificado}` : ''})`)
        .join('\n')
    : '- (sin documentos legibles en el inventario)';
  return [
    '══════════════════════════════════════════════════',
    'CONDICIÓN DE PROCEDENCIA: CON FUENTES PRIMARIAS PROPIAS.',
    '══════════════════════════════════════════════════',
    'El equipo del territorio habilitó las siguientes fuentes propias (inventario verificado por la aplicación):',
    inventario,
    '',
    'Reglas obligatorias:',
    '1. Solo puedes atribuir un dato a fuente primaria si el documento correspondiente está EN ESTE INVENTARIO. No cites nada fuera de él.',
    '2. El contenido extraído de estas fuentes se transcribe más abajo, en «MATERIAL DE LAS FUENTES». Úsalo como fuente de prioridad.',
    '3. La aplicación añadirá al final del documento una «Tabla de fuentes propias consultadas» con este inventario; no la reproduzcas tú.',
    '4. Si un dato no está respaldado por el inventario ni por fuente secundaria pública, márcalo como CANDIDATO — PENDIENTE DE VERIFICACIÓN.',
  ].join('\n');
}

/** Sección determinista que la aplicación añade al final del contenedor para garantizar la trazabilidad (§6). */
function buildTrazabilidadAppendix(procedencia: Procedencia): string {
  if (procedencia.fuentesPropias.modo === 'sin_fuentes') {
    return `## Nota de trazabilidad documental\n\n${notaTrazabilidadSinFuentes(procedencia.repositorio.version)}`;
  }
  const docs = procedencia.fuentesPropias.documentos;
  const filas = docs.length
    ? docs
        .map((d) => `| ${d.nombre} | ${d.mimeType || '—'} | ${d.modificado ? d.modificado.slice(0, 10) : '—'} |`)
        .join('\n')
    : '| (sin documentos legibles) | — | — |';
  return [
    '## Fuentes propias del territorio consultadas',
    '',
    `Inventario verificado el ${procedencia.fuentesPropias.verificadoEn.slice(0, 10)} en la carpeta de Drive del territorio. ` +
      'Solo los documentos de esta tabla respaldan atribuciones a fuente primaria.',
    '',
    '| Documento | Tipo | Última modificación |',
    '|---|---|---|',
    filas,
  ].join('\n');
}

interface Contenedor2Context {
  aiProvider: AIProvider;
  sharedContext: string;
  identity: ReturnType<typeof cipIdentity>;
  procedencia: Procedencia;
}

async function prepareContenedor2Context(
  prompt0Data: Prompt0Data,
  institutionalDriveText?: string,
  procedenciaArg?: Procedencia,
): Promise<Contenedor2Context> {
  const { aiProvider, institutionalDriveBundle, fuentesMode, fuentesConexion } = useStore.getState();
  const procedencia =
    procedenciaArg ?? construirProcedencia({ manifest: manifestActual(), fuentesMode, fuentesConexion });
  const driveCombined =
    (institutionalDriveText && institutionalDriveText.trim()) ||
    institutionalDriveBundle?.text?.trim() ||
    '';
  const territoryMatch = findTerritoryMatch(institutionalDriveBundle?.territories, prompt0Data.municipality || '');
  const territory = territoryMatch?.sources ?? null;
  const identity = cipIdentity(prompt0Data);

  let c2Methodology = await leerNucleoTexto({
    candidates: DRIVE_REFERENCE_PROMPTS_FUENTES_C2_TERRITORIAL_CANDIDATES,
    grupo: 'CONTENEDOR_2',
    familia: 'contenedor2_contexto_territorial',
    driveCombined,
    driveFetcher: fetchContenedor2TerritorialPromptsDocFromDrive,
  });
  if (!c2Methodology?.trim()) {
    throw missingDriveReferenceError({
      fileName: DRIVE_REFERENCE_PROMPTS_FUENTES_C2_TERRITORIAL,
      folder: 'CONTENEDOR_2/',
      alternativeNames: ['PROMPTS_FUENTES_CONSULTA_CONTENEDOR2_TERRITORIAL 1.txt'],
    });
  }

  const maxMeth = getMaxC2TerritorialPromptDocCharsForContainer(aiProvider);
  const methodology = truncateAtBoundary(
    c2Methodology.trim(),
    maxMeth,
    `MARCO METODOLÓGICO del Contenedor 2 (${DRIVE_REFERENCE_PROMPTS_FUENTES_C2_TERRITORIAL})`,
  );
  const instructionSlice = methodology.text + methodology.notice;
  if (methodology.wasTruncated) {
    console.warn(
      `[Contenedor 2] La instrucción institucional de Drive (${c2Methodology.length.toLocaleString()} caracteres) excede el presupuesto del proveedor (${maxMeth.toLocaleString()}). Sube \`VITE_MAX_C2_PROMPT_DOC_CHARS\` en .env.local para enviarla completa.`,
    );
  }

  const maxSources = Math.max(
    getMaxCombinedSourceChars(aiProvider) - methodology.text.length,
    Math.floor(getMaxCombinedSourceChars(aiProvider) * 0.3),
  );

  let territoryTrimmed = '';
  let territoryNotice = '';
  let focusMatchedFiles: string[] = [];
  let generalBudget = maxSources;
  if (territory?.text.trim()) {
    const territoryBlock = buildPrioritizedInstitutionalBlock(territory.text, Math.floor(maxSources * 0.6), {
      keywords: identity.focusKeywords,
    });
    territoryTrimmed = territoryBlock.text;
    territoryNotice = territoryBlock.notice;
    focusMatchedFiles = territoryBlock.keywordMatchedFiles;
    generalBudget = Math.max(maxSources - territoryTrimmed.length, Math.floor(maxSources * 0.3));
  }

  const institutionalBlock = buildPrioritizedInstitutionalBlock(driveCombined, generalBudget, {
    keywords: identity.focusKeywords,
    exclude: [
      ...DRIVE_REFERENCE_CONTENEDOR_1_CANDIDATES,
      ...DRIVE_REFERENCE_PROMPTS_FUENTES_C2_TERRITORIAL_CANDIDATES,
      ...DRIVE_REFERENCE_INSTRUCCION_FUNDANTE_CANDIDATES,
      ...DRIVE_REFERENCE_PROMPT_ARBOL_INNOVACION_CANDIDATES,
      ...DRIVE_REFERENCE_PROMPT_VOCACION_CIP_CANDIDATES,
    ],
  });
  const instTrimmed = institutionalBlock.text;
  const budgetNotice = institutionalBlock.notice;
  if (institutionalBlock.includedFiles.length) {
    console.info(
      `[Contenedor 2] Fuentes generales enviadas al modelo: ${institutionalBlock.includedFiles.join(', ')}`,
    );
  }
  focusMatchedFiles = [...focusMatchedFiles, ...institutionalBlock.keywordMatchedFiles];
  if (identity.focusText) {
    console.info(
      `[Contenedor 2] Tema previsto «${identity.focusText}»: ${
        focusMatchedFiles.length
          ? `lo mencionan ${focusMatchedFiles.join(', ')}`
          : 'ningún archivo del repositorio lo menciona'
      }.`,
    );
  }

  const territoryFacts = territoryMatch
    ? [
        `- Subcarpeta del territorio: **encontrada** → \`C_TERRITORIO_ESPECIFICO/${territoryMatch.sources.name}\`.`,
        `- Tipo de coincidencia con «${prompt0Data.municipality}»: ${
          territoryMatch.tier === 'exact'
            ? 'exacta (el nombre de la subcarpeta corresponde al municipio).'
            : territoryMatch.tier === 'nested'
              ? 'por carpeta anidada (la zona organizó las fuentes en un nivel más profundo, p. ej. por departamento). Repórtalo como observación de trazabilidad.'
              : '**parcial** (el nombre no coincide exactamente). Repórtalo como observación de trazabilidad, no como error.'
        }`,
        `- Archivos leídos en esa subcarpeta: ${territoryMatch.sources.fileNames.join(', ')}.`,
        territoryMatch.alsoMatched.length
          ? `- **Ambigüedad real**: también correspondían al municipio estas subcarpetas: ${territoryMatch.alsoMatched.join(', ')}. Solo se envió el material de la primera. Genera una alerta de verificación humana pidiendo confirmar cuál aplica.`
          : '- No había otras subcarpetas candidatas: no hay ambigüedad que reportar.',
      ].join('\n')
    : `- Subcarpeta del territorio: **no encontrada**. La aplicación recorrió \`C_TERRITORIO_ESPECIFICO/\` y no existe ninguna subcarpeta que corresponda a «${prompt0Data.municipality}»${
        institutionalDriveBundle?.diagnostics?.territoryFolderNames?.length
          ? ` (las que sí existen son: ${institutionalDriveBundle.diagnostics.territoryFolderNames.join(', ')})`
          : ' (esa carpeta está vacía)'
      }. No había insumo institucional propio del territorio en el momento de la ejecución: la Fase 4 no tiene con qué contrastar y debes declararlo.`;

  const appWrittenPoints = CONTENEDOR2_SECTIONS.filter((p) => p.kind === 'app')
    .map((p) => `${p.number} («${p.title}»)`)
    .join(' y ');

  const identityFacts = identity.focusText
    ? `- Nombre del Centro de Innovación: **todavía sin definir**. El equipo de zona usó esa casilla para declarar el tema que prevé trabajar; el rótulo provisional del documento es «${identity.displayName || 'Centro de Innovación (nombre pendiente de confirmación)'}».
- **Tema previsto por el equipo de zona: «${identity.focusText}»**. Es una hipótesis de trabajo declarada antes del diagnóstico: no es un hecho verificado, no es una fuente y no es una decisión tomada.

Qué debes hacer con ese tema previsto (obligatorio):
- Trátalo como **hipótesis a verificar**, nunca como premisa. No acomodes el diagnóstico para que encaje, no lo cites como si fuera fuente y no supongas que el territorio lo respalda.
- Búscalo de forma **dirigida**: además del diagnóstico territorial general, comprueba en cada apartado que lo admita (caracterización productiva, pilares, brechas y oportunidades) si las fuentes del territorio y la consulta por internet dicen algo **específico** sobre ese tema en este municipio. Si no dicen nada, dilo; no lo compenses con generalidades del sector.
- Insumos del repositorio que mencionan el tema: ${focusMatchedFiles.length ? focusMatchedFiles.join(', ') : '**ninguno**; si tampoco aparece en la consulta por internet, el tema queda sin respaldo documental y debes declararlo así'}.
- El veredicto sobre la hipótesis se da **solo** en el punto 8, donde se te pedirá expresamente. No lo adelantes en los apartados anteriores y no declares por él la vocación ni los temas estratégicos.`
    : `- Nombre tentativo del Centro de Innovación: ${prompt0Data.labName}
- El equipo de zona no declaró ningún tema previsto: el diagnóstico no tiene hipótesis de enfoque que verificar y ninguna orientación temática debe darse por supuesta.`;

  const sharedContext = `
${buildProcedenceSystemBlock(procedencia)}

══════════════════════════════════════════════════
INSTRUCCIÓN INSTITUCIONAL DEL CONTENEDOR 2 — VIGENTE Y OBLIGATORIA
(Google Drive: ${DRIVE_REFERENCE_PROMPTS_FUENTES_C2_TERRITORIAL})
══════════════════════════════════════════════════

Lo que sigue es la instrucción que debes **ejecutar**: su metodología, sus criterios de calidad por fase, su manejo de vacíos, su estructura de salida y sus prohibiciones son de aplicación literal. No es una referencia opcional ni un ideal aspiracional.

${instructionSlice}

══════════════════════════════════════════════════
HECHOS DE EJECUCIÓN (verificados por la aplicación — no los reinterpretes ni los completes)
══════════════════════════════════════════════════

Ficha Base:
${identityFacts}
- Zona UNAD: ${prompt0Data.zonaUNAD}
- Municipio: ${prompt0Data.municipality}
- Departamento: ${prompt0Data.department}
- País: ${prompt0Data.country}

Recorrido de Google Drive (ya realizado por la aplicación; tú **no** navegas carpetas: el material que corresponde se transcribe más abajo):
${territoryFacts}
- Insumos institucionales generales enviados: ${institutionalBlock.includedFiles.length ? institutionalBlock.includedFiles.join(', ') : 'ninguno'}.
- El resultado del Contenedor 1 **no se envía**: la instrucción declara que no es fuente de contexto territorial. No lo cites ni supongas su contenido.

Búsqueda por internet: la aplicación la solicita en cada llamada. Si el proveedor no la habilita, no dispondrás de ella; en ese caso trabaja solo con el material transcrito abajo y declara los vacíos según la instrucción, sin recurrir a datos de memoria no verificables.

Puntos que **no** debes redactar: los puntos ${appWrittenPoints} los escribe la aplicación de forma automática y verificable. Si te toca otro punto, no los adelantes ni los dupliques.
${budgetNotice}
══════════════════════════════════════════════════
MATERIAL DE LAS FUENTES
══════════════════════════════════════════════════
${
  territoryTrimmed
    ? `
INSUMOS DEL TERRITORIO — \`C_TERRITORIO_ESPECIFICO/${territory!.name}\` (fuente de prioridad 1)
Archivos: ${territory!.fileNames.join(', ')}

${territoryTrimmed}${territoryNotice}
`
    : `
(No hay insumos del territorio: ver los hechos de ejecución de arriba.)
`
}${
    instTrimmed
      ? `
OTROS DOCUMENTOS INSTITUCIONALES DEL REPOSITORIO (PDF, DOCX, TXT, Google Docs, imágenes con OCR ya extraído)

${instTrimmed}
`
      : `
(No llegó texto institucional general del repositorio.)
`
  }`.trim();

  return {
    aiProvider,
    sharedContext,
    identity,
    procedencia,
  };
}

async function generateContenedor2Section(
  ctx: Contenedor2Context,
  point: Contenedor2Point,
  previousMarkdown: string,
): Promise<Contenedor2SectionResult> {
  if (point.kind === 'app') {
    const md = buildContenedor2AppPoint(point, previousMarkdown);
    return {
      number: point.number,
      title: point.title,
      phase: point.phase,
      kind: point.kind,
      markdown: md,
      status: 'ok',
    };
  }

  let blockMarkdown = '';
  let review: { status: Contenedor2SectionStatus; issue?: string } = { status: 'ok' };

  try {
    for (let part = 0; part < point.parts.length; part++) {
      const prompt = buildContenedor2SectionPrompt(
        ctx.sharedContext,
        point,
        part,
        previousMarkdown + (blockMarkdown ? '\n\n' + blockMarkdown : ''),
        ctx.identity.displayName,
      );
      const raw = await callAI(prompt, {
        googleSearch: true,
        ...(ctx.aiProvider === 'unadGemini' ? { maxOutputTokens: getUnadGeminiMaxOutputTokens() } : {}),
      });
      const chunk = sanitizeContenedor2SectionMarkdown(stripOuterMarkdownFence(raw));
      blockMarkdown += (blockMarkdown ? '\n\n' : '') + chunk;
    }
    blockMarkdown = sanitizeContenedor2SectionMarkdown(blockMarkdown);
    review = reviewContenedor2Section(point, blockMarkdown);
  } catch (e) {
    if (e instanceof GenerationCancelledError) throw e;
    const msg = e instanceof Error ? e.message : String(e);
    console.warn(`[Contenedor 2] Falló el punto ${point.number} (${point.title}): ${msg}`);
    return {
      number: point.number,
      title: point.title,
      phase: point.phase,
      kind: point.kind,
      markdown: '',
      status: 'failed',
      issue: msg,
    };
  }

  if (review.status !== 'ok') {
    console.info(`[Contenedor 2] Autoevaluación del punto ${point.number}: ${review.issue} Reintentando con autorreparación…`);
    try {
      let repairedBlock = '';
      for (let part = 0; part < point.parts.length; part++) {
        const basePrompt = buildContenedor2SectionPrompt(
          ctx.sharedContext,
          point,
          part,
          previousMarkdown + (repairedBlock ? '\n\n' + repairedBlock : ''),
          ctx.identity.displayName,
        );
        const repairPrompt =
          part === 0
            ? basePrompt + buildContenedor2SelfRepairSuffix(point, review.issue || '')
            : basePrompt;
        const repairedRaw = await callAI(repairPrompt, {
          googleSearch: true,
          ...(ctx.aiProvider === 'unadGemini' ? { maxOutputTokens: getUnadGeminiMaxOutputTokens() } : {}),
        });
        const chunk = sanitizeContenedor2SectionMarkdown(stripOuterMarkdownFence(repairedRaw));
        repairedBlock += (repairedBlock ? '\n\n' : '') + chunk;
      }
      repairedBlock = sanitizeContenedor2SectionMarkdown(repairedBlock);
      const repairedReview = reviewContenedor2Section(point, repairedBlock);
      if (repairedReview.status === 'ok' || (repairedReview.status === 'warning' && review.status === 'failed')) {
        blockMarkdown = repairedBlock;
        review = repairedReview;
      }
    } catch (e) {
      if (e instanceof GenerationCancelledError) throw e;
      console.warn(`[Contenedor 2] El reintento del punto ${point.number} tampoco funcionó.`);
    }
  }

  return {
    number: point.number,
    title: point.title,
    phase: point.phase,
    kind: point.kind,
    markdown: blockMarkdown,
    status: review.status,
    issue: review.issue,
  };
}

export async function generateContainer(
  prompt0Data: any,
  institutionalDriveText?: string,
  onProgress?: (p: Contenedor2SectionProgress) => void,
  procedenciaArg?: Procedencia,
): Promise<Contenedor2DocumentResult> {
  beginGenerationFlow();
  if (useStore.getState().demoMode) {
    const md = await simulateGeneration(
      CONTENEDOR2_SECTIONS,
      (meta) =>
        onProgress?.({
          currentSection: meta.number,
          totalSections: CONTENEDOR2_SECTIONS.length,
          sectionTitle: meta.title,
        }),
      DEMO_CONTAINER_MD,
      280,
    );
    return {
      markdown: md,
      sections: CONTENEDOR2_SECTIONS.map((m, idx) => ({
        number: m.number,
        title: m.title,
        phase: m.phase,
        kind: m.kind,
        markdown: '',
        status: idx === 5 ? ('failed' as const) : ('ok' as const),
        issue: idx === 5 ? 'Líneas cortadas por corte de red o cuota' : undefined,
      })),
    };
  }

  const ctx = await prepareContenedor2Context(prompt0Data, institutionalDriveText, procedenciaArg);
  const points = contenedor2Points(ctx.identity.focusText);
  const sections: Contenedor2SectionResult[] = [];
  let accumulated = '';

  for (const point of points) {
    onProgress?.({
      currentSection: point.number,
      totalSections: points.length,
      sectionTitle: point.title,
    });

    const result = await generateContenedor2Section(ctx, point, accumulated);
    sections.push(result);
    if (result.markdown.trim()) {
      accumulated += (accumulated ? '\n\n' : '') + result.markdown.trim();
    }
  }

  const markdown = assembleContenedor2Document(sections, ctx.procedencia);
  return { markdown, sections };
}

/**
 * Rehace un solo punto de entrega del Contenedor 2 conservando los demás (botón «Regenerar» de la Fase 2).
 * Usa como contexto de coherencia los puntos anteriores ya aceptados.
 */
export async function regenerateContenedor2Section(
  sectionIndex: number,
  currentSections: readonly Contenedor2SectionResult[],
  prompt0Data: any,
  institutionalDriveText?: string,
  procedenciaArg?: Procedencia,
): Promise<Contenedor2SectionResult> {
  beginGenerationFlow();
  const identity = cipIdentity(prompt0Data);
  const points = contenedor2Points(identity.focusText);
  const point = points[sectionIndex];
  if (!point) throw new Error(`Punto de entrega inválido: ${sectionIndex + 1}`);

  if (useStore.getState().demoMode) {
    await demoSleep(900);
    return {
      number: point.number,
      title: point.title,
      phase: point.phase,
      kind: point.kind,
      markdown: point.kind === 'app' ? buildContenedor2AppPoint(point, '') : `## ${point.number}. ${point.title}\n\n(Bloque regenerado con éxito en modo demostración).`,
      status: 'ok',
    };
  }

  const ctx = await prepareContenedor2Context(prompt0Data, institutionalDriveText, procedenciaArg);
  const previous = currentSections
    .slice(0, sectionIndex)
    .map((s) => s.markdown.trim())
    .filter(Boolean)
    .join('\n\n');

  return generateContenedor2Section(ctx, point, previous);
}

function formatFichaCompact(prompt0Data: Prompt0Data): string {
  return [
    `Centro de Innovación (nombre tentativo): ${cipDisplayName(prompt0Data) || 'pendiente de confirmación'}`,
    `Zona UNAD: ${prompt0Data.zonaUNAD || '—'}`,
    `Territorio: ${prompt0Data.municipality || '—'}, ${prompt0Data.department || '—'}, ${prompt0Data.country || '—'}`,
  ].join('\n');
}

interface VocationContext {
  inputs: VocationPromptInputs;
  callOptions: { maxOutputTokens?: number };
}

async function prepareVocationContext(): Promise<VocationContext> {
  const { containerData, prompt0Data, aiProvider, institutionalDriveBundle } = useStore.getState();
  if (!containerData.trim()) {
    throw new Error('No hay Contenedor 2. Genera y valida primero el Contenedor 2 en la Fase 2.');
  }

  const driveCombined = institutionalDriveBundle?.text?.trim() || '';
  let vocacionTemplate = await leerNucleoTexto({
    candidates: DRIVE_REFERENCE_PROMPT_VOCACION_CIP_CANDIDATES,
    grupo: 'GENERALES',
    familia: 'vocacion_cip',
    driveCombined,
    driveFetcher: fetchVocacionCipPromptFromDrive,
  });
  if (!vocacionTemplate?.trim()) {
    throw missingDriveReferenceError({
      fileName: DRIVE_REFERENCE_PROMPT_VOCACION_CIP,
      folder: 'GENERALES/',
      alternativeNames: ['prompt_vocacion_cip.txt'],
    });
  }

  const maxVoc = 60_000;
  const vocacionSlice =
    vocacionTemplate.length > maxVoc
      ? `${vocacionTemplate.slice(0, maxVoc)}\n\n[… prompt vocación truncado …]`
      : vocacionTemplate;

  const fodaMatrix = extractContenedor2Section(containerData, 'Matriz FODA territorial');
  if (!fodaMatrix) {
    console.warn(
      '[Vocación] El Contenedor 2 no trae un punto «Matriz FODA territorial» identificable: el paso trabajará con el diagnóstico completo.',
    );
  }

  const maxC = getMaxThemeStepContainerChars(aiProvider);
  const contenedor1Raw = await leerNucleoTexto({
    candidates: DRIVE_REFERENCE_CONTENEDOR_1_CANDIDATES,
    grupo: 'CONTENEDOR_1',
    driveCombined,
    driveFetcher: fetchContenedor1FromDrive,
  });
  const contenedor1 = truncateAtBoundary(
    (contenedor1Raw || '').trim(),
    Math.floor(maxC * 0.4),
    'Contenedor 1 (capacidad institucional)',
  );
  if (!contenedor1.text) {
    console.warn(
      '[Vocación] No se encontró el Contenedor 1 en las fuentes cargadas: la vocación no se podrá verificar contra la capacidad institucional de la UNAD.',
    );
  }

  const { text: cTrim, notice } = truncateContainerForDocument(
    containerData,
    Math.max(maxC - contenedor1.text.length, Math.floor(maxC * 0.5)),
  );
  const ficha = formatFichaCompact(prompt0Data);
  const containerBlock = cTrim + (notice ? `\n\n${notice}` : '');
  const callOptions =
    aiProvider === 'unadGemini'
      ? { maxOutputTokens: getUnadGeminiMaxOutputTokens() }
      : { maxOutputTokens: 8192 };

  const inputs: VocationPromptInputs = {
    containerTrimmed: containerBlock,
    fodaMatrix,
    contenedor1: contenedor1.text + contenedor1.notice,
    fichaBlock: ficha,
    focusHypothesis: cipIdentity(prompt0Data).focusText,
    institutionalVocacionPromptText: vocacionSlice,
  };

  return { inputs, callOptions };
}

async function generateVocationPartItem(
  ctx: VocationContext,
  partIndex: number,
  previousMarkdown: string,
): Promise<VocationPartResult> {
  const meta = VOCATION_PARTS[partIndex];
  if (!meta) throw new Error(`Parte de vocación inválida: ${partIndex + 1}`);

  let blockMarkdown = '';
  let review: { status: VocationPartStatus; issue?: string } = { status: 'ok' };

  try {
    const prompt = buildThemeVocationPartPrompt(ctx.inputs, partIndex, previousMarkdown);
    const raw = await callAI(prompt, ctx.callOptions);
    blockMarkdown = sanitizeVocationMarkdown(stripOuterMarkdownFence(raw).trim());
    review = reviewVocationPart(partIndex, blockMarkdown);
  } catch (e) {
    if (e instanceof GenerationCancelledError) throw e;
    const msg = e instanceof Error ? e.message : String(e);
    console.warn(`[Vocación] Falló la parte ${meta.number} (${meta.title}): ${msg}`);
    return {
      number: meta.number,
      title: meta.title,
      markdown: '',
      status: 'failed',
      issue: msg,
    };
  }

  if (review.status !== 'ok') {
    console.info(`[Vocación] Autoevaluación de ${meta.title}: ${review.issue} Reintentando con autorreparación…`);
    try {
      const repairPrompt =
        buildThemeVocationPartPrompt(ctx.inputs, partIndex, previousMarkdown) +
        buildVocationSelfRepairSuffix(partIndex, review.issue || '');
      const repairedRaw = await callAI(repairPrompt, ctx.callOptions);
      const repairedText = sanitizeVocationMarkdown(stripOuterMarkdownFence(repairedRaw).trim());
      const repairedReview = reviewVocationPart(partIndex, repairedText);
      if (repairedReview.status === 'ok' || (repairedReview.status === 'warning' && review.status === 'failed')) {
        blockMarkdown = repairedText;
        review = repairedReview;
      }
    } catch (e) {
      if (e instanceof GenerationCancelledError) throw e;
      console.warn(`[Vocación] El reintento de ${meta.title} tampoco funcionó.`);
    }
  }

  return {
    number: meta.number,
    title: meta.title,
    markdown: blockMarkdown,
    status: review.status,
    issue: review.issue,
  };
}

/** Paso intermedio 1: vocación territorial + 3 temas Centro de Innovación con justificación breve (IA). */
export async function generateThemeVocationAndOptions(
  onProgress?: (p: GenerationPartProgress) => void,
): Promise<VocationDocumentResult> {
  beginGenerationFlow();
  if (useStore.getState().demoMode) {
    const md = await simulateGeneration(
      VOCATION_PARTS,
      (meta) => onProgress?.({ currentPart: meta.number, totalParts: VOCATION_PARTS.length, partTitle: meta.title }),
      DEMO_THEME_PROPOSAL_MD,
      700,
    );
    return {
      markdown: md,
      sections: VOCATION_PARTS.map((m) => ({
        number: m.number,
        title: m.title,
        markdown: '',
        status: 'ok' as const,
      })),
    };
  }

  const ctx = await prepareVocationContext();
  const sections: VocationPartResult[] = [];
  let accumulated = '';

  for (let i = 0; i < VOCATION_PARTS.length; i++) {
    const meta = VOCATION_PARTS[i];
    onProgress?.({ currentPart: meta.number, totalParts: VOCATION_PARTS.length, partTitle: meta.title });

    const result = await generateVocationPartItem(ctx, i, accumulated);
    sections.push(result);
    if (result.markdown.trim()) {
      accumulated += (accumulated ? '\n\n' : '') + result.markdown.trim();
    }
  }

  const markdown = assembleVocationDocument(sections);
  return { markdown, sections };
}

/** Rehace una parte de la propuesta (Vocación o los 3 Temas) de forma aislada. */
export async function regenerateVocationSection(
  partIndex: number,
  currentSections: readonly VocationPartResult[],
): Promise<VocationPartResult> {
  beginGenerationFlow();
  const meta = VOCATION_PARTS[partIndex];
  if (!meta) throw new Error(`Parte de vocación inválida: ${partIndex + 1}`);

  if (useStore.getState().demoMode) {
    await demoSleep(700);
    return {
      number: meta.number,
      title: meta.title,
      markdown:
        meta.number === 1
          ? '## Vocación territorial\n\n(Vocación regenerada con éxito en modo demostración).'
          : '## Opción de tema 1: Agroindustria Sostenible\n\nJustificación regenerada en modo demostración.\n\n## Opción de tema 2: Turismo Comunitario\n\nJustificación regenerada en modo demostración.\n\n## Opción de tema 3: Energías Renovables\n\nJustificación regenerada en modo demostración.',
      status: 'ok',
    };
  }

  const ctx = await prepareVocationContext();
  const previous = currentSections
    .slice(0, partIndex)
    .map((s) => s.markdown.trim())
    .filter(Boolean)
    .join('\n\n');

  return generateVocationPartItem(ctx, partIndex, previous);
}

interface InnovationTreeContext {
  containerBlock: string;
  ficha: string;
  propSlice: string;
  optionNumber: 1 | 2 | 3;
  templateForModel: string;
  callOptions: { maxOutputTokens?: number };
}

async function prepareInnovationTreeContext(): Promise<InnovationTreeContext> {
  const {
    containerData,
    prompt0Data,
    themeProposalMarkdown,
    selectedLabThemeIndex,
    aiProvider,
    institutionalDriveBundle,
  } = useStore.getState();
  if (!containerData.trim()) {
    throw new Error('No hay Contenedor 2.');
  }
  if (selectedLabThemeIndex === null || selectedLabThemeIndex < 0 || selectedLabThemeIndex > 2) {
    throw new Error('Selecciona una de las tres opciones de tema (Paso 1) antes de crear el árbol de innovación.');
  }
  if (!themeProposalMarkdown.trim()) {
    throw new Error('Genera primero la vocación y las tres opciones de tema.');
  }

  let arbolInstitutionalPrompt = await leerNucleoTexto({
    candidates: DRIVE_REFERENCE_PROMPT_ARBOL_INNOVACION_CANDIDATES,
    grupo: 'GENERALES',
    familia: 'arbol_innovacion',
    driveCombined: institutionalDriveBundle?.text?.trim() || '',
    driveFetcher: fetchInnovationTreePromptFromDrive,
  });
  if (!arbolInstitutionalPrompt?.trim()) {
    throw missingDriveReferenceError({
      fileName: DRIVE_REFERENCE_PROMPT_ARBOL_INNOVACION,
      folder: 'GENERALES/',
      alternativeNames: ['prompt_arbol_innovacion.txt'],
      extraHint:
        'Si redujiste mucho `VITE_MAX_INSTITUTIONAL_CHARS`, el TXT puede haber quedado fuera del texto cargado: sube el límite para que entre en el bloque institucional.',
    });
  }

  const maxTemplateChars = 150_000;
  const templateForModel =
    arbolInstitutionalPrompt.length > maxTemplateChars
      ? `${arbolInstitutionalPrompt.slice(0, maxTemplateChars)}\n\n[… plantilla institucional truncada …]`
      : arbolInstitutionalPrompt;

  const maxC = getMaxThemeStepContainerChars(aiProvider);
  const { text: cTrim, notice } = truncateContainerForDocument(containerData, maxC);
  const ficha = formatFichaCompact(prompt0Data);
  const optionNumber = (selectedLabThemeIndex + 1) as 1 | 2 | 3;
  const propSlice =
    themeProposalMarkdown.length > 100_000
      ? `${themeProposalMarkdown.slice(0, 100_000)}\n\n[… propuesta truncada …]`
      : themeProposalMarkdown;
  const containerBlock = cTrim + (notice ? `\n\n${notice}` : '');
  const callOptions =
    aiProvider === 'unadGemini'
      ? { maxOutputTokens: getUnadGeminiMaxOutputTokens() }
      : { maxOutputTokens: 8192 };

  return {
    containerBlock,
    ficha,
    propSlice,
    optionNumber,
    templateForModel,
    callOptions,
  };
}

async function generateInnovationTreePartItem(
  ctx: InnovationTreeContext,
  partIndex: number,
  previousMarkdown: string,
): Promise<InnovationTreePartResult> {
  const meta = INNOVATION_TREE_PARTS[partIndex];
  if (!meta) throw new Error(`Parte de árbol de innovación inválida: ${partIndex + 1}`);

  let blockMarkdown = '';
  let review: { status: InnovationTreePartStatus; issue?: string } = { status: 'ok' };

  try {
    const prompt = buildInnovationTreePartPrompt(
      ctx.containerBlock,
      ctx.ficha,
      ctx.propSlice,
      ctx.optionNumber,
      ctx.templateForModel,
      partIndex,
      previousMarkdown,
    );
    const raw = await callAI(prompt, ctx.callOptions);
    blockMarkdown = sanitizeInnovationTreeMarkdown(stripOuterMarkdownFence(raw).trim());
    review = reviewInnovationTreePart(partIndex, blockMarkdown);
  } catch (e) {
    if (e instanceof GenerationCancelledError) throw e;
    const msg = e instanceof Error ? e.message : String(e);
    console.warn(`[Árbol] Falló la parte ${meta.number} (${meta.title}): ${msg}`);
    return {
      number: meta.number,
      title: meta.title,
      markdown: '',
      status: 'failed',
      issue: msg,
    };
  }

  if (review.status !== 'ok') {
    console.info(`[Árbol] Autoevaluación de ${meta.title}: ${review.issue} Reintentando con autorreparación…`);
    try {
      const repairPrompt =
        buildInnovationTreePartPrompt(
          ctx.containerBlock,
          ctx.ficha,
          ctx.propSlice,
          ctx.optionNumber,
          ctx.templateForModel,
          partIndex,
          previousMarkdown,
        ) + buildInnovationTreeSelfRepairSuffix(partIndex, review.issue || '');
      const repairedRaw = await callAI(repairPrompt, ctx.callOptions);
      const repairedText = sanitizeInnovationTreeMarkdown(stripOuterMarkdownFence(repairedRaw).trim());
      const repairedReview = reviewInnovationTreePart(partIndex, repairedText);
      if (repairedReview.status === 'ok' || (repairedReview.status === 'warning' && review.status === 'failed')) {
        blockMarkdown = repairedText;
        review = repairedReview;
      }
    } catch (e) {
      if (e instanceof GenerationCancelledError) throw e;
      console.warn(`[Árbol] El reintento de ${meta.title} tampoco funcionó.`);
    }
  }

  return {
    number: meta.number,
    title: meta.title,
    markdown: blockMarkdown,
    status: review.status,
    issue: review.issue,
  };
}

/** Paso intermedio 2: árbol de innovación (10 global → 5 Colombia → 3 territorio). */
export async function generateInnovationTreeForTheme(
  onProgress?: (p: GenerationPartProgress) => void,
): Promise<InnovationTreeDocumentResult> {
  beginGenerationFlow();
  if (useStore.getState().demoMode) {
    const md = await simulateGeneration(
      INNOVATION_TREE_PARTS,
      (meta) => onProgress?.({ currentPart: meta.number, totalParts: INNOVATION_TREE_PARTS.length, partTitle: meta.title }),
      DEMO_INNOVATION_TREE_MD,
      600,
    );
    return {
      markdown: md,
      sections: INNOVATION_TREE_PARTS.map((m) => ({
        number: m.number,
        title: m.title,
        markdown: '',
        status: 'ok' as const,
      })),
    };
  }

  const ctx = await prepareInnovationTreeContext();
  const sections: InnovationTreePartResult[] = [];
  let accumulated = '';

  for (let i = 0; i < INNOVATION_TREE_PARTS.length; i++) {
    const meta = INNOVATION_TREE_PARTS[i];
    onProgress?.({ currentPart: meta.number, totalParts: INNOVATION_TREE_PARTS.length, partTitle: meta.title });

    const result = await generateInnovationTreePartItem(ctx, i, accumulated);
    sections.push(result);
    if (result.markdown.trim()) {
      accumulated += (accumulated ? '\n\n' : '') + result.markdown.trim();
    }
  }

  const markdown = assembleInnovationTreeDocument(sections);
  return { markdown, sections };
}

/** Rehace una de las 5 partes del árbol de innovación conservando las demás. */
export async function regenerateInnovationTreeSection(
  partIndex: number,
  currentSections: readonly InnovationTreePartResult[],
): Promise<InnovationTreePartResult> {
  beginGenerationFlow();
  const meta = INNOVATION_TREE_PARTS[partIndex];
  if (!meta) throw new Error(`Parte de árbol de innovación inválida: ${partIndex + 1}`);

  if (useStore.getState().demoMode) {
    await demoSleep(700);
    return {
      number: meta.number,
      title: meta.title,
      markdown: `## ${meta.title}\n\n(Parte regenerada con éxito en modo demostración).`,
      status: 'ok',
    };
  }

  const ctx = await prepareInnovationTreeContext();
  const previous = currentSections
    .slice(0, partIndex)
    .map((s) => s.markdown.trim())
    .filter(Boolean)
    .join('\n\n');

  return generateInnovationTreePartItem(ctx, partIndex, previous);
}

function getUnadGeminiMaxOutputTokens(): number {
  const raw = import.meta.env.VITE_UNAD_GEMINI_MAX_OUTPUT_TOKENS?.trim();
  if (raw) {
    const n = Number(raw);
    if (Number.isFinite(n) && n >= 256) return Math.min(Math.floor(n), 65_536);
  }
  /** El proxy UNAD suele fallar (500) con valores muy altos o con respuestas enormes en una sola llamada. */
  return 8192;
}

function getDocumentMaxOutputTokens(provider: AIProvider): number {
  switch (provider) {
    case 'openai':
      return 16384;
    case 'anthropic':
      return 8192;
    case 'unadGemini':
      return getUnadGeminiMaxOutputTokens();
    case 'gemini':
      return 65536;
    case 'ollama':
      return 16384;
    default:
      return 8192;
  }
}

/** Apartados con tablas extensas (3 árbol, 6 SIGIIP, 13 anexos) necesitan más salida. */
const FUNDANTE_HEAVY_SECTIONS = new Set([3, 6, 13]);

function getSectionMaxOutputTokens(provider: AIProvider, sectionNumber: number): number {
  const base = getDocumentMaxOutputTokens(provider);
  if (!FUNDANTE_HEAVY_SECTIONS.has(sectionNumber)) return base;
  // Con el proxy UNAD se intenta el doble; si el gateway lo rechaza (500), el cliente degrada solo.
  if (provider === 'unadGemini') return Math.min(base * 2, 16_384);
  return base;
}

/** Contexto común a los 13 apartados; se arma una sola vez y se reutiliza al regenerar. */
type FundanteContext = {
  aiProvider: AIProvider;
  prompt0Data: ReturnType<typeof useStore.getState>['prompt0Data'];
  containerTrimmed: string;
  budgetNotice: string;
  suppTrimmed: string;
  workflowExtras: {
    themeProposalMarkdown: string;
    selectedLabThemeIndex: number;
    innovationTreeMarkdown: string;
  };
  instruccionFundanteSlice: string;
  maxPrevChars: number;
  /** Tabla de proyectos reales del registro SIGIIP; vacío si el registro no se pudo leer. */
  sigiipBlock: string;
};

/**
 * Proyectos del registro SIGIIP (Parte IV del Contenedor 1) pertinentes para este Centro de Innovación.
 *
 * El Contenedor 1 se recorta por el inicio cuando excede el presupuesto de contexto, y
 * el registro está al final: por eso nunca llegaba al modelo y las matrices de
 * experiencias salían genéricas. Si el bundle ya cargado no lo trae completo, se
 * descarga el Contenedor 1 aparte.
 */
async function buildSigiipBlockForFundante(
  bundleText: string,
  prompt0Data: ReturnType<typeof useStore.getState>['prompt0Data'],
  themeText: string,
): Promise<{ block: string; snapshot: SigiipSnapshot | null }> {
  // Con origen=repo el Contenedor 1 completo (incluido el listado de investigación SIGIIP,
  // que es un archivo aparte del grupo) viene del repositorio, sin recorte ni red.
  const origenNucleo = getRepositorioOrigen();
  let contenedor1 =
    origenNucleo === 'repo'
      ? await cargarTextoGrupo('CONTENEDOR_1')
      : bundleText.trim()
        ? extractFirstInstitutionalFileFromBundle(bundleText, DRIVE_REFERENCE_CONTENEDOR_1_CANDIDATES)
        : null;
  let projects = contenedor1 ? parseSigiipRegistry(contenedor1) : [];

  // En modo Drive, menos de 50 bloques significa que el registro (513 proyectos) llegó
  // recortado por el inicio: se descarga el Contenedor 1 completo aparte.
  if (origenNucleo === 'drive' && projects.length < 50) {
    try {
      contenedor1 = await fetchContenedor1FromDrive();
      if (contenedor1) {
        const fromDrive = parseSigiipRegistry(contenedor1);
        if (fromDrive.length > projects.length) projects = fromDrive;
      }
    } catch (e) {
      console.warn('No se pudo descargar el Contenedor 1 para el registro SIGIIP:', e);
    }
  }

  const c1Found = Boolean(contenedor1 && contenedor1.trim());
  console.info(
    `[SIGIIP] Contenedor 1 ${c1Found ? 'localizado' : 'NO localizado'} · listado de investigación: ${projects.length} proyecto(s) detectado(s).`,
  );
  if (!projects.length) {
    console.warn(
      '[SIGIIP] No se detectó el listado de investigación (registro SIGIIP). ' +
        'Verifica que el Contenedor 1 (CONTENEDOR__1.txt) esté conectado en la Fase 2 y que su ' +
        'Parte IV incluya bloques con el formato "PROYECTO 1", "PROYECTO 2", … ' +
        '(o los marcadores <<< INICIO_LISTADO_SIGIIP >>> … <<< FIN_LISTADO_SIGIIP >>>).',
    );
    return { block: '', snapshot: null };
  }

  const selection = selectSigiipProjects(
    projects,
    prompt0Data.zonaUNAD || '',
    `${prompt0Data.labName || ''} ${prompt0Data.municipality || ''} ${prompt0Data.department || ''} ${themeText}`,
    getSigiipProjectLimit(),
  );

  return {
    block: buildSigiipPromptBlock(selection, prompt0Data.zonaUNAD || ''),
    snapshot: {
      total: selection.total,
      zoneTotal: selection.zoneTotal,
      selectedCount: selection.selected.length,
      byZone: selection.byZone,
      byType: selection.byType,
      byEscuela: selection.byEscuela,
    },
  };
}

async function prepareFundanteContext(containerData: string): Promise<FundanteContext> {
  const {
    aiProvider,
    prompt0Data,
    institutionalDriveBundle,
    selectedLabThemeIndex,
    themeProposalMarkdown,
    innovationTreeMarkdown,
  } = useStore.getState();

  if (selectedLabThemeIndex === null || selectedLabThemeIndex < 0 || selectedLabThemeIndex > 2) {
    throw new Error(
      'Completa el Paso 1: genera la vocación y las tres opciones de tema, y selecciona **exactamente una** opción (1, 2 o 3).',
    );
  }
  if (!innovationTreeMarkdown.trim()) {
    throw new Error('Completa el Paso 2: genera el **árbol de innovación** antes del proyecto de innovación.');
  }

  const maxDoc = getMaxDocumentContainerChars(aiProvider);
  const { text: containerTrimmed, notice: docBudgetNotice } = truncateContainerForDocument(
    containerData,
    maxDoc,
  );

  const suppMax = getMaxSupplementaryDocumentChars(aiProvider);
  const suppParts: string[] = [];
  // Las fuentes del territorio van primero: son la evidencia más específica y no están en el texto general.
  const fundanteTerritory = findTerritorySources(
    institutionalDriveBundle?.territories,
    prompt0Data.municipality || '',
  );
  if (fundanteTerritory?.text.trim()) {
    suppParts.push(
      `--- Fuentes específicas del territorio (Drive: C_TERRITORIO_ESPECIFICO/${fundanteTerritory.name}) ---\n${fundanteTerritory.text}`,
    );
  }
  if (institutionalDriveBundle?.text?.trim()) {
    suppParts.push(`--- Texto institucional (Google Drive) ---\n${institutionalDriveBundle.text}`);
  }
  const combinedSupp = suppParts.join('\n\n');
  const { text: suppTrimmed, notice: suppNotice } = truncateContainerForDocument(combinedSupp, suppMax);
  const budgetNotice = [docBudgetNotice, suppNotice].filter(Boolean).join('');

  const { block: sigiipBlock, snapshot: sigiipSnapshot } = await buildSigiipBlockForFundante(
    institutionalDriveBundle?.text || '',
    prompt0Data,
    `${themeProposalMarkdown}\n${innovationTreeMarkdown}`,
  );
  useStore.getState().setSigiipSnapshot(sigiipSnapshot);

  const workflowExtras = {
    themeProposalMarkdown,
    selectedLabThemeIndex,
    innovationTreeMarkdown,
  };

  const driveBundleForInstr = institutionalDriveBundle?.text?.trim() || '';
  let instruccionFundante = await leerNucleoTexto({
    candidates: DRIVE_REFERENCE_INSTRUCCION_FUNDANTE_CANDIDATES,
    grupo: 'GENERALES',
    familia: 'documento_fundante',
    driveCombined: driveBundleForInstr,
    driveFetcher: fetchInstruccionFundanteFromDrive,
  });
  if (!instruccionFundante?.trim()) {
    throw missingDriveReferenceError({
      fileName: DRIVE_REFERENCE_INSTRUCCION_FUNDANTE,
      folder: 'GENERALES/',
      alternativeNames: ['instruccion_documento_fundante_CIP_actualizada.txt'],
    });
  }
  const maxInstr = getMaxInstruccionFundantePromptChars();
  const instruccionFundanteSlice =
    instruccionFundante.length > maxInstr
      ? `${instruccionFundante.slice(0, maxInstr)}\n\n[… instrucción fundante truncada; sube \`VITE_MAX_INSTRUCCION_FUNDANTE_CHARS\` en .env.local si necesitas más contexto …]`
      : instruccionFundante;

  return {
    aiProvider,
    prompt0Data,
    containerTrimmed,
    budgetNotice: budgetNotice || '',
    suppTrimmed,
    workflowExtras,
    instruccionFundanteSlice,
    maxPrevChars: getMaxFundantePreviousContextChars(),
    sigiipBlock,
  };
}

/**
 * Redacta un apartado y lo somete a la autoevaluación local. Si el resultado no pasa,
 * hace **un** reintento indicándole al modelo el defecto concreto (autorreparación).
 * Nunca propaga errores del proveedor salvo la cancelación del usuario: un apartado
 * caído se devuelve marcado como `failed` para que el resto del documento continúe.
 */
async function generateFundanteSection(
  ctx: FundanteContext,
  sectionIndex: number,
  previousMarkdown: string,
): Promise<FundanteSectionResult> {
  const meta = FUNDANTE_SECTIONS[sectionIndex];
  const basePrompt = buildFundanteSectionPrompt(
    sectionIndex,
    ctx.containerTrimmed,
    ctx.budgetNotice,
    ctx.prompt0Data,
    ctx.suppTrimmed.trim() || undefined,
    ctx.workflowExtras,
    previousMarkdown,
    ctx.maxPrevChars,
    ctx.instruccionFundanteSlice,
    ctx.sigiipBlock,
  );
  const options: CallAIOptions = {
    maxOutputTokens: getSectionMaxOutputTokens(ctx.aiProvider, meta.number),
    googleSearch: meta.number === 12 ? true : undefined,
  };

  const attempt = async (prompt: string) => {
    const raw = await callAI(prompt, options);
    return sanitizeFundanteSectionMarkdown(sectionIndex, stripOuterMarkdownFence(raw).trim());
  };

  let markdown = '';
  let review: { status: FundanteSectionStatus; issue?: string };

  try {
    markdown = await attempt(basePrompt);
    review = reviewFundanteSection(sectionIndex, markdown);
  } catch (e) {
    if (e instanceof GenerationCancelledError) throw e;
    const msg = e instanceof Error ? e.message : String(e);
    console.warn(`[Centro de Innovación] Falló el apartado ${meta.number} (${meta.title}): ${msg}`);
    return {
      number: meta.number,
      title: meta.title,
      markdown: '',
      status: 'failed',
      issue: msg,
    };
  }

  if (review.status !== 'ok') {
    console.info(`[Centro de Innovación] Autoevaluación del apartado ${meta.number}: ${review.issue} Reintentando una vez…`);
    try {
      const repaired = await attempt(basePrompt + buildSelfRepairSuffix(sectionIndex, review.issue || ''));
      const repairedReview = reviewFundanteSection(sectionIndex, repaired);
      // Se conserva el mejor de los dos intentos: el reparado solo si mejora.
      if (repairedReview.status === 'ok' || (repairedReview.status === 'warning' && review.status === 'failed')) {
        markdown = repaired;
        review = repairedReview;
      }
    } catch (e) {
      if (e instanceof GenerationCancelledError) throw e;
      console.warn(`[Centro de Innovación] El reintento del apartado ${meta.number} tampoco funcionó.`);
    }
  }

  return {
    number: meta.number,
    title: meta.title,
    markdown,
    status: review.status,
    issue: review.issue,
  };
}

export type FundanteDocumentResult = {
  markdown: string;
  sections: FundanteSectionResult[];
};

/**
 * Redacta los 13 apartados en secuencia. Un apartado que falle **no** interrumpe el
 * documento: queda marcado para que la Fase 3 ofrezca su botón «Regenerar».
 */
export async function generateDocument(
  containerData: string,
  onProgress?: (p: FundanteSectionProgress) => void,
): Promise<FundanteDocumentResult> {
  beginGenerationFlow();
  if (useStore.getState().demoMode) {
    const md = await simulateGeneration(
      FUNDANTE_SECTIONS,
      (meta) =>
        onProgress?.({
          currentSection: meta.number,
          totalSections: FUNDANTE_SECTIONS.length,
          sectionTitle: meta.title,
        }),
      DEMO_DOCUMENT_MD,
      360,
    );
    return {
      markdown: md,
      sections: FUNDANTE_SECTIONS.map((m) => ({
        number: m.number,
        title: m.title,
        markdown: '',
        status: 'ok' as const,
      })),
    };
  }

  const ctx = await prepareFundanteContext(containerData);
  const sections: FundanteSectionResult[] = [];
  let accumulated = '';

  for (let i = 0; i < FUNDANTE_SECTIONS.length; i++) {
    const meta = FUNDANTE_SECTIONS[i];
    onProgress?.({
      currentSection: meta.number,
      totalSections: FUNDANTE_SECTIONS.length,
      sectionTitle: meta.title,
    });

    const result = await generateFundanteSection(ctx, i, accumulated);
    sections.push(result);
    if (result.markdown.trim()) {
      accumulated += (accumulated ? '\n\n' : '') + result.markdown.trim();
    }
  }

  return { markdown: assembleFundanteDocument(sections), sections };
}

/**
 * Rehace un solo apartado conservando los demás (botón «Regenerar» de la Fase 3).
 * Usa como contexto de coherencia los apartados anteriores ya aceptados.
 */
export async function regenerateFundanteSection(
  containerData: string,
  sectionIndex: number,
  currentSections: readonly FundanteSectionResult[],
): Promise<FundanteSectionResult> {
  beginGenerationFlow();
  const meta = FUNDANTE_SECTIONS[sectionIndex];
  if (!meta) throw new Error(`Apartado inválido: ${sectionIndex + 1}`);

  if (useStore.getState().demoMode) {
    await demoSleep(900);
    return { number: meta.number, title: meta.title, markdown: '', status: 'ok' };
  }

  const ctx = await prepareFundanteContext(containerData);
  const previous = currentSections
    .slice(0, sectionIndex)
    .map((s) => s.markdown.trim())
    .filter(Boolean)
    .join('\n\n');

  return generateFundanteSection(ctx, sectionIndex, previous);
}
