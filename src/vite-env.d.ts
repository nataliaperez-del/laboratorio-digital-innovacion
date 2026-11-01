/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GOOGLE_CLIENT_ID: string;
  /** Opcional: dominios de correo aceptados en el ingreso institucional, separados por coma (por defecto unad.edu.co). */
  readonly VITE_ALLOWED_EMAIL_DOMAINS?: string;
  /** Opcional: minutos de inactividad antes de cerrar la sesión (5–720; por defecto 30). */
  readonly VITE_SESSION_IDLE_MINUTES?: string;
  /** SOLO DESARROLLO: 'true' desactiva la pantalla de ingreso. */
  readonly VITE_AUTH_DISABLED?: string;
  /** Opcional: máx. caracteres del texto de Drive enviados al modelo (por defecto 900000). */
  readonly VITE_MAX_INSTITUTIONAL_CHARS?: string;
  /** Opcional: tope del texto institucional de Google Drive en Fase 2 (generateContainer); por defecto según proveedor. */
  readonly VITE_MAX_COMBINED_SOURCE_CHARS?: string;
  /** Opcional: tope del contenedor en Fase 3 (generateDocument). */
  readonly VITE_MAX_DOCUMENT_CONTAINER_CHARS?: string;
  /** Opcional: tope de caracteres del Contenedor 2 en pasos vocación/tema y árbol de innovación. */
  readonly VITE_MAX_THEME_STEP_CONTAINER_CHARS?: string;
  /** Opcional: tope de caracteres del TXT metodológico Contenedor 2 (`PROMPTS_FUENTES_CONSULTA_CONTENEDOR2_TERRITORIAL 1.txt`) en generateContainer. */
  readonly VITE_MAX_C2_PROMPT_DOC_CHARS?: string;
  /** Opcional: cola del documento parcial (caracteres) reenviada en cada apartado del fundante por secciones. */
  readonly VITE_MAX_FUNDANTE_PREV_CONTEXT_CHARS?: string;
  /** Opcional: tope del TXT de instrucción del documento fundante embebido en cada apartado (instruccion_documento_fundante_CIP_actualizada.txt). */
  readonly VITE_MAX_INSTRUCCION_FUNDANTE_CHARS?: string;
  /** Opcional: tope del texto bruto de Drive reenviado como material complementario en Fase 3. */
  readonly VITE_MAX_DOCUMENT_SUPPLEMENTARY_CHARS?: string;
  /** Opcional: máx. de proyectos del registro SIGIIP incluidos en el prompt del apartado 6. */
  readonly VITE_MAX_SIGIIP_PROJECTS?: string;
  /** Proxy UNAD IA 360 — base sin barra final (por defecto chatbot-ia-360.unad.edu.co/api-proxy/v1). */
  readonly VITE_UNAD_GEMINI_BASE_URL?: string;
  /** Modelo en el proxy: gemini-2.5-flash | gemini-2.5-flash-lite */
  readonly VITE_UNAD_GEMINI_MODEL?: string;
  readonly VITE_UNAD_GEMINI_X_API_KEY?: string;
  readonly VITE_UNAD_GEMINI_BEARER?: string;
  /** Máx. tokens de salida para UNAD (Fase 2 y 3); por defecto 8192 si no se define. */
  readonly VITE_UNAD_GEMINI_MAX_OUTPUT_TOKENS?: string;
  /** Tokens de pensamiento de gemini-2.5-* vía proxy UNAD (descuentan de maxOutputTokens); por defecto 1024. */
  readonly VITE_UNAD_GEMINI_THINKING_BUDGET?: string;
  /** Opcional: modelo de Anthropic (por defecto claude-sonnet-5). */
  readonly VITE_ANTHROPIC_MODEL?: string;
  /** Opcional: ID de la carpeta institucional de Google Drive (por defecto la carpeta oficial del CIP). */
  readonly VITE_DRIVE_FOLDER_ID?: string;
  /** Opcional: modelo para Gemini API directa (por defecto gemini-3.5-flash). */
  readonly VITE_GEMINI_MODEL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
