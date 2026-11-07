import React, { useEffect } from 'react';
import { checkAiConnection } from '@/services/ai';
import { reportAiDown, useAiStatus } from '@/store/aiStatus';
import { useStore } from '@/store/useStore';

/** Si nada confirmó la conexión en este tiempo, se vuelve a probar (solo con la pestaña a la vista). */
const STALE_MS = 10 * 60_000;

/**
 * El círculo de la cabecera, antes de la casita de Inicio: verde si la IA responde, rojo si no.
 * Solo el círculo, y solo en esos dos colores: durante la primera prueba no se ve. El detalle va
 * en su descripción emergente y en el panel «IA».
 *
 * Comprueba al abrir la página y al cambiar de proveedor o modelo, al recuperar la red, al volver
 * a la pestaña y cada 10 minutos sin noticias. Entre una prueba y otra lo mantienen al día las
 * llamadas reales a la IA (`src/services/ai.ts`), así que mientras se trabaja casi no gasta nada.
 */
export const AiStatusDot: React.FC = () => {
  const { status, probing, message } = useAiStatus();
  const provider = useStore((s) => s.aiProvider);
  const model = useStore((s) => s.providerModels?.[s.aiProvider]);

  // Al abrir y al cambiar de proveedor o modelo; un respiro para no competir con la carga de la página.
  useEffect(() => {
    const timer = window.setTimeout(() => void checkAiConnection(), 1200);
    return () => window.clearTimeout(timer);
  }, [provider, model]);

  useEffect(() => {
    const stale = () => Date.now() - useAiStatus.getState().checkedAt > STALE_MS;
    const recheckIfStale = () => {
      if (!document.hidden && stale()) void checkAiConnection();
    };
    const onOnline = () => void checkAiConnection();
    const onOffline = () => reportAiDown('El equipo no tiene conexión a internet.');
    const tick = window.setInterval(recheckIfStale, 60_000);
    document.addEventListener('visibilitychange', recheckIfStale);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.clearInterval(tick);
      document.removeEventListener('visibilitychange', recheckIfStale);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const label = status === 'ok' ? 'IA conectada' : status === 'error' ? `IA sin conexión${message ? ` (${message})` : ''}` : 'Comprobando la IA…';
  return (
    <button type="button" className="ai-dot-hit" onClick={() => void checkAiConnection()} title={`${label}. Toca para volver a comprobar.`} aria-label={label}>
      <span className={`ai-dot ai-dot-${status}${probing ? ' is-probing' : ''}`} aria-hidden="true" />
    </button>
  );
};
