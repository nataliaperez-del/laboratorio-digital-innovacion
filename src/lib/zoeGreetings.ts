/**
 * Saludos de ZOE:
 * Variedad de frases de bienvenida y saludo para que ZOE nunca suene a grabación ni repita
 * mecánicamente «¿Todo listo para continuar?».
 *
 * ZOE es un perro de luz, guardián de la Zona de Oportunidades Estratégicas (vida, principio
 * vital unadista). Saluda con calidez, lealtad y frescura: orejas de luz, olfato para
 * oportunidades territoriales y disposición a acompañar sin prisa.
 */

/** Saludos cuando ZOE sale de su casita o entra en pantalla. */
export const COME_OUT_GREETINGS: readonly string[] = [
  '¡Aquí estoy! Listo para olfatear nuevas oportunidades contigo.',
  '¡Hola! Orejas de luz arriba y cola contenta. ¿En qué trabajamos hoy?',
  '¡Presente! Con el olfato fino para descubrir buenas ideas en tu territorio.',
  '¡De vuelta! Sin afán y a tu ritmo: ¿qué exploramos hoy?',
  '¡Aquí a tu lado! Cuéntame qué tienes en mente y le damos vida.',
  '¡Salí! Listo para acompañarte por los retos de tu comunidad.',
  '¡Presente y con toda la energía! ¿Por dónde quieres arrancar?',
  '¡Aquí estoy! Recuerda que en este laboratorio ninguna buena idea se queda en el aire.',
  '¡Listo! Con las cuatro patas puestas en la innovación.',
  '¡Hola de nuevo! Mis orejas de luz están atentas a lo que necesites.',
];

/** Saludos iniciales al abrir o iniciar la conversación con ZOE. */
export const INITIAL_GREETINGS: readonly string[] = [
  '¡Hola! Qué alegría verte. Estoy aquí contigo, sin prisa. ¿En qué te puedo acompañar hoy?',
  '¡Hola! Qué gusto saludarte. Mis orejas de luz están atentas a lo que tengas en mente. ¿Por dónde empezamos?',
  '¡Hola! Qué bueno tenerte por acá. ¿Quieres explorar una herramienta, hacer el recorrido guiado o charlamos un ratico?',
  '¡Hola, colega unadista! Aquí ZOE a tu lado. ¿Qué oportunidad territorial queremos olfatear hoy?',
  '¡Hola! Qué alegría saludarte. Cuéntame qué tienes pensado y le damos vida paso a paso.',
  '¡Hola! Aquí estoy listo y a tu compás. ¿Por cuál reto o rincón del laboratorio te gustaría empezar?',
  '¡Hola! Qué gusto encontrarnos. Estoy aquí contigo, sin afán. ¿Tú me dices por dónde arrancamos?',
  '¡Hola! Qué alegría verte. Estoy aquí contigo, sin prisa. ¿Todo listo para continuar?',
];

/** Saludos de ZOE cuando la persona lo saluda («hola», «buenas», etc.) fuera de línea o de memoria. */
export const OFFLINE_GREETINGS: readonly string[] = [
  '¡Hola! Qué gusto saludarte. Aquí estoy contigo, sin afán. ¿Qué tienes en mente para hoy?',
  '¡Hola! Qué alegría escucharte. Mis orejas de luz están listas. ¿En qué te puedo dar una mano?',
  '¡Hola! Qué bueno tenerte en el laboratorio. ¿Qué oportunidad o idea territorial exploramos hoy?',
  '¡Hola! Un saludo con cola contenta. Cuéntame qué quieres trabajar y te acompaño paso a paso.',
  '¡Hola! Qué gusto encontrarnos. Aquí sigo a tu lado, a tu ritmo. ¿Por dónde empezamos?',
  '¡Hola! Siempre es un placer saludarte. ¿Exploramos herramientas o tienes alguna duda que revisemos juntos?',
  '¡Hola! Aquí ZOE, firme y a tu lado. Cuéntame qué reto o proyecto vamos a mover hoy.',
];

/** Respuestas variadas cuando la persona confirma que está lista para seguir. */
export const READY_YES_RESPONSES: readonly string[] = [
  '¡Qué bien! Cuéntame qué tienes en mente: puedo explicarte una herramienta, llevarte a una pantalla, hacer contigo el recorrido guiado o simplemente conversar un rato.',
  '¡Excelente! Tú marcas el compás: dime si exploramos una herramienta, revisamos ideas del territorio o charlamos.',
  '¡De una! Aquí estoy para acompañarte: podemos recorrer el laboratorio, trabajar un reto o resolver cualquier duda.',
  '¡Esa es la actitud! Cuéntame qué quieres explorar y le damos vida paso a paso.',
];

/** Respuestas variadas cuando la persona dice que todavía no o que no hay afán. */
export const READY_NO_RESPONSES: readonly string[] = [
  'Sin ningún afán. Aquí me quedo contigo; cuando quieras me dices «listo» y seguimos.',
  'Tranquilo, sin prisa. Aquí estoy a tu lado para cuando quieras continuar.',
  'Tómate todo el tiempo que necesites. Cuando estés a gusto, me avisas y arrancamos.',
  'Cero afanes. Aquí me echo a tu lado y tú me avisas cuando quieras seguir.',
];

/** Selecciona un saludo al salir de la casita. */
export function pickComeOutGreeting(random: () => number = Math.random): string {
  const idx = Math.floor(random() * COME_OUT_GREETINGS.length);
  return COME_OUT_GREETINGS[idx] ?? COME_OUT_GREETINGS[0];
}

/** Selecciona un saludo inicial evitando repetir uno usado recientemente. */
export function pickInitialGreeting(recentReplies: readonly string[] = [], random: () => number = Math.random): string {
  const available = INITIAL_GREETINGS.filter((g) => !recentReplies.some((r) => r.includes(g)));
  const pool = available.length > 0 ? available : INITIAL_GREETINGS;
  const idx = Math.floor(random() * pool.length);
  return pool[idx] ?? pool[0];
}

/** Selecciona un saludo fuera de línea evitando repetir uno usado recientemente. */
export function pickOfflineGreeting(recentReplies: readonly string[] = [], random: () => number = Math.random): string {
  const available = OFFLINE_GREETINGS.filter((g) => !recentReplies.some((r) => r.includes(g)));
  const pool = available.length > 0 ? available : OFFLINE_GREETINGS;
  const idx = Math.floor(random() * pool.length);
  return pool[idx] ?? pool[0];
}

/** Selecciona una respuesta cuando la persona dice que sí/está lista. */
export function pickReadyYes(random: () => number = Math.random): string {
  const idx = Math.floor(random() * READY_YES_RESPONSES.length);
  return READY_YES_RESPONSES[idx] ?? READY_YES_RESPONSES[0];
}

/** Selecciona una respuesta cuando la persona dice que no/quiere esperar. */
export function pickReadyNo(random: () => number = Math.random): string {
  const idx = Math.floor(random() * READY_NO_RESPONSES.length);
  return READY_NO_RESPONSES[idx] ?? READY_NO_RESPONSES[0];
}
