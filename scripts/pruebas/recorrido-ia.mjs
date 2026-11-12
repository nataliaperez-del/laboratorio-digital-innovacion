/** Lanza el recorrido de punta a punta con la IA real (consume cuota y dura varios minutos). */
import { spawnSync } from 'node:child_process';

const result = spawnSync('npx', ['playwright', 'test', '-g', 'recorrido con IA'], { stdio: 'inherit', shell: true, env: { ...process.env, E2E_IA: '1' } });
process.exit(result.status ?? 1);
