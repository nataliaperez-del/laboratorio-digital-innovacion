/**
 * Módulo de ZOE: barra de controles reducida, carita con el video de presentación, chat flotante con
 * ZOE encima, casita proporcional y modo «Taller de innovación» por el chat.
 */
import { expect, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const SHOTS = process.env.E2E_SHOTS || '';

async function shot(page: import('@playwright/test').Page, name: string) {
  if (!SHOTS) return;
  mkdirSync(SHOTS, { recursive: true });
  await page.screenshot({ path: `${SHOTS}/${name}.png` });
}

test('ZOE: controles esenciales, video grande, chat con ZOE arriba y casita proporcional', async ({ page }) => {
  test.setTimeout(240_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/#/portal');
  await page.locator('.zoe-stage').first().waitFor({ timeout: 30_000 });

  // 1) Solo lo necesario: micrófono, chat, carita, recorrido, audio y casita. Sin sentar, caminar, dormir, girar ni acariciar; la casita se queda junto a ZOE.
  await page.locator('.zoe-stage').first().hover();
  const labels = await page.locator('.zoe-toolbar .zoe-tool').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')));
  expect(labels).toEqual([
    'Conversar con ZOE',
    'Silenciar la voz de ZOE',
    'Escribirle a ZOE',
    'Ver la presentación de ZOE',
    'Recorrido guiado por el Laboratorio',
    'Mandar a ZOE a su casita',
  ]);
  await shot(page, '1-controles');

  // 2) El Inicio ya no trae el video: se abre con la carita, grande.
  await expect(page.locator('video')).toHaveCount(0);
  await page.getByRole('button', { name: 'Ver la presentación de ZOE' }).click();
  const modal = page.getByRole('dialog', { name: 'Presentación de ZOE' });
  await expect(modal).toBeVisible();
  const box = await modal.locator('video').boundingBox();
  expect(box!.width).toBeGreaterThan(600);
  await shot(page, '2-video');
  await page.getByRole('button', { name: 'Cerrar la presentación de ZOE' }).click();
  await expect(modal).toHaveCount(0);

  // 3) Chat flotante: ZOE se sienta justo arriba y la casita no es más alta que ella.
  const before = await page.locator('.zoe-stage').first().boundingBox();
  await page.locator('.zoe-stage').first().hover();
  await page.getByRole('button', { name: 'Escribirle a ZOE' }).click();
  const chat = page.getByRole('dialog', { name: 'Chat con ZOE' });
  await expect(chat).toBeVisible();
  await page.waitForTimeout(800);
  const chatBox = await chat.boundingBox();
  const stage = await page.locator('.zoe-stage').first().boundingBox();
  expect(stage!.y + stage!.height * 0.97).toBeLessThan(chatBox!.y + 60);
  expect(stage!.x + stage!.width).toBeGreaterThan(chatBox!.x);
  const houseH = await page.locator('.zoe-house').first().evaluate((e) => e.getBoundingClientRect().height).catch(() => 0);
  if (houseH) expect(houseH).toBeLessThanOrEqual(stage!.height * 0.6);
  await shot(page, '3-chat');

  // 4) Modo taller por el chat.
  await chat.getByLabel('Mensaje para ZOE').fill('Taller de innovación');
  await chat.getByRole('button', { name: 'Enviar mensaje' }).click();
  await expect(page.getByText(/Modo taller de innovación activado/).first()).toBeVisible({ timeout: 40_000 });
  await chat.getByLabel('Mensaje para ZOE').fill('listos');
  await chat.getByRole('button', { name: 'Enviar mensaje' }).click();
  await expect(page.getByText(/Empezamos con Identificar Oportunidades/).first()).toBeVisible({ timeout: 40_000 });
  await chat.getByLabel('Mensaje para ZOE').fill('terminamos');
  await chat.getByRole('button', { name: 'Enviar mensaje' }).click();
  await expect(page.getByText(/discútanlo en grupo/).first()).toBeVisible({ timeout: 40_000 });
  await chat.getByLabel('Mensaje para ZOE').fill('ya volvimos');
  await chat.getByRole('button', { name: 'Enviar mensaje' }).click();
  await expect(page.getByText(/revisaron y validaron|revisó y validó|discutieron en grupo/i).first()).toBeVisible({ timeout: 40_000 });
  await chat.getByLabel('Mensaje para ZOE').fill('sí');
  await chat.getByRole('button', { name: 'Enviar mensaje' }).click();
  await expect(page.getByText(/siguiente paso/i).first()).toBeVisible({ timeout: 40_000 });
  await expect(page.getByText(/Seguimos con Crear Conceptos|vamos a Crear Conceptos/i).first()).toBeVisible({ timeout: 40_000 });
  await shot(page, '4-taller');

  // 5) Cerrar el chat devuelve a ZOE a su sitio.
  await chat.getByRole('button', { name: 'Cerrar el chat' }).click();
  await page.waitForTimeout(700);
  const after = await page.locator('.zoe-stage').first().boundingBox();
  expect(Math.abs(after!.x - before!.x)).toBeLessThan(40);
  expect(errors).toEqual([]);
});
