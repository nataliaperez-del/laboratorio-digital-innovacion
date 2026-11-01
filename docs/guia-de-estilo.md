# InnovaHub360 — Guía de estilo para implementación

Este documento describe, con valores exactos, el sistema visual ya diseñado y aprobado para las 8 páginas de destino del observatorio. No introduce decisiones nuevas: es la lectura literal de lo construido en `codigo/`. El objetivo es que cualquier desarrollador pueda reproducir el sistema sin tener que inferirlo del CSS.

---

## 1. Paleta de color

El sitio tiene **dos temas completos** (oscuro y claro), cada uno con su propia hoja de estilo (`tema-oscuro.css` / `tema-claro.css`). No son un filtro de inversión: cada color fue reasignado por **rol** (texto, borde, realce, marca), verificado contra WCAG 2.1 AA sobre su fondo real.

### 1.1 Fondo y base

| Rol | Oscuro | Claro |
|---|---|---|
| Fondo de página | `#04222B` | `#EDF3F6` |
| Texto principal | `#EAF4F7` / `#FFFFFF` | `#042F3C` |
| Texto secundario (bajada, descripciones) | `#B7CBD3` / `#CFE0E6` | `#2B3A45` |
| Texto terciario / apagado (metadatos, labels) | `#8FB6C4` / `#86A2AD` | `#5B6875` |

### 1.2 Marca — los cuatro colores de InnovaHub360

Estos cuatro colores son fijos: son los que forman el isotipo (`assets/logo-innovahub360.svg`) y nunca cambian de valor, solo de **uso** (mancha/gráfico vs. texto).

| Color | Hex | Uso como gráfico (ambos temas) | Uso como texto — oscuro | Uso como texto — claro |
|---|---|---|---|---|
| Teal | `#2E9CBA` (logo: `#035E73`) | fondos, chips, halos | `#5EC2DD` / `#9FD4E4` | `#035E73` / `#006F8F` |
| Verde oliva | `#A8C63C` (logo: `#7A9706`) | fondos, chips, halos | `#A8C63C` | `#4E7A00` |
| Ámbar | `#F29F05` | CTA primario, acentos, marca | `#F3C26B` / `#FBD89A` | `#8F5E00` |
| Morado | `#6B4FA0` (visible como `#A98FD6`) | chip de línea "Análisis" | `#A98FD6` / `#CBB8EE` | `#4A3480` |

**Regla de uso de marca verificada por contraste:** el verde oliva y el ámbar de marca **fallan** como texto sobre su propio fondo (verde 2,8:1, ámbar 1,8:1 sobre panel oscuro) — por eso nunca se usan como color de letra directamente; siempre pasan por su equivalente de texto (columna derecha de la tabla). El ámbar puro (`#F29F05`) solo se usa como fondo sólido de botón, nunca como texto.

### 1.3 Pares de contraste verificados (WCAG 2.1 AA)

| Par | Oscuro | Claro |
|---|---|---|
| Texto principal sobre fondo | 10,9:1 | 13,1:1 |
| Texto secundario sobre fondo | 7,3:1 | — |
| Texto apagado sobre fondo | 4,8:1 | — |
| Enlace sobre fondo | 6,0:1 | 6,1:1 |
| CTA ámbar (texto oscuro sobre botón) | 8,3:1 | 8,3:1 |
| Placeholder de formulario (Ingresar) | — | 6,01:1 (corregido; el valor original daba 3,83:1 y no pasaba AA) |

Todo texto nuevo que se agregue debe verificarse contra estos mínimos antes de publicarse — no asumir que un color de la paleta "se ve bien" en un contexto nuevo.

---

## 2. Tipografía

Tres familias, cargadas desde Google Fonts (ver `<link>` en cada página):

```
Space Grotesk:wght@500;700   → títulos, cifras grandes, logotipo
Inter:wght@400;500;600       → cuerpo de texto, interfaz, botones
IBM Plex Mono:wght@400       → datos tabulares, metadatos, ordinales
```

| Estilo | Familia | Tamaño | Peso | Uso |
|---|---|---|---|---|
| H1 de página | Space Grotesk | 38px (30–38 según página) | 700 | Título principal de cada destino |
| H2 / título de tarjeta | Space Grotesk | 18–26px | 600–700 | Encabezados de sección y tarjeta |
| Cifra grande (ordinal, cifra destacada) | Space Grotesk | 26–52px | 700 | "01", "02"… en Metodología; cifras del radar |
| Cuerpo (`.bd`) | Inter | 13–15px | 400 | Párrafos, descripciones |
| Label / eyebrow (`.l`) | Inter | 10.5–12px | 600, uppercase, letter-spacing .2em | Categorías, rótulos de filtro |
| Monoespaciado (`.m`) | IBM Plex Mono | 10–13px | 400, tabular-nums | Fechas, conteos, ordinales de carrusel |

---

## 3. Materiales (clases compartidas)

Definidos una sola vez por tema en `tema-oscuro.css` / `tema-claro.css`, reutilizados en las 8 páginas sin variación:

- **`.g`** — tarjeta de vidrio principal: gradiente translúcido + `backdrop-filter: blur(14px)` + borde 1px + `border-radius: 20px`. Oscuro: blanco al 10%→3,5%. Claro: blanco al 80%→50%.
- **`.g2`** — variante secundaria, mismo patrón con opacidades menores y `border-radius: 18px`.
- **`.metal`** — botón/CTA de marca: gradiente metálico (oscuro: `#0C5E78→#052E3A`; claro: `#FFFFFF→#CFDDE6→#BCCEDA`), `border-radius: 999px` (píldora).
- **`.halo`** — manchas radiales de fondo animadas (`@keyframes swim`, 46–54s), nunca interactivas (`aria-hidden`).

Todas las animaciones respetan `prefers-reduced-motion: reduce` (desactivan `.track`, `.seg i`, `.halo`, `.sweep`, `.pulsa`).

---

## 4. Logotipo

- Archivo: `assets/logo-innovahub360.svg` — `viewBox="0 0 1145 1113"`.
- Colores **fijos**, no cambian entre tema oscuro y claro: `#035E73` (teal), `#7A9706` (verde oliva), `#F29F05` (ámbar).
- Uso en cabecera: símbolo a 42×41px junto al lockup tipográfico "INNOVA" (`#5EC2DD`/`#035E73` según tema) + "HUB" (`#A8C63C`) + "360" bajo "HUB", con el arco punteado ámbar sobre el conjunto.
- No se recolorea, no se invierte, no se distorsiona la proporción.

---

## 5. Layout

- Lienzo de diseño: **1440px** de ancho (igual en todas las páginas).
- Contenido centrado en un contenedor de **1200px** efectivos (padding lateral `120px` a cada lado).
- Cabecera de navegación fija en estructura (no sticky en el prototipo): logo + buscador (⌘K) + CTA "Ingresar" + menú hamburguesa con panel de enlaces.
- El elemento de menú activo según la página se resalta en `#F3C26B` (ámbar-texto).

---

## 6. Sistema responsive

El diseño se construyó sobre un lienzo fijo de 1440px (así lo exige la herramienta de diseño), pero el **código de implementación** (`codigo/`) ya convierte ese lienzo en una página fluida real: ocupa el 100% del ancho disponible hasta un máximo de 1440px, y reorganiza su contenido en tres franjas de ancho.

| Breakpoint | Rango | Comportamiento |
|---|---|---|
| Escritorio | ≥ 1024px | Diseño tal como está en las láminas: layouts de 2 y 4 columnas, gutters de 120px (58px en Proyectos). |
| Tablet | 561–1023px | Las rejillas de 2 columnas (Radar, Actores, Prospectiva: contenido + panel lateral) pasan a 1 columna apilada. Los gutters se reducen de forma fluida con `clamp()`. |
| Móvil | ≤ 560–480px | Las rejillas de 4 columnas (Metodología) pasan a 2 y luego a 1. Las tarjetas con icono + texto (Boletines, Eventos) apilan el icono arriba. La cabecera (logo + buscador + Ingresar + menú) pasa a dos líneas si no cabe en una — nunca se corta ni se oculta contenido. |

**Reglas base aplicadas en todo el sitio:**
- El contenedor raíz es `width: 100%; max-width: 1440px;` en vez de un ancho fijo — por eso ahora "ocupa el espacio de la página" en cualquier ventana, en vez de quedar flotando con márgenes muertos.
- Los márgenes laterales usan `clamp(20px, 6vw, 120px)` (o `clamp(18px, 5vw, 58px)` en Proyectos): se reducen de forma continua en vez de saltar entre valores fijos.
- Las filas título + acción (p. ej. "Radar tecnológico" + toggle "Radar/Lista") envuelven (`flex-wrap`) en vez de recortarse cuando no caben.
- Ninguna página genera scroll horizontal — verificado en los 8 destinos a 390px de ancho (referencia iPhone SE/12 mini) y 320px (referencia más angosta común).

**Qué falta de pulir (señalado para no dar la impresión de que es 100% final):** la fila `VÍNCULO` dentro de las tarjetas de "Cobertura territorial" en Actores usa una columna `auto` que queda visualmente apretada en móvil — funciona, no desborda, pero convendría revisarla con más tiempo de diseño si se quiere perfeccionar. El resto del sistema responsive fue verificado visualmente en los 3 anchos de referencia (1440 / 900 / 390px) para las 8 páginas.

## 7. Qué NO tocar

Por instrucción explícita: **cero transformaciones de marca.** Esto significa, para quien implemente:

- No cambiar ningún texto, enlace, nombre de sección o dato — son copy literal de producción, ya auditado línea por línea (ver nota de auditoría en el lienzo de diseño).
- No alterar los cuatro colores de marca ni el logotipo.
- Los marcadores `[FECHA]`, `[ORIGEN]`, `[NOMBRE]`, `[N]` que aparecen en el contenido son placeholders deliberados donde el dato real aún no existe — no reemplazarlos por texto inventado; deben conectarse a la fuente de datos real.
- "En vivo · 2025" y "Panel Admin" se conservaron con borde punteado como aviso visual de que son decisiones pendientes de negocio (año vencido / acceso admin público), no de diseño — la decisión de quitarlos o no le corresponde a Nata, no al equipo de desarrollo.
