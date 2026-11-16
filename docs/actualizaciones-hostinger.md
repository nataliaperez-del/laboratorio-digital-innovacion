# Actualizaciones del portal en Hostinger

Registro de lo que ya se envió a Hostinger y de lo que está hecho pero aún no se ha enviado. Los
cambios nuevos se anotan en «Pendiente» y salen todos juntos en el siguiente paquete.

## Enviado

| Fecha | Paquete | Marca en el repositorio | Contenido |
|---|---|---|---|
| 3 nov 2026, 16:30 | `laboratorio-innovacion-hostinger-2026-11-03.zip` | commit `dbf0d2d` | Paquete completo inicial |
| 13 nov 2026 | `laboratorio-innovacion-hostinger-2026-11-13-actualizacion.zip` (primer zip del día, 18:38) | etiqueta `hostinger-enviado-2026-11-13` | Todo lo hecho del 3 al 13 de noviembre: voz propia de ZOE, Radar en las herramientas, ingreso institucional, concentrador de datos, tablero global y banco de insumos. Detalle en `inventario-actualizacion-hostinger.md` |
| 15 nov 2026 | `laboratorio-innovacion-hostinger-2026-11-15-actualizacion.zip` y `laboratorio-innovacion-hostinger-2026-11-15-completo.zip` | commit actual | ZOE definitivo: 40k polígonos (pelaje denso y tupido), cavidad bucal sellada con fondo negro y lengua fija, caminata paso a paso sincronizada sin deslizamiento, banco inicial de 24 estudios, control de IA con respaldo, modo taller, y entregables GLB, FBX y BLEND sincronizados. |

Para confirmar qué versión está en el servidor: el `LEEME-ACTUALIZACION.txt` del zip enviado nombra
el archivo principal `assets/index-DmS8EjEu.js`.

## Pendiente (hecho, sin enviar)

Cada fila está publicada en el repositorio y probada, pero no está en Hostinger.

| N.º | Fecha | Cambio | Qué corrige o añade |
|---|---|---|---|
| 1 | 13 nov 2026 | Voz de ZOE sin solapamiento | La presentación y ZOE en pantalla compartían la voz sin poder callarse; una grabación que fallaba sonaba doble; una frase que empezaba tarde quedaba debajo de la siguiente |
| 2 | 13 nov 2026 | Cierres de ZOE variados | «¿Todo listo para continuar? Estoy aquí contigo» se alterna con otros nueve cierres, y el recorrido guiado pregunta distinto en cada parada |
| 3 | 13 nov 2026 | Micrófono más selectivo y modo multitud | El volumen se mide solo en la banda de la voz y sin ganancia automática; lo entendido cuenta si hubo una voz cercana; botón «Multitud» para salas llenas: hay que nombrar a ZOE, exige más volumen, descarta lo dudoso y no se deja interrumpir por voces vecinas |
| 4 | 13 nov 2026 | Banner del inicio cada 22 s, de ida y vuelta (reemplazado: el video salió del banner, ver fila 7) | Alterna presentación y video cada 22 segundos sin detenerse; si el video termina o falla vuelve solo, y elegir un punto reinicia la cuenta |
| 5 | 14 nov 2026 | Clave personal de AI Studio como respaldo de la IA | Cada persona crea su clave gratis con su correo institucional y la pega en el panel «IA» (solo en su pestaña); se valida con Google y elige el modelo; si la IA de la UNAD falla, las herramientas pasan solas a esa clave. El panel queda por encima de ZOE |
| 6 | 14 nov 2026 | La clave de AI Studio sigue funcionando cuando Google retira un modelo | Si Google responde que el modelo ya no existe, la app busca el mejor modelo que la clave sí puede usar, lo guarda y repite la petición. El panel «IA» confirma la conexión después de validar la clave y muestra el modelo elegido. También acepta las claves nuevas que empiezan por «AQ.». | `src/services/ai.ts`, `src/components/lab/AiSettings.tsx`, `src/lib/studioKey.ts` |
| 7 | 14 nov 2026 | Módulo de ZOE: controles esenciales, carita con video, casita, chat flotante | Quedan, en este orden: micrófono, audio, chat, carita (abre el video de presentación, grande), recorrido y la casita (sigue junto a ZOE). El video sale del banner del Inicio. La casita es proporcional a ZOE y avisa «clic aquí» cuando ZOE duerme (también en la casita). El chat es transparente y ZOE se sienta arriba de él. | `src/components/zoe/*`, `src/components/portal/PortalCatalog.tsx`, `src/index.css` |
| 8 | 14 nov 2026 | Modo «Taller de innovación» y conocimiento del evento | Se activa diciendo «Taller de innovación»: ZOE guía las cuatro fases, pide discutir y validar, avisa el tiempo y celebra con humor. También sabe del Encuentro de Líderes Unadistas (23 al 27 de noviembre de 2026). | `src/lib/zoeTaller.ts`, `src/components/zoe/ZoeFreePresence.tsx`, `src/content/zoe/documento-maestro.md` |
| 9 | 14 nov 2026 | Corregir, copiar y borrar los resultados de cada herramienta | Estudio: corregir, copiar o borrar cada bloque y copiar el estudio. Ideación: panel «Revisar y ajustar» por partes y copiar el tema. Árbol: corregir, copiar o borrar cada nodo y ajustar las partes. Prototipado: corregir el plan y copiarlo. Lo corregido es lo que pasa a la siguiente herramienta y a los informes. | `src/components/lab/ReviewActions.tsx`, `src/lib/reviewEdit.ts`, `src/store/useStore.ts`, `src/components/tools/*` |
| 10 | 14 nov 2026 | ZOE sabe que es un H-Medios y, con IA, un Co-Mediador | ZOE explica su lugar en el modelo heutagógico unadista (H-Medios que, potenciado con IA, es Co-Mediador de los H-Mediadores y de la comunidad), cómo se relaciona con cada uno de los trece H (siete dimensiones y seis ejes) y dónde aparecen los líderes en el modelo. | `src/content/zoe/documento-maestro.md`, `src/services/zoeAi.ts` |
| 11 | 14 nov 2026 | Chistes de ZOE con permiso y con tacto | Seis chistes nuevos. ZOE cuenta un chiste si se lo piden; si no, primero pregunta «¿te cuento un chiste?» y espera el sí, solo cuando se charla y no se trabaja (nunca en lo serio, el taller o el recorrido). Si dicen que no, lo acepta; después del chiste vuelve al trabajo con tacto. Igual con IA y sin IA. | `src/content/zoe/documento-maestro.md`, `src/services/zoeAi.ts`, `src/lib/zoeOffline.ts`, `src/components/zoe/ZoeFreePresence.tsx` |
| 12 | 14 nov 2026 | Nombre de ZOE y por qué es un perro de luz | ZOE explica que su nombre es «vida» («Zoé» en griego) y que se desarrolla en la sigla Zona de Oportunidades Estratégicas: le da vida a las oportunidades para que se conviertan en ideas e innovaciones (significado oficial del nombre en el Laboratorio, por decisión del equipo). Justifica por qué es un perro y no un humano, un humanoide ni un robot, separando lo que respalda la UNAD de las razones de diseño. Con IA y sin IA. | `src/content/zoe/documento-maestro.md`, `src/services/zoeAi.ts`, `tests/zoeKnowledge.test.ts` |
| 12 | 14 nov 2026 | Video de presentación de ZOE nuevo | 21 s, reemplaza al de 18 s (cambió el 13 nov en la noche). Optimizado para web el 15 nov: 1280×720, H.264 con inicio rápido, audio 96 kb/s; pasó de 25 MB a 3,8 MB (el original está guardado fuera del repositorio). Confirmado como definitivo | `public/assets/zoe/zoe_presentation.mp4` |
| 17 | 15 nov 2026 | ZOE más liviana | Menos carga de GPU: la malla de alambre solo se dibuja cuando se ve, densidad de píxeles máx. 1.5 (baja sola si el equipo se ve lento), 20 cuadros/s cuando ZOE está en calma y el paquete ya no lleva 5 archivos sin uso (≈ 28 MB menos). Corrige que la boca no se moviera al hablar solo con subtítulo. Además (16 nov), la boca de ZOE tiene interior: fondo oscuro, dientes arriba y abajo con colmillos y lengua rosada, siempre presentes (no parpadean); la lengua y los dientes de abajo bajan con la mandíbula al hablar. Se colocan midiendo el propio modelo, así que siguen en su sitio si se vuelve a exportar `zoe.glb`. | `src/components/zoe/ZoeCanvas3D.tsx` |
| 16 | 14 nov 2026 | ZOE conoce la guía de facilitación del taller | El Word `docs/taller/Guia de facilitacion - Taller de Innovacion con IA.docx` entra al banco de ZOE (con y sin IA): tiempos, roles, plan B, guiones. Si se edita el Word, la siguiente compilación (o `npm run zoe:banco`) lo vuelve a leer; una prueba avisa si el banco quedó desactualizado. Además: ZOE responde a las gracias, los halagos y el «por favor», y el taller celebra en positivo | `docs/taller/*`, `scripts/zoe/construir-banco-unadista.mjs`, `src/lib/zoeKnowledge.ts` |
| 15 | 14 nov 2026 | Ronda de seguridad | La IA y el Radar exigen el pase de ingreso; topes por hora; el rol de administrador lo decide el servidor y los correos salen del código público; enlaces seguros en informes; se retira `includes/api.php`; el acceso «Administrar la IA» entra al menú ☰. Detalle en `inventario-actualizacion-2-hostinger.md`, sección 7 | `hostinger_deploy/includes/*`, `src/services/labPass.ts`, `src/lib/safeHref.ts` |
| 14 | 14 nov 2026 | Carita de perro en la barra de ZOE | El ícono de la presentación de ZOE es una carita de perro | `src/components/zoe/ZoeFreePresence.tsx` |
| 13 | 14 nov 2026 | Banco inicial de 24 estudios territoriales | 24 estudios hechos (3 centros por cada una de las 8 zonas UNAD) que se cargan sin esperar a la IA. Revisado y mejorado el 14 nov: cifras marcadas como aproximadas, alertas propias por municipio; no cuentan como trabajo de la persona (insignias, métricas, concentrador). Entra en esta actualización | `src/content/banco/estudios-territoriales-iniciales.json`, `src/lib/bancoInicial.ts`, `scripts/banco/` |

**Archivos que implica hoy lo pendiente:** `index.html` y ocho archivos de código en `assets/`
(se suben 9 y se borran 8). El número no crece mucho con más cambios: casi todo cambio de la
aplicación toca esos mismos archivos.

## Cómo se arma el siguiente paquete

Cuando se decida enviar, el paquete sale de comparar lo que hay en el servidor (la última etiqueta
`hostinger-enviado-*`) con el estado actual:

```bash
npm run deploy:package
git diff --name-status hostinger-enviado-2026-11-13 HEAD -- hostinger_deploy
```

Después de enviarlo: mover las filas de «Pendiente» a «Enviado» y crear la etiqueta nueva
`hostinger-enviado-AAAA-MM-DD` en ese commit.
