import React from 'react';
import { ArrowRight, Layers, BrainCircuit, Trees, Rocket, Sparkles, FolderArchive, Trophy, Compass } from 'lucide-react';
import { ToolId } from '../layout/Header';
import { MODULE_LABELS } from '@/lib/moduleLabels';
import { useAuth } from '@/components/auth/AuthGate';

interface PortalCatalogProps {
  onSelectTool: (tool: ToolId) => void;
  onOpenZoe: (text?: string) => void;
  onPlayIntro: () => void;
  onOpenBadges?: () => void;
}

/** Inicio: presentación del Laboratorio, sus herramientas y accesos rápidos. El video de ZOE se abre con su carita. */
export const PortalCatalog: React.FC<PortalCatalogProps> = ({ onSelectTool, onOpenZoe, onOpenBadges }) => {
  const auth = useAuth();
  const allTools = [
    {
      id: 'estudio' as ToolId,
      name: MODULE_LABELS.estudio.title,
      desc: 'Estudio Territorial: diagnóstico en 12 puntos y fuentes regionales',
      icon: Layers,
      color: '#A8C63C',
    },
    {
      id: 'ideacion' as ToolId,
      name: MODULE_LABELS.ideacion.title,
      desc: 'Ideación: vocación productiva y selección de temas',
      icon: BrainCircuit,
      color: '#F29F05',
    },
    {
      id: 'arbol' as ToolId,
      name: MODULE_LABELS.arbol.title,
      desc: 'Árbol de Innovación: circuito 10 globales · 5 Colombia · 3 territorio',
      icon: Trees,
      color: '#5EC2DD',
    },
    {
      id: 'prototipado' as ToolId,
      name: MODULE_LABELS.prototipado.title,
      desc: 'Prototipado: planes de solución e hipótesis con IA',
      icon: Rocket,
      color: '#E024A5',
    },
    {
      id: 'banco' as ToolId,
      name: MODULE_LABELS.banco.short!,
      desc: 'Repositorio transversal de ejercicios',
      icon: FolderArchive,
      color: '#A78BFA',
    },
  ];
  // El Contenedor de resultados es solo del administrador.
  const tools = allTools.filter((t) => t.id !== 'banco' || auth.role === 'admin');

  return (
    <div className="relative w-full h-full flex-1 flex items-center justify-center overflow-hidden">
      {/* =========================================================================
          SLIDE 1: PRESENTACIÓN OFICIAL DEL LABORATORIO
          Cubre toda la sección con bordes holográficos desvanecidos hacia el fondo
          ========================================================================= */}
      <div className="absolute inset-0 w-full h-full flex flex-col justify-center items-center z-10">
        <section
          className="portal-panel relative w-full h-full flex flex-col justify-between p-5 pb-28 sm:p-10 sm:pb-24 md:p-12 md:pb-12 overflow-y-auto overflow-x-hidden md:overflow-hidden"
          style={{
            // Fondo de vidrio holográfico con bordes que se desvanecen gradualmente en transparencia
            background:
              'radial-gradient(ellipse 95% 90% at 50% 50%, rgba(4, 34, 43, 0.72) 0%, rgba(4, 34, 43, 0.45) 55%, rgba(2, 20, 26, 0.15) 85%, transparent 100%)',
            WebkitMaskImage: 'radial-gradient(ellipse 98% 95% at 50% 50%, black 75%, transparent 100%)',
            maskImage: 'radial-gradient(ellipse 98% 95% at 50% 50%, black 75%, transparent 100%)',
          }}
        >
          {/* Halo sutil de luz holográfica central */}
          <div
            className="portal-halo absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] pointer-events-none rounded-full opacity-25"
            style={{
              background: 'radial-gradient(ellipse, rgba(39,220,255,0.35) 0%, rgba(4,34,43,0) 70%)',
            }}
          />

          {/* Líneas tenues de holograma que se desvanecen */}
          <div
            className="portal-lines absolute inset-0 pointer-events-none opacity-15"
            style={{
              backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(39,220,255,0.06) 3px, rgba(39,220,255,0.06) 4px)',
            }}
          />

          {/* Bloque Superior y Contenido Principal */}
          <div className="relative z-10 max-w-5xl mx-auto w-full my-auto space-y-4 sm:space-y-5">
            {/* Título Principal */}
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold text-white tracking-tight leading-tight sy drop-shadow-[0_4px_16px_rgba(39,220,255,0.25)]">
              Laboratorio de Innovación en Línea
            </h1>

            {/* Texto de Bienvenida */}
            <p className="text-sm sm:text-base md:text-lg text-[#CFE0E6] leading-relaxed max-w-4xl">
              Entorno interactivo de experimentación y prototipado rápido concebido dentro del Observatorio InnovaHub360. Aquí la inteligencia territorial se
              convierte en acción: caracterizas desafíos regionales, descubres tendencias en árboles holográficos de innovación y formulas planes de prototipado
              listos para el territorio, asistido en cada fase por <strong>ZOE</strong>.
            </p>

            {/* Accesos directos a las 4 herramientas del LAB */}
            <div className="pt-2">
              <span className="text-[11px] uppercase tracking-wider text-[#5EC2DD] font-bold block mb-3 m">Herramientas Disponibles en el Laboratorio:</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {tools.map((t) => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => onSelectTool(t.id)}
                      className="portal-tool-card p-4 rounded-2xl bg-white/[0.04] backdrop-blur-md hover:bg-[#27DCFF]/10 transition-all text-left flex flex-col justify-between group cursor-pointer hover:scale-[1.02] shadow-sm hover:shadow-[0_0_20px_rgba(39,220,255,0.25)]"
                    >
                      <div className="flex items-center justify-between mb-2.5">
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center border"
                          style={{
                            backgroundColor: `${t.color}20`,
                            borderColor: `${t.color}55`,
                          }}
                        >
                          <Icon className="w-4.5 h-4.5" style={{ color: t.color }} />
                        </div>
                        <ArrowRight className="w-4 h-4 text-white/40 group-hover:text-[#27DCFF] group-hover:translate-x-1 transition-all" />
                      </div>
                      <div>
                        <span className="portal-tool-name text-base font-bold sy block transition-colors" style={{ color: t.color }}>{t.name}</span>
                        <span className="text-xs text-[#A6C0CA] block mt-1 leading-snug">{t.desc}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Barra Inferior: Insignias de Innovación + Botón para hablar con ZOE */}
          <div className="relative z-10 max-w-5xl mx-auto w-full pt-4 flex items-center justify-between">
            <button
              type="button"
              onClick={onOpenBadges}
              className="portal-bottom-btn px-4 py-2 rounded-full bg-white/5 backdrop-blur-md text-xs font-semibold text-[#FFD700] border border-[#FFD700]/30 hover:bg-[#FFD700]/15 flex items-center gap-2 cursor-pointer transition-all shadow-sm"
              title="Abrir Vitrina de Insignias y Logros"
            >
              <Trophy className="w-3.5 h-3.5 text-[#FFD700]" />
              <span>Insignias de Innovación</span>
            </button>

            <div className="flex flex-wrap items-center justify-end gap-2">
              {/* El recorrido guiado: ZOE muestra cada herramienta con un ejemplo y cuenta qué ruta seguir. */}
              <button
                type="button"
                onClick={() => onOpenZoe('Muéstrame el laboratorio')}
                className="portal-bottom-btn px-4 py-2.5 rounded-full bg-white/5 backdrop-blur-md text-xs font-semibold text-[#A8C63C] border border-[#A8C63C]/40 hover:bg-[#A8C63C]/15 flex items-center gap-2 cursor-pointer transition-all shadow-sm"
              >
                <Compass className="w-3.5 h-3.5 text-[#A8C63C]" aria-hidden="true" />
                <span>Recorrido guiado con ZOE</span>
              </button>
              <button
                type="button"
                onClick={() => onOpenZoe()}
                className="portal-bottom-btn px-4 py-2.5 rounded-full bg-white/5 backdrop-blur-md text-xs font-semibold text-[#27DCFF] border border-[#27DCFF]/40 hover:bg-[#27DCFF]/15 flex items-center gap-2 cursor-pointer transition-all shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#27DCFF]" />
                <span>Hablar con ZOE</span>
              </button>
            </div>
          </div>
        </section>
      </div>

    </div>
  );
};
