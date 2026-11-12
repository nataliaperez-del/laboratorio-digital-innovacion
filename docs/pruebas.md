# Pruebas del Laboratorio

Qué pruebas existen, cómo se ejecutan y cuáles faltan antes del lanzamiento.

## Resumen

| Prueba | Comando | Usa la IA | Duración | Estado |
|---|---|---|---|---|
| Lógica (201 pruebas) | `npm test` | No | 3 s | Automática |
| Tipos del código | `npm run lint` | No | 10 s | Automática |
| Recorrido de pantallas | `npm run e2e` | No | 20 s | Automática |
| Recorrido completo con IA | `npm run e2e:ia` | Sí | 15 a 40 min | A pedido |
| Carga de páginas | `npm run carga:paginas` | No | 1 min | A pedido |
| Carga de la IA | `npm run carga:ia -- --autorizado` | Sí | Variable | Requiere autorización |

Los resultados de las tres últimas quedan en `resultados-pruebas/`, que no se sube al repositorio.

## Recorrido de pantallas (`npm run e2e`)

Abre cada herramienta en un navegador real y comprueba que carga, que el Radar le aporta
tendencias y que no hay errores en la página. También comprueba que una tendencia se puede usar
como punto de partida. Levanta su propio servidor en el puerto 3100 con el ingreso desactivado,
algo que solo existe en desarrollo local.

La primera vez hay que instalar el navegador de pruebas:

```bash
npx playwright install chromium
```

## Recorrido completo con IA (`npm run e2e:ia`)

Hace lo que haría un grupo en el taller: llena la ficha, genera el Estudio Territorial, lo lleva a
la Ideación, elige un tema, construye el Árbol y arma un plan de Prototipado. Anota cuántos
segundos tarda cada paso. Sirve para dos cosas: confirmar que el camino completo funciona y saber
cuánto dura cada herramienta, que es el dato que define el guion del taller.

Consume la cuota de un usuario en la pasarela de IA. Si un paso muestra un error, la prueba se
detiene y lo reporta con su texto.

## Carga de páginas (`npm run carga:paginas`)

Simula visitas simultáneas al sitio publicado y mide tiempos y fallos por etapa.

```bash
npm run carga:paginas -- --etapas 100,500,2000
```

- Cada visita descarga la página y su código. Con `--pesados` incluye la voz de ZOE (32 MB) y el
  modelo 3D: úsalo con pocas visitas, porque gasta ancho de banda real del plan de Vercel.
- Se detiene sola si una etapa falla más del 20 %.
- Un solo computador no reproduce 7.000 personas reales: comparte una conexión y una dirección IP.
  Sirve para ver la tendencia hasta unos cientos o pocos miles. La cifra completa pide un servicio
  de carga distribuida.

## Carga de la IA (`npm run carga:ia`)

Mide cuántas consultas simultáneas aguanta la pasarela UNAD IA 360. Es la prueba que decide si el
lanzamiento es viable, y la única que no se debe correr sin coordinar: consume cuota real y puede
degradar el servicio para otros.

Antes de ejecutarla, acordar con quien administra la pasarela:

1. La cuota (consultas por minuto y simultáneas).
2. La hora de la prueba y el tope de consultas.
3. A quién avisar si el servicio se degrada.

```bash
npm run carga:ia -- --autorizado --etapas 5,10,20,50
```

## Pruebas que faltan

| Prueba | Por qué importa | Quién la hace |
|---|---|---|
| Carga de la IA | Define cuánta gente puede generar a la vez | Equipo, con autorización de la pasarela |
| Carga de páginas a escala completa | Confirma 7.000 visitas y el ancho de banda | Servicio de carga distribuida |
| Carga del Radar | Es un servicio externo del que dependen cuatro herramientas | Equipo, con el Observatorio |
| Ingreso con Google | Cuentas UNAD reales y cuentas no permitidas | Manual, en producción |
| Voz y micrófono | Android, iPhone, equipos viejos, sala con ruido, con y sin audífonos | Manual, con dispositivos reales |
| Navegadores | Chrome, Edge, Safari, Firefox | Manual |
| Fallos a mitad de una generación | Qué ve la persona si cae la IA, el Radar o la red | Automatizable |
| Accesibilidad | Lector de pantalla, teclado, contraste | Manual y automatizable |
| Seguridad | La función de la IA acepta solicitudes sin sesión; falta límite por usuario | Revisión técnica |
| Piloto con personas | 30 a 50 usuarios con el guion de 40 minutos | Equipo del taller |
