# Auditoría del Laboratorio · 1 de noviembre de 2026

Qué se encontró al auditar el módulo y cómo quedó.

| # | Hallazgo | Severidad | Resolución |
|---|---|---|---|
| 1 | Credenciales institucionales UNAD escritas en `src/lib/encryptedVault.ts` (también en Fase 1) | Crítica | Retiradas del Laboratorio; viven en `.env.local` y `config/ia.php`. **Fase 1 las sigue exponiendo: deben rotarse** |
| 2 | Los proxies (Vite y PHP) devolvían un prototipo inventado cuando faltaban credenciales, presentado como respuesta de IA | Crítica | Responden 503 con un mensaje claro |
| 3 | La pasarela IA 360 ya no acepta `gemini-2.5-flash`, el modelo fijo del código | Crítica | Lista de modelos actualizada, por defecto `gemini-3.5-flash`. **Fase 1 tiene el mismo modelo fijo** |
| 4 | El Árbol mostraba 40 nodos escritos en el código y descartaba lo generado por la IA | Crítica | Árbol real: la IA redacta el documento y entrega el grafo; estética de Boletines |
| 5 | El Laboratorio no tenía panel de IA: ningún proveedor era configurable | Alta | Panel igual al de Fase 1 |
| 6 | Ideación mostraba tres temas fijos como si fueran resultado | Alta | Eliminados |
| 7 | Prototipado usaba dos planes fijos, inventaba uno si fallaba la red, ignoraba el proveedor y no guardaba nada | Alta | Pasa por el motor común, informa los errores y guarda el banco |
| 8 | Los títulos del navegador de 12 bloques no correspondían a los 12 puntos que redacta la IA | Alta | La navegación sale de la definición real |
| 9 | El panel «Fuentes consultadas en vivo» añadía instituciones por coincidencia de una palabra | Alta | Eliminado; las fuentes salen de la sección del documento |
| 10 | «Validado metodológicamente» se mostraba por pasar una revisión de formato | Media | Ahora dice lo que comprueba: revisión automática |
| 11 | Faltaban fuentes propias, procedencia, revisión por bloque y detener generación frente a Fase 1 | Alta | Incorporados, más carga directa de archivos |
| 12 | PDF y Word cargados se leían como texto plano y llegaban al modelo ilegibles | Alta | `readInputFile` extrae el texto real |
| 13 | Portada de informes con «proyecto de innovación · Centro de Innovación» y figuras de CIP inyectadas | Alta | Portada por herramienta, sin figuras ajenas |
| 14 | `GEMINI_API_KEY` se incrustaba en el paquete del navegador | Alta | Eliminado |
| 15 | El proxy PHP no enviaba `x-api-key`, reenviaba campos ajenos y cortaba a los 45 s | Alta | Corregido; hasta 280 s y lista de modelos |
| 16 | El Radar mostraba señales fijas y prometía 31; el Observatorio publica 24 | Media | Lee el Radar real, con caché de 6 horas |
| 17 | `text-brand-textMuted` y otras utilidades no existían en Tailwind 4 | Media | Definidas |
| 18 | Código muerto: documento fundante, vistas sin uso, modo demostración, sesión | Media | Eliminado |

## Decisiones

- **El Radar es insumo, no herramienta.** El módulo tiene cuatro herramientas; el Radar pertenece al Observatorio y se lee desde él.
- **Suelo y raíz siguen la plantilla institucional:** fuentes y brechas. La estética viene de Boletines, donde significaban actores y riesgos.
- **Las hojas se agregaron al dibujo** de Boletines, porque la plantilla las exige.
- **ZOE no se tocó,** salvo corregir el dato de las 31 señales en su prompt. Queda para la siguiente etapa.
