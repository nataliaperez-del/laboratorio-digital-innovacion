<?php
declare(strict_types=1);

/**
 * Copia este archivo como config/ia.php y completa las credenciales del servidor.
 * config/ia.php no se sube al repositorio y .htaccess bloquea su acceso desde la web.
 * Las variables de entorno del mismo nombre tienen prioridad sobre este archivo.
 */
return [
    'UNAD_GEMINI_X_API_KEY' => '',
    'UNAD_GEMINI_BEARER'    => '',
    'UNAD_GEMINI_BASE_URL'  => 'https://chatbot-ia-360.unad.edu.co/api-proxy/v1',
    // Alternativa directa a Google si no se usa el proxy institucional.
    'GEMINI_API_KEY'        => '',
];
