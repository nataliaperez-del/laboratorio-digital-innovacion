/**
 * Recorrido guiado: ZOE muestra el Laboratorio herramienta por herramienta y en cada una hace un
 * ejercicio completo, de verdad, con la IA: explica para qué sirve y qué tan flexible es su punto de
 * partida, limpia la herramienta si tiene trabajo (lo terminado ya está en el Contenedor de resultados), llena los
 * datos, genera, narra el proceso mientras espera (moviéndose y haciendo gestos) y explica el
 * resultado real que quedó en pantalla, con sus ventajas. Entre herramienta y herramienta pregunta
 * si seguir: el ritmo lo pone la persona.
 *
 * Es un solo ejercicio de punta a punta, para que se vea cómo cada herramienta alimenta a la
 * siguiente: residuos de cosecha en Sogamoso, Boyacá → su Estudio Territorial → la Ideación con ese
 * estudio → el Árbol del tema elegido → el plan de prototipo de un fruto → el Contenedor de resultados.
 *
 * Los guiones solo usan el `TourContext` que les da `ZoeFreePresence`: así se prueban con un contexto
 * falso (tests/zoeOffline.test.ts) y nunca dicen un resultado que no esté en pantalla.
 */
import type { ToolId } from '@/components/layout/Header';
import { isConfirmation } from '@/lib/zoeContext';
import { ROUTES_TEXT } from '@/lib/zoeOffline';

/** Algo de la pantalla: un selector CSS, el texto visible o ambos. */
export interface TourTarget {
  selector?: string;
  text?: RegExp;
}

/** Lo que ZOE hace con el cuerpo mientras habla. */
export type TourGesture = 'wag' | 'bow' | 'spin' | 'jump' | 'shake' | 'sit' | 'stand' | 'stroll' | 'come';

/** Una frase de la narración, con su gesto o el elemento que señala mientras la dice. */
export interface TourBeat {
  say: string;
  gesture?: TourGesture;
  show?: TourTarget;
}

/** Cómo terminó una generación: lista, con error, demorada (sigue sola) o sin IA disponible. */
export type GenerationOutcome = 'ok' | 'error' | 'timeout' | 'offline';

/** El estado real del trabajo, para narrar el resultado sin inventar nada. */
export interface TourSnapshot {
  study: { blocks: number; issues: number; municipality?: string };
  ideation: { has: boolean; vocation?: string; themes: string[]; chosen?: string; chosenBody?: string };
  tree: { has: boolean; tema?: string; global: number; nacional: number; territorial: number; hojas: number; frutos: string[] };
  prototype: {
    has: boolean;
    name?: string;
    tagline?: string;
    hypothesis?: string;
    trl?: string;
    weeks?: number;
    phases: number;
    metrics: string[];
  };
  bank: { studies: number; ideations: number; trees: number; prototypes: number };
}

/** Lo que un guion puede hacer: hablar, señalar, escribir, presionar, generar y leer el resultado. */
export interface TourContext {
  alive(): boolean;
  wait(ms: number): Promise<void>;
  say(text: string, gesture?: TourGesture): Promise<void>;
  /** Camina hasta el elemento y lo ilumina mientras habla; devuelve si lo encontró. */
  show(target: TourTarget, text: string, gesture?: TourGesture): Promise<boolean>;
  /** Escribe o elige, reemplazando lo que haya. */
  set(target: TourTarget, value: string): Promise<boolean>;
  check(target: TourTarget): Promise<boolean>;
  press(target: TourTarget): Promise<boolean>;
  exists(target: TourTarget): boolean;
  /** La etiqueta accesible o el texto visible de un elemento. */
  label(target: TourTarget): string;
  /** Presiona el botón de generar y acompaña la espera narrando hasta que `done()` se cumpla. */
  generate(button: TourTarget, done: () => boolean, narration: readonly TourBeat[], timeoutMs: number): Promise<GenerationOutcome>;
  snapshot(): TourSnapshot;
}

/** Una parada del recorrido. `recap` repite la explicación sin volver a generar («repite», «atrás»). */
export interface TourStep {
  tool: ToolId;
  /** Cómo la nombra ZOE al preguntar si siguen («¿Seguimos con el Árbol de Innovación?»). */
  title: string;
  run(ctx: TourContext): Promise<void>;
  recap(ctx: TourContext): Promise<void>;
}

// ── El ejemplo ──

/** El caso que recorre todas las herramientas. Es de práctica: no es un dato real del territorio. */
export const TOUR_EXAMPLE = {
  project: 'Aprovechamiento de residuos de cosecha en Sogamoso',
  zone: 'Zona Centro Boyacá (ZCB)',
  department: 'Boyacá',
  municipality: 'Sogamoso',
  theme: 'Aprovechamiento de residuos de cosecha de papa y cebolla para producir abono orgánico en pequeñas fincas de Sogamoso',
  treeTheme: 'Economía circular en el agro boyacense',
  treeExplanation: 'Convertir residuos de cosecha en abonos y bioinsumos que generen ingresos para fincas pequeñas.',
  prototype: 'Compostera de bajo costo con sensor de humedad para convertir residuos de cosecha en abono en fincas de Sogamoso',
} as const;

const CLEAR: TourTarget = { selector: 'button', text: /^Limpiar$/ };
// Los botones de generar se buscan por su texto exacto: «Regenerar» o «Generar de nuevo» piden confirmación con un diálogo que detendría el recorrido.
const MIN = 60_000;

// ── Textos que se arman con el resultado real ──

/** Quita el formato Markdown y deja la primera oración, recortada para decirla en voz alta. */
export function firstSentence(markdown: string, max = 220): string {
  const text = markdown
    .split('\n')
    .filter((l) => l.trim() && !/^\s*(#|>|\||---)/.test(l))
    // Las viñetas y numeraciones no se dicen en voz alta.
    .map((l) => l.replace(/^\s*([-*+•]|\d+[.)])\s+/, ''))
    .join(' ')
    .replace(/\*\*|__|[*_`]/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
  const sentence = text.match(/^.+?[.!?](?=\s|$)/)?.[0] ?? text;
  if (sentence.length <= max) return sentence;
  const cut = sentence.slice(0, max);
  return `${cut.slice(0, cut.lastIndexOf(' ') > 40 ? cut.lastIndexOf(' ') : max)}…`;
}

/** «Bloque 3 de 12: Pilares de competitividad» → «el bloque 3 de 12, Pilares de competitividad». */
export function describeProgress(statusText: string): string | null {
  // El panel de avance sigue con el botón «Detener» y una nota («La IA redacta cada parte…»): no se leen.
  const m = statusText.match(/\b(Bloque|Parte|Paso)\s+(\d+)\s+de\s+(\d+)\s*:\s*(.+?)(?=\s*Detener|\n|$)/i);
  if (!m) return null;
  return `${m[1].toLowerCase() === 'parte' ? 'la parte' : `el ${m[1].toLowerCase()}`} ${m[2]} de ${m[3]}, ${m[4].trim()}`;
}

/**
 * La etiqueta de un punto del Radar dicha como frase: «Bioinsumos. Área Agro, impacto 80%,
 * adopción 40%, prioridad alta» → «Se llama «Bioinsumos»: área Agro, impacto territorial del 80 por ciento…».
 */
export function describeSignal(label: string): string {
  const m = label.match(/^(.+?)\.\s*Área\s+(.+?),\s*impacto\s+(\d+)%,\s*adopción\s+(\d+)%,\s*prioridad\s+(.+)$/i);
  if (!m) return label ? `Se llama «${label.replace(/\.$/, '')}».` : '';
  return `Se llama «${m[1]}»: área ${m[2]}, impacto territorial del ${m[3]} por ciento, adopción del ${m[4]} por ciento y prioridad ${m[5].replace(/\.$/, '')}.`;
}

/** Une nombres como se dicen: «A», «A y B», «A, B y C». */
export function joinNames(names: readonly string[]): string {
  const q = names.map((n) => `«${n}»`);
  return q.length <= 1 ? (q[0] ?? '') : `${q.slice(0, -1).join(', ')} y ${q[q.length - 1]}`;
}

/** Lo que ZOE dice cuando una generación no terminó: sin culpas ni alarmas, con una salida. */
function notGenerated(outcome: GenerationOutcome, what: string): string {
  if (outcome === 'offline')
    return `La IA se fue a dar un paseíto, así que esta vez no genero ${what}. No pasa nada: todo queda listo y, cuando vuelva la conexión, basta con presionar el botón.`;
  if (outcome === 'timeout')
    return `La IA se está tomando su tiempo con ${what}. Lo dejo trabajando: cuando termine, el resultado queda guardado solito en el Contenedor de resultados. Sigamos.`;
  return `Esta vez la IA no alcanzó a terminar ${what}, y no pasa nada: el botón queda listo para intentarlo de nuevo cuando quieras. Sigamos con lo demás.`;
}

// ── Narración mientras la IA trabaja ──

const STUDY_WAIT: TourBeat[] = [
  {
    say: 'Mientras la IA trabaja, te cuento qué está pasando. El estudio se arma bloque por bloque, y cada bloque se revisa solo antes de seguir: si algo sale incompleto, se repara automáticamente.',
    show: { selector: 'main [role="status"]' },
  },
  { say: 'Primero caracteriza cómo produce el territorio: sus sectores, sus cadenas de valor y lo que lo hace distinto.', gesture: 'stroll' },
  {
    say: 'Después lee la competitividad en cinco pilares, y a cada afirmación le pone su nivel de evidencia. Así sabes qué es dato firme y qué es hipótesis por verificar.',
    gesture: 'wag',
  },
  { say: 'Luego cruza fortalezas, oportunidades, debilidades y amenazas en una matriz FODA, que es la base para decidir estrategias.', gesture: 'stroll' },
  { say: 'Y al final señala alertas: vacíos de información o riesgos que conviene atender antes de invertir tiempo o recursos.', gesture: 'shake' },
  {
    say: 'Piensa en lo que esto significa: un diagnóstico así suele tomar mucho tiempo de consulta, y aquí tienes una base sólida y ordenada en minutos, lista para validar con la comunidad.',
    gesture: 'bow',
  },
  {
    say: 'Y es flexible: si mañana tienes un plan de desarrollo, un estudio local o datos de la cámara de comercio, los conectas como fuentes propias y el estudio los usa como evidencia prioritaria.',
    gesture: 'stroll',
  },
];

const IDEATION_WAIT: TourBeat[] = [
  {
    say: 'La ideación sigue el mismo proceso de la vocación territorial: identifica dinámicas, cruza brechas con oportunidades y deja la decisión al equipo.',
    show: { selector: 'main [role="status"]' },
  },
  { say: 'Primero declara la vocación, el para qué: a quién sirve, qué transforma y por qué tiene sentido en este territorio.', gesture: 'wag' },
  {
    say: 'Después propone tres caminos distintos. Tres y no uno, para que el equipo compare con criterio y no se case con la primera idea.',
    gesture: 'stroll',
  },
  {
    say: 'Como le dimos el estudio, trabaja con lo que consta en él y arrastra sus alertas. Si partes de un tema suelto, complementa con fuentes públicas citadas y marca lo que hay que verificar.',
    gesture: 'shake',
  },
  { say: 'Y cada parte se revisa sola antes de seguir, igual que en el estudio.', gesture: 'stroll' },
];

const TREE_WAIT: TourBeat[] = [
  { say: 'El árbol empieza mirando el mundo: diez tendencias globales relacionadas con el tema.', show: { selector: 'main [role="status"]' } },
  {
    say: 'Después aterriza: cinco que ya se ven en Colombia y tres que tocan el territorio. Es un embudo que convierte lo global en local.',
    gesture: 'stroll',
  },
  { say: 'De esas tendencias nacen las hojas, que son oportunidades, y los frutos: proyectos, servicios o prototipos que se pueden cosechar.', gesture: 'wag' },
  {
    say: 'La raíz son las brechas que hay que cerrar y el suelo, las fuentes. Cada elemento lleva su evidencia: N1 viene del Observatorio, N2 tiene fuente citada y N3 es una hipótesis por verificar.',
    gesture: 'stroll',
  },
  { say: 'Además consulta las señales del Radar: si alguna se relaciona con el tema, enriquece el árbol con datos del Observatorio.', gesture: 'shake' },
  { say: 'Y al final convierte el documento en un árbol interactivo, que se explora tocando las ramas.', gesture: 'bow' },
];

const PROTOTYPE_WAIT: TourBeat[] = [
  {
    say: 'El plan arranca por la hipótesis: si hacemos esto, para estas personas, pasará esto, y lo sabremos midiendo aquello.',
    show: { selector: 'main [role="status"]' },
  },
  { say: 'Luego diseña la solución en tres capas: lo físico, lo digital y lo metodológico.', gesture: 'stroll' },
  { say: 'Después la parte en fases con entregables, define las métricas para validarla y anticipa los riesgos con su mitigación.', gesture: 'wag' },
  {
    say: 'Y ubica la madurez tecnológica con la escala TRL, de uno a nueve, para saber en qué punto está la idea y qué falta para el siguiente nivel.',
    gesture: 'stroll',
  },
];

// ── Las paradas ──

const portal: TourStep = {
  tool: 'portal',
  title: 'la bienvenida',
  async run(ctx) {
    await ctx.say(
      '¡Te doy la bienvenida al recorrido! Este es el Laboratorio de Innovación en Línea, un módulo del Observatorio InnovaHub360 de la UNAD. Aquí cualquier persona puede pasar de una inquietud a un plan de prototipo, paso a paso, con ayuda de inteligencia artificial.',
      'bow',
    );
    await ctx.show(
      { selector: 'main button', text: /Estudio Territorial|Radar|Ideaci[oó]n/ },
      'Son cinco herramientas y un banco donde todo se guarda solo. Y lo mejor: cada una acepta casi cualquier punto de partida. Una palabra, un párrafo, un documento, una señal del Radar o el resultado de otra herramienta.',
      'wag',
    );
    await ctx.say(
      'Hoy no solo te las muestro: voy a hacer un ejercicio completo en cada una, con la IA de verdad, de punta a punta. Nuestro caso: aprovechar los residuos de cosecha en Sogamoso, Boyacá. Si alguna herramienta tiene trabajo, la limpio primero; lo que ya estaba terminado queda guardado en el Contenedor de resultados. Entre herramienta y herramienta te pregunto si seguimos, y puedes decirme «repite», «atrás» o «terminar recorrido», o usar los botones de mi globo.',
      'spin',
    );
  },
  async recap(ctx) {
    await ctx.say(
      'Estamos en el Inicio. Desde aquí se entra a las cinco herramientas, y cada una acepta casi cualquier punto de partida. Vamos a hacer un ejercicio completo, de punta a punta, en cada una.',
      'wag',
    );
  },
};

const radar: TourStep = {
  tool: 'radar',
  title: 'el Radar del Observatorio',
  async run(ctx) {
    await ctx.say(
      'Primera parada: el Radar del Observatorio. Es la vigilancia tecnológica del Laboratorio, con señales reales que publica el Observatorio InnovaHub360: tendencias y tecnologías que vale la pena seguir.',
      'wag',
    );
    const scope: TourTarget = { selector: '[aria-label^="Radar de señales"]' };
    const found = await ctx.show(
      scope,
      'Funciona como un radar de barrido. Cada sector es un área; cuanto más cerca del centro, mayor impacto en el territorio. El tamaño del punto dice qué tan rápido se adopta y el color, su prioridad.',
      'stroll',
    );
    if (!found) {
      await ctx.say('El Radar necesita conexión para traer las señales del Observatorio. Cuando vuelva, aquí las verás moverse.', 'sit');
      return;
    }
    const blip: TourTarget = { selector: 'g.radar-blip' };
    const name = ctx.label(blip);
    if (await ctx.press(blip)) {
      await ctx.say(
        `Toco una señal para ver su ficha. ${describeSignal(name)} En la ficha están además el horizonte, la madurez, la evidencia, casos reales y señales relacionadas.`,
        'shake',
      );
    }
    await ctx.show(
      { selector: 'main button', text: /Ideaci[oó]n/ },
      'Y aquí está su gran ventaja: con un toque, cualquier señal se convierte en el punto de partida de Ideación, del Árbol o de Prototipado. El Radar no es solo para mirar: es para arrancar a innovar con datos.',
      'bow',
    );
  },
  async recap(ctx) {
    await ctx.say(
      'El Radar muestra las señales reales del Observatorio: impacto, adopción y prioridad de un vistazo, y con un toque cualquier señal arranca una ideación, un árbol o un prototipo.',
      'wag',
    );
  },
};

const estudio: TourStep = {
  tool: 'estudio',
  title: 'el Estudio Territorial',
  async run(ctx) {
    await ctx.say(
      'Ahora el Estudio Territorial: el diagnóstico de un municipio con la metodología MDVT, en doce bloques. Caracteriza cómo produce, lee cinco pilares de competitividad con su nivel de evidencia, arma la matriz FODA y señala alertas.',
      'wag',
    );
    if (ctx.snapshot().study.blocks && ctx.exists(CLEAR)) {
      await ctx.say(
        'Aquí ya hay un estudio. Lo limpio para hacer el ejercicio desde cero; tranquilidad, ya quedó guardado en el Contenedor de resultados.',
        'shake',
      );
      await ctx.press(CLEAR);
      await ctx.wait(600);
    } else if (!ctx.exists({ selector: '#ficha-nombre' }) && ctx.exists({ selector: 'button', text: /^Editar$/ })) {
      await ctx.press({ selector: 'button', text: /^Editar$/ });
      await ctx.wait(400);
    }
    const talking = ctx.say(
      'Todo empieza por la Ficha Base: el nombre del proyecto, la zona de la UNAD, el departamento y el municipio. Con eso basta para arrancar; mientras más contexto, mejor diagnóstico.',
    );
    await ctx.set({ selector: '#ficha-nombre' }, TOUR_EXAMPLE.project);
    await ctx.set({ selector: '#ficha-zona' }, TOUR_EXAMPLE.zone);
    await ctx.set({ selector: '#ficha-depto' }, TOUR_EXAMPLE.department);
    await ctx.wait(700); // Al elegir el departamento se cargan sus municipios.
    await ctx.set({ selector: '#ficha-muni' }, TOUR_EXAMPLE.municipality);
    await talking;
    await ctx.press({ selector: 'button[type="submit"]', text: /Guardar ficha/ });
    await ctx.wait(500);
    const sources: TourTarget = { selector: 'button', text: /^Sin fuentes propias$/ };
    await ctx.show(
      { selector: '[aria-label="Fuentes primarias"]' },
      'Mira qué flexible es: si tienes planes de desarrollo, estudios locales o datos propios, conectas una carpeta de Drive o cargas los archivos, y el estudio los usa como fuente prioritaria. Hoy vamos sin fuentes propias: el núcleo metodológico y la consulta en internet hacen el trabajo, y lo declara en una nota de trazabilidad.',
      'stroll',
    );
    await ctx.press(sources);
    const outcome = await ctx.generate(
      { selector: 'button', text: /^Generar Estudio Territorial$/ },
      () => ctx.snapshot().study.blocks > 0,
      STUDY_WAIT,
      15 * MIN,
    );
    if (outcome !== 'ok') {
      await ctx.say(notGenerated(outcome, 'el estudio'), 'sit');
      return;
    }
    const { study } = ctx.snapshot();
    await ctx.show(
      { selector: '[aria-label="Resumen del estudio"]' },
      `¡Listo! El Estudio Territorial de ${study.municipality ?? TOUR_EXAMPLE.municipality} quedó con sus ${study.blocks} bloques${study.issues ? `, y la revisión automática marcó ${study.issues} para mirar con calma` : ', todos revisados'}.`,
      'spin',
    );
    await ctx.show(
      { selector: '[aria-label="Bloques del estudio"]' },
      'Cada bloque se abre aquí: la caracterización, los pilares con su evidencia, la matriz FODA y las alertas. Si un bloque no te convence, lo rehaces solo, sin repetir todo el estudio.',
      'stroll',
    );
    await ctx.show(
      { selector: 'button[aria-label="Descargar informe en Word"]' },
      'Y con un toque lo descargas como informe formal, en Word editable o en PDF, con portada, índice y referencias. Además ya quedó guardado en el Contenedor de resultados, sin que lo pidieras.',
      'bow',
    );
  },
  async recap(ctx) {
    const { study } = ctx.snapshot();
    await ctx.say(
      study.blocks
        ? `El Estudio Territorial de ${study.municipality} tiene ${study.blocks} bloques: caracterización, pilares con evidencia, matriz FODA y alertas. Se descarga en Word o PDF y ya está en el Contenedor de resultados.`
        : 'El Estudio Territorial diagnostica un municipio en doce bloques con la metodología MDVT. Basta la Ficha Base para empezar, y puedes sumar tus propias fuentes.',
      'wag',
    );
  },
};

const ideacion: TourStep = {
  tool: 'ideacion',
  title: 'Ideación',
  async run(ctx) {
    await ctx.say(
      'Sigue Ideación, donde una inquietud se vuelve dirección. Declara la vocación, que es el para qué del proyecto, y propone tres temas posibles para que el equipo decida con criterio.',
      'wag',
    );
    if (ctx.snapshot().ideation.has && ctx.exists(CLEAR)) {
      await ctx.say('Aquí había una ideación anterior; la limpio para empezar. Ya está guardada en el Contenedor de resultados.', 'shake');
      await ctx.press(CLEAR);
      await ctx.wait(500);
    }
    await ctx.show(
      { selector: '[aria-label="Tipo de insumo"]' },
      'Fíjate en la flexibilidad: puede partir de una sola palabra, de un reto escrito en varios párrafos, de un archivo, de una señal del Radar o del Estudio Territorial. No exige haber hecho el estudio.',
      'stroll',
    );
    const fromStudy: TourTarget = { selector: '[aria-label="Tipo de insumo"] button', text: /Estudio Territorial/ };
    if (ctx.snapshot().study.blocks && ctx.exists(fromStudy)) {
      await ctx.press(fromStudy);
      await ctx.say(
        'Le doy como insumo el estudio que acabamos de hacer: así la ideación trabaja con la evidencia del territorio. Esto es encadenar herramientas.',
        'wag',
      );
    } else {
      await ctx.press({ selector: '[aria-label="Tipo de insumo"] button', text: /Un tema/ });
      const talking = ctx.say('Esta vez parto de un tema escrito: residuos de cosecha convertidos en abono orgánico para pequeñas fincas.');
      await ctx.set({ selector: 'textarea[aria-label="Tema o reto"]' }, TOUR_EXAMPLE.theme);
      await talking;
    }
    const outcome = await ctx.generate({ selector: 'button', text: /^Generar vocación y 3 temas$/ }, () => ctx.snapshot().ideation.has, IDEATION_WAIT, 8 * MIN);
    if (outcome !== 'ok') {
      await ctx.say(notGenerated(outcome, 'la ideación'), 'sit');
      return;
    }
    const { ideation } = ctx.snapshot();
    if (ideation.vocation) await ctx.show({ selector: '[aria-label="Vocación"]' }, `¡Woa, woa, quedó muy bien! La vocación dice: ${ideation.vocation}`, 'spin');
    if (ideation.themes.length) {
      await ctx.show(
        { selector: '[aria-label="Alternativas de tema"]' },
        `Y estos son los tres caminos: ${joinNames(ideation.themes.slice(0, 3))}. Cada uno trae su justificación, para comparar con criterio.`,
        'stroll',
      );
      await ctx.press({ selector: 'button', text: /^Elegir este tema$/ });
      await ctx.say(
        `Para seguir el ejercicio elijo el primero, «${ideation.themes[0]}». En un equipo real, esta decisión es de ustedes: yo solo la facilito. Y con el tema elegido, un botón lo lleva al Árbol o a Prototipado.`,
        'bow',
      );
    }
  },
  async recap(ctx) {
    const { ideation } = ctx.snapshot();
    await ctx.say(
      ideation.has
        ? `La Ideación declaró la vocación y propuso ${joinNames(ideation.themes.slice(0, 3))}${ideation.chosen ? `; elegimos «${ideation.chosen}»` : ''}.`
        : 'La Ideación declara la vocación y propone tres temas, desde una palabra, un archivo, una señal o el estudio.',
      'wag',
    );
  },
};

const arbol: TourStep = {
  tool: 'arbol',
  title: 'el Árbol de Innovación',
  async run(ctx) {
    await ctx.say(
      'Llegamos al Árbol de Innovación, mi favorito porque huele a bosque. Para cualquier tema conecta las tendencias del mundo con las oportunidades del territorio, y de ahí saca frutos concretos para trabajar.',
      'wag',
    );
    if (ctx.snapshot().tree.has && ctx.exists(CLEAR)) {
      await ctx.say('Aquí había un árbol; lo limpio para construir el nuestro. El anterior ya vive en el Contenedor de resultados.', 'shake');
      await ctx.press(CLEAR);
      await ctx.wait(500);
    }
    const { ideation, study } = ctx.snapshot();
    const theme = ideation.chosen ?? TOUR_EXAMPLE.treeTheme;
    const explanation = ideation.chosen ? firstSentence(ideation.chosenBody ?? '', 300) : TOUR_EXAMPLE.treeExplanation;
    await ctx.show(
      { selector: '[aria-label="Origen del tema"]' },
      'El tema puede ser desde una palabra hasta el título de un reto, un archivo o una señal del Radar. Y si vienes de Ideación, llega solo con un botón.',
      'stroll',
    );
    await ctx.press({ selector: '[aria-label="Origen del tema"] button', text: /Escribirlo/ });
    const talking = ctx.say(ideation.chosen ? `Escribo el tema que elegimos en Ideación: «${theme}».` : `Escribo el tema del ejemplo: «${theme}».`);
    await ctx.set({ selector: '#tree-theme' }, theme);
    if (explanation) await ctx.set({ selector: '#tree-expl' }, explanation);
    await talking;
    if (study.blocks && (await ctx.check({ selector: 'label', text: /Usar el Estudio Territorial/ }))) {
      await ctx.say('Y marco el Estudio Territorial como evidencia de la raíz: las brechas del árbol saldrán del diagnóstico real.', 'wag');
    }
    const outcome = await ctx.generate({ selector: 'button', text: /^Construir el árbol con IA$/ }, () => ctx.snapshot().tree.has, TREE_WAIT, 12 * MIN);
    if (outcome !== 'ok') {
      await ctx.say(notGenerated(outcome, 'el árbol'), 'sit');
      return;
    }
    const { tree } = ctx.snapshot();
    await ctx.show(
      { selector: '[aria-label="Resumen del árbol"]' },
      `¡Ya creció! Sobre «${tree.tema}» encontró ${tree.global} tendencias globales, ${tree.nacional} en Colombia y ${tree.territorial} en el territorio, de las que nacen ${tree.hojas} oportunidades y ${tree.frutos.length} frutos.`,
      'spin',
    );
    if (tree.frutos.length) {
      await ctx.say(
        `Algunos frutos para cosechar: ${joinNames(tree.frutos.slice(0, 3))}. Cada uno muestra de qué tendencia viene, su evidencia y su impacto esperado, y con un toque pasa a Prototipado.`,
        'stroll',
      );
    }
    await ctx.say(
      'Esta es la ventaja del árbol: en un solo mapa ves de dónde viene cada idea, qué tan sólida es y qué se puede hacer con ella. Se explora tocando las ramas y se descarga como informe formal.',
      'bow',
    );
  },
  async recap(ctx) {
    const { tree } = ctx.snapshot();
    await ctx.say(
      tree.has
        ? `El Árbol sobre «${tree.tema}» conecta ${tree.global} tendencias globales con ${tree.territorial} territoriales y da ${tree.frutos.length} frutos para cosechar.`
        : 'El Árbol baja de diez tendencias globales a cinco en Colombia y tres en el territorio, y de ahí saca oportunidades y frutos, cada uno con su evidencia.',
      'wag',
    );
  },
};

const prototipado: TourStep = {
  tool: 'prototipado',
  title: 'Prototipado',
  async run(ctx) {
    await ctx.say(
      'Penúltima parada: Prototipado, donde una idea se vuelve un plan que se puede ejecutar. Hipótesis, arquitectura, fases, métricas, riesgos y madurez tecnológica, todo en un solo plan.',
      'wag',
    );
    if (ctx.snapshot().prototype.has && ctx.exists(CLEAR)) {
      await ctx.say('Aquí estaba abierto un plan anterior; lo limpio. Sigue guardado en el Contenedor de resultados.', 'shake');
      await ctx.press(CLEAR);
      await ctx.wait(500);
    }
    await ctx.show(
      { selector: '[aria-label="Origen del plan"]' },
      'Otra vez, el punto de partida es flexible: una idea escrita con tus palabras, un fruto del Árbol o una señal del Radar.',
      'stroll',
    );
    const fromTree: TourTarget = { selector: '[aria-label="Origen del plan"] button', text: /Resultado del Árbol/ };
    const { tree } = ctx.snapshot();
    let picked = false;
    if (tree.frutos.length && ctx.exists(fromTree)) {
      await ctx.press(fromTree);
      await ctx.wait(400);
      picked = await ctx.press({ selector: '[aria-label="Datos del plan"] button.lab-card' });
      if (picked) await ctx.say(`Tomo un fruto del árbol que acabamos de construir. Su nombre, su contexto y su tipo llegan solos al formulario.`, 'wag');
    }
    if (!picked) {
      await ctx.press({ selector: '[aria-label="Origen del plan"] button', text: /Una idea/ });
      const talking = ctx.say('Escribo la idea del ejemplo: una compostera de bajo costo con sensor de humedad para las fincas.');
      await ctx.set({ selector: '#proto-topic' }, TOUR_EXAMPLE.prototype);
      await talking;
    }
    await ctx.show(
      { selector: '#proto-trl' },
      'Aquí se ajustan la categoría, la madurez tecnológica de partida y el alcance, para que el plan quede a la medida de lo que tienes hoy.',
      'stroll',
    );
    const before = ctx.snapshot().bank.prototypes;
    const outcome = await ctx.generate(
      { selector: 'button', text: /Armar el plan con IA/ },
      () => ctx.snapshot().bank.prototypes > before,
      PROTOTYPE_WAIT,
      8 * MIN,
    );
    if (outcome !== 'ok') {
      await ctx.say(notGenerated(outcome, 'el plan'), 'sit');
      return;
    }
    const { prototype } = ctx.snapshot();
    await ctx.say(`¡Tenemos plan! Se llama «${prototype.name}»${prototype.tagline ? `: ${prototype.tagline}` : ''}.`, 'spin');
    if (prototype.hypothesis) await ctx.say(`Su hipótesis: ${firstSentence(prototype.hypothesis, 260)}`, 'stroll');
    await ctx.show(
      { selector: '[aria-label="Secciones del plan"]' },
      `Está organizado en ${prototype.phases} fases${prototype.weeks ? `, para unas ${prototype.weeks} semanas` : ''}${prototype.trl ? `, con la meta de llegar a ${prototype.trl}` : ''}. ${prototype.metrics.length ? `Para saber si funciona, mide por ejemplo ${joinNames(prototype.metrics.slice(0, 2))}.` : ''}`,
      'wag',
    );
    await ctx.say(
      'Esa es la potencia de Prototipado: en minutos pasas de una idea a un plan que se puede presentar, medir y ejecutar, con sus riesgos anticipados. Y se descarga en Word o PDF.',
      'bow',
    );
  },
  async recap(ctx) {
    const { prototype } = ctx.snapshot();
    await ctx.say(
      prototype.has
        ? `El plan «${prototype.name}» tiene hipótesis, ${prototype.phases} fases, métricas, riesgos y su meta de madurez tecnológica.`
        : 'Prototipado convierte una idea, un fruto del árbol o una señal en un plan con hipótesis, fases, métricas, riesgos y TRL.',
      'wag',
    );
  },
};

const banco: TourStep = {
  tool: 'banco',
  title: 'el Contenedor de resultados',
  async run(ctx) {
    const { bank } = ctx.snapshot();
    await ctx.say(
      `Y la última parada: el Contenedor de resultados de innovación en línea. Aquí se guardó solito todo lo que hicimos. Hoy tienes ${bank.studies} ${bank.studies === 1 ? 'estudio' : 'estudios'}, ${bank.ideations} ${bank.ideations === 1 ? 'ideación' : 'ideaciones'}, ${bank.trees} ${bank.trees === 1 ? 'árbol' : 'árboles'} y ${bank.prototypes} ${bank.prototypes === 1 ? 'plan' : 'planes'} de prototipo, listos para consultar o descargar cuando quieras.`,
      'wag',
    );
    await ctx.show(
      { selector: '[role="tab"]' },
      'Cada línea tiene su pestaña, y cada ejercicio conserva su entrada: si rehaces una parte, se actualiza; si empiezas otro, nace uno nuevo. Nada se pierde al limpiar una herramienta.',
      'stroll',
    );
    if (await ctx.press({ selector: '[role="tab"]', text: /Insignias y Logros/ })) {
      await ctx.say(
        'Y aquí están tus logros: cada herramienta da una insignia, con niveles de experiencia y certificados imprimibles. Con las cuatro te ganas la de Maestro Innovador 360.',
        'spin',
      );
    }
  },
  async recap(ctx) {
    await ctx.say(
      'El Contenedor de resultados guarda solo todos los ejercicios terminados, y en la pestaña de logros están tus insignias, niveles y certificados.',
      'wag',
    );
  },
};

export const TOUR_STEPS: readonly TourStep[] = [portal, radar, estudio, ideacion, arbol, prototipado, banco];

/** Lo que ZOE pregunta al terminar cada parada: nunca presiona, deja que la persona marque el ritmo. */
export function readyQuestion(index: number): string {
  if (index === 0) return '¿Todo listo para empezar? Estoy aquí contigo.';
  const next = TOUR_STEPS[index + 1];
  return next ? `¿Seguimos con ${next.title}? Estoy aquí contigo.` : '¿Te cuento qué ruta seguir ahora?';
}

/** Cierre del recorrido: las rutas y la invitación a empezar. */
export const TOUR_END = `¡Terminamos el recorrido, y lo hiciste muy bien! Ya viste que cada herramienta funciona sola y que, encadenadas, cada una alimenta a la siguiente. Ahora, ¿qué ruta seguir? ${ROUTES_TEXT} ¿Por cuál te gustaría empezar? Dime, por ejemplo, «por el estudio», y te llevo.`;

export const TOUR_WAIT = ['Claro, sin afán. Cuando quieras me dices «sigamos».', 'Aquí te espero, todo el tiempo que necesites.'];
export const TOUR_STOP = 'Listo, terminamos el recorrido aquí. Cuando quieras retomarlo, dime «muéstrame el laboratorio». Gracias por acompañarme.';

/** Qué quiere hacer la persona con el recorrido. */
export type TourReply = 'next' | 'back' | 'repeat' | 'stop' | 'wait';

/**
 * Lo que la persona dice entre parada y parada. Solo frases cortas: una pregunta larga
 * no es una orden del recorrido, se responde como cualquier otra.
 */
export function parseTourReply(text: string): TourReply | null {
  const t = text
    .trim()
    .toLowerCase()
    .replace(/^(zo[eé]y?|so[eé])[,\s]+/, '');
  if (!t || t.split(/\s+/).length > 7) return null;
  // Fin de palabra con tildes: `\b` de JavaScript no reconoce «entendí» ni «sí».
  const says = (words: string) => new RegExp(String.raw`(^|[^\wáéíóúñü])(${words})(?![\wáéíóúñü])`).test(t);
  if (
    says(
      String.raw`termina(r)?|terminemos|sal(ir)?|salgamos|fin del recorrido|ya no m[aá]s|ya no quiero|basta|suficiente|cancela(r)?|det[eé]n el recorrido|para el recorrido`,
    )
  )
    return 'stop';
  if (says(String.raw`atr[aá]s|anterior|regresa|devu[eé]lvete|la de antes`)) return 'back';
  if (says(String.raw`repite|rep[ií]telo|rep[ií]tela|otra vez|de nuevo|no (te )?entend[ií]|no (te )?escuch[eé]|c[oó]mo as[ií]`)) return 'repeat';
  if (says(String.raw`espera|esp[eé]rame|todav[ií]a no|a[uú]n no|un momento|un segundo|dame un momento|ahorita no`)) return 'wait';
  const confirmed = isConfirmation(t);
  if (confirmed === false) return 'wait';
  if (
    confirmed ||
    says(
      String.raw`sigamos|sigue|siguiente|contin[uú]a|continuemos|continuar|adelante|avanza|avancemos|listo|lista|vamos|dale|claro|perfecto|de una|empecemos|empieza|s[ií]`,
    )
  )
    return 'next';
  return null;
}
