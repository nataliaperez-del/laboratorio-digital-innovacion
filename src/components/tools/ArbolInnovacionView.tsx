import React, { useState } from 'react';
import { Download, Trees, Sparkles, ChevronRight, Info, CheckCircle2, ArrowRight } from 'lucide-react';

type PartId =
  | 'frutos'
  | 'hojas'
  | 'ramas-globales'
  | 'ramas-nacionales'
  | 'ramas-territoriales'
  | 'tronco'
  | 'raiz'
  | 'suelo';

interface TreePart {
  id: PartId;
  label: string;
  subtitle: string;
  color: string;
  description: string;
  items: string[];
}

export const ArbolInnovacionView: React.FC = () => {
  const [selectedPartId, setSelectedPartId] = useState<PartId>('frutos');

  const treeParts: Record<PartId, TreePart> = {
    frutos: {
      id: 'frutos',
      label: 'Frutos · Proyectos, Servicios y Prototipos',
      subtitle: 'Resultados tangibles transferibles al territorio',
      color: '#F29F05',
      description: 'Los frutos representan el portafolio concreto de servicios de innovación, prototipos tecnológicos y soluciones que el CIP pone a disposición de las comunidades y sectores productivos.',
      items: [
        'Servicio de Vigilancia Tecnológica Zonal e Inteligencia Competitiva',
        'Fábrica de Bioinsumos y Monitoreo Biotecnológico Campesino',
        'Laboratorio Móvil de Prototipado y Validación Rápida',
        'Plataforma de Trazabilidad y Certificación de Origen Agroproductivo',
      ],
    },
    hojas: {
      id: 'hojas',
      label: 'Hojas · Oportunidades de Innovación',
      subtitle: 'Respuestas estratégicas emergentes',
      color: '#A8C63C',
      description: 'Espacios de oportunidad detectados a partir del cruce entre las tendencias tecnológicas y las brechas territoriales.',
      items: [
        'Transición agroecológica con base biotecnológica comunitaria',
        'Digitalización de canales de comercialización sin intermediarios',
        'Eficiencia hídrica y energética con microgeneración distribuida',
      ],
    },
    'ramas-globales': {
      id: 'ramas-globales',
      label: 'Ramas Globales · 10 Tendencias Mundiales',
      subtitle: 'Horizontes internacionales de disrupción',
      color: '#27DCFF',
      description: 'Megatendencias científicas y tecnológicas con impacto global (IA generativa, bioeconomía, WebXR, computación cuántica, nuevos materiales).',
      items: [
        'Inteligencia Artificial Multimodal y Automatización Cognitiva',
        'Bioeconomía Circular y Biorremediación',
        'Descentralización y Trazabilidad Criptográfica de Cadenas',
        'Energías Renovables de Nueva Generación y Almacenamiento Sostenible',
      ],
    },
    'ramas-nacionales': {
      id: 'ramas-nacionales',
      label: 'Ramas Nacionales · 5 Tendencias Colombia',
      subtitle: 'Prioridades del Plan Nacional y Políticas Públicas',
      color: '#5091FF',
      description: 'Orientaciones alineadas con la reindustrialización, soberanía alimentaria y convergencia regional.',
      items: [
        'Políticas de Reindustrialización y Cadenas Cortas Agroalimentarias',
        'Transición Energética Justa y Comunidades Energéticas',
        'Democratización de la Conectividad y Redes Neutras',
      ],
    },
    'ramas-territoriales': {
      id: 'ramas-territoriales',
      label: 'Ramas Territoriales · 3 Tendencias Locales',
      subtitle: 'Dinámicas específicas del municipio y zona',
      color: '#B85EFF',
      description: 'Patrones locales de transformación socioeconómica identificados en el Estudio Territorial.',
      items: [
        'Relevo generacional campesino mediado por tecnología',
        'Transformación de biomasa de café y cacao en subproductos de alto valor',
        'Turismo comunitario regenerativo con soporte digital',
      ],
    },
    tronco: {
      id: 'tronco',
      label: 'Tronco · Tema Estratégico CIP',
      subtitle: 'Eje articulador del Centro de Innovación',
      color: '#EAF4F7',
      description: 'El tema central seleccionado por el equipo a partir del análisis de vocación territorial. Sostiene toda la estructura metodológica.',
      items: [
        'Biotecnología y Tecnologías Digitales para la Soberanía Agroalimentaria',
        'Enfoque de Innovación Abierta con Inclusión de Pequeños Productores',
      ],
    },
    raiz: {
      id: 'raiz',
      label: 'Raíces · Vocación y Capacidades',
      subtitle: 'Anclaje en saberes locales y capacidades UNAD',
      color: '#A8C63C',
      description: 'Capacidades de investigación de las 6 escuelas de la UNAD, grupos de investigación SIGIIP y saberes tradicionales de la región.',
      items: [
        'Capacidades de la Escuela de Ciencias Agrícolas, Pecuarias y del Medio Ambiente (ECAPMA)',
        'Grupos de investigación categorizados en MinCiencias de la Zona',
        'Saberes ancestrales de manejo de suelos y conservación comunitaria',
      ],
    },
    suelo: {
      id: 'suelo',
      label: 'Suelo · Retos y Brechas Territoriales',
      subtitle: 'Condiciones de partida y problemáticas base',
      color: '#E2885A',
      description: 'Problemáticas estructurales diagnosticadas en el Contenedor 2: brecha de conectividad, cambio climático, falta de valor agregado y dispersión territorial.',
      items: [
        'Altos costos de insumos agrícolas y degradación del suelo',
        'Baja penetración de conectividad de alta velocidad en veredas',
        'Dificultad de acceso a mercados formalizados para asociaciones campesinas',
      ],
    },
  };

  const selectedPart = treeParts[selectedPartId];

  return (
    <div className="space-y-6">
      {/* Title Row */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <nav className="m text-xs text-brand-textMuted mb-2" aria-label="Migas de pan">
            <span>Inicio</span> <span className="opacity-40">/</span> <span>Herramientas</span> <span className="opacity-40">/</span> <span className="text-white">Árbol de Innovación</span>
          </nav>
          <h1 className="h2 text-3xl md:text-4xl text-white font-bold tracking-tight">Metáfora del Árbol de Innovación</h1>
          <p className="bd text-sm text-brand-textSecondary mt-1">
            Articulación integral entre retos territoriales, capacidades de investigación, tendencias y portafolio de servicios.
          </p>
        </div>

        <button
          onClick={() => window.print()}
          className="metal px-4 py-2 text-xs text-white flex items-center gap-2 cursor-pointer shrink-0"
        >
          <Download className="w-4 h-4 text-[#5EC2DD]" />
          <span>Exportar Diagrama SVG</span>
        </button>
      </div>

      {/* Main Grid: Interactive Tree Diagram + Inspection Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Visual Interactive Tree (SVG based) */}
        <div className="lg:col-span-7 g p-6 flex flex-col items-center justify-center min-h-[560px] relative overflow-hidden">
          <svg viewBox="0 0 500 580" className="w-full max-w-[480px] h-auto select-none">
            <defs>
              <linearGradient id="treeGlow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#27DCFF" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#04222B" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Tree Background Glow */}
            <circle cx="250" cy="220" r="190" fill="url(#treeGlow)" />

            {/* SUELO (Ground) */}
            <g
              className="cursor-pointer transition-opacity hover:opacity-90"
              onClick={() => setSelectedPartId('suelo')}
            >
              <rect x="50" y="500" width="400" height="40" rx="8" fill="#E2885A" fillOpacity={selectedPartId === 'suelo' ? 0.9 : 0.35} stroke="#E2885A" strokeWidth="1.5" />
              <text x="250" y="525" textAnchor="middle" fill="#FFFFFF" fontSize="13" fontWeight="bold" fontFamily="Space Grotesk">
                🟫 SUELO · Retos y Brechas Territoriales
              </text>
            </g>

            {/* RAÍCES (Roots) */}
            <g
              className="cursor-pointer transition-opacity hover:opacity-90"
              onClick={() => setSelectedPartId('raiz')}
            >
              <path
                d="M 210 440 Q 150 470 120 500 M 250 440 L 250 500 M 290 440 Q 350 470 380 500"
                stroke="#A8C63C"
                strokeWidth={selectedPartId === 'raiz' ? 6 : 3.5}
                strokeLinecap="round"
                fill="none"
              />
              <rect x="160" y="455" width="180" height="30" rx="6" fill="#A8C63C" fillOpacity={selectedPartId === 'raiz' ? 0.95 : 0.4} stroke="#A8C63C" strokeWidth="1" />
              <text x="250" y="475" textAnchor="middle" fill="#FFFFFF" fontSize="12" fontWeight="bold" fontFamily="Space Grotesk">
                🌱 RAÍZ · Vocación y Capacidades
              </text>
            </g>

            {/* TRONCO (Trunk) */}
            <g
              className="cursor-pointer transition-opacity hover:opacity-90"
              onClick={() => setSelectedPartId('tronco')}
            >
              <rect
                x="215"
                y="300"
                width="70"
                height="140"
                rx="10"
                fill="#0C5E78"
                fillOpacity={selectedPartId === 'tronco' ? 0.95 : 0.45}
                stroke="#27DCFF"
                strokeWidth={selectedPartId === 'tronco' ? 2 : 1}
              />
              <text x="250" y="375" textAnchor="middle" fill="#FFFFFF" fontSize="13" fontWeight="bold" fontFamily="Space Grotesk" transform="rotate(-90 250 375)">
                🪵 TRONCO · Tema Central
              </text>
            </g>

            {/* RAMAS (Branches: Globales, Nacionales, Territoriales) */}
            <g>
              {/* Ramas Globales */}
              <g className="cursor-pointer" onClick={() => setSelectedPartId('ramas-globales')}>
                <path d="M 230 310 Q 140 250 90 210" stroke="#27DCFF" strokeWidth={selectedPartId === 'ramas-globales' ? 5 : 2.5} fill="none" />
                <rect x="25" y="190" width="130" height="28" rx="6" fill="#27DCFF" fillOpacity={selectedPartId === 'ramas-globales' ? 0.95 : 0.3} stroke="#27DCFF" strokeWidth="1" />
                <text x="90" y="208" textAnchor="middle" fill="#FFFFFF" fontSize="10.5" fontWeight="bold" fontFamily="Space Grotesk">
                  🌿 Ramas Globales (10)
                </text>
              </g>

              {/* Ramas Nacionales */}
              <g className="cursor-pointer" onClick={() => setSelectedPartId('ramas-nacionales')}>
                <path d="M 250 300 L 250 180" stroke="#5091FF" strokeWidth={selectedPartId === 'ramas-nacionales' ? 5 : 2.5} fill="none" />
                <rect x="185" y="160" width="130" height="28" rx="6" fill="#5091FF" fillOpacity={selectedPartId === 'ramas-nacionales' ? 0.95 : 0.3} stroke="#5091FF" strokeWidth="1" />
                <text x="250" y="178" textAnchor="middle" fill="#FFFFFF" fontSize="10.5" fontWeight="bold" fontFamily="Space Grotesk">
                  🌿 Ramas Colombia (5)
                </text>
              </g>

              {/* Ramas Territoriales */}
              <g className="cursor-pointer" onClick={() => setSelectedPartId('ramas-territoriales')}>
                <path d="M 270 310 Q 360 250 410 210" stroke="#B85EFF" strokeWidth={selectedPartId === 'ramas-territoriales' ? 5 : 2.5} fill="none" />
                <rect x="345" y="190" width="130" height="28" rx="6" fill="#B85EFF" fillOpacity={selectedPartId === 'ramas-territoriales' ? 0.95 : 0.3} stroke="#B85EFF" strokeWidth="1" />
                <text x="410" y="208" textAnchor="middle" fill="#FFFFFF" fontSize="10.5" fontWeight="bold" fontFamily="Space Grotesk">
                  🌿 Ramas Locales (3)
                </text>
              </g>
            </g>

            {/* HOJAS (Leaves / Oportunidades) */}
            <g className="cursor-pointer" onClick={() => setSelectedPartId('hojas')}>
              <ellipse cx="140" cy="115" rx="55" ry="32" fill="#A8C63C" fillOpacity={selectedPartId === 'hojas' ? 0.85 : 0.3} stroke="#A8C63C" strokeWidth="1.5" />
              <text x="140" y="120" textAnchor="middle" fill="#FFFFFF" fontSize="11" fontWeight="bold" fontFamily="Space Grotesk">
                🍃 HOJAS
              </text>
              <ellipse cx="360" cy="115" rx="55" ry="32" fill="#A8C63C" fillOpacity={selectedPartId === 'hojas' ? 0.85 : 0.3} stroke="#A8C63C" strokeWidth="1.5" />
              <text x="360" y="120" textAnchor="middle" fill="#FFFFFF" fontSize="11" fontWeight="bold" fontFamily="Space Grotesk">
                🍃 Oportunidades
              </text>
            </g>

            {/* FRUTOS (Crown / Proyectos y Servicios) */}
            <g className="cursor-pointer" onClick={() => setSelectedPartId('frutos')}>
              <circle cx="250" cy="70" r="48" fill="#F29F05" fillOpacity={selectedPartId === 'frutos' ? 0.95 : 0.45} stroke="#F29F05" strokeWidth="2" className={selectedPartId === 'frutos' ? 'animate-pulse' : ''} />
              <text x="250" y="65" textAnchor="middle" fill="#FFFFFF" fontSize="14" fontWeight="bold" fontFamily="Space Grotesk">
                🍎 FRUTOS
              </text>
              <text x="250" y="82" textAnchor="middle" fill="#04222B" fontSize="10" fontWeight="bold" fontFamily="IBM Plex Mono">
                Servicios & Proyectos
              </text>
            </g>
          </svg>

          <p className="text-xs text-brand-textMuted text-center mt-2 m">
            Haz clic en cualquier parte del árbol para auditar sus componentes y transferirlos al Generador de Servicios.
          </p>
        </div>

        {/* Level Detail Inspection Panel */}
        <div className="lg:col-span-5 g p-6 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <span
              className="w-3.5 h-3.5 rounded-full shrink-0"
              style={{ backgroundColor: selectedPart.color }}
            />
            <span className="text-xs font-semibold uppercase tracking-wider text-brand-textMuted l">
              Nivel Seleccionado
            </span>
          </div>

          <h2 className="text-xl font-bold text-white sy">{selectedPart.label}</h2>
          <p className="text-xs text-[#5EC2DD] font-medium">{selectedPart.subtitle}</p>

          <p className="text-sm text-brand-textSecondary leading-relaxed border-t border-white/10 pt-3">
            {selectedPart.description}
          </p>

          <div>
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider l mb-2.5">
              Evidencias y Entregables del Nivel:
            </h4>
            <div className="space-y-2">
              {selectedPart.items.map((item, idx) => (
                <div key={idx} className="flex items-start gap-2.5 text-xs g2 p-2.5 rounded-xl text-white/90">
                  <CheckCircle2 className="w-4 h-4 text-[#A8C63C] shrink-0 mt-0.5" />
                  <span className="leading-snug">{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 mt-auto border-t border-white/10">
            <div className="flex items-center justify-between text-xs text-brand-textMuted mb-2">
              <span>Siguiente fase metodológica:</span>
              <span className="text-white font-semibold">Generador de Servicios</span>
            </div>
            <button
              type="button"
              className="w-full metal py-2.5 px-4 text-xs font-semibold text-white flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Convertir Frutos en Servicios CIP</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#F3C26B]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
