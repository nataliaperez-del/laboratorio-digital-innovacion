/**
 * Pasar un nodo del árbol o un plan de prototipo a texto corregible y de vuelta: lo que el grupo
 * edita a mano («Nombre: …», «Hipótesis: …») se convierte otra vez en los campos del resultado.
 * Se prueba en tests/reviewEdit.test.ts.
 */
import type { TreeNode } from '@/lib/innovationTreeGraph';
import type { PrototypePlan } from '@/services/prototyping';

/** Parte un texto por líneas «Etiqueta: valor»; lo que sigue a una etiqueta (varias líneas) es su valor. */
export function parseLabeled(text: string, labels: readonly string[]): Record<string, string> {
  const out: Record<string, string> = {};
  const wanted = new Map(labels.map((l) => [l.toLowerCase(), l]));
  let current: string | null = null;
  for (const raw of text.split(/\r?\n/)) {
    const match = /^\s*([^:\n]{2,40}):\s?(.*)$/.exec(raw);
    const label = match ? wanted.get(match[1].trim().toLowerCase()) : undefined;
    if (label && match) {
      current = label;
      out[label] = match[2];
    } else if (current) {
      out[current] += `\n${raw}`;
    }
  }
  for (const key of Object.keys(out)) out[key] = out[key].trim();
  return out;
}

const NODE_LABELS = ['Nombre', 'Descripción', 'Solución', 'Impacto esperado'] as const;

/** El nodo como texto para corregir. */
export function nodeToText(node: TreeNode): string {
  return [`Nombre: ${node.nombre}`, `Descripción: ${node.descripcion}`, ...(node.solucion !== undefined ? [`Solución: ${node.solucion}`] : []), ...(node.impacto_esperado !== undefined ? [`Impacto esperado: ${node.impacto_esperado}`] : [])].join('\n');
}

/** Lo corregido de un nodo; solo toca los campos que el texto trae. Un nombre vacío no se acepta. */
export function nodePatchFromText(text: string): Partial<Pick<TreeNode, 'nombre' | 'descripcion' | 'solucion' | 'impacto_esperado'>> {
  const f = parseLabeled(text, NODE_LABELS);
  const patch: Partial<Pick<TreeNode, 'nombre' | 'descripcion' | 'solucion' | 'impacto_esperado'>> = {};
  if (f['Nombre']) patch.nombre = f['Nombre'];
  if ('Descripción' in f) patch.descripcion = f['Descripción'];
  if ('Solución' in f) patch.solucion = f['Solución'];
  if ('Impacto esperado' in f) patch.impacto_esperado = f['Impacto esperado'];
  return patch;
}

const list = (items: readonly string[]) => items.map((i) => `- ${i}`).join('\n');
const unlist = (value: string | undefined) =>
  (value ?? '')
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*[-•*]\s*/, '').trim())
    .filter(Boolean);

const PLAN_LABELS = ['Nombre', 'Eslogan', 'A quién sirve', 'Problema que resuelve', 'Hipótesis', 'Solución', 'Entregables', 'Métricas de validación', 'Supuestos'] as const;

/** Los campos del plan que el grupo decide y corrige a mano. */
export function planToEditText(plan: PrototypePlan): string {
  return [
    `Nombre: ${plan.name}`,
    `Eslogan: ${plan.tagline}`,
    `A quién sirve: ${plan.targetAudience}`,
    `Problema que resuelve: ${plan.problemSolved}`,
    `Hipótesis: ${plan.hypothesis}`,
    `Solución: ${plan.solution}`,
    `Entregables:\n${list(plan.deliverables)}`,
    `Métricas de validación:\n${list(plan.validationMetrics)}`,
    `Supuestos:\n${list(plan.supuestos)}`,
  ].join('\n');
}

/** Lo corregido del plan; las etiquetas que falten no cambian nada. Un nombre vacío no se acepta. */
export function planPatchFromText(text: string): Partial<PrototypePlan> {
  const f = parseLabeled(text, PLAN_LABELS);
  const patch: Partial<PrototypePlan> = {};
  if (f['Nombre']) patch.name = f['Nombre'];
  if ('Eslogan' in f) patch.tagline = f['Eslogan'];
  if ('A quién sirve' in f) patch.targetAudience = f['A quién sirve'];
  if ('Problema que resuelve' in f) patch.problemSolved = f['Problema que resuelve'];
  if ('Hipótesis' in f) patch.hypothesis = f['Hipótesis'];
  if ('Solución' in f) patch.solution = f['Solución'];
  if ('Entregables' in f) patch.deliverables = unlist(f['Entregables']);
  if ('Métricas de validación' in f) patch.validationMetrics = unlist(f['Métricas de validación']);
  if ('Supuestos' in f) patch.supuestos = unlist(f['Supuestos']);
  return patch;
}

/** El plan completo como texto para copiar (con fases, riesgos y arquitectura). */
export function planToCopyText(plan: PrototypePlan): string {
  return [
    planToEditText(plan),
    `Categoría: ${plan.category} · Madurez: ${plan.trlTarget} · Alcance: ${plan.scope} · Duración: ${plan.durationWeeks} semanas`,
    `Arquitectura:\n- Físico: ${plan.architecture.fisico}\n- Digital: ${plan.architecture.digital}\n- Metodológico: ${plan.architecture.metodologico}`,
    `Fases:\n${plan.phases.map((p) => `- ${p.fase} (${p.semanas} semanas): ${p.actividades}${p.entregables.length ? ` Entregables: ${p.entregables.join('; ')}.` : ''}`).join('\n')}`,
    `Riesgos:\n${plan.risks.map((r) => `- ${r.riesgo} → ${r.mitigacion}`).join('\n')}`,
  ].join('\n\n');
}

/** El nodo completo como texto para copiar. */
export function nodeToCopyText(node: TreeNode): string {
  return [`${node.codigo} · ${node.nivel}`, nodeToText(node), node.fuentes.length ? `Fuentes:\n${list(node.fuentes)}` : ''].filter(Boolean).join('\n');
}
