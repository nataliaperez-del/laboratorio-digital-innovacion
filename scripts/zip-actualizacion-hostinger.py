"""
Arma el zip de ACTUALIZACIÓN para Hostinger: solo los archivos nuevos o distintos frente al paquete
que ya está en el servidor, más una nota con los archivos antiguos que se pueden borrar.

Uso (después de `npm run deploy:package`):
    python scripts/zip-actualizacion-hostinger.py <zip-que-esta-en-el-servidor> <zip-de-salida>

Antes de dar el zip por bueno lo vuelve a abrir y revisa TODO su contenido, byte a byte y nombre a
nombre: si algo nombra otro servicio de despliegue, borra el zip y termina con error.
"""
import hashlib
import os
import re
import sys
import zipfile

DEPLOY = 'hostinger_deploy'
# Nunca viajan: credenciales del servidor (ya están allá) y documentos internos.
# config/lab.php tampoco: quién administra lo define quien despliega, en el servidor (README_HOSTINGER.md, sección 6).
EXCLUIDOS = {'config/ia.php', 'config/db.php', 'config/lab.php'}
PROHIBIDO = re.compile(rb'vercel', re.IGNORECASE)
CODIGO = re.compile(r'^assets/[^/]+-[\w-]{8}\.(js|mjs|css)$')

sys.stdout.reconfigure(encoding='utf-8')
base_path, out_path = sys.argv[1], sys.argv[2]

with zipfile.ZipFile(base_path) as base:
    anteriores = {i.filename: hashlib.sha1(base.read(i)).hexdigest() for i in base.infolist() if not i.is_dir()}

actuales = {}
for carpeta, _, archivos in os.walk(DEPLOY):
    for nombre in archivos:
        ruta = os.path.join(carpeta, nombre)
        rel = os.path.relpath(ruta, DEPLOY).replace('\\', '/')
        if rel in EXCLUIDOS:
            continue
        actuales[rel] = ruta


def huella(ruta):
    datos = open(ruta, 'rb').read()
    # Los finales de línea de Windows no cuentan como cambio en los archivos de texto.
    if re.search(r'\.(php|md|txt|html|json|js|mjs|css|sql|htaccess)$', ruta) or ruta.endswith('.htaccess'):
        alterna = hashlib.sha1(datos.replace(b'\r\n', b'\n')).hexdigest()
    else:
        alterna = None
    return hashlib.sha1(datos).hexdigest(), alterna


nuevos, cambiados = [], []
for rel, ruta in sorted(actuales.items()):
    exacta, sin_crlf = huella(ruta)
    if rel not in anteriores:
        nuevos.append(rel)
    elif anteriores[rel] not in (exacta, sin_crlf):
        cambiados.append(rel)
# Todo lo que estaba en el servidor y ya no está en el paquete (compilaciones viejas, archivos retirados).
borrar = sorted(rel for rel in anteriores if rel not in actuales and rel not in EXCLUIDOS and not rel.startswith('assets/badges_original_backup'))

nota = f"""ACTUALIZACIÓN DEL LABORATORIO DE INNOVACIÓN EN LÍNEA — HOSTINGER
==============================================================

Este zip trae SOLO lo que cambió frente al paquete anterior ({os.path.basename(base_path)}).

CÓMO INSTALARLA
1. Descomprime el zip y sube su contenido a public_html, encima de lo que hay,
   conservando las carpetas. Acepta reemplazar los archivos que ya existan.
2. No borres ni reemplaces config/ia.php, config/db.php ni config/lab.php del servidor: no vienen en este zip.
3. Borra del servidor los archivos de la lista de abajo (ya no se usan). Incluye includes/api.php,
   que ya no existe y no tenía protección, y README_HOSTINGER.md, que no debe estar publicado.
4. ADMINISTRADORES: los correos de los administradores ya no están en el código público. Quien
   despliega define en el servidor quién es administrador y qué ve cada cuenta: en config/lab.php
   la lista 'administradores' (o la variable de entorno LAB_ADMINISTRADORES). Si el config/lab.php
   del servidor ya la tiene, no hace falta tocarlo. Si queda vacía, nadie ve el tablero global, el
   Contenedor de todos ni el botón «Administrar la IA» del menú.
5. LA IA Y EL RADAR AHORA EXIGEN INGRESO: /api/unad-gemini y /api/observatorio/radar solo responden
   con el pase del ingreso con Google (el mismo del concentrador), y cada cuenta tiene un tope por
   hora (IA 400, eventos 120, resultados 120; constantes LAB_LIMITE_* de includes/lab.php). Por eso la
   base de datos y config/db.php deben estar bien configurados: sin ellos nadie obtiene pase.
6. .htaccess cambia: se quitó la regla de api/data. Si el del servidor tiene ajustes propios,
   compara antes de reemplazarlo.
7. El botón «Administrar la IA» del menú (☰) abre /admin/, el panel que ya existe en el servidor y
   no viene en este zip. Solo lo ve quien el servidor reconoce como administrador.
8. Para el tablero global y el banco de insumos, la base de datos debe existir y sus datos estar
   en config/db.php. Los pasos están en README_HOSTINGER.md (viene en este zip, junto a esta
   nota; son para leer, no se suben), sección 6.
9. Entra al sitio y recarga con Ctrl+F5.

ARCHIVOS NUEVOS ({len(nuevos)})
""" + '\n'.join(f'  + {r}' for r in nuevos) + f"""

ARCHIVOS QUE SE REEMPLAZAN ({len(cambiados)})
""" + '\n'.join(f'  * {r}' for r in cambiados) + f"""

ARCHIVOS ANTIGUOS PARA BORRAR DEL SERVIDOR ({len(borrar)})
""" + '\n'.join(f'  - {r}' for r in borrar) + '\n'

if os.path.exists(out_path):
    os.remove(out_path)
with zipfile.ZipFile(out_path, 'w', zipfile.ZIP_DEFLATED, compresslevel=6) as z:
    for rel in nuevos + cambiados:
        z.write(actuales[rel], rel)
    z.writestr('LEEME-ACTUALIZACION.txt', nota.replace('\n', '\r\n'))
    # La guía de instalación viaja aparte de la carpeta publicada: es para leer, no para subir.
    z.write('docs/README_HOSTINGER.md', 'README_HOSTINGER.md')

# Verificación final sobre el zip ya escrito: contenido de cada archivo y cada nombre.
hallazgos = []
with zipfile.ZipFile(out_path) as z:
    revisados = z.infolist()
    for info in revisados:
        if PROHIBIDO.search(info.filename.encode('utf-8')):
            hallazgos.append(f'nombre: {info.filename}')
        datos = z.read(info)
        # También en UTF-16, por si algún archivo guarda texto así.
        if PROHIBIDO.search(datos) or PROHIBIDO.search(datos.replace(b'\x00', b'')):
            hallazgos.append(f'contenido: {info.filename}')
    total = sum(i.file_size for i in revisados)

if hallazgos:
    os.remove(out_path)
    print('✗ El zip NO se generó. Nombra otro servicio de despliegue en:')
    print('\n'.join(f'  {h}' for h in hallazgos))
    sys.exit(1)

print(f'✓ {out_path}')
print(f'  {len(nuevos)} nuevos, {len(cambiados)} que se reemplazan, {len(borrar)} para borrar en el servidor.')
print(f'  {len(revisados)} archivos en el zip, {total / 1e6:.1f} MB sin comprimir, {os.path.getsize(out_path) / 1e6:.1f} MB el zip.')
print(f'  Verificación: {len(revisados)} archivos revisados por contenido y por nombre; ninguna mención prohibida.')
