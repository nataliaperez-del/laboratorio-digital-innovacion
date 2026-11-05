/**
 * Encuesta de satisfacción del Laboratorio: tres preguntas obligatorias antes de entregar un
 * documento en Word o PDF. Mide lo que más importa de un resultado: si sirve (utilidad), si fue
 * fácil obtenerlo (esfuerzo) y si la persona lo recomendaría (NPS). Las respuestas alimentan el
 * tablero de métricas del Contenedor de resultados.
 *
 * Funciones puras (probadas en tests/satisfaction.test.ts).
 */
import type { LabReport } from '@/lib/labReports';
import type { SurveyResponse } from '@/store/useStore';

export type SurveyField = 'utilidad' | 'facilidad' | 'recomendacion';

export interface SurveyQuestion {
  field: SurveyField;
  question: string;
  min: number;
  max: number;
  /** Rótulo de los extremos de la escala. */
  low: string;
  high: string;
}

export const SATISFACTION_QUESTIONS: readonly SurveyQuestion[] = [
  { field: 'utilidad', question: '¿Qué tan útil es este resultado para tu proyecto?', min: 1, max: 5, low: 'Nada útil', high: 'Muy útil' },
  { field: 'facilidad', question: '¿Qué tan fácil fue obtenerlo en el Laboratorio?', min: 1, max: 5, low: 'Muy difícil', high: 'Muy fácil' },
  {
    field: 'recomendacion',
    question: 'Del 0 al 10, ¿qué tan probable es que recomiendes el Laboratorio a un colega?',
    min: 0,
    max: 10,
    low: 'Nada probable',
    high: 'Muy probable',
  },
];

/** Respuestas en curso: una nota por pregunta, o null si falta. */
export type SurveyAnswers = Record<SurveyField, number | null>;

export const EMPTY_ANSWERS: SurveyAnswers = { utilidad: null, facilidad: null, recomendacion: null };

/** ¿Están las tres respondidas y dentro de su escala? */
export function isComplete(answers: SurveyAnswers): answers is Record<SurveyField, number> {
  return SATISFACTION_QUESTIONS.every((q) => {
    const v = answers[q.field];
    return typeof v === 'number' && Number.isInteger(v) && v >= q.min && v <= q.max;
  });
}

/** Huella corta y estable de un texto (FNV-1a de 32 bits). */
function fingerprint(text: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

/**
 * Identifica un documento por su herramienta, su nombre y su contenido: el mismo documento en
 * Word y en PDF se evalúa una vez; si se rehace y cambia, se vuelve a preguntar.
 */
export function documentKey(report: Pick<LabReport, 'module' | 'fileName' | 'markdown'>): string {
  return `${report.module}:${report.fileName}:${fingerprint(report.markdown)}`;
}

/** ¿Falta evaluar este documento antes de entregarlo? */
export function needsSurvey(responses: readonly Pick<SurveyResponse, 'docKey'>[], docKey: string): boolean {
  return !responses.some((r) => r.docKey === docKey);
}

/** Net Promoter Score: % de promotores (9-10) menos % de detractores (0-6), de -100 a 100. */
export function netPromoterScore(scores: readonly number[]): number | null {
  if (!scores.length) return null;
  const promoters = scores.filter((s) => s >= 9).length;
  const detractors = scores.filter((s) => s <= 6).length;
  return Math.round(((promoters - detractors) / scores.length) * 100);
}

/** Cómo leer el NPS, con los rangos de uso común. */
export function npsReading(nps: number): string {
  if (nps >= 70) return 'excelente';
  if (nps >= 50) return 'muy bueno';
  if (nps >= 0) return 'positivo';
  return 'por mejorar';
}
