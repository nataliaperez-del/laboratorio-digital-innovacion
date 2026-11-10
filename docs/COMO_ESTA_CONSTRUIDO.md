# Cómo está construido el Laboratorio Digital de Innovación

Guía educativa: cada concepto técnico va con su explicación. Pensada para leerse en el celular.

---

## 1. La idea en una frase

Es una **aplicación web de una sola página (SPA)** que corre casi toda en el navegador de cada persona. Solo unas pocas tareas pasan por un servidor pequeño, sobre todo hablar con la IA sin exponer las claves.

> **SPA (Single Page Application):** la página se descarga una vez y JavaScript cambia lo que ves sin recargar. Es como una app instalada, pero dentro del navegador.

---

## 2. Mapa general

```
NAVEGADOR (frontend)
  React + TypeScript
  Estado: Zustand
  ZOE: Three.js + voz Piper
  Guarda todo en localStorage
        |
        | peticiones /api/...
        v
SERVIDOR (backend, pequeño)
  /api/unad-gemini    -> IA de la UNAD
  /api/observatorio/radar -> señales del Observatorio
        |
        v
SERVICIOS EXTERNOS
  Pasarela UNAD IA 360 (Gemini)
  Observatorio InnovaHub360
  Google Drive (opcional)
```

---

## 3. Frontend (lo que ves y usas)

| Tecnología | Qué es | Para qué la usamos |
|---|---|---|
| **React 19** | Biblioteca para construir interfaces con piezas reutilizables llamadas *componentes* | Toda la pantalla: cabecera, herramientas, tablero |
| **TypeScript (modo estricto)** | JavaScript con tipos: el editor avisa errores antes de ejecutar | Menos fallos; el código se documenta solo |
| **Vite 6** | Herramienta de desarrollo y compilación, muy rápida | Servidor local con recarga en vivo y `npm run build` |
| **Tailwind CSS 4** | Estilos con clases pequeñas directamente en el HTML | Diseño consistente sin hojas de estilo enormes |
| **Zustand** | Almacén de **estado** (los datos que la app recuerda) | Progreso, resultados, insignias, estado de la IA |
| **Three.js** | Biblioteca de gráficos 3D en el navegador | Dibuja a ZOE (modelo `zoe.glb`) |

> **Estado:** todo dato que cambia mientras usas la app (qué herramienta abriste, qué escribiste). **Persistir** el estado es guardarlo para que no se pierda al cerrar.

### Persistencia: `localStorage`
Zustand guarda el estado en el navegador bajo la clave `lab-app-state` (versión 4). Consecuencia importante: **los datos viven en el equipo de cada persona**, no en un servidor. Por eso no se comparten entre equipos.

### Modo sin conexión
Un **service worker** (`sw.js`) guarda la página en caché. Si ya visitaste el sitio con internet, vuelve a abrir sin conexión. La IA y el Radar sí necesitan internet.

> **Service worker:** script que el navegador ejecuta aparte de la página y que intercepta peticiones; permite caché y trabajo offline.

---

## 4. Backend (el servidor pequeño)

No hay un servidor grande con base de datos propia para el uso normal. El backend hace dos cosas:

1. **Proxy de IA** (`POST /api/unad-gemini`)
2. **Lector del Radar** (`GET /api/observatorio/radar`)

> **Proxy:** intermediario. El navegador le habla a *nuestro* servidor, y este le habla a la IA con las claves secretas. Así las claves **nunca llegan al navegador**.

### Qué hace el proxy de IA
- Valida la petición (método, JSON, modelo permitido).
- Elige credenciales: las del panel «IA» si la persona las escribió; si no, las del servidor.
- Reenvía a la pasarela de la UNAD (o a Google directo si se configura).
- Sin credenciales responde **503**: el laboratorio **nunca inventa** resultados de IA.
- Rechaza (**403**) peticiones de navegador que vengan de otra web, para que nadie gaste la cuota institucional.

### Una lógica, tres lugares
La lógica vive una sola vez en `server/iaProxy.ts` y se usa en:

| Entorno | Archivo |
|---|---|
| Desarrollo local | `vite-plugin-unad-gemini-proxy.ts` |
| **Vercel** | `api/unad-gemini.ts`, `api/observatorio/radar.ts` |
| **Hostinger** | `includes/gemini_proxy.php`, `observatorio.php` (equivalentes en PHP) |

> **Función serverless:** código que corre solo cuando alguien lo pide, sin mantener un servidor encendido. Vercel las ejecuta por ti.

### El Radar
Lee las señales de tendencias de la página pública del Observatorio, solo lectura, con **caché de 6 horas**. Si falla, sirve la última copia buena.

> **Caché:** copia guardada para no repetir un trabajo costoso.

---

## 5. Cómo interactúan frontend y backend

```
1. Escribes en una herramienta
2. React arma el prompt con tus datos
3. fetch POST /api/unad-gemini
4. El servidor añade las claves secretas
5. La pasarela UNAD (Gemini) responde
6. El servidor devuelve la respuesta
7. React la muestra y la guarda en Zustand
```

- Si el servidor no responde, el cliente **reintenta 3 veces** con espera creciente y luego explica el problema.
- Un **círculo en la cabecera** muestra el estado: verde = IA conectada, rojo = sin conexión.
- Otros proveedores (Claude, OpenAI, Gemini, Ollama) se eligen en el botón «IA» con la clave de cada persona; esa clave vive solo en esa pestaña.

---

## 6. Metodologías (el «por qué» pedagógico y de innovación)

| Metodología | Idea central | Dónde se nota |
|---|---|---|
| **MHUS 5.0** | Modelo Heutagógico Unadista Solidario: el estudiante dirige su propio aprendizaje | Marco de todo el laboratorio y de ZOE |
| **Heutagogía** | Aprendizaje autodeterminado y autorregulado | El usuario decide; la IA acompaña |
| **PAPS** | Marco de pensamiento y acción para proyectos | Ruta de las herramientas |
| **MDVT** | Metodología de vigilancia y tendencias | Lectura de señales del territorio |
| **Godet (prospectiva)** | Anticipar escenarios futuros | Análisis de tendencias |
| **Doble Diamante** | Divergir y converger dos veces: problema y solución | Orden de las cuatro herramientas |
| **Árbol de innovación 10→5→3** | Filtrar 10 ideas a 5 y luego a 3 | Priorización |
| **TRL 3–6** | Nivel de madurez tecnológica | Evaluar qué tan listo está un prototipo |

> **Regla humana:** ninguna salida de IA reemplaza la validación del líder del proceso. La IA propone; la persona decide.

---

## 7. Arquitecturas de contenido

Cómo se organiza el **conocimiento**, no solo el código.

### 7.1 Repositorio sellado (`REPOSITORIO_CIP_DF`)
Carpeta de documentos fuente. El script `sellar-repositorio.mjs` recorre los archivos, deduce metadatos de la ruta (*convención sobre configuración*) y regenera `manifest.json`. Garantiza orden estable, codificación UTF-8 y un tope de tamaño.

### 7.2 Contenedores
Bloques de fuentes que alimentan los documentos:
- **Contenedor 1:** marco institucional, glosario, ODS, tendencias.
- **Contenedor 2:** información de apoyo adicional.

Incluye reglas de control: matriz de fuentes, fichas de extracción y un mínimo de preparación antes de redactar.

### 7.3 Banco unadista de ZOE
`construir-banco-unadista.mjs` convierte esos materiales en un banco de **279 términos y 133 pasajes** (lenguaje UNAD, MHUS 5.0). ZOE lo consulta para responder con vocabulario institucional.

### 7.4 Documento maestro y preguntas frecuentes
`documento-maestro.md` contiene **115 preguntas frecuentes** que ZOE usa para responder aun sin IA.

### 7.5 Flujo de contenido
```
Fuentes (repositorio)
   -> sellado (manifest)
   -> contenedores
   -> prompts de las herramientas
   -> IA (con validación humana)
   -> resultado guardado + insignias
```

---

## 8. ZOE, la mediadora

ZOE es un **schnauzer holográfico** que acompaña, explica y guía.

| Capacidad | Tecnología |
|---|---|
| Cuerpo 3D | Three.js + `zoe.glb` |
| Voz propia | **Piper** (modelo ONNX) ejecutado en el navegador con `onnxruntime-web` |
| Escucha | Web Speech API del navegador |
| Respuestas con IA | `zoeAi.ts` (vía el proxy) |
| Sin IA | `zoeOffline.ts` + banco de preguntas |
| Señalar en pantalla | `zoeScreen.ts` («manos») |
| Recorrido por Sogamoso | `zoeTour.ts` |
| Conocimiento institucional | `zoeKnowledge.ts` |

> **TTS (texto a voz):** convertir texto en audio. **ONNX:** formato abierto para ejecutar modelos de IA en distintos entornos. **WebAssembly:** permite correr código rápido (como el fonetizador espeak-ng) en el navegador.

La voz se descarga **una vez** (unos 77 MB), queda guardada en el navegador y, mientras tanto o si falla, ZOE usa la voz del sistema. Un procesado de tono (TD-PSOLA, `zoeTone.ts`) la hace más grave sin cambiar su timbre.

---

## 9. Gamificación

Insignias y rangos que se desbloquean al avanzar; cada insignia permite generar un certificado imprimible. El trofeo de la cabecera abre la vitrina.

---

## 10. Calidad y pruebas

- **Vitest:** 139 pruebas automáticas (IA, ZOE, métricas, contenido, servidor).
- `npm run lint` revisa tipos con TypeScript.
- **Prettier** mantiene el formato.

> **Prueba automática:** código que verifica que otro código hace lo esperado, cada vez que cambias algo.

---

## 11. Despliegue (cómo llega a internet)

| Destino | Cómo |
|---|---|
| **Vercel** | Compila con `npm run build`; funciones en `api/`; variables secretas en el panel. Cada `push` a `main` publica solo |
| **Hostinger** | Paquete `hostinger_deploy/` con `.htaccess`, PHP y `config/ia.php` (claves, nunca en el repositorio) |
| **GitHub Pages** | Flujo automático en `.github/workflows/deploy.yml` |

**Variables de entorno** (configuración secreta fuera del código): `UNAD_GEMINI_X_API_KEY`, `UNAD_GEMINI_BEARER`, opcionales `UNAD_GEMINI_BASE_URL`, `GEMINI_API_KEY`; y la pública `VITE_GOOGLE_CLIENT_ID`.

> Las variables con prefijo `VITE_` **se incluyen en la página** y son públicas. Las demás quedan solo en el servidor.

Producción: https://laboratorio-digital-innovacion.vercel.app

---

## 12. Seguridad en breve

- Claves de IA solo en el servidor.
- `.env.local` y `config/ia.php` excluidos del repositorio y de Vercel.
- Cabeceras de seguridad (`nosniff`, `SAMEORIGIN`, política de referencia).
- Proxy que rechaza orígenes ajenos.

---

## 13. Limitaciones conocidas

- Los resultados viven en cada navegador; no se comparten entre equipos.
- Sin conexión solo abre si ya se visitó antes.
- Las plantillas de `public/` se sirven por web: son internas, pero alguien con la URL podría leerlas.
- Google Drive requiere autorizar el dominio en el cliente OAuth.

---

## 14. Glosario rápido

**API:** puerta por la que un programa pide algo a otro. **Frontend:** parte visible. **Backend:** parte que corre en servidor. **Componente:** pieza reutilizable de interfaz. **Build:** compilar el código a archivos listos para publicar. **Caché:** copia guardada para ir más rápido. **Proxy:** intermediario que protege las claves. **Serverless:** código que corre bajo demanda. **SPA:** app de una sola página. **Estado:** datos que la app recuerda.
