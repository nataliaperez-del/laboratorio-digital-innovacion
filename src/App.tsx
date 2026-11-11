import React, { lazy, Suspense, useState, useEffect } from 'react';
import { Header, ToolId, TOOL_IDS } from './components/layout/Header';
import { PortalCatalog } from './components/portal/PortalCatalog';
import { RadarView } from './components/tools/RadarView';
import { EstudioTerritorialView } from './components/tools/EstudioTerritorialView';
import { IdeacionEstrategicaView } from './components/tools/IdeacionEstrategicaView';
import { ArbolInnovacionView } from './components/tools/ArbolInnovacionView';
import { PrototipadoView } from './components/tools/PrototipadoView';
import { BancoInnovacionView } from './components/tools/BancoInnovacionView';
import { BadgesModal } from './components/gamification/BadgesModal';
import { BadgeNotificationToast } from './components/gamification/BadgeNotificationToast';
import { ZoeFreePresence, type ZoeRequest } from './components/zoe/ZoeFreePresence';
import { useStore } from './store/useStore';
import { AdminOnly, LoginScreen, SessionKeeper, useAuth } from './components/auth/AuthGate';
import { startAutoDeposit } from './store/bancoAutomatico';

const ZoeIntro = lazy(() => import('./components/zoe/ZoeIntro'));

/** Raíz de la aplicación: fondo, cabecera, la herramienta activa, ZOE, insignias y créditos. */
export const App: React.FC = () => {
  // La herramienta vive en el hash: permite enlazarla desde el Observatorio y usar «Atrás».
  const readHash = (): ToolId => {
    const id = window.location.hash.replace(/^#\/?/, '') as ToolId;
    return TOOL_IDS.includes(id) ? id : 'portal';
  };
  const [currentTool, setTool] = useState<ToolId>(readHash);
  const setCurrentTool = (tool: ToolId) => {
    window.location.hash = `/${tool}`;
    setTool(tool);
    window.scrollTo({ top: 0 });
  };
  // Cada resultado terminado se guarda solo en el Banco: los módulos no necesitan botón para eso.
  useEffect(() => startAutoDeposit(), []);
  useEffect(() => {
    const onHash = () => setTool(readHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('innovahub_theme') as 'dark' | 'light') || 'dark';
  });
  // Abierta por defecto salvo en pantallas pequeñas, donde el espacio es del contenido.
  const [isZoeOpen, setIsZoeOpen] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('innovahub_zoe_open');
      if (saved !== null) return saved === '1';
    } catch {
      /* Sin almacenamiento se usa el valor por defecto. */
    }
    return window.innerWidth >= 768;
  });
  const { recordZoeInteraction } = useStore();
  const auth = useAuth();
  const [isBadgesModalOpen, setIsBadgesModalOpen] = useState(false);
  const [zoeRequest, setZoeRequest] = useState<ZoeRequest | null>(null);
  const [introOpen, setIntroOpen] = useState(false);
  const openZoe = (text?: string) => {
    recordZoeInteraction();
    setIsZoeOpen(true);
    setZoeRequest((prev) => ({ id: (prev?.id ?? 0) + 1, text }));
  };
  useEffect(() => {
    try {
      localStorage.setItem('innovahub_zoe_open', isZoeOpen ? '1' : '0');
    } catch {
      /* Solo es una preferencia. */
    }
  }, [isZoeOpen]);
  const zoeState = 'idle';

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('innovahub_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <div
      className={
        currentTool === 'portal'
          ? 'relative h-[100dvh] w-full min-w-full overflow-hidden flex flex-col justify-between'
          : 'relative min-h-screen w-full min-w-full overflow-x-hidden flex flex-col justify-between'
      }
    >
      {/* Fondo fijo a la pantalla: halos y malla. Antes medían todo el largo de la página y se
          repintaban con el scroll; fijos, son del tamaño de la ventana y no se mueven al desplazar. */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div
          className="halo pointer-events-none"
          aria-hidden="true"
          style={{
            left: '-220px',
            top: '-170px',
            width: '860px',
            height: '860px',
            background: 'radial-gradient(circle, rgba(46,156,186,0.28) 0%, rgba(4,34,43,0) 68%)',
          }}
        />
        <div
          className="halo pointer-events-none"
          aria-hidden="true"
          style={{
            right: '-240px',
            top: '380px',
            width: '800px',
            height: '800px',
            background: 'radial-gradient(circle, rgba(122,151,6,0.20) 0%, rgba(4,34,43,0) 66%)',
          }}
        />
        <div
          className="halo pointer-events-none"
          aria-hidden="true"
          style={{
            left: '300px',
            bottom: '-280px',
            width: '820px',
            height: '820px',
            background: 'radial-gradient(circle, rgba(242,159,5,0.24) 0%, rgba(4,34,43,0) 66%)',
          }}
        />
        <div
          className="halo pointer-events-none"
          aria-hidden="true"
          style={{
            right: '180px',
            top: '60px',
            width: '500px',
            height: '500px',
            background: 'radial-gradient(circle, rgba(107,79,160,0.22) 0%, rgba(4,34,43,0) 68%)',
          }}
        />

        {/* Malla vectorial que flota: dos capas del mismo patrón a distinta escala y sentido (profundidad).
            Cada capa es más grande que la pantalla en una baldosa del patrón y se desliza exactamente esa
            distancia: el bucle es invisible. La envoltura sube y baja con suavidad. Solo se animan
            transformaciones (las resuelve la tarjeta gráfica, no repintan nada). */}
        <div className="mesh-float" aria-hidden="true">
          <div className="mesh-layer mesh-a">
            <svg width="100%" height="100%" aria-hidden="true">
              <defs>
                <pattern id="vmesh" width="240" height="240" patternUnits="userSpaceOnUse">
                  <g stroke="#FFFFFF" strokeOpacity="0.2" strokeWidth="1" fill="none">
                    <path d="M0 120 L60 60 L120 0 M120 0 L180 70 L240 120 M240 120 L175 175 L120 240 M120 240 L70 180 L0 120" />
                    <path d="M60 60 L120 120 L180 70 M70 180 L120 120 L175 175 M60 60 L180 70 M70 180 L175 175" />
                  </g>
                  <g fill="#FFFFFF" fillOpacity="0.3">
                    <circle cx="60" cy="60" r="3.5" />
                    <circle cx="180" cy="70" r="3.5" />
                    <circle cx="70" cy="180" r="3.5" />
                    <circle cx="175" cy="175" r="3.5" />
                    <circle cx="120" cy="120" r="4.5" />
                  </g>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#vmesh)" />
            </svg>
          </div>
        </div>
        <div className="mesh-float mesh-float-b" aria-hidden="true">
          <div className="mesh-layer mesh-b">
            <svg width="100%" height="100%" aria-hidden="true">
              <defs>
                <pattern id="vmesh2" width="240" height="240" patternUnits="userSpaceOnUse" patternTransform="scale(1.6)">
                  <g stroke="#FFFFFF" strokeOpacity="0.14" strokeWidth="1" fill="none">
                    <path d="M0 120 L60 60 L120 0 M120 0 L180 70 L240 120 M240 120 L175 175 L120 240 M120 240 L70 180 L0 120" />
                    <path d="M60 60 L120 120 L180 70 M70 180 L120 120 L175 175" />
                  </g>
                  <g fill="#FFFFFF" fillOpacity="0.22">
                    <circle cx="60" cy="60" r="3" />
                    <circle cx="180" cy="70" r="3" />
                    <circle cx="120" cy="120" r="4" />
                  </g>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#vmesh2)" />
            </svg>
          </div>
        </div>
      </div>

      {/* Header Glassmorphism */}
      <Header
        currentTool={currentTool}
        onSelectTool={setCurrentTool}
        theme={theme}
        onToggleTheme={toggleTheme}
        isZoeOpen={isZoeOpen}
        onToggleZoe={() => {
          recordZoeInteraction();
          setIsZoeOpen((prev) => !prev);
        }}
        zoeState={zoeState}
        onOpenBadges={() => setIsBadgesModalOpen(true)}
      />

      <SessionKeeper />
      {/* Main Dynamic View Content (Fluid Full-Width Layout) */}
      <main
        className={
          currentTool === 'portal'
            ? 'relative z-10 flex-1 box-border w-full h-full px-2 sm:px-4 md:px-6 py-0 overflow-hidden flex items-center justify-center'
            : 'relative z-10 flex-1 box-border w-full px-4 sm:px-6 md:px-8 xl:px-12 2xl:px-16 pt-6 pb-10'
        }
      >
        {currentTool === 'portal' && (
          <PortalCatalog
            onSelectTool={setCurrentTool}
            onOpenZoe={openZoe}
            onPlayIntro={() => setIntroOpen(true)}
            onOpenBadges={() => setIsBadgesModalOpen(true)}
          />
        )}
        {/* Las herramientas piden ingreso con la cuenta institucional; el Contenedor, además, rol de administrador. */}
        {currentTool !== 'portal' && !auth.signedIn && <LoginScreen />}
        {auth.signedIn && currentTool === 'radar' && <RadarView onNavigate={setCurrentTool} />}
        {auth.signedIn && currentTool === 'estudio' && <EstudioTerritorialView onNavigate={setCurrentTool} />}
        {auth.signedIn && currentTool === 'ideacion' && <IdeacionEstrategicaView onNavigate={setCurrentTool} />}
        {auth.signedIn && currentTool === 'arbol' && <ArbolInnovacionView onNavigate={setCurrentTool} />}
        {auth.signedIn && currentTool === 'prototipado' && <PrototipadoView onNavigate={setCurrentTool} />}
        {auth.signedIn && currentTool === 'banco' && auth.role === 'admin' && <BancoInnovacionView onNavigate={setCurrentTool} />}
        {auth.signedIn && currentTool === 'banco' && auth.role !== 'admin' && <AdminOnly onBack={() => setCurrentTool('portal')} />}
      </main>

      {/* ZOE: Alma de Innovación 3D - Presencia Libre por su Casa */}
      {introOpen && (
        <Suspense fallback={null}>
          <ZoeIntro onClose={() => setIntroOpen(false)} />
        </Suspense>
      )}

      {!introOpen && (
        <ZoeFreePresence
          currentTool={currentTool}
          onSelectTool={setCurrentTool}
          theme={theme}
          onToggleTheme={toggleTheme}
          isOpen={isZoeOpen}
          onToggleOpen={() => setIsZoeOpen((prev) => !prev)}
          request={zoeRequest}
        />
      )}

      {/* Gamificación: Modal de Vitrina de Insignias y Toast de Notificación */}
      <BadgesModal isOpen={isBadgesModalOpen} onClose={() => setIsBadgesModalOpen(false)} onNavigate={setCurrentTool} />
      <BadgeNotificationToast onOpenBadgesModal={() => setIsBadgesModalOpen(true)} />

      {/* Espacio al final de la página: en el inicio, para que la firma flotante no tape el contenido;
          en los módulos, además, para que lo último pueda subir por encima de ZOE. */}
      <div aria-hidden="true" className={currentTool === 'portal' ? 'h-16 shrink-0' : 'h-56 md:h-80 shrink-0'} />

      {/* Firma de los desarrolladores y logos: flotan abajo a la derecha, sin recuadro, siempre visibles */}
      <footer className="lab-credits" aria-label="Créditos del Laboratorio">
        <p className="lab-credits-names">
          <span>Desarrollado por</span>
          Natalia Elizabeth Perez
          <br />
          Camilo Esteban Lozano
        </p>
        <img
          src={`/assets/unad_emblema_${theme}.png`}
          alt="Universidad Nacional Abierta y a Distancia · Acreditada en Alta Calidad"
          title="UNAD · Acreditada en Alta Calidad"
          className="lab-credits-unad"
        />
        <img
          src={`/assets/viem_logo_${theme}.png`}
          alt="VIEM · Vicerrectoría de Innovación y Emprendimiento"
          title="Vicerrectoría de Innovación y Emprendimiento (VIEM)"
          className="lab-credits-viem"
        />
      </footer>
    </div>
  );
};

export default App;
