import React, { useEffect, useRef, useState } from 'react';
import { LogIn, ShieldCheck } from 'lucide-react';
import { useStore } from '@/store/useStore';
import {
  getAllowedEmailDomains,
  getSessionIdleLimitMs,
  isAuthDisabled,
  roleForEmail,
  signInWithInstitutionalGoogle,
  signOutInstitutional,
} from '@/services/auth';
import type { Role } from '@/lib/roles';

/** Eventos que cuentan como actividad para el temporizador de inactividad. */
const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'];
const ACTIVITY_THROTTLE_MS = 30_000;
const IDLE_CHECK_INTERVAL_MS = 60_000;

/** Cierra la sesión (a mano o por inactividad) y deja el aviso para la pantalla de ingreso. */
export function endSession(notice: string | null = null) {
  signOutInstitutional();
  useStore.setState({ session: null, sessionNotice: notice });
}

/** Sesión y rol de quien usa el Laboratorio. Con el ingreso desactivado (solo desarrollo) es administrador. */
export function useAuth(): { signedIn: boolean; email: string | null; name: string | null; picture?: string; role: Role } {
  const session = useStore((s) => s.session);
  if (isAuthDisabled()) return { signedIn: true, email: null, name: 'Desarrollo', role: 'admin' };
  if (!session) return { signedIn: false, email: null, name: null, role: 'user' };
  return { signedIn: true, email: session.email, name: session.name, picture: session.picture, role: roleForEmail(session.email) };
}

/** Vigilante de inactividad: solo se monta con sesión activa. */
function InactivityWatcher() {
  const lastTouch = useRef(0);
  useEffect(() => {
    const limit = getSessionIdleLimitMs();
    const expire = () => endSession('Tu sesión se cerró por inactividad. Vuelve a ingresar con tu cuenta institucional.');
    if (Date.now() - useStore.getState().lastActivityAt > limit) {
      expire();
      return;
    }
    const onActivity = () => {
      const now = Date.now();
      if (now - lastTouch.current < ACTIVITY_THROTTLE_MS) return;
      lastTouch.current = now;
      useStore.getState().touchActivity();
    };
    ACTIVITY_EVENTS.forEach((ev) => window.addEventListener(ev, onActivity, { passive: true }));
    const interval = window.setInterval(() => {
      if (Date.now() - useStore.getState().lastActivityAt > limit) expire();
    }, IDLE_CHECK_INTERVAL_MS);
    return () => {
      ACTIVITY_EVENTS.forEach((ev) => window.removeEventListener(ev, onActivity));
      window.clearInterval(interval);
    };
  }, []);
  return null;
}

/** Mantiene vigilada la sesión mientras esté abierta. Se monta una vez, en la raíz. */
export const SessionKeeper: React.FC = () => {
  const { signedIn } = useAuth();
  return signedIn && !isAuthDisabled() ? <InactivityWatcher /> : null;
};

/** Pantalla de ingreso con la cuenta institucional de Google. */
export const LoginScreen: React.FC = () => {
  const sessionNotice = useStore((s) => s.sessionNotice);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const session = await signInWithInstitutionalGoogle();
      useStore.getState().setSessionNotice(null);
      useStore.getState().setSession(session);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const domains = getAllowedEmailDomains()
    .map((d) => `@${d}`)
    .join(', ');
  const idleMinutes = Math.round(getSessionIdleLimitMs() / 60_000);

  return (
    <div className="login-gate">
      <div className="login-card" role="main">
        <h1 className="login-title">Ingresa para usar las herramientas</h1>
        <p className="login-text">Las herramientas del Laboratorio son de uso institucional. Ingresa con tu cuenta Google de la UNAD ({domains}).</p>
        {sessionNotice && <p className="login-notice">{sessionNotice}</p>}
        {error && (
          <p className="login-error" role="alert">
            {error}
          </p>
        )}
        <button type="button" className="login-btn" onClick={handleLogin} disabled={loading}>
          <LogIn className="w-4 h-4" aria-hidden="true" />
          {loading ? 'Abriendo ventana de Google…' : 'Ingresar con cuenta institucional'}
        </button>
        <p className="login-footnote">
          <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
          La sesión se cierra tras {idleMinutes} minutos sin actividad.
        </p>
        <p className="login-data-notice">
          Al ingresar aceptas que el Laboratorio registre tu nombre y correo institucional, el uso que haces de las herramientas y los resultados que generes, para
          el seguimiento institucional y para alimentar el banco de insumos de innovación, donde se guardan sin tu nombre.
        </p>
      </div>
    </div>
  );
};

/** Aviso para quien ya ingresó pero no es administrador y llega al Contenedor de resultados. */
export const AdminOnly: React.FC<{ onBack: () => void }> = ({ onBack }) => (
  <div className="login-gate">
    <div className="login-card" role="main">
      <h1 className="login-title">Contenedor de resultados: solo administradores</h1>
      <p className="login-text">
        Este repositorio transversal, donde se centralizan, consultan y descargan los ejercicios del Laboratorio, es solo para administradores. Tus herramientas
        siguen disponibles y tu trabajo se guarda solo.
      </p>
      <button type="button" className="login-btn" onClick={onBack}>
        Volver al inicio
      </button>
    </div>
  </div>
);
