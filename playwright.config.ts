import { defineConfig } from '@playwright/test';
import { rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

/**
 * Recorrido automático del Laboratorio (`npm run e2e`). Levanta su propio servidor de desarrollo
 * en el puerto 3100 con el ingreso desactivado (solo existe en local: `VITE_AUTH_DISABLED`) y, para
 * probar el concentrador de datos, el PHP de Hostinger en el 8138 con una base de datos temporal.
 */
const LAB_PHP = 'http://127.0.0.1:8138';
const LAB_DB = path.join(tmpdir(), 'laboratorio-e2e.sqlite');
// Cada corrida empieza con la base de datos vacía.
rmSync(LAB_DB, { force: true });

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
  webServer: [
    {
      command: 'php -S 127.0.0.1:8138 scripts/pruebas/router-php.php',
      port: 8138,
      stdout: 'ignore',
      stderr: 'ignore',
      reuseExistingServer: false,
      timeout: 30_000,
      env: { LAB_PRUEBA: '1', LAB_SQLITE: LAB_DB, LAB_ADMINISTRADORES: 'admin@unad.edu.co', LAB_DOMINIOS: 'unad.edu.co' },
    },
    {
      command: 'npx vite --port=3100 --strictPort',
      url: 'http://localhost:3100',
      reuseExistingServer: false,
      timeout: 120_000,
      env: { VITE_AUTH_DISABLED: 'true', LAB_PHP },
    },
  ],
});
