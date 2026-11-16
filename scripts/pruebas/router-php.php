<?php
/**
 * Enrutador para probar en local el PHP de Hostinger con `php -S` (que no lee el .htaccess).
 * Reproduce las reglas de /api/lab, /api/unad-gemini y /api/observatorio/radar. No se sube a Hostinger.
 */
$ruta = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
if (preg_match('#^/api/lab/?(.*)$#', (string)$ruta, $m)) {
    $_GET['ruta'] = $m[1];
    require __DIR__ . '/../../hostinger_deploy/includes/lab.php';
    return true;
}
if ($ruta === '/api/unad-gemini') {
    require __DIR__ . '/../../hostinger_deploy/includes/gemini_proxy.php';
    return true;
}
if ($ruta === '/api/observatorio/radar') {
    require __DIR__ . '/../../hostinger_deploy/includes/observatorio.php';
    return true;
}
http_response_code(404);
echo 'No encontrado';
return true;
