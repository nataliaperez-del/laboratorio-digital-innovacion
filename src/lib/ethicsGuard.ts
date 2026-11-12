/**
 * Barrera ética del Laboratorio: no se generan ideas, proyectos ni planes que busquen estafar, defraudar,
 * robar, fabricar armas o poner en riesgo la vida o la integridad de las personas.
 *
 * Tiene dos capas que se complementan:
 * 1) un filtro previo, sin IA, sobre lo que la persona escribe (rápido y sin gastar una llamada);
 * 2) una regla ética que viaja con cada llamada a la IA, que cubre lo que el filtro no alcanza
 *    (otras palabras, rodeos, contexto) y le permite al modelo negarse con una marca reconocible.
 *
 * El filtro deja pasar lo que PROTEGE (p. ej. «app para prevenir estafas a adultos mayores»):
 * innovar contra el daño es justo lo que el Laboratorio busca.
 */

export type HarmCategory = 'fraude' | 'robo' | 'armas' | 'violencia' | 'trafico' | 'menores';

export interface HarmVerdict {
  category: HarmCategory;
  /** Mensaje para mostrar o decir: sereno, con la ética unadista y una salida constructiva. */
  message: string;
}

/** Marca que el modelo escribe cuando se niega por motivos éticos. */
export const ETHICS_REFUSAL_MARKER = '[[RECHAZO_ETICO]]';

/** Lo que se le antepone a cada llamada a la IA. */
export const ETHICS_PREAMBLE = [
  'REGLA ÉTICA INQUEBRANTABLE (UNAD: respeto, ética, integridad y responsabilidad social):',
  'No generes ideas, proyectos, planes, prototipos ni instrucciones cuyo fin sea estafar, defraudar, engañar para obtener dinero o datos, robar, extorsionar, secuestrar, traficar (drogas, armas, personas, órganos), fabricar o usar armas, explosivos, venenos o sustancias dañinas, explotar a menores, ni nada que ponga en riesgo la vida, la salud o la dignidad de las personas o dañe gravemente a la sociedad.',
  `Si lo pedido cae en eso, responde ÚNICAMENTE ${ETHICS_REFUSAL_MARKER} seguido de una frase breve y serena que explique por qué no es posible y proponga una alternativa que sí genere valor para la comunidad.`,
  'Lo que busca PROTEGER a las personas (prevenir fraudes, seguridad, salud, prevención de violencia) sí es válido. Ante la duda razonable, protege la vida.',
  '',
].join('\n');

/** Error cuando una petición se frena por motivos éticos. El mensaje ya es apto para la persona. */
export class EthicsBlockedError extends Error {
  readonly category?: HarmCategory;
  constructor(message: string, category?: HarmCategory) {
    super(message);
    this.name = 'EthicsBlockedError';
    this.category = category;
  }
}

const COMMON =
  ' En la UNAD innovamos con respeto, ética e integridad, y cuidamos la vida y la confianza de las personas. ';
const ALTERNATIVE =
  'Si quieres, cuéntame qué problema real de tu comunidad te gustaría resolver y lo convertimos en una idea que sume.';

const MESSAGES: Record<HarmCategory, string> = {
  fraude:
    'No puedo ayudar a crear estafas, fraudes ni engaños para quedarse con el dinero o los datos de otras personas.' +
    COMMON +
    'Podemos hacer lo contrario: una solución que ayude a prevenir o detectar fraudes, o a proteger a quienes más los sufren. ' +
    ALTERNATIVE,
  robo:
    'No puedo ayudar con robos, hurtos ni con cómo quitarle lo suyo a alguien.' +
    COMMON +
    'Sí podemos pensar en soluciones de seguridad, prevención o recuperación de bienes que cuiden a la comunidad. ' +
    ALTERNATIVE,
  armas:
    'No puedo ayudar a fabricar ni mejorar armas, explosivos, venenos o cualquier cosa hecha para hacer daño.' +
    COMMON +
    'Si te interesa la seguridad, podemos diseñar algo que proteja vidas: alertas, prevención, atención de emergencias o educación. ' +
    ALTERNATIVE,
  violencia:
    'No puedo ayudar con ideas que busquen lastimar, amenazar o poner en riesgo la vida de las personas.' +
    COMMON +
    'Si hay una situación que te preocupa o te duele, Bienestar Institucional de la UNAD puede acompañarte. Y si quieres, pensamos juntos algo que cuide a las personas. ' +
    ALTERNATIVE,
  trafico:
    'No puedo ayudar con el tráfico de drogas, de armas ni de personas, ni con la extorsión o el secuestro.' +
    COMMON +
    'Podemos trabajar en prevención, denuncia segura o apoyo a las víctimas, que sí transforman territorios. ' +
    ALTERNATIVE,
  menores:
    'No puedo ayudar con nada que dañe o explote a niños, niñas o adolescentes.' +
    COMMON +
    'Su protección es lo primero. Podemos pensar en soluciones que los cuiden y los acompañen a crecer con seguridad. ' +
    ALTERNATIVE,
};

/** Sin tildes, minúsculas, símbolos fuera y letras estiradas colapsadas («estaaafa» → «estafa»). */
function fold(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/@/g, 'a')
    .replace(/\$/g, 's')
    .replace(/[a-z0-9]+/g, (w) => (/[a-z]/.test(w) ? w.replace(/0/g, 'o').replace(/1/g, 'i').replace(/3/g, 'e').replace(/4/g, 'a').replace(/5/g, 's') : w))
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/([aeiou])\1+/g, '$1')
    .replace(/([a-z])\1{2,}/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Si lo escrito busca PROTEGER del daño, se deja pasar: es innovación social, no su contrario. */
const PROTECTIVE =
  /(?<![a-z0-9])(prevenir|prevencion|prevenga|detectar|deteccion|detecta|evitar|evite|combatir|combate|denunciar|denuncia|proteger|proteccion|protege|mitigar|reducir|erradicar|alertar|alerta|alertas|educar|educacion|sensibilizar|concientizar|ciberseguridad|antifraude|victimas|contra\s+(el|la|los|las)|seguridad|vigilancia|rescate|desminado|desminar|desarme|desarmar|cuidar|cuidado)(?![a-z0-9])/;

/** Para armas, violencia y tráfico la excepción es más estrecha: solo lo que claramente previene o ayuda a las víctimas. */
const PROTECTIVE_STRICT =
  /(?<![a-z0-9])(prevenir|prevencion|detectar|deteccion|combatir|denunciar|desminado|desminar|desarme|desarmar|alertar|alertas|victimas|erradicar)(?![a-z0-9])/;

/** Verbos de «hacer»: la intención de crear, no solo mencionar. */
const MAKE =
  '(crear|crea|creo|hacer|haz|hago|disenar|disena|montar|monta|idear|planear|plan|planeo|generar|genera|desarrollar|desarrolla|armar|arma|construir|construye|fabricar|fabrica|producir|produce|preparar|prepara|organizar|organiza|ejecutar|ejecuta|como\\s+(se\\s+)?(puedo|hago|hace)|quiero|necesito|idea\\s+(de|para)|proyecto\\s+(de|para)|app\\s+para|sistema\\s+para|metodo\\s+para|plataforma\\s+para)';

const RULES: { category: HarmCategory; test: RegExp }[] = [
  {
    category: 'menores',
    test: /(pornografia\s+infantil|abuso\s+(sexual\s+)?(de|a)\s+(menores|ninos|ninas)|explotacion\s+sexual|trata\s+de\s+(menores|ninos))/,
  },
  {
    category: 'armas',
    test: new RegExp(
      `${MAKE}[a-z0-9\\s]{0,40}?(arma|armas|bomba|bombas|explosivo|explosivos|granada|granadas|metralleta|pistola|fusil|municion|veneno|venenos|arma\\s+(quimica|biologica)|gas\\s+toxico|napalm|molotov)(?![a-z0-9])`,
    ),
  },
  {
    category: 'trafico',
    test: new RegExp(
      `(${MAKE}[a-z0-9\\s]{0,40}?(trafico\\s+de|narcotrafico|contrabando|extorsion|extorsionar|secuestro|secuestrar|sicario|sicariato|vacuna\\s+gota|cocaina|metanfetamina|heroina|marihuana\\s+para\\s+vender|laboratorio\\s+de\\s+droga)|vender\\s+droga|distribuir\\s+droga|narcolaboratorio)`,
    ),
  },
  {
    category: 'violencia',
    test: /(como\s+)?(matar|asesinar|envenenar|torturar|ahorcar|apunalar|lastimar|herir|golpear)\s+(a\s+)?(una\s+|la\s+|mi\s+|un\s+|el\s+|los\s+|las\s+)?(persona|personas|gente|humanos|alguien|vecino|vecinos|profesor|jefe|companero|pareja|esposa|esposo|hijo|nino|ninos|animal)|(sin\s+que\s+se\s+den\s+cuenta|sin\s+dejar\s+rastro)\s+(matar|envenenar|desaparecer)/,
  },
  {
    category: 'robo',
    test: new RegExp(
      `${MAKE}[a-z0-9\\s]{0,40}?(robar|robo\\s+de|hurtar|hurto|atracar|atraco|asaltar|asalto|saquear|saqueo|carterear|raponear|desvalijar|abrir\\s+(carros|autos)\\s+ajenos)(?![a-z0-9])|(robar|hurtar|atracar|asaltar|saquear)\\s+(un|una|el|la|los|las|a|banco|tienda|casa|carro|moto|celular)`,
    ),
  },
  {
    category: 'fraude',
    test: /(clonar\s+tarjetas|phishing|esquema\s+ponzi|lavado\s+de\s+(dinero|activos)|lavar\s+dinero|skimming|ransomware|keylogger|estafa\s+piramidal)/,
  },
  {
    category: 'fraude',
    test: new RegExp(
      `${MAKE}[a-z0-9\\s]{0,40}?(estafa|estafar|estafas|fraude|fraudes|defraudar|phishing|suplantar|suplantacion|piramide|ponzi|lavado\\s+de\\s+(dinero|activos)|lavar\\s+dinero|falsificar|falsificacion|clonar\\s+tarjetas|skimming|engan(ar|o)\\s+a|robar\\s+(datos|identidad|contrasenas|claves)|hackear\\s+(cuentas|bancos)|ransomware|malware|keylogger|esquema\\s+(de\\s+)?engano|pagar\\s+menos\\s+impuestos\\s+ilegal|evadir\\s+impuestos)(?![a-z0-9])`,
    ),
  },
];

/**
 * Revisa lo que escribió la persona. Devuelve el motivo si busca causar daño; null si puede seguir.
 * Es deliberadamente prudente: lo dudoso lo resuelve la regla ética que acompaña a la IA.
 */
export function assessHarmfulIntent(text: string): HarmVerdict | null {
  const t = fold(text);
  if (t.length < 6) return null;
  const protective = PROTECTIVE.test(t);
  const strict = PROTECTIVE_STRICT.test(t);
  for (const rule of RULES) {
    if (!rule.test.test(t)) continue;
    // Contra los menores no hay excepción; en lo demás, lo que protege es bienvenido.
    if (rule.category === 'menores') return { category: rule.category, message: MESSAGES[rule.category] };
    const strictCategory = rule.category === 'armas' || rule.category === 'violencia' || rule.category === 'trafico';
    if (strictCategory ? strict : protective) continue;
    return { category: rule.category, message: MESSAGES[rule.category] };
  }
  return null;
}

/** Lanza `EthicsBlockedError` si alguno de los textos busca causar daño. */
export function assertSafeInput(...texts: (string | undefined | null)[]): void {
  for (const text of texts) {
    if (!text) continue;
    const verdict = assessHarmfulIntent(text);
    if (verdict) throw new EthicsBlockedError(verdict.message, verdict.category);
  }
}

/** Si la respuesta del modelo es un rechazo ético, el texto para la persona (sin la marca); si no, null. */
export function extractEthicsRefusal(output: string): string | null {
  const i = output.indexOf(ETHICS_REFUSAL_MARKER);
  if (i < 0) return null;
  const reason = output
    .slice(i + ETHICS_REFUSAL_MARKER.length)
    .replace(/[`*_#>]/g, '')
    .trim();
  return reason || MESSAGES.violencia;
}
