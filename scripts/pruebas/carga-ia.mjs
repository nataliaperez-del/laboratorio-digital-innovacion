/**
 * Prueba de carga de la IA institucional: cuántas consultas simultáneas aguanta la pasarela
 * UNAD IA 360 a través de `/api/unad-gemini`, y con qué tiempos.
 *
 * CONSUME CUOTA REAL de la pasarela. No se ejecuta sin `--autorizado`: coordínala antes con quien
 * la administra (hora, tope de consultas y a quién avisar si algo se degrada).
 *
 * Cada consulta es una pregunta corta, como las que recibe ZOE. Las etapas suben de a poco y la
 * prueba se detiene sola cuando falla más del 20 % de una etapa: ese es el punto de quiebre.
 *
 * Uso:
 *   node scripts/pruebas/carga-ia.mjs --autorizado                      # 5, 10 y 20 simultáneas
 *   node scripts/pruebas/carga-ia.mjs --autorizado --etapas 10,25,50,100
 *   node scripts/pruebas/carga-ia.mjs --autorizado --url http://localhost:3000 --etapas 3
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { performance } from 'node:perf_hooks';

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

if (!args.includes('--autorizado')) {
  console.error(
    'Esta prueba consume cuota real de la pasarela UNAD IA 360.\nCoordínala con quien la administra y ejecútala con --autorizado.\nEjemplo: node scripts/pruebas/carga-ia.mjs --autorizado --etapas 5,10,20',
  );
  process.exit(1);
}

const BASE = option('url', 'https://laboratorio-digital-innovacion.vercel.app').replace(/\/$/, '');
const STAGES = option('etapas', '5,10,20')
  .split(',')
  .map((n) => Number(n.trim()))
  .filter((n) => n > 0);
const TIMEOUT_MS = Number(option('espera', '90000'));
const QUESTIONS = [
  '¿Qué es un árbol de innovación? Responde en dos frases.',
  'Dame una idea breve para aprovechar residuos de café en una comunidad rural.',
  '¿Qué significa TRL 4? Responde en una frase.',
  'Explica en dos frases qué es una matriz FODA.',
];

async function ask(i) {
  const started = performance.now();
  try {
    const response = await fetch(`${BASE}/api/unad-gemini`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      body: JSON.stringify({
        contents: [{ parts: [{ text: QUESTIONS[i % QUESTIONS.length] }] }],
        generationConfig: { maxOutputTokens: 256, thinkingConfig: { thinkingBudget: 0 } },
      }),
    });
    const text = await response.text();
    // Un 200 sin texto de respuesta también es un fallo para quien pregunta.
    const answered = response.ok && /"text"\s*:/.test(text);
    return { ok: answered, status: answered ? 200 : response.ok ? 'sin respuesta' : response.status, ms: performance.now() - started };
  } catch (e) {
    return { ok: false, status: e?.name === 'TimeoutError' ? 'tiempo agotado' : 'sin conexión', ms: performance.now() - started };
  }
}

const percentile = (sorted, p) => (sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))] : 0);

console.log(`Sitio: ${BASE}\nEtapas (consultas simultáneas): ${STAGES.join(', ')}\n`);
const results = [];
for (const stage of STAGES) {
  process.stdout.write(`→ ${stage} consultas simultáneas… `);
  const answers = await Promise.all(Array.from({ length: stage }, (_, i) => ask(i)));
  const times = answers
    .filter((a) => a.ok)
    .map((a) => a.ms)
    .sort((a, b) => a - b);
  const statuses = {};
  for (const a of answers) statuses[a.status] = (statuses[a.status] ?? 0) + 1;
  const failed = answers.filter((a) => !a.ok).length;
  const result = {
    consultas: stage,
    fallidas: failed,
    porcentajeFallo: Math.round((failed / stage) * 1000) / 10,
    p50s: Math.round(percentile(times, 50) / 100) / 10,
    p95s: Math.round(percentile(times, 95) / 100) / 10,
    maxS: Math.round((times.at(-1) ?? 0) / 100) / 10,
    respuestas: JSON.stringify(statuses),
  };
  results.push(result);
  console.log(`${failed} fallidas (${result.porcentajeFallo} %), p50 ${result.p50s} s, p95 ${result.p95s} s`);
  if (result.porcentajeFallo > 20) {
    console.log('  Más del 20 % de fallos: se detiene aquí. Este es el punto de quiebre de la pasarela.');
    break;
  }
  await new Promise((r) => setTimeout(r, 10000));
}

console.table(results);
mkdirSync('resultados-pruebas', { recursive: true });
const file = `resultados-pruebas/carga-ia-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`;
writeFileSync(file, JSON.stringify({ sitio: BASE, etapas: results }, null, 2));
console.log(`Resultado guardado en ${file}`);
