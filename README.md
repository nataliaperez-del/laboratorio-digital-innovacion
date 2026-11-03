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

ZOE es el schnauzer holográfico que vive en la interfaz; la referencia es `zoe_personality_character_bible_editable_v2.pptx` y la hoja de posturas del personaje. Se comunica **solo por voz** y **subtítulos**. El uso está explicado en el [manual de usuario](docs/manual-usuario.md).

- **Conocimiento y personalidad:** [`src/content/zoe/documento-maestro.md`](src/content/zoe/documento-maestro.md) reúne identidad, preguntas frecuentes, frases de motivación, cariño y agradecimiento, chistes y muletillas. La IA lo recibe completo en cada turno (`src/services/zoeAi.ts`): para enseñarle algo a ZOE se edita ese archivo, sin tocar código.
- **Conversación:** tocarlo saluda y abre el micrófono (el permiso se pide en ese toque). Responde completo: si se le toca mientras habla, termina la idea y luego escucha. Si la frase de la persona queda cortada («quiero hacer un prototipo para…»), pregunta si ya terminó; «espera» le da tiempo (`seemsUnfinished`, `isDoneReply` y `wantsMoreTime` en `src/lib/zoeContext.ts`). Las frases largas se parten para que el navegador no las corte. Cada fallo del micrófono tiene su explicación: permiso, micrófono ausente o mudo, falta de HTTPS o de red.
- **Órdenes directas:** «llévame al árbol», «pon el modo oscuro», «siéntate», «levántate», «camina» y «a dormir» se cumplen sin consultar a la IA.
- **Vida propia:** pasea, cambia de postura y, de vez en cuando, busca el rincón de la pantalla con menos botones, da unas vueltas, se echa y duerme un rato (`ZoeFreePresence.tsx`).
- **Casita (`ZoeDoghouse.tsx`):** con el botón de la casita o la orden «ve a tu casita», ZOE camina (o trota, si está lejos, con el clip `Trot` del modelo) hasta la casita de la esquina inferior derecha y entra; el interruptor de ZOE del menú la guarda sin la caminata. Queda solo la casita, con los ojos de ZOE en la puerta; el 3D se desmonta, así que no gasta GPU. Al tocarla, ZOE aparece en la puerta cuando el modelo terminó de cargar y vuelve a su sitio.
- **Modelo 3D:** `public/assets/zoe/zoe.glb` es el modelo rigueado en Meshy (esqueleto de cuadrúpedo de 49 huesos, con mentón para la boca) más sus animaciones Shake, Trot y Tail_Wag. Se prepara en dos pasos con Blender 4.5:
  1. [`scripts/zoe/preparar_meshy_rig.py`](scripts/zoe/preparar_meshy_rig.py) une las costuras de la textura (sin ellas la piel se abre al moverse) y reduce de 3,2 millones a 80 000 triángulos. También corrige los pesos de Meshy: la nariz y el hocico estaban pesados al cuello y se rasgaban al girar la cabeza, y las orejas y el mentón arrastraban parte de la cara. Deja las texturas en 2048 px.
  2. [`scripts/zoe/animar_zoe.py`](scripts/zoe/animar_zoe.py) conserva los clips de Meshy y crea los que faltan con cinemática inversa sobre el mismo esqueleto: `idle`, `alert`, `walk`, `sit_down`, `sit_idle`, `lie_down`, `lie_idle`, `sleep` y `play_bow`. Las patas se apoyan en el piso también durante las transiciones.
  ```bash
  blender -b --factory-startup --python scripts/zoe/preparar_meshy_rig.py -- Animaciones.glb zoe_80k.glb --tris 80000
  blender -b --factory-startup --python scripts/zoe/animar_zoe.py -- zoe_80k.glb public/assets/zoe/zoe.glb --renders capturas/
  ```
  `scripts/zoe/retopologia_zoe.py` queda como el proceso del modelo anterior (retopología por vóxeles), por si se necesita repetir.
- **Clips y director:** `src/components/zoe/zoeClipDirector.ts` reconoce por su nombre los clips del GLB (los de este proyecto, los de un autorig de cuadrúpedos como afk.ai —«Idle», «Sit», «Lie Down», «Sleep», «Tail Wag»…— o los de Meshy) y los encadena con fundidos: se levanta antes de echarse y, si no hay clip para levantarse, reproduce al revés el de bajar. Para cambiar las animaciones basta con reemplazar el GLB.
- **Visor de clips:** `#/zoe-visor` (recargando la página) carga el modelo oficial o cualquier GLB local, lo pone en cada postura y ánimo con el mismo código de la app y muestra qué clip tomó cada uso. Sirve para revisar un GLB antes de publicarlo.
- **Animaciones nuevas sin animador:** `scripts/zoe/exportar_para_autorig.py` deja a ZOE como malla estática con textura, lista para subir a un autorig de cuadrúpedos. El resultado se revisa en el visor y, si cumple, reemplaza `public/assets/zoe/zoe.glb`.
- **Animación en la web (`ZoeCanvas3D.tsx`):** mezcla las posturas del modelo y suma respiración, mirada que sigue al puntero, cola en cadena y gestos según el ánimo, siempre en los ejes del perro. El pelaje se dibuja en capas sobre la piel; su largo sale del color (barba y cejas largas, sin pelo sobre el traje). Los ojos son un shader propio: parpadeo irregular, pupila según el ánimo, sonrisa y ojos cerrados al dormir.
- **Presentación:** `ZoeIntro.tsx`, seis escenas con el modelo 3D en vivo, narradas y con subtítulos.
- **Voz (`zoePiperVoice.ts`):** ZOE habla con Piper, voz «es_MX-claude-high» (licencia Apache 2.0), en el navegador con ONNX y en su variante «tierna»: tres semitonos más aguda y al mismo ritmo (`muestras-voz-zoe/zoe-mexico-claude-tierna.wav`, fuera del repositorio). El modelo (63 MB) se baja de Hugging Face una sola vez, cuando el navegador está desocupado, y queda en el almacenamiento del navegador (OPFS). Una frase tarda menos de un segundo en generarse y la siguiente se prepara mientras suena la anterior. Mientras se descarga, o con ahorro de datos, conexión lenta o si algo falla, habla la voz del sistema. De `@mintplex-labs/piper-tts-web` solo se usa el fonetizador (alias `piper-phonemize` en `vite.config.ts`): su sesión recrea espeak en cada frase y tarda 2 s más por frase. Para cambiar el tono o el ritmo se ajustan `TENDER_RATE`, `PACE` y la marca `TUNING`.
- **Requisitos:** el reconocimiento de voz necesita Chrome o Edge, internet, HTTPS (o `localhost`) y permiso de micrófono.
- **Boca:** se abre por sílabas mientras habla, con el hueso del mentón.
- **Límites:** los ojos son los de la textura (este esqueleto no trae párpados), así que no parpadea; al dormir baja la cabeza sobre las manos.

## Puesta en marcha

```bash
npm install
```

Copia `.env.example` como `.env.local` y define `UNAD_GEMINI_X_API_KEY` y `UNAD_GEMINI_BEARER`. Cada visita usa la IA institucional UNAD sin que nadie la elija; otro proveedor (Claude, Gemini comercial, OpenAI, Ollama) se elige en el botón «IA» y dura solo mientras la pestaña está abierta, igual que su clave. El panel verifica la conexión con la UNAD al abrirse. Luego:

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
- **Scroll fluido.** Los paneles de los módulos (`.lab-panel`) no usan `backdrop-filter`: con una veintena por pantalla, el navegador recalculaba cada desenfoque en cada cuadro del desplazamiento. Los halos y la malla del fondo van fijos a la ventana (`App.tsx`), ZOE deja de dibujar mientras la página se desplaza y el Banco no anida zonas con scroll propio. Antes de volver a poner vidrio desenfocado en algo que se repite, mídelo.
- **Créditos siempre visibles.** La firma de los desarrolladores y los logos de la UNAD y la VIEM flotan abajo a la derecha, sin recuadro (`.lab-credits`), a la izquierda de la casita de ZOE: su esquina (`--zoe-house-room`) queda libre aunque ZOE esté afuera. En el piso, ZOE tampoco se para encima de la firma (`clampPosition`): se queda a su lado o, en celulares, un poco más arriba.

## Producción (Hostinger)

Ver [hostinger_deploy/README_HOSTINGER.md](hostinger_deploy/README_HOSTINGER.md). Las credenciales van en `config/ia.php`, que no se sube al repositorio.

## Limitaciones conocidas

- El PDF se genera con el diálogo de impresión del navegador: se elige «Guardar como PDF», como en Fase 1.
- Los resultados se guardan en el navegador de cada persona (`localStorage`); aún no se comparten entre equipos.
- Las plantillas de `public/` se sirven por web, como en Fase 1: son internas para la interfaz, pero alguien con la URL podría leerlas.
- El marco institucional (`CONTENEDOR_1`) sigue mencionando CIP; solo se usa para verificar alineación y las reglas de alcance impiden que pase al resultado.
