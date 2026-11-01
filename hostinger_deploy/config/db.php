<?php
declare(strict_types=1);

/**
 * ==============================================================================
 * LABORATORIO DIGITAL DE INNOVACIÓN — INNOVAHUB360
 * Configuración de Base de Datos MySQL (Hostinger / hPanel)
 * ==============================================================================
 * Este archivo aísla completamente los parámetros de conexión para facilitar
 * el paso de ambiente local (XAMPP/MAMP) a producción en Hostinger.
 *
 * En Hostinger hPanel:
 * 1. Crear base de datos: hPanel -> Bases de datos -> Administración.
 * 2. Anotar el nombre completo con prefijo (ej. u123456789_innovahub).
 * 3. Anotar el usuario completo con prefijo (ej. u123456789_dbuser).
 * 4. Asignar contraseña segura y otorgar todos los privilegios a la base de datos.
 */

// Parámetros de conexión (Reemplazar con las credenciales reales de Hostinger)
$db_host = getenv('DB_HOST') ?: 'localhost';
$db_name = getenv('DB_NAME') ?: 'u123456789_innovahub'; // Cambiar por tu base de datos de Hostinger
$db_user = getenv('DB_USER') ?: 'u123456789_dbuser';    // Cambiar por tu usuario de Hostinger
$db_pass = getenv('DB_PASS') ?: 'TU_PASSWORD_AQUI';      // Cambiar por tu contraseña
$db_port = (int)(getenv('DB_PORT') ?: 3306);
$db_char = 'utf8mb4';

/**
 * Obtiene la instancia PDO de conexión a la base de datos MySQL.
 *
 * @return PDO
 * @throws PDOException
 */
function get_db_connection(): PDO
{
    global $db_host, $db_name, $db_user, $db_pass, $db_port, $db_char;
    static $pdo = null;

    if ($pdo === null) {
        $dsn = "mysql:host={$db_host};port={$db_port};dbname={$db_name};charset={$db_char}";
        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
            PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES {$db_char} COLLATE utf8mb4_unicode_ci",
        ];

        try {
            $pdo = new PDO($dsn, $db_user, $db_pass, $options);
        } catch (PDOException $e) {
            // En producción registrar el error sin exponer credenciales en pantalla
            error_log("[Laboratorio InnovaHub360] Error de conexión a BD: " . $e->getMessage());
            http_response_code(500);
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode([
                'success' => false,
                'error'   => 'Error al conectar con la base de datos. Verifique config/db.php.',
            ], JSON_UNESCAPED_UNICODE);
            exit;
        }
    }

    return $pdo;
}

/**
 * Función de utilidad para comprobar la conexión rápidamente.
 */
function db_test_connection(): bool
{
    try {
        $pdo = get_db_connection();
        return (bool)$pdo->query('SELECT 1');
    } catch (Throwable $e) {
        return false;
    }
}
