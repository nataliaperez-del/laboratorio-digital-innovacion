# Laboratorio de Innovación en Línea

Módulo del **Observatorio InnovaHub360** (UNAD · VIEM). Es solo una parte del Observatorio: se alimenta de las señales de su Radar y no reemplaza a sus demás destinos.

> [!NOTE]
> **📚 Documentación Científica, Metodológica y Arquitectónica Integral:**  
> Para consultar el marco epistémico completo, sustento teórico-científico (MDVT, Godet, Doble Diamante, TRL, PAPS 3.0), adaptación institucional a la UNAD, arquitectura de software y fichas técnicas por herramienta, consulte el [Documento Maestro Consolidado](DOCUMENTO_MAESTRO_CONSOLIDADO.md) (también accesible en [docs/DOCUMENTO_MAESTRO_CONSOLIDADO.md](docs/DOCUMENTO_MAESTRO_CONSOLIDADO.md)).


| Herramienta | Parte de | Resultado en pantalla | Informe formal |
|---|---|---|---|
| **Identificar Oportunidades** · Estudio Territorial | Ficha Base + fuentes propias opcionales | 12 puntos MDVT: pilares con evidencia, matriz FODA, tarjetas de brechas y alertas | Word y PDF |
| **Crear Conceptos** · Ideación | Un tema, un archivo, una señal del Radar o el Estudio | Vocación y tres temas para decidir | Word y PDF |
| **Validar Conceptos** · Árbol de Innovación | Un tema, un archivo, una señal o el tema de Ideación | Árbol 10-5-3 interactivo y tabla | Word y PDF con la figura del árbol |
| **Desarrollar Soluciones** · Prototipado | Una idea, un resultado del Árbol o una señal | Plan por pestañas y banco de planes | Word y PDF con cronograma |

Cada módulo lleva un título grande con la acción (Identificar Oportunidades, Crear Conceptos, Validar Conceptos, Desarrollar Soluciones) y, debajo, el nombre de su método como subtítulo. Esos nombres viven en un solo lugar, [`src/lib/moduleLabels.ts`](src/lib/moduleLabels.ts): de ahí los toman la cabecera, el Inicio, el encabezado de cada módulo, la presentación de ZOE y su voz. Para renombrar un módulo basta con cambiarlo ahí y en el documento maestro de ZOE; el identificador interno (`estudio`, `ideacion`…) no cambia.

En la cabecera, un círculo dice si la IA está conectada: verde si responde, rojo si no ([`AiStatusDot.tsx`](src/components/layout/AiStatusDot.tsx), estado en [`src/store/aiStatus.ts`](src/store/aiStatus.ts)). Se comprueba con una llamada mínima al abrir, al cambiar de proveedor o modelo, al recuperar la red y tras 10 minutos sin noticias; entre medio lo actualizan las llamadas reales, y un fallo real se confirma con una prueba antes de ponerlo en rojo. El panel «IA» usa el mismo estado.

Cada herramienta funciona sola. Encadenarlas es opcional: cada una entrega su resultado a la siguiente con un botón.

## ZOE

ZOE es el schnauzer holográfico que vive en la interfaz; la referencia es `zoe_personality_character_bible_editable_v2.pptx` y la hoja de posturas del personaje. Se comunica **solo por voz** y **subtítulos**. El uso está explicado en el [manual de usuario](docs/manual-usuario.md).

- **Conocimiento y personalidad:** [`src/content/zoe/documento-maestro.md`](src/content/zoe/documento-maestro.md) reúne identidad, cómo acompaña (cálido, jocoso, empático y sin presión: pregunta «¿Todo listo para continuar?» antes de avanzar), apoyo moral y contención emocional con su ruta de ayuda verificada (Línea 106 de MinSalud, 123 y Bienestar de la UNAD), recorrido guiado y rutas, órdenes y movimientos, qué hace sin conexión, el banco de preguntas frecuentes, frases de motivación, cariño y agradecimiento, chistes y muletillas. La IA lo recibe completo en cada turno (`src/services/zoeAi.ts`): para enseñarle algo a ZOE se edita ese archivo, sin tocar código. Nunca empieza con «mmm»: si piensa dice «¡Woa, woa!» (`cleanZoeReply` quita los titubeos que se le escapen al modelo).
- **Sin conexión (`src/lib/zoeOffline.ts`):** si la IA falla, ZOE no corta la charla: lo dice una vez («la IA se fue a dar un paseíto…») y responde con el mismo documento maestro, que lee como banco de preguntas y respuestas (cada `- **¿…?**` de «Preguntas frecuentes» y cada pantalla), sin tildes ni mayúsculas y pesando más las palabras raras. Además reconoce emociones dichas en primera persona (estrés, cansancio, frustración, tristeza, inseguridad, bloqueo, alegría) y las acompaña, da el siguiente paso según el trabajo guardado, las rutas, chistes y frases. Durante un minuto tras el fallo contesta de memoria sin hacer esperar; luego vuelve a intentar con la IA. Las señales de riesgo para la vida se atienden siempre aquí, con o sin IA, con un mensaje revisado (`crisisReply`). `tests/zoeOffline.test.ts` cubre el banco, las emociones y los falsos positivos («estrés hídrico», «prevención del suicidio»).
- **Conversación:** tocarlo saluda y abre el micrófono (el permiso se pide en ese toque). Responde completo: si se le toca mientras habla, termina la idea y luego escucha. Si la frase de la persona queda cortada («quiero hacer un prototipo para…»), pregunta si ya terminó; «espera» le da tiempo (`seemsUnfinished`, `isDoneReply` y `wantsMoreTime` en `src/lib/zoeContext.ts`). Las frases largas se parten para que el navegador no las corte. Cada fallo del micrófono tiene su explicación: permiso, micrófono ausente o mudo, falta de HTTPS o de red.
- **Órdenes directas:** «llévame al árbol», «pon el modo oscuro», «siéntate», «levántate», «camina» y «a dormir» se cumplen sin consultar a la IA.
- **Banco unadista (`src/lib/zoeKnowledge.ts`):** ZOE conoce el metalenguaje unadista, el MHUS 5.0 y el Contenedor 2. `scripts/zoe/construir-banco-unadista.mjs` arma `src/content/zoe/banco-unadista.json` desde `public/REPOSITORIO_CIP_DF`, el mismo repositorio que usa la app. Lo hace solo en `predev` y `prebuild`, y también con `npm run zoe:banco`. El banco reúne el diccionario completo del Anexo C y el glosario operativo (279 términos), la Parte I del Contenedor 1 y todo el Contenedor 2, en 133 pasajes. En cada turno se eligen solo los términos y pasajes que vienen al caso: los que la persona nombra, los que describen lo que dice y todo el MHUS si pregunta por el modelo. Van a la IA marcados como consulta, nunca como instrucciones, porque el Contenedor 2 está escrito como prompts. El JSON se descarga aparte, en carga diferida. Sin IA, `glossaryAnswer` responde «¿qué es…?» con el diccionario. Las respuestas habladas sobre el MHUS 5.0 y los contenedores están en el documento maestro.
- **Sus manos (`src/lib/zoeScreen.ts`):** mientras conversan, ZOE maneja la interfaz por la persona. En cada turno la IA recibe la lista de campos y botones visibles (un id, su etiqueta y su valor; nunca claves ni archivos) y responde un JSON con lo que dice y lo que hace: ir a otra pantalla, escribir, elegir en una lista, marcar o presionar. Las acciones se ejecutan mientras habla, con el control iluminado, usando el setter nativo y el evento que escucha React. Si la tarea sigue en otra pantalla, vuelve a mirar y continúa (hasta tres vueltas). Lo que limpia, borra o elimina espera un «sí» de viva voz (`isRisky`, `isConfirmation`). Antes de actuar, ZOE camina hasta el control, lo mira y le da un toque con el hocico (`approach` en `ZoeFreePresence.tsx`, truco `boop`); la acción nunca espera más de 2,5 s a que llegue. La IA también puede pedir movimientos con `{"hacer": "animar", "movimiento": "sacudirse"}` (`AI_MOVES`).
- **Órdenes y movimientos:** «siéntate», «párate», «échate», «da un paseo», «ven», «muévete», «sacúdete», «da vueltas», «salta», «mueve la cola», «haz una reverencia», «quieto», «a dormir» y «vete a tu casa» se cumplen sin IA, también dichas con cortesía («¿puedes sacudirte?», «quiero que te sientes»; `MOVE_ORDERS` en `zoeContext.ts`). Sacudirse, mover la cola y la reverencia usan los clips `Shake`, `Tail_Wag` y `play_bow`; dar vueltas (trote en el sitio mientras gira dos vueltas), saltar y el «boop» los pone la capa procedimental de `ZoeCanvas3D` (prop `trick`).
- **Recorrido guiado (`src/lib/zoeTour.ts`):** con «muéstrame el laboratorio», la brújula de sus controles o el botón del Inicio, ZOE recorre las siete pantallas y en cada herramienta hace un ejercicio completo con la IA: limpia si hay trabajo (lo terminado ya está en el Banco Unificado de Innovación), llena los datos, genera, narra el proceso con gestos mientras espera (leyendo el avance real de la barra) y explica el resultado que quedó en el estado, con sus ventajas. Es un solo caso encadenado (Sogamoso, Boyacá → estudio → ideación con el estudio → árbol del tema elegido → prototipo de un fruto → Banco Unificado de Innovación). Cada parada es un guion sobre un `TourContext` (decir, señalar, escribir, presionar, generar, leer el resultado), probado con un contexto falso; nunca presiona «Regenerar», «Eliminar» ni «Detener». Entre herramientas pregunta si seguir. Se maneja con la voz («sigamos», «repite», «atrás», «espera», «terminar») o con los botones del globo, también sin micrófono. Al final cuenta las cuatro rutas y lleva a la herramienta elegida. En desarrollo, `window.__zoeDecir('sacúdete')` prueba lo que se le dice sin micrófono.
- **Vida propia:** pasea, cambia de postura y, de vez en cuando, busca el rincón de la pantalla con menos botones, da unas vueltas, se echa y duerme un rato (`ZoeFreePresence.tsx`).
- **Casita (`ZoeDoghouse.tsx`):** con el botón de la casita o la orden de voz, dicha como se diga («vete a tu casa», «ya puedes irte a tu casita», «regresa a la casa», «a tu casita, Zoe», «escóndete»; `HOME_ORDER` en `zoeContext.ts`, probado en `tests/casita.test.ts`), ZOE camina (o trota, si está lejos, con el clip `Trot` del modelo) hasta la casita de la esquina inferior derecha y entra; el interruptor de ZOE del menú la guarda sin la caminata. Queda solo la casita, con los ojos de ZOE en la puerta; el 3D se desmonta, así que no gasta GPU. Al tocarla, ZOE aparece en la puerta cuando el modelo terminó de cargar y vuelve a su sitio.
- **Modelo 3D:** `public/assets/zoe/zoe.glb` es el modelo rigueado en Meshy (esqueleto de cuadrúpedo de 49 huesos, con mentón para la boca) más sus animaciones Shake, Trot y Tail_Wag. Se prepara en dos pasos con Blender 4.5:
  1. [`scripts/zoe/preparar_meshy_rig.py`](scripts/zoe/preparar_meshy_rig.py) une las costuras de la textura (sin ellas la piel se abre al moverse) y reduce de 3,2 millones a 80 000 triángulos. También corrige los pesos de Meshy: la nariz y el hocico estaban pesados al cuello y se rasgaban al girar la cabeza, y las orejas y el mentón arrastraban parte de la cara. Deja las texturas en 2048 px.
  2. [`scripts/zoe/animar_zoe.py`](scripts/zoe/animar_zoe.py) conserva los clips de Meshy y crea los que faltan con cinemática inversa sobre el mismo esqueleto: `idle`, `alert`, `walk`, `sit_down`, `sit_idle`, `lie_down`, `lie_idle`, `sleep` y `play_bow`. Las patas se apoyan en el piso también durante las transiciones. Al sentarse, el pecho devuelve el 60 % del giro de la cadera (`SIT["chest"]`): la curva se hace en la zona lumbar y el cuello casi no se dobla; con menos, la piel entre el collar y la placa del arnés se rasgaba.
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
- **Voz (`zoePiperVoice.ts`):** ZOE habla con Piper, voz «es_MX-claude-high» (licencia Apache 2.0), en el navegador con ONNX y en su variante «tierna», llevada un 50 % más allá: cuatro semitonos y medio más aguda y al mismo ritmo, con más cuerpo en los graves para que siga masculina (`muestras-voz-zoe/zoe-tierna-masculina-fluida.wav`, fuera del repositorio). El modelo (63 MB) se baja de Hugging Face una sola vez, cuando el navegador está desocupado, y queda en el almacenamiento del navegador (OPFS). Una frase tarda menos de un segundo en generarse y la siguiente se prepara mientras suena la anterior. Mientras se descarga, o con ahorro de datos, conexión lenta o si algo falla, habla la voz del sistema. De `@mintplex-labs/piper-tts-web` solo se usa el fonetizador (alias `piper-phonemize` en `vite.config.ts`): su sesión recrea espeak en cada frase y tarda 2 s más por frase. Para cambiar el tono o el ritmo se ajustan `TENDER_RATE`, `PACE` y la marca `TUNING`. Para que suene natural: se dicen oraciones completas (`speechSentences`, que no parte en «p. ej.», «Sr.», iniciales ni decimales); la primera, si es larga, hasta su primera coma, para empezar antes (`withQuickStart`); entre partes hay un respiro según la puntuación (`pauseAfter`: ~280 ms tras un punto, ~330 ms tras «?» o «!», ~450 ms tras «…»), y entre oraciones de una misma parte, 0,2 s; el ritmo entre sílabas es parejo (`noise_w` 0,8); cada frase se recorta en sus bordes, se iguala de volumen y se suaviza contra los clics (`shapeSentence`); `speechText` expande las abreviaturas que espeak toma como fin de oración y convierte los puntos suspensivos en pausas, y las siglas (ZOE, IA, UNAD, TRL) se dejan igual, porque espeak ya las lee bien. La salida suma +2 dB de graves (bajo 220 Hz), baja 4,5 dB los agudos (sobre 4,5 kHz), que el cambio de tono vuelve estridentes, y pasa por un compresor suave. `tests/voz.test.ts` cubre estas reglas.
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
- **Scroll fluido.** Los paneles de los módulos (`.lab-panel`) no usan `backdrop-filter`: con una veintena por pantalla, el navegador recalculaba cada desenfoque en cada cuadro del desplazamiento. Los halos y la malla del fondo van fijos a la ventana (`App.tsx`), ZOE deja de dibujar mientras la página se desplaza y el Banco Unificado de Innovación no anida zonas con scroll propio. Antes de volver a poner vidrio desenfocado en algo que se repite, mídelo.
- **Créditos siempre visibles.** La firma de los desarrolladores y los logos de la UNAD y la VIEM flotan abajo a la derecha, sin recuadro (`.lab-credits`), a la izquierda de la casita de ZOE: su esquina (`--zoe-house-room`) queda libre aunque ZOE esté afuera. En el piso, ZOE tampoco se para encima de la firma (`clampPosition`): se queda a su lado o, en celulares, un poco más arriba.


## Banco Unificado de Innovación

El **Banco Unificado de Innovación** es un módulo transversal e independiente que centraliza, clasifica y resguarda los ejercicios de innovación generados en el laboratorio:

- **Estructura por Líneas:**
  - **Línea 1 · Diagnósticos Territoriales:** Almacenamiento íntegro de estudios territoriales bajo metodología MDVT (12 puntos, matriz FODA, pilares y brechas).
  - **Línea 2 · Propuestas de Ideación:** Registro de vocaciones productivas identificadas y ternas de retos estratégicos.
  - **Línea 3 · Árboles de Innovación:** Memoria de árboles holográficos 10-5-3 con sus ramas globales, dinámicas nacionales y frutos de aplicación.
  - **Línea 4 · Planes de Prototipado:** Repositorio de planes técnicos con niveles TRL, fases de desarrollo, métricas de validación y gestión de riesgos.
- **Trazabilidad y Autonomía:** Funciona como un entorno desacoplado que no satura las pantallas de trabajo independiente, permitiendo limpiar las herramientas de diseño sin riesgo de pérdida de información.

### Métricas y satisfacción

La pestaña **Métricas y satisfacción** del Contenedor de resultados (`src/components/tools/MetricasDashboard.tsx`) es un tablero interactivo que se calcula en el navegador con lo que ya está guardado, sin IA y sin conexión (`computeMetrics` en `src/lib/contenedorMetrics.ts`):

- **Filtros** en una fila: período (todo, 30 días, 90 días, 12 meses) y línea del método. Tocar una barra de «Resultados por línea» filtra por esa línea y resalta su barra.
- **Cifras principales:** resultados guardados, territorios estudiados (departamentos y zonas), utilidad percibida, NPS y documentos entregados.
- **Gráficos:** resultados por línea, actividad por semana o mes, calidad de los bloques del estudio y de las partes de la ideación, evidencia de los árboles (N1, N2, N3), frutos por tipo, planes por madurez TRL, cobertura por departamento, NPS (detractores, pasivos, promotores) y utilidad por línea. Cada gráfico tiene descripción emergente con el puntero o el teclado y «Ver los datos» con la tabla.
- **Conclusiones** (`buildConclusions`): reglas fijas sobre esas cifras, no texto de la IA. Señalan dónde se detiene el trabajo en el método, qué falta decidir (tema elegido, frutos del árbol), qué revisar (bloques con aviso, hipótesis N3), los planes armados sin IA y cómo va la satisfacción.
- Colores validados con el validador de paletas en tema oscuro y claro (variables `.viz` de `src/index.css`): un tono para magnitudes, rampa ordinal para la evidencia, rojo, gris y azul verdoso para el NPS y colores de estado, siempre con ícono y rótulo, para la calidad.

### Encuesta de satisfacción antes de descargar

Antes de entregar un documento en Word o PDF (`ReportActions` en `src/components/lab/common.tsx`), la persona responde tres preguntas obligatorias (`src/lib/satisfaction.ts`, `SatisfactionDialog.tsx`): utilidad del resultado (1 a 5), facilidad para obtenerlo (1 a 5) y recomendación del Laboratorio (0 a 10, para el NPS). «Enviar y descargar» se habilita solo con las tres respuestas; cancelar no descarga nada. Se pregunta una vez por documento: el mismo en el otro formato se entrega directo y, si el documento se rehace, se vuelve a preguntar (`documentKey`). Las respuestas y las descargas se guardan en el navegador (`surveyResponses` y `downloads` en el almacén) y alimentan el tablero. ZOE no ve ni responde la encuesta (`data-zoe-ignore`): la opinión es siempre de la persona. Los certificados de insignias no piden encuesta.

## Laboratorio sin conexión

Sin IA no se detiene el trabajo: lo que está en el Contenedor de resultados sigue disponible.

- **La página abre sin internet** después de la primera visita: `public/sw.js` guarda la aplicación (página, código, estilos, imágenes, el modelo de ZOE y el Repositorio CIP-DF a medida que se usan). La página va red primero; el resto, lo guardado primero y actualizado en segundo plano. Nunca guarda `/api/`, `/includes/` ni `.php`: la IA y la base de datos van siempre en vivo. Solo se registra en la versión publicada (`src/lib/registerOffline.ts`), no en `npm run dev`.
- **Aviso en los talleres** (`OfflineNotice`): cuando el círculo de la IA está rojo o el equipo no tiene red (`useAiOffline` en `src/store/aiStatus.ts`), cada taller explica qué se puede hacer y lleva al Contenedor: abrir un resultado con «Cargar en Taller», elegir el tema de una ideación y llevarlo al Árbol, llevar un fruto a Prototipado, descargar en Word o PDF (se arman en el navegador) y ver las métricas.
- **Plan base sin IA** (`src/lib/offlinePlan.ts`): en Prototipado, «Resultado del Árbol» ofrece los frutos de cualquier árbol guardado en el Contenedor. Sin conexión aparece «Armar plan base sin IA», que arma el plan con los datos reales del fruto y su árbol (problemas de las raíces, solución, impacto, cadena de tendencias y alertas como supuestos) y fases estándar según la madurez TRL. Lo que el Contenedor no dice queda «Por precisar con el equipo»: nunca se inventa. El plan lleva el chip «Plan base sin IA» y, cuando vuelve la conexión, «Completar con IA» lo lleva al formulario para generarlo completo.

## Sistema de Gamificación e Insignias 3D

Para incentivar la experimentación y reconocer las competencias de innovación regional, el laboratorio incorpora un sistema de logros con insignias 3D de alta fidelidad, diseñadas armónicamente con los colores institucionales de cada unidad:

| Insignia | Unidad / Módulo | Color Característico | Competencia Reconocida |
|---|---|:---:|---|
| **Pionero Territorial** | Estudio Territorial | **Verde Esmeralda** (#10B981) | Diagnóstico territorial integral y caracterización regional MDVT |
| **Visionario Estratégico** | Ideación | **Ámbar Dorado** (#F29F05) | Formulación de retos estratégicos y vocación productiva |
| **Arquitecto de Tendencias** | Árbol de Innovación | **Azul Celeste** (#00C8FF) | Prospectiva tecnológica articulando tendencias globales y frutos locales |
| **Ingeniero de Prototipos** | Prototipado TRL | **Fucsia Neón** (#E024A5) | Estructuración técnica, arquitectura de solución y validación TRL |
| **Custodio del Conocimiento** | Banco Unificado | **Púrpura Imperial** (#A78BFA) | Preservación de la memoria y archivo de ejercicios territoriales |
| **Vínculo Cognitivo** | Agente ZOE 3D | **Cian Digital** (#00F5FF) | Co-creación estratégica asistida por inteligencia artificial aumentada |
| **Maestro Innovador 360** | Ciclo Integral 360 | **Oro Imperial 24K** (#FFD700) | Dominio y articulación de los cuatro ejes fundamentales del laboratorio |

Cada insignia cuenta con renderizado tridimensional, efectos de halo y resplandor calibrados a su propio color de unidad, eliminando reflejos excesivos o saturados.

## Certificados y Diplomas Oficiales

Cada insignia desbloqueada permite generar e imprimir un **Certificado Oficial de Competencias en Innovación**:
- **Diagramación Institucional:** Formato horizontal A4 Landscape en estilo de diploma de alta gama.
- **Logos Oficiales:** Integración directa de los activos de marca del repositorio (INNOVAHUB 360, Emblema UNAD Acreditada en Alta Calidad y Logo VIEM Vicerrectoría de Innovación y Emprendimiento) en alta resolución con canal alfa 100 % transparente.
- **Acreditación Dinámica:** Detalla el nombre del beneficiario, identificación, equipo, horas de experiencia certificada (de 18 h a 120 h), descripción de la competencia y código único de registro institucional (IH360-...).
- **Exportación:** Soporte nativo para impresión directa y descarga en PDF desde cualquier navegador.

## Visualización y Despliegue en Línea

- **Repositorio Oficial en GitHub:** [https://github.com/nataliaperez-del/laboratorio-digital-innovacion](https://github.com/nataliaperez-del/laboratorio-digital-innovacion)
- **GitHub Pages:** Automatizado mediante flujo de trabajo en .github/workflows/deploy.yml con empaquetado de rutas relativas (ase: './').
- **Despliegue en Hostinger:** Paquete de producción precompilado en hostinger_deploy/ listo para servidor Apache con PHP (mod_rewrite y pasarela segura en includes/gemini_proxy.php).

## Producción (Hostinger)

Ver [hostinger_deploy/README_HOSTINGER.md](hostinger_deploy/README_HOSTINGER.md). Las credenciales van en `config/ia.php`, que no se sube al repositorio.

## Limitaciones conocidas

- El PDF se genera con el diálogo de impresión del navegador: se elige «Guardar como PDF», como en Fase 1.
- Los resultados se guardan en el navegador de cada persona (`localStorage`); aún no se comparten entre equipos. Lo mismo pasa con las encuestas de satisfacción: el tablero muestra las del navegador, no las de todos los equipos.
- Sin conexión, la página solo abre si ya se visitó con conexión en ese navegador; el Radar del Observatorio y la IA necesitan internet.
- Las plantillas de `public/` se sirven por web, como en Fase 1: son internas para la interfaz, pero alguien con la URL podría leerlas.
- El marco institucional (`CONTENEDOR_1`) sigue mencionando CIP; solo se usa para verificar alineación y las reglas de alcance impiden que pase al resultado.
