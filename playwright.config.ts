import { defineConfig } from '@playwright/test';

/**
 * Recorrido automático del Laboratorio (`npm run e2e`). Levanta su propio servidor de desarrollo
 * en el puerto 3100 con el ingreso desactivado (solo existe en local: `VITE_AUTH_DISABLED`).
 */
export default defineConfig({
  testDir: 'e2e',
  testMatch: '**/*.e2e.ts',
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  outputDir: 'test-results',
  use: {
    baseURL: 'http://localhost:3100',
    viewport: { width: 1366, height: 900 },
    // Un clic que no se puede hacer falla pronto, en vez de agotar el tiempo de toda la prueba.
    actionTimeout: 20_000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npx vite --port=3100 --strictPort',
    url: 'http://localhost:3100',
    reuseExistingServer: true,
    timeout: 120_000,
    env: { VITE_AUTH_DISABLED: 'true' },
  },
});
