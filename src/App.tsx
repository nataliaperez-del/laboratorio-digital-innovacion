import React, { lazy, Suspense, useState, useEffect } from 'react';
import { Header, ToolId, TOOL_IDS } from './components/layout/Header';
import { PortalCatalog } from './components/portal/PortalCatalog';
import { RadarView } from './components/tools/RadarView';
import { EstudioTerritorialView } from './components/tools/EstudioTerritorialView';
import { IdeacionEstrategicaView } from './components/tools/IdeacionEstrategicaView';
import { ArbolInnovacionView } from './components/tools/ArbolInnovacionView';
import { PrototipadoView } from './components/tools/PrototipadoView';
import { ZoeFreePresence, type ZoeRequest } from './components/zoe/ZoeFreePresence';

const ZoeIntro = lazy(() => import('./components/zoe/ZoeIntro'));

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
  const [zoeRequest, setZoeRequest] = useState<ZoeRequest | null>(null);
  const [introOpen, setIntroOpen] = useState(false);
  const openZoe = (text?: string) => {
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
          ? 'relative h-screen w-full min-w-full overflow-hidden flex flex-col justify-between'
          : 'relative min-h-screen w-full min-w-full overflow-x-hidden flex flex-col justify-between'
      }
    >
      {/* Background Animated Halos (Fidelidad Oficial InnovaHub360) */}
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

      {/* SVG Vector Mesh Background Overlay */}
      <svg
        width="100%"
        height="100%"
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none w-full h-full opacity-40 z-0"
      >
        <defs>
          <pattern id="vmesh" width="240" height="240" patternUnits="userSpaceOnUse">
            <g stroke="#FFFFFF" strokeOpacity="0.16" strokeWidth="1" fill="none">
              <path d="M0 120 L60 60 L120 0 M120 0 L180 70 L240 120 M240 120 L175 175 L120 240 M120 240 L70 180 L0 120" />
              <path d="M60 60 L120 120 L180 70 M70 180 L120 120 L175 175 M60 60 L180 70 M70 180 L175 175" />
            </g>
            <g fill="#FFFFFF" fillOpacity="0.22">
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

      {/* Header Glassmorphism */}
      <Header
        currentTool={currentTool}
        onSelectTool={setCurrentTool}
        theme={theme}
        onToggleTheme={toggleTheme}
        isZoeOpen={isZoeOpen}
        onToggleZoe={() => setIsZoeOpen((prev) => !prev)}
        zoeState={zoeState}
      />

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
          />
        )}
        {currentTool === 'radar' && <RadarView onNavigate={setCurrentTool} />}
        {currentTool === 'estudio' && <EstudioTerritorialView onNavigate={setCurrentTool} />}
        {currentTool === 'ideacion' && <IdeacionEstrategicaView onNavigate={setCurrentTool} />}
        {currentTool === 'arbol' && <ArbolInnovacionView onNavigate={setCurrentTool} />}
        {currentTool === 'prototipado' && <PrototipadoView onNavigate={setCurrentTool} />}
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

      {/* Footer Oficial: Desarrolladores justificados a la derecha junto al Logo UNAD */}
      <footer
        className={
          currentTool === 'portal'
            ? 'relative z-20 box-border w-full px-4 sm:px-6 md:px-8 xl:px-12 2xl:px-16 py-2.5 border-t border-white/10 flex items-center justify-end'
            : 'relative z-20 box-border w-full px-4 sm:px-6 md:px-8 xl:px-12 2xl:px-16 pt-8 pb-52 md:pb-80 border-t border-white/10 mt-12 flex items-center justify-end'
        }
      >
        <div className="flex items-center gap-3.5 sm:gap-4 justify-end">
          {/* Bloque de Desarrolladores justificado hacia la derecha, junto al logo UNAD */}
          <div className="flex flex-col text-right leading-tight">
            <span className="text-[7.5px] uppercase tracking-wider text-[#F29F05]/75 font-semibold">
              Desarrollado por
            </span>
            <span className="text-[10px] italic text-white/60 tracking-tight mt-0.5 font-light">
              Natalia Elizabeth Perez
            </span>
            <span className="text-[10px] italic text-white/60 tracking-tight font-light">
              Camilo Esteban Lozano
            </span>
          </div>

          {/* Logo PNG Oficial UNAD Acreditada - Tonalidad natural sin resplandor agresivo */}
          <div className="flex items-center shrink-0">
            <img
              src="/assets/unad_acreditada.png"
              alt="Universidad Nacional Abierta y a Distancia · Acreditada en Alta Calidad"
              className="h-9 sm:h-10 w-auto object-contain opacity-90 hover:opacity-100 transition-opacity"
              title="UNAD - Acreditada en Alta Calidad"
            />
          </div>

          {/* Logo PNG Oficial VIEM - Tonalidad natural sin resplandor agresivo */}
          <div className="flex items-center shrink-0">
            <img
              src="/assets/viem_logo.png"
              alt="VIEM · Vicerrectoría de Innovación y Emprendimiento"
              className="h-8 sm:h-9 w-auto object-contain opacity-85 hover:opacity-100 transition-opacity"
              title="Vicerrectoría de Innovación y Emprendimiento (VIEM)"
            />
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;