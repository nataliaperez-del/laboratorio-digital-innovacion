# Inventario de la segunda actualización de Hostinger

Compara lo que ya está en el servidor con lo que saldría hoy, 14 de noviembre de 2026. Sirve para armar
el zip de actualización con **todo** lo hecho después del primer zip del 13 de noviembre.

**Base de la comparación:** el paquete enviado el 13 de noviembre (`laboratorio-innovacion-hostinger-2026-11-13-actualizacion.zip`,
primer zip del día, 18:38), que en el repositorio es la etiqueta `hostinger-enviado-2026-11-13` (commit `cb309ad`). Su archivo
principal es `assets/index-DmS8EjEu.js`. El zip «con corrección de voz» de las 20:01 **no se envió**, así que no cuenta como base:
todo lo que traía queda incluido aquí.

**Paquete de hoy:** reconstruido el 14 de noviembre a las 20:05 con `npm run deploy:package` (compilación sin errores).

## Resumen

| | Archivos | Tamaño |
|---|---|---|
| Archivos nuevos (subir) | 10 | 3,2 MB |
| Archivos que cambian (reemplazar) | 11 | 25,3 MB (casi todo es el video) |
| Archivos que se borran del servidor | 11 | 2,8 MB |
| Archivos que no cambian | 164 | no viajan |
| **Zip de actualización (nuevos + cambiados)** | **21 + instructivo y guía** | **≈ 27 MB** |

No cambia ningún archivo PHP, ni `.htaccess`, ni `sw.js`, ni la voz de ZOE, ni las grabaciones: todo lo nuevo es la aplicación
compilada (JavaScript y estilos) y el video de presentación. Por eso **no hace falta tocar la base de datos ni las credenciales**.

## 1. Qué cambia para las personas (lo que trae esta actualización)

| N.º | Cambio | Qué se nota |
|---|---|---|
| 1 | Voz de ZOE sin solapamiento | Las frases ya no se pisan; una grabación que falla no suena doble |
| 2 | Cierres de ZOE variados | «¿Todo listo para continuar?» se alterna con otros nueve cierres |
| 3 | Micrófono más selectivo y modo «Multitud» | Mejor con ruido y con salas llenas: hay que nombrar a ZOE |
| 4 | Clave personal de AI Studio como respaldo | Si la IA de la UNAD falla, las herramientas pasan solas a la clave de la persona; el panel «IA» la valida |
| 5 | Corrección del modelo de Google | Si Google retira un modelo, la app busca otro que la clave pueda usar; acepta claves que empiezan por «AQ.» |
| 6 | Módulo de ZOE | Barra con micrófono, audio, chat, carita, recorrido y casita; la carita abre el video grande; la casita es proporcional a ZOE y avisa «clic aquí» cuando ZOE duerme; el chat es transparente y ZOE se sienta arriba |
| 7 | Inicio sin el video del banner | El banner ya no alterna; el video se ve con la carita de ZOE |
| 8 | Modo «Taller de innovación» | Se activa diciendo «Taller de innovación»: ZOE guía las cuatro fases, pide discutir y validar, avisa el tiempo |
| 9 | ZOE sabe del Encuentro de Líderes y del modelo | Conoce el evento, los trece H del modelo, su lugar como H-Medios y Co-Mediador, y dónde aparecen los líderes |
| 10 | Chistes con permiso y con tacto | Seis chistes nuevos; los ofrece preguntando y vuelve al trabajo con tacto |
| 11 | Corregir, copiar y borrar los resultados | Estudio, Ideación, Árbol y Prototipado: corregir, copiar o borrar lo que sale antes de pasar a la siguiente herramienta |
| 12 | **Video de presentación de ZOE nuevo (confirmado como definitivo)** | 21 s en 1920×1080 (el anterior: 18 s en 1280×720). Se ve con la carita de perro del módulo de ZOE |
| 13 | **Banco inicial de 24 estudios territoriales, revisado y mejorado** | 24 estudios (3 centros por cada una de las 8 zonas) que se cargan sin esperar a la IA. Revisados: cifras marcadas como aproximadas con dónde validarlas, alertas propias de cada municipio, contraste participativo como preguntas para el taller, fuentes con enlaces reales, zonas escritas como las del formulario. No dan insignias ni cuentan en las métricas ni se envían al concentrador como trabajo de la persona |
| 14 | Carita de perro en la barra de ZOE | El ícono de la presentación de ZOE ahora es una carita de perro |
| 15 | Casita y firma | La casita mide 70 px, igual que el emblema de la UNAD; la firma («Desarrollado por», UNAD y VIEM) queda pegada a su izquierda, con nombres más pequeños y con opacidad. El aviso del sueño es un círculo «?» al lado derecho del techo |
| 16 | Ficha del estudio territorial | Bajo «Capital o nodo de enlace» y «Ubicación específica» aparece «Opcional: si no la conoces, déjala en blanco.» |
| 17 | ZOE conoce la guía de facilitación del taller | El Word de la guía está en el repositorio (`docs/taller/`) y ZOE lo consulta, con y sin IA, para acompañar al equipo (tiempos, roles, plan B). Si se edita el Word, se actualiza en la siguiente compilación |
| 18 | Cortesía de ZOE y taller en positivo | ZOE agradece las gracias, los halagos y el «por favor»; la validación del taller se celebra sin dudar del grupo |

Los cambios 1 a 11 están en el registro de «Pendiente» de `actualizaciones-hostinger.md` (allí la fila 4, el banner que alternaba cada 22 s, queda reemplazada por el cambio 7). Los 12 y 13 se encontraron al revisar y se anotan ahora.

## 2. Archivos para subir

### Nuevos (9)

Reemplazan a los nueve de la sección 3. Los nombres llevan un código que cambia en cada compilación.

| Archivo | Tamaño | Contenido |
|---|---|---|
| `assets/index-Dq9Slgxv.js` | 1,63 MB | La aplicación (principal) |
| `assets/index-CqgKnNaP.js` | 0,02 MB | Carga diferida |
| `assets/index-DjBVdIZy.css` | 0,09 MB | Estilos |
| `assets/ZoeCanvas3D-BHEcPmrw.js` | 0,59 MB | ZOE en 3D |
| `assets/ZoeIntro-CdlSQKO7.js` | menos de 0,01 MB | Presentación de ZOE |
| `assets/ZoeVisor-DdfayHum.js` | menos de 0,01 MB | Visor de ZOE |
| `assets/docxExport-DD8vEpzt.js` | 0,20 MB | Informes en Word |
| `assets/extractDocumentText-DDxExsp3.js` | 0,73 MB | Lectura de documentos |
| `assets/printExport-Bi76BRXm.js` | menos de 0,01 MB | Informes en PDF |

### Que cambian (7)

| Archivo | Tamaño | Qué cambia |
|---|---|---|
| `assets/zoe/zoe_presentation.mp4` | 24,5 MB | Video de presentación nuevo (cambio 12) |
| `index.html` | menos de 0,01 MB | Apunta a los archivos nuevos de `assets/` |
| `assets/unad_emblema_dark.png` y `assets/unad_emblema_light.png` | 0,16 y 0,18 MB | Emblema de la UNAD recortado y optimizado (antes 0,7 y 0,8 MB) para que se lea bien en la firma |
| `assets/viem_logo_dark.png` y `assets/viem_logo_light.png` | 0,02 y 0,04 MB | Logo de VIEM recortado y afinado |
| `REPOSITORIO_CIP_DF/manifest.json` | menos de 0,01 MB | Solo cambia la fecha de generación |

## 3. Archivos antiguos que se pueden borrar del servidor (9)

Quedan sin usar; borrarlos es opcional, pero libera espacio y evita confusión.

`assets/index-DmS8EjEu.js`, `assets/index-9LzblHeF.js`, `assets/index-Cm934uP4.css`, `assets/ZoeCanvas3D-CWxBBYsQ.js`,
`assets/ZoeIntro-tbZ3Kj_b.js`, `assets/ZoeVisor-Dm_A90fX.js`, `assets/docxExport-BjQ6uJYr.js`,
`assets/extractDocumentText-Dyrc9fbi.js`, `assets/printExport-Dn0Ww-9b.js`.

## 4. Revisiones hechas

- Los archivos del zip se revisaron por dentro y por nombre: **ninguno menciona Vercel**. El script del zip lo vuelve a comprobar al armarlo y borra el zip si encuentra algo.
- El zip no lleva `config/db.php` ni `config/ia.php` (ya están en el servidor).
- Pruebas de código: 276 pasan; el chequeo de tipos no da errores; las pruebas automáticas en navegador del módulo de ZOE y de corregir resultados pasan.

## 5. Decisiones tomadas

1. **Video de presentación:** definitivo (confirmado).
2. **Banco inicial de 24 estudios:** entra, después de revisarlo y mejorarlo.
3. **`config/lab.php`:** excluido (ya está en el servidor y no cambió).
4. **Seguridad.** Siguen sin corregirse los tres hallazgos graves de la revisión del 13 de noviembre; esta actualización no los toca.
5. El zip `…-2026-11-13-actualizacion-con-correccion-de-voz.zip` (20:01) queda obsoleto: este lo reemplaza por completo.

## 6. Voces de ZOE: cuáles se usan

Solo estas tres voces suenan en el Laboratorio, en este orden de preferencia:

1. **Frases grabadas** (`assets/zoe/voz/`, 53 archivos `.mp3` más `frases.json`): lo que ZOE dice siempre igual (saludo, recorrido, introducción, avisos del micrófono). Las 53 se usan, ninguna sobra.
2. **Voz propia «Raven» v4** (`assets/zoe/voz-propia/zoe-raven-v4.onnx` y su `.json`, 32 MB): todo lo demás que ZOE dice, generado en el navegador.
3. **Voz del sistema:** solo de respaldo, mientras la voz propia se descarga o si algo falla.

Sin cambios en el servidor: estas voces ya están allá desde el 13 de noviembre y no entran en el zip.

**Borrado el 14 de noviembre** (carpeta local `muestras-voz-zoe/`, que no va a Hostinger ni a git): las pruebas de voces anteriores (`prueba-voz/`, 245 MB), las muestras de comparación, y los modelos `prueba3` y `prueba3-fp16`, además de `prueba4-fp16` (idéntico a la voz de ZOE ya publicada). Liberó unos 370 MB.

**Se conserva** (no se puede rehacer): `prueba4.onnx` (fuente de la voz de ZOE), el corpus de entrenamiento (`dataset-raven`, `dataset-raven-completo` y su zip, `raven-extra`), el cuaderno `entrenar_voz_zoe.ipynb` y la referencia `referencia-elevenlabs-raven.mp3`.

## 7. Seguridad de esta ronda (cambios para quien despliega)

Corrige los tres hallazgos graves de la revisión del 13 de noviembre y varios menores. Quien despliega debe leer `LEEME-ACTUALIZACION.txt` (pasos 3 a 7) y `README_HOSTINGER.md` (viene en el zip, no se sube).

| Hallazgo | Qué se hizo |
|---|---|
| 1. La IA no pedía identificación | `includes/gemini_proxy.php` exige el pase de ingreso (`X-Lab-Token`) y limita a 400 solicitudes por cuenta y por hora |
| 2. El ingreso se podía saltar | El rol de administrador ya no sale del navegador: lo informa el servidor en el pase. Si el servidor rechaza el pase, la sesión se cierra y se pide ingresar de nuevo. Sin pase no hay IA |
| 3. Enlaces `javascript:` y `data:` en informes | Solo se publican enlaces `http`, `https` y `mailto` (PDF y Word) |
| 4. `includes/api.php` sin protección | Retirado del paquete, de las reglas del `.htaccess` y se lista para borrar del servidor |
| 5. Sin límite de envíos | Eventos: 120 por hora; resultados: 120 por hora; IA: 400 por hora, por cuenta (constantes `LAB_LIMITE_*` en `includes/lab.php`) |
| 8. Correos de administradores visibles | Ya no están en el código público ni en `config/lab.php` del paquete: lo define quien despliega en el servidor |
| 9. `README_HOSTINGER.md` publicado | Sale de la carpeta publicada (vive en `docs/` y viaja en el zip, fuera de lo que se sube) |
| 12. Copia del Radar con nombre predecible | El nombre ahora lleva una huella propia del sitio. El Radar también exige el pase |

**Sin corregir en esta ronda:** 6 (actualizar `pdfjs-dist`, cambio mayor que necesita probar con documentos reales), 7 (verificar la integridad de lo que se descarga para la voz y el lector de imágenes), 10 (el nombre de la persona lo envía el navegador) y 11 (el pase dura 12 horas y no se revoca).

**Lo que debe hacer quien despliega:**
1. Definir los administradores en el servidor: lista `administradores` de `config/lab.php` o variable `LAB_ADMINISTRADORES`. El `config/lab.php` que ya está allá conserva su lista; el zip no lo toca.
2. Comprobar que la base de datos y `config/db.php` funcionan: sin ellos nadie obtiene pase y la IA queda cerrada.
3. Borrar `includes/api.php` y `README_HOSTINGER.md` del servidor.
4. Revisar el `.htaccess` (solo cambia la regla de `api/data`).
5. Si el panel `/admin/` quiere seguir protegido por el servidor, mantenerlo: el menú ☰ trae un acceso («Administrar la IA») que lo abre, solo para administradores.
