# Actualizaciones del portal en Hostinger

Registro de lo que ya se envió a Hostinger y de lo que está hecho pero aún no se ha enviado. Los
cambios nuevos se anotan en «Pendiente» y salen todos juntos en el siguiente paquete.

## Enviado

| Fecha | Paquete | Marca en el repositorio | Contenido |
|---|---|---|---|
| 3 nov 2026, 16:30 | `laboratorio-innovacion-hostinger-2026-11-03.zip` | commit `dbf0d2d` | Paquete completo inicial |
| 13 nov 2026 | `laboratorio-innovacion-hostinger-2026-11-13-actualizacion.zip` (primer zip del día, 18:38) | etiqueta `hostinger-enviado-2026-11-13` | Todo lo hecho del 3 al 13 de noviembre: voz propia de ZOE, Radar en las herramientas, ingreso institucional, concentrador de datos, tablero global y banco de insumos. Detalle en `inventario-actualizacion-hostinger.md` |

Para confirmar qué versión está en el servidor: el `LEEME-ACTUALIZACION.txt` del zip enviado nombra
el archivo principal `assets/index-DmS8EjEu.js`.

## Pendiente (hecho, sin enviar)

Cada fila está publicada en el repositorio y probada, pero no está en Hostinger.

| N.º | Fecha | Cambio | Qué corrige o añade |
|---|---|---|---|
| 1 | 13 nov 2026 | Voz de ZOE sin solapamiento | La presentación y ZOE en pantalla compartían la voz sin poder callarse; una grabación que fallaba sonaba doble; una frase que empezaba tarde quedaba debajo de la siguiente |
| 2 | 13 nov 2026 | Cierres de ZOE variados | «¿Todo listo para continuar? Estoy aquí contigo» se alterna con otros nueve cierres, y el recorrido guiado pregunta distinto en cada parada |
| 3 | 13 nov 2026 | Micrófono más selectivo y modo multitud | El volumen se mide solo en la banda de la voz y sin ganancia automática; lo entendido cuenta si hubo una voz cercana; botón «Multitud» para salas llenas: hay que nombrar a ZOE, exige más volumen, descarta lo dudoso y no se deja interrumpir por voces vecinas |
| 4 | 13 nov 2026 | Banner del inicio cada 22 s, de ida y vuelta | Alterna presentación y video cada 22 segundos sin detenerse; si el video termina o falla vuelve solo, y elegir un punto reinicia la cuenta |

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
