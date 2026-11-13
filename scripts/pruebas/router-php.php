<?php
/**
 * Enrutador para probar en local el PHP de Hostinger con `php -S` (que no lee el .htaccess).
 * Solo reproduce la regla de /api/lab. No se sube a Hostinger.
 */
$ruta = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
if (preg_match('#^/api/lab/?(.*)$#', (string)$ruta, $m)) {
    $_GET['ruta'] = $m[1];
    require __DIR__ . '/../../hostinger_deploy/includes/lab.php';
    return true;
}
http_response_code(404);
echo 'No encontrado';
return true;
