/**
 * Datos de ejemplo para el MODO DEMOSTRACIÓN (manual visual).
 *
 * Nada de esto viaja a internet: cuando `demoMode` está activo, los servicios de
 * IA (`services/ai.ts`) y de Google Drive (`services/institutionalDrive.ts`)
 * devuelven este contenido con progreso y retardos simulados, para que una
 * persona vea la aplicación funcionando de principio a fin sin claves ni conexión.
 *
 * El Centro de Innovación es FICTICIO (Nariño · Pasto) y sirve solo para ilustrar el flujo.
 */
import type { Prompt0Data } from '@/store/useStore';
import type { LoadInstitutionalDriveResult } from '@/services/institutionalDrive';

/**
 * Credenciales de IA de ejemplo (FICTICIAS) para el panel de configuración.
 * No autorizan nada: en modo demostración la prueba de conexión se simula.
 */
export const DEMO_AI_CREDENTIALS = {
  xApiKey: 'demo-x-api-key-••••••••',
  bearer: 'demo-bearer-token-••••••••••••',
};

/** Correo institucional ficticio que mostraría la ventana de permiso de Google. */
export const DEMO_INSTITUTIONAL_ACCOUNT = 'lider.zona@unad.edu.co';

/** Ficha Base de ejemplo (departamento y municipio válidos en DIVIPOLA). */
export const DEMO_FICHA: Prompt0Data = {
  labName: 'Centro de Innovación Agroalimentario del Sur',
  labNameKind: 'nombre',
  zonaUNAD: 'Zona Sur (ZSUR)',
  municipality: 'Pasto',
  department: 'Nariño',
  country: 'Colombia',
};

/** Resultado simulado de leer el Contenedor 1 en Google Drive (sin ventana de Google). */
const DEMO_DRIVE_FILE_PATHS = [
  'CONTENEDOR_1/resultado_contenedor1_Pasto.pdf',
  'GENERALES/instruccion_documento_fundante_CIP.txt',
  'GENERALES/prompt_vocacion_cip.txt',
  'GENERALES/prompt_arbol_innovacion.txt',
  'CONTENEDOR_2/PROMPTS_FUENTES_CONSULTA_CONTENEDOR2_TERRITORIAL.txt',
  'CONTENEDOR_2/C_TERRITORIO_ESPECIFICO/PASTO/plan_desarrollo_municipal_2024_2027.pdf',
  'CONTENEDOR_2/C_TERRITORIO_ESPECIFICO/PASTO/perfil_economico_camara_comercio.docx',
];

export const DEMO_DRIVE_RESULT: LoadInstitutionalDriveResult = {
  fileNames: DEMO_DRIVE_FILE_PATHS,
  errors: [],
  truncated: false,
  sourceCharCount: 184_320,
  text:
    '--- PDF: resultado_contenedor1_Pasto.pdf ---\n(Contenido institucional de ejemplo del Contenedor 1 para el modo demostración.)\n',
  diagnostics: {
    folderPaths: ['CONTENEDOR_1', 'GENERALES', 'CONTENEDOR_2', 'CONTENEDOR_2/C_TERRITORIO_ESPECIFICO/PASTO'],
    filePaths: DEMO_DRIVE_FILE_PATHS,
    skippedFiles: [],
    territoryFolderNames: ['PASTO'],
  },
  territories: [
    {
      name: 'PASTO',
      fileNames: [
        'plan_desarrollo_municipal_2024_2027.pdf',
        'perfil_economico_camara_comercio.docx',
      ],
      folderNames: ['PASTO'],
      text: '(Fuentes territoriales de ejemplo de Pasto, Nariño, para el modo demostración.)',
    },
  ],
  documents: [
    {
      id: 'demo-pdm-pasto',
      name: 'plan_desarrollo_municipal_2024_2027.pdf',
      mimeType: 'application/pdf',
      modifiedTime: '2025-02-18T10:00:00.000Z',
    },
    {
      id: 'demo-perfil-camara',
      name: 'perfil_economico_camara_comercio.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      modifiedTime: '2025-03-02T14:30:00.000Z',
    },
  ],
};

/**
 * Contenedor 2 de ejemplo: los doce puntos de entrega de la metodología, resumidos.
 * Conserva los títulos contractuales (Dinámicas territoriales, Brechas regionales,
 * Oportunidades del entorno, Matriz FODA territorial) para que el modo demostración
 * ilustre la misma estructura que produce el flujo real.
 */
export const DEMO_CONTAINER_MD = `# Contenedor 2 — Contexto territorial del Centro de Innovación Agroalimentario del Sur

> **DEMOSTRACIÓN:** documento de ejemplo generado sin conexión, solo para ilustrar el flujo de la aplicación.

## 1. Identificación del territorio

El municipio de **Pasto** (departamento de **Nariño**, Zona Sur de la UNAD) es la capital departamental y principal centro urbano del sur andino colombiano. El diagnóstico abarca el municipio como unidad y su relación con el altiplano nariñense.

## 2. Ficha de caracterización productiva

La actividad predominante combina agricultura de altiplano, comercio y artesanía, con un sector de servicios en crecimiento. Cadenas presentes según el Plan de Desarrollo Municipal: lácteos y derivados, papa y tubérculos andinos, cuy y especies menores, y artesanía del barniz de Pasto (mopa-mopa).

| Indicador | Valor | Fuente y año |
|---|---|---|
| Población aproximada | 392.000 habitantes | DANE, proyección 2024 |
| Altitud media | 2.527 m s. n. m. | IGAC |
| Tasa de informalidad | ==⚠️ ALERTA DE VERIFICACIÓN HUMANA: no se halló dato municipal de informalidad (VACÍO-VERIFICAR)== | — |

## 3. Lectura por pilar de competitividad

- **Gobierno e instituciones:** presencia de Alcaldía, Gobernación y Cámara de Comercio. *Nivel de evidencia: medio.*
- **Desarrollo económico:** base agropecuaria con baja transformación. *Nivel de evidencia: medio.*
- **Infraestructura productiva:** ==⚠️ ALERTA DE VERIFICACIÓN HUMANA: no hay inventario de infraestructura en las fuentes consultadas (VACÍO-VERIFICAR)== *Nivel de evidencia: sin evidencia.*
- **Capital humano:** UNAD y Universidad de Nariño con oferta técnica y profesional. *Nivel de evidencia: alto.*
- **Eficiencia empresarial:** predominio de unidades pequeñas y asociativas. *Nivel de evidencia: bajo.*

## 4. Dinámicas territoriales

Pasto concentra el comercio y los servicios del sur andino y articula la producción rural del altiplano con los mercados regionales. La cuenca lechera abastece la transformación artesanal local.

## 5. Brechas regionales

- Baja transformación local de la producción primaria frente al promedio departamental.
- Conectividad y logística limitadas hacia mercados nacionales.
- Capacidades de innovación y agregación de valor por fortalecer.

## 6. Oportunidades del entorno

Programas nacionales de agroindustria rural, demanda creciente de alimentos funcionales y valorización del patrimonio cultural como activo económico.

## 7. Matriz FODA territorial

| | Favorable | Desfavorable |
|---|---|---|
| **Interno** | Fortalezas: cuenca lechera consolidada, biodiversidad andina, saberes tradicionales | Debilidades: escasa transformación local, logística limitada |
| **Externo** | Oportunidades: alimentos funcionales, compras públicas, turismo cultural | Amenazas: volatilidad de precios, competencia de productos industriales |

## 8. Resultado del contraste participativo

Las dos fuentes cargadas para Pasto confirman el perfil agroalimentario y la cuenca lechera. ==⚠️ ALERTA DE VERIFICACIÓN HUMANA: el perfil de la Cámara de Comercio y el Plan de Desarrollo difieren en el peso del turismo (REQUIERE CONTRASTE)==

## 9. Alertas de verificación humana consolidadas

Alertas generadas en este contenedor: **3** (VACÍO-VERIFICAR: 2 · REQUIERE CONTRASTE: 1).

| Apartado | Etiqueta | Qué falta confirmar |
|---|---|---|
| 2. Ficha de caracterización productiva | VACÍO-VERIFICAR | no se halló dato municipal de informalidad |
| 3. Lectura por pilar de competitividad | VACÍO-VERIFICAR | no hay inventario de infraestructura en las fuentes consultadas |
| 8. Resultado del contraste participativo | REQUIERE CONTRASTE | el perfil de la Cámara de Comercio y el Plan de Desarrollo difieren en el peso del turismo |

## 10. Fuentes consultadas

**Insumos institucionales del territorio (Drive)**
- Alcaldía de Pasto. (2024). *Plan de Desarrollo Municipal 2024-2027*.
- Cámara de Comercio de Pasto. (s.f.). *Perfil económico de la jurisdicción*.

**Entidades oficiales**
- Departamento Administrativo Nacional de Estadística. (2024). *Proyecciones de población municipal*.

## 11. Observaciones de trazabilidad

La subcarpeta del territorio se emparejó de forma exacta con el municipio de la Ficha Base y no había otras candidatas. El dato de altitud proviene de una fuente secundaria por ausencia de la ficha oficial del IGAC.

## 12. Declaración de cierre

Este contenedor entrega un diagnóstico territorial verificable. No declara la vocación de servicio del territorio ni los temas estratégicos del Centro de Innovación; esa definición corresponde al paso de Vocación Territorial.

**ALERTA DE VERIFICACIÓN HUMANA: cifras ilustrativas del modo demostración; validar con fuentes oficiales antes de usar.**
`;

/** Propuesta de vocación + 3 opciones de tema (estructura que reconoce ThemeDecisionPanel). */
export const DEMO_THEME_PROPOSAL_MD = `## Vocación del territorio: Bioeconomía agroalimentaria del altiplano nariñense

> **DEMOSTRACIÓN:** propuesta de ejemplo para ilustrar la elección de tema del Centro de Innovación.

Pasto reúne las condiciones para un Centro de Innovación orientado a la **agregación de valor agroalimentaria** con enfoque de bioeconomía: cuenca lechera consolidada, agricultura andina diversa y un patrimonio cultural que puede integrarse al diseño de nuevos productos. La vocación propuesta articula productividad rural, sostenibilidad y saberes locales.

### Opción de tema 1: Innovación láctea y agroindustria de alto valor

Aprovechar la cuenca lechera del altiplano para desarrollar productos lácteos diferenciados (quesos maduros, funcionales) con estándares de calidad e inocuidad, generando encadenamientos con pequeños productores.

### Opción de tema 2: Bioeconomía de tubérculos y cultivos andinos

Transformar papa nativa, ulluco y otros tubérculos andinos en productos de valor agregado (harinas, snacks saludables, ingredientes funcionales), rescatando biodiversidad y mejorando ingresos campesinos.

### Opción de tema 3: Diseño e innovación en agro-artesanía sostenible

Integrar el barniz de Pasto y otras artesanías con cadenas agroalimentarias para crear productos de identidad territorial, articulando turismo, cultura y economía creativa.

**Selección humana:** el equipo del Centro de Innovación debe elegir **una** de las tres opciones para continuar con el árbol de innovación.
`;

/** Árbol de innovación de ejemplo (incluye la sección "Estructurado" que dibuja el SVG). */
export const DEMO_INNOVATION_TREE_MD = `# Árbol de Innovación — Tema 2: Bioeconomía de tubérculos y cultivos andinos

> **DEMOSTRACIÓN:** árbol de ejemplo. Haz clic en las partes del dibujo para explorarlas.

## Tendencias globales (Ramas globales)

| # | Tendencia mundial | Relevancia |
|---|---|---|
| 1 | Alimentos funcionales y saludables | Alta |
| 2 | Ingredientes de origen vegetal | Alta |
| 3 | Trazabilidad y etiquetado limpio | Media |

## Tendencias nacionales (Colombia)

| # | Tendencia nacional | Relevancia |
|---|---|---|
| 1 | Agroindustria 4.0 y valor agregado rural | Alta |
| 2 | Biodiversidad como activo económico | Alta |

## Árbol de Innovación (Estructurado)

**SUELO:** Fuentes de sustento — políticas de desarrollo rural, cooperativas campesinas y programas de innovación agraria que nutren el ecosistema.

**RAÍZ:** Capacidades instaladas — asociaciones de productores de papa nativa, saberes tradicionales de cultivo andino y laboratorios de la UNAD.

**TRONCO:** Tema central — bioeconomía de tubérculos y cultivos andinos con agregación de valor.

**RAMAS GLOBALES:** Alimentos funcionales, ingredientes vegetales y economía circular alimentaria.

**RAMAS NACIONALES:** Agroindustria 4.0, biodiversidad como activo y compras públicas de alimentos.

**RAMAS TERRITORIALES:** Cadena de papa nativa de Nariño, gastronomía andina y denominaciones de origen.

**HOJAS:** Oportunidades de innovación — harinas andinas, snacks saludables, ingredientes funcionales y empaques biodegradables.

**FRUTOS:** Proyectos y servicios — planta piloto de deshidratado, línea de snacks de ulluco, servicio de laboratorio de calidad y marca colectiva territorial.

## Oportunidades priorizadas

1. Línea de snacks saludables de tubérculos andinos.
2. Ingredientes funcionales (harinas) para panificación.
3. Marca colectiva con identidad territorial.

**ALERTA DE VERIFICACIÓN HUMANA: contenido ilustrativo del modo demostración.**
`;

/** proyecto de innovación de ejemplo (13 apartados alineados con la metodología oficial). */
export const DEMO_DOCUMENT_MD = `# Ecosistema de Innovación — Centro de Innovación Agroalimentario del Sur

> **DEMOSTRACIÓN:** documento de ejemplo generado sin conexión. Ilustra el resultado final descargable en PDF o Word con infografías vectoriales, tablas estilizadas y epígrafes APA.

## 1. Introducción y justificación estratégica

El **Centro de Innovación Agroalimentario del Sur**, con sede en Pasto (Nariño, Zona Sur de la UNAD), se constituye como Centro de Innovación orientado a la bioeconomía de tubérculos y cultivos andinos con agregación de valor territorial.

## 2. Marco Referencial, Normativo y Contextual

La transformación agroindustrial de la producción agrícola andina responde a las políticas de reindustrialización y al Plan de Desarrollo Municipal de Pasto (Alcaldía de Pasto, 2024), aprovechando la biodiversidad regional como activo económico sostenible.

## 3. Árbol de innovación

Se adopta la estructura del árbol de innovación validada en el paso intermedio (Tema 2), articulando tendencias globales en alimentos funcionales, prioridades nacionales de bioeconomía y la cadena productiva de papa nativa en Nariño.

## 4. Articulación metasistémica UNAD

El Centro de Innovación opera como nodo reticular del metasistema UNAD, vinculando la Escuela de Ciencias Agrícolas, Pecuarias y del Medio Ambiente y la Escuela de Ciencias Básicas, Tecnología e Ingeniería con los centros comunitarios de la Zona Sur.

## 5. Plataforma estratégica del Centro de Innovación

- **Misión propuesta:** dinamizar la competitividad y la agregación de valor del sector agroalimentario en Nariño mediante investigación aplicada y transferencia tecnológica.
- **Visión propuesta:** consolidarse como referente regional en innovación bioeconómica y alimentos funcionales al 2030.

## 6. Experiencias previas de investigación

| Proyecto | Código | Tipo | Investigador | Escuela | Contribución al Centro de Innovación |
|---|---|---|---|---|---|
| "Valorización de tubérculos andinos" | SIG-2024-01 | Aplicada | Dr. Carlos Narváez | ECAPMA | Línea base de extracción de almidones |
| "Biotecnología de alimentos en Nariño" | SIG-2023-14 | Desarrollo | Dra. Elena Rosero | ECBTI | Protocolos de deshidratado y calidad |

## 7. Portafolio de servicios

1. **Macroservicio 1 (Genérico):** Asistencia técnica y extensionismo agroindustrial para asociaciones productoras.
2. **Macroservicio 2 (Especializado):** Prototipado y escalamiento de harinas funcionales e ingredientes vegetales.
3. **Macroservicio 3 (Especializado):** Laboratorio de aseguramiento de calidad y registro de marca colectiva.

## 8. Acceso al servicio y operacionalización

Ruta de atención integral para productores y empresas rurales, articulando laboratorios físicos de la UNAD y plataformas de gestión del conocimiento.

## 9. Indicadores de cumplimiento y productos esperados

| Indicador | Tipo | Meta indicativa | Periodicidad | Responsable |
|---|---|---|---|---|
| Prototipos validados | Producto | 4 líneas de producto | Semestral | Comité Técnico |
| Productores capacitados | Gestión | 120 productores rurales | Anual | Líder Zonal de Innovación |

## 10. Alcance

Delimitación geográfica en el altiplano nariñense y enfoque exclusivo en bioeconomía y agregación de valor agroalimentario.

## 11. Ruta de maduración

Evolución progresiva en 4 fases secuenciales: Fase I (Diagnóstico), Fase II (Diseño), Fase III (Implementación) y Fase IV (Consolidación).

## 12. Referencias

- Alcaldía de Pasto. (2024). *Plan de Desarrollo Municipal 2024-2027: Pasto Territorio de Paz*.
- Universidad Nacional Abierta y a Distancia. (2023). *Política Metasistémica de Innovación y Emprendimiento*.

## 13. Anexos y matrices

Matrices metodológicas, matriz RACI de responsabilidades institucionales y mapa de actores del ecosistema regional.

**ALERTA DE VERIFICACIÓN HUMANA: documento ilustrativo del modo demostración; no reemplaza el trabajo real del equipo.**
`;
