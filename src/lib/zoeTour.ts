/**
 * Recorrido guiado: ZOE muestra el Laboratorio pantalla por pantalla, explica qué es cada
 * herramienta y cómo funciona, deja un ejemplo en sus campos y señala el botón que la pone a
 * trabajar. Al final cuenta qué ruta seguir. Funciona sin IA: el guion está aquí.
 *
 * Reglas del ejemplo (nunca cambian): solo escribe en campos vacíos, nunca pisa lo que la
 * persona escribió, nunca presiona «Generar» ni nada que gaste IA, borre o guarde. Entre una
 * parada y otra pregunta si la persona está lista: el ritmo lo pone ella.
 *
 * El ejemplo es uno solo de punta a punta (residuos de cosecha en Sogamoso, Boyacá) para que
 * se vea cómo cada herramienta alimenta a la siguiente.
 */
import type { ToolId } from '@/components/layout/Header';
import { isConfirmation } from '@/lib/zoeContext';
import { ROUTES_TEXT } from '@/lib/zoeOffline';

/** Algo de la pantalla que ZOE busca: un selector CSS o el texto visible de un botón o título. */
export interface TourTarget {
  selector?: string;
  text?: RegExp;
}

/** Un campo del ejemplo: dónde está, qué valor deja y cuánto espera después (una lista que carga otra). */
export interface TourField {
  target: TourTarget;
  value: string;
  waitMs?: number;
}

/** Una parada del recorrido. */
export interface TourStep {
  tool: ToolId;
  /** Nombre corto de la parada, para retomar («íbamos en el Árbol»). */
  title: string;
  /** Qué es, para qué sirve y cómo funciona. */
  explain: string;
  example?: {
    fields: TourField[];
    /** Lo que dice mientras escribe el ejemplo. */
    say: string;
    /** Si no pudo escribir nada (ya hay datos de la persona o el campo no está a la vista). */
    whenKept: string;
  };
  point?: { target: TourTarget; say: string };
}

export const TOUR_STEPS: readonly TourStep[] = [
  {
    tool: 'portal',
    title: 'la bienvenida',
    explain:
      '¡Te doy la bienvenida al recorrido! Este es el Laboratorio de Innovación en Línea, un módulo del Observatorio InnovaHub360 de la UNAD. Aquí cualquier persona puede pasar de una inquietud a un plan de prototipo, paso a paso y con ayuda de inteligencia artificial. Son cinco herramientas y un banco donde se guarda todo. Para que se entienda cómo se conectan, te voy a mostrar un mismo ejemplo de punta a punta: aprovechar los residuos de cosecha en Sogamoso, Boyacá. Es solo un ejemplo: nada se genera ni se guarda sin que tú lo pidas.',
    point: {
      target: { text: /Radar|Estudio Territorial|Ideaci[oó]n/ },
      say: 'Desde aquí se entra a cada herramienta. Cuando quieras avanzar dime «sigamos»; si quieres oír algo otra vez, «repite»; y si prefieres parar, «terminar recorrido». También tienes esos botones en mi globo de texto.',
    },
  },
  {
    tool: 'radar',
    title: 'el Radar',
    explain:
      'Primera parada: el Radar del Observatorio. Funciona como un radar de barrido: cada punto es una señal real que publica el Observatorio, una tendencia o tecnología que vale la pena vigilar. Cuanto más cerca del centro, mayor impacto en el territorio; el tamaño dice qué tan rápido se adopta y el color, su prioridad.',
    point: {
      target: { selector: '[aria-label^="Radar de señales"]', text: /Lista/ },
      say: 'Por ejemplo, para nuestro caso buscaría señales de economía circular o de agricultura. Tocas una, lees su ficha con impacto, madurez y evidencia, y con un botón la llevas a Ideación, al Árbol o a Prototipado.',
    },
  },
  {
    tool: 'estudio',
    title: 'el Estudio Territorial',
    explain:
      'Ahora el Estudio Territorial. Es el diagnóstico de un municipio con la metodología MDVT, en doce puntos: cómo produce, cinco pilares de competitividad con su nivel de evidencia, la matriz FODA y las alertas. Se empieza por la Ficha Base y, si quieres, sumas tus propias fuentes para que el estudio las use y las cite.',
    example: {
      fields: [
        { target: { selector: '#ficha-nombre' }, value: 'Aprovechamiento de residuos de cosecha en Sogamoso' },
        { target: { selector: '#ficha-zona' }, value: 'Zona Centro Boyacá (ZCB)' },
        { target: { selector: '#ficha-depto' }, value: 'Boyacá', waitMs: 600 },
        { target: { selector: '#ficha-muni' }, value: 'Sogamoso' },
      ],
      say: 'Te dejo el ejemplo en la Ficha Base: el nombre del proyecto, la zona de la UNAD, el departamento y el municipio. Lo puedes cambiar o borrar cuando quieras.',
      whenKept: 'Veo que aquí ya tienes tus propios datos, así que no toco nada: tu trabajo se respeta.',
    },
    point: {
      target: { text: /Generar Estudio Territorial|Regenerar estudio completo/ },
      say: 'Con la ficha guardada, este botón genera el estudio. Toma unos minutos, porque se arma por partes y cada parte se revisa. Al final lo ves interactivo en pantalla y lo descargas en Word o en PDF.',
    },
  },
  {
    tool: 'ideacion',
    title: 'Ideación',
    explain:
      'Sigue Ideación. Aquí se declara la vocación, que es el para qué del proyecto, y se proponen tres temas posibles para que el equipo elija con criterio y no se case con la primera idea. Puedes partir de un tema escrito, un archivo, una señal del Radar o el Estudio Territorial.',
    example: {
      fields: [
        {
          target: { selector: 'textarea[aria-label="Tema o reto"]' },
          value: 'Aprovechamiento de residuos de cosecha de papa y cebolla para producir abono orgánico en pequeñas fincas de Sogamoso',
        },
      ],
      say: 'Para nuestro ejemplo escribo el tema: residuos de cosecha convertidos en abono orgánico para pequeñas fincas.',
      whenKept: 'Aquí ya tienes tu propio insumo, así que lo dejo tal cual.',
    },
    point: {
      target: { text: /Generar vocación y 3 temas|Generar de nuevo/ },
      say: 'Con el tema escrito, este botón arma la vocación y los tres caminos. Tú eliges uno, y ese tema puede seguir al Árbol.',
    },
  },
  {
    tool: 'arbol',
    title: 'el Árbol de Innovación',
    explain:
      'Llegamos al Árbol de Innovación, mi favorito porque huele a bosque. Para un tema busca diez tendencias globales, baja a cinco que ya se ven en Colombia y a tres que tocan el territorio. De ahí salen las oportunidades, que son las hojas, y los frutos, que son proyectos, servicios o prototipos. Las brechas son la raíz y las fuentes, el suelo. Cada elemento trae su evidencia: N1 viene del Observatorio, N2 tiene fuente citada y N3 es una hipótesis por verificar.',
    example: {
      fields: [
        { target: { selector: '#tree-theme' }, value: 'Economía circular en el agro boyacense' },
        { target: { selector: '#tree-expl' }, value: 'Convertir residuos de cosecha en abonos y bioinsumos que generen ingresos para fincas pequeñas.' },
      ],
      say: 'Te escribo el tema del ejemplo, economía circular en el agro boyacense, y una frase que orienta las tendencias.',
      whenKept: 'Aquí ya tienes un tema tuyo escrito, así que no lo cambio.',
    },
    point: {
      target: { text: /Construir el árbol con IA|Construir de nuevo/ },
      say: 'Este botón construye el árbol. Después lo exploras tocando las ramas, y cualquier fruto se puede llevar a Prototipado con un toque.',
    },
  },
  {
    tool: 'prototipado',
    title: 'Prototipado',
    explain:
      'Penúltima parada: Prototipado. Toma una idea, o un fruto del Árbol, y arma el plan del prototipo: la hipótesis que se pone a prueba, la arquitectura de la solución, las fases, las métricas, los riesgos y el nivel de madurez tecnológica, el famoso TRL, que va de uno a nueve.',
    example: {
      fields: [
        {
          target: { selector: '#proto-topic' },
          value: 'Compostera de bajo costo con sensor de humedad para convertir residuos de cosecha en abono en fincas de Sogamoso',
        },
      ],
      say: 'Para cerrar el ejemplo escribo la idea: una compostera de bajo costo con sensor de humedad para las fincas.',
      whenKept: 'Aquí ya tienes una idea tuya escrita, así que la dejo como está.',
    },
    point: {
      target: { text: /Armar el plan con IA/ },
      say: 'Con la idea lista, este botón arma el plan completo, que también se descarga en Word o PDF.',
    },
  },
  {
    tool: 'banco',
    title: 'el Banco',
    explain:
      'Y la última parada: el Banco Unificado de Innovación. Aquí se guardan solitos tus ejercicios terminados, los estudios, las ideaciones, los árboles y los prototipos, para consultarlos o descargarlos cuando quieras, sin interferir con lo que estés haciendo.',
    point: {
      target: { selector: '[role="tab"]', text: /Insignias y Logros/ },
      say: 'En la pestaña de logros viven tus insignias, tus niveles y tus certificados. Cada herramienta da una insignia, y con las cuatro te ganas la de Maestro Innovador 360.',
    },
  },
];

/** Lo que ZOE pregunta al terminar cada parada: nunca presiona, deja que la persona marque el ritmo. */
export const READY_QUESTIONS = [
  '¿Todo listo para continuar? Estoy aquí contigo.',
  '¿Seguimos? Tómate tu tiempo, yo te espero.',
  '¿Pasamos a la siguiente parada? Si quieres que repita algo, solo dime «repite».',
];

/** Cierre del recorrido: las rutas y la invitación a empezar. */
export const TOUR_END = `¡Terminamos el recorrido, y lo hiciste muy bien! Ahora, ¿qué ruta seguir? ${ROUTES_TEXT} ¿Por cuál te gustaría empezar? Dime, por ejemplo, «por el estudio», y te llevo.`;

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
    says(String.raw`sigamos|sigue|siguiente|contin[uú]a|continuemos|continuar|adelante|avanza|avancemos|listo|lista|vamos|dale|claro|perfecto|de una|s[ií]`)
  )
    return 'next';
  return null;
}
