/**
 * ¿Está conectada la IA? Un solo estado para toda la app: lo muestran el círculo de la cabecera y
 * el panel «IA». Se actualiza con una prueba mínima (`checkAiConnection` en `src/services/ai.ts`) y,
 * sin gastar nada, con cada llamada real: si una respuesta llega, la IA está conectada.
 * No se guarda en el navegador: cada visita vuelve a comprobarlo.
 */
import { useEffect, useState } from 'react';
import { create } from 'zustand';

/** `checking` solo se ve en la primera comprobación; después se conserva el último color mientras se vuelve a probar. */
export type AiConnection = 'checking' | 'ok' | 'error';

interface AiStatusState {
  status: AiConnection;
  /** Motivo del último fallo, para el panel «IA». */
  message: string;
  /** Cuándo se supo el estado por última vez (ms desde 1970), o 0 si aún no se sabe. */
  checkedAt: number;
  /** Hay una prueba en curso. */
  probing: boolean;
}

export const useAiStatus = create<AiStatusState>(() => ({ status: 'checking', message: '', checkedAt: 0, probing: false }));

/** Una respuesta de la IA llegó: está conectada. */
export function reportAiOk(now = Date.now()): void {
  useAiStatus.setState({ status: 'ok', message: '', checkedAt: now });
}

/** La IA no respondió (o el navegador perdió la red). */
export function reportAiDown(message: string, now = Date.now()): void {
  useAiStatus.setState({ status: 'error', message, checkedAt: now });
}

/**
 * ¿Hay que trabajar sin IA? Sí cuando el equipo no tiene red o la última prueba falló (círculo
 * rojo). Mientras se comprueba se supone que sí hay IA, para no mostrar avisos de más.
 */
export function useAiOffline(): boolean {
  const status = useAiStatus((s) => s.status);
  const [online, setOnline] = useState(() => typeof navigator === 'undefined' || navigator.onLine !== false);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine !== false);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);
  return status === 'error' || !online;
}

/** Se cambió de proveedor o de modelo: lo sabido ya no vale hasta volver a probar. */
export function markAiUnknown(): void {
  useAiStatus.setState({ status: 'checking', message: '', checkedAt: 0 });
}
