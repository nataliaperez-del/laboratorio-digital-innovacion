import React, { useState } from 'react';
import { Download, Sparkles, Filter, ChevronDown, Check, ExternalLink } from 'lucide-react';

interface Signal {
  id: string;
  name: string;
  category: string;
  horizon: 'Corto plazo (H1)' | 'Mediano plazo (H2)' | 'Largo plazo (H3)';
  impact: 'Alto' | 'Medio' | 'Bajo';
  adoption: 'Temprana' | 'Crecimiento' | 'Madura';
  priority: 'alta' | 'media' | 'baja';
  scope: 'Internacional' | 'Nacional' | 'Territorial';
  description: string;
  cx: number;
  cy: number;
  color: string;
  related: string[];
}

export const RadarView: React.FC = () => {
  const [viewMode, setViewMode] = useState<'radar' | 'lista'>('radar');
  const [selectedHorizon, setSelectedHorizon] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [activeSignalId, setActiveSignalId] = useState<string>('sig-1');

  const signals: Signal[] = [
    {
      id: 'sig-1',
      name: 'IA generativa para tutoría personalizada',
      category: 'Tecnología y datos',
      horizon: 'Corto plazo (H1)',
      impact: 'Alto',
      adoption: 'Temprana',
      priority: 'alta',
      scope: 'Internacional',
      description: 'Fortalece rutas de aprendizaje autónomo, retroalimentación formativa y analítica académica si se gobierna con criterios éticos y soberanía de datos.',
      cx: 74,
      cy: -46,
      color: '#F29F05',
      related: ['Evaluación auténtica asistida por IA', 'Microcredenciales verificables'],
    },
    {
      id: 'sig-2',
      name: 'Gemelos digitales para monitoreo agroclimático',
      category: 'Agrotech & Territorio',
      horizon: 'Corto plazo (H1)',
      impact: 'Alto',
      adoption: 'Crecimiento',
      priority: 'media',
      scope: 'Territorial',
      description: 'Modelación geoespacial en tiempo real de cuencas y parcelas rurales para anticipar heladas, sequías y optimizar irrigación en economías campesinas.',
      cx: -108,
      cy: 62,
      color: '#A8C63C',
      related: ['Sensores IoT de bajo costo', 'Sistemas de alerta comunitaria'],
    },
    {
      id: 'sig-3',
      name: 'Bioinsumos y biofactorías circulares',
      category: 'Biotecnología y Sostenibilidad',
      horizon: 'Mediano plazo (H2)',
      impact: 'Alto',
      adoption: 'Temprana',
      priority: 'alta',
      scope: 'Nacional',
      description: 'Aprovechamiento de biomasa residual de cosechas locales para producir biofertilizantes y bioplásticos a escala de asociación comunitaria.',
      cx: 56,
      cy: 62,
      color: '#F29F05',
      related: ['Economía circular campesina', 'Certificación verde'],
    },
    {
      id: 'sig-4',
      name: 'Simuladores inmersivos WebXR offline-first',
      category: 'EdTech & Simulación',
      horizon: 'Corto plazo (H1)',
      impact: 'Medio',
      adoption: 'Crecimiento',
      priority: 'media',
      scope: 'Internacional',
      description: 'Laboratorios virtuales de física, robótica y agronomía capaces de operar en zonas de baja o nula conectividad mediante sincronización periódica.',
      cx: 38,
      cy: 142,
      color: '#2E9CBA',
      related: ['Aulas móviles tecnológicas', 'Contenidos interactivos PWA'],
    },
    {
      id: 'sig-5',
      name: 'Redes comunitarias de conectividad satelital LEO',
      category: 'Infraestructura y Conectividad',
      horizon: 'Mediano plazo (H2)',
      impact: 'Alto',
      adoption: 'Temprana',
      priority: 'media',
      scope: 'Territorial',
      description: 'Despliegue de constelaciones de órbita baja gestionadas por cooperativas locales para cerrar la brecha digital en corregimientos dispersos.',
      cx: -62,
      cy: -118,
      color: '#A98FD6',
      related: ['Centros comunitarios digitales', 'Telemedicina rural'],
    },
    {
      id: 'sig-6',
      name: 'Plataformas de trazabilidad blockchain para café y cacao',
      category: 'Agrotech & Territorio',
      horizon: 'Corto plazo (H1)',
      impact: 'Medio',
      adoption: 'Madura',
      priority: 'baja',
      scope: 'Nacional',
      description: 'Certificación inviolable de origen, comercio justo y cero deforestación para exportación directa de pequeños productores.',
      cx: 166,
      cy: 92,
      color: '#2E9CBA',
      related: ['Comercio justo digital', 'Identidad digital campesina'],
    },
    {
      id: 'sig-7',
      name: 'Energía solar comunitaria con microrredes inteligentes',
      category: 'Sostenibilidad y Energía',
      horizon: 'Mediano plazo (H2)',
      impact: 'Alto',
      adoption: 'Crecimiento',
      priority: 'media',
      scope: 'Territorial',
      description: 'Generación distribuida fotovoltaica con almacenamiento en baterías recicladas para electrificación de centros de acopio y sedes educativas.',
      cx: -172,
      cy: -56,
      color: '#E2885A',
      related: ['Transición energética justa', 'Bombeo solar'],
    },
    {
      id: 'sig-8',
      name: 'Agentes autónomos de analítica prospectiva territorial',
      category: 'Tecnología y datos',
      horizon: 'Largo plazo (H3)',
      impact: 'Alto',
      adoption: 'Temprana',
      priority: 'alta',
      scope: 'Internacional',
      description: 'Modelos de razonamiento avanzado que cruzan censos DANE, planes de desarrollo y dinámica climática para formular alertas tempranas de competitividad.',
      cx: 122,
      cy: -150,
      color: '#F29F05',
      related: ['Observatorios territoriales automatizados', 'ZOE Asesor Predictivo'],
    },
  ];

  const filteredSignals = signals.filter((s) => {
    if (selectedHorizon !== 'all' && !s.horizon.includes(selectedHorizon)) return false;
    if (selectedPriority !== 'all' && s.priority !== selectedPriority) return false;
    return true;
  });

  const activeSignal = signals.find((s) => s.id === activeSignalId) || signals[0];

  return (
    <div className="space-y-6">
      {/* Title & View Toggle Row */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <nav className="m text-xs text-brand-textMuted mb-2" aria-label="Migas de pan">
            <span>Inicio</span> <span className="opacity-40">/</span> <span>Herramientas</span> <span className="opacity-40">/</span> <span className="text-white">Radar de Innovación</span>
          </nav>
          <h1 className="h2 text-3xl md:text-4xl text-white font-bold tracking-tight">Radar Tecnológico InnovaHub360</h1>
          <p className="bd text-sm text-brand-textSecondary mt-1">
            Vigilancia prospectiva y señales de cambio para Centros de Innovación Productiva (Centro de Innovación).{' '}
            <strong className="text-white font-semibold">{filteredSignals.length} de {signals.length} señales activas</strong>
          </p>
        </div>

        {/* View Toggle Pill */}
        <div className="g2 p-1.5 flex gap-1 rounded-full shrink-0">
          <button
            type="button"
            onClick={() => setViewMode('radar')}
            className={`px-5 py-2 rounded-full text-xs font-semibold sy transition-all cursor-pointer ${
              viewMode === 'radar'
                ? 'bg-white/15 text-white shadow-sm'
                : 'text-brand-textMuted hover:text-white'
            }`}
          >
            Radar SVG
          </button>
          <button
            type="button"
            onClick={() => setViewMode('lista')}
            className={`px-5 py-2 rounded-full text-xs font-semibold sy transition-all cursor-pointer ${
              viewMode === 'lista'
                ? 'bg-white/15 text-white shadow-sm'
                : 'text-brand-textMuted hover:text-white'
            }`}
          >
            Lista Detallada
          </button>
        </div>
      </div>

      {/* Filter Controls Bar */}
      <div className="g2 p-3 px-4 flex items-center gap-3 flex-wrap rounded-2xl">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-brand-teal" />
          <span className="text-xs text-brand-textSecondary font-medium">Filtros:</span>
        </div>

        {/* Horizon Filter */}
        <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1 text-xs">
          <span className="text-brand-textMuted">Horizonte:</span>
          <select
            value={selectedHorizon}
            onChange={(e) => setSelectedHorizon(e.target.value)}
            className="bg-transparent text-white outline-none cursor-pointer"
          >
            <option value="all" className="bg-[#04222B]">Todos (H1, H2, H3)</option>
            <option value="H1" className="bg-[#04222B]">H1 · Corto Plazo</option>
            <option value="H2" className="bg-[#04222B]">H2 · Mediano Plazo</option>
            <option value="H3" className="bg-[#04222B]">H3 · Largo Plazo</option>
          </select>
        </div>

        {/* Priority Filter */}
        <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1 text-xs">
          <span className="text-brand-textMuted">Prioridad:</span>
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="bg-transparent text-white outline-none cursor-pointer"
          >
            <option value="all" className="bg-[#04222B]">Todas</option>
            <option value="alta" className="bg-[#04222B]">Alta</option>
            <option value="media" className="bg-[#04222B]">Media</option>
            <option value="baja" className="bg-[#04222B]">Baja</option>
          </select>
        </div>

        {(selectedHorizon !== 'all' || selectedPriority !== 'all') && (
          <button
            onClick={() => {
              setSelectedHorizon('all');
              setSelectedPriority('all');
            }}
            className="text-xs text-[#F3C26B] hover:underline cursor-pointer"
          >
            Limpiar filtros
          </button>
        )}

        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-brand-textMuted m hidden sm:inline-block">
            Corte Tecnológico 2026
          </span>
          <button
            onClick={() => window.print()}
            className="metal px-3 py-1.5 text-xs text-white flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-[#5EC2DD]" />
            <span>Exportar Vista</span>
          </button>
        </div>
      </div>

      {/* Main View: Radar Matrix vs. List Mode */}
      {viewMode === 'radar' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* SVG Radar Matrix Container */}
          <div className="lg:col-span-8 g relative overflow-hidden p-4 min-h-[540px] flex items-center justify-center">
            {/* Background SVG Grid & Mesh */}
            <svg
              width="100%"
              height="100%"
              viewBox="0 0 560 560"
              preserveAspectRatio="xMidYMid meet"
              className="rdr block max-w-[540px] select-none"
            >
              <defs>
                <radialGradient id="rglowB" cx="0.5" cy="0.5" r="0.5">
                  <stop offset="0" stopColor="#2E9CBA" stopOpacity="0.32" />
                  <stop offset="1" stopColor="#2E9CBA" stopOpacity="0" />
                </radialGradient>
              </defs>

              {/* Glowing Background Radial */}
              <circle cx="280" cy="280" r="230" fill="url(#rglowB)" />

              {/* Concentric Circles & Axes */}
              <g transform="translate(280,280)" fill="none" stroke="#9FD4E4" strokeOpacity="0.3" strokeWidth="1">
                <circle r="58" strokeDasharray="3 3" />
                <circle r="116" />
                <circle r="174" strokeDasharray="3 3" />
                <circle r="220" />
                <path d="M-225 0 H225 M0 -225 V225" />
                <path d="M-157 -157 L157 157 M157 -157 L-157 157" strokeOpacity="0.15" />
              </g>

              {/* Radar Sweep Ray (Animated) */}
              <g transform="translate(280,280)">
                <g className="sweep">
                  <path
                    d="M 0 0 L 220 0 A 220 220 0 0 0 155 -155 Z"
                    fill="#F29F05"
                    fillOpacity="0.08"
                  />
                </g>

                {/* Signals Plotted */}
                {filteredSignals.map((sig) => {
                  const isSelected = sig.id === activeSignalId;
                  return (
                    <g
                      key={sig.id}
                      className="ndg cursor-pointer transition-transform"
                      onClick={() => setActiveSignalId(sig.id)}
                    >
                      {/* Outer Aura */}
                      <circle
                        cx={sig.cx}
                        cy={sig.cy}
                        r={isSelected ? 22 : 12}
                        fill={sig.color}
                        fillOpacity={isSelected ? 0.35 : 0.15}
                        className={isSelected ? 'animate-ping' : ''}
                      />
                      {/* Halo */}
                      <circle
                        className="hal"
                        cx={sig.cx}
                        cy={sig.cy}
                        r={26}
                        fill="none"
                        stroke={sig.color}
                        strokeWidth="1.5"
                      />
                      {/* Signal Core Dot */}
                      <circle
                        className="nd"
                        cx={sig.cx}
                        cy={sig.cy}
                        r={isSelected ? 9 : 6.5}
                        fill={sig.color}
                        stroke="#04222B"
                        strokeWidth="1.5"
                      />
                      {/* Label on Hover / Selected */}
                      <text
                        className="lbl font-bold"
                        x={sig.cx}
                        y={sig.cy - 16}
                        textAnchor="middle"
                        fill="#FFFFFF"
                        fontSize="12"
                      >
                        {sig.name}
                      </text>
                      <text
                        className="lbl mt"
                        x={sig.cx}
                        y={sig.cy - 4}
                        textAnchor="middle"
                        fill="#9FD4E4"
                        fontSize="9.5"
                      >
                        {sig.horizon}
                      </text>
                    </g>
                  );
                })}

                {/* Quadrant Axis Labels */}
                <text x="0" y="-232" textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontSize="11" fill="#9FD4E4" letterSpacing="1.8">
                  ÁREA TECNOLÓGICA
                </text>
                <text x="238" y="4" textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontSize="11" fill="#9FD4E4" letterSpacing="1.8">
                  ACCIÓN
                </text>
                <text x="0" y="242" textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontSize="11" fill="#9FD4E4" letterSpacing="1.8">
                  IMPACTO
                </text>
                <text x="-238" y="4" textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontSize="11" fill="#9FD4E4" letterSpacing="1.8">
                  ADOPCIÓN
                </text>
              </g>
            </svg>

            {/* Bottom Legend */}
            <div className="g2 absolute left-4 bottom-4 flex items-center gap-4 px-3.5 py-2 rounded-xl text-xs text-brand-textMuted">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#F29F05]" /> Prioridad Alta
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#A8C63C]" /> Media
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#2E9CBA]" /> Baja
              </span>
              <span className="hidden sm:inline-block opacity-40">| El radio representa madurez de adopción</span>
            </div>
          </div>

          {/* Active Signal Detail Lateral Card */}
          <div className="lg:col-span-4 g p-6 flex flex-col gap-4 bg-gradient-to-br from-[#0A4A5C]/40 to-transparent">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className="px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider"
                  style={{
                    backgroundColor: `${activeSignal.color}25`,
                    color: activeSignal.color,
                    border: `1px solid ${activeSignal.color}50`,
                  }}
                >
                  Prioridad {activeSignal.priority}
                </span>
                <span className="px-2.5 py-1 rounded-full bg-white/10 text-brand-textMuted text-xs">
                  {activeSignal.scope}
                </span>
              </div>
              <Sparkles className="w-4 h-4 text-[#F3C26B]" />
            </div>

            <h2 className="text-xl font-bold text-white sy leading-snug">{activeSignal.name}</h2>
            <p className="text-sm text-brand-textSecondary leading-relaxed">{activeSignal.description}</p>

            <div className="grid grid-cols-2 gap-3 py-3 border-y border-white/10 text-xs">
              <div>
                <span className="text-brand-textMuted l">Impacto</span>
                <p className="font-semibold text-white mt-0.5">{activeSignal.impact}</p>
              </div>
              <div>
                <span className="text-brand-textMuted l">Adopción</span>
                <p className="font-semibold text-white mt-0.5">{activeSignal.adoption}</p>
              </div>
              <div>
                <span className="text-brand-textMuted l">Horizonte</span>
                <p className="font-semibold text-white mt-0.5">{activeSignal.horizon}</p>
              </div>
              <div>
                <span className="text-brand-textMuted l">Área</span>
                <p className="font-semibold text-white mt-0.5">{activeSignal.category}</p>
              </div>
            </div>

            <div>
              <span className="text-brand-textMuted l block mb-2">Señales Relacionadas</span>
              <div className="space-y-1.5">
                {activeSignal.related.map((rel, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-white/90">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#A8C63C]" />
                    <span>{rel}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 mt-auto">
              <button
                type="button"
                className="w-full metal py-2.5 px-4 text-xs font-semibold text-white flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Conectar con Árbol de Innovación</span>
                <ExternalLink className="w-3.5 h-3.5 text-[#5EC2DD]" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* List Mode View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSignals.map((sig) => (
            <div
              key={sig.id}
              onClick={() => {
                setActiveSignalId(sig.id);
                setViewMode('radar');
              }}
              className="g p-5 rounded-2xl cursor-pointer hover:border-white/30 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span
                    className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider"
                    style={{
                      backgroundColor: `${sig.color}25`,
                      color: sig.color,
                      border: `1px solid ${sig.color}50`,
                    }}
                  >
                    {sig.priority}
                  </span>
                  <span className="text-[11px] text-brand-textMuted m">{sig.horizon}</span>
                </div>
                <h3 className="text-base font-bold text-white sy mb-2">{sig.name}</h3>
                <p className="text-xs text-brand-textSecondary line-clamp-3 leading-relaxed">{sig.description}</p>
              </div>

              <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-brand-textMuted">
                <span>{sig.category}</span>
                <span className="text-[#5EC2DD] hover:underline font-medium">Ver en Radar →</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
