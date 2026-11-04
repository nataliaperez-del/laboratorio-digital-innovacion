/**
 * ZOE sin IA. Cuando la IA no responde (sin internet, servidor caído o lento), ZOE no se queda
 * muda ni culpa a nadie: contesta con lo que sabe de memoria. Todo sale del documento maestro
 * (`src/content/zoe/documento-maestro.md`): sus preguntas frecuentes, las pantallas, los chistes
 * y las frases. Así, enseñarle algo nuevo a ZOE sin conexión es lo mismo que enseñárselo con IA:
 * editar ese archivo.
 *
 * Además reconoce cómo se siente la persona (estrés, cansancio, frustración, tristeza, miedo) y
 * la acompaña. Las señales de riesgo se atienden siempre aquí, con o sin IA, con un mensaje
 * revisado y las líneas de ayuda verificadas: no se dejan a la improvisación de un modelo.
 *
 * Son funciones puras (probadas en tests/zoeOffline.test.ts).
 */
import type { ToolId } from '@/components/layout/Header';
import { TOOL_HINTS, TOOL_NAMES, type ZoeWorkState } from '@/lib/zoeContext';

/** Una pregunta del banco con su respuesta y sus palabras clave. */
export interface BankEntry {
  question: string;
  answer: string;
  tokens: string[];
}

/** Lo que el banco necesita saber para contestar: el documento, la pantalla y el trabajo real. */
export interface OfflineContext {
  tool: ToolId;
  work?: ZoeWorkState;
  /** Para elegir chistes y frases; en las pruebas se fija para que el resultado sea estable. */
  random?: () => number;
}

// ── Texto ──

/** Sin tildes, en minúsculas y sin signos: «¿Qué es TRL?» → «que es trl». */
export function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9ñ\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Palabras que no distinguen una pregunta de otra. */
const STOPWORDS = new Set(
  (
    'a al algo algun alguna como con cual cuales cuando de del donde el ella en entonces era es esa ese eso esta este esto estos ' +
    'fue ha hay la las le les lo los me mi mis muy no nos o para pero por porque puedo puede pueden que se ser si sin sobre ' +
    'su sus te ti tu tus un una uno unos unas y ya yo zoe oye hola dime dimelo cuentame explicame quiero saber favor porfa ' +
    'mas tambien solo hacer hago hace tengo tiene tienes estoy estas esta eres soy vos usted ustedes'
  ).split(' '),
);

/** Raíz sencilla: sin plural, para que «señales» y «señal» cuenten igual. */
function stem(word: string): string {
  if (word.length > 5 && word.endsWith('es')) return word.slice(0, -2);
  if (word.length > 3 && word.endsWith('s')) return word.slice(0, -1);
  return word;
}

/** Palabras clave de un texto, ya normalizadas. */
export function keywords(text: string): string[] {
  return normalizeText(text)
    .split(' ')
    .filter((w) => w.length > 1 && !STOPWORDS.has(w))
    .map(stem);
}

/** Dos palabras se parecen si son iguales o comparten los seis primeros caracteres (prototipo, prototipado). */
function sameWord(a: string, b: string): boolean {
  return a === b || (a.length >= 6 && b.length >= 6 && a.slice(0, 6) === b.slice(0, 6));
}

const stripMarkdown = (text: string) =>
  text
    .replace(/\*\*/g, '')
    .replace(/[*_`#>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

// ── El banco, leído del documento maestro ──

/** El texto de la sección `## N. Título` cuyo título cumple `title`, sin el título; vacío si no está. */
function sectionBody(markdown: string, title: RegExp): string {
  const section = markdown.split(/\n(?=##\s)/).find((p) => title.test(p.split('\n')[0]));
  return section ? section.slice(section.indexOf('\n') + 1) : '';
}

/**
 * Lee el banco: cada `- **¿Pregunta?** Respuesta` de «Preguntas frecuentes» y cada pantalla del
 * Laboratorio (`### Nombre` dentro de «El Laboratorio, pantalla por pantalla»). Las negritas de
 * otras secciones son reglas de estilo de ZOE, no respuestas para decir.
 */
export function parseBank(markdown: string): BankEntry[] {
  const entries: BankEntry[] = [];
  const faq = /^\s*-\s+\*\*(.+?)\*\*\s*(.+)$/gm;
  for (const m of sectionBody(markdown, /Preguntas frecuentes/i).matchAll(faq)) {
    const question = stripMarkdown(m[1]);
    // Solo las preguntas (o frases que la persona diría, como «No me escuchas.»), no las negritas sueltas.
    if (!/[?.]$/.test(question)) continue;
    entries.push({ question, answer: stripMarkdown(m[2]), tokens: keywords(question) });
  }
  const screens = sectionBody(markdown, /El Laboratorio, pantalla por pantalla/i);
  if (screens) {
    for (const block of `\n${screens}`.split(/\n###\s+/).slice(1)) {
      const [title, ...body] = block.split('\n');
      const answer = stripMarkdown(body.join(' '));
      if (title.trim() && answer) entries.push({ question: title.trim(), answer, tokens: keywords(`${title} que es para que sirve`) });
    }
  }
  return entries;
}

/** Las frases de una sección del documento (`## N. Título`), una por viñeta. */
export function sectionLines(markdown: string, title: RegExp): string[] {
  return sectionBody(markdown, title)
    .split('\n')
    .filter((l) => /^\s*-\s+/.test(l))
    .map((l) => stripMarkdown(l.replace(/^\s*-\s+/, '')).replace(/^«|»$/g, ''));
}

/**
 * La entrada del banco que mejor responde lo dicho, o null si ninguna se parece lo suficiente.
 * Pesa más las palabras raras («TRL», «FODA») que las comunes («laboratorio»).
 */
export function bestEntry(bank: readonly BankEntry[], text: string): BankEntry | null {
  const said = [...new Set(keywords(text))];
  if (!said.length) return null;
  const df = new Map<string, number>();
  for (const e of bank) for (const tok of new Set(e.tokens)) df.set(tok, (df.get(tok) ?? 0) + 1);
  const idf = (tok: string) => Math.log(1 + bank.length / (df.get(tok) ?? 0.5));
  let best: { entry: BankEntry; score: number } | null = null;
  for (const entry of bank) {
    const qTokens = [...new Set(entry.tokens)];
    if (!qTokens.length) continue;
    const sharedQ = qTokens.filter((q) => said.some((s) => sameWord(s, q)));
    if (!sharedQ.length) continue;
    const weight = (list: string[]) => list.reduce((sum, tok) => sum + idf(tok), 0);
    const sharedSaid = said.filter((s) => qTokens.some((q) => sameWord(s, q)));
    // Cuánto de la pregunta del banco aparece en lo dicho, y cuánto de lo dicho explica esa pregunta.
    const score = 0.6 * (weight(sharedQ) / weight(qTokens)) + 0.4 * (sharedSaid.reduce((s, tok) => s + idf(tok), 0) / weight(said));
    if (!best || score > best.score) best = { entry, score };
  }
  return best && best.score >= 0.45 ? best.entry : null;
}

// ── Acompañamiento emocional ──

/**
 * Riesgo para la vida: siempre se responde aquí, con el mensaje revisado y las rutas de ayuda
 * (Línea 106 de MinSalud, 24 horas; 123 para emergencias; Bienestar de la UNAD). Se exige la
 * primera persona: «prevención del suicidio» es un tema de trabajo, no una señal de riesgo.
 */
const CRISIS =
  /\b(me\s+quiero\s+(morir|matar|suicidar)|quiero\s+morir(me)?|no\s+quiero\s+(vivir|seguir\s+viviendo|existir)|suicidarme|matarme|quitarme\s+la\s+vida|hacerme\s+da[nñ]o|me\s+hago\s+da[nñ]o|me\s+corto|acabar\s+con\s+mi\s+vida|acabar\s+con\s+todo|no\s+vale\s+la\s+pena\s+vivir|mejor\s+no\s+existir|pensando\s+en\s+(el\s+)?suicid)/i;

/** Marcadores de que la persona habla de sí misma: «estoy», «me siento», «ando», «tengo»… */
const SELF = String.raw`(estoy|me\s+siento|me\s+tiene[ns]?|ando|siento|me\s+pone|me\s+da|me\s+est[aá]|tengo|me\s+qued[eé]|me\s+he\s+sentido|estoy\s+como|muy|tan|super|s[uú]per|re)`;
// Pocas palabras entre «estoy» y la emoción: «estoy muy, muy cansada» sí; «estoy trabajando en el estrés hídrico» no.
// `(?![\wáéíóúñü])` en vez de `\b`: en JavaScript `\b` no reconoce el final de «súper» ni de «estrés».
const feeling = (words: string) => new RegExp(String.raw`\b${SELF}(?![\wáéíóúñü])[^.?!]{0,14}\b(${words})(?![\wáéíóúñü])`, 'i');

/** La emoción dicha en primera persona o como exclamación («¡qué estrés!»). */
const exclaimed = (exclamation: string, self: RegExp) => new RegExp(String.raw`¡\s*qu[eé]\s+(${exclamation})(?![\wáéíóúñü])|` + self.source, 'i');

/** Una emoción reconocida, con lo que ZOE responde. */
interface Feeling {
  id: string;
  test: RegExp;
  replies: string[];
}

const FEELINGS: Feeling[] = [
  {
    id: 'estres',
    // «¡Qué estrés!» cuenta; «¿qué es la ansiedad tecnológica?» no.
    test: exclaimed(
      String.raw`estr[eé]s|angustia|agobio|ansiedad|presi[oó]n`,
      feeling(
        String.raw`estresad[oa]|estr[eé]s|ansios[oa]|ansiedad|agobiad[oa]|abrumad[oa]|nervios[oa]?|angustiad[oa]|angustia|presionad[oa]|presi[oó]n|colapsad[oa]`,
      ),
    ),
    replies: [
      'Siento que estés con tanta presión; es muy normal sentirse así cuando uno está creando algo. Hagamos una pausa cortica conmigo: inhala despacio contando hasta cuatro, sostén el aire un momento y suéltalo contando hasta seis. Otra vez, con calma. Muy bien. Ahora partimos lo que falta en pasos pequeños, un hueso a la vez. ¿Cuál es la parte que más te preocupa?',
      'Uf, eso pesa, y tiene sentido que te sientas así. No tienes que resolverlo todo hoy. Respira conmigo: aire por la nariz contando hasta cuatro y lo sueltas despacio contando hasta seis. Ya. Ahora dime solo una cosa pequeña que podamos hacer juntos en los próximos cinco minutos.',
    ],
  },
  {
    id: 'frustracion',
    test: new RegExp(
      String.raw`\b(no\s+me\s+sale|no\s+puedo\s+m[aá]s|me\s+rindo|no\s+sirvo|soy\s+(un|una)\s+(fracaso|desastre|in[uú]til)|odio\s+esto|qu[eé]\s+rabia|no\s+entiendo\s+nada|todo\s+me\s+sale\s+mal)\b|` +
        feeling(String.raw`frustrad[oa]|frustraci[oó]n|bravo|brava|molest[oa]|harto|harta|aburrid[oa]\s+de\s+esto`).source,
      'i',
    ),
    replies: [
      'Te entiendo: frustra mucho cuando algo no sale. Pero equivocarse también es avanzar; así aprenden los prototipos y así aprendemos nosotros. No es falta de capacidad, es parte del proceso. ¿Me cuentas qué fue lo que no salió? Lo miramos juntos, sin afán.',
      'Respira, que aquí nadie está calificándote. Lo que sientes es la señal de que te importa hacerlo bien, y eso es valioso. Vamos a mirarlo desde otro ángulo, paso a paso. ¿Qué fue lo último que intentaste?',
    ],
  },
  {
    id: 'cansancio',
    test: exclaimed(
      String.raw`cansancio|sue[nñ]o`,
      feeling(String.raw`cansad[oa]|agotad[oa]|exhaust[oa]|rendid[oa]|sin\s+energ[ií]a|muert[oa]\s+del\s+cansancio|con\s+sue[nñ]o|trasnochad[oa]`),
    ),
    replies: [
      'Se nota que has trabajado duro, y eso vale mucho. Descansar también es parte de innovar: las ideas maduran mientras uno respira. Si quieres, estira el cuerpo, toma agua y date unos minutos; lo que ya terminaste queda guardado en el Banco. Aquí te espero.',
      'Gracias por decírmelo. El cansancio también se escucha. ¿Qué te parece si hoy dejamos solo un paso pequeño y el resto lo seguimos con energía nueva? Yo no me muevo de aquí.',
    ],
  },
  {
    id: 'tristeza',
    test: new RegExp(
      String.raw`\b(me\s+siento\s+sol[oa]|estoy\s+sol[oa]|nadie\s+me\s+(entiende|ayuda|apoya)|tengo\s+ganas\s+de\s+llorar|estoy\s+llorando|lloro)\b|` +
        feeling(String.raw`triste|tristeza|deprimid[oa]|desanimad[oa]|desmotivad[oa]|sin\s+ganas|deca[ií]d[oa]|mal\s+emocionalmente`).source,
      'i',
    ),
    replies: [
      'Gracias por contármelo; no tienes que cargar eso a solas. Está bien sentirse así. Aquí estoy contigo, sin prisa. Si quieres hablar de lo que pasa, te escucho; y si prefieres distraerte un rato, avanzamos juntos en algo pequeño. Tú decides.',
      'Lamento que estés pasando por un momento difícil. Lo que sientes importa. Yo te acompaño, y si esa tristeza se queda muchos días, hablar con alguien de confianza o con Bienestar de la UNAD puede ayudarte mucho. ¿Quieres contarme un poquito más?',
    ],
  },
  {
    id: 'inseguridad',
    test: new RegExp(
      String.raw`\b(no\s+soy\s+capaz|no\s+s[eé]\s+si\s+(puedo|podr[eé]|soy\s+capaz)|no\s+voy\s+a\s+poder|me\s+da\s+miedo|tengo\s+miedo|me\s+da\s+pena|me\s+da\s+verg[uü]enza)\b|` +
        feeling(String.raw`insegur[oa]|asustad[oa]|perdid[oa]|confundid[oa]|bloquead[oa]`).source,
      'i',
    ),
    replies: [
      'Es normal sentir dudas al empezar algo nuevo; las personas más innovadoras también las sienten. No necesitas tenerlo todo claro para empezar: necesitas empezar para tenerlo claro. Yo te acompaño en cada paso. ¿Empezamos por algo sencillo?',
      'Sentirse así es parte de aprender, y no estás en esto sin compañía. Vamos despacio: primero entendemos dónde estás y después damos un solo paso. ¿Qué es lo que más te confunde ahora?',
    ],
  },
  {
    id: 'bloqueo',
    test: /\b(no\s+se\s+me\s+ocurre\s+nada|no\s+tengo\s+(ninguna\s+)?idea|me\s+qued[eé]\s+en\s+blanco|estoy\s+en\s+blanco|no\s+s[eé]\s+(qu[eé]\s+hacer|por\s+d[oó]nde\s+empezar|qu[eé]\s+poner))\b/i,
    replies: [
      'Quedarse en blanco le pasa a todo el mundo, hasta a los perros de luz. Probemos algo: piensa en un problema pequeño que veas en tu comunidad, en tu trabajo o en tu casa, y cuéntamelo en una frase. Desde ahí lo olfateamos juntos.',
      'Tranquilidad, las ideas no se esconden para siempre. Una pista: ¿qué te molesta o te gustaría que funcionara mejor en tu territorio? Esa incomodidad suele ser el comienzo de un gran reto de innovación.',
    ],
  },
  {
    id: 'alegria',
    test: new RegExp(
      String.raw`^(?!.*\?)(.*\b(lo\s+logr[eé]|lo\s+logramos|me\s+sali[oó]\s+(bien|todo)|ya\s+termin[eé]|lo\s+hice)(?![\wáéíóúñü]))|` +
        feeling(String.raw`feliz|content[oa]|emocionad[oa]|orgullos[oa]|alegre`).source,
      'i',
    ),
    replies: [
      '¡Guau, qué alegría! Eso merece una vuelta en círculo. Me encanta verte avanzar. ¿Lo celebramos con el siguiente paso o prefieres disfrutarlo un ratico?',
      '¡Mueve la cola conmigo! Ese logro es tuyo. Cuando quieras seguimos; y si quieres, miramos tus insignias en el Banco.',
    ],
  },
];

const CRISIS_REPLY =
  'Lo que me cuentas es muy importante y me alegra que me lo digas. No estás solo ni sola con esto. Yo soy un perro de luz y no puedo cuidarte como lo necesitas ahora, pero hay personas preparadas para escucharte de verdad. En Colombia puedes llamar gratis a la Línea 106, que atiende las veinticuatro horas, y si sientes que estás en peligro en este momento, llama a la línea de emergencias 1 2 3. Como parte de la UNAD también cuentas con el acompañamiento psicosocial de Bienestar Institucional. Si puedes, busca ahora a alguien de confianza que esté cerca. Aquí me quedo contigo.';

/** Si lo dicho muestra riesgo para la vida, el mensaje de cuidado con las rutas de ayuda; si no, null. */
export function crisisReply(text: string): string | null {
  return CRISIS.test(text) ? CRISIS_REPLY : null;
}

/** La emoción que se reconoce en lo dicho, con su respuesta, o null. */
export function feelingReply(text: string, random: () => number = Math.random): { id: string; reply: string } | null {
  const hit = FEELINGS.find((f) => f.test.test(text));
  if (!hit) return null;
  return { id: hit.id, reply: hit.replies[Math.floor(random() * hit.replies.length)] };
}

// ── Respuestas que dependen del momento ──

/** Las rutas para recorrer el Laboratorio, según con qué cuenta la persona. */
export const ROUTES_TEXT =
  'Hay cuatro caminos, según lo que tengas. Si tienes un territorio, la ruta completa: Estudio Territorial, luego Ideación con ese estudio, el Árbol con el estudio como evidencia, Prototipado desde un fruto, y todo queda en el Banco. Si tienes un tema o un documento, empieza por Ideación y sigue al Árbol y a Prototipado. Si quieres mirar tendencias, empieza por el Radar y lleva una señal al Árbol o a Ideación. Y si ya tienes una idea concreta, ve directo a Prototipado.';

/** El siguiente paso natural según el trabajo real de la persona (nunca inventa resultados). */
export function nextStepAdvice(work?: ZoeWorkState): string {
  if (!work || (!work.studyBlocks && !work.hasProposal && !work.treeTheme && !work.prototypes.length)) {
    return 'Todavía no tienes ejercicios, así que el camino está abierto. Si tienes un territorio, empieza por el Estudio Territorial; si tienes un tema, por Ideación. Y si quieres, te hago el recorrido guiado: solo dime «muéstrame el laboratorio».';
  }
  if (work.prototypes.length) {
    return `¡Ya tienes ${work.prototypes.length === 1 ? 'un plan de prototipo' : `${work.prototypes.length} planes de prototipo`}! Revisa el plan con calma, descarga el informe y pasa por el Banco a ver tus insignias.`;
  }
  if (work.treeTheme) {
    const frutos = work.treeCounts?.frutos ?? 0;
    return `Tu árbol sobre «${work.treeTheme}» ${frutos ? `tiene ${frutos} frutos` : 'ya está listo'}. El siguiente paso es elegir un fruto y llevarlo a Prototipado para armar su plan.`;
  }
  if (work.hasProposal && !work.chosenTheme)
    return 'En Ideación tienes tres temas esperando. Elige el que más te convenza y con él construimos el Árbol de Innovación.';
  if (work.hasProposal)
    return `Con el tema «${work.chosenTheme}» elegido, lo natural es construir el Árbol de Innovación para ver tendencias, oportunidades y frutos.`;
  return `Ya tienes el Estudio Territorial de ${work.municipality}. El siguiente paso natural es Ideación, usando ese estudio como insumo, para declarar la vocación y elegir un tema.`;
}

/** Nombre de la sección del documento que describe cada pantalla. */
const SCREEN_TITLES: Record<ToolId, string> = {
  portal: 'Inicio',
  radar: 'Radar del Observatorio',
  estudio: 'Estudio Territorial',
  ideacion: 'Ideación Estratégica',
  arbol: 'Árbol de Innovación',
  prototipado: 'Prototipado',
  banco: 'Banco Unificado de Innovación',
};

const pick = (list: readonly string[], random: () => number) => list[Math.floor(random() * list.length)] ?? '';

/** Lo que ZOE ofrece cuando no tiene la respuesta: alternativas reales, sin culpas ni alarmas. */
export const OFFLINE_FALLBACK =
  'Esa pregunta me pide la IA y ahora mismo no la alcanzo, pero no te quedas sin compañía. Puedo explicarte cualquier herramienta, contarte qué ruta seguir, llevarte a una pantalla, hacerte el recorrido guiado o moverme como me pidas. ¿Qué prefieres?';

/**
 * Responde sin IA: emociones, saludos, chistes, ánimo, siguiente paso, dónde está, rutas,
 * preguntas frecuentes y, si nada encaja, alternativas concretas. Nunca devuelve vacío.
 */
export function offlineAnswer(text: string, markdown: string, ctx: OfflineContext): string {
  const random = ctx.random ?? Math.random;
  const crisis = crisisReply(text);
  if (crisis) return crisis;
  const feelingHit = feelingReply(text, random);
  if (feelingHit) return feelingHit.reply;

  const t = normalizeText(text);
  if (/^(hola|buenas|buenos dias|buenas tardes|buenas noches|que mas|que tal|hey|saludos)\b/.test(t) && t.split(' ').length <= 5) {
    return '¡Hola! Qué gusto escucharte. Aquí estoy contigo, sin prisa. ¿Todo listo para continuar?';
  }
  if (/\b(como estas|como te va|como vas|como amaneciste|como te sientes)\b/.test(t)) {
    return '¡Muy bien, con las orejas de luz bien paradas! Gracias por preguntar. ¿Y tú cómo vas hoy?';
  }
  if (/\b(gracias|te quiero|eres lindo|eres genial|te adoro)\b/.test(t)) {
    return pick(sectionLines(markdown, /Cariño/i), random) || '¡Con gusto! Para eso tengo estas orejas de luz.';
  }
  if (/\b(chiste|hazme reir|algo gracioso|algo divertido|me haces reir)\b/.test(t)) {
    return pick(sectionLines(markdown, /Chistes/i), random);
  }
  if (/\b(motivame|animame|frase motivadora|frase motivacional|dame animo|necesito animo|una frase)\b/.test(t)) {
    return pick(sectionLines(markdown, /motivacionales/i), random);
  }
  if (/\b(que sigue|siguiente paso|que hago ahora|que me falta|por donde sigo|y ahora que|como sigo|que hago despues)\b/.test(t)) {
    return nextStepAdvice(ctx.work);
  }
  if (/\b(donde estoy|que es esta pantalla|que hago aqui|para que sirve esto|que es esto|en que pantalla)\b/.test(t)) {
    const bank = parseBank(markdown);
    const screen = bank.find((e) => e.question === SCREEN_TITLES[ctx.tool]);
    return `Estás en ${TOOL_NAMES[ctx.tool]}. ${screen ? screen.answer : ''} ${TOOL_HINTS[ctx.tool]}`.replace(/\s+/g, ' ').trim();
  }
  if (/\b(que ruta|cual ruta|que camino|por donde empiezo|como empiezo|por donde comienzo|que orden)\b/.test(t)) {
    return `${ROUTES_TEXT} ¿Con cuál te quedas?`;
  }
  const entry = bestEntry(parseBank(markdown), text);
  if (entry) return entry.answer;
  return OFFLINE_FALLBACK;
}
