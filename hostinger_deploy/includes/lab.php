<?php
declare(strict_types=1);

/**
 * ==============================================================================
 * LABORATORIO DE INNOVACIÓN EN LÍNEA — CONCENTRADOR DE DATOS
 * ==============================================================================
 * Reúne en el servidor lo que cada persona hace en el Laboratorio: ingresos, uso de las
 * herramientas, resultados guardados, encuestas de satisfacción y descargas. Con eso se arma el
 * tablero global y el Contenedor global, visibles solo para administradores.
 *
 * Rutas (el .htaccess envía /api/lab/<ruta> aquí como ?ruta=<ruta>):
 *   POST sesion      Cambia el ingreso de Google por un pase firmado del Laboratorio.
 *   POST eventos     Lote de eventos de uso (requiere pase).
 *   POST resultado   Un resultado guardado, con su documento completo y sus insumos (requiere pase).
 *   GET  insumos     Banco de insumos: lo más relevante de los resultados de todos, sin autor (solo administradores).
 *   GET  tablero     Datos para el tablero global (solo administradores).
 *   GET  resultados  Lista de resultados de todos (solo administradores).
 *   GET  resultado   Un resultado completo (solo administradores).
 *
 * Seguridad: nada se acepta sin un pase, y el pase solo se entrega a una cuenta de Google
 * verificada con Google, del dominio institucional y emitida para este sitio. El pase va en el
 * encabezado X-Lab-Token. Quién es administrador lo decide el servidor (config/lab.php), no el
 * navegador.
 */

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

const LAB_PASE_HORAS = 12;
const LAB_MAX_CUERPO = 3_000_000;
const LAB_MAX_EVENTOS = 100;
const LAB_MAX_DATOS_EVENTO = 4_000;
const LAB_MAX_FILAS_TABLERO = 5_000;
const LAB_MODULOS = ['estudio', 'ideacion', 'arbol', 'prototipado'];
const LAB_TIPOS = ['ingreso', 'generacion', 'encuesta', 'descarga', 'zoe', 'insignia'];
const LAB_TIPOS_INSUMO = ['oportunidad', 'brecha', 'tendencia', 'tema', 'solucion', 'hipotesis'];
const LAB_MAX_INSUMOS = 8;

function lab_responder(int $estado, array $cuerpo): never
{
    http_response_code($estado);
    echo json_encode($cuerpo, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function lab_error(int $estado, string $mensaje): never
{
    lab_responder($estado, ['error' => $mensaje]);
}

/** Modo de prueba: solo con el servidor de desarrollo de PHP y la variable LAB_PRUEBA. Nunca en Hostinger. */
function lab_en_prueba(): bool
{
    return PHP_SAPI === 'cli-server' && getenv('LAB_PRUEBA') === '1';
}

/** Configuración pública del concentrador: administradores, dominios e ID de cliente de Google. */
function lab_config(): array
{
    static $config = null;
    if ($config === null) {
        $archivo = __DIR__ . '/../config/lab.php';
        $leido = is_file($archivo) ? require $archivo : [];
        $lista = static fn($v): array => array_values(array_filter(array_map(
            static fn($x) => strtolower(trim((string)$x)),
            is_array($v) ? $v : preg_split('/[,;\s]+/', (string)$v)
        )));
        $config = [
            'administradores' => $lista(getenv('LAB_ADMINISTRADORES') ?: ($leido['administradores'] ?? [])),
            'dominios' => $lista(getenv('LAB_DOMINIOS') ?: ($leido['dominios'] ?? ['unad.edu.co'])) ?: ['unad.edu.co'],
            'google_client_id' => trim((string)(getenv('LAB_GOOGLE_CLIENT_ID') ?: ($leido['google_client_id'] ?? ''))),
        ];
    }
    return $config;
}

function lab_db(): PDO
{
    static $pdo = null;
    if ($pdo !== null) return $pdo;
    if (lab_en_prueba() && getenv('LAB_SQLITE')) {
        $pdo = new PDO('sqlite:' . getenv('LAB_SQLITE'), null, null, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
    } else {
        require_once __DIR__ . '/../config/db.php';
        $pdo = get_db_connection();
    }
    lab_crear_tablas($pdo);
    return $pdo;
}

function lab_es_mysql(PDO $pdo): bool
{
    return $pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'mysql';
}

/** Crea las tablas la primera vez: en Hostinger basta con que exista la base de datos. */
function lab_crear_tablas(PDO $pdo): void
{
    $mysql = lab_es_mysql($pdo);
    $id = $mysql ? 'INT AUTO_INCREMENT PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT';
    $largo = $mysql ? 'LONGTEXT' : 'TEXT';
    $fin = $mysql ? ' ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci' : '';
    $pdo->exec("CREATE TABLE IF NOT EXISTS lab_ajustes (clave VARCHAR(60) PRIMARY KEY, valor TEXT NOT NULL)$fin");
    $pdo->exec("CREATE TABLE IF NOT EXISTS lab_usuarios (
        id $id,
        correo VARCHAR(190) NOT NULL UNIQUE,
        nombre VARCHAR(190) NOT NULL DEFAULT '',
        primer_ingreso DATETIME NOT NULL,
        ultimo_ingreso DATETIME NOT NULL,
        ingresos INT NOT NULL DEFAULT 0,
        consentimiento_en DATETIME NULL
    )$fin");
    $pdo->exec("CREATE TABLE IF NOT EXISTS lab_eventos (
        id $id,
        evento_id VARCHAR(64) NOT NULL UNIQUE,
        usuario_id INT NOT NULL,
        tipo VARCHAR(20) NOT NULL,
        modulo VARCHAR(20) NULL,
        ocurrido_en DATETIME NOT NULL,
        datos_json TEXT NULL,
        recibido_en DATETIME NOT NULL
    )$fin");
    $pdo->exec("CREATE TABLE IF NOT EXISTS lab_resultados (
        id $id,
        usuario_id INT NOT NULL,
        resultado_id VARCHAR(80) NOT NULL,
        modulo VARCHAR(20) NOT NULL,
        titulo VARCHAR(255) NOT NULL DEFAULT '',
        departamento VARCHAR(120) NOT NULL DEFAULT '',
        municipio VARCHAR(120) NOT NULL DEFAULT '',
        zona VARCHAR(120) NOT NULL DEFAULT '',
        creado_en DATETIME NOT NULL,
        actualizado_en DATETIME NOT NULL,
        resumen_json TEXT NULL,
        documento_json $largo NULL,
        sintesis TEXT NULL,
        UNIQUE (usuario_id, resultado_id)
    )$fin");
    // Banco de insumos: piezas cortas y reutilizables de cada resultado. No guarda quién las hizo.
    $pdo->exec("CREATE TABLE IF NOT EXISTS lab_insumos (
        id $id,
        resultado_fila INT NOT NULL,
        modulo VARCHAR(20) NOT NULL,
        tipo VARCHAR(20) NOT NULL,
        titulo VARCHAR(200) NOT NULL,
        descripcion TEXT NOT NULL,
        relevancia INT NOT NULL DEFAULT 3,
        palabras_clave VARCHAR(300) NOT NULL DEFAULT '',
        departamento VARCHAR(120) NOT NULL DEFAULT '',
        municipio VARCHAR(120) NOT NULL DEFAULT '',
        origen VARCHAR(10) NOT NULL DEFAULT 'ia',
        creado_en DATETIME NOT NULL
    )$fin");
    // Índices para el tablero. «IF NOT EXISTS» no existe en MySQL para índices: se intenta y, si ya está, se ignora.
    foreach ([
        'CREATE INDEX idx_lab_eventos_tipo ON lab_eventos (tipo, ocurrido_en)',
        'CREATE INDEX idx_lab_resultados_modulo ON lab_resultados (modulo, creado_en)',
        'CREATE INDEX idx_lab_insumos_resultado ON lab_insumos (resultado_fila)',
        'CREATE INDEX idx_lab_insumos_tipo ON lab_insumos (tipo, relevancia)',
    ] as $indice) {
        try {
            $pdo->exec($indice);
        } catch (Throwable) {
            // Ya existe.
        }
    }
}

function lab_ahora(): string
{
    return gmdate('Y-m-d H:i:s');
}

/** Fecha del navegador (ISO 8601) a la del servidor; si no es válida o está en el futuro, se usa la actual. */
function lab_fecha(mixed $iso): string
{
    $t = is_string($iso) ? strtotime($iso) : false;
    if ($t === false || $t > time() + 300 || $t < 1_700_000_000) return lab_ahora();
    return gmdate('Y-m-d H:i:s', $t);
}

function lab_texto(mixed $valor, int $max): string
{
    return mb_substr(trim(is_scalar($valor) ? (string)$valor : ''), 0, $max);
}

/** Secreto con el que se firman los pases: se genera una vez y se guarda en la base de datos. */
function lab_secreto(): string
{
    static $secreto = null;
    if ($secreto !== null) return $secreto;
    $pdo = lab_db();
    $leer = $pdo->prepare('SELECT valor FROM lab_ajustes WHERE clave = ?');
    $leer->execute(['secreto_pases']);
    $valor = $leer->fetchColumn();
    if (!$valor) {
        try {
            $pdo->prepare('INSERT INTO lab_ajustes (clave, valor) VALUES (?, ?)')->execute(['secreto_pases', bin2hex(random_bytes(32))]);
        } catch (Throwable) {
            // Otra solicitud lo creó al mismo tiempo: se usa el suyo.
        }
        $leer->execute(['secreto_pases']);
        $valor = $leer->fetchColumn();
    }
    return $secreto = (string)$valor;
}

function lab_b64(string $datos): string
{
    return rtrim(strtr(base64_encode($datos), '+/', '-_'), '=');
}

function lab_firmar_pase(int $usuarioId, string $correo): array
{
    $expira = time() + LAB_PASE_HORAS * 3600;
    $carga = lab_b64(json_encode(['u' => $usuarioId, 'c' => $correo, 'e' => $expira]));
    return ['token' => $carga . '.' . lab_b64(hash_hmac('sha256', $carga, lab_secreto(), true)), 'expira' => $expira];
}

/** Quién hace la solicitud, según su pase. Corta con 401 si no hay pase válido. */
function lab_usuario(): array
{
    $pase = $_SERVER['HTTP_X_LAB_TOKEN'] ?? '';
    $partes = explode('.', (string)$pase);
    if (count($partes) !== 2) lab_error(401, 'Falta el pase del Laboratorio. Vuelve a ingresar.');
    [$carga, $firma] = $partes;
    if (!hash_equals(lab_b64(hash_hmac('sha256', $carga, lab_secreto(), true)), $firma)) lab_error(401, 'Pase no válido.');
    $datos = json_decode((string)base64_decode(strtr($carga, '-_', '+/')), true);
    if (!is_array($datos) || ($datos['e'] ?? 0) < time()) lab_error(401, 'El pase venció. Vuelve a ingresar.');
    $correo = (string)($datos['c'] ?? '');
    return ['id' => (int)($datos['u'] ?? 0), 'correo' => $correo, 'admin' => in_array($correo, lab_config()['administradores'], true)];
}

function lab_admin(): array
{
    $usuario = lab_usuario();
    if (!$usuario['admin']) lab_error(403, 'Solo los administradores pueden consultar los datos de todos.');
    return $usuario;
}

function lab_cuerpo(): array
{
    $crudo = (string)file_get_contents('php://input', false, null, 0, LAB_MAX_CUERPO + 1);
    if (strlen($crudo) > LAB_MAX_CUERPO) lab_error(413, 'La solicitud es demasiado grande.');
    $datos = json_decode($crudo, true);
    if (!is_array($datos)) lab_error(400, 'La solicitud no es JSON válido.');
    return $datos;
}

/** Pregunta a Google de quién es el token del ingreso y para qué sitio se emitió. */
function lab_verificar_google(string $token): array
{
    if (lab_en_prueba() && str_starts_with($token, 'prueba:')) {
        return ['correo' => strtolower(substr($token, 7)), 'verificado' => true, 'cliente' => lab_config()['google_client_id']];
    }
    $ch = curl_init('https://oauth2.googleapis.com/tokeninfo?access_token=' . rawurlencode($token));
    curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 10, CURLOPT_CONNECTTIMEOUT => 5]);
    $respuesta = curl_exec($ch);
    $estado = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if ($respuesta === false) lab_error(502, 'No se pudo consultar a Google para verificar la cuenta.');
    $info = json_decode((string)$respuesta, true);
    if ($estado !== 200 || !is_array($info)) lab_error(401, 'Google no reconoce el ingreso. Vuelve a ingresar.');
    return [
        'correo' => strtolower(trim((string)($info['email'] ?? ''))),
        'verificado' => in_array($info['email_verified'] ?? false, [true, 'true'], true),
        'cliente' => (string)($info['aud'] ?? $info['azp'] ?? ''),
    ];
}

// ── Rutas ─────────────────────────────────────────────────────────────────────

function lab_ruta_sesion(): never
{
    $cuerpo = lab_cuerpo();
    $token = lab_texto($cuerpo['access_token'] ?? '', 4096);
    if ($token === '') lab_error(400, 'Falta el ingreso de Google.');
    $config = lab_config();
    $google = lab_verificar_google($token);
    $correo = $google['correo'];
    if ($correo === '' || !$google['verificado']) lab_error(401, 'No se pudo verificar el correo de la cuenta.');
    if ($config['google_client_id'] !== '' && $google['cliente'] !== $config['google_client_id']) lab_error(401, 'El ingreso no se emitió para este sitio.');
    $dominio = substr((string)strrchr($correo, '@'), 1);
    if (!in_array($dominio, $config['dominios'], true)) lab_error(403, 'La cuenta no es del dominio institucional.');

    $pdo = lab_db();
    $ahora = lab_ahora();
    $nombre = lab_texto($cuerpo['nombre'] ?? '', 190);
    $consiente = ($cuerpo['consentimiento'] ?? false) === true;
    $buscar = $pdo->prepare('SELECT id FROM lab_usuarios WHERE correo = ?');
    $buscar->execute([$correo]);
    $id = $buscar->fetchColumn();
    if ($id === false) {
        try {
            $pdo->prepare('INSERT INTO lab_usuarios (correo, nombre, primer_ingreso, ultimo_ingreso, ingresos, consentimiento_en) VALUES (?, ?, ?, ?, 0, ?)')
                ->execute([$correo, $nombre, $ahora, $ahora, $consiente ? $ahora : null]);
        } catch (Throwable) {
            // Dos pestañas a la vez: la otra lo creó.
        }
        $buscar->execute([$correo]);
        $id = $buscar->fetchColumn();
    }
    $pdo->prepare('UPDATE lab_usuarios SET ultimo_ingreso = ?, ingresos = ingresos + 1, nombre = CASE WHEN ? <> \'\' THEN ? ELSE nombre END,
        consentimiento_en = CASE WHEN consentimiento_en IS NULL AND ? = 1 THEN ? ELSE consentimiento_en END WHERE id = ?')
        ->execute([$ahora, $nombre, $nombre, $consiente ? 1 : 0, $ahora, (int)$id]);

    $pase = lab_firmar_pase((int)$id, $correo);
    lab_responder(200, ['token' => $pase['token'], 'expira' => $pase['expira'], 'admin' => in_array($correo, $config['administradores'], true)]);
}

function lab_ruta_eventos(): never
{
    $usuario = lab_usuario();
    $eventos = lab_cuerpo()['eventos'] ?? null;
    if (!is_array($eventos)) lab_error(400, 'Falta la lista de eventos.');
    if (count($eventos) > LAB_MAX_EVENTOS) lab_error(413, 'Demasiados eventos en un solo envío.');
    $pdo = lab_db();
    // El mismo evento puede llegar dos veces (reintentos): su identificador evita duplicarlo.
    $ignorar = lab_es_mysql($pdo) ? 'INSERT IGNORE' : 'INSERT OR IGNORE';
    $insertar = $pdo->prepare("$ignorar INTO lab_eventos (evento_id, usuario_id, tipo, modulo, ocurrido_en, datos_json, recibido_en) VALUES (?, ?, ?, ?, ?, ?, ?)");
    $ahora = lab_ahora();
    $recibidos = 0;
    $pdo->beginTransaction();
    foreach ($eventos as $evento) {
        if (!is_array($evento)) continue;
        $id = lab_texto($evento['id'] ?? '', 64);
        $tipo = lab_texto($evento['tipo'] ?? '', 20);
        if ($id === '' || !in_array($tipo, LAB_TIPOS, true)) continue;
        $modulo = lab_texto($evento['modulo'] ?? '', 20);
        $datos = isset($evento['datos']) && is_array($evento['datos']) ? json_encode($evento['datos'], JSON_UNESCAPED_UNICODE) : null;
        if ($datos !== null && strlen($datos) > LAB_MAX_DATOS_EVENTO) $datos = null;
        $insertar->execute([$id, $usuario['id'], $tipo, in_array($modulo, LAB_MODULOS, true) ? $modulo : null, lab_fecha($evento['at'] ?? null), $datos, $ahora]);
        $recibidos++;
    }
    $pdo->commit();
    lab_responder(200, ['recibidos' => $recibidos]);
}

function lab_ruta_resultado_guardar(): never
{
    $usuario = lab_usuario();
    $cuerpo = lab_cuerpo();
    $id = lab_texto($cuerpo['id'] ?? '', 80);
    $modulo = lab_texto($cuerpo['modulo'] ?? '', 20);
    if ($id === '' || !in_array($modulo, LAB_MODULOS, true)) lab_error(400, 'Resultado sin identificador o con una línea desconocida.');
    $resumen = isset($cuerpo['resumen']) && is_array($cuerpo['resumen']) ? json_encode($cuerpo['resumen'], JSON_UNESCAPED_UNICODE) : null;
    $documento = isset($cuerpo['documento']) && is_array($cuerpo['documento']) ? json_encode($cuerpo['documento'], JSON_UNESCAPED_UNICODE) : null;
    $pdo = lab_db();
    $ahora = lab_ahora();
    $campos = [
        lab_texto($cuerpo['titulo'] ?? '', 255),
        lab_texto($cuerpo['departamento'] ?? '', 120),
        lab_texto($cuerpo['municipio'] ?? '', 120),
        lab_texto($cuerpo['zona'] ?? '', 120),
    ];
    $sintesis = lab_texto($cuerpo['sintesis'] ?? '', 700);
    $existe = $pdo->prepare('SELECT id FROM lab_resultados WHERE usuario_id = ? AND resultado_id = ?');
    $existe->execute([$usuario['id'], $id]);
    $fila = $existe->fetchColumn();
    $nuevo = false;
    if ($fila === false) {
        try {
            $pdo->prepare('INSERT INTO lab_resultados (usuario_id, resultado_id, modulo, titulo, departamento, municipio, zona, creado_en, actualizado_en, resumen_json, documento_json, sintesis)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
                ->execute([$usuario['id'], $id, $modulo, ...$campos, lab_fecha($cuerpo['creadoEn'] ?? null), $ahora, $resumen, $documento, $sintesis]);
            $nuevo = true;
        } catch (Throwable) {
            // Llegó dos veces a la vez: se actualiza abajo.
        }
        $existe->execute([$usuario['id'], $id]);
        $fila = $existe->fetchColumn();
    }
    if (!$nuevo) {
        $pdo->prepare('UPDATE lab_resultados SET titulo = ?, departamento = ?, municipio = ?, zona = ?, actualizado_en = ?, resumen_json = ?, documento_json = ?, sintesis = ?
            WHERE id = ?')
            ->execute([...$campos, $ahora, $resumen, $documento, $sintesis, (int)$fila]);
    }

    // Insumos del resultado: se reemplazan los anteriores por los de esta versión.
    $insumos = 0;
    if (isset($cuerpo['insumos']) && is_array($cuerpo['insumos'])) {
        $origen = ($cuerpo['origenInsumos'] ?? '') === 'reglas' ? 'reglas' : 'ia';
        $pdo->beginTransaction();
        $pdo->prepare('DELETE FROM lab_insumos WHERE resultado_fila = ?')->execute([(int)$fila]);
        $insertar = $pdo->prepare('INSERT INTO lab_insumos (resultado_fila, modulo, tipo, titulo, descripcion, relevancia, palabras_clave, departamento, municipio, origen, creado_en)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
        foreach (array_slice($cuerpo['insumos'], 0, LAB_MAX_INSUMOS) as $insumo) {
            if (!is_array($insumo)) continue;
            $tipo = lab_texto($insumo['tipo'] ?? '', 20);
            $titulo = lab_texto($insumo['titulo'] ?? '', 200);
            $descripcion = lab_texto($insumo['descripcion'] ?? '', 800);
            if (!in_array($tipo, LAB_TIPOS_INSUMO, true) || $titulo === '' || $descripcion === '') continue;
            $claves = is_array($insumo['palabrasClave'] ?? null) ? implode(', ', array_map(static fn($k) => lab_texto($k, 40), array_slice($insumo['palabrasClave'], 0, 6))) : '';
            $insertar->execute([(int)$fila, $modulo, $tipo, $titulo, $descripcion, max(1, min(5, (int)($insumo['relevancia'] ?? 3))), lab_texto($claves, 300), $campos[1], $campos[2], $origen, $ahora]);
            $insumos++;
        }
        $pdo->commit();
    }
    lab_responder(200, ['guardado' => true, 'nuevo' => $nuevo, 'insumos' => $insumos]);
}

/**
 * Banco de insumos: lo más relevante de los resultados de todos. No dice quién hizo cada uno.
 * Por ahora solo lo consultan los administradores.
 */
function lab_ruta_insumos(): never
{
    lab_admin();
    $pdo = lab_db();
    $tipo = lab_texto($_GET['tipo'] ?? '', 20);
    $modulo = lab_texto($_GET['modulo'] ?? '', 20);
    $buscar = lab_texto($_GET['q'] ?? '', 80);
    $pagina = max(1, (int)($_GET['pagina'] ?? 1));
    $porPagina = 30;
    $donde = [];
    $parametros = [];
    if (in_array($tipo, LAB_TIPOS_INSUMO, true)) {
        $donde[] = 'tipo = ?';
        $parametros[] = $tipo;
    }
    if (in_array($modulo, LAB_MODULOS, true)) {
        $donde[] = 'modulo = ?';
        $parametros[] = $modulo;
    }
    if ($buscar !== '') {
        $donde[] = '(titulo LIKE ? OR descripcion LIKE ? OR palabras_clave LIKE ? OR municipio LIKE ? OR departamento LIKE ?)';
        array_push($parametros, ...array_fill(0, 5, '%' . $buscar . '%'));
    }
    $filtro = $donde ? 'WHERE ' . implode(' AND ', $donde) : '';
    $contar = $pdo->prepare("SELECT COUNT(*) FROM lab_insumos $filtro");
    $contar->execute($parametros);
    $total = (int)$contar->fetchColumn();
    $desde = ($pagina - 1) * $porPagina;
    $lista = $pdo->prepare("SELECT id, modulo, tipo, titulo, descripcion, relevancia, palabras_clave, departamento, municipio, origen, creado_en
        FROM lab_insumos $filtro ORDER BY relevancia DESC, creado_en DESC LIMIT $porPagina OFFSET $desde");
    $lista->execute($parametros);
    lab_responder(200, ['total' => $total, 'pagina' => $pagina, 'porPagina' => $porPagina, 'insumos' => array_map(static fn(array $f): array => [
        'id' => (int)$f['id'],
        'modulo' => $f['modulo'],
        'tipo' => $f['tipo'],
        'titulo' => $f['titulo'],
        'descripcion' => $f['descripcion'],
        'relevancia' => (int)$f['relevancia'],
        'palabrasClave' => array_values(array_filter(array_map('trim', explode(',', (string)$f['palabras_clave'])))),
        'departamento' => $f['departamento'],
        'municipio' => $f['municipio'],
        'origen' => $f['origen'],
        'creadoEn' => str_replace(' ', 'T', (string)$f['creado_en']) . 'Z',
    ], $lista->fetchAll())]);
}

/** Filas recientes de un tipo de evento, con sus datos ya decodificados. */
function lab_eventos_de(PDO $pdo, string $tipo): array
{
    $consulta = $pdo->prepare('SELECT modulo, ocurrido_en, datos_json FROM lab_eventos WHERE tipo = ? ORDER BY ocurrido_en DESC LIMIT ' . LAB_MAX_FILAS_TABLERO);
    $consulta->execute([$tipo]);
    return array_map(static fn(array $f): array => [
        'modulo' => $f['modulo'],
        'at' => str_replace(' ', 'T', (string)$f['ocurrido_en']) . 'Z',
        'datos' => json_decode((string)($f['datos_json'] ?? ''), true) ?: [],
    ], $consulta->fetchAll());
}

function lab_ruta_tablero(): never
{
    lab_admin();
    $pdo = lab_db();
    $uno = static fn(string $sql, array $p = []): int => (int)(function () use ($pdo, $sql, $p) {
        $c = $pdo->prepare($sql);
        $c->execute($p);
        return $c->fetchColumn();
    })();
    $hace7 = gmdate('Y-m-d H:i:s', time() - 7 * 86400);

    $resultados = [];
    $totales = [];
    foreach (LAB_MODULOS as $modulo) {
        $totales[$modulo] = $uno('SELECT COUNT(*) FROM lab_resultados WHERE modulo = ?', [$modulo]);
        $consulta = $pdo->prepare('SELECT resultado_id, creado_en, departamento, municipio, zona, resumen_json FROM lab_resultados WHERE modulo = ? ORDER BY creado_en DESC LIMIT ' . LAB_MAX_FILAS_TABLERO);
        $consulta->execute([$modulo]);
        $resultados[$modulo] = array_map(static fn(array $f): array => [
            'id' => $f['resultado_id'],
            'creadoEn' => str_replace(' ', 'T', (string)$f['creado_en']) . 'Z',
            'departamento' => $f['departamento'],
            'municipio' => $f['municipio'],
            'zona' => $f['zona'],
            'resumen' => json_decode((string)($f['resumen_json'] ?? ''), true) ?: [],
        ], $consulta->fetchAll());
    }

    // Uso de las herramientas: cuántas generaciones terminaron, cuántas fallaron y cuánto tardaron.
    $generacion = [];
    foreach (LAB_MODULOS as $modulo) $generacion[$modulo] = ['ok' => 0, 'fallidas' => 0, 'segundos' => 0, 'medidas' => 0];
    foreach (lab_eventos_de($pdo, 'generacion') as $evento) {
        $m = $evento['modulo'];
        if (!isset($generacion[$m])) continue;
        if (($evento['datos']['ok'] ?? false) === true) {
            $generacion[$m]['ok']++;
            $segundos = (float)($evento['datos']['segundos'] ?? 0);
            if ($segundos > 0) {
                $generacion[$m]['segundos'] += $segundos;
                $generacion[$m]['medidas']++;
            }
        } else {
            $generacion[$m]['fallidas']++;
        }
    }
    $uso = [];
    foreach ($generacion as $modulo => $g) {
        $uso[] = ['modulo' => $modulo, 'ok' => $g['ok'], 'fallidas' => $g['fallidas'], 'segundosPromedio' => $g['medidas'] ? round($g['segundos'] / $g['medidas'], 1) : null];
    }

    $zoe = 0;
    foreach (lab_eventos_de($pdo, 'zoe') as $evento) $zoe += (int)($evento['datos']['cantidad'] ?? 0);

    $encuestas = lab_eventos_de($pdo, 'encuesta');
    $descargas = lab_eventos_de($pdo, 'descarga');
    $recortado = max($totales) > LAB_MAX_FILAS_TABLERO || count($encuestas) >= LAB_MAX_FILAS_TABLERO || count($descargas) >= LAB_MAX_FILAS_TABLERO;

    lab_responder(200, [
        'generadoEn' => gmdate('c'),
        'usuarios' => [
            'total' => $uno('SELECT COUNT(*) FROM lab_usuarios'),
            'activos7dias' => $uno('SELECT COUNT(*) FROM lab_usuarios WHERE ultimo_ingreso >= ?', [$hace7]),
            'ingresos' => $uno('SELECT COALESCE(SUM(ingresos), 0) FROM lab_usuarios'),
            'conConsentimiento' => $uno('SELECT COUNT(*) FROM lab_usuarios WHERE consentimiento_en IS NOT NULL'),
        ],
        'totales' => $totales,
        'resultados' => $resultados,
        'encuestas' => $encuestas,
        'descargas' => $descargas,
        'uso' => $uso,
        'zoe' => $zoe,
        'insignias' => $uno('SELECT COUNT(*) FROM lab_eventos WHERE tipo = ?', ['insignia']),
        'insumos' => $uno('SELECT COUNT(*) FROM lab_insumos'),
        'recortado' => $recortado,
        'maximoFilas' => LAB_MAX_FILAS_TABLERO,
    ]);
}

function lab_ruta_resultados(): never
{
    lab_admin();
    $pdo = lab_db();
    $modulo = lab_texto($_GET['modulo'] ?? '', 20);
    $buscar = lab_texto($_GET['q'] ?? '', 80);
    $pagina = max(1, (int)($_GET['pagina'] ?? 1));
    $porPagina = 50;
    $donde = [];
    $parametros = [];
    if (in_array($modulo, LAB_MODULOS, true)) {
        $donde[] = 'r.modulo = ?';
        $parametros[] = $modulo;
    }
    if ($buscar !== '') {
        $donde[] = '(r.titulo LIKE ? OR r.municipio LIKE ? OR r.departamento LIKE ? OR u.nombre LIKE ? OR u.correo LIKE ?)';
        array_push($parametros, ...array_fill(0, 5, '%' . $buscar . '%'));
    }
    $filtro = $donde ? 'WHERE ' . implode(' AND ', $donde) : '';
    $contar = $pdo->prepare("SELECT COUNT(*) FROM lab_resultados r JOIN lab_usuarios u ON u.id = r.usuario_id $filtro");
    $contar->execute($parametros);
    $total = (int)$contar->fetchColumn();
    $desde = ($pagina - 1) * $porPagina;
    $lista = $pdo->prepare("SELECT r.id, r.modulo, r.titulo, r.departamento, r.municipio, r.zona, r.creado_en, r.actualizado_en, u.nombre, u.correo
        FROM lab_resultados r JOIN lab_usuarios u ON u.id = r.usuario_id $filtro ORDER BY r.actualizado_en DESC LIMIT $porPagina OFFSET $desde");
    $lista->execute($parametros);
    lab_responder(200, ['total' => $total, 'pagina' => $pagina, 'porPagina' => $porPagina, 'resultados' => array_map(static fn(array $f): array => [
        'id' => (int)$f['id'],
        'modulo' => $f['modulo'],
        'titulo' => $f['titulo'],
        'departamento' => $f['departamento'],
        'municipio' => $f['municipio'],
        'zona' => $f['zona'],
        'creadoEn' => str_replace(' ', 'T', (string)$f['creado_en']) . 'Z',
        'actualizadoEn' => str_replace(' ', 'T', (string)$f['actualizado_en']) . 'Z',
        'autor' => $f['nombre'] ?: $f['correo'],
        'correo' => $f['correo'],
    ], $lista->fetchAll())]);
}

function lab_ruta_resultado_leer(): never
{
    lab_admin();
    $consulta = lab_db()->prepare('SELECT r.modulo, r.titulo, r.sintesis, r.documento_json, u.nombre, u.correo FROM lab_resultados r JOIN lab_usuarios u ON u.id = r.usuario_id WHERE r.id = ?');
    $consulta->execute([(int)($_GET['id'] ?? 0)]);
    $fila = $consulta->fetch();
    if (!$fila) lab_error(404, 'Ese resultado no existe.');
    lab_responder(200, [
        'modulo' => $fila['modulo'],
        'titulo' => $fila['titulo'],
        'autor' => $fila['nombre'] ?: $fila['correo'],
        'sintesis' => (string)($fila['sintesis'] ?? ''),
        'documento' => json_decode((string)($fila['documento_json'] ?? ''), true),
    ]);
}

// ── Entrada ───────────────────────────────────────────────────────────────────

// Solo el propio sitio puede llamar: un origen distinto se rechaza.
$origen = $_SERVER['HTTP_ORIGIN'] ?? '';
$anfitrion = $_SERVER['HTTP_X_FORWARDED_HOST'] ?? ($_SERVER['HTTP_HOST'] ?? '');
if ($origen !== '' && $anfitrion !== '' && parse_url($origen, PHP_URL_HOST) . (parse_url($origen, PHP_URL_PORT) ? ':' . parse_url($origen, PHP_URL_PORT) : '') !== $anfitrion) {
    lab_error(403, 'Origen no permitido.');
}

$ruta = trim((string)($_GET['ruta'] ?? ''), '/');
$metodo = $_SERVER['REQUEST_METHOD'] ?? 'GET';

try {
    match (true) {
        $ruta === 'sesion' && $metodo === 'POST' => lab_ruta_sesion(),
        $ruta === 'eventos' && $metodo === 'POST' => lab_ruta_eventos(),
        $ruta === 'resultado' && $metodo === 'POST' => lab_ruta_resultado_guardar(),
        $ruta === 'insumos' && $metodo === 'GET' => lab_ruta_insumos(),
        $ruta === 'tablero' && $metodo === 'GET' => lab_ruta_tablero(),
        $ruta === 'resultados' && $metodo === 'GET' => lab_ruta_resultados(),
        $ruta === 'resultado' && $metodo === 'GET' => lab_ruta_resultado_leer(),
        default => lab_error(404, 'Ruta desconocida.'),
    };
} catch (Throwable $e) {
    error_log('[Laboratorio · concentrador] ' . $e->getMessage());
    lab_error(500, 'El servidor no pudo guardar o leer los datos.');
}
