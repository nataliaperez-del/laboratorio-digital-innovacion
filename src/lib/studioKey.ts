/**
 * Google AI Studio como respaldo de la IA institucional. Cada persona crea una clave gratis en
 * https://aistudio.google.com/apikey con su cuenta de la universidad y la pega en el panel «IA»; la
 * clave vive solo en esa pestaña. Aquí está la lógica pura (probada en tests/studioKey.test.ts):
 * reconocer la clave, escoger un modelo entre los que la clave realmente puede usar, traducir los
 * errores de Google y decidir cuándo una falla de la IA institucional justifica pasar al respaldo.
 */

export const STUDIO_KEY_URL = 'https://aistudio.google.com/apikey';
export const STUDIO_MODELS_URL = 'https://generativelanguage.googleapis.com/v1beta/models?pageSize=200';

/** Las claves de Google empiezan por «AIza» y miden 39 caracteres. Solo orienta: la prueba real es listar los modelos. */
export function studioKeyShape(raw: string): 'vacia' | 'extrana' | 'ok' {
  const key = raw.trim();
  if (!key) return 'vacia';
  return /^AIza[0-9A-Za-z_-]{35}$/.test(key) ? 'ok' : 'extrana';
}

interface RawModel {
  name?: string;
  supportedGenerationMethods?: string[];
}

/** Modelos de texto que sirven para las herramientas: generan contenido y no son de imagen, voz, embeddings ni vivo. */
export function usableStudioModels(raw: readonly RawModel[]): string[] {
  const skip = /embedding|aqa|imagen|image|tts|audio|live|veo|vision|robotics|computer-use|learnlm|gemma|banana|customtools/i;
  return [
    ...new Set(
      raw
        .filter((m) => m.name && /\/gemini-/.test(m.name) && (m.supportedGenerationMethods ?? []).includes('generateContent') && !skip.test(m.name))
        .map((m) => (m.name as string).replace(/^models\//, '')),
    ),
  ];
}

/** Versión de un modelo: «gemini-3.5-flash» → 3.5; sin número, 0. */
function versionOf(model: string): number {
  const m = /gemini-(\d+(?:\.\d+)?)/.exec(model);
  return m ? Number(m[1]) : 0;
}

/**
 * El modelo más conveniente para el taller: de la familia «flash» (rápida y con cuota gratuita),
 * la versión más nueva y estable. Prefiere los que no son «lite» ni «preview», que a veces fallan.
 * Si no hay ninguno «flash», cualquiera de los usables.
 */
export function pickStudioModel(models: readonly string[]): string | null {
  const score = (m: string) => versionOf(m) * 100 + (/preview|exp/i.test(m) ? 0 : 20) + (/lite/i.test(m) ? 0 : 10) + (/latest/i.test(m) ? 0 : 5);
  const flash = models.filter((m) => /flash/i.test(m));
  const pool = flash.length ? flash : [...models];
  return [...pool].sort((a, b) => score(b) - score(a))[0] ?? null;
}

export type StudioProblem = 'clave-invalida' | 'sin-permiso' | 'cuota' | 'sin-red' | 'otro';

/** Qué le pasó a la clave, en palabras de quien la creó, y qué hacer. */
export function describeStudioProblem(problem: StudioProblem): string {
  switch (problem) {
    case 'clave-invalida':
      return 'Google no reconoce esa clave. Revisa que la copiaste completa (empieza por AIza) y sin espacios, o crea una nueva en AI Studio.';
    case 'sin-permiso':
      return 'Google rechazó la clave por permisos. Si usas la cuenta de la universidad, puede que el administrador del dominio tenga AI Studio desactivado: prueba con otra cuenta o pídeselo a soporte.';
    case 'cuota':
      return 'La clave llegó al límite gratuito por ahora. Espera un minuto y prueba de nuevo, o crea la clave con otra cuenta.';
    case 'sin-red':
      return 'No se pudo llegar a Google. Revisa tu conexión a internet.';
    default:
      return 'Google respondió con un error inesperado. Vuelve a intentarlo en un momento.';
  }
}

/** Traduce la respuesta HTTP de Google al problema de la clave. */
export function studioProblemFromStatus(status: number): StudioProblem {
  if (status === 400) return 'clave-invalida';
  if (status === 401 || status === 403) return /* 401 no suele darse con claves */ status === 401 ? 'clave-invalida' : 'sin-permiso';
  if (status === 429) return 'cuota';
  return 'otro';
}

/**
 * ¿Esta falla de la IA institucional es una caída (red, servidor, credenciales, límite) y no un
 * problema del pedido? Solo en ese caso se pasa al respaldo: un pedido mal hecho fallaría igual allá.
 */
export function isProviderOutage(message: string): boolean {
  if (/400|prompt demasiado grande|Cuerpo de petici[oó]n inv[aá]lido|Modelo no permitido|bloquead|safety|rechaz/i.test(message) && !/50\d|429/.test(message)) return false;
  return /50[0-9]|429|401|403|fetch|network|conexi[oó]n|timeout|tard[oó] demasiado|ECONN|IA_NO_CONFIGURADA|no est[aá] configurada|credencial|UNAVAILABLE|overloaded|high demand|RESOURCE_EXHAUSTED/i.test(message);
}

/** Cuánto dura el respaldo antes de volver a intentar con la IA institucional. */
export const FALLBACK_WINDOW_MS = 5 * 60_000;
