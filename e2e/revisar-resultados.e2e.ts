/**
 * Revisar y corregir lo que sale de las herramientas: los participantes pueden corregir, copiar y
 * borrar antes de pasar a la siguiente. Se siembran resultados ya hechos (sin IA) y se prueba en pantalla.
 */
import { expect, test, type Page } from '@playwright/test';

const plan = {
  id: 'p1',
  createdAt: '2026-11-14T10:00:00.000Z',
  origin: { kind: 'idea', label: 'Abonos de Sogamoso' },
  name: 'Plan de abonos',
  tagline: 'De residuo a recurso',
  category: 'Servicio',
  trlTarget: 'TRL 4',
  scope: 'Piloto',
  targetAudience: 'Productores de Sogamoso',
  problemSolved: 'Residuos sin uso',
  hypothesis: 'Si compostamos, bajan los costos',
  solution: 'Planta comunitaria',
  architecture: { fisico: 'Planta', digital: 'App', metodologico: 'Talleres' },
  phases: [{ fase: 'Diseño', semanas: '1-4', actividades: 'Planear', entregables: ['Plano'] }],
  deliverables: ['Prototipo', 'Manual'],
  durationWeeks: 12,
  unadSchools: [],
  validationMetrics: ['Toneladas', 'Costo'],
  risks: [{ riesgo: 'Clima', mitigacion: 'Techo' }],
  supuestos: ['Hay agua'],
};

const node = (codigo: string, nivel: string, nombre: string, extra: Record<string, unknown> = {}) => ({
  codigo,
  nivel,
  nombre,
  descripcion: `Descripción de ${nombre}`,
  evidencia: 'media',
  deriva_de: [],
  derivan: [],
  fuentes: [],
  alertas: [],
  ...extra,
});

const seed = {
  state: {
    prototypes: [plan],
    activePrototypeId: 'p1',
    treeRequest: { themeName: 'Abonos', themeExplanation: 'x', useTerritorialStudy: false },
    innovationTreeMarkdown: '## Tendencias\n\nTexto uno',
    innovationTreeSections: [{ number: 1, title: 'Tendencias', markdown: '## Tendencias\n\nTexto uno de las tendencias del árbol, con bastante detalle.', status: 'ok' }],
    treeGraph: {
      tema: 'Abonos',
      origen: 'ia',
      nodos: [
        node('T1', 'tronco', 'Abonos orgánicos', { derivan: ['F1'] }),
        node('F1', 'fruto', 'Compostaje comunitario', { deriva_de: ['T1'], tipo_fruto: 'proyecto', solucion: 'Planta', impacto_esperado: 'Menos residuos' }),
      ],
    },
  },
  version: 4,
};

async function openWithSeed(page: Page, route: string) {
  await page.addInitScript((value) => {
    if (!sessionStorage.getItem('seeded')) {
      localStorage.setItem('lab-app-state', JSON.stringify(value));
      sessionStorage.setItem('seeded', '1');
    }
  }, seed);
  await page.goto(`/#/${route}`);
  await page.locator('main').first().waitFor();
}

test('Prototipado: corregir el plan, copiarlo y ver el cambio', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await openWithSeed(page, 'prototipado');
  await expect(page.getByRole('heading', { name: 'Plan de abonos' })).toBeVisible();
  await page.getByRole('button', { name: 'Corregir' }).click();
  const box = page.getByLabel(/Corrige el plan/);
  await box.fill((await box.inputValue()).replace('Si compostamos, bajan los costos', 'Si compostamos juntos, bajan los costos y crece la comunidad'));
  await page.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(page.getByText('Si compostamos juntos, bajan los costos y crece la comunidad').first()).toBeVisible();
  await page.getByRole('button', { name: 'Copiar el plan completo' }).click();
  await expect(page.getByRole('button', { name: 'Copiado' })).toBeVisible();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toContain('Si compostamos juntos');
  expect(copied).toContain('Diseño (1-4 semanas)');
});

test('Árbol: corregir un nodo, borrarlo y ajustar las partes del análisis', async ({ page }) => {
  test.setTimeout(90_000);
  await openWithSeed(page, 'arbol');
  // Partes del análisis: corregir una.
  await page.getByText('Revisar y ajustar antes de seguir').click();
  await page.getByRole('button', { name: 'Corregir' }).first().click();
  const part = page.getByLabel(/Corrige «Tendencias»/);
  await part.fill('## Tendencias\n\nTexto corregido por el grupo del taller.');
  await page.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(page.getByText('Texto corregido por el grupo del taller.').first()).toBeVisible();

  // Si apareció la vitrina de insignias (una insignia recién ganada), se cierra.
  const badges = page.getByRole('dialog', { name: /insignias/i });
  if (await badges.isVisible().catch(() => false)) await page.keyboard.press('Escape');
  await page.locator('.badges-overlay').waitFor({ state: 'detached', timeout: 3000 }).catch(() => undefined);

  // Nodo: abrirlo en la tabla, corregirlo y borrarlo.
  await page.getByRole('button', { name: /Tabla/ }).click();
  await page.getByRole('row', { name: /F1/ }).getByRole('button').click();
  await page.waitForTimeout(600);
  if (await page.locator('.badges-overlay').isVisible().catch(() => false)) {
    await page.keyboard.press('Escape');
    if (await page.locator('.badges-overlay').isVisible().catch(() => false)) await page.locator('.badges-overlay button').first().click();
  }
  await page.locator('aside').getByRole('button', { name: 'Corregir' }).click();
  const nodeBox = page.getByLabel(/Corrige el nodo/);
  await nodeBox.fill((await nodeBox.inputValue()).replace('Compostaje comunitario', 'Compostaje del barrio'));
  await page.locator('aside').getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(page.locator('aside').getByRole('heading', { name: 'Compostaje del barrio' })).toBeVisible();
  page.once('dialog', (d) => void d.accept());
  await page.locator('aside').getByRole('button', { name: 'Borrar' }).click();
  await expect(page.getByText('Compostaje del barrio')).toHaveCount(0);
});
