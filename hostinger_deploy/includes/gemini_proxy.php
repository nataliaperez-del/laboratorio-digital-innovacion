<?php
declare(strict_types=1);

/**
 * ==============================================================================
 * LABORATORIO DE INNOVACIÓN EN LÍNEA — OBSERVATORIO INNOVAHUB360
 * Proxy de IA (PHP 8.1+)
 * ==============================================================================
 * Reenvía las peticiones del navegador al proxy institucional de la UNAD o a la API
 * de Google Gemini, sin exponer las credenciales. Sin credenciales responde 503: el
 * Laboratorio nunca presenta datos inventados como resultado de IA.
 *
 * Credenciales: variables de entorno o config/ia.php (ver config/ia.example.php).
 */

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

function responder(int $codigo, array $cuerpo): void
{
    http_response_code($codigo);
    echo json_encode($cuerpo, JSON_UNESCAPED_UNICODE);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    responder(405, ['error' => 'Método no permitido. Use POST.']);
}

$entrada = json_decode((string) file_get_contents('php://input'), true);
if (!is_array($entrada) || empty($entrada['contents']) || !is_array($entrada['contents'])) {
    responder(400, ['error' => 'Cuerpo de petición inválido. Se requiere "contents".']);
}

// Modelos que acepta hoy la pasarela IA 360.
$modelos = ['gemini-3.5-flash', 'gemini-3.5-flash-lite', 'gemini-3.6-flash', 'gemini-3.7-flash', 'gemini-3.8-flash', 'gemini-3.1-pro-preview'];
$modelo = is_string($entrada['model'] ?? null) ? trim($entrada['model']) : $modelos[0];
if (!in_array($modelo, $modelos, true)) {
    responder(400, ['error' => 'Modelo no permitido. Use uno de: ' . implode(', ', $modelos) . '.']);
}

$config_ia = is_file(__DIR__ . '/../config/ia.php') ? (array) require __DIR__ . '/../config/ia.php' : [];
$leer = static fn (string $clave): string => trim((string) (getenv($clave) ?: ($config_ia[$clave] ?? '')));

$credenciales = is_array($entrada['credentials'] ?? null) ? $entrada['credentials'] : [];
$x_api_key = trim((string) ($credenciales['xApiKey'] ?? '')) ?: $leer('UNAD_GEMINI_X_API_KEY');
$bearer = trim((string) ($credenciales['bearer'] ?? '')) ?: $leer('UNAD_GEMINI_BEARER');
$gemini_key = $leer('GEMINI_API_KEY');
$base_unad = rtrim($leer('UNAD_GEMINI_BASE_URL') ?: 'https://chatbot-ia-360.unad.edu.co/api-proxy/v1', '/');

if ($x_api_key !== '' && $bearer !== '') {
    $url = "{$base_unad}/models/{$modelo}:generateContent";
    $cabeceras = ['Content-Type: application/json', "x-api-key: {$x_api_key}", "Authorization: Bearer {$bearer}"];
} elseif ($gemini_key !== '') {
    $url = "https://generativelanguage.googleapis.com/v1beta/models/{$modelo}:generateContent";
    $cabeceras = ['Content-Type: application/json', "x-goog-api-key: {$gemini_key}"];
} else {
    responder(503, [
        'code' => 'IA_NO_CONFIGURADA',
        'error' => 'La IA no está configurada en el servidor. Define las credenciales en config/ia.php o elige otro proveedor en el botón «IA» de la cabecera.',
    ]);
}

// Solo viajan los campos que entiende Gemini: ni el modelo ni las credenciales del cliente.
$cuerpo = ['contents' => $entrada['contents']];
if (is_array($entrada['generationConfig'] ?? null)) {
    $cuerpo['generationConfig'] = $entrada['generationConfig'];
}
if (is_array($entrada['tools'] ?? null)) {
    $cuerpo['tools'] = $entrada['tools'];
}

$ch = curl_init();
curl_setopt_array($ch, [
    CURLOPT_URL            => $url,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST           => true,
    CURLOPT_POSTFIELDS     => json_encode($cuerpo, JSON_UNESCAPED_UNICODE),
    CURLOPT_HTTPHEADER     => $cabeceras,
    // Una parte de un informe puede tardar varios minutos en el modelo.
    CURLOPT_TIMEOUT        => 280,
    CURLOPT_SSL_VERIFYPEER => true,
]);
@set_time_limit(300);

$respuesta = curl_exec($ch);
$codigo = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);
curl_close($ch);

if ($respuesta === false) {
    responder(502, ['error' => 'Error de comunicación con el servicio de IA: ' . $error]);
}

http_response_code($codigo);
echo $respuesta;
