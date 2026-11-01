import React, { useState, useEffect } from 'react';
import {
  Rocket,
  Sparkles,
  Download,
  Plus,
  FileText,
  CheckCircle,
  ArrowRight,
  Layers,
  Trash2,
  Trees,
  CheckCircle2,
  Copy,
  Printer,
  Edit3,
  ExternalLink,
  BrainCircuit,
  Calendar,
  ShieldAlert,
  Target,
  Wrench,
  Check,
  RefreshCw,
  X
} from 'lucide-react';
import { useStore } from '@/store/useStore';

export interface PrototypePhase {
  fase: string;
  semanas: string;
  actividades: string;
  entregables: string[];
}

export interface PrototypeItem {
  id: string;
  sourceCode?: string;
  name: string;
  tagline?: string;
  category: 'Prototipo Tecnológico' | 'Servicio de Innovación' | 'Proyecto Territorial' | 'Vigilancia Zonal' | 'Transferencia';
  trlTarget?: string;
  targetAudience: string;
  problemSolved: string;
  hypothesis?: string;
  solution: string;
  solutionArchitecture?: {
    hardware?: string;
    software?: string;
    methodology?: string;
  };
  phases?: PrototypePhase[];
  deliverables: string[];
  durationWeeks: number;
  unadSchool: string;
  validationMetrics: string[];
  risks?: Array<{ riesgo: string; mitigacion: string }>;
}

export const PrototipadoView: React.FC = () => {
  const selectedTreeFruits = useStore((state) => state.selectedTreeFruits);
  const selectedStrategicTheme = useStore((state) => state.selectedStrategicTheme);

  // Initial prototypes list
  const [prototypes, setPrototypes] = useState<PrototypeItem[]>([
    {
      id: 'proto-1',
      sourceCode: 'FR-01',
      name: 'Servicio de Vigilancia Tecnológica Zonal y Bioinsumos',
      tagline: 'Inteligencia competitiva y formulación biológica en campo',
      category: 'Servicio de Innovación',
      trlTarget: 'TRL 5 (Validación en entorno relevante)',
      targetAudience: 'Asociaciones campesinas, cooperativas agropecuarias y secretarías de desarrollo rural.',
      problemSolved: 'Dependencia crítica de insumos químicos importados de alto costo y degradación de suelos en la cuenca territorial.',
      hypothesis: 'Se valida que la sustitución progresiva de químicos por biofertilizantes nativos reduce en un 32% los costos de insumos sin disminuir el rendimiento de cosecha.',
      solution: 'Laboratorio móvil y pruebas rápidas de caracterización de biomasa para formular biofertilizantes con microorganismos benéficos del suelo.',
      solutionArchitecture: {
        hardware: 'Kits portátiles de análisis físico-químico y medidores digitales de pH y conductividad.',
        software: 'Plataforma web ligera de boletines de patentes y registro de lotes de prueba.',
        methodology: 'Talleres comunitarios de fermentación aeróbica y caracterización participativa.',
      },
      phases: [
        {
          fase: 'Fase 1: Caracterización y Diagnóstico Zonal',
          semanas: 'Semanas 1-2',
          actividades: 'Muestreo de biomasa disponible en 5 fincas piloto y mapeo de patentes libres.',
          entregables: ['Reporte de caracterización de biomasa', 'Boletín de alertas tecnológicas'],
        },
        {
          fase: 'Fase 2: Formulación y Estandarización de Lotes Piloto',
          semanas: 'Semanas 3-4',
          actividades: 'Producción de 3 fórmulas experimentales de biofertilizante en laboratorio UNAD.',
          entregables: ['3 formulaciones estandarizadas', 'Ficha técnica de inocuidad'],
        },
        {
          fase: 'Fase 3: Validación en Parcelas Demostrativas',
          semanas: 'Semanas 5-6',
          actividades: 'Aplicación en parcelas de prueba con seguimiento agronómico semanal.',
          entregables: ['Registro agronómico comparativo', 'Bitácora de campo con productores'],
        },
        {
          fase: 'Fase 4: Análisis de Eficacia y Hoja de Escalamiento',
          semanas: 'Semanas 7-8',
          actividades: 'Evaluación del ahorro en costos y formulación del modelo de servicio permanente.',
          entregables: ['Reporte final de validación económica', 'Guía de transferencia técnica'],
        },
      ],
      deliverables: [
        'Boletín mensual de señales tecnológicas y patentes libres',
        'Protocolo de formulación de bioinsumos en finca',
        'Lote piloto de prueba con evaluación docente y campesina',
      ],
      durationWeeks: 8,
      unadSchool: 'ECAPMA & ECACEN',
      validationMetrics: [
        'Reducción verificable del 30% en costos de fertilización',
        'Aprobación y adopción por 80 productores locales',
      ],
      risks: [
        { riesgo: 'Contaminación microbiológica en lotes caseros', mitigacion: 'Capacitación rigurosa en asepsia y protocolos claros.' },
        { riesgo: 'Desconfianza en el tiempo de respuesta biológico', mitigacion: 'Ensayos en parcelas testigo visibles para los productores.' },
      ],
    },
    {
      id: 'proto-2',
      sourceCode: 'FR-02',
      name: 'Biorreactor Comunitario Modular de Bajo Costo',
      tagline: 'Equipamiento abierto para biofermentación controlada en finca',
      category: 'Prototipo Tecnológico',
      trlTarget: 'TRL 4 (Validación en componentes de laboratorio)',
      targetAudience: 'Pequeños productores rurales y centros de acopio zonales.',
      problemSolved: 'Falta de equipamiento asequible para estandarizar la reproducción de cepas benéficas a escala local.',
      hypothesis: 'Se valida que un biorreactor modular con telemetría microcontrolada mantiene la temperatura en el rango óptimo (28-32°C) con un costo 70% menor a un equipo industrial.',
      solution: 'Dispositivo físico modular con control microclimático IoT ligero de bajo consumo energético y alimentación solar.',
      solutionArchitecture: {
        hardware: 'Tanque grado alimenticio de 200L, resistencia térmica de 12V, sensor sumergible DS18B20 y microcontrolador ESP32.',
        software: 'Firmware en C++ de control PID térmico y panel web local en modo Access Point sin necesidad de internet.',
        methodology: 'Manual de auto-ensamblaje con insumos comerciales fácilmente adquiribles en ferreterías municipales.',
      },
      phases: [
        {
          fase: 'Fase 1: Diseño CAD y Selección de Sensores',
          semanas: 'Semanas 1-2',
          actividades: 'Modelado 3D de piezas de acople, diseño esquemático del circuito eléctrico de control.',
          entregables: ['Planos de ensamble en formato abierto', 'Lista de materiales de bajo costo'],
        },
        {
          fase: 'Fase 2: Ensamble Alfa y Programación de Firmware',
          semanas: 'Semanas 3-4',
          actividades: 'Montaje del primer prototipo físico en laboratorio y calibración de curvas térmicas.',
          entregables: ['Prototipo alfa ensamblado', 'Código de control PID documentado'],
        },
        {
          fase: 'Fase 3: Pruebas de Carga y Fermentación Continua',
          semanas: 'Semanas 5-6',
          actividades: 'Corrida de 3 lotes completos de fermentación de 7 días cada uno en condiciones reales.',
          entregables: ['Reporte de telemetría térmica', 'Análisis microbiológico de pureza'],
        },
        {
          fase: 'Fase 4: Empaquetamiento y Transferencia Comunitaria',
          semanas: 'Semanas 7-8',
          actividades: 'Diseño del manual de usuario en lenguaje accesible e instructivo en video.',
          entregables: ['Manual de auto-construcción ilustrado', 'Ficha de costos y mantenimiento'],
        },
      ],
      deliverables: [
        'Planos y esquemas de hardware abierto del reactor',
        'Firmware de monitoreo microclimático offline',
        'Guía técnica de ensamblaje con materiales regionales',
      ],
      durationWeeks: 8,
      unadSchool: 'ECBTI & ECAPMA',
      validationMetrics: [
        'Producción continua de 500L semanales de biofertilizante',
        'Cero fallas operativas en pruebas de 30 días continuos',
      ],
      risks: [
        { riesgo: 'Picos de voltaje en redes rurales', mitigacion: 'Regulador integrado y fusible de protección rápida.' },
      ],
    },
  ]);

  // Synchronize fruits passed from Árbol de Innovación
  useEffect(() => {
    if (selectedTreeFruits && selectedTreeFruits.length > 0) {
      const mapped: PrototypeItem[] = selectedTreeFruits.map((f) => ({
        id: f.id,
        sourceCode: f.code,
        name: f.name,
        tagline: `Solución derivada del árbol de innovación (${f.code})`,
        category:
          f.type === 'proyecto'
            ? ('Proyecto Territorial' as const)
            : f.type === 'servicio'
            ? ('Servicio de Innovación' as const)
            : ('Prototipo Tecnológico' as const),
        trlTarget: 'TRL 4 (Prueba de concepto en entorno experimental)',
        targetAudience: 'Comunidades productivas y entidades aliadas del territorio.',
        problemSolved: 'Brecha identificada en el árbol de innovación a partir de las tendencias territoriales.',
        hypothesis: `Se valida que mediante esta solución se resuelven las limitantes de ${f.name.toLowerCase()} en el territorio.`,
        solution: f.solution || 'Solución innovadora diseñada en el laboratorio.',
        deliverables: ['Especificación técnica de la solución', 'Prototipo funcional / MVP', 'Guía de validación en campo'],
        durationWeeks: 6,
        unadSchool: 'Escuelas UNAD articuladas',
        validationMetrics: [f.impact || 'Impacto cuantificable en el territorio'],
      }));

      setPrototypes((prev) => {
        const existingCodes = new Set(prev.map((p) => p.sourceCode));
        const newOnes = mapped.filter((m) => !existingCodes.has(m.sourceCode));
        return newOnes.length > 0 ? [...newOnes, ...prev] : prev;
      });
    }
  }, [selectedTreeFruits]);

  const [activeProtoId, setActiveProtoId] = useState<string>(prototypes[0]?.id || 'proto-1');
  const [activePlanTab, setActivePlanTab] = useState<'general' | 'fases' | 'arquitectura' | 'metricas'>('general');

  // AI Prototype Generator Modal State
  const [isAiGeneratorOpen, setIsAiGeneratorOpen] = useState<boolean>(false);
  const [aiTopicInput, setAiTopicInput] = useState<string>('');
  const [aiCategoryInput, setAiCategoryInput] = useState<PrototypeItem['category']>('Prototipo Tecnológico');
  const [aiTrlInput, setAiTrlInput] = useState<string>('TRL 4 (Validación de componentes en laboratorio)');
  const [aiScopeInput, setAiScopeInput] = useState<string>('Municipal y Zonal');
  const [isGeneratingPlan, setIsGeneratingPlan] = useState<boolean>(false);
  const [generationStepText, setGenerationStepText] = useState<string>('');
  const [generatedPlanPreview, setGeneratedPlanPreview] = useState<PrototypeItem | null>(null);

  const [copiedNotice, setCopiedNotice] = useState<string | null>(null);

  const activeProto = prototypes.find((p) => p.id === activeProtoId) || prototypes[0];

  // Quick suggestion pills for any topic
  const suggestionPills = [
    'Bioinsumos y Fertilizantes Orgánicos',
    'Detección Temprana de Plagas con Visión Artificial',
    'Microrredes Fotovoltaicas y Cadena de Frío',
    'Trazabilidad de Cosechas con Códigos QR Dinámicos',
    'Biorremediación de Aguas Residuales con Microalgas',
    'Tutor Conversacional para Educación Rural Desconectada',
    'Economía Circular y Empaques Biodegradables',
  ];

  // AI Prototype Generator Engine: Uses Gemini proxy or autonomous generator
  const handleGeneratePlanWithAi = async () => {
    const topic = aiTopicInput.trim() || selectedStrategicTheme || 'Solución de Innovación Territorial';
    setIsGeneratingPlan(true);
    setGenerationStepText('1/4 Analizando el tema de innovación y contexto territorial...');

    try {
      setTimeout(() => {
        setGenerationStepText('2/4 Formulando hipótesis crítica y arquitectura de solución...');
      }, 700);
      setTimeout(() => {
        setGenerationStepText('3/4 Diseñando cronograma de 4 fases y entregables verificables...');
      }, 1400);
      setTimeout(() => {
        setGenerationStepText('4/4 Estructurando métricas TRL y matriz de mitigación de riesgos...');
      }, 2100);

      const response = await fetch('/api/unad-gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gemini-2.5-flash',
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: `Actúa como arquitecto principal de innovación del Laboratorio Digital InnovaHub360 UNAD.
El usuario desea armar un Plan de Prototipado completo para el siguiente tema libre: "${topic}".
Categoría: "${aiCategoryInput}".
TRL Objetivo: "${aiTrlInput}".
Alcance: "${aiScopeInput}".

Genera un plan de prototipado riguroso, realista y estructurado. Responde ESTRICTAMENTE con un objeto JSON válido con la siguiente estructura:
{
  "name": "Nombre creativo, concreto y técnico del prototipo",
  "tagline": "Eslogan breve de la solución",
  "category": "${aiCategoryInput}",
  "trlTarget": "${aiTrlInput}",
  "targetAudience": "Población y organizaciones beneficiarias en el territorio",
  "problemSolved": "Problema específico que resuelve la solución",
  "hypothesis": "Hipótesis central a validar empíricamente con el prototipo",
  "solution": "Descripción técnica detallada de la solución",
  "solutionArchitecture": {
    "hardware": "Componentes físicos, sensores o maquinaria",
    "software": "Componentes lógicos, plataformas, algoritmos o interfaces",
    "methodology": "Protocolo metodológico, manuales o procesos de validación"
  },
  "durationWeeks": 8,
  "unadSchool": "ECBTI o ECAPMA o ECACEN",
  "phases": [
    {
      "fase": "Fase 1: Diseño Conceptual y Especificación Técnica",
      "semanas": "Semanas 1-2",
      "actividades": "Actividades concretas de la fase",
      "entregables": ["Entregable 1", "Entregable 2"]
    },
    {
      "fase": "Fase 2: Construcción del Prototipo Alfa / MVP",
      "semanas": "Semanas 3-4",
      "actividades": "Actividades de desarrollo o ensamblaje",
      "entregables": ["Entregable 1", "Entregable 2"]
    },
    {
      "fase": "Fase 3: Pruebas Piloto y Validación con Usuarios",
      "semanas": "Semanas 5-6",
      "actividades": "Pruebas de campo o entorno relevante",
      "entregables": ["Entregable 1", "Entregable 2"]
    },
    {
      "fase": "Fase 4: Evaluación de KPIs y Hoja de Escalamiento",
      "semanas": "Semanas 7-8",
      "actividades": "Medición de resultados y ajustes para transferencia",
      "entregables": ["Entregable 1", "Entregable 2"]
    }
  ],
  "deliverables": [
    "Entregable final 1",
    "Entregable final 2",
    "Entregable final 3"
  ],
  "validationMetrics": [
    "Métrica cuantificable técnica",
    "Métrica de adopción de usuarios",
    "Métrica de impacto económico o ambiental"
  ],
  "risks": [
    { "riesgo": "Riesgo técnico o territorial 1", "mitigacion": "Acción preventiva" },
    { "riesgo": "Riesgo técnico o territorial 2", "mitigacion": "Acción preventiva" }
  ]
}`,
                },
              ],
            },
          ],
        }),
      });

      let parsed: PrototypeItem | null = null;
      if (response.ok) {
        const data = await response.json();
        const rawJson = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const cleanJson = rawJson.replace(/```json/g, '').replace(/```/g, '').trim();
        parsed = JSON.parse(cleanJson);
      }

      // If response had parsed JSON, format it
      if (parsed && parsed.name) {
        const fullPlan: PrototypeItem = {
          id: `proto-ai-${Date.now()}`,
          name: parsed.name,
          tagline: parsed.tagline || `Plan de prototipado para ${topic}`,
          category: parsed.category || aiCategoryInput,
          trlTarget: parsed.trlTarget || aiTrlInput,
          targetAudience: parsed.targetAudience || 'Comunidades productivas del territorio',
          problemSolved: parsed.problemSolved || `Retos identificados en torno a ${topic}`,
          hypothesis: parsed.hypothesis || `Validación empírica de viabilidad para ${topic}.`,
          solution: parsed.solution || 'Solución diseñada con asistencia del Laboratorio Digital.',
          solutionArchitecture: parsed.solutionArchitecture || {
            hardware: 'Módulos físicos y sensores apropiados para el entorno.',
            software: 'Interfaz web o móvil con sincronización offline.',
            methodology: 'Protocolo de validación participativa con aliados.',
          },
          phases: parsed.phases || [
            {
              fase: 'Fase 1: Diseño Conceptual',
              semanas: 'Semanas 1-2',
              actividades: 'Especificación de componentes y requerimientos técnicos.',
              entregables: ['Documento de arquitectura', 'Planos conceptuales'],
            },
            {
              fase: 'Fase 2: Construcción del Prototipo Alfa',
              semanas: 'Semanas 3-4',
              actividades: 'Ensamblaje del modelo funcional o despliegue del MVP.',
              entregables: ['Prototipo alfa funcional', 'Pruebas de banco'],
            },
            {
              fase: 'Fase 3: Pruebas de Campo',
              semanas: 'Semanas 5-6',
              actividades: 'Validación con usuarios en condiciones reales.',
              entregables: ['Bitácora de validación', 'Matriz de ajustes'],
            },
            {
              fase: 'Fase 4: Evaluación y Escalamiento',
              semanas: 'Semanas 7-8',
              actividades: 'Consolidación de métricas y plan de transferencia.',
              entregables: ['Reporte final TRL', 'Hoja de ruta comercial'],
            },
          ],
          deliverables: parsed.deliverables || ['Prototipo funcional', 'Guía técnica', 'Reporte de validación'],
          durationWeeks: parsed.durationWeeks || 8,
          unadSchool: parsed.unadSchool || 'ECBTI',
          validationMetrics: parsed.validationMetrics || [
            'Eficacia de operación > 85%',
            'Satisfacción comunitaria > 80%',
            'Ahorro de costos > 25%',
          ],
          risks: parsed.risks || [
            { riesgo: 'Resistencia al cambio tecnológico', mitigacion: 'Talleres participativos de co-diseño.' },
            { riesgo: 'Fallas por intermitencia eléctrica', mitigacion: 'Respaldo solar y modo desconectado.' },
          ],
        };
        setGeneratedPlanPreview(fullPlan);
      }
    } catch (e) {
      console.warn('Error en llamada a proxy, generando plan inteligente autónomo...');
      // Fallback generator directly tailored to user's input topic
      const autonomousPlan: PrototypeItem = {
        id: `proto-auto-${Date.now()}`,
        name: `Prototipo de ${topic}`,
        tagline: `Solución técnica y validación en campo para ${topic}`,
        category: aiCategoryInput,
        trlTarget: aiTrlInput,
        targetAudience: 'Productores, comunidades organizadas y entidades del territorio.',
        problemSolved: `Brechas de tecnificación, altos costos y falta de herramientas apropiadas en torno a ${topic}.`,
        hypothesis: `Se valida que mediante la implementación de este prototipo se optimiza un 30% la eficiencia operativa y se reduce la dependencia de intermediarios o insumos externos en el territorio.`,
        solution: `Sistema integral de ${topic.toLowerCase()} adaptado a condiciones de baja conectividad y recursos locales, combinando componentes físicos robustos, software ligero y protocolo de apropiación comunitaria.`,
        solutionArchitecture: {
          hardware: 'Módulos físicos de bajo costo con componentes locales o microcontroladores de código abierto.',
          software: 'Interfaz web/móvil progresiva con sincronización offline para captura de datos y monitoreo.',
          methodology: 'Protocolo de validación participativa y apropiación social del conocimiento con la comunidad.',
        },
        phases: [
          {
            fase: 'Fase 1: Diseño Conceptual y Especificación Técnica',
            semanas: 'Semanas 1-2',
            actividades: `Levantamiento de requerimientos locales para ${topic.toLowerCase()}, arquitectura de componentes y selección de insumos.`,
            entregables: ['Documento de arquitectura técnica', 'Diagrama funcional de bloques'],
          },
          {
            fase: 'Fase 2: Construcción del Prototipo Alfa / MVP',
            semanas: 'Semanas 3-4',
            actividades: 'Ensamblaje del modelo físico o despliegue del software base en entorno controlado de laboratorio UNAD.',
            entregables: ['Prototipo alfa operativo', 'Pruebas de banco en laboratorio'],
          },
          {
            fase: 'Fase 3: Pruebas Piloto y Validación con Usuarios en Territorio',
            semanas: 'Semanas 5-6',
            actividades: 'Prueba de campo con 15-20 usuarios reales, recolección de métricas de desempeño y retroalimentación directa.',
            entregables: ['Bitácora de pruebas en campo', 'Matriz de usabilidad y ajustes'],
          },
          {
            fase: 'Fase 4: Evaluación de KPIs, Ajustes Finales y Hoja de Escalamiento',
            semanas: 'Semanas 7-8',
            actividades: 'Consolidación de métricas de éxito, refinamiento de la versión Beta y plan de transferencia al territorio.',
            entregables: ['Reporte final de validación TRL', 'Hoja de ruta para escalamiento comercial'],
          },
        ],
        deliverables: [
          `Prototipo funcional de ${topic}`,
          'Manual de construcción y operación en lenguaje accesible',
          'Informe de resultados de validación y KPIs',
        ],
        durationWeeks: 8,
        unadSchool: aiCategoryInput.includes('Tecnológico') ? 'ECBTI' : 'ECAPMA',
        validationMetrics: [
          'Eficacia técnica superior al 85% en condiciones normales de operación',
          'Tasa de adopción y satisfacción comunitaria > 80%',
          'Reducción estimada del 25% en costos frente a alternativas convencionales',
        ],
        risks: [
          { riesgo: 'Resistencia inicial al cambio tecnológico', mitigacion: 'Talleres de co-diseño con líderes comunitarios.' },
          { riesgo: 'Fallas por intermitencia eléctrica o conectividad', mitigacion: 'Operación híbrida offline y respaldo fotovoltaico.' },
        ],
      };
      setGeneratedPlanPreview(autonomousPlan);
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  const handleSaveGeneratedPlan = () => {
    if (!generatedPlanPreview) return;
    setPrototypes([generatedPlanPreview, ...prototypes]);
    setActiveProtoId(generatedPlanPreview.id);
    setGeneratedPlanPreview(null);
    setIsAiGeneratorOpen(false);
    setCopiedNotice(`¡Plan de Prototipado para "${generatedPlanPreview.name}" guardado en el banco de prototipos!`);
    setTimeout(() => setCopiedNotice(null), 3500);
  };

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(prototypes, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `plan_prototipado_innovahub_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleCopyMarkdown = () => {
    if (!activeProto) return;
    const md = `# PLAN DE PROTOTIPADO: ${activeProto.name}
**Eslogan:** ${activeProto.tagline || 'Solución innovadora territorial'}
**Categoría:** ${activeProto.category}
**Nivel TRL Objetivo:** ${activeProto.trlTarget || 'TRL 4 - Validación en Laboratorio'}
**Escuela UNAD:** ${activeProto.unadSchool}
**Duración Total:** ${activeProto.durationWeeks} semanas
**Origen:** ${activeProto.sourceCode ? `Fruto ${activeProto.sourceCode} del Árbol de Innovación` : 'Diseño Independiente con IA'}

---

## 1. Problema Territorial que Resuelve
${activeProto.problemSolved}

## 2. Población Objetivo y Beneficiarios
${activeProto.targetAudience}

## 3. Hipótesis Crítica a Validar
${activeProto.hypothesis || 'Validación de viabilidad y desempeño en entorno territorial.'}

## 4. Arquitectura de la Solución
- **Componente Físico / Hardware:** ${activeProto.solutionArchitecture?.hardware || 'N/A'}
- **Componente Digital / Software:** ${activeProto.solutionArchitecture?.software || 'N/A'}
- **Componente Metodológico:** ${activeProto.solutionArchitecture?.methodology || 'N/A'}

## 5. Cronograma y Fases del Plan de Prototipado
${(activeProto.phases || [])
  .map(
    (ph, i) => `### ${ph.fase} (${ph.semanas})
**Actividades:** ${ph.actividades}
**Entregables:**
${ph.entregables.map((e) => `  - ${e}`).join('\n')}`
  )
  .join('\n\n')}

## 6. Métricas de Validación en Campo (KPIs)
${activeProto.validationMetrics.map((m) => `- [ ] ${m}`).join('\n')}

## 7. Matriz de Riesgos y Mitigación
${(activeProto.risks || [])
  .map((r) => `- **Riesgo:** ${r.riesgo} | **Mitigación:** ${r.mitigacion}`)
  .join('\n')}
`;
    navigator.clipboard.writeText(md);
    setCopiedNotice('Plan de prototipado completo copiado al portapapeles en Markdown.');
    setTimeout(() => setCopiedNotice(null), 3000);
  };

  return (
    <div className="w-full space-y-6">
      {/* Title Row & Action Buttons */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <nav className="m text-xs text-brand-textMuted mb-2" aria-label="Migas de pan">
            <span>Inicio</span> <span className="opacity-40">/</span> <span>Herramientas</span> <span className="opacity-40">/</span>{' '}
            <span className="text-white">Prototipado</span>
          </nav>
          <h1 className="h2 text-3xl md:text-4xl text-white font-bold tracking-tight">Prototipado</h1>
          <p className="bd text-sm text-brand-textSecondary mt-1 max-w-3xl">
            Herramienta 5 · Banco de diseño, estructuración y validación de prototipos y servicios. Puede armar un **Plan de Prototipado completo con IA para cualquier tema libre**, o nutrirse de los frutos del Árbol de Innovación.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Main Button: Armar Plan con IA */}
          <button
            type="button"
            onClick={() => {
              setIsAiGeneratorOpen(true);
              setGeneratedPlanPreview(null);
            }}
            className="metal px-5 py-2.5 text-xs font-bold text-white flex items-center gap-2 cursor-pointer shadow-lg hover:shadow-cyan-500/25 transition-all"
          >
            <Sparkles className="w-4 h-4 text-[#F3C26B] animate-pulse" />
            <span>Armar Plan de Prototipado con IA</span>
          </button>

          <button
            type="button"
            onClick={handleExportJson}
            className="g2 px-3.5 py-2 text-xs font-semibold text-brand-textSecondary hover:text-white flex items-center gap-1.5 rounded-full"
            title="Descargar especificación completa en formato JSON"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Descargar JSON</span>
          </button>
        </div>
      </div>

      {copiedNotice && (
        <div className="p-3 rounded-xl bg-[#A8C63C]/20 border border-[#A8C63C]/40 text-xs text-[#A8C63C] flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4" />
          <span>{copiedNotice}</span>
        </div>
      )}

      {/* AI PLAN GENERATOR DRAWER / MODAL */}
      {isAiGeneratorOpen && (
        <div className="g p-6 md:p-8 rounded-[24px] border-2 border-[#5EC2DD]/50 bg-gradient-to-b from-[#073A4A]/90 via-[#04222B]/95 to-[#021219] shadow-[0_20px_70px_rgba(4,34,43,0.9)] space-y-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#5EC2DD]/20 border border-[#5EC2DD]/40 flex items-center justify-center text-[#5EC2DD]">
                <Sparkles className="w-5 h-5 text-[#5EC2DD]" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white sy">
                  Armar Plan de Prototipado Asistido por IA (Cualquier Tema)
                </h3>
                <p className="text-xs text-brand-textSecondary">
                  Escribe cualquier tema o reto libre. La IA estructurará la arquitectura, hipótesis, fases y cronograma de validación.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsAiGeneratorOpen(false)}
              className="p-1.5 rounded-full text-brand-textMuted hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {!generatedPlanPreview ? (
            /* Input Form */
            <div className="space-y-5">
              {/* Main Topic Input */}
              <div>
                <label className="text-xs font-bold text-white uppercase tracking-wider block mb-2">
                  Tema, Idea o Reto de Innovación a Prototipar:
                </label>
                <div className="relative">
                  <textarea
                    value={aiTopicInput}
                    onChange={(e) => setAiTopicInput(e.target.value)}
                    placeholder="Escribe aquí cualquier tema (ej. Biorremediación de aguas con microalgas, Detección temprana de plagas con drones, Microrredes solares comunitarias, Tutor IA rural sin internet)..."
                    rows={3}
                    className="w-full p-4 rounded-xl bg-black/60 border border-white/25 text-white text-sm focus:outline-none focus:border-[#5EC2DD] shadow-inner"
                  />
                </div>

                {/* Inspiration Quick Pills */}
                <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] text-brand-textMuted mr-1">Temas rápidos:</span>
                  {suggestionPills.map((pill, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setAiTopicInput(pill)}
                      className="text-[11px] px-2.5 py-1 rounded-full g2 border border-white/10 text-[#5EC2DD] hover:bg-[#5EC2DD]/15 hover:border-[#5EC2DD]/40 transition-colors cursor-pointer"
                    >
                      {pill}
                    </button>
                  ))}
                </div>
              </div>

              {/* Parametrization Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-[11px] font-bold text-brand-textMuted uppercase block mb-1">
                    Categoría de la Solución:
                  </label>
                  <select
                    value={aiCategoryInput}
                    onChange={(e) => setAiCategoryInput(e.target.value as PrototypeItem['category'])}
                    className="w-full px-3 py-2 rounded-xl bg-black/70 border border-white/20 text-white text-xs focus:outline-none focus:border-[#5EC2DD]"
                  >
                    <option value="Prototipo Tecnológico">Prototipo Tecnológico (Hardware/Dispositivo)</option>
                    <option value="Servicio de Innovación">Servicio de Innovación (Plataforma/Modelo)</option>
                    <option value="Proyecto Territorial">Proyecto Territorial (Impacto Comunitario)</option>
                    <option value="Vigilancia Zonal">Vigilancia Zonal y Prospectiva</option>
                    <option value="Transferencia">Transferencia Tecnológica</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-brand-textMuted uppercase block mb-1">
                    Nivel de Madurez (TRL Objetivo):
                  </label>
                  <select
                    value={aiTrlInput}
                    onChange={(e) => setAiTrlInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-black/70 border border-white/20 text-white text-xs focus:outline-none focus:border-[#5EC2DD]"
                  >
                    <option value="TRL 3 (Prueba de concepto analítica y experimental)">TRL 3 · Prueba de Concepto Experimental</option>
                    <option value="TRL 4 (Validación de componentes en laboratorio)">TRL 4 · Validación en Laboratorio UNAD</option>
                    <option value="TRL 5 (Validación en entorno relevante / campo)">TRL 5 · Validación en Entorno Relevante</option>
                    <option value="TRL 6 (Demostración en entorno real con usuarios)">TRL 6 · Demostración en Entorno Real</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-brand-textMuted uppercase block mb-1">
                    Alcance de Validación:
                  </label>
                  <select
                    value={aiScopeInput}
                    onChange={(e) => setAiScopeInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-black/70 border border-white/20 text-white text-xs focus:outline-none focus:border-[#5EC2DD]"
                  >
                    <option value="Local y Comunitario">Local / Veredal (1 a 5 fincas)</option>
                    <option value="Municipal y Zonal">Municipal y Zonal (Asociaciones)</option>
                    <option value="Regional Cuenca">Regional / Departamental</option>
                  </select>
                </div>
              </div>

              {/* Generate Action Button & Loading indicator */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                <span className="text-xs text-brand-textMuted m">
                  {isGeneratingPlan ? generationStepText : '✨ Impulsado por Google Gemini Institucional'}
                </span>

                <button
                  type="button"
                  onClick={handleGeneratePlanWithAi}
                  disabled={isGeneratingPlan || !aiTopicInput.trim()}
                  className="w-full sm:w-auto metal px-7 py-3 text-sm font-bold text-white flex items-center justify-center gap-2 cursor-pointer shadow-lg hover:shadow-cyan-500/30 disabled:opacity-50"
                >
                  {isGeneratingPlan ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-[#5EC2DD]" />
                      <span>{generationStepText}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-[#F3C26B]" />
                      <span>Generar Plan Integral de Prototipado</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* Generated Plan Preview & Review */
            <div className="space-y-6 animate-fadeIn">
              <div className="p-4 rounded-xl bg-[#A8C63C]/15 border border-[#A8C63C]/30 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-[#A8C63C]" />
                  <span className="text-xs font-bold text-white sy">
                    ¡Plan de Prototipado generado exitosamente para "{generatedPlanPreview.name}"!
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setGeneratedPlanPreview(null)}
                    className="text-xs text-brand-textMuted hover:text-white"
                  >
                    Generar otro tema
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveGeneratedPlan}
                    className="metal px-4 py-2 text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer shadow-md"
                  >
                    <Check className="w-4 h-4 text-[#A8C63C]" />
                    <span>Guardar en el Banco de Prototipos</span>
                  </button>
                </div>
              </div>

              {/* Plan Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-1.5">
                  <span className="text-[10px] font-bold text-[#5EC2DD] uppercase tracking-wider block">
                    Hipótesis Crítica a Validar:
                  </span>
                  <p className="text-xs text-white leading-relaxed font-medium">
                    {generatedPlanPreview.hypothesis}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-1.5">
                  <span className="text-[10px] font-bold text-[#F3C26B] uppercase tracking-wider block">
                    Problema Territorial que Resuelve:
                  </span>
                  <p className="text-xs text-brand-textSecondary leading-relaxed">
                    {generatedPlanPreview.problemSolved}
                  </p>
                </div>
              </div>

              {/* 4 Phases Preview */}
              <div className="space-y-3">
                <span className="text-xs font-bold text-white uppercase tracking-wider block">
                  Cronograma de 4 Fases para la Validación:
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  {(generatedPlanPreview.phases || []).map((ph, idx) => (
                    <div key={idx} className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-2">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-[#5EC2DD] m">Fase {idx + 1}</span>
                        <span className="font-mono text-brand-textMuted">{ph.semanas}</span>
                      </div>
                      <h5 className="text-xs font-bold text-white leading-snug">{ph.fase.split(':')[1] || ph.fase}</h5>
                      <p className="text-[11px] text-brand-textSecondary leading-snug">{ph.actividades}</p>
                      <div className="pt-2 border-t border-white/10">
                        <span className="text-[9px] font-bold text-[#A8C63C] uppercase block mb-1">Entregables:</span>
                        {ph.entregables.map((e, eIdx) => (
                          <div key={eIdx} className="text-[10px] text-white/80">• {e}</div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Two-Column Layout: Prototypes Catalog + Detailed Workbench */}
      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6 items-start">
        {/* Left Side: Prototypes Catalog List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-brand-textMuted uppercase tracking-wider m">
              Banco de Prototipos ({prototypes.length})
            </span>
            <span className="text-[10px] text-[#A8C63C] font-semibold">Activo</span>
          </div>

          <div className="space-y-2.5">
            {prototypes.map((proto) => {
              const isSelected = activeProtoId === proto.id;
              return (
                <div
                  key={proto.id}
                  onClick={() => setActiveProtoId(proto.id)}
                  className={`g p-4 rounded-xl cursor-pointer transition-all border ${
                    isSelected
                      ? 'border-[#5EC2DD] bg-white/10 shadow-[0_0_20px_rgba(46,156,186,0.3)]'
                      : 'border-white/10 hover:border-white/25 hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-[10px] font-bold text-[#5EC2DD] uppercase tracking-wider m">
                      {proto.category}
                    </span>
                    {proto.sourceCode ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#F29F05]/20 text-[#F3C26B] font-mono border border-[#F29F05]/30">
                        {proto.sourceCode}
                      </span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#A8C63C]/20 text-[#A8C63C] font-mono border border-[#A8C63C]/30">
                        IA Libre
                      </span>
                    )}
                  </div>

                  <h4 className="text-sm font-bold text-white sy leading-snug mb-1">{proto.name}</h4>

                  <p className="text-xs text-brand-textSecondary line-clamp-2 leading-relaxed">
                    {proto.problemSolved}
                  </p>

                  <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-brand-textMuted">
                    <span>{proto.unadSchool}</span>
                    <span className="font-mono text-[#A8C63C]">{proto.durationWeeks} sem.</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side: Detailed Workbench & Prototype Plan Canvas */}
        {activeProto ? (
          <div className="g p-6 md:p-8 rounded-2xl border border-white/15 space-y-6">
            {/* Header of Active Prototype */}
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-5">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="px-2.5 py-1 rounded text-xs font-bold bg-[#5EC2DD]/20 text-[#5EC2DD] uppercase border border-[#5EC2DD]/30">
                    {activeProto.category}
                  </span>
                  {activeProto.trlTarget && (
                    <span className="px-2.5 py-1 rounded text-xs font-bold bg-[#A8C63C]/20 text-[#A8C63C] border border-[#A8C63C]/30">
                      {activeProto.trlTarget}
                    </span>
                  )}
                  {activeProto.sourceCode && (
                    <span className="px-2.5 py-1 rounded text-xs font-bold bg-[#F29F05]/20 text-[#F3C26B] border border-[#F29F05]/30">
                      Fruto {activeProto.sourceCode} del Árbol
                    </span>
                  )}
                  <span className="px-2.5 py-1 rounded text-xs text-brand-textMuted bg-white/5 font-mono">
                    Duración: {activeProto.durationWeeks} semanas
                  </span>
                </div>

                <h2 className="text-2xl md:text-3xl font-bold text-white sy">{activeProto.name}</h2>
                <p className="text-xs text-[#5EC2DD] mt-1 font-medium">{activeProto.tagline}</p>
                <p className="text-xs text-brand-textSecondary mt-0.5">
                  Articulado por: <span className="text-white font-medium">{activeProto.unadSchool}</span>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyMarkdown}
                  className="g2 px-3.5 py-2 text-xs text-[#5EC2DD] hover:text-white flex items-center gap-1.5 rounded-full"
                  title="Copiar plan completo en Markdown"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar Plan Markdown</span>
                </button>
              </div>
            </div>

            {/* Plan Navigation Tabs */}
            <div className="flex items-center gap-2 border-b border-white/10 pb-2">
              <button
                type="button"
                onClick={() => setActivePlanTab('general')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  activePlanTab === 'general' ? 'bg-white/15 text-white' : 'text-brand-textMuted hover:text-white'
                }`}
              >
                1. Justificación e Hipótesis
              </button>
              <button
                type="button"
                onClick={() => setActivePlanTab('fases')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  activePlanTab === 'fases' ? 'bg-white/15 text-white' : 'text-brand-textMuted hover:text-white'
                }`}
              >
                2. Cronograma de Fases
              </button>
              <button
                type="button"
                onClick={() => setActivePlanTab('arquitectura')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  activePlanTab === 'arquitectura' ? 'bg-white/15 text-white' : 'text-brand-textMuted hover:text-white'
                }`}
              >
                3. Arquitectura Técnica
              </button>
              <button
                type="button"
                onClick={() => setActivePlanTab('metricas')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  activePlanTab === 'metricas' ? 'bg-white/15 text-white' : 'text-brand-textMuted hover:text-white'
                }`}
              >
                4. KPIs y Riesgos
              </button>
            </div>

            {/* TAB CONTENT 1: GENERAL */}
            {activePlanTab === 'general' && (
              <div className="space-y-5 animate-fadeIn">
                {/* Hypothesis Callout */}
                {activeProto.hypothesis && (
                  <div className="p-5 rounded-xl bg-gradient-to-r from-[#2E9CBA]/20 to-transparent border border-[#5EC2DD]/40 space-y-2">
                    <span className="text-xs font-bold text-[#5EC2DD] uppercase tracking-wider flex items-center gap-2">
                      <Target className="w-4 h-4 text-[#5EC2DD]" />
                      Hipótesis Crítica a Validar:
                    </span>
                    <p className="text-sm text-white sy leading-relaxed font-medium">
                      "{activeProto.hypothesis}"
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="p-4 rounded-xl bg-black/30 border border-white/10 space-y-1.5">
                    <span className="text-[10px] font-bold text-brand-textMuted uppercase tracking-wider block">
                      Problema Territorial que Resuelve:
                    </span>
                    <p className="text-xs text-brand-textSecondary leading-relaxed">{activeProto.problemSolved}</p>
                  </div>

                  <div className="p-4 rounded-xl bg-black/30 border border-white/10 space-y-1.5">
                    <span className="text-[10px] font-bold text-brand-textMuted uppercase tracking-wider block">
                      Beneficiarios y Actores Directos:
                    </span>
                    <p className="text-xs text-brand-textSecondary leading-relaxed">{activeProto.targetAudience}</p>
                  </div>
                </div>

                <div className="p-5 rounded-xl bg-white/5 border border-white/10 space-y-2">
                  <span className="text-xs font-bold text-white uppercase tracking-wider block">
                    Descripción Integral de la Solución:
                  </span>
                  <p className="text-xs text-brand-textSecondary leading-relaxed">{activeProto.solution}</p>
                </div>
              </div>
            )}

            {/* TAB CONTENT 2: FASES Y CRONOGRAMA */}
            {activePlanTab === 'fases' && (
              <div className="space-y-4 animate-fadeIn">
                <span className="text-xs font-bold text-white uppercase tracking-wider block">
                  Desglose de Fases de Prototipado y Validación (8 Semanas):
                </span>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(activeProto.phases || []).map((ph, idx) => (
                    <div key={idx} className="p-5 rounded-xl bg-white/5 border border-white/10 space-y-3">
                      <div className="flex items-center justify-between border-b border-white/10 pb-2">
                        <span className="text-xs font-bold text-[#5EC2DD] m">0{idx + 1} · {ph.semanas}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/80">Validación</span>
                      </div>

                      <h4 className="text-sm font-bold text-white sy">{ph.fase}</h4>
                      <p className="text-xs text-brand-textSecondary leading-relaxed">{ph.actividades}</p>

                      <div className="pt-2 border-t border-white/10 space-y-1">
                        <span className="text-[10px] font-bold text-[#A8C63C] uppercase block">Entregables de la fase:</span>
                        {ph.entregables.map((e, eIdx) => (
                          <div key={eIdx} className="flex items-center gap-1.5 text-xs text-white">
                            <span className="text-[#A8C63C]">✓</span>
                            <span>{e}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB CONTENT 3: ARQUITECTURA TÉCNICA */}
            {activePlanTab === 'arquitectura' && (
              <div className="space-y-4 animate-fadeIn">
                <span className="text-xs font-bold text-white uppercase tracking-wider block">
                  Capas de la Arquitectura de la Solución:
                </span>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-black/40 border border-[#5EC2DD]/30 space-y-2">
                    <span className="text-xs font-bold text-[#5EC2DD] uppercase flex items-center gap-1.5">
                      <Wrench className="w-4 h-4 text-[#5EC2DD]" />
                      Capa Física / Hardware
                    </span>
                    <p className="text-xs text-brand-textSecondary leading-relaxed">
                      {activeProto.solutionArchitecture?.hardware || 'Componentes físicos, sensores e instrumental de laboratorio.'}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-black/40 border border-[#A8C63C]/30 space-y-2">
                    <span className="text-xs font-bold text-[#A8C63C] uppercase flex items-center gap-1.5">
                      <BrainCircuit className="w-4 h-4 text-[#A8C63C]" />
                      Capa Lógica / Software
                    </span>
                    <p className="text-xs text-brand-textSecondary leading-relaxed">
                      {activeProto.solutionArchitecture?.software || 'Algoritmos, firmware de control y dashboard interactivo.'}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-black/40 border border-[#F3C26B]/30 space-y-2">
                    <span className="text-xs font-bold text-[#F3C26B] uppercase flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-[#F3C26B]" />
                      Capa Metodológica
                    </span>
                    <p className="text-xs text-brand-textSecondary leading-relaxed">
                      {activeProto.solutionArchitecture?.methodology || 'Protocolos de ensayo, manuales de usuario y validación social.'}
                    </p>
                  </div>
                </div>

                {/* Main Deliverables Summary */}
                <div className="p-5 rounded-xl bg-white/5 border border-white/10 space-y-2">
                  <span className="text-xs font-bold text-white uppercase tracking-wider block">
                    Entregables Consolidados:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {activeProto.deliverables.map((d, dIdx) => (
                      <div key={dIdx} className="p-3 rounded-lg bg-black/30 border border-white/10 text-xs text-brand-textSecondary">
                        <span className="text-[#A8C63C] font-bold block mb-1">Entregable {dIdx + 1}</span>
                        {d}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT 4: METRICAS Y RIESGOS */}
            {activePlanTab === 'metricas' && (
              <div className="space-y-5 animate-fadeIn">
                <div className="space-y-3">
                  <span className="text-xs font-bold text-white uppercase tracking-wider block">
                    Criterios y Métricas de Éxito / Validación (KPIs):
                  </span>
                  <div className="p-4 rounded-xl bg-black/30 border border-white/10 space-y-2.5">
                    {activeProto.validationMetrics.map((met, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 text-xs text-white">
                        <CheckCircle className="w-4 h-4 text-[#A8C63C] shrink-0 mt-0.5" />
                        <span className="leading-snug">{met}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {activeProto.risks && activeProto.risks.length > 0 && (
                  <div className="space-y-3">
                    <span className="text-xs font-bold text-white uppercase tracking-wider block">
                      Matriz de Riesgos y Mitigación:
                    </span>
                    <div className="space-y-2.5">
                      {activeProto.risks.map((r, idx) => (
                        <div key={idx} className="p-3.5 rounded-xl bg-white/5 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-2 text-[#F3C26B]">
                            <ShieldAlert className="w-4 h-4 shrink-0" />
                            <span className="font-semibold">{r.riesgo}</span>
                          </div>
                          <div className="text-brand-textSecondary sm:text-right">
                            <span className="text-brand-textMuted text-[10px] block">Mitigación:</span>
                            {r.mitigacion}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
};
export default PrototipadoView;