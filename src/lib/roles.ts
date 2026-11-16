/**
 * Roles del Laboratorio. Hay dos:
 *  - usuario: cualquier cuenta del dominio institucional; usa las herramientas.
 *  - administrador: además entra al Contenedor de resultados de todos y al panel de la IA.
 *
 * Quién es administrador lo decide solo el servidor (`config/lab.php`, lista `administradores`) y
 * lo informa al ingresar, dentro del pase. El navegador no tiene ninguna lista de correos de
 * administradores; el rol ordena la interfaz y los datos de todos los protege el servidor.
 */

export type Role = 'admin' | 'user';
