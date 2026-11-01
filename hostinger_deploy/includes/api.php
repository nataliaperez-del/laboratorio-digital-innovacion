<?php
declare(strict_types=1);

/**
 * ==============================================================================
 * LABORATORIO DIGITAL DE INNOVACIÓN — INNOVAHUB360
 * API REST PHP 8.1 para Hostinger (MySQL)
 * ==============================================================================
 */

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

require_once __DIR__ . '/../config/db.php';

$action = $_GET['action'] ?? 'status';

try {
    switch ($action) {
        case 'status':
            $db_ok = db_test_connection();
            echo json_encode([
                'success' => true,
                'sistema' => 'Laboratorio Digital de Innovación InnovaHub360',
                'php_version' => PHP_VERSION,
                'db_connected' => $db_ok,
                'timestamp' => date('c'),
            ], JSON_UNESCAPED_UNICODE);
            break;

        case 'test_db':
            $db_ok = db_test_connection();
            echo json_encode([
                'success' => $db_ok,
                'message' => $db_ok ? 'Conexión a MySQL exitosa.' : 'Falla al conectar a MySQL. Revise config/db.php',
            ], JSON_UNESCAPED_UNICODE);
            break;

        case 'get_prototipos':
            $pdo = get_db_connection();
            $stmt = $pdo->query('SELECT * FROM lab_prototipos ORDER BY id DESC');
            $rows = $stmt->fetchAll();
            foreach ($rows as &$r) {
                $r['entregables'] = json_decode((string)$r['entregables_json'], true) ?: [];
                $r['metricas_validacion'] = json_decode((string)$r['metricas_validacion_json'], true) ?: [];
                unset($r['entregables_json'], $r['metricas_validacion_json']);
            }
            echo json_encode(['success' => true, 'data' => $rows], JSON_UNESCAPED_UNICODE);
            break;

        case 'save_prototipo':
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
                http_response_code(405);
                echo json_encode(['error' => 'Método no permitido. Use POST.'], JSON_UNESCAPED_UNICODE);
                exit;
            }
            $input = json_decode(file_get_contents('php://input'), true);
            if (!$input || empty($input['nombre']) || empty($input['problema_resuelto'])) {
                http_response_code(400);
                echo json_encode(['error' => 'Datos incompletos para guardar el prototipo.'], JSON_UNESCAPED_UNICODE);
                exit;
            }
            $pdo = get_db_connection();
            $stmt = $pdo->prepare('INSERT INTO lab_prototipos 
                (codigo_fruto, nombre, categoria, publico_objetivo, problema_resuelto, solucion, entregables_json, duracion_semanas, escuela_unad, metricas_validacion_json) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
            $stmt->execute([
                $input['codigo_fruto'] ?? null,
                $input['nombre'],
                $input['categoria'] ?? 'Prototipo Tecnológico',
                $input['publico_objetivo'] ?? '',
                $input['problema_resuelto'],
                $input['solucion'] ?? '',
                json_encode($input['entregables'] ?? [], JSON_UNESCAPED_UNICODE),
                (int)($input['duracion_semanas'] ?? 6),
                $input['escuela_unad'] ?? 'ECBTI',
                json_encode($input['metricas_validacion'] ?? [], JSON_UNESCAPED_UNICODE),
            ]);
            echo json_encode(['success' => true, 'id' => (int)$pdo->lastInsertId()], JSON_UNESCAPED_UNICODE);
            break;

        case 'save_session':
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
                http_response_code(405);
                exit;
            }
            $input = json_decode(file_get_contents('php://input'), true);
            $key = $input['clave_sesion'] ?? ('session_' . bin2hex(random_bytes(16)));
            $pdo = get_db_connection();
            $stmt = $pdo->prepare('INSERT INTO lab_sesiones (clave_sesion, estado_json, tema_activo, ip_origen) 
                VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE estado_json = VALUES(estado_json), tema_activo = VALUES(tema_activo), actualizado_en = CURRENT_TIMESTAMP');
            $stmt->execute([
                $key,
                json_encode($input['estado'] ?? [], JSON_UNESCAPED_UNICODE),
                $input['tema_activo'] ?? null,
                $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1',
            ]);
            echo json_encode(['success' => true, 'clave_sesion' => $key], JSON_UNESCAPED_UNICODE);
            break;

        case 'get_session':
            $key = $_GET['key'] ?? '';
            if (!$key) {
                http_response_code(400);
                echo json_encode(['error' => 'Se requiere "key".'], JSON_UNESCAPED_UNICODE);
                exit;
            }
            $pdo = get_db_connection();
            $stmt = $pdo->prepare('SELECT estado_json, tema_activo, actualizado_en FROM lab_sesiones WHERE clave_sesion = ?');
            $stmt->execute([$key]);
            $row = $stmt->fetch();
            if (!$row) {
                http_response_code(404);
                echo json_encode(['error' => 'Sesión no encontrada.'], JSON_UNESCAPED_UNICODE);
                exit;
            }
            echo json_encode([
                'success' => true,
                'estado' => json_decode((string)$row['estado_json'], true),
                'tema_activo' => $row['tema_activo'],
                'actualizado_en' => $row['actualizado_en'],
            ], JSON_UNESCAPED_UNICODE);
            break;

        default:
            http_response_code(404);
            echo json_encode(['error' => "Acción desconocida: {$action}"], JSON_UNESCAPED_UNICODE);
    }
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Error interno: ' . $e->getMessage()], JSON_UNESCAPED_UNICODE);
}
