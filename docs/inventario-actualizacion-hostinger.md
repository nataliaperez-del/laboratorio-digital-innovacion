# Inventario para actualizar el portal en Hostinger

Compara el paquete enviado el martes 3 de noviembre de 2026 (16:30) con lo que saldría hoy,
13 de noviembre. Sirve para preparar el zip de actualización.

**Base de la comparación:** la carpeta `hostinger_deploy/` tal como estaba en el repositorio a las
15:59 del 3 de noviembre (commit `dbf0d2d`), que es el último paquete anterior a las 16:30. El zip
enviado no se guarda en el repositorio, así que se asume que salió de esa carpeta.

## Resumen

| | Archivos | Tamaño |
|---|---|---|
| Paquete enviado el 3 de noviembre | 116 | 43,1 MB |
| Paquete de hoy | 176 | 81,8 MB |
| Archivos nuevos | 69 | 41,4 MB |
| Archivos que cambian | 3 | menos de 0,1 MB |
| Archivos que se retiran del servidor | 9 | 2,7 MB |
| Archivos que no cambian | 104 | 40,4 MB |

Las cifras de hoy excluyen la carpeta `assets/badges_original_backup` (14 archivos, 1 MB), que es
una copia de respaldo y no debe subirse.

## 1. Archivos nuevos (subir)

### Código de la aplicación (`assets/`)

Reemplazan a los nueve archivos de la sección 3. Los nombres llevan un código que cambia en cada
compilación: los definitivos serán los de la compilación con la que se arme el zip.

| Archivo | Tamaño | Contenido |
|---|---|---|
| `assets/index-*.js` (principal) | 1,16 MB | La aplicación |
| `assets/index-*.js` (secundario) | 0,02 MB | Carga diferida |
| `assets/index-*.css` | 0,10 MB | Estilos |
| `assets/ZoeCanvas3D-*.js` | 0,60 MB | ZOE en 3D |
| `assets/ZoeIntro-*.js` | 0,01 MB | Presentación de ZOE |
| `assets/ZoeVisor-*.js` | menos de 0,01 MB | Visor de ZOE |
| `assets/banco-unadista-*.js` | 0,17 MB | Conocimiento de ZOE sin conexión (nuevo) |
| `assets/docxExport-*.js` | 0,21 MB | Informes en Word |
| `assets/extractDocumentText-*.js` | 0,77 MB | Lectura de PDF y Word |
| `assets/printExport-*.js` | 0,01 MB | Informes en PDF |

### Voz y sonidos de ZOE (`assets/zoe/`)

| Archivo o carpeta | Archivos | Tamaño | Contenido |
|---|---|---|---|
| `assets/zoe/voz-propia/zoe-raven-v4.onnx` | 1 | 32,26 MB | Modelo de la voz propia de ZOE |
| `assets/zoe/voz-propia/zoe-raven-v4.onnx.json` | 1 | menos de 0,01 MB | Configuración de la voz |
| `assets/zoe/voz/` | 54 | 6 MB | 53 frases grabadas (mp3) y su índice `frases.json` |
| `assets/zoe/ladrido-simple.mp3`, `ladrido-doble.mp3` | 2 | 0,04 MB | Ladridos |

### Raíz del sitio

| Archivo | Contenido |
|---|---|
| `sw.js` | Trabajo sin conexión. Debe quedar en la raíz, junto a `index.html` |

## 2. Archivos que cambian (reemplazar)

| Archivo | Qué cambió |
|---|---|
| `index.html` | Apunta al código nuevo |
| `.htaccess` | Regla para que `sw.js` e `index.html` no se queden en caché |
| `REPOSITORIO_CIP_DF/manifest.json` | Sello del núcleo metodológico |

## 3. Archivos que se retiran del servidor (borrar)

Son el código de la versión anterior. Si se dejan no rompen nada, pero ocupan espacio.

- `assets/index-BrwJJoyU.js`
- `assets/index-D3zEwlV-.js`
- `assets/index-d2yiqFgd.css`
- `assets/ZoeCanvas3D-BS9uizjI.js`
- `assets/ZoeIntro-Bk5n0PfY.js`
- `assets/ZoeVisor-1Nxh4fb0.js`
- `assets/docxExport-DItktKDG.js`
- `assets/extractDocumentText-CoAevu06.js`
- `assets/printExport-CiN18H4m.js`

## 4. Archivos que no cambian (no hace falta volver a subir)

- **Servidor:** `includes/api.php`, `includes/gemini_proxy.php`, `includes/observatorio.php`,
  `config/db.php`, `config/ia.example.php`, `database/schema_laboratorio.sql`.
- **Núcleo metodológico:** el resto de `REPOSITORIO_CIP_DF/` (solo cambió `manifest.json`).
- **Imágenes y marca:** logos, insignias, certificados, el modelo 3D `assets/zoe/zoe.glb` y
  `assets/pdf.worker-B1D2UnXD.mjs`.

## 5. Lo que no debe ir en el zip

| Elemento | Motivo |
|---|---|
| `config/ia.php` | Tiene las credenciales de la IA. El servidor ya tiene el suyo y no debe sobrescribirse ni viajar en un zip |
| `assets/badges_original_backup/` | Copia de respaldo, no se usa |
| Todo lo de Vercel | `middleware.ts`, `api/`, `server/`, `vercel.json`, `.vercel/` y `.env.portal` no forman parte del paquete; el empaquetado no los copia |
| Mención a Vercel en el código | Un mensaje de error de la aplicación nombra a Vercel. Hay que quitarlo antes de compilar el zip |

## 6. Requisitos en Hostinger para lo nuevo

| Novedad | Qué necesita en Hostinger |
|---|---|
| Ingreso con cuenta institucional | El dominio de Hostinger debe estar autorizado en el cliente de Google (orígenes de JavaScript). Sin eso, el botón de ingreso falla |
| Administradores y dominios permitidos | Se fijan al compilar (`VITE_ADMIN_EMAILS`, `VITE_ALLOWED_EMAIL_DOMAINS`, `VITE_GOOGLE_CLIENT_ID`). Hay que confirmar los valores antes de compilar |
| Voz propia de ZOE | El servidor debe permitir servir un archivo de 32 MB. El navegador descarga además dos librerías desde servicios públicos (cdnjs y jsDelivr) |
| Trabajo sin conexión | `sw.js` en la raíz y la regla nueva del `.htaccess` |
| IA y Radar | Sin cambios: siguen usando `includes/gemini_proxy.php` e `includes/observatorio.php` |

## 7. Cambios funcionales desde el 3 de noviembre

Son 46 cambios en el repositorio. Agrupados:

**ZOE**
- Voz propia entrenada (versión 4), 53 frases grabadas y ladridos reales.
- Recorrido guiado con ejercicios completos y órdenes de movimiento.
- Acompañamiento emocional y respuestas sin conexión con el banco unadista.
- Chat flotante, y paso automático al chat cuando hay ruido.
- Respuestas más cortas y rápidas, interrupción sin perder el hilo y compuerta de ruido con
  sensibilidad ajustable.
- Manejo de la ira y los insultos, con el recordatorio de respeto, ética e integridad.
- Ya no muestra campos internos como «(acciones: False)».
- Lenguaje unadista y MHUS 5.0.

**Herramientas**
- Módulos con título de acción y su método como subtítulo.
- Radar conectado al Estudio, la Ideación, el Árbol y el Prototipado, con un bloque de tendencias.
- Bloqueo de ideas y proyectos dañinos (estafas, fraude, robo, armas, riesgo de muerte).
- «Contenedor de resultados de innovación en línea», con métricas y encuesta de satisfacción.

**Acceso y aplicación**
- Ingreso con cuenta institucional de Google y rol de administrador.
- Trabajo sin conexión.
- Círculo de conexión de la IA en la cabecera.

**Diseño**
- Fondo animado, modo claro con mejor contraste y vista de celular.
- Radar en la cabecera, logos UNAD y VIEM por tema, vitrina de insignias.
- Créditos con el nombre corregido de Camilo Esteban Solano.

## 8. Zip de actualización generado el 13 de noviembre

`laboratorio-innovacion-hostinger-2026-11-13-actualizacion.zip` (36,1 MB; 76 archivos): 71 nuevos, 4 que se
reemplazan y la nota `LEEME-ACTUALIZACION.txt` con los 9 archivos antiguos por borrar.

Frente al inventario de arriba se sumaron `includes/lab.php` y `config/lab.php` (concentrador de datos,
tablero global y banco de insumos) y `README_HOSTINGER.md` (sección 6, con la instalación).

Se arma con:

```bash
npm run deploy:package
python scripts/zip-actualizacion-hostinger.py <zip-que-esta-en-el-servidor> <zip-de-salida>
```

Los dos pasos se detienen si el paquete nombra otro servicio de despliegue: el empaquetado revisa los
archivos de texto y el zip se revisa completo, por contenido y por nombre, antes de darse por bueno.
