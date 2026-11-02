<?php
declare(strict_types=1);

/**
 * ==============================================================================
 * LABORATORIO DE INNOVACIÓN EN LÍNEA — OBSERVATORIO INNOVAHUB360
 * Lectura del Radar del Observatorio (solo lectura, con caché de 6 horas)
 * ==============================================================================
 * Mismo criterio del conector del módulo de Boletines: el Radar público trae sus
 * tendencias como JSON incrustado (EMBED_TENDENCIAS). Cuando el módulo se instale
 * dentro del sitio, esta consulta puede reemplazarse por la tabla MySQL real
 * conservando la forma de la respuesta.
 */

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

const RADAR_URL = 'https://observatorio.innovahub360.net/index.php?route=%2Fradar';
const RADAR_TTL = 6 * 3600;

$cache = sys_get_temp_dir() . '/innovahub_lab_radar.json';
if (is_file($cache) && filemtime($cache) > time() - RADAR_TTL) {
    readfile($cache);
    exit;
}

$contexto = stream_context_create(['http' => [
    'timeout' => 20,
    'header'  => "User-Agent: InnovaHub360-Laboratorio/1.0 (solo lectura)\r\nAccept: text/html\r\n",
]]);
$html = @file_get_contents(RADAR_URL, false, $contexto);
$senales = null;
if ($html !== false && preg_match('/const EMBED_TENDENCIAS = (\[.*?\]);\s*\n/s', $html, $m)) {
    $senales = json_decode($m[1], true);
}

if (!is_array($senales)) {
    // Sin red o con cambio de formato se sirve la última copia, si existe.
    if (is_file($cache)) {
        readfile($cache);
        exit;
    }
    http_response_code(502);
    echo json_encode(['error' => 'No se pudo leer el Radar del Observatorio.'], JSON_UNESCAPED_UNICODE);
    exit;
}

$respuesta = json_encode([
    'consultadoEn' => gmdate('c'),
    'fuente'       => RADAR_URL,
    'senales'      => $senales,
], JSON_UNESCAPED_UNICODE);
@file_put_contents($cache, $respuesta);
echo $respuesta;
