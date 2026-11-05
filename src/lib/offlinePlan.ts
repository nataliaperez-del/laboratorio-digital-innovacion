/**
 * Plan de prototipado sin IA. Cuando no hay conexión, Prototipado sigue trabajando con lo que ya
 * está en el Contenedor: arma un plan base con los datos reales del fruto y de su árbol (problemas,
 * cadena de tendencias, solución e impacto) y con una secuencia de fases estándar según la madurez
 * elegida. Lo que el Contenedor no dice queda escrito «Por precisar»: nunca se inventa.
 * El plan queda marcado (`offline`) para completarlo con IA cuando vuelva la conexión.
 *
 * Funciones puras (probadas en tests/offlinePlan.test.ts).
 */
import { LEVEL_LABEL, routeOf, type TreeGraph, type TreeNode } from '@/lib/innovationTreeGraph';
import type { PrototypeBrief, PrototypePhase, PrototypePlan } from '@/services/prototyping';

export const OFFLINE_TAGLINE = 'Plan base armado sin IA con los datos del Contenedor. Complétalo con IA cuando vuelva la conexión.';

/** El fruto (u oportunidad) del que parte el plan y el árbol al que pertenece. */
export interface OfflineTreeSource {
  graph: TreeGraph;
  node: TreeNode;
}

const PENDING = 'Por precisar con el equipo';

const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text);
const sentence = (text: string) => {
  const t = text.trim();
  return t && !/[.!?…]$/.test(t) ? `${t}.` : t;
};

/** «TRL 4 · Validación en laboratorio» → «validación en laboratorio». */
function trlGoal(trl: string): string {
  const goal = trl.split('·')[1]?.trim();
  return goal ? goal.charAt(0).toLowerCase() + goal.slice(1) : trl;
}

/** Nodos de la cadena del fruto hasta el tronco, del más general al más concreto. */
function chainOf(source: OfflineTreeSource): TreeNode[] {
  const order: TreeNode['nivel'][] = ['tronco', 'global', 'nacional', 'territorial', 'hoja'];
  const route = routeOf(source.graph, source.node.codigo);
  return source.graph.nodos
    .filter((n) => route.has(n.codigo) && order.includes(n.nivel))
    .sort((a, b) => order.indexOf(a.nivel) - order.indexOf(b.nivel));
}

/** Fases estándar de un prototipo; la de validación cambia con la madurez que se busca. */
function standardPhases(trl: string, scope: string): PrototypePhase[] {
  return [
    {
      fase: 'Alistamiento y diseño',
      semanas: 'Semanas 1 a 2',
      actividades:
        'Precisar el problema con los actores del territorio, revisar la cadena del Árbol de Innovación y acordar los criterios de éxito del prototipo.',
      entregables: ['Ficha del problema validada con actores', 'Criterios de éxito acordados'],
    },
    {
      fase: 'Construcción del prototipo',
      semanas: 'Semanas 3 a 5',
      actividades: 'Construir la versión mínima de la solución con los componentes físicos, digitales y metodológicos que defina el equipo.',
      entregables: ['Prototipo en versión mínima', 'Registro de decisiones de diseño'],
    },
    {
      fase: 'Validación',
      semanas: 'Semanas 6 a 8',
      actividades: `Probar el prototipo hasta lograr la ${trlGoal(trl)}, con usuarios reales del alcance ${scope.toLowerCase()}, y medir los criterios de éxito.`,
      entregables: ['Informe de validación con resultados medidos', 'Retroalimentación de usuarios'],
    },
    {
      fase: 'Ajuste y transferencia',
      semanas: 'Semanas 9 a 10',
      actividades: 'Incorporar los ajustes de la validación y preparar la transferencia o el escalamiento con los aliados del territorio.',
      entregables: ['Prototipo ajustado', 'Plan de transferencia o escalamiento'],
    },
  ];
}

/**
 * Arma el plan base. `source` es el fruto del árbol cuando el plan parte del Contenedor; sin él,
 * se usa solo lo que la persona escribió (tema y contexto).
 */
export function buildOfflinePlan(brief: PrototypeBrief, source?: OfflineTreeSource, now: Date = new Date()): PrototypePlan {
  const topic = clip(brief.topic.trim(), 140);
  const node = source?.node;
  const chain = source ? chainOf(source) : [];
  const roots = source ? source.graph.nodos.filter((n) => n.nivel === 'raiz').slice(0, 3) : [];
  const contextLines = brief.context
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !/^cadena del árbol:?$/i.test(l));

  const solution = node?.solucion?.trim() || contextLines.find((l) => /^soluci[oó]n posible:/i.test(l))?.replace(/^soluci[oó]n posible:\s*/i, '') || '';
  const impact = node?.impacto_esperado?.trim() || contextLines.find((l) => /^impacto esperado:/i.test(l))?.replace(/^impacto esperado:\s*/i, '') || '';

  const problemSolved = roots.length
    ? `Problemas y brechas que identificó el Árbol de Innovación sobre «${source!.graph.tema}»: ${roots
        .map((r) => sentence(`${r.nombre}${r.descripcion ? `: ${r.descripcion}` : ''}`))
        .join(' ')}`
    : node?.descripcion?.trim()
      ? sentence(node.descripcion)
      : `${PENDING}: ¿qué problema del territorio resuelve «${topic}»?`;

  const hypothesis = `Si se desarrolla «${topic}»${solution ? ` mediante ${solution.charAt(0).toLowerCase()}${solution.slice(1).replace(/[.]$/, '')}` : ''}, entonces ${
    impact ? `se espera este impacto: ${impact.charAt(0).toLowerCase()}${impact.slice(1).replace(/[.]$/, '')},` : 'se atenderá el problema identificado'
  } en el alcance ${brief.scope.toLowerCase()}, y se podrá comprobar con las métricas de validación de este plan.`;

  const supuestos = [
    ...chain.map((n) => `${LEVEL_LABEL[n.nivel].split(' · ')[0]} «${n.nombre}» (evidencia ${n.evidencia}): confirmar que sigue vigente para el territorio.`),
    ...(node?.alertas ?? []).map((a) => sentence(a)),
  ];

  return {
    id: `proto-${now.getTime()}`,
    createdAt: now.toISOString(),
    origin: brief.origin,
    name: topic,
    tagline: OFFLINE_TAGLINE,
    category: brief.category,
    trlTarget: brief.trl,
    scope: brief.scope,
    targetAudience: `${PENDING}: población y actores del alcance «${brief.scope}».`,
    problemSolved,
    hypothesis,
    solution: solution ? sentence(solution) : contextLines.length ? sentence(clip(contextLines.join(' '), 600)) : `${PENDING}: describir la solución.`,
    architecture: {
      fisico: `${PENDING}: qué se construye o adecúa físicamente.`,
      digital: `${PENDING}: qué componente digital necesita (datos, aplicación, plataforma).`,
      metodologico: 'Ciclo de prototipado del Laboratorio: diseñar, construir, validar con usuarios y ajustar.',
    },
    phases: standardPhases(brief.trl, brief.scope),
    deliverables: [`Prototipo en ${brief.trl}`, 'Informe de validación', 'Plan de ajustes y transferencia'],
    durationWeeks: 10,
    unadSchools: [],
    validationMetrics: [
      'Cumplimiento de los criterios de éxito acordados en la fase 1',
      'Satisfacción de los usuarios de la prueba (escala de 1 a 5)',
      `Madurez alcanzada frente a la meta: ${brief.trl}`,
      ...(impact ? [`Avance en el impacto esperado: ${clip(impact, 160)}`] : []),
    ],
    risks: [
      {
        riesgo: 'Plan armado sin IA, con información parcial',
        mitigacion: 'Completarlo con «Armar el plan con IA» cuando vuelva la conexión y revisarlo con el equipo.',
      },
      {
        riesgo: 'Datos del territorio o de tendencias sin verificar',
        mitigacion: 'Contrastar la cadena del árbol y sus alertas con fuentes oficiales antes de citarlas.',
      },
      { riesgo: 'Baja participación de usuarios en la validación', mitigacion: 'Acordar desde la fase 1 quiénes prueban el prototipo y cuándo.' },
    ],
    supuestos,
    offline: true,
  };
}
