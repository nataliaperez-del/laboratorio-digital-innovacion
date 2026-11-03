# GUÍA DE DESPLIEGUE EN HOSTINGER — LABORATORIO DIGITAL DE INNOVACIÓN
**InnovaHub360 · Universidad Nacional Abierta y a Distancia (UNAD)**
*Actualizado: 3 de noviembre de 2026*

> **Antes de empezar:** este paquete **no trae** `config/ia.php` (las credenciales de la IA de la UNAD no viajan en el ZIP). Hay que crearlo en el servidor (Paso 4b). Sin ese archivo el sitio funciona, pero la IA responde «La IA no está configurada en el servidor».

---

## 1. Contexto Técnico
El ecosistema **InnovaHub360** (`observatorio.innovahub360.net`) se ejecuta sobre la infraestructura de hosting cloud/compartido de **Hostinger** administrada mediante **hPanel**, con arquitectura de servidor en **PHP 8.1+**, base de datos **MySQL** y servidor web Apache/LiteSpeed con soporte `.htaccess`.

El Laboratorio Digital de Innovación está estructurado y optimizado para desplegarse sin fricción en este entorno, siguiendo estrictamente los lineamientos de entrega:
- **Estructura fija y desacoplada:** `/assets`, `/includes`, `/config`, `/database`.
- **Rutas relativas:** Cero rutas absolutas o hardcodeadas locales.
- **Base de datos limpia:** Script SQL sin `DROP/CREATE DATABASE`, sin `DEFINER` y sin requerir privilegios `SUPER`.
- **Nomenclatura homogénea:** Minúsculas y `snake_case`.
- **Cero mención de términos obsoletos:** Ni CIP, ni INCUNAD, ni Documentos Fundantes.

---

## 2. Estructura del Paquete para Hostinger

```text
raíz del dominio o subdominio (p. ej. la carpeta de laboratorio.innovahub360.net)
│
├── index.html                  # Aplicación compilada (React)
├── .htaccess                   # Seguridad, compresión, rutas /api/… y bloqueo de config/
│
├── assets/                     # JavaScript, CSS, imágenes, insignias y ZOE (modelo 3D zoe.glb y video)
├── REPOSITORIO_CIP_DF/         # Plantillas y marco metodológico internos (los lee la app; no se muestran)
│
├── config/
│   ├── db.php                  # Parámetros PDO MySQL (host, db, user, pass)
│   └── ia.example.php          # Plantilla de credenciales de la IA → copiar como ia.php (Paso 4b)
│
├── includes/                   # Lógica de servidor PHP 8.1+
│   ├── api.php                 # Endpoints REST para persistencia en MySQL
│   ├── gemini_proxy.php        # Proxy de la IA institucional UNAD (ruta /api/unad-gemini)
│   └── observatorio.php        # Radar del Observatorio con caché (ruta /api/observatorio/radar)
│
└── database/
    └── schema_laboratorio.sql  # Dump limpio para importar en phpMyAdmin
```

Al descomprimir el ZIP en la carpeta del sitio, `index.html` y `.htaccess` deben quedar directamente en ella (no dentro de otra subcarpeta). `.htaccess` es un archivo oculto: si el administrador de archivos no lo muestra, activar «Mostrar archivos ocultos».

---

## 3. Checklist de Despliegue Paso a Paso

### Paso 1: Configurar Versión de PHP en hPanel
1. Iniciar sesión en **hPanel** de Hostinger.
2. Navegar a **Avanzado** → **Configuración de PHP**.
3. Confirmar que la versión seleccionada para el dominio/subdominio sea **PHP 8.1 o superior** (ej. PHP 8.2 o 8.3).
4. En la pestaña **Extensiones de PHP**, verificar que estén activas:
   - `pdo_mysql`
   - `openssl`
   - `curl`
   - `mbstring`
   - `json`

### Paso 2: Crear la Base de Datos MySQL en hPanel
1. En hPanel, ir a **Bases de datos** → **Administración de bases de datos**.
2. Crear una nueva base de datos y usuario:
   - Nombre de base de datos: `uXXXXXX_innovahub` (Hostinger antepone automáticamente el prefijo de la cuenta).
   - Nombre de usuario: `uXXXXXX_dbuser`.
   - Contraseña: Asignar una contraseña robusta y guardarla en el gestor de claves.
3. Otorgar todos los permisos del panel al usuario sobre esa base de datos.

### Paso 3: Importar el Esquema en phpMyAdmin
1. Desde hPanel, hacer clic en el botón **phpMyAdmin** junto a la base de datos recién creada.
2. Ir a la pestaña **Importar**.
3. Seleccionar el archivo `database/schema_laboratorio.sql`.
4. Hacer clic en **Importar** (Continuar).
5. Se crearán 7 tablas optimizadas con motor `InnoDB` y cotejamiento `utf8mb4_unicode_ci`:
   - `lab_radar_senales`
   - `lab_estudio_territorial`
   - `lab_ideacion_estrategica`
   - `lab_arbol_nodos`
   - `lab_arbol_relaciones`
   - `lab_prototipos`
   - `lab_sesiones`

### Paso 4: Configurar `config/db.php`
Abrir el archivo `config/db.php` (vía File Manager de hPanel o antes de subir por FTP) y colocar las credenciales reales:

```php
$db_host = 'localhost';
$db_name = 'uXXXXXX_innovahub'; // Tu base real con prefijo
$db_user = 'uXXXXXX_dbuser';    // Tu usuario real con prefijo
$db_pass = 'TuContraseñaSegura';
```

*(Opcional: Si se utilizan variables de entorno de servidor en Hostinger, el script las lee automáticamente mediante `getenv()`)*.

### Paso 4b: Crear `config/ia.php` (credenciales de la IA de la UNAD)
1. En el File Manager, dentro de `config/`, copiar `ia.example.php` con el nombre `ia.php`.
2. Abrir `ia.php` y escribir los valores de `UNAD_GEMINI_X_API_KEY` y `UNAD_GEMINI_BEARER` (los entrega el equipo del Laboratorio por un canal seguro, nunca por correo junto con este ZIP). `UNAD_GEMINI_BASE_URL` ya trae la dirección de la pasarela IA 360.
3. `.htaccess` impide abrir `config/` desde la web, así que el archivo queda protegido.

### Paso 5: Subir los Archivos al Servidor
1. Mediante **File Manager** de hPanel o cliente **SFTP / FileZilla**:
   - Conectarse al host de Hostinger (`ftp.tudominio.com` o IP del servidor).
   - Si se despliega en un subdominio (ej. `laboratorio.innovahub360.net`), subir a la carpeta raíz de ese subdominio.
   - **Debe ir en la raíz de un dominio o subdominio, no en una subcarpeta** (como `public_html/laboratorio/`): la aplicación usa rutas absolutas (`/assets/…`, `/api/unad-gemini`) y el `.htaccess` trabaja con `RewriteBase /`. Para tenerlo «dentro» del observatorio, crear en hPanel el subdominio `laboratorio.innovahub360.net` y subir ahí.
   - Lo más rápido: subir el ZIP con el File Manager y usar «Extraer» en la carpeta de destino.
2. Confirmar que se subieron:
   - `index.html`
   - `.htaccess`
   - `assets/`
   - `REPOSITORIO_CIP_DF/`
   - `config/` (con el `ia.php` del Paso 4b)
   - `includes/`
   - `database/` (solo hace falta para importar en phpMyAdmin)

### Paso 6: Activar Certificado SSL
1. En hPanel, ir a **Seguridad** → **SSL**.
2. Confirmar que el certificado gratuito **Let's Encrypt** esté activo para el (sub)dominio.

### Paso 7: Comprobación del Sistema en Producción
Visitar en el navegador:
- `https://tudominio.com/includes/api.php?action=status`
  - Debe responder: `{"success":true,"sistema":"Laboratorio Digital de Innovación InnovaHub360","php_version":"8.x","db_connected":true}`
- **IA:** abrir el menú (☰) → botón **IA**. Se verifica solo y debe decir «IA conectada · UNAD». Si dice «La IA no está configurada en el servidor», falta o está incompleto `config/ia.php`; si dice 401/403, las credenciales no son válidas.
- Navegar por las herramientas (Radar, Estudio, Ideación, Árbol, Prototipado y Banco) y conversar con ZOE.

### Servicios externos que usa el navegador
El sitio no tiene una política CSP que los bloquee; si el servidor agrega una, deben permitirse:
- `chatbot-ia-360.unad.edu.co`: lo llama **el servidor** (PHP con `curl`), no el navegador.
- `huggingface.co`: la voz de ZOE (modelo Piper de 63 MB) se descarga una sola vez por navegador y queda guardada en él.
- `cdnjs.cloudflare.com` y `cdn.jsdelivr.net`: motor de voz (ONNX y fonetizador).
- Google Fonts para las tipografías.

---

## 4. Credenciales de la IA y Radar del Observatorio
1. Copiar `config/ia.example.php` como `config/ia.php` y completar `UNAD_GEMINI_X_API_KEY` y `UNAD_GEMINI_BEARER`. Ese archivo no se sube a Git y `.htaccess` bloquea `config/` desde la web.
2. Sin credenciales, `/api/unad-gemini` responde 503 y la aplicación lo informa: nunca muestra resultados inventados.
3. `includes/observatorio.php` lee el Radar público del Observatorio con caché de 6 horas (ruta `/api/observatorio/radar`). Si el módulo se instala dentro del sitio, puede leer directamente la tabla MySQL conservando la misma respuesta.
4. Para actualizar este paquete después de cambios en el código: `npm run deploy:package`.

## 5. Reutilización Segura de Gemini Institucional
El archivo `includes/gemini_proxy.php` actúa como un intermediario seguro entre el frontend y el endpoint institucional:
- Las llamadas desde el navegador se dirigen a `/api/unad-gemini`.
- El servidor PHP valida la solicitud, aplica el token institucional o credencial autorizada en el encabezado `Authorization: Bearer`, y reenvía a `https://chatbot-ia-360.unad.edu.co/api-proxy/v1`.
- **Ninguna clave de API viaja al cliente ni queda expuesta en código fuente.**
