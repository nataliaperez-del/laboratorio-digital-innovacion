/**
 * Modelos de chat completions recomendados para este flujo (mucho contexto: Drive institucional + ficha).
 * Los IDs deben existir en tu cuenta de OpenAI; ver documentación oficial.
 */
export const OPENAI_MODEL_OPTIONS: {
  id: string;
  label: string;
  /** Texto corto para la UI */
  hint: string;
}[] = [
  {
    id: 'gpt-4o',
    label: 'gpt-4o (recomendado)',
    hint: 'Buen equilibrio calidad/precio; ventana ~128k tokens. Adecuado para contenedor y Drive truncados por el sistema.',
  },
  {
    id: 'gpt-4o-mini',
    label: 'gpt-4o-mini',
    hint: 'Más barato y rápido; mismo contexto ~128k. Mejor para pruebas; menos fino en textos técnicos largos.',
  },
  {
    id: 'gpt-4-turbo',
    label: 'gpt-4-turbo',
    hint: 'Generación anterior; ~128k tokens. Útil si tu cuenta no expone gpt-4o.',
  },
  {
    id: 'gpt-4.1',
    label: 'gpt-4.1',
    hint: 'Si tu cuenta lo ofrece: suele mejorar seguimiento de instrucciones largas. Confirma límites en OpenAI.',
  },
  {
    id: 'gpt-4.1-mini',
    label: 'gpt-4.1-mini',
    hint: 'Variante más ligera de gpt-4.1; revisa disponibilidad y precio.',
  },
  {
    id: 'chatgpt-4o-latest',
    label: 'chatgpt-4o-latest',
    hint: 'Alineado con el modelo usado en ChatGPT; comportamiento puede variar ligeramente.',
  },
];

export const DEFAULT_OPENAI_MODEL = 'gpt-4o';
