/**
 * Banco de insumos: de cada resultado se guarda, además del documento, lo más relevante en piezas
 * cortas y reutilizables (oportunidades, brechas, tendencias, temas, soluciones e hipótesis), para
 * que sirvan de punto de partida a otros ejercicios.
 *
 * Las piezas las elige un filtro con IA (`buildInsumosPrompt` + `normalizeInsumos`). Si la IA no
 * está disponible, se extraen con reglas de lo que el resultado ya trae estructurado
 * (`fallbackInsumos`): nunca se queda un resultado sin insumos por un fallo de la IA.
 *
 * Lógica pura; quien llama a la IA y envía es `src/services/labCollector.ts`.
 */
import { parseFoda } from '@/lib/territorialInsights';
import { parseThemeProposal } from '@/lib/themeProposal';
import type { SavedResult } from '@/lib/labData';
import { MODULE_METRIC_LABEL } from '@/lib/contenedorMetrics';

export const INSUMO_TYPES = ['oportunidad', 'brecha', 'tendencia', 'tema', 'solucion', 'hipotesis'] as const;
export type InsumoType = (typeof INSUMO_TYPES)[number];

export const INSUMO_LABEL: Record<InsumoType, string> = {
  oportunidad: 'Oportunidad',
  brecha: 'Brecha',
  tendencia: 'Tendencia',
  tema: 'Tema',
  solucion: 'Solución',
  hipotesis: 'Hipótesis',
};

export interface Insumo {
  tipo: InsumoType;
  titulo: string;
  descripcion: string;
  /** 1 (poco) a 5 (muy relevante para reutilizar). */
  relevancia: number;
  palabrasClave: string[];
}

export interface InsumosSelection {
  /** Síntesis del resultado en dos o tres frases. */
  sintesis: string;
  insumos: Insumo[];
  /** `ia`: los eligió el filtro con IA; `reglas`: salieron de la estructura del resultado. */
  origen: 'ia' | 'reglas';
}

export const MAX_INSUMOS = 8;
const MAX_FILTER_CHARS = 14_000;

const clean = (value: unknown, max: number) =>
  (typeof value === 'string' ? value : '')
    .replace(/[*_#`>|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);

/** El texto del resultado que lee el filtro: completo si cabe; si no, su inicio y su cierre. */
export function resultText(result: SavedResult): string {
  const { modulo, item } = result;
  const text =
    modulo === 'estudio'
      ? item.containerData
      : modulo === 'ideacion' || modulo === 'arbol'
        ? item.markdown
        : [
            `Nombre: ${item.name}`,
            `Problema: ${item.problemSolved}`,
            `Hipótesis: ${item.hypothesis}`,
            `Solución: ${item.solution}`,
            `Público: ${item.targetAudience}`,
            `Métricas: ${item.validationMetrics.join('; ')}`,
            `Riesgos: ${item.risks.map((r) => r.riesgo).join('; ')}`,
          ].join('\n');
  if (text.length <= MAX_FILTER_CHARS) return text;
  const head = Math.floor(MAX_FILTER_CHARS * 0.7);
  return `${text.slice(0, head)}\n[…]\n${text.slice(-(MAX_FILTER_CHARS - head))}`;
}

/** Prompt del filtro: pide solo lo que otra persona podría reutilizar, en JSON. */
export function buildInsumosPrompt(result: SavedResult, title: string, place: string): string {
  return `
Eres curador del banco de insumos de un laboratorio de innovación universitario. Lee el resultado y elige SOLO lo más relevante y reutilizable: lo que a otro equipo le serviría como punto de partida para un nuevo ejercicio.

RESULTADO: ${MODULE_METRIC_LABEL[result.modulo]} — ${title}
TERRITORIO: ${place || 'sin territorio indicado'}

REGLAS:
- Entre 3 y ${MAX_INSUMOS} insumos. Menos y mejores: descarta lo genérico, lo repetido y lo que no se sostiene en el texto.
- Cada insumo debe entenderse solo, sin leer el documento: di qué es, dónde aplica y por qué importa.
- No inventes datos, cifras ni fuentes que no estén en el texto. Si algo es una hipótesis, clasifícalo como "hipotesis".
- No incluyas nombres de personas ni datos personales.
- "tipo" es uno de: ${INSUMO_TYPES.join(', ')}.
- "relevancia" de 1 a 5: 5 si es específico, sustentado y aprovechable de inmediato.

TEXTO DEL RESULTADO:
${resultText(result)}

Responde ÚNICAMENTE con un objeto JSON válido, sin texto alrededor:
{
  "sintesis": "dos o tres frases que resuman el resultado",
  "insumos": [
    { "tipo": "oportunidad", "titulo": "título breve", "descripcion": "una o dos frases", "relevancia": 4, "palabrasClave": ["...", "..."] }
  ]
}
`.trim();
}

/** Valida lo que devolvió la IA; devuelve null si no hay ningún insumo utilizable. */
export function normalizeInsumos(raw: unknown): InsumosSelection | null {
  const r = (raw ?? {}) as Record<string, unknown>;
  const insumos = (Array.isArray(r.insumos) ? r.insumos : [])
    .map((x): Insumo | null => {
      const o = (x ?? {}) as Record<string, unknown>;
      const tipo = clean(o.tipo, 20)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '') as InsumoType;
      const titulo = clean(o.titulo, 160);
      const descripcion = clean(o.descripcion, 600);
      if (!INSUMO_TYPES.includes(tipo) || !titulo || !descripcion) return null;
      const relevancia = Math.round(Number(o.relevancia));
      return {
        tipo,
        titulo,
        descripcion,
        relevancia: Number.isFinite(relevancia) ? Math.min(5, Math.max(1, relevancia)) : 3,
        palabrasClave: (Array.isArray(o.palabrasClave) ? o.palabrasClave : [])
          .map((k) => clean(k, 40).toLowerCase())
          .filter(Boolean)
          .slice(0, 6),
      };
    })
    .filter((x): x is Insumo => x !== null)
    .sort((a, b) => b.relevancia - a.relevancia)
    .slice(0, MAX_INSUMOS);
  return insumos.length ? { sintesis: clean(r.sintesis, 700), insumos, origen: 'ia' } : null;
}

const piece = (tipo: InsumoType, titulo: string, descripcion: string, relevancia = 3): Insumo | null => {
  const t = clean(titulo, 160);
  const d = clean(descripcion, 600) || t;
  return t ? { tipo, titulo: t, descripcion: d, relevancia, palabrasClave: [] } : null;
};

/** Primera frase como título, para los elementos que solo traen un texto. */
const lead = (text: string) => clean(text, 400).split(/(?<=[.;:])\s/)[0].slice(0, 120);

/** Sin IA: los insumos salen de lo que el resultado ya trae estructurado. */
export function fallbackInsumos(result: SavedResult): InsumosSelection {
  const out: Array<Insumo | null> = [];
  let sintesis = '';
  if (result.modulo === 'estudio') {
    const foda = parseFoda(result.item.containerData);
    for (const o of foda?.oportunidades.slice(0, 4) ?? []) out.push(piece('oportunidad', lead(o), o));
    for (const d of foda?.debilidades.slice(0, 3) ?? []) out.push(piece('brecha', lead(d), d));
    sintesis = `Estudio Territorial de ${result.item.territoryName}${result.item.department ? `, ${result.item.department}` : ''}.`;
  } else if (result.modulo === 'ideacion') {
    const proposal = parseThemeProposal(result.item.markdown);
    proposal?.themes.forEach((theme, i) => out.push(piece('tema', theme.title, theme.body, i === result.item.selectedThemeIndex ? 5 : 3)));
    sintesis = `Ideación sobre ${result.item.topicName}.`;
  } else if (result.modulo === 'arbol') {
    const nodes = result.item.graph?.nodos ?? [];
    for (const n of nodes.filter((x) => x.nivel === 'fruto').slice(0, 3)) out.push(piece('solucion', n.nombre, n.solucion || n.descripcion, 4));
    for (const n of nodes.filter((x) => x.nivel === 'hoja').slice(0, 3)) out.push(piece('oportunidad', n.nombre, n.descripcion));
    for (const n of nodes.filter((x) => x.nivel === 'territorial').slice(0, 2)) out.push(piece('tendencia', n.nombre, n.descripcion));
    sintesis = `Árbol de Innovación sobre ${result.item.theme}.`;
  } else {
    const p = result.item;
    out.push(piece('solucion', p.name, p.solution || p.problemSolved, 4));
    out.push(piece('hipotesis', lead(p.hypothesis), p.hypothesis));
    sintesis = clean(p.tagline || p.problemSolved, 300);
  }
  return { sintesis, insumos: out.filter((x): x is Insumo => x !== null).slice(0, MAX_INSUMOS), origen: 'reglas' };
}

/** Un insumo como texto de partida para otra herramienta. */
export function insumoAsInput(insumo: Pick<Insumo, 'tipo' | 'titulo' | 'descripcion'>, place?: string): string {
  return [`Insumo del banco del Laboratorio (${INSUMO_LABEL[insumo.tipo]}): ${insumo.titulo}`, insumo.descripcion, place ? `Territorio de origen: ${place}.` : '']
    .filter(Boolean)
    .join('\n');
}
