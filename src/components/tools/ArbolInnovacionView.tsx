import React, { useState, useMemo } from 'react';
import {
  Trees,
  Filter,
  Sparkles,
  ChevronRight,
  ArrowRight,
  Share2,
  Table as TableIcon,
  Eye,
  Download,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Edit3,
  Check,
  RefreshCw,
  Rocket
} from 'lucide-react';
import { useStore } from '@/store/useStore';

export interface TreeNode {
  codigo: string;
  nivel: 'suelo' | 'raiz' | 'tronco' | 'global' | 'nacional' | 'territorial' | 'fruto';
  nombre: string;
  descripcion?: string;
  evidencia: 'N1' | 'N2' | 'N3';
  tipo_fruto?: 'proyecto' | 'servicio' | 'prototipo';
  solucion?: string;
  impacto_esperado?: string;
  deriva_de?: string[];
  derivan?: string[];
  alertas?: string[];
  metricas?: {
    impacto?: number;
    adopcion?: number;
    horizonte?: string;
    alcance?: string;
    madurez?: string;
    territorios?: string;
  };
}

interface ArbolInnovacionViewProps {
  onNavigateToPrototyping?: () => void;
}

export const ArbolInnovacionView: React.FC<ArbolInnovacionViewProps> = ({ onNavigateToPrototyping }) => {
  const selectedStrategicTheme = useStore((state) => state.selectedStrategicTheme);
  const setSelectedStrategicTheme = useStore((state) => state.setSelectedStrategicTheme);
  const addTreeFruitToPrototypes = useStore((state) => state.addTreeFruitToPrototypes);
  const setSelectedTreeFruits = useStore((state) => state.setSelectedTreeFruits);

  // Input mode: Theme can be inherited or custom typed/pasted
  const [themeInput, setThemeInput] = useState<string>(selectedStrategicTheme || 'Biotecnología Aplicada y Valorización de Biomasa Agropecuaria');
  const [isEditingTheme, setIsEditingTheme] = useState<boolean>(false);
  const [activeTheme, setActiveTheme] = useState<string>(selectedStrategicTheme || 'Biotecnología Aplicada y Valorización de Biomasa Agropecuaria');

  const [activeView, setActiveView] = useState<'arbol' | 'tabla'>('arbol');
  const [fruitFilter, setFruitFilter] = useState<'todos' | 'proyecto' | 'servicio' | 'prototipo'>('todos');
  const [selectedNodeCode, setSelectedNodeCode] = useState<string>('FR-01');
  const [copiedNotification, setCopiedNotification] = useState<string | null>(null);

  const handleApplyTheme = () => {
    if (!themeInput.trim()) return;
    setActiveTheme(themeInput.trim());
    setSelectedStrategicTheme(themeInput.trim());
    setIsEditingTheme(false);
  };

  // Generate dynamic tree nodes based on the active theme
  const treeNodes: Record<string, TreeNode> = useMemo(() => {
    const isBio = activeTheme.toLowerCase().includes('bio') || activeTheme.toLowerCase().includes('agro');
    const isDigital = activeTheme.toLowerCase().includes('digital') || activeTheme.toLowerCase().includes('ia') || activeTheme.toLowerCase().includes('traza');

    return {
      'SU-01': {
        codigo: 'SU-01',
        nivel: 'suelo',
        nombre: 'Asociaciones Campesinas y Cooperativas Zonales',
        descripcion: 'Organizaciones comunitarias y pequeños productores que habilitan la validación en campo.',
        evidencia: 'N1',
        derivan: ['TR-01'],
      },
      'SU-02': {
        codigo: 'SU-02',
        nivel: 'suelo',
        nombre: 'Grupos de Investigación UNAD (ECAPMA / ECBTI / ECACEN)',
        descripcion: 'Capacidad científica y docente que respalda el desarrollo de soluciones y la vigilancia.',
        evidencia: 'N1',
        derivan: ['TR-01'],
      },
      'SU-03': {
        codigo: 'SU-03',
        nivel: 'suelo',
        nombre: 'Secretarías de Desarrollo Económico y Ambiente',
        descripcion: 'Entidades públicas territoriales garantes de la articulación con planes locales de desarrollo.',
        evidencia: 'N1',
        derivan: ['TR-01'],
      },
      'SU-04': {
        codigo: 'SU-04',
        nivel: 'suelo',
        nombre: 'Cámaras de Comercio y Redes de Emprendimiento',
        descripcion: 'Articuladores del ecosistema empresarial para escalamiento comercial de los prototipos.',
        evidencia: 'N1',
        derivan: ['TR-01'],
      },
      'RZ-01': {
        codigo: 'RZ-01',
        nivel: 'raiz',
        nombre: 'Dependencia de insumos importados de alto costo',
        descripcion: 'Vulnerabilidad ante fluctuaciones del mercado global y tasas de cambio.',
        evidencia: 'N1',
        deriva_de: ['TR-01'],
      },
      'RZ-02': {
        codigo: 'RZ-02',
        nivel: 'raiz',
        nombre: 'Brecha de conectividad en zonas rurales dispersas',
        descripcion: 'Dificultad para el acceso en tiempo real a plataformas de software en la nube.',
        evidencia: 'N2',
        deriva_de: ['TR-01'],
      },
      'RZ-03': {
        codigo: 'RZ-03',
        nivel: 'raiz',
        nombre: 'Intermediación abusiva en la cadena de comercialización',
        descripcion: 'Retención de márgenes por intermediarios que reduce la rentabilidad del productor local.',
        evidencia: 'N1',
        deriva_de: ['TR-01'],
      },
      'RZ-04': {
        codigo: 'RZ-04',
        nivel: 'raiz',
        nombre: 'Degradación de suelos y estrés hídrico por cambio climático',
        descripcion: 'Riesgo ambiental que amenaza la productividad continuada de los cultivos zonales.',
        evidencia: 'N1',
        deriva_de: ['TR-01'],
      },
      'TR-01': {
        codigo: 'TR-01',
        nivel: 'tronco',
        nombre: activeTheme,
        descripcion: `Tema central estratégico del laboratorio: ancla metodológica que articula las 10 tendencias globales, 5 nacionales, 3 territoriales y sus frutos derivados.`,
        evidencia: 'N1',
        deriva_de: ['SU-01', 'SU-02', 'SU-03', 'SU-04'],
        derivan: ['TG-01', 'TG-02', 'TG-03', 'TG-04'],
      },
      'TG-01': {
        codigo: 'TG-01',
        nivel: 'global',
        nombre: isBio ? 'Bioeconomía Circular y Biorremediación' : 'Inteligencia Artificial Multimodal y Automatización',
        descripcion: 'Tendencia internacional en transformación de residuos y valorización biológica de ciclo cerrado.',
        evidencia: 'N1',
        deriva_de: ['TR-01'],
        derivan: ['TN-01'],
        metricas: { impacto: 88, adopcion: 74, horizonte: 'Actuar ahora', alcance: 'Internacional' },
      },
      'TG-02': {
        codigo: 'TG-02',
        nivel: 'global',
        nombre: 'Plataformas de Trazabilidad y Datos Abiertos',
        descripcion: 'Descentralización y verificación digital de cadenas de valor y estándares de sostenibilidad.',
        evidencia: 'N1',
        deriva_de: ['TR-01'],
        derivan: ['TN-02'],
        metricas: { impacto: 82, adopcion: 68, horizonte: 'Pilotear', alcance: 'Internacional' },
      },
      'TG-03': {
        codigo: 'TG-03',
        nivel: 'global',
        nombre: 'Transición Energética Descentralizada e IoT Rural',
        descripcion: 'Generación distribuida de energía limpia y sensores remotos de bajo consumo para el agro.',
        evidencia: 'N2',
        deriva_de: ['TR-01'],
        derivan: ['TN-03'],
        metricas: { impacto: 79, adopcion: 62, horizonte: 'Pilotear', alcance: 'Internacional' },
      },
      'TG-04': {
        codigo: 'TG-04',
        nivel: 'global',
        nombre: 'Modelos de Aprendizaje Abierto y Ciencia Ciudadana',
        descripcion: 'Co-creación comunitaria del conocimiento y validación participativa de tecnologías.',
        evidencia: 'N1',
        deriva_de: ['TR-01'],
        derivan: ['TN-04'],
        metricas: { impacto: 75, adopcion: 58, horizonte: 'Explorar', alcance: 'Internacional' },
      },
      'TN-01': {
        codigo: 'TN-01',
        nivel: 'nacional',
        nombre: 'Reindustrialización y Soberanía de Bioinsumos en Colombia',
        descripcion: 'Política nacional de sustitución de agroquímicos importados y fomento a la bioeconomía.',
        evidencia: 'N1',
        deriva_de: ['TG-01'],
        derivan: ['TT-01'],
        metricas: { impacto: 85, adopcion: 70, horizonte: 'Actuar ahora', alcance: 'Nacional' },
      },
      'TN-02': {
        codigo: 'TN-02',
        nivel: 'nacional',
        nombre: 'Cadenas Cortas Agroalimentarias y Compras Públicas',
        descripcion: 'Marco normativo que prioriza la compra directa a pequeños productores campesinos y comunitarios.',
        evidencia: 'N1',
        deriva_de: ['TG-02'],
        derivan: ['TT-02'],
        metricas: { impacto: 80, adopcion: 65, horizonte: 'Actuar ahora', alcance: 'Nacional' },
      },
      'TN-03': {
        codigo: 'TN-03',
        nivel: 'nacional',
        nombre: 'Comunidades Energéticas y Microgeneración Rural',
        descripcion: 'Estrategia nacional de asociatividad para la soberanía energética en municipios intermedios.',
        evidencia: 'N2',
        deriva_de: ['TG-03'],
        derivan: ['TT-03'],
        metricas: { impacto: 78, adopcion: 60, horizonte: 'Pilotear', alcance: 'Nacional' },
      },
      'TT-01': {
        codigo: 'TT-01',
        nivel: 'territorial',
        nombre: 'Aprovechamiento de Biomasa Residual en la Cuenca Zonal',
        descripcion: 'Expresión territorial: uso de subproductos agrícolas para producir abonos y biocontroladores locales.',
        evidencia: 'N1',
        deriva_de: ['TN-01'],
        derivan: ['FR-01', 'FR-02'],
        metricas: { impacto: 90, adopcion: 76, horizonte: 'Actuar ahora', alcance: 'Regional' },
      },
      'TT-02': {
        codigo: 'TT-02',
        nivel: 'territorial',
        nombre: 'Logística Inversa y Trazabilidad Municipal de Origen',
        descripcion: 'Expresión territorial: canales asociativos directos entre la sabana/provincia y centros urbanos.',
        evidencia: 'N1',
        deriva_de: ['TN-02'],
        derivan: ['FR-03'],
        metricas: { impacto: 84, adopcion: 72, horizonte: 'Actuar ahora', alcance: 'Regional' },
      },
      'TT-03': {
        codigo: 'TT-03',
        nivel: 'territorial',
        nombre: 'Microrredes Solares para Acopio y Refrigeración Campesina',
        descripcion: 'Expresión territorial: electrificación fotovoltaica para preservar la cadena de frío en poscosecha.',
        evidencia: 'N2',
        deriva_de: ['TN-03'],
        derivan: ['FR-04'],
        metricas: { impacto: 81, adopcion: 64, horizonte: 'Pilotear', alcance: 'Regional' },
      },
      'FR-01': {
        codigo: 'FR-01',
        nivel: 'fruto',
        tipo_fruto: 'servicio',
        nombre: 'Servicio de Vigilancia Tecnológica Zonal y Bioinsumos',
        descripcion: 'Servicio permanente de inteligencia competitiva, caracterización de biomasa y formulación de insumos agroecológicos.',
        solucion: 'Laboratorio de pruebas rápidas y boletín de tendencias para cooperativas campesinas.',
        impacto_esperado: 'Reducción del 35% en costos de fertilizantes químicos y aumento de la salud del suelo.',
        evidencia: 'N1',
        deriva_de: ['TT-01'],
      },
      'FR-02': {
        codigo: 'FR-02',
        nivel: 'fruto',
        tipo_fruto: 'prototipo',
        nombre: 'Biorreactor Comunitario Modular de Bajo Costo',
        descripcion: 'Prototipo de reactor biológico modular para la fermentación de microorganismos benéficos en finca.',
        solucion: 'Equipo físico ligero con sensores microcontrolados para estandarizar lotes de bioinsumos.',
        impacto_esperado: 'Producción de 500 litros semanales de biofertilizante de alta concentración con insumos locales.',
        evidencia: 'N2',
        deriva_de: ['TT-01'],
      },
      'FR-03': {
        codigo: 'FR-03',
        nivel: 'fruto',
        tipo_fruto: 'proyecto',
        nombre: 'Plataforma de Trazabilidad QR y Comercio Justo',
        descripcion: 'Proyecto de innovación de software ligero para etiquetado de origen y comercialización sin intermediarios.',
        solucion: 'Aplicación web progresiva accesible con baja conectividad para registro de cosechas y ventas.',
        impacto_esperado: 'Incremento del 28% en el ingreso neto de 120 familias campesinas asociadas.',
        evidencia: 'N1',
        deriva_de: ['TT-02'],
      },
      'FR-04': {
        codigo: 'FR-04',
        nivel: 'fruto',
        tipo_fruto: 'prototipo',
        nombre: 'Estación Solar Híbrida de Monitoreo y Refrigeración',
        descripcion: 'Prototipo energético con paneles solares, almacenamiento en baterías y telemetría de temperatura.',
        solucion: 'Cámara de frío autónoma para evitar pérdidas poscosecha de frutas y hortalizas perecederas.',
        impacto_esperado: 'Cero interrupciones de la cadena de frío y reducción del 90% en huella de carbono de acopio.',
        evidencia: 'N2',
        deriva_de: ['TT-03'],
      },
    };
  }, [activeTheme]);

  // Compute upstream and downstream traversal routes for active node focus
  const activeRoute = useMemo(() => {
    const route: Record<string, boolean> = { [selectedNodeCode]: true };
    const sube = (cod: string) => {
      const node = treeNodes[cod];
      if (!node || !node.deriva_de) return;
      node.deriva_de.forEach((p) => {
        if (!route[p]) {
          route[p] = true;
          sube(p);
        }
      });
    };
    const baja = (cod: string) => {
      const node = treeNodes[cod];
      if (!node || !node.derivan) return;
      node.derivan.forEach((h) => {
        if (!route[h]) {
          route[h] = true;
          baja(h);
        }
      });
    };
    sube(selectedNodeCode);
    baja(selectedNodeCode);
    return route;
  }, [selectedNodeCode, treeNodes]);

  const selectedNode = treeNodes[selectedNodeCode] || treeNodes['FR-01'];

  // All fruits list
  const fruitNodes = useMemo(() => {
    return Object.values(treeNodes).filter(
      (n) => n.nivel === 'fruto' && (fruitFilter === 'todos' || n.tipo_fruto === fruitFilter)
    );
  }, [treeNodes, fruitFilter]);

  const handleSendFruitToPrototypes = (node: TreeNode) => {
    addTreeFruitToPrototypes({
      id: `fruit-${node.codigo}`,
      code: node.codigo,
      name: node.nombre,
      type: node.tipo_fruto || 'prototipo',
      solution: node.solucion || node.descripcion || '',
      impact: node.impacto_esperado || '',
      evidence: node.evidencia,
    });
    setCopiedNotification(`Fruto ${node.codigo} enviado al módulo de Prototipado.`);
    setTimeout(() => setCopiedNotification(null), 3000);
  };

  const handleExportAllFruits = () => {
    const fruits = Object.values(treeNodes)
      .filter((n) => n.nivel === 'fruto')
      .map((n) => ({
        id: `fruit-${n.codigo}`,
        code: n.codigo,
        name: n.nombre,
        type: n.tipo_fruto || ('prototipo' as const),
        solution: n.solucion || n.descripcion || '',
        impact: n.impacto_esperado || '',
        evidence: n.evidencia,
      }));
    setSelectedTreeFruits(fruits);
    if (onNavigateToPrototyping) {
      onNavigateToPrototyping();
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Title & Controls Bar */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <nav className="m text-xs text-brand-textMuted mb-2" aria-label="Migas de pan">
            <span>Inicio</span> <span className="opacity-40">/</span> <span>Herramientas</span> <span className="opacity-40">/</span>{' '}
            <span className="text-white">Árbol de Innovación</span>
          </nav>
          <h1 className="h2 text-3xl md:text-4xl text-white font-bold tracking-tight">Árbol de Innovación</h1>
          <p className="bd text-sm text-brand-textSecondary mt-1 max-w-3xl">
            Herramienta 4 · Estructura holográfica y circuito de valor: del Suelo (Actores) y Raíces (Riesgos) a través del Tronco (Tema Central), ramificando en el embudo 10-5-3 hasta los Frutos (Oportunidades de innovación).
          </p>
        </div>

        {/* View and Filter Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Tree / Table switcher */}
          <div className="flex items-center p-1 g2 rounded-full">
            <button
              type="button"
              onClick={() => setActiveView('arbol')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                activeView === 'arbol' ? 'bg-[#5EC2DD] text-black shadow-md' : 'text-brand-textSecondary hover:text-white'
              }`}
            >
              <Trees className="w-3.5 h-3.5" />
              <span>Árbol</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveView('tabla')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                activeView === 'tabla' ? 'bg-[#5EC2DD] text-black shadow-md' : 'text-brand-textSecondary hover:text-white'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Tabla</span>
            </button>
          </div>

          {/* Fruit Filters */}
          <div className="hidden sm:flex items-center p-1 g2 rounded-full text-xs">
            {(['todos', 'proyecto', 'servicio', 'prototipo'] as const).map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setFruitFilter(filter)}
                className={`px-3 py-1 rounded-full capitalize transition-all ${
                  fruitFilter === filter ? 'bg-white/20 text-white font-bold' : 'text-brand-textSecondary hover:text-white'
                }`}
              >
                {filter === 'todos' ? 'Todos los Frutos' : filter + 's'}
              </button>
            ))}
          </div>

          {/* Export to Prototyping Action */}
          <button
            type="button"
            onClick={handleExportAllFruits}
            className="metal px-4 py-2 text-xs font-semibold text-white flex items-center gap-2 shadow-lg hover:shadow-amber-500/20 cursor-pointer"
          >
            <Rocket className="w-3.5 h-3.5 text-[#F29F05]" />
            <span>Pasar Frutos a Prototipado</span>
          </button>
        </div>
      </div>

      {/* Strategic Theme Input Banner (Chained or Independent) */}
      <div className="g p-4 rounded-2xl border border-white/15 bg-gradient-to-r from-[#073A4A]/60 via-[#04222B]/80 to-transparent flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#5EC2DD]/20 border border-[#5EC2DD]/40 flex items-center justify-center text-[#5EC2DD] shrink-0">
            <Trees className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#9FD4E4] m">
                Tronco TR-01 · Tema Central Activo
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#A8C63C]/20 text-[#A8C63C] border border-[#A8C63C]/30">
                Sincronizado
              </span>
            </div>
            {isEditingTheme ? (
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="text"
                  value={themeInput}
                  onChange={(e) => setThemeInput(e.target.value)}
                  className="px-3 py-1 rounded-lg bg-black/60 border border-white/25 text-white text-xs focus:outline-none focus:border-[#5EC2DD] w-72 md:w-96"
                  placeholder="Escribe o pega cualquier tema de innovación..."
                />
                <button
                  type="button"
                  onClick={handleApplyTheme}
                  className="metal px-3 py-1 text-xs text-white flex items-center gap-1 cursor-pointer"
                >
                  <Check className="w-3 h-3" />
                  <span>Aplicar</span>
                </button>
              </div>
            ) : (
              <p className="text-sm md:text-base font-bold text-white sy">{activeTheme}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isEditingTheme && (
            <button
              type="button"
              onClick={() => setIsEditingTheme(true)}
              className="text-xs text-[#5EC2DD] hover:underline flex items-center gap-1 g2 px-3 py-1.5 rounded-full"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Cambiar tema independiente</span>
            </button>
          )}
        </div>
      </div>

      {copiedNotification && (
        <div className="p-3 rounded-xl bg-[#A8C63C]/20 border border-[#A8C63C]/40 text-xs text-[#A8C63C] flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{copiedNotification}</span>
        </div>
      )}

      {/* Main Layout: SVG Circuit Tree + Sticky Inspection Panel */}
      {activeView === 'arbol' ? (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 items-start">
          {/* Holographic Circuit Canvas */}
          <div className="g p-2 md:p-4 rounded-2xl border border-white/15 bg-[#021219] overflow-x-auto shadow-2xl relative">
            {/* Watermark / Legend Header */}
            <div className="flex items-center justify-between text-xs text-brand-textMuted px-3 py-2 border-b border-white/10 mb-2">
              <span className="m font-mono text-[11px] text-[#5EC2DD]">
                Circuito Holográfico · Vista Interactiva 10-5-3
              </span>
              <div className="flex items-center gap-3 text-[11px]">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#5EC2DD]"></span>
                  <span>Global</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#2E9CBA]"></span>
                  <span>Nacional</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#9FD4E4]"></span>
                  <span>Territorial</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#F29F05]"></span>
                  <span>Frutos</span>
                </span>
              </div>
            </div>

            {/* SVG Tree Engine (Fidelidad de origen de innovahub-boletin) */}
            <svg
              className="w-full min-w-[760px] h-auto block select-none"
              viewBox="0 0 1200 1010"
              role="group"
              aria-label="Árbol de innovación interactivo"
            >
              <defs>
                <radialGradient id="af-fondo" cx="50%" cy="45%" r="70%">
                  <stop offset="0" stopColor="#073A4A" />
                  <stop offset="0.55" stopColor="#04222B" />
                  <stop offset="1" stopColor="#021219" />
                </radialGradient>
                <linearGradient id="af-haz" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#5EC2DD" stopOpacity="0.55" />
                  <stop offset="1" stopColor="#5EC2DD" stopOpacity="0" />
                </linearGradient>
                <radialGradient id="af-disco" cx="50%" cy="50%" r="50%">
                  <stop offset="0" stopColor="#5EC2DD" stopOpacity="0.45" />
                  <stop offset="0.45" stopColor="#2E9CBA" stopOpacity="0.16" />
                  <stop offset="1" stopColor="#2E9CBA" stopOpacity="0" />
                </radialGradient>
                <radialGradient id="af-copa" cx="50%" cy="50%" r="50%">
                  <stop offset="0" stopColor="#2E9CBA" stopOpacity="0.22" />
                  <stop offset="1" stopColor="#2E9CBA" stopOpacity="0" />
                </radialGradient>
                <filter id="af-brillo" x="-60%" y="-60%" width="220%" height="220%">
                  <feGaussianBlur stdDeviation="3.2" result="b" />
                  <feMerge>
                    <feMergeNode in="b" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <clipPath id="af-esfera">
                  <path d="M 472 712 A 128 128 0 0 0 728 712 Z" />
                </clipPath>
              </defs>

              {/* Background gradient and cosmic dust */}
              <rect width="1200" height="1010" fill="url(#af-fondo)" rx="16" />
              <ellipse cx="600" cy="300" rx="560" ry="300" fill="url(#af-copa)" />

              {/* Level Guideline Lines */}
              {[
                { y: 36, label: 'FRUTOS · OPORTUNIDADES DE INNOVACIÓN' },
                { y: 286, label: 'TERRITORIAL (3 EXPRESIONES ZONALES)' },
                { y: 404, label: 'NACIONAL (5 TENDENCIAS CON ANCLAJE)' },
                { y: 524, label: 'GLOBAL (10 MEGATENDENCIAS MUNDIALES)' },
                { y: 668, label: 'TRONCO · TEMA CENTRAL ESTRATÉGICO' },
                { y: 790, label: 'RAÍCES · RIESGOS TERRITORIALES' },
                { y: 930, label: 'SUELO · ACTORES DEL ECOSISTEMA' },
              ].map((lvl, idx) => (
                <g key={idx}>
                  <line
                    x1="18"
                    x2="1182"
                    y1={lvl.y}
                    y2={lvl.y}
                    stroke="#5EC2DD"
                    strokeOpacity="0.12"
                    strokeDasharray="2 6"
                  />
                  <text
                    x="22"
                    y={lvl.y + 13}
                    fill="#6E8F9C"
                    fontFamily="IBM Plex Mono"
                    fontSize="10"
                    letterSpacing="0.16em"
                  >
                    {lvl.label}
                  </text>
                </g>
              ))}

              {/* Platform Base: Holographic Disc (Suelo) */}
              <ellipse cx="600" cy="930" rx="430" ry="70" fill="url(#af-disco)" />
              <ellipse cx="600" cy="930" rx="380" ry="62" fill="none" stroke="#5EC2DD" strokeOpacity="0.25" strokeWidth="1.4" />
              <ellipse cx="600" cy="930" rx="330" ry="54" fill="none" stroke="#5EC2DD" strokeOpacity="0.35" strokeWidth="1.4" strokeDasharray="10 6" />
              <ellipse cx="600" cy="930" rx="262" ry="44" fill="none" stroke="#5EC2DD" strokeOpacity="0.3" strokeWidth="1.4" strokeDasharray="2 7" />
              <ellipse cx="600" cy="930" rx="190" ry="32" fill="none" stroke="#5EC2DD" strokeOpacity="0.4" strokeWidth="1.4" strokeDasharray="28 10" />

              {/* Holographic Light Cone up to the Sphere */}
              <path
                d="M 566 930 L 504 760 L 696 760 L 634 930 Z"
                fill="url(#af-haz)"
                opacity="0.6"
              />

              {/* Wireframe Hemisphere for Roots (Raíces / Riesgos) */}
              <g clipPath="url(#af-esfera)" stroke="#5EC2DD" strokeOpacity="0.38" fill="none" strokeWidth="1">
                <path d="M 472 712 A 128 128 0 0 0 728 712 Z" fill="#5EC2DD" fillOpacity="0.06" />
                <ellipse cx="600" cy="712" rx="120" ry="10" transform="translate(0 20)" />
                <ellipse cx="600" cy="712" rx="100" ry="10" transform="translate(0 45)" />
                <ellipse cx="600" cy="712" rx="70" ry="10" transform="translate(0 75)" />
                <ellipse cx="600" cy="712" rx="35" ry="10" transform="translate(0 105)" />
              </g>
              <line x1="460" x2="740" y1="712" y2="712" stroke="#9FD4E4" strokeOpacity="0.6" strokeWidth="1.5" />

              {/* Parallel Circuit Tracks for the Trunk */}
              {[-36, -18, 0, 18, 36].map((offset, i) => (
                <g key={i}>
                  <path
                    d={`M ${600 + offset} 588 V 716`}
                    stroke="#5EC2DD"
                    strokeWidth="2.2"
                    strokeOpacity="0.8"
                    filter="url(#af-brillo)"
                  />
                  <rect x={600 + offset - 2.5} y="714" width="5" height="9" fill="#9FD4E4" opacity="0.85" />
                </g>
              ))}

              {/* Circuit Connections between Levels */}
              {/* TT to Frutos */}
              <path
                d="M 450 286 V 218 H 320 V 150"
                stroke={activeRoute['FR-01'] ? '#F29F05' : '#2E9CBA'}
                strokeWidth={activeRoute['FR-01'] ? '2.4' : '1.6'}
                strokeOpacity={activeRoute['FR-01'] ? '1' : '0.4'}
                fill="none"
              />
              <path
                d="M 450 286 V 218 H 500 V 150"
                stroke={activeRoute['FR-02'] ? '#F29F05' : '#2E9CBA'}
                strokeWidth={activeRoute['FR-02'] ? '2.4' : '1.6'}
                strokeOpacity={activeRoute['FR-02'] ? '1' : '0.4'}
                fill="none"
              />
              <path
                d="M 600 286 V 218 H 700 V 150"
                stroke={activeRoute['FR-03'] ? '#F29F05' : '#2E9CBA'}
                strokeWidth={activeRoute['FR-03'] ? '2.4' : '1.6'}
                strokeOpacity={activeRoute['FR-03'] ? '1' : '0.4'}
                fill="none"
              />
              <path
                d="M 750 286 V 218 H 880 V 150"
                stroke={activeRoute['FR-04'] ? '#F29F05' : '#2E9CBA'}
                strokeWidth={activeRoute['FR-04'] ? '2.4' : '1.6'}
                strokeOpacity={activeRoute['FR-04'] ? '1' : '0.4'}
                fill="none"
              />

              {/* TN to TT */}
              <path
                d="M 480 404 V 345 H 450 V 286"
                stroke={activeRoute['TT-01'] ? '#F29F05' : '#2E9CBA'}
                strokeWidth={activeRoute['TT-01'] ? '2.4' : '1.6'}
                strokeOpacity={activeRoute['TT-01'] ? '1' : '0.45'}
                fill="none"
              />
              <path
                d="M 600 404 V 345 H 600 V 286"
                stroke={activeRoute['TT-02'] ? '#F29F05' : '#2E9CBA'}
                strokeWidth={activeRoute['TT-02'] ? '2.4' : '1.6'}
                strokeOpacity={activeRoute['TT-02'] ? '1' : '0.45'}
                fill="none"
              />
              <path
                d="M 720 404 V 345 H 750 V 286"
                stroke={activeRoute['TT-03'] ? '#F29F05' : '#2E9CBA'}
                strokeWidth={activeRoute['TT-03'] ? '2.4' : '1.6'}
                strokeOpacity={activeRoute['TT-03'] ? '1' : '0.45'}
                fill="none"
              />

              {/* TG to TN */}
              <path
                d="M 400 524 V 464 H 480 V 404"
                stroke={activeRoute['TN-01'] ? '#F29F05' : '#2E9CBA'}
                strokeWidth={activeRoute['TN-01'] ? '2.4' : '1.6'}
                strokeOpacity={activeRoute['TN-01'] ? '1' : '0.45'}
                fill="none"
              />
              <path
                d="M 533 524 V 464 H 600 V 404"
                stroke={activeRoute['TN-02'] ? '#F29F05' : '#2E9CBA'}
                strokeWidth={activeRoute['TN-02'] ? '2.4' : '1.6'}
                strokeOpacity={activeRoute['TN-02'] ? '1' : '0.45'}
                fill="none"
              />
              <path
                d="M 666 524 V 464 H 720 V 404"
                stroke={activeRoute['TN-03'] ? '#F29F05' : '#2E9CBA'}
                strokeWidth={activeRoute['TN-03'] ? '2.4' : '1.6'}
                strokeOpacity={activeRoute['TN-03'] ? '1' : '0.45'}
                fill="none"
              />

              {/* TR-01 (Tronco) to TG */}
              <path
                d="M 600 588 V 556 H 400 V 524"
                stroke={activeRoute['TG-01'] ? '#F29F05' : '#5EC2DD'}
                strokeWidth={activeRoute['TG-01'] ? '2.4' : '1.6'}
                strokeOpacity="0.5"
                fill="none"
              />
              <path
                d="M 600 588 V 556 H 533 V 524"
                stroke={activeRoute['TG-02'] ? '#F29F05' : '#5EC2DD'}
                strokeWidth={activeRoute['TG-02'] ? '2.4' : '1.6'}
                strokeOpacity="0.5"
                fill="none"
              />
              <path
                d="M 600 588 V 556 H 666 V 524"
                stroke={activeRoute['TG-03'] ? '#F29F05' : '#5EC2DD'}
                strokeWidth={activeRoute['TG-03'] ? '2.4' : '1.6'}
                strokeOpacity="0.5"
                fill="none"
              />
              <path
                d="M 600 588 V 556 H 800 V 524"
                stroke={activeRoute['TG-04'] ? '#F29F05' : '#5EC2DD'}
                strokeWidth={activeRoute['TG-04'] ? '2.4' : '1.6'}
                strokeOpacity="0.5"
                fill="none"
              />

              {/* NODES RENDERING */}

              {/* 1. TRONCO TR-01 Node */}
              <g
                onClick={() => setSelectedNodeCode('TR-01')}
                className="cursor-pointer transition-transform hover:scale-105"
                role="button"
                tabIndex={0}
              >
                <rect
                  x="450"
                  y="567"
                  width="300"
                  height="42"
                  rx="21"
                  fill="#04222B"
                  stroke={selectedNodeCode === 'TR-01' ? '#F29F05' : '#5EC2DD'}
                  strokeWidth={selectedNodeCode === 'TR-01' ? '2.4' : '1.6'}
                  filter="url(#af-brillo)"
                />
                <rect x="450" y="567" width="300" height="42" rx="21" fill="#5EC2DD" fillOpacity="0.12" />
                <text x="600" y="583" textAnchor="middle" fill="#9FD4E4" fontFamily="IBM Plex Mono" fontSize="9" letterSpacing="0.12em">
                  TR-01 · TEMA CENTRAL
                </text>
                <text x="600" y="598" textAnchor="middle" fill="#EAF4F7" fontFamily="Inter" fontSize="11" fontWeight="700">
                  {activeTheme.length > 36 ? activeTheme.substring(0, 34) + '…' : activeTheme}
                </text>
              </g>

              {/* 2. GLOBAL NODES (TG) */}
              {[
                { code: 'TG-01', x: 400, y: 524, label: 'Bioeconomía / IA' },
                { code: 'TG-02', x: 533, y: 524, label: 'Trazabilidad y Datos' },
                { code: 'TG-03', x: 666, y: 524, label: 'Transición Energética' },
                { code: 'TG-04', x: 800, y: 524, label: 'Ciencia Ciudadana' },
              ].map((n) => {
                const isSelected = selectedNodeCode === n.code;
                const isRoute = activeRoute[n.code];
                return (
                  <g
                    key={n.code}
                    onClick={() => setSelectedNodeCode(n.code)}
                    className="cursor-pointer transition-transform hover:scale-110"
                    role="button"
                    tabIndex={0}
                  >
                    <circle
                      cx={n.x}
                      cy={n.y}
                      r="16"
                      fill={isSelected ? '#F29F05' : '#5EC2DD'}
                      stroke={isSelected ? '#FFFFFF' : '#04222B'}
                      strokeWidth="2"
                      filter="url(#af-brillo)"
                    />
                    <text x={n.x} y={n.y + 4} textAnchor="middle" fill="#03141B" fontFamily="Inter" fontSize="9" fontWeight="700">
                      {n.code.replace('TG-', '')}
                    </text>
                    <text x={n.x} y={n.y - 20} textAnchor="middle" fill="#CFE6EE" fontFamily="Inter" fontSize="10">
                      {n.label}
                    </text>
                  </g>
                );
              })}

              {/* 3. NACIONAL NODES (TN) */}
              {[
                { code: 'TN-01', x: 480, y: 404, label: 'Soberanía Bioinsumos' },
                { code: 'TN-02', x: 600, y: 404, label: 'Cadenas Cortas' },
                { code: 'TN-03', x: 720, y: 404, label: 'Comunidades Energéticas' },
              ].map((n) => {
                const isSelected = selectedNodeCode === n.code;
                return (
                  <g
                    key={n.code}
                    onClick={() => setSelectedNodeCode(n.code)}
                    className="cursor-pointer transition-transform hover:scale-110"
                    role="button"
                    tabIndex={0}
                  >
                    <circle
                      cx={n.x}
                      cy={n.y}
                      r="18"
                      fill={isSelected ? '#F29F05' : '#2E9CBA'}
                      stroke={isSelected ? '#FFFFFF' : '#04222B'}
                      strokeWidth="2"
                      filter="url(#af-brillo)"
                    />
                    <text x={n.x} y={n.y + 4} textAnchor="middle" fill="#03141B" fontFamily="Inter" fontSize="10" fontWeight="700">
                      {n.code.replace('TN-', '')}
                    </text>
                    <text x={n.x} y={n.y - 22} textAnchor="middle" fill="#CFE6EE" fontFamily="Inter" fontSize="10">
                      {n.label}
                    </text>
                  </g>
                );
              })}

              {/* 4. TERRITORIAL NODES (TT) */}
              {[
                { code: 'TT-01', x: 450, y: 286, label: 'Biomasa de Cuenca' },
                { code: 'TT-02', x: 600, y: 286, label: 'Trazabilidad Zonal' },
                { code: 'TT-03', x: 750, y: 286, label: 'Microrredes Acopio' },
              ].map((n) => {
                const isSelected = selectedNodeCode === n.code;
                return (
                  <g
                    key={n.code}
                    onClick={() => setSelectedNodeCode(n.code)}
                    className="cursor-pointer transition-transform hover:scale-110"
                    role="button"
                    tabIndex={0}
                  >
                    <circle
                      cx={n.x}
                      cy={n.y}
                      r="20"
                      fill={isSelected ? '#F29F05' : '#9FD4E4'}
                      stroke={isSelected ? '#FFFFFF' : '#04222B'}
                      strokeWidth="2"
                      filter="url(#af-brillo)"
                    />
                    <text x={n.x} y={n.y + 4} textAnchor="middle" fill="#03141B" fontFamily="Inter" fontSize="11" fontWeight="700">
                      {n.code.replace('TT-', '')}
                    </text>
                    <text x={n.x} y={n.y - 24} textAnchor="middle" fill="#EAF4F7" fontFamily="Inter" fontSize="10.5" fontWeight="600">
                      {n.label}
                    </text>
                  </g>
                );
              })}

              {/* 5. FRUTOS (FR) - PROYECTOS, SERVICIOS, PROTOTIPOS */}
              {[
                { code: 'FR-01', x: 320, y: 150, type: 'servicio', label: 'Vigilancia Bioinsumos' },
                { code: 'FR-02', x: 500, y: 150, type: 'prototipo', label: 'Biorreactor Modular' },
                { code: 'FR-03', x: 700, y: 150, type: 'proyecto', label: 'Plataforma QR Origen' },
                { code: 'FR-04', x: 880, y: 150, type: 'prototipo', label: 'Estación Solar Frío' },
              ].map((n) => {
                const isSelected = selectedNodeCode === n.code;
                const isHidden = fruitFilter !== 'todos' && fruitFilter !== n.type;
                if (isHidden) return null;

                return (
                  <g
                    key={n.code}
                    onClick={() => setSelectedNodeCode(n.code)}
                    className="cursor-pointer transition-transform hover:scale-110"
                    role="button"
                    tabIndex={0}
                  >
                    {/* Shape: Square for Servicio, Diamond for Prototipo, Circle for Proyecto */}
                    {n.type === 'servicio' && (
                      <rect
                        x={n.x - 18}
                        y={n.y - 18}
                        width="36"
                        height="36"
                        rx="6"
                        fill={isSelected ? '#FFFFFF' : '#F29F05'}
                        stroke="#04222B"
                        strokeWidth="2"
                        filter="url(#af-brillo)"
                      />
                    )}
                    {n.type === 'prototipo' && (
                      <polygon
                        points={`${n.x},${n.y - 22} ${n.x + 22},${n.y} ${n.x},${n.y + 22} ${n.x - 22},${n.y}`}
                        fill={isSelected ? '#FFFFFF' : '#A8C63C'}
                        stroke="#04222B"
                        strokeWidth="2"
                        filter="url(#af-brillo)"
                      />
                    )}
                    {n.type === 'proyecto' && (
                      <circle
                        cx={n.x}
                        cy={n.y}
                        r="20"
                        fill={isSelected ? '#FFFFFF' : '#5EC2DD'}
                        stroke="#04222B"
                        strokeWidth="2"
                        filter="url(#af-brillo)"
                      />
                    )}
                    <text
                      x={n.x}
                      y={n.y + 4.5}
                      textAnchor="middle"
                      fill="#03141B"
                      fontFamily="Inter"
                      fontSize="10"
                      fontWeight="800"
                    >
                      {n.code.replace('FR-', '')}
                    </text>
                    <text
                      x={n.x}
                      y={n.y - 28}
                      textAnchor="middle"
                      fill="#9FD4E4"
                      fontFamily="IBM Plex Mono"
                      fontSize="9"
                      letterSpacing="0.1em"
                    >
                      {n.type.toUpperCase()}
                    </text>
                    <text
                      x={n.x}
                      y={n.y - 16}
                      textAnchor="middle"
                      fill="#EAF4F7"
                      fontFamily="Inter"
                      fontSize="10"
                      fontWeight="600"
                    >
                      {n.label}
                    </text>
                  </g>
                );
              })}

              {/* 6. SUELO ACTORES (SU) */}
              {[
                { code: 'SU-01', x: 300, y: 930 },
                { code: 'SU-02', x: 500, y: 930 },
                { code: 'SU-03', x: 700, y: 930 },
                { code: 'SU-04', x: 900, y: 930 },
              ].map((n) => {
                const isSelected = selectedNodeCode === n.code;
                return (
                  <g
                    key={n.code}
                    onClick={() => setSelectedNodeCode(n.code)}
                    className="cursor-pointer transition-transform hover:scale-110"
                    role="button"
                    tabIndex={0}
                  >
                    <rect
                      x={n.x - 12}
                      y={n.y - 12}
                      width="24"
                      height="24"
                      rx="4"
                      fill={isSelected ? '#F29F05' : '#A8C63C'}
                      stroke="#04222B"
                      strokeWidth="1.5"
                    />
                    <text x={n.x} y={n.y + 3.5} textAnchor="middle" fill="#03141B" fontFamily="Inter" fontSize="8" fontWeight="700">
                      {n.code.replace('SU-', '')}
                    </text>
                    <text x={n.x} y={n.y + 24} textAnchor="middle" fill="#CFE6EE" fontFamily="Inter" fontSize="9">
                      {treeNodes[n.code].nombre.split(' ')[0]}
                    </text>
                  </g>
                );
              })}

              {/* 7. RAÍCES RIESGOS (RZ) */}
              {[
                { code: 'RZ-01', x: 520, y: 745 },
                { code: 'RZ-02', x: 570, y: 765 },
                { code: 'RZ-03', x: 630, y: 765 },
                { code: 'RZ-04', x: 680, y: 745 },
              ].map((n) => {
                const isSelected = selectedNodeCode === n.code;
                return (
                  <g
                    key={n.code}
                    onClick={() => setSelectedNodeCode(n.code)}
                    className="cursor-pointer transition-transform hover:scale-110"
                    role="button"
                    tabIndex={0}
                  >
                    <circle
                      cx={n.x}
                      cy={n.y}
                      r="9"
                      fill={isSelected ? '#FFFFFF' : '#F29F05'}
                      stroke="#04222B"
                      strokeWidth="1.5"
                    />
                    <text x={n.x} y={n.y + 3} textAnchor="middle" fill="#03141B" fontFamily="Inter" fontSize="7.5" fontWeight="800">
                      {n.code.replace('RZ-', '')}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Sticky Side Inspection Panel (Fidelidad arbol.js de innovahub-boletin) */}
          <aside className="g p-6 rounded-2xl border border-white/15 sticky top-24 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <span className="text-[10px] font-bold text-[#5EC2DD] uppercase tracking-wider m">
                  Detalle del Nodo Seleccionado
                </span>
                <h3 className="text-lg font-bold text-white sy leading-tight">
                  {selectedNode.codigo} · {selectedNode.nombre}
                </h3>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#A8C63C]/20 text-[#A8C63C] border border-[#A8C63C]/30 m">
                Evidencia {selectedNode.evidencia}
              </span>
            </div>

            {selectedNode.tipo_fruto && (
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[#F29F05]/20 text-[#F3C26B] uppercase border border-[#F29F05]/30">
                  {selectedNode.tipo_fruto}
                </span>
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-white/10 text-white">
                  Oportunidad de Innovación
                </span>
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-brand-textMuted uppercase font-bold text-[10px] block mb-1">Descripción:</span>
                <p className="text-brand-textSecondary leading-relaxed">{selectedNode.descripcion || 'Sin descripción'}</p>
              </div>

              {selectedNode.solucion && (
                <div>
                  <span className="text-[#5EC2DD] uppercase font-bold text-[10px] block mb-1">Solución Posible:</span>
                  <p className="text-white leading-relaxed">{selectedNode.solucion}</p>
                </div>
              )}

              {selectedNode.impacto_esperado && (
                <div>
                  <span className="text-[#A8C63C] uppercase font-bold text-[10px] block mb-1">Impacto Esperado:</span>
                  <p className="text-white leading-relaxed">{selectedNode.impacto_esperado}</p>
                </div>
              )}

              {selectedNode.metricas && (
                <div>
                  <span className="text-brand-textMuted uppercase font-bold text-[10px] block mb-1">Métricas del Radar:</span>
                  <div className="flex flex-wrap gap-2 text-[11px] text-white font-mono">
                    {selectedNode.metricas.impacto && (
                      <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10">
                        Impacto: {selectedNode.metricas.impacto}%
                      </span>
                    )}
                    {selectedNode.metricas.adopcion && (
                      <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10">
                        Adopción: {selectedNode.metricas.adopcion}%
                      </span>
                    )}
                    {selectedNode.metricas.horizonte && (
                      <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10">
                        {selectedNode.metricas.horizonte}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {selectedNode.deriva_de && selectedNode.deriva_de.length > 0 && (
                <div>
                  <span className="text-brand-textMuted uppercase font-bold text-[10px] block mb-1">Deriva de (Ascendencia):</span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedNode.deriva_de.map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setSelectedNodeCode(d)}
                        className="px-2 py-1 rounded bg-white/10 hover:bg-[#5EC2DD]/20 text-[#5EC2DD] font-mono text-[11px] border border-white/15"
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {selectedNode.derivan && selectedNode.derivan.length > 0 && (
                <div>
                  <span className="text-brand-textMuted uppercase font-bold text-[10px] block mb-1">De él derivan (Descendencia):</span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedNode.derivan.map((h) => (
                      <button
                        key={h}
                        type="button"
                        onClick={() => setSelectedNodeCode(h)}
                        className="px-2 py-1 rounded bg-white/10 hover:bg-[#A8C63C]/20 text-[#A8C63C] font-mono text-[11px] border border-white/15"
                      >
                        {h}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Action buttons inside inspection panel */}
            <div className="pt-3 border-t border-white/10 space-y-2">
              {selectedNode.nivel === 'fruto' && (
                <button
                  type="button"
                  onClick={() => handleSendFruitToPrototypes(selectedNode)}
                  className="w-full metal px-4 py-2.5 text-xs font-semibold text-white flex items-center justify-center gap-2 cursor-pointer shadow-md hover:shadow-amber-500/20"
                >
                  <Rocket className="w-3.5 h-3.5 text-[#F29F05]" />
                  <span>Prototipar este Fruto ({selectedNode.codigo})</span>
                </button>
              )}
            </div>
          </aside>
        </div>
      ) : (
        /* Detailed Table View */
        <div className="g p-6 rounded-2xl border border-white/15 overflow-x-auto shadow-xl">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/15 text-brand-textMuted uppercase m text-[10px]">
                <th className="py-3 px-3">Código</th>
                <th className="py-3 px-3">Nivel</th>
                <th className="py-3 px-3">Nombre</th>
                <th className="py-3 px-3">Tipo</th>
                <th className="py-3 px-3">Evidencia</th>
                <th className="py-3 px-3">Deriva De</th>
                <th className="py-3 px-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {Object.values(treeNodes).map((node) => (
                <tr key={node.codigo} className="hover:bg-white/5 transition-colors">
                  <td className="py-3 px-3 font-mono font-bold text-[#5EC2DD]">{node.codigo}</td>
                  <td className="py-3 px-3 capitalize text-brand-textSecondary">{node.nivel}</td>
                  <td className="py-3 px-3 font-medium text-white max-w-xs">{node.nombre}</td>
                  <td className="py-3 px-3 text-brand-textSecondary">{node.tipo_fruto || '—'}</td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded-full bg-[#A8C63C]/20 text-[#A8C63C] font-mono text-[10px] border border-[#A8C63C]/30">
                      {node.evidencia}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-mono text-brand-textMuted">
                    {node.deriva_de && node.deriva_de.length > 0 ? node.deriva_de.join(', ') : '—'}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedNodeCode(node.codigo);
                        setActiveView('arbol');
                      }}
                      className="px-2.5 py-1 rounded g2 text-xs text-[#5EC2DD] hover:text-white"
                    >
                      Ver en Árbol
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
export default ArbolInnovacionView;