# GUÍA DE DESPLIEGUE EN HOSTINGER — LABORATORIO DIGITAL DE INNOVACIÓN
**InnovaHub360 · Universidad Nacional Abierta y a Distancia (UNAD)**
*Actualizado: 30 de Octubre de 2026*

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
public_html/ (o subdominio / subcarpeta tipo public_html/laboratorio/)
│
├── index.html                  # Frontend reactivo compilado (InnovaHub360 UI)
├── .htaccess                   # Reglas de seguridad, compresión Gzip y rutas SPA
│
├── assets/                     # JavaScript minificado, CSS y fuentes (Inter, Space Grotesk, IBM Plex Mono)
│   ├── js/
│   ├── css/
│   └── fonts/
│
├── config/                     # Configuración de base de datos aislada
│   └── db.php                  # Parámetros PDO MySQL (host, db, user, pass)
│
├── includes/                   # Lógica de servidor PHP 8.1
│   ├── api.php                 # Endpoints REST para persistencia en MySQL
│   └── gemini_proxy.php        # Proxy seguro para Google Gemini institucional
│
└── database/
    └── schema_laboratorio.sql  # Dump limpio para importar en phpMyAdmin
```

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

### Paso 5: Subir los Archivos al Servidor
1. Mediante **File Manager** de hPanel o cliente **SFTP / FileZilla**:
   - Conectarse al host de Hostinger (`ftp.tudominio.com` o IP del servidor).
   - Si se despliega en un subdominio (ej. `laboratorio.innovahub360.net`), subir a la carpeta raíz de ese subdominio.
   - Si se despliega en subcarpeta del observatorio, subir a `public_html/laboratorio/`.
2. Confirmar que se subieron:
   - `index.html`
   - `assets/`
   - `config/`
   - `includes/`
   - `.htaccess`

### Paso 6: Activar Certificado SSL
1. En hPanel, ir a **Seguridad** → **SSL**.
2. Confirmar que el certificado gratuito **Let's Encrypt** esté activo para el (sub)dominio.

### Paso 7: Comprobación del Sistema en Producción
Visitar en el navegador:
- `https://tudominio.com/includes/api.php?action=status`
  - Debe responder: `{"success":true,"sistema":"Laboratorio Digital de Innovación InnovaHub360","php_version":"8.x","db_connected":true}`
- Navegar por las 5 herramientas para validar fluidez, estado y asistencia de ZOE.

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
