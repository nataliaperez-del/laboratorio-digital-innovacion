/**
 * Concentrador de datos de punta a punta: la aplicación real contra el PHP de Hostinger (con una
 * base de datos temporal). Comprueba que lo que hace una persona llega al servidor y que un
 * administrador lo ve en «Todos los usuarios»: tablero global, resultados de todos y banco de insumos.
 *
 * El ingreso con Google no se puede automatizar: el pase se pide con el modo de prueba del servidor,
 * que solo existe con `php -S` y `LAB_PRUEBA=1`.
 */
import { expect, test, type Page } from '@playwright/test';

const API = 'http://127.0.0.1:8138/api/lab';

async function pass(page: Page, email: string, name: string) {
  const response = await page.request.post(`${API}/sesion`, { data: { access_token: `prueba:${email}`, nombre: name, consentimiento: true } });
  expect(response.ok()).toBe(true);
  return (await response.json()) as { token: string; expira: number; admin: boolean };
}

test('lo que hace una persona llega al servidor y el administrador lo ve', async ({ page }) => {
  // Una persona trabajó antes: su resultado, sus insumos y su uso quedaron en el servidor.
  const ana = await pass(page, 'ana@unad.edu.co', 'Ana Pérez');
  const headers = { 'X-Lab-Token': ana.token };
  await page.request.post(`${API}/eventos`, {
    headers,
    data: {
      eventos: [
        { id: 'g1', tipo: 'generacion', modulo: 'estudio', at: new Date().toISOString(), datos: { ok: true, segundos: 120 } },
        { id: 's1', tipo: 'encuesta', modulo: 'estudio', at: new Date().toISOString(), datos: { utilidad: 5, facilidad: 4, recomendacion: 10, format: 'pdf' } },
        { id: 'z1', tipo: 'zoe', at: new Date().toISOString(), datos: { cantidad: 4 } },
      ],
    },
  });
  await page.request.post(`${API}/resultado`, {
    headers,
    data: {
      id: 'study-ana',
      modulo: 'estudio',
      titulo: 'Estudio Territorial de Duitama',
      departamento: 'Boyacá',
      municipio: 'Duitama',
      zona: 'ZCB',
      creadoEn: new Date().toISOString(),
      resumen: { sections: [{ status: 'ok' }, { status: 'ok' }] },
      documento: { containerData: '# Estudio Territorial de Duitama\n\nTexto del estudio.', prompt0Data: { labName: 'Taller', municipality: 'Duitama', department: 'Boyacá', zonaUNAD: 'ZCB' } },
      sintesis: 'Diagnóstico productivo de Duitama.',
      insumos: [{ tipo: 'oportunidad', titulo: 'Fruta deshidratada', descripcion: 'Mercado de snacks saludables.', relevancia: 5, palabrasClave: ['fruta'] }],
    },
  });

  // Entra el administrador.
  const admin = await pass(page, 'admin@unad.edu.co', 'Administración');
  await page.addInitScript((value) => localStorage.setItem('lab-pase', value), JSON.stringify(admin));
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto('/#/banco');
  await page.getByText('Métricas y satisfacción').first().click();
  await expect(page.getByRole('button', { name: 'Todos los usuarios', pressed: true })).toBeVisible();

  // Participación y uso de la IA.
  await expect(page.getByText('Personas registradas')).toBeVisible();
  const usage = page.getByRole('region', { name: 'Uso de la IA por herramienta' });
  await expect(usage.getByRole('row', { name: /Estudio Territorial 1 0 120 s/ })).toBeVisible();
  await expect(page.getByText('Datos de todos los usuarios, concentrados en el servidor del Laboratorio.')).toBeVisible();

  // Resultados de todos: se ve de quién es y se puede abrir para descargar.
  const results = page.getByRole('region', { name: 'Resultados de todos los usuarios' });
  await expect(results.getByRole('cell', { name: 'Ana Pérez' })).toBeVisible();
  await results.getByRole('button', { name: 'Abrir' }).click();
  await expect(results.getByText('Diagnóstico productivo de Duitama.')).toBeVisible();
  await expect(results.getByRole('button', { name: 'Descargar informe en PDF' })).toBeVisible();

  // Banco de insumos: la pieza está, sin el nombre de quien la hizo.
  const bank = page.getByRole('region', { name: 'Banco de insumos' });
  await expect(bank.getByRole('heading', { name: 'Fruta deshidratada' })).toBeVisible();
  await expect(bank).not.toContainText('Ana Pérez');

  expect(errors).toEqual([]);
});

test('quien no es administrador no ve los datos de todos', async ({ page }) => {
  const ana = await pass(page, 'ana@unad.edu.co', 'Ana Pérez');
  await page.addInitScript((value) => localStorage.setItem('lab-pase', value), JSON.stringify(ana));
  await page.goto('/#/banco');
  await page.getByText('Métricas y satisfacción').first().click();
  await page.getByRole('button', { name: 'Todos los usuarios' }).click();
  await expect(page.getByText('Los datos de todos los usuarios no están disponibles aquí')).toBeVisible();
});

test('al terminar un resultado en el navegador, se envía solo con sus insumos', async ({ page }) => {
  test.setTimeout(90_000);
  const ana = await pass(page, 'ana@unad.edu.co', 'Ana Pérez');
  // Un plan de prototipado ya guardado en este navegador y que el servidor aún no tiene.
  const plan = {
    id: 'proto-e2e',
    createdAt: new Date().toISOString(),
    origin: { kind: 'idea', label: 'Idea' },
    name: 'Secador solar modular',
    tagline: 'Fruta seca con sol',
    category: 'Prototipo Tecnológico',
    trlTarget: 'TRL 4 · Validación en laboratorio',
    scope: 'Local y comunitario',
    targetAudience: 'Productores',
    problemSolved: 'Pérdida de cosecha',
    hypothesis: 'El secado solar reduce la pérdida.',
    solution: 'Secador de bandejas',
    architecture: { fisico: '', digital: '', metodologico: '' },
    phases: [{ fase: 'Diseño', semanas: 'Semanas 1-2', actividades: '', entregables: [] }],
    deliverables: [],
    durationWeeks: 8,
    unadSchools: [],
    validationMetrics: [],
    risks: [],
    supuestos: [],
  };
  await page.addInitScript(
    ([passValue, planValue]) => {
      localStorage.setItem('lab-pase', passValue);
      const saved = JSON.parse(localStorage.getItem('lab-app-state') || '{"state":{},"version":4}');
      saved.state.prototypes = [JSON.parse(planValue)];
      localStorage.setItem('lab-app-state', JSON.stringify(saved));
    },
    [JSON.stringify(ana), JSON.stringify(plan)],
  );
  // La IA del filtro no está en esta prueba: debe caer a los insumos por reglas, no quedarse sin enviar.
  await page.route('**/api/unad-gemini', (route) => route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"sin IA en la prueba"}' }));
  await page.goto('/#/prototipado');

  // El envío espera a que el resultado deje de cambiar (20 s).
  const admin = await pass(page, 'admin@unad.edu.co', 'Administración');
  await expect
    .poll(async () => (await (await page.request.get(`${API}/resultados?q=Secador`, { headers: { 'X-Lab-Token': admin.token } })).json()).total, { timeout: 70_000, intervals: [3000] })
    .toBe(1);
  const bank = await (await page.request.get(`${API}/insumos?q=Secador`, { headers: { 'X-Lab-Token': admin.token } })).json();
  expect(bank.insumos[0]).toMatchObject({ tipo: 'solucion', titulo: 'Secador solar modular', origen: 'reglas' });
});
