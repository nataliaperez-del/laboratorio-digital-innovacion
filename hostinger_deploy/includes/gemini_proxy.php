<?php
declare(strict_types=1);

/**
 * ==============================================================================
 * LABORATORIO DIGITAL DE INNOVACIÓN — INNOVAHUB360
 * Proxy Seguro para Google Gemini Institucional (PHP 8.1+)
 * ==============================================================================
 * Enruta las peticiones de IA hacia el proxy institucional de la UNAD o hacia
 * la API de Google Gemini oficial, manteniendo los tokens y llaves protegidos
 * en el servidor sin exponerlos en el navegador.
 */

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

// Solo aceptar peticiones POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Método no permitido. Use POST.'], JSON_UNESCAPED_UNICODE);
    exit;
}

// Leer cuerpo JSON
$input_raw = file_get_contents('php://input');
$input = json_decode($input_raw, true);

if (!is_array($input) || empty($input['contents'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Cuerpo de petición inválido. Se requiere "contents".'], JSON_UNESCAPED_UNICODE);
    exit;
}

$model = $input['model'] ?? 'gemini-2.5-flash';

// URL del proxy institucional de la UNAD o API de Gemini
$unad_proxy_url = getenv('UNAD_GEMINI_URL') ?: 'https://chatbot-ia-360.unad.edu.co/api-proxy/v1';
$unad_bearer    = getenv('UNAD_GEMINI_BEARER') ?: '';
$gemini_api_key = getenv('GEMINI_API_KEY') ?: '';

$ch = curl_init();

if (!empty($unad_bearer)) {
    // Modo Proxy Institucional UNAD
    $target_url = rtrim($unad_proxy_url, '/') . "/models/{$model}:generateContent";
    $headers = [
        'Content-Type: application/json',
        "Authorization: Bearer {$unad_bearer}",
    ];
} elseif (!empty($gemini_api_key)) {
    // Modo Directo Google Gemini
    $target_url = "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key={$gemini_api_key}";
    $headers = [
        'Content-Type: application/json',
    ];
} else {
    // Modo Simulación Segura (Demo Mode) si aún no se configuran credenciales en el hosting
    http_response_code(200);
    echo json_encode([
        'candidates' => [
            [
                'content' => [
                    'parts' => [
                        [
                            'text' => json_encode([
                                'name' => 'Prototipo de Bioinsumos y Monitoreo Zonal',
                                'category' => 'Prototipo Tecnológico',
                                'targetAudience' => 'Asociaciones campesinas del territorio',
                                'problemSolved' => 'Reducción de costos de fertilizantes químicos importados.',
                                'solution' => 'Sistema modular de formulación biológica con sensores microcontrolados para control de temperatura y pH en fermentación.',
                                'deliverables' => ['Planos técnicos', 'Firmware de control IoT', 'Protocolo de validación agronómica'],
                                'durationWeeks' => 6,
                                'unadSchool' => 'ECAPMA & ECBTI',
                                'validationMetrics' => ['Reducción verificada del 32% en costos', 'Aceptación comunitaria > 85%'],
                            ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT),
                        ],
                    ],
                ],
            ],
        ],
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

curl_setopt_array($ch, [
    CURLOPT_URL            => $target_url,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST           => true,
    CURLOPT_POSTFIELDS     => json_encode($input),
    CURLOPT_HTTPHEADER     => $headers,
    CURLOPT_TIMEOUT        => 45,
    CURLOPT_SSL_VERIFYPEER => true,
]);

$response = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curl_error = curl_error($ch);
curl_close($ch);

if ($response === false) {
    http_response_code(502);
    echo json_encode(['error' => 'Error de comunicación con el servicio de IA: ' . $curl_error], JSON_UNESCAPED_UNICODE);
    exit;
}

http_response_code($http_code);
echo $response;
