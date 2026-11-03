/**
 * Lo que ZOE sabe del Laboratorio y lo que hace sin pasar por la IA.
 * Son funciones puras: el resumen solo incluye datos reales del trabajo en curso, para que
 * ZOE pueda orientar sin inventar resultados (biblia del personaje, «Conocimiento y límites»).
 */
import type { ToolId } from '@/components/layout/Header';

export const TOOL_NAMES: Record<ToolId, string> = {
  portal: 'Inicio del Laboratorio',
  radar: 'Radar del Observatorio',
  estudio: 'Estudio Territorial',
  ideacion: 'Ideación',
  arbol: 'Árbol de Innovación',
  prototipado: 'Prototipado',
  banco: 'Banco Unificado de Innovación',
};

export const TOOL_HINTS: Record<ToolId, string> = {
  portal: '¡Hola, hola! ¿Qué invento tenemos entre manos hoy? Tócame si quieres que te oriente.',
  radar: 'Estas señales vienen del Observatorio. Elige una y la llevamos a otra herramienta.',
  estudio: 'Cuéntame el territorio en la Ficha Base y armamos su diagnóstico.',
  ideacion: 'Dame un tema o un archivo y buscamos la vocación y tres caminos posibles.',
  arbol: 'Con un tema basta: de las tendencias globales llegamos hasta los frutos.',
  prototipado: 'Escribe una idea o elige un fruto del árbol y armamos su plan.',
  banco: 'Aquí se guardan tus ejercicios completos, tus insignias y tus certificados.',
};

/** Estado del trabajo en curso, solo con lo que ZOE necesita. */
export interface ZoeWorkState {
  municipality?: string;
  department?: string;
  studyBlocks: number;
  studyIssues: number;
  ideationSource?: string;
  hasProposal: boolean;
  chosenTheme?: string | null;
  treeTheme?: string;
  treeCounts?: { frutos: number; territorial: number };
  prototypes: string[];
}

export function describeWork(work: ZoeWorkState): string {
  const lines = [
    work.studyBlocks
      ? `Estudio Territorial de ${work.municipality}, ${work.department}: ${work.studyBlocks} bloques, ${work.studyIssues} por revisar.`
      : work.municipality
        ? `Ficha Base lista para ${work.municipality}, sin estudio generado.`
        : 'Sin Estudio Territorial.',
    work.hasProposal
      ? `Ideación sobre «${work.ideationSource}»: ${work.chosenTheme ? `tema elegido «${work.chosenTheme}»` : 'tres temas sin decidir'}.`
      : 'Sin ideación.',
    work.treeTheme
      ? `Árbol de Innovación sobre «${work.treeTheme}»: ${work.treeCounts?.territorial ?? 0} tendencias territoriales y ${work.treeCounts?.frutos ?? 0} frutos.`
      : 'Sin árbol.',
    work.prototypes.length ? `Planes de prototipado: ${work.prototypes.join('; ')}.` : 'Sin planes de prototipado.',
  ];
  return lines.join('\n');
}

export type ZoeCommand =
  | { type: 'navigate'; tool: ToolId }
  | { type: 'theme'; value: 'dark' | 'light' }
  | { type: 'sleep' }
  | { type: 'sit' }
  | { type: 'stand' }
  | { type: 'walk' };

const NAVIGATION_VERB = /\b(abre|abrir|abreme|ll[eé]vame|ll[eé]vanos|lleva(?:r)?me|ve a|vete a|vamos a|vamos al|ir a|ir al|m[uú]estrame|mostrar|entra a|entrar a|p[aá]same a|cambia a|quiero ver|ens[eé][nñ]ame)\b/i;

const TOOL_WORDS: Array<[RegExp, ToolId]> = [
  [/\bradar\b|\bse[nñ]ales\b/i, 'radar'],
  [/\bestudio\b|\bdiagn[oó]stico\b/i, 'estudio'],
  [/\bideaci[oó]n\b|\bvocaci[oó]n\b/i, 'ideacion'],
  [/[aá]rbol\b/i, 'arbol'],
  [/\bprototip/i, 'prototipado'],
  [/\binicio\b|\bportada\b/i, 'portal'],
];

/**
 * Órdenes que ZOE cumple sin consultar a la IA. Exigen un verbo de acción: antes bastaba
 * con mencionar «tema» o «territorio» en cualquier pregunta para que cambiara de pantalla.
 */
export function parseZoeCommand(text: string): ZoeCommand | null {
  const t = text.trim();
  if (/\b(modo|tema|pantalla)\s+(claro|d[ií]a)\b/i.test(t) && /\b(pon|cambia|activa|usa|modo)\b/i.test(t)) return { type: 'theme', value: 'light' };
  if (/\b(modo|tema|pantalla)\s+(oscuro|noche)\b/i.test(t) && /\b(pon|cambia|activa|usa|modo)\b/i.test(t)) return { type: 'theme', value: 'dark' };
  const order = t.replace(/^(zoe[,\s]+)?(por favor[,\s]+)?/i, '');
  if (/^(a\s+dormir|duerme|du[eé]rmete|desc[aá]nsa|ac[uú][eé]state|[eé]chate|toma una siesta)\b/i.test(order)) return { type: 'sleep' };
  if (/^(si[eé]ntate|sentado|a\s+sentarse)\b/i.test(order)) return { type: 'sit' };
  if (/^(lev[aá]ntate|p[aá]rate|de\s+pie|arriba)\b/i.test(order)) return { type: 'stand' };
  if (/^(camina|caminemos|da\s+un\s+paseo|pas[eé]a|ponte\s+a\s+caminar)\b/i.test(order)) return { type: 'walk' };
  if (!NAVIGATION_VERB.test(t) || t.endsWith('?')) return null;
  const hit = TOOL_WORDS.find(([re]) => re.test(t));
  return hit ? { type: 'navigate', tool: hit[1] } : null;
}

// ── Turno de palabra: ZOE no responde a una idea a medias ──

/** Palabras con las que nadie termina una frase: si la pausa llega después, la persona sigue pensando. */
const DANGLING = /\b(y|o|e|u|ni|pero|que|de|del|la|el|los|las|un|una|unos|unas|en|con|para|por|porque|como|cuando|donde|entonces|si|pues|mi|tu|su|este|esta|ese|esa|sobre|a|al|más|muy|también|o sea|es decir|digamos)$/i;

/** ¿La frase dictada parece cortada? Entonces ZOE pregunta antes de contestar. */
export function seemsUnfinished(text: string): boolean {
  const t = text.trim().replace(/[.,;:¿?¡!…\s]+$/, '');
  if (!t) return false;
  return DANGLING.test(t) || /\b(eh+|em+|mm+|este+)$/i.test(t);
}

/** Respuesta corta a «¿ya terminaste?». */
export function isDoneReply(text: string): boolean {
  const t = text.trim().toLowerCase();
  return t.split(/\s+/).length <= 5 && /^(s[ií]|ya|listo|eso es todo|es todo|termin[eé]|ya termin[eé]|nada m[aá]s|correcto|exacto|as[ií] es)(?=$|[\s,.;!?¡¿])/.test(t);
}

/** La persona pide tiempo: ZOE espera en vez de contestar. */
export function wantsMoreTime(text: string): boolean {
  return /^(zoe[,\s]+)?(espera|esp[eé]rame|un momento|un segundo|d[eé]jame pensar|d[eé]jame terminar|no he terminado|todav[ií]a no)\b/i.test(text.trim());
}

export interface ZoeTurn {
  role: 'user' | 'zoe';
  text: string;
}

/** Limpia la respuesta para leerla en voz alta y en la burbuja. */
export function cleanZoeReply(raw: string): string {
  return raw
    .trim()
    .replace(/^ZOE:\s*/i, '')
    .replace(/[*_#`]/g, '')
    .replace(/^\s*[-•]\s+/gm, '')
    .trim();
}
