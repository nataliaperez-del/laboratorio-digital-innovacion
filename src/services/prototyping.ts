/**
 * Prototipado: arma un plan completo con IA a partir de una idea libre, de un fruto del
 * Árbol de Innovación, de un tema de Ideación o de una señal del Observatorio. Si el
 * modelo falla se informa el error: nunca se rellena con un plan de plantilla.
 */
import { beginGenerationFlow, callAI, defaultCallOptions, parseJsonResponse } from '@/services/ai';
import { useStore } from '@/store/useStore';
import { assertSafeInput } from '@/lib/ethicsGuard';
import { LAB_SCOPE_RULES } from '@/prompts/labGuardrails';
import { UNAD_ESCUELAS } from '@/constants/unadEscuelas';
import { formatFichaCompact } from '@/services/ideation';

/** Tipos de prototipo que ofrece el formulario de Prototipado. */
export const PROTOTYPE_CATEGORIES = ['Prototipo Tecnológico', 'Servicio de Innovación', 'Proyecto Territorial', 'Transferencia Tecnológica'] as const;
/** Uno de los tipos de `PROTOTYPE_CATEGORIES`. */
export type PrototypeCategory = (typeof PROTOTYPE_CATEGORIES)[number];

/** Niveles de madurez tecnológica (TRL, escala de la NASA) que se pueden fijar como meta: de la prueba de concepto (3) a la demostración real (6). */
export const TRL_OPTIONS = [
  'TRL 3 · Prueba de concepto experimental',
  'TRL 4 · Validación en laboratorio',
  'TRL 5 · Validación en entorno relevante',
  'TRL 6 · Demostración en entorno real',
] as const;

/** Alcances territoriales posibles del prototipo. */
export const SCOPE_OPTIONS = ['Local y comunitario', 'Municipal y zonal', 'Regional o departamental', 'Nacional'] as const;

/** De dónde viene la idea: escrita, un fruto del Árbol, la Ideación o una señal del Observatorio. */
export type PrototypeOriginKind = 'idea' | 'arbol' | 'ideacion' | 'observatorio';

/** Origen de la idea con su rótulo, para mostrarlo en el plan. */
export interface PrototypeOrigin {
  kind: PrototypeOriginKind;
  /** Código del fruto cuando viene del árbol. */
  code?: string;
  label: string;
}

/** Lo que la persona pide: idea, tipo, meta TRL, alcance y origen. */
export interface PrototypeBrief {
  origin: PrototypeOrigin;
  topic: string;
  /** Cadena del árbol, justificación del tema o contexto escrito por el usuario. */
  context: string;
  category: PrototypeCategory;
  trl: string;
  scope: string;
}

/** Una fase del cronograma del plan. */
export interface PrototypePhase {
  fase: string;
  semanas: string;
  actividades: string;
  entregables: string[];
}

/** Plan de prototipado completo: hipótesis, arquitectura, fases, métricas, riesgos y madurez. */
export interface PrototypePlan {
  id: string;
  createdAt: string;
  origin: PrototypeOrigin;
  name: string;
  tagline: string;
  category: PrototypeCategory;
  trlTarget: string;
  scope: string;
  targetAudience: string;
  problemSolved: string;
  hypothesis: string;
  solution: string;
  architecture: { fisico: string; digital: string; metodologico: string };
  phases: PrototypePhase[];
  deliverables: string[];
  durationWeeks: number;
  unadSchools: string[];
  validationMetrics: string[];
  risks: Array<{ riesgo: string; mitigacion: string }>;
  supuestos: string[];
  /** Plan base armado sin IA con lo que hay en el Contenedor (`src/lib/offlinePlan.ts`): se completa con IA después. */
  offline?: boolean;
}

function buildPrompt(brief: PrototypeBrief, fichaBlock: string): string {
  return `
${LAB_SCOPE_RULES}

Actúas como arquitecto de innovación del Laboratorio. Diseña un plan de prototipado riguroso y realista.

TEMA O IDEA A PROTOTIPAR: ${brief.topic}
ORIGEN: ${brief.origin.label}
${brief.context.trim() ? `CONTEXTO DEL ORIGEN:\n${brief.context.trim()}\n` : ''}
CATEGORÍA: ${brief.category}
MADUREZ OBJETIVO: ${brief.trl}
ALCANCE DE VALIDACIÓN: ${brief.scope}
TERRITORIO:
${fichaBlock}

ESCUELAS DE LA UNAD DISPONIBLES (usa estos nombres): ${UNAD_ESCUELAS.join('; ')}.

REGLAS:
- No inventes cifras de resultado como si ya estuvieran medidas: las métricas son metas a validar y deben decir cómo se miden.
- Las metas numéricas se justifican por el alcance y la madurez; lo que no puedas sustentar va en "supuestos".
- Componentes, costos y plazos deben ser coherentes con el alcance indicado. Omite la capa física o digital escribiendo "No aplica" si no corresponde.
- Entre 3 y 6 fases, con semanas consecutivas que sumen "durationWeeks".

Responde ÚNICAMENTE con un objeto JSON válido, sin texto alrededor, con esta forma:
{
  "name": "nombre concreto y técnico",
  "tagline": "frase breve",
  "targetAudience": "población y organizaciones beneficiarias",
  "problemSolved": "problema específico",
  "hypothesis": "hipótesis central a validar, falsable",
  "solution": "descripción técnica de la solución",
  "architecture": { "fisico": "...", "digital": "...", "metodologico": "..." },
  "durationWeeks": 8,
  "unadSchools": ["..."],
  "phases": [{ "fase": "...", "semanas": "Semanas 1-2", "actividades": "...", "entregables": ["..."] }],
  "deliverables": ["..."],
  "validationMetrics": ["métrica, meta y forma de medirla"],
  "risks": [{ "riesgo": "...", "mitigacion": "..." }],
  "supuestos": ["..."]
}
`.trim();
}

const text = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');
const strings = (v: unknown): string[] => (Array.isArray(v) ? v.map(text).filter(Boolean) : []);

/** Valida la respuesta del modelo; lanza si faltan las piezas que hacen de esto un plan. */
export function normalizePrototypePlan(raw: unknown, brief: PrototypeBrief): PrototypePlan {
  const r = (raw ?? {}) as Record<string, unknown>;
  const arch = (r.architecture ?? {}) as Record<string, unknown>;
  const phases = (Array.isArray(r.phases) ? r.phases : [])
    .map((p: Record<string, unknown>) => ({
      fase: text(p?.fase),
      semanas: text(p?.semanas),
      actividades: text(p?.actividades),
      entregables: strings(p?.entregables),
    }))
    .filter((p) => p.fase);
  const name = text(r.name);
  const hypothesis = text(r.hypothesis);
  const missing = [!name && 'nombre', !hypothesis && 'hipótesis', !phases.length && 'fases'].filter(Boolean);
  if (missing.length) throw new Error(`El plan generado quedó incompleto (falta: ${missing.join(', ')}). Vuelve a intentarlo.`);

  return {
    id: `proto-${Date.now()}`,
    createdAt: new Date().toISOString(),
    origin: brief.origin,
    name,
    tagline: text(r.tagline),
    category: brief.category,
    trlTarget: brief.trl,
    scope: brief.scope,
    targetAudience: text(r.targetAudience),
    problemSolved: text(r.problemSolved),
    hypothesis,
    solution: text(r.solution),
    architecture: { fisico: text(arch.fisico), digital: text(arch.digital), metodologico: text(arch.metodologico) },
    phases,
    deliverables: strings(r.deliverables),
    durationWeeks: Number(r.durationWeeks) > 0 ? Math.round(Number(r.durationWeeks)) : 0,
    unadSchools: strings(r.unadSchools),
    validationMetrics: strings(r.validationMetrics),
    risks: (Array.isArray(r.risks) ? r.risks : [])
      .map((x: Record<string, unknown>) => ({ riesgo: text(x?.riesgo), mitigacion: text(x?.mitigacion) }))
      .filter((x) => x.riesgo),
    supuestos: strings(r.supuestos),
  };
}

/** Pide a la IA el plan de prototipado (JSON) y lo normaliza; lanza si la idea está vacía o la IA falla. */
export async function generatePrototypePlan(brief: PrototypeBrief): Promise<PrototypePlan> {
  beginGenerationFlow();
  if (!brief.topic.trim()) throw new Error('Escribe la idea o elige un fruto del árbol para armar el plan.');
  assertSafeInput(brief.topic, brief.context);
  const { aiProvider, prompt0Data } = useStore.getState();
  const raw = await callAI(buildPrompt(brief, formatFichaCompact(prompt0Data)), defaultCallOptions(aiProvider));
  return normalizePrototypePlan(parseJsonResponse(raw), brief);
}
