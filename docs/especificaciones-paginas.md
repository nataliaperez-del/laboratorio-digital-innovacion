# InnovaHub360 — Especificación de desarrollo por página

Cada página existe en dos archivos (`*-oscuro.html` / `*-claro.html`, carpeta `codigo/`), construidos sobre la misma estructura de cabecera y la misma hoja de tema. Los dos modos son el mismo componente con la hoja `tema-oscuro.css` o `tema-claro.css` intercambiada — no son vistas distintas que haya que mantener por separado en el código del producto final (lo normal es implementar un solo set de componentes y resolver el tema con una variable/clase, como ya hace el CSS aquí).

Patrón común a las 4 páginas de contenido simple (Boletines, Eventos, Metodología, Ingresar): cabecera de vidrio con el lockup correcto → migas de pan → título + bajada → contenido → (cuando aplica) franja de hallazgos. Ese patrón es deliberado y debe mantenerse igual en todas.

---

## Radar tecnológico (`#radar`)
**Archivos:** `radar-oscuro.html` / `radar-claro.html`
**Qué es:** vista de matriz impacto × adopción con los registros del observatorio, más panel de detalle de la señal seleccionada.
**Componentes:** barra de filtros con chips removibles y conteo honesto ("12 de 31 señales"), toggle Radar/Lista, matriz SVG interactiva con nodos por color de prioridad (alta/media/baja), panel lateral con ficha de la señal activa (impacto, adopción, horizonte, área, señales relacionadas, fuente, CTA "Ver el análisis completo").
**Interacción:** hover/foco en un nodo lo agranda y revela su halo y etiqueta; clic selecciona y actualiza el panel lateral. Sin JavaScript — todo con CSS (`:hover`, `:focus-within`).
**Datos pendientes:** `[FECHA]`, `[ORIGEN]`, `[FECHA DE PUBLICACIÓN]` son placeholders — conectar a la fuente real de señales, no completar a mano.

## Repositorio de proyectos (`#proyectos`)
**Archivos:** `proyectos-oscuro.html` / `proyectos-claro.html`
**Qué es:** listado filtrable de proyectos de innovación con barra de madurez (1–9) e iniciales de equipo.
**Componentes:** filtros (que hoy no existían en el sitio real — añadidos y marcados para aprobación), tarjetas de proyecto con barra de progreso de madurez, chip de línea de innovación, iniciales de equipo en avatar circular.
**Nota de fidelidad:** la bajada institucional de esta página es la real de producción, no una descriptiva nueva — ya fue revertida tras la auditoría de copy.

## Mapa de actores (`#actores`)
**Archivos:** `actores-oscuro.html` / `actores-claro.html`
**Qué es:** directorio de actores del ecosistema de innovación, con vista de mapa añadida sobre el listado original.
**Componentes:** filtros por tipo de actor, vista de mapa (nueva, pendiente de aprobación) y vista de lista, tarjeta de actor.
**Nota:** las tres entradas de ejemplo son categorías, no actores reales — mantener el aviso honesto de cobertura ("3 publicados de 24 registrados") hasta que el dato esté completo.

## Explorador de futuros / Prospectiva (`#prospectiva`)
**Archivos:** `prospectiva-oscuro.html` / `prospectiva-claro.html`
**Qué es:** matriz impacto/incertidumbre — la plataforma ya la describe como herramienta existente, así que aquí se dibuja tal cual, sin rediseñarla.
**Componentes:** matriz 2×2, fichas de escenario, horizonte temporal.

## Boletines (`#boletines`)
**Archivo:** `boletines-oscuro.html` / `boletines-claro.html`
**Qué es:** listado público de boletines mensuales del observatorio.
**Componentes:** una tarjeta por boletín (hoy solo existe uno en producción: "Mayo 2026 · Boletín piloto InnovaHub360").
**Copy literal:** "Información pública del observatorio. Los registros se administran desde el panel privado con trazabilidad y roles." — no reformular.

## Eventos y webinars (`#eventos`)
**Archivo:** `eventos-oscuro.html` / `eventos-claro.html`
**Qué es:** agenda de eventos y webinars.
**Componentes:** tarjeta de evento con chip de modalidad ("Virtual"), título, descripción, fecha (`2026-06-15`).

## Metodología (`#metodologia`)
**Archivo:** `metodologia-oscuro.html` / `metodologia-claro.html`
**Qué es:** página informativa estática — explica el ciclo operativo del observatorio.
**Componentes:** 4 tarjetas de proceso (Captura → Clasificación → Análisis → Divulgación, cada una con su color de marca) + 4 tarjetas de cadencia (Semanal/Mensual/Semestral/Permanente) con borde de acento lateral.
**Nota:** página sin datos dinámicos — es contenido fijo, la más simple de implementar.

## Ingreso administrativo (`#ingresar`)
**Archivo:** `ingresar-oscuro.html` / `ingresar-claro.html`
**Qué es:** formulario de acceso privado al panel de administración.
**Componentes:** tarjeta centrada con logo, dos campos (correo institucional, contraseña — ambos deben implementarse como `<input>` reales de formulario; en el prototipo son `<div>` de maqueta y hay que sustituirlos por controles accesibles con `<label for>`), botón CTA "Ingresar", enlace "Recuperar contraseña".
**Seguridad:** este formulario envía credenciales — implementarlo con HTTPS, validación de servidor y protección CSRF estándar; nada de esto está resuelto en la maqueta, que es solo la capa visual.

---

## Notas transversales de implementación

1. **Accesibilidad de formularios:** en `ingresar-*.html` los campos están maquetados como `<div>` con texto placeholder simulado — el desarrollador debe convertirlos a `<input type="email">` / `<input type="password">` reales con `<label>` asociado antes de publicar.
2. **Enlaces del pie y del menú:** los 7 destinos del menú (Radar, Proyectos, Actores, Boletines, Eventos, Prospectiva, Metodología) son los únicos enlaces reales verificados contra el sitio en producción. No agregar enlaces a secciones que no existen (ver auditoría: RSS, Transparencia, Licencia de datos, Accesibilidad y Contacto fueron descartados por no existir en el sitio real).
3. **Buscador global (⌘K):** es un componente nuevo propuesto, no existe hoy en el sitio — está maquetado visualmente pero sin lógica de búsqueda; requiere decisión de producto antes de implementarse con función real.
4. **Contrato de datos:** las páginas internas no concilian con los KPI del home (Proyectos dice 24 y muestra 3, Actores 14 y muestra 3, Boletines 6 y muestra 1, Eventos 9 y muestra 1). Esto no es un problema de diseño — es curaduría de contenido pendiente y debe resolverse antes de publicar, independientemente de la implementación visual.
