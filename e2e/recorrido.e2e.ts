/**
 * Recorrido del Laboratorio de punta a punta, como lo haría un grupo en el taller.
 *
 * - «pantallas»: abre cada herramienta y comprueba que carga, que el Radar aporta tendencias y que
 *   no hay errores. No usa la IA: corre en segundos (`npm run e2e`).
 * - «recorrido con IA»: Estudio Territorial → Ideación → Árbol → Prototipado con la IA real, midiendo
 *   cuánto tarda cada paso. Consume cuota de la pasarela y dura varios minutos, así que solo corre
 *   con `npm run e2e:ia`. El resultado queda en `resultados-pruebas/recorrido-*.json`.
 */
import { expect, test, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const WITH_AI = process.env.E2E_IA === '1';
/** Dónde quedan los informes en PDF de cada fase del recorrido con IA. */
const PDF_DIR = process.env.E2E_PDF_DIR || join(homedir(), 'Downloads');
const TOOLS: Array<{ route: string; heading: string; radar: boolean }> = [
  { route: 'portal', heading: '', radar: false },
  { route: 'radar', heading: 'Radar', radar: false },
  { route: 'estudio', heading: 'Identificar Oportunidades', radar: true },
  { route: 'ideacion', heading: 'Crear Conceptos', radar: true },
  { route: 'arbol', heading: 'Validar Conceptos', radar: true },
  { route: 'prototipado', heading: 'Desarrollar Soluciones', radar: true },
  { route: 'banco', heading: 'Contenedor', radar: false },
];

/** Errores de la página que sí importan: los de red de desarrollo (recarga en caliente) no cuentan. */
function watchErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error' && !/WebSocket|favicon|net::ERR/i.test(m.text())) errors.push(m.text());
  });
  return errors;
}

async function open(page: Page, route: string) {
  await page.goto(`/#/${route}`);
  await page.locator('main').first().waitFor();
}

test('pantallas: cada herramienta carga y el Radar le aporta tendencias', async ({ page }) => {
  const errors = watchErrors(page);
  for (const tool of TOOLS) {
    await open(page, tool.route);
    if (tool.heading) await expect(page.getByRole('heading', { name: new RegExp(tool.heading, 'i') }).first()).toBeVisible();
    if (tool.radar) {
      const trends = page.getByRole('region', { name: 'Tendencias del Radar' });
      await expect(trends).toBeVisible();
      // Con el Radar disponible hay tendencias; si no responde, el bloque lo dice y la herramienta sigue.
      await expect(trends.locator('button.lab-chip').first().or(trends.getByText(/no respondió/))).toBeVisible({ timeout: 20_000 });
    }
  }
  expect(errors, `Errores en la página:\n${errors.join('\n')}`).toEqual([]);
});

test('una tendencia del Radar se puede usar como punto de partida', async ({ page }) => {
  await open(page, 'ideacion');
  const trends = page.getByRole('region', { name: 'Tendencias del Radar' });
  const chip = trends.locator('button.lab-chip').first();
  await chip.waitFor({ timeout: 20_000 });
  const name = (await chip.innerText()).replace(/·\s*afín/, '').trim();
  await chip.click();
  await trends.getByRole('button', { name: 'Partir de esta tendencia' }).click();
  // La herramienta pasa a «Señal del Observatorio» con esa señal elegida.
  await expect(page.getByRole('button', { name: new RegExp(name.slice(0, 20).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), pressed: true })).toBeVisible();
});

test('recorrido con IA: del Estudio Territorial al Prototipado', async ({ page }) => {
  test.skip(!WITH_AI, 'Usa la IA real: ejecútalo con «npm run e2e:ia».');
  test.setTimeout(60 * 60_000);
  const errors = watchErrors(page);
  const steps: Array<{ paso: string; segundos: number }> = [];

  /** Hace clic, espera el resultado y anota cuánto tardó. Si la herramienta muestra un error, falla con su texto. */
  const timed = async (paso: string, start: () => Promise<void>, done: ReturnType<Page['locator']>, minutes: number) => {
    const started = Date.now();
    await start();
    const alert = page.getByRole('alert').first();
    await expect(done.or(alert)).toBeVisible({ timeout: minutes * 60_000 });
    if (await alert.isVisible()) throw new Error(`${paso}: ${await alert.innerText()}`);
    steps.push({ paso, segundos: Math.round((Date.now() - started) / 1000) });
    console.log(`${paso}: ${steps.at(-1)!.segundos} s`);
  };

  // El informe formal se abre en una ventana para imprimir: aquí se guarda como PDF en vez de imprimirse.
  await page.context().addInitScript(() => {
    window.print = () => undefined;
  });
  const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
  const pdfs: string[] = [];
  /** Guarda el informe formal de la herramienta abierta. Si falla, lo anota y el recorrido sigue. */
  const savePdf = async (name: string) => {
    const file = join(PDF_DIR, `Taller-IA_${stamp}_${name}.pdf`);
    try {
      const opened = page.context().waitForEvent('page', { timeout: 45_000 });
      opened.catch(() => undefined);
      await page.getByRole('button', { name: 'Descargar informe en PDF' }).first().click();
      // La primera descarga de cada documento pide la encuesta de satisfacción: se responde y se envía.
      const survey = page.getByRole('dialog');
      if (await survey.waitFor({ timeout: 4000 }).then(() => true, () => false)) {
        for (const group of await survey.getByRole('radiogroup').all()) await group.locator('button').last().click();
        await survey.getByRole('button', { name: /Enviar y descargar/ }).click();
      }
      const report = await opened;
      await report.waitForLoadState('load');
      await report.waitForTimeout(1500);
      await report.pdf({ path: file, format: 'A4', printBackground: true, margin: { top: '15mm', bottom: '15mm', left: '15mm', right: '15mm' } });
      await report.close();
      pdfs.push(file);
      console.log(`PDF guardado: ${file}`);
    } catch (e) {
      console.log(`No se pudo guardar el PDF de ${name}: ${e instanceof Error ? e.message.split(/\r?\n/)[0] : e}`);
      // Que una encuesta abierta no tape la herramienta siguiente.
      await page.getByRole('dialog').getByRole('button', { name: 'Cancelar', exact: true }).click({ timeout: 2000 }).catch(() => undefined);
      // Respaldo: la pantalla tal como se ve.
      await page.pdf({ path: file, format: 'A4', printBackground: true }).then(() => pdfs.push(file)).catch(() => undefined);
    }
  };

  try {
    // 1. Estudio Territorial: ficha y generación.
    await open(page, 'estudio');
    await page.locator('#ficha-nombre').fill('Taller de prueba');
    await page.locator('#ficha-zona').selectOption({ index: 1 });
    await page.locator('#ficha-depto').selectOption({ label: 'Boyacá' });
    await page.locator('#ficha-muni').selectOption({ label: 'Duitama' });
    await page.getByRole('button', { name: 'Guardar ficha' }).click();
    await page.getByRole('button', { name: 'Sin fuentes propias' }).click();
    const toIdeation = page.getByRole('button', { name: /Llevar a Crear Conceptos/ });
    await timed('Estudio Territorial', () => page.getByRole('button', { name: 'Generar Estudio Territorial' }).click(), toIdeation, 30);
    await expect(page.getByRole('region', { name: 'Tendencias del Radar' })).toBeVisible();
    await savePdf('1_Estudio-Territorial');

    // 2. Ideación a partir del estudio: vocación y tres temas.
    await toIdeation.click();
    const choose = page.getByRole('button', { name: 'Elegir este tema' }).first();
    await timed('Ideación', () => page.getByRole('button', { name: 'Generar vocación y 3 temas' }).click(), choose, 10);
    await expect(page.getByRole('button', { name: 'Elegir este tema' })).toHaveCount(3);
    await savePdf('2_Ideacion');

    // 3. Árbol de Innovación del tema elegido.
    await choose.click();
    await page.getByRole('button', { name: /Construir su Árbol/ }).click();
    await timed('Árbol de Innovación', () => page.getByRole('button', { name: 'Construir el árbol con IA' }).click(), page.getByLabel('Resumen del árbol'), 20);
    await savePdf('3_Arbol-de-Innovacion');

    // 4. Prototipado de una idea.
    await open(page, 'prototipado');
    await page.locator('#proto-topic').fill('Secado solar de frutas para pequeños productores de Duitama');
    await timed('Prototipado', () => page.getByRole('button', { name: 'Armar el plan con IA' }).click(), page.getByRole('tablist', { name: 'Secciones del plan' }), 8);
    await savePdf('4_Prototipado');
  } finally {
    mkdirSync('resultados-pruebas', { recursive: true });
    const file = `resultados-pruebas/recorrido-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`;
    const total = steps.reduce((sum, s) => sum + s.segundos, 0);
    writeFileSync(file, JSON.stringify({ pasos: steps, pdfs, totalSegundos: total, totalMinutos: Math.round((total / 60) * 10) / 10, errores: errors }, null, 2));
    console.log(`Tiempos guardados en ${file} (total ${Math.round(total / 60)} min)`);
  }
  expect(errors, `Errores en la página:\n${errors.join('\n')}`).toEqual([]);
});
