/**
 * Modo «Taller de innovación»: ZOE asiste al taller de 40 minutos del Encuentro de Líderes y guía a
 * cada grupo herramienta por herramienta. En cada fase sigue el mismo ritmo, con una pausa humana:
 *
 *   1. anticipa lo que se hará y manda a trabajar (la herramienta se abre sola),
 *   2. cuando el grupo dice «terminamos», les pide discutirlo, hacer cambios y validarlo,
 *   3. cuando vuelven, pregunta si revisaron y validaron, y solo con un sí celebra y pasa al siguiente paso.
 *
 * Aquí solo está el guion y la lectura de las respuestas (se prueba en tests/zoeTaller.test.ts);
 * `ZoeFreePresence` es quien habla, abre las pantallas y lleva el estado.
 */
import type { ToolId } from '@/components/layout/Header';
import { MODULE_LABELS } from '@/lib/moduleLabels';
import { isConfirmation } from '@/lib/zoeContext';
import { normalizeKnowledgeText } from '@/lib/zoeKnowledge';

/** Una fase del taller. */
export interface TallerPhase {
  id: 'estudio' | 'ideacion' | 'arbol' | 'prototipado';
  tool: ToolId;
  /** Nombre corto que usa ZOE al hablar. */
  name: string;
  minutes: number;
  /** Lo que ZOE dice al abrir la fase: qué se hace y qué se espera de ese grupo. */
  intro: string;
  /** Lo que el grupo debe tener al terminar; ZOE lo repite al pedir la validación. */
  deliverable: string;
}

export const TALLER_PHASES: readonly TallerPhase[] = [
  {
    id: 'estudio',
    tool: 'estudio',
    name: MODULE_LABELS.estudio.title,
    minutes: 8,
    intro:
      'Empezamos con Identificar Oportunidades, el Estudio Territorial. Escojan el municipio de su territorio, o carguen uno que ya esté preparado, y presionen Generar. Cuando salga el diagnóstico, léanlo en silencio y marquen una oportunidad que les llame la atención. Tienen unos ocho minutos en total.',
    deliverable: 'el estudio leído y las oportunidades que se llevan a la ideación',
  },
  {
    id: 'ideacion',
    tool: 'ideacion',
    name: MODULE_LABELS.ideacion.title,
    minutes: 8,
    intro:
      'Ahora vamos a Crear Conceptos, la Ideación. Usen el estudio que acaban de validar y presionen Generar: les propongo una vocación productiva y varios temas. Cada persona elige uno, lo defiende en veinte segundos, y entre todos escogen uno solo. Son unos ocho minutos.',
    deliverable: 'un tema elegido y la razón por la que lo escogieron',
  },
  {
    id: 'arbol',
    tool: 'arbol',
    name: MODULE_LABELS.arbol.title,
    minutes: 9,
    intro:
      'Seguimos con Validar Conceptos, el Árbol de Innovación. Con el tema elegido armen el árbol: diez tendencias globales, cinco de Colombia y tres del territorio. Recorran las ramas y escojan un fruto, que es la idea concreta que van a prototipar. Tienen unos nueve minutos.',
    deliverable: 'un fruto elegido y por qué es pertinente para su territorio',
  },
  {
    id: 'prototipado',
    tool: 'prototipado',
    name: MODULE_LABELS.prototipado.title,
    minutes: 8,
    intro:
      'Llegamos a Desarrollar Soluciones, el Prototipado. Con el fruto elegido generen el plan de solución. Revisen la hipótesis, las fases y las métricas, y piensen cuál sería la primera prueba pequeña. Son unos ocho minutos.',
    deliverable: 'un plan de prototipo ajustado y su primer paso',
  },
];

/** Cuántos minutos van del cierre. */
export const TALLER_CLOSING_MINUTES = 5;

/** Reconoce la orden que activa el modo: «Taller de innovación» (con o sin «ZOE», «activa», «empieza»…). */
export function isTallerCommand(text: string): boolean {
  return /\btaller de innovacion\b/.test(normalizeKnowledgeText(text));
}

/** El apertura: quién es ZOE aquí, de qué trata el encuentro y cómo se trabaja. */
export const TALLER_WELCOME =
  '¡Modo taller de innovación activado! Qué alegría estar en el Trigésimo Encuentro de Líderes Unadistas Transformadores. Soy ZOE y hoy voy a acompañar a cada grupo. Vamos a recorrer cuatro herramientas, una tras otra, en unos cuarenta minutos. En cada una hacemos lo mismo: yo les cuento qué hacer, ustedes trabajan, y cuando yo les diga que terminamos, lo discuten en grupo, hacen los cambios que haga falta, lo validan y vuelven aquí. La IA propone, pero ustedes deciden.';

/** Después de la bienvenida, antes de la primera fase. */
export const TALLER_START_QUESTION = '¿Están listos para empezar? Díganme «listos» y arrancamos.';

/** El grupo dice que ya tiene el resultado: la pausa humana. */
export function reviewPrompt(phase: TallerPhase): string {
  return `¡Muy bien! Ya terminamos esta parte. Ahora discútanlo en grupo: ¿tiene sentido para su territorio? Hagan los cambios que haga falta y valídenlo. Al final deben tener ${phase.deliverable}. Cuando lo tengan, vuelvan aquí y me dicen «ya volvimos» para continuar.`;
}

/** Cuando vuelven: ¿revisaron y validaron? */
export const CONFIRM_QUESTIONS: readonly string[] = [
  '¿Ya estás listo para continuar? ¿Revisaron y validaron los resultados entre todos?',
  '¿Todo el grupo revisó y validó los resultados? ¿Seguimos?',
  '¿Los discutieron en grupo y los validaron? ¿Estamos listos para el siguiente paso?',
];

/**
 * Dijeron que sí: ZOE celebra con humor amable y avanza. Confía en el grupo: nunca pone en duda lo que
 * validaron («¿seguros?») ni se ríe de ellos; el humor es sobre él (la cola, las orejas) y reconoce el trabajo.
 */
export const CONFIRM_YES: readonly string[] = [
  '¡Excelente! Revisado, discutido y validado entre todos: así se trabaja en equipo. Hasta la cola de luz me bailó de la emoción. ¡Vamos por el siguiente paso!',
  'Qué orgullo de grupo. Con la validación humana hecha, la IA queda donde debe: acompañando. Yo ya tengo las orejas paradas para lo que sigue. ¡Pasemos al siguiente paso!',
  'Muy buen criterio, equipo. Decidieron ustedes y eso es lo que hace fuerte a un territorio. Les aplaudo con las cuatro patas. ¡Vamos al siguiente paso!',
  'Gracias por tomarse el tiempo de validarlo juntos: se nota el cuidado que le ponen. Anotado, y con la cola en alto. ¡Vamos por el siguiente paso!',
];

/** Dijeron que no: sin afán, vuelven a la discusión. */
export const CONFIRM_NO: readonly string[] = [
  'Sin afán, mejor revisarlo bien que correr. Tómense el tiempo, discútanlo con calma y, cuando estén listos, me dicen «ya volvimos».',
  'Perfecto, esa pausa vale oro. Sigan conversando y haciendo los cambios, y me avisan con «ya volvimos» cuando lo hayan validado.',
];

/** Cierre del taller: lo que se pregunta al grupo y la despedida. */
export const TALLER_CLOSING =
  '¡Llegamos al final, y lo hicieron muy bien! Cada grupo tiene ahora un territorio, un tema, un fruto y un plan de prototipo. Antes de despedirnos, cuenten en una frase lo que decidieron y respondan juntos: ¿qué decidieron ustedes que la IA no habría decidido por su cuenta? Esa respuesta es el verdadero aprendizaje de hoy. Gracias por dejarme acompañarlos. ¡Son los mejores!';

export const TALLER_STOP = 'Listo, terminamos el modo taller aquí. Cuando quieran retomarlo, díganme «taller de innovación». Fue un gusto acompañarlos.';

/** Aviso de tiempo cuando a una fase le quedan unos minutos. */
export function timeReminder(phase: TallerPhase, minutesLeft: number): string {
  return `Aviso de tiempo: en ${phase.name} les quedan unos ${minutesLeft} minutos. Si van atrasados, pasen con lo que tengan; es mejor un resultado imperfecto y validado.`;
}

export type TallerReply = 'done' | 'back' | 'next' | 'repeat' | 'stop' | 'wait' | 'yes' | 'no';

/**
 * Lo que dice el grupo, según la etapa en que va la fase.
 * - `start`: esperan el «listos» para empezar.
 * - `working`: están trabajando; el «terminamos» pasa a la pausa humana.
 * - `discussing`: lo discuten; el «ya volvimos» lleva a la pregunta de validación.
 * - `confirm`: se les preguntó si revisaron y validaron.
 */
export type TallerStage = 'start' | 'working' | 'discussing' | 'confirm';

export function parseTallerReply(text: string, stage: TallerStage): TallerReply | null {
  const t = normalizeKnowledgeText(text).replace(/^zoe\s+/, '');
  if (/^(terminar|termina|salir|sal|parar|para|detener|cancelar)( el)?( modo)?( taller)?\b/.test(t) || /\b(terminar|salir de|detener) (el )?taller\b/.test(t)) return 'stop';
  if (/^(todavia no|aun no)\b/.test(t)) return stage === 'confirm' ? 'no' : 'wait';
  if (/^(espera|esperame|un momento|un segundo|dame (un )?(momento|minuto|tiempo))\b/.test(t)) return 'wait';
  if (/^(repite|repetir|otra vez|repitelo|de nuevo)\b/.test(t)) return 'repeat';
  if (/^(atras|volver atras|anterior|vuelve)\b/.test(t)) return 'back';
  if (/^(sigue|siguiente|saltar|salta|saltemos|pasemos|pasar|adelante)\b/.test(t) && stage !== 'confirm') return 'next';
  if (stage === 'start') return isConfirmation(text) === true || /^(listos?|listas?|empecemos|empieza|vamos|arranca|arranquemos|comencemos)\b/.test(t) ? 'yes' : null;
  if (stage === 'working') return /^(terminamos|terminamos ya|ya terminamos|ya (esta|quedo|tenemos)|listo|listos|ya|hecho|acabamos|finalizamos|ya acabamos)\b/.test(t) ? 'done' : null;
  if (stage === 'discussing') return /^(ya volvimos|volvimos|ya estamos|estamos aqui|ya|listo|listos|ya lo (discutimos|validamos|revisamos)|ya terminamos|regresamos)\b/.test(t) ? 'done' : null;
  // confirm
  const yes = isConfirmation(text);
  if (yes === true) return 'yes';
  if (yes === false) return 'no';
  if (/^(revisamos|validamos|ya (revisamos|validamos)|todo (bien|revisado)|estamos listos|estoy listo|estamos seguros|seguros)\b/.test(t)) return 'yes';
  if (/^(falta|nos falta|aun falta|casi)\b/.test(t)) return 'no';
  return null;
}
