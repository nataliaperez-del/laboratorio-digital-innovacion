/**
 * Módulo de respeto de ZOE: reconoce insultos, groserías, amenazas e ira, y responde con calma,
 * firmeza y los valores unadistas (respeto, ética, integridad), sin devolver agresión ni culpar.
 *
 * Es puro (sin React ni red): funciona igual con o sin IA y se prueba aparte.
 * Orden de prioridad en ZOE: primero el cuidado de la vida (crisis), después este módulo.
 */

export type RespectLevel = 'amenaza' | 'insulto' | 'soez' | 'ira';

export interface RespectVerdict {
  level: RespectLevel;
  /** Palabras que dispararon el aviso (ya normalizadas; sirven para pruebas y registro, no se dicen en voz alta). */
  hits: string[];
  /** Si además de la falta de respeto hay una pregunta o petición que se puede atender al calmarse. */
  hasRequest: boolean;
}

/** Sin tildes, minúsculas, letras cambiadas por números/símbolos revertidas y repeticiones colapsadas. */
export function foldForRespect(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/@/g, 'a')
    .replace(/\$/g, 's')
    .replace(/[a-z0-9]+/g, (w) => (/[a-z]/.test(w) ? w.replace(/0/g, 'o').replace(/1/g, 'i').replace(/3/g, 'e').replace(/4/g, 'a').replace(/5/g, 's') : w))
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/([aeiou])\1+/g, '$1') // «puuuta» → «puta»
    .replace(/([a-z])\1{2,}/g, '$1') // «mieeerdaaa», «puttta»; las dobles reales de consonante (rr, ll) se conservan
    .replace(/\s+/g, ' ')
    .trim();
}

/** Groserías que se cuentan siempre, aunque no apunten a nadie. */
const SOEZ = [
  'mierda',
  'puta',
  'puto',
  'putas',
  'putos',
  'hijueputa',
  'hijueputas',
  'hijoeputa',
  'hdp',
  'ptm',
  'gonorrea',
  'malparido',
  'malparida',
  'verga',
  'joder',
  'jodete',
  'jodase',
  'carajo',
  'cabron',
  'cabrona',
  'pendejo',
  'pendeja',
  'pirobo',
  'piroba',
  'marica',
  'maricon',
  'culicagado',
  'gilipollas',
  'pichurria',
];

/** Insultos de «palabras suaves»: solo cuentan cuando se dirigen a ZOE o a alguien. */
const INSULT_WORDS = [
  'idiota',
  'imbecil',
  'estupido',
  'estupida',
  'tonto',
  'tonta',
  'bruto',
  'bruta',
  'burro',
  'burra',
  'inutil',
  'basura',
  'maldito',
  'maldita',
  'desgraciado',
  'desgraciada',
  'asqueroso',
  'asquerosa',
  'estorbo',
  'cerdo',
  'cerda',
  'perra',
  'zorra',
  'retrasado',
  'retrasada',
  'mediocre',
  'fracasado',
  'fracasada',
];

const toRegex = (words: string[]) => new RegExp(`(?<![a-z0-9])(${words.join('|')})(?![a-z0-9])`, 'g');
const SOEZ_RE = toRegex(SOEZ);
const INSULT_RE = toRegex(INSULT_WORDS);

/** Expresiones de varias palabras. */
const SOEZ_PHRASES = [/hijo\s+de\s+(la\s+)?(gran\s+)?puta/, /la\s+puta\s+madre/, /vete\s+a\s+la\s+mierda/, /chupa(me)?\s+(el|la)\s/, /hijo\s+de\s+tu\s+madre/];

/** Señales de que el insulto va dirigido: «eres un…», «pareces…», «tú…», «perro…», «cállate». */
const DIRECTED =
  /(?<![a-z0-9])(eres|sos|eras|pareces|tu\s+eres|usted\s+es|ustedes\s+son|que\s+(tan\s+)?(idiota|inutil|estupid[oa]|bruto|tonto)\s+eres|perro|callate|cierra\s+la\s+boca|cierrate|larguese|lar\s+gate|vete|te\s+odio|odio\s+(a\s+)?(zoe|esta\s+app|este\s+perro))(?![a-z0-9])/;

/** Amenazas a ZOE o a otras personas. */
const THREAT =
  /(te\s+voy\s+a\s+(matar|golpear|pegar|romper|destruir|borrar|apagar|dar\s+duro|partir)|voy\s+a\s+(matarte|golpearte|romperte|destruirte|acabar\s+contigo)|ojala\s+te\s+(mueras|rompan|borren)|te\s+vas\s+a\s+arrepentir|los\s+voy\s+a\s+(matar|golpear))/;

/** Ira sin insulto: se acompaña, no se reprende. */
const ANGER =
  /(?<![a-z0-9])(estoy\s+(muy\s+|tan\s+|super\s+)?(furios[oa]|enojad[oa]|bravo|brava|rabios[oa]|indignad[oa]|molest[oa]|cabreado|cabreada|iracund[oa])|me\s+da\s+(mucha\s+)?(rabia|ira|piedra|coraje)|me\s+tiene\s+(harto|harta|mamad[oa]|cansad[oa]\s+de)|estoy\s+(harto|harta|mamad[oa])|me\s+desespera|no\s+aguanto\s+mas|me\s+sacan\s+de\s+quicio|me\s+hierve\s+la\s+sangre|que\s+rabia|que\s+ira|que\s+piedra|ya\s+me\s+canse)(?![a-z0-9])/;

/** ¿Hay además una petición real que atender cuando se calme? */
const REQUEST = /\?|(?<![a-z0-9])(que|como|cual|donde|cuando|por\s+que|explica|dime|ayudame|ayuda|muestrame|llevame|necesito|quiero)(?![a-z0-9])/;

const collect = (re: RegExp, folded: string) => [...folded.matchAll(re)].map((m) => m[1]);

/** Clasifica lo dicho; null si es un mensaje respetuoso. */
export function assessRespect(text: string): RespectVerdict | null {
  const t = foldForRespect(text);
  if (!t) return null;
  const hasRequest = REQUEST.test(t);

  if (THREAT.test(t)) return { level: 'amenaza', hits: ['amenaza'], hasRequest };

  const soez = [...collect(SOEZ_RE, t), ...SOEZ_PHRASES.filter((p) => p.test(t)).map((p) => p.source)];
  const soft = collect(INSULT_RE, t);
  const directed = DIRECTED.test(t);

  if ((soez.length && directed) || (soft.length && directed)) return { level: 'insulto', hits: [...soez, ...soft], hasRequest };
  // Una grosería suelta, aunque no apunte a nadie, sigue siendo una falta de respeto a la conversación.
  if (soez.length) return { level: 'soez', hits: soez, hasRequest };
  // «Eres un inútil» sin más: palabra suave + trato directo ya cayó arriba; una palabra suave sola («basura de internet») no se reprende.
  if (ANGER.test(t)) return { level: 'ira', hits: ['ira'], hasRequest };
  return null;
}

// ── Respuestas ──

/** Lo que ZOE recuerda de sí y de la UNAD, sin sermonear: respeto, ética e integridad. */
const VALUES = 'En la UNAD nos cuidamos con respeto, ética e integridad, y ese trato vale para todas las personas, también para mí.';

const CALM_LINES: Record<Exclude<RespectLevel, 'ira'>, string[][]> = {
  // Cada nivel tiene tres pasos: la primera vez, la segunda y la tercera o más.
  soez: [
    [
      'Te entiendo, y se nota que estás alterado. Prefiero que hablemos sin groserías: ' + VALUES + ' Respira, dime qué pasó y lo resolvemos juntos.',
      'Vamos con calma. Esas palabras no ayudan a resolver nada. ' + VALUES + ' Dime qué necesitas y te ayudo.',
    ],
    [
      'Te lo pido con cariño, pero con firmeza: sin groserías, por favor. ' + VALUES + ' Si quieres, tomamos un respiro de un minuto y seguimos.',
      'Otra vez no, por favor. Puedo ayudarte mucho mejor si hablamos con respeto. ' + VALUES,
    ],
    [
      'Voy a pausar la conversación hasta que podamos hablar con respeto. ' + VALUES + ' Respira, toma agua, y cuando quieras volvemos a empezar. Aquí te espero.',
    ],
  ],
  insulto: [
    [
      'No me voy a ofender, pero tampoco voy a seguir si me hablas así. ' + VALUES + ' Cuéntame qué fue lo que te molestó y buscamos cómo arreglarlo.',
      'Detrás de ese enojo seguro hay algo que no salió como esperabas, y eso sí lo puedo ayudar a resolver. Los insultos no. ' + VALUES,
    ],
    [
      'Te escucho, pero no acepto insultos. Ni a mí ni a nadie. ' + VALUES + ' Si cambiamos el tono, con gusto sigo ayudándote.',
      'Mantengamos el respeto, por favor. Lo que dices no me define, pero sí nos aleja de la solución. ' + VALUES,
    ],
    [
      'Hasta aquí llego por ahora: no continúo con insultos. ' + VALUES + ' Cuando estés más tranquilo o tranquila, me llamas y empezamos de nuevo sin rencores.',
    ],
  ],
  amenaza: [
    [
      'Eso que dices me preocupa. No es una forma de tratarnos, ni en este laboratorio ni en la UNAD. ' + VALUES + ' Si estás muy molesto o molesta, respira y cuéntame qué pasó; si lo necesitas, Bienestar Institucional de la UNAD puede acompañarte.',
    ],
    [
      'No voy a seguir con amenazas, ni en broma. ' + VALUES + ' Cuando te sientas más tranquilo o tranquila, hablamos. Y si el enojo es muy grande, busca a Bienestar Institucional: no tienes que cargarlo solo.',
    ],
    [
      'Termino aquí la conversación. Las amenazas no tienen lugar en este espacio. ' + VALUES + ' Cuando estés en calma, aquí estaré.',
    ],
  ],
};

const ANGER_LINES = [
  'Se nota que estás muy molesto o molesta, y tiene sentido: a veces las cosas no salen como uno espera. Respira conmigo: aire por la nariz contando hasta cuatro y lo sueltas despacio contando hasta seis. Cuéntame qué pasó y lo vamos desarmando paso a paso.',
  'Entiendo ese enojo, y no pasa nada por sentirlo. Hacemos una pausa corta: un trago de agua, hombros abajo, respiración lenta. Cuando quieras, me dices qué fue lo que más te molestó y lo resolvemos juntos, sin afán.',
];

/** Lo que se añade si el mensaje traía además una pregunta o petición: se atiende al volver la calma. */
const WHEN_CALM = ' Y cuando estés mejor, repíteme tu pregunta y con gusto te la respondo.';

/** Ayuda memoria de la UNAD para el prompt de la IA, por si el mensaje llegara hasta ella. */
export const RESPECT_PROMPT =
  'Si la persona te insulta, usa groserías o te amenaza, no devuelvas agresión ni ironía: mantén la calma, pon un límite firme y amable, recuerda que en la UNAD se vive el respeto, la ética y la integridad, y ofrécele ayuda cuando se tranquilice. Si hay ira sin insultos, acompáñala y propón respirar. Nunca la juzgues como persona.';

export interface RespectReply {
  text: string;
  verdict: RespectVerdict;
  /** ZOE debe pausar la conversación después de hablar (tercera falta o más, o amenaza reiterada). */
  endConversation: boolean;
  /** ¿Se debe seguir y contestar la pregunta? Solo con ira: se acompaña y luego se atiende lo pedido. */
  answerAfter: boolean;
}

/**
 * La respuesta de ZOE y si debe pausar la charla.
 * `strikes` cuenta las faltas anteriores seguidas (0 la primera vez); `random` solo escoge la variante.
 */
export function respectReply(text: string, strikes: number, random: () => number = Math.random): RespectReply | null {
  const verdict = assessRespect(text);
  if (!verdict) return null;

  if (verdict.level === 'ira') {
    const line = ANGER_LINES[Math.floor(random() * ANGER_LINES.length)];
    // La ira no se castiga: se acompaña y, si había una pregunta, se contesta enseguida.
    return { text: line, verdict, endConversation: false, answerAfter: verdict.hasRequest };
  }

  const steps = CALM_LINES[verdict.level];
  const step = Math.min(strikes, steps.length - 1);
  const options = steps[step];
  const base = options[Math.floor(random() * options.length)];
  const last = step === steps.length - 1 && strikes >= steps.length - 1;
  return {
    text: !last && verdict.hasRequest ? base + WHEN_CALM : base,
    verdict,
    endConversation: last,
    answerAfter: false,
  };
}

/** Después de una disculpa se baja el contador y ZOE lo recibe con calidez. */
const APOLOGY =
  /(?<![a-z0-9])(perdon|disculpa|disculpame|lo siento|mi culpa|me exalte|me altere|perdoname|fue sin querer|no debi)(?![a-z0-9])/;

export function isApology(text: string): boolean {
  return APOLOGY.test(foldForRespect(text));
}

export const APOLOGY_REPLY =
  'Gracias por decírmelo, eso dice mucho de ti. Todo bien, empezamos de cero y sin rencores. ¿En qué te ayudo?';
