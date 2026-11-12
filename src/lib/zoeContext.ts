/**
 * Lo que ZOE sabe del Laboratorio y lo que hace sin pasar por la IA.
 * Son funciones puras: el resumen solo incluye datos reales del trabajo en curso, para que
 * ZOE pueda orientar sin inventar resultados (biblia del personaje, «Conocimiento y límites»).
 */
import type { ToolId } from '@/components/layout/Header';
import { MODULE_LABELS } from '@/lib/moduleLabels';

/** Nombre de cada pantalla tal como lo dice ZOE: el título grande del módulo (`moduleLabels.ts`). */
export const TOOL_NAMES: Record<ToolId, string> = {
  ...(Object.fromEntries(Object.entries(MODULE_LABELS).map(([id, label]) => [id, label.title])) as Record<ToolId, string>),
  portal: 'Inicio del Laboratorio',
};

/** Pista breve que ZOE da la primera vez que se visita cada pantalla. */
export const TOOL_HINTS: Record<ToolId, string> = {
  portal: '¡Hola! Aquí estoy contigo. Cuando estés listo, tócame y te oriento, o pídeme el recorrido guiado.',
  radar: 'Estas señales vienen del Observatorio. Elige una y la llevamos a otra herramienta.',
  estudio: 'Aquí se hace el Estudio Territorial: cuéntame el territorio en la Ficha Base y armamos su diagnóstico.',
  ideacion: 'Aquí se hace la Ideación: dame un tema o un archivo y buscamos la vocación y tres caminos posibles.',
  arbol: 'Aquí se construye el Árbol de Innovación: con un tema basta, de las tendencias globales llegamos hasta los frutos.',
  prototipado: 'Aquí se hace el Prototipado: escribe una idea o elige un fruto del árbol y armamos su plan.',
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

/** Resumen en texto del trabajo real de la persona (estudio, ideación, árbol, prototipos) para el contexto de la IA. */
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

/**
 * Movimientos que ZOE hace cuando se los piden: por voz (sin pasar por la IA) o la IA con la
 * acción «animar». `home` y `sleep` terminan la conversación; los demás no la interrumpen.
 */
export const ZOE_MOVES = ['sit', 'stand', 'lie', 'sleep', 'walk', 'come', 'move', 'home', 'shake', 'spin', 'jump', 'wag', 'bow', 'still'] as const;
/** Un movimiento de ZOE (sentarse, sacudirse, dar vueltas, ir a su casita…). */
export type ZoeMove = (typeof ZOE_MOVES)[number];

/** Nombres con que la IA pide un movimiento en la acción «animar». Dormir y la casita no: cortan la charla. */
export const AI_MOVES: Record<string, ZoeMove> = {
  sentarse: 'sit',
  pararse: 'stand',
  echarse: 'lie',
  pasear: 'walk',
  venir: 'come',
  apartarse: 'move',
  sacudirse: 'shake',
  girar: 'spin',
  saltar: 'jump',
  cola: 'wag',
  reverencia: 'bow',
};

/** Órdenes que ZOE cumple sin consultar a la IA. */
export type ZoeCommand = { type: 'navigate'; tool: ToolId } | { type: 'theme'; value: 'dark' | 'light' } | { type: 'tour' } | { type: ZoeMove };

const NAVIGATION_VERB =
  /\b(abre|abrir|abreme|ll[eé]vame|ll[eé]vanos|lleva(?:r)?me|ve a|vete a|vamos a|vamos al|ir a|ir al|m[uú]estrame|mostrar|entra a|entrar a|p[aá]same a|cambia a|quiero ver|ens[eé][nñ]ame)\b/i;

const TOOL_WORDS: Array<[RegExp, ToolId]> = [
  // Los títulos de los módulos primero: «validar conceptos» no debe leerse como otra cosa.
  [/identificar\s+oportunidades/i, 'estudio'],
  [/crear\s+conceptos/i, 'ideacion'],
  [/validar\s+conceptos/i, 'arbol'],
  [/desarrollar\s+soluciones/i, 'prototipado'],
  [/contenedor/i, 'banco'],
  [/\bradar\b|\bse[nñ]ales\b/i, 'radar'],
  [/\bestudio\b|\bdiagn[oó]stico\b/i, 'estudio'],
  [/\bideaci[oó]n\b|\bvocaci[oó]n\b/i, 'ideacion'],
  [/[aá]rbol\b/i, 'arbol'],
  [/\bprototip/i, 'prototipado'],
  [/\binicio\b|\bportada\b/i, 'portal'],
];

/**
 * Mandar a ZOE a su casita, dicho como se diga: «vete a tu casa», «ya puedes irte a tu casita»,
 * «regresa a la casa», «a tu casita, Zoe», «escóndete». Se busca en toda la frase (el nombre o un
 * «ya» pueden ir antes) y vale también como pregunta cortés («¿puedes irte a tu casa?»). «La casa
 * de la cultura» no cuenta: es un lugar del territorio, no la casita de ZOE.
 */
const HOME_ORDER =
  /(?<![a-zñáéíóúü])(ve|vete|v[aá]yase|anda|[aá]ndate|corre|regresa|vu[eé]lve(te)?|m[eé]tete|entra|ir(te|se)?|dormir)\s+(a|para|pa|en|hacia)\s+((tu|la|su)\s+)?cas(it)?a\b(?!\s+de\b)|^((zo[eé]y?|so[eé])[,\s]+)?(ya\s+)?(a\s+)?(tu|la)\s+cas(it)?a\b(?!\s+de\b)|^((zo[eé]y?|so[eé])[,\s]+)?a\s+cas(it)?a\b|\b(esc[oó]ndete|gu[aá]rdate)\b/i;

/** «Muéstrame el laboratorio», «hazme un recorrido», «quiero una demostración guiada»… */
const TOUR_ORDER =
  /\b(recorrido|tour|demostraci[oó]n|demo|visita guiada)\b|\b(mu[eé]strame|mu[eé]strenos|mu[eé]stranos|ens[eé][nñ]ame|pres[eé]ntame|gu[ií]ame|me muestras|nos muestras)\s+(por\s+)?(el|todo el|tu)\s+laboratorio\b/i;

/**
 * Cada movimiento con las formas en que se suele pedir: imperativo («siéntate»), infinitivo tras
 * un «puedes» («sentarte») o subjuntivo tras un «quiero que» («te sientes»). Se prueban en orden:
 * «mueve la cola» va antes que «muévete». El fin de palabra es `(?![\wáéíóúñü])` y no `\b`:
 * en JavaScript `\b` no cuenta las letras con tilde, y «alto ahí» no coincidiría.
 */
const MOVE_ORDERS: Array<[RegExp, ZoeMove]> = [
  [/^(a\s+dormir|dormir|duerme|du[eé]rmete|dormirte|te\s+duermas|a\s+descansar|desc[aá]nsa|descansar|(toma(r)?\s+)?una\s+siesta)(?![\wáéíóúñü])/i, 'sleep'],
  [/^(ac[uú][eé]state|acostarte|te\s+acuestes|[eé]chate|echarte|te\s+eches|t[ií]rate\s+al\s+piso|al\s+piso)(?![\wáéíóúñü])/i, 'lie'],
  [/^(si[eé]ntate|sentado|a\s+sentarse|sentarte|te\s+sientes)(?![\wáéíóúñü])/i, 'sit'],
  [/^(lev[aá]ntate|p[aá]rate|de\s+pie|arriba|levantarte|pararte|te\s+levantes|te\s+pares|ponte\s+de\s+pie|ponerte\s+de\s+pie)(?![\wáéíóúñü])/i, 'stand'],
  [/^(mueve|mover|muevas|menea|menear|batir|bate)\s+(la\s+)?col(a|ita)(?![\wáéíóúñü])|^colita(?![\wáéíóúñü])/i, 'wag'],
  [/^(sac[uú]dete|sacudirte|te\s+sacudas|sac[uú]dase|sacude)(?![\wáéíóúñü])/i, 'shake'],
  [
    /^((da(r)?|des|haz|hacer|hagas)\s+(una\s+|unas\s+|un\s+)?(vueltas?|vueltitas?|giros?|giritos?|maromas?)|gira|girar|gires|gira\s+sobre\s+ti|persigue\s+tu\s+cola|perseguir\s+tu\s+cola|ru[eé]date|rodar)(?![\wáéíóúñü])/i,
    'spin',
  ],
  [/^(salta|saltar|saltes|brinca|brincar|brinques|(da(r)?|des)\s+un\s+(salto|brinco)|un\s+salto)(?![\wáéíóúñü])/i, 'jump'],
  [
    /^((haz|hacer|hagas)\s+una\s+reverencia|reverencia|incl[ií]nate|saluda|saludar|saludes|nos\s+saludes|juega|jugar|juguemos|a\s+jugar)(?![\wáéíóúñü])/i,
    'bow',
  ],
  [
    /^(camina|caminemos|caminar|camines|da(r)?\s+un\s+paseo|des\s+un\s+paseo|pas[eé]a|pasear|pasees|ponte\s+a\s+caminar|vamos\s+de\s+paseo|un\s+paseo|da(r)?\s+una\s+caminata)(?![\wáéíóúñü])/i,
    'walk',
  ],
  [/^(ven|vente|venir|vengas|ac[eé]rcate|acercarte|te\s+acerques|arrimate|arr[ií]mate)(?![\wáéíóúñü])/i, 'come'],
  [
    /^(mu[eé]vete|moverte|te\s+muevas|hazte\s+(a\s+un\s+lado|para\s+all[aá])|c[oó]rrete|qu[ií]tate|quitarte|te\s+quites|ap[aá]rtate|apartarte|te\s+apartes|no\s+me\s+tapes|me\s+est[aá]s\s+tapando)(?![\wáéíóúñü])/i,
    'move',
  ],
  [/^(quieto|qu[eé]date\s+quieto|quedarte\s+quieto|te\s+quedes\s+quieto|detente|det[eé]nte|alto\s+ah[ií]|basta\s+de\s+moverte)(?![\wáéíóúñü])/i, 'still'],
];

/** Lo que se dice antes de la orden y no cambia su sentido: el nombre, la cortesía, el «quiero que». */
const POLITE =
  /^(((zo[eé]y?|so[eé])|por\s+favor|porfa|oye|ey|hey|ya|ahora|a\s+ver|y|bueno|puedes|podr[ií]as|me\s+puedes|quiero\s+que|quisiera\s+que|me\s+gustar[ií]a\s+que|(me\s+)?haces\s+el\s+favor\s+de|hazme\s+el\s+favor\s+de)[,\s]+)+/i;

/** La herramienta que se nombra en la frase, si hay una («por el estudio», «el árbol»). */
export function toolMentioned(text: string): ToolId | null {
  return TOOL_WORDS.find(([re]) => re.test(text))?.[1] ?? null;
}

/**
 * Órdenes que ZOE cumple sin consultar a la IA. Exigen un verbo de acción: antes bastaba
 * con mencionar «tema» o «territorio» en cualquier pregunta para que cambiara de pantalla.
 */
export function parseZoeCommand(text: string): ZoeCommand | null {
  const t = text.trim();
  if (/\b(modo|tema|pantalla)\s+(claro|d[ií]a)\b/i.test(t) && /\b(pon|cambia|activa|usa|modo)\b/i.test(t)) return { type: 'theme', value: 'light' };
  if (/\b(modo|tema|pantalla)\s+(oscuro|noche)\b/i.test(t) && /\b(pon|cambia|activa|usa|modo)\b/i.test(t)) return { type: 'theme', value: 'dark' };
  if (TOUR_ORDER.test(t)) return { type: 'tour' };
  if (HOME_ORDER.test(t)) return { type: 'home' };
  // El reconocedor a veces escribe el nombre como «Zoé», «Zoey» o «Soe»; la cortesía no cambia la orden.
  const order = t.replace(/^[¿¡\s]+/, '').replace(POLITE, '');
  const move = MOVE_ORDERS.find(([re]) => re.test(order));
  if (move) return { type: move[1] };
  if (!NAVIGATION_VERB.test(t) || t.endsWith('?')) return null;
  const tool = toolMentioned(t);
  return tool ? { type: 'navigate', tool } : null;
}

// ── Turno de palabra: ZOE no responde a una idea a medias ──

/** Palabras con las que nadie termina una frase: si la pausa llega después, la persona sigue pensando. */
const DANGLING =
  /\b(y|o|e|u|ni|pero|que|de|del|la|el|los|las|un|una|unos|unas|en|con|para|por|porque|como|cuando|donde|entonces|si|pues|mi|tu|su|este|esta|ese|esa|sobre|a|al|más|muy|también|o sea|es decir|digamos)$/i;

/** ¿La frase dictada parece cortada? Entonces ZOE pregunta antes de contestar. */
export function seemsUnfinished(text: string): boolean {
  const t = text.trim().replace(/[.,;:¿?¡!…\s]+$/, '');
  if (!t) return false;
  return DANGLING.test(t) || /\b(eh+|em+|mm+|este+)$/i.test(t);
}

/** Respuesta corta a «¿ya terminaste?». */
export function isDoneReply(text: string): boolean {
  const t = text.trim().toLowerCase();
  return (
    t.split(/\s+/).length <= 5 &&
    /^(s[ií]|ya|listo|eso es todo|es todo|termin[eé]|ya termin[eé]|nada m[aá]s|correcto|exacto|as[ií] es)(?=$|[\s,.;!?¡¿])/.test(t)
  );
}

/** Respuesta a «¿me confirmas?»: true si es un sí, false si es un no y null si habla de otra cosa. */
export function isConfirmation(text: string): boolean | null {
  const t = text
    .trim()
    .toLowerCase()
    .replace(/^zoe[,\s]+/, '');
  const end = '(?=$|[\\s,.;!?¡¿])';
  if (new RegExp(`^(no|mejor no|cancela|cancelar|d[eé]jalo|todav[ií]a no|nada|ni se te ocurra)${end}`).test(t)) return false;
  if (
    new RegExp(
      `^(s[ií]|dale|hazlo|conf[ií]rmo|claro|de una|ok|okay|adelante|correcto|listo|h[aá]gale|h[aá]galo|por supuesto|presi[oó]nalo|b[oó]rralo|l[ií]mpialo|elim[ií]nalo)${end}`,
    ).test(t)
  )
    return true;
  return null;
}

/** La persona pide tiempo: ZOE espera en vez de contestar. */
export function wantsMoreTime(text: string): boolean {
  return /^(zoe[,\s]+)?(espera|esp[eé]rame|un momento|un segundo|d[eé]jame pensar|d[eé]jame terminar|no he terminado|todav[ií]a no)\b/i.test(text.trim());
}

/** Un turno de la conversación con ZOE. */
export interface ZoeTurn {
  role: 'user' | 'zoe';
  text: string;
}

/**
 * Titubeos con que nunca empieza una frase: «Mmm», «Hmm», «Ehh». Si ZOE necesita pensar,
 * dice «¡Woa, woa!» (documento maestro, «Cómo conversa»).
 */
const HESITATION = /^(?:[¡¿]?\s*(?:m{2,}|h+m+|e+h+m*|e+m+)(?![a-záéíóúñü])[\s,.;:…!?]*)+/i;

/**
 * Restos del formato interno que a veces se cuelan en lo que dice el modelo: «(acciones: false)»,
 * «seguir: false», «"acciones": []», «decir:». Son del algoritmo; nunca se leen ni se muestran.
 */
const PROTOCOL_FIELD = /[(\[{]?\s*["'`]?\b(?:acciones|seguir|hacer)\b["'`]?\s*[:=]\s*(?:false|true|null|none|vac[ií]o|ninguna|\[[^\]]*\]|\{[^}]*\})\s*[)\]}]?[\s,;.]*/gi;
const PROTOCOL_LEAD = /^\s*[{\[]?\s*["'`]?\bdecir\b["'`]?\s*[:=]\s*/i;

/** Quita del texto hablado los campos del protocolo interno. */
export function stripProtocolLeaks(text: string): string {
  return text
    .replace(PROTOCOL_LEAD, '')
    .replace(PROTOCOL_FIELD, ' ')
    .replace(/^\s*["'“”]+(?=\S)|(?<=\S)["'“”]+\s*[}\]]*\s*$/g, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .trim();
}

/** Limpia la respuesta para leerla en voz alta y en la burbuja. */
export function cleanZoeReply(raw: string): string {
  const text = stripProtocolLeaks(raw.trim())
    .replace(/^ZOE:\s*/i, '')
    .replace(/[*_#`]/g, '')
    .replace(/^\s*[-•]\s+/gm, '')
    .trim()
    .replace(HESITATION, '');
  return text.charAt(0).toUpperCase() + text.slice(1);
}
