/**
 * Activa el Laboratorio sin conexión (`public/sw.js`). Solo en la versión publicada: en
 * `npm run dev` un service worker guardaría código viejo y estorbaría la recarga en caliente.
 */
export function registerOffline(): void {
  if (!import.meta.env.PROD || typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js', { scope: './' }).catch((e) => console.warn('[Laboratorio] Sin modo sin conexión:', e));
  });
}
