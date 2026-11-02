# Laboratorio de Innovación en Línea

Módulo del **Observatorio InnovaHub360** (UNAD · VIEM). Es solo una parte del Observatorio: se alimenta de las señales de su Radar y no reemplaza a sus demás destinos.

| Herramienta | Parte de | Resultado en pantalla | Informe formal |
|---|---|---|---|
| **Estudio Territorial** | Ficha Base + fuentes propias opcionales | 12 puntos MDVT: pilares con evidencia, matriz FODA, tarjetas de brechas y alertas | Word y PDF |
| **Ideación** | Un tema, un archivo, una señal del Radar o el Estudio | Vocación y tres temas para decidir | Word y PDF |
| **Árbol de Innovación** | Un tema, un archivo, una señal o el tema de Ideación | Árbol 10-5-3 interactivo y tabla | Word y PDF con la figura del árbol |
| **Prototipado** | Una idea, un resultado del Árbol o una señal | Plan por pestañas y banco de planes | Word y PDF con cronograma |

Cada herramienta funciona sola. Encadenarlas es opcional: cada una entrega su resultado a la siguiente con un botón.

## ZOE

ZOE es el schnauzer holográfico que vive en la interfaz; la referencia es `zoe_personality_character_bible_editable_v2.pptx`. Se comunica **solo por voz** y **subtítulos**: se le toca, saluda, escucha, responde y vuelve a escuchar. Tocarlo mientras habla lo interrumpe; dos silencios seguidos cierran la charla.

- **Inteligencia:** el mismo modelo institucional de las herramientas, con personalidad propia y especialidad en innovación (`src/services/zoeAi.ts`). Conoce la pantalla actual y el contenido real del resultado que hay en ella. Si la IA falla, lo dice.
- **Órdenes directas:** «llévame al árbol», «pon el modo oscuro», «a dormir» se cumplen sin consultar a la IA (`src/lib/zoeContext.ts`).
- **Animación:** capa procedimental sobre el clip de caminar del modelo (`ZoeCanvas3D.tsx`): respiración, mirada que sigue al puntero, cola en cadena, gestos al azar y estados de escucha, pensamiento, habla y alegría.
- **Presentación:** `ZoeIntro.tsx`, seis escenas con el modelo 3D en vivo, narradas y con subtítulos. Se abre desde el inicio.
- **Requisitos:** el reconocimiento de voz necesita Chrome o Edge y permiso de micrófono. La calidad de la voz es la del sistema operativo.
- **Ojos:** se dibujan por shader sobre el modelo (`EYE_FRAGMENT` en `ZoeCanvas3D.tsx`): parpadeo irregular, mirada, pupila según el ánimo, sonrisa y ojos cerrados al dormir.
- **Malla:** `public/assets/zoe/zoe.glb` ya está reparado. Si llega un modelo nuevo, se repara con `node scripts/reparar-malla-zoe.mjs entrada.glb salida.glb`, varias pasadas.
- **Límites del modelo actual:** no tiene rig facial (no mueve la boca) ni los accesorios de la biblia (visor, chaleco), porque dependen del equipo 3D.

## Puesta en marcha

```bash
npm install
```

Copia `.env.example` como `.env.local` y define `UNAD_GEMINI_X_API_KEY` y `UNAD_GEMINI_BEARER`. Luego:

```bash
npm run dev
```

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor local en el puerto 3000, con los proxies de IA y del Observatorio |
| `npm test` | Pruebas unitarias |
| `npm run lint` | Chequeo de tipos |
| `npm run build` | Compila en `dist/` |
| `npm run deploy:package` | Compila y actualiza `hostinger_deploy/` |
| `npm run sellar` | Regenera el manifiesto de las plantillas internas |

## Cómo está organizado

```text
public/REPOSITORIO_CIP_DF/      Plantillas y marco institucional, internos (nunca se muestran)
src/services/
  ai.ts                         Motor de IA de Fase 1: proveedores, cancelación y recuperación
  territorialStudy.ts           Estudio Territorial
  ideation.ts                   Vocación y tres temas
  innovationTree.ts             Documento del árbol y su grafo
  prototyping.ts                Plan de prototipado
  observatorio.ts               Lectura del Radar (solo lectura)
src/prompts/
  labGuardrails.ts              Alcance común: sin menciones a CIP ni documento fundante
  contenedor2Sections.ts        Los 12 puntos del estudio y su autoevaluación
  themeAndInnovationPrompts.ts  Partes de Ideación y Árbol y su autoevaluación
src/lib/
  innovationTreeGraph.ts        Modelo del árbol, validación y reconstrucción desde tablas
  innovationTreeSvg.ts          Dibujo del árbol, compartido por pantalla e informes
  territorialInsights.ts        Lectura de pilares, FODA, alertas y fuentes
  documentPlan.ts               Markdown → plan común a Word y PDF
  docxExport.ts, printExport.ts Portada, índices, numeración y epígrafes
  labReports.ts                 Definición del informe de cada herramienta
src/components/lab/             Piezas comunes: lector interactivo, descargas, progreso, panel de IA
src/components/tools/           Las vistas de cada herramienta y el Radar
vite-plugin-unad-gemini-proxy.ts, hostinger_deploy/includes/   Proxies de desarrollo y producción
```

## Reglas que el código hace cumplir

- **La IA media todo y sus prompts son internos.** Se usa el motor de Fase 1, con generación por partes, autoevaluación, autorreparación, continuación ante cortes y botón «Detener».
- **Nada inventado.** Sin credenciales, el proxy responde 503 y la pantalla lo informa. No hay nodos, temas, planes ni datos de ejemplo en el código. El Árbol, si el modelo no entrega nodos válidos, los reconstruye de las tablas del propio documento y lo avisa.
- **Sin mención a CIP.** `labGuardrails.ts` lo pide en cada prompt y la autoevaluación lo comprueba después; si aparece, se reintenta una vez y, si persiste, la parte queda marcada para revisión.
- **Pantalla interactiva, documento formal.** Los resultados no llegan a pantalla como Markdown crudo; el documento académico sale de las descargas.
- **Credenciales solo en el servidor.** Las variables sin prefijo `VITE_` nunca llegan al navegador.

## Producción (Hostinger)

Ver [hostinger_deploy/README_HOSTINGER.md](hostinger_deploy/README_HOSTINGER.md). Las credenciales van en `config/ia.php`, que no se sube al repositorio.

## Limitaciones conocidas

- El PDF se genera con el diálogo de impresión del navegador: se elige «Guardar como PDF», como en Fase 1.
- Los resultados se guardan en el navegador de cada persona (`localStorage`); aún no se comparten entre equipos.
- Las plantillas de `public/` se sirven por web, como en Fase 1: son internas para la interfaz, pero alguien con la URL podría leerlas.
- El marco institucional (`CONTENEDOR_1`) sigue mencionando CIP; solo se usa para verificar alineación y las reglas de alcance impiden que pase al resultado.
