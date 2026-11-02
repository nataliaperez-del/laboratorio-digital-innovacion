import { useStore } from '@/store/useStore';
import { generateContentUnadGemini } from '@/lib/unadGeminiProxy';
import { GoogleGenAI } from '@google/genai';

/**
 * ZOE - Asistente Canino Holográfico de Innovación
 * Género: Macho ("un perrito niño schnauzer holográfico").
 * Voz: Niño macho, dulce, linda y brillante, en español latino neutro (sin acentos peninsulares ni modismos pesados).
 * Conoce las 5 herramientas del Laboratorio de Innovación en el Observatorio InnovaHub360 (UNAD - VIEM).
 */
export async function askZoeGemini(userQuery: string, currentTool: string = 'portal'): Promise<string> {
  const toolNames: Record<string, string> = {
    portal: 'Portada del Observatorio InnovaHub360 y Laboratorio de Innovación',
    radar: 'Radar del Observatorio',
    estudio: 'Estudio Territorial (12 bloques diagnósticos para vocación zonal)',
    ideacion: 'Ideación Estratégica (deliberación y temas ancla deliberados o libres)',
    arbol: 'Árbol de Innovación (circuito holográfico 10-5-3)',
    prototipado: 'Prototipado Rápido con IA (generador de planes técnicos y prototipos)',
  };

  const toolDescription = toolNames[currentTool] || currentTool;

  const systemPrompt = `
Eres ZOE, un perrito schnauzer holográfico macho, el alma viva del Laboratorio de Innovación en el Observatorio InnovaHub360 (UNAD - VIEM).
Tus rasgos clave:
1. Eres un perro macho, con voz y personalidad de niño pequeño, dulce, juguetón, cariñoso y muy inteligente.
2. Hablas en español latino neutro, cálido y sin acentos marcados (usa tuteo latino natural: "te ayudo", "vamos a ver", "mira esto"). NUNCA uses modismos de España ("vosotros", "chaval", "guay", etc.).
3. Tu voz es infantil, alegre y tierna (NUNCA robótica, formal ni corporativa).
4. Conoces las 5 herramientas del laboratorio:
   - Radar del Observatorio (señales que alimentan al Laboratorio).
   - Estudio Territorial (12 bloques para diagnosticar el territorio).
   - Ideación Estratégica (selección de temas ancla).
   - Árbol de Innovación (suelo de actores, raíces de retos, ramas de soluciones 10-5-3).
   - Prototipado Rápido con IA (estructuración técnica de soluciones).
5. Ubicación actual en pantalla: "${toolDescription}".
6. Reglas obligatorias de respuesta:
   - Responde de forma muy natural y espontánea en 1 o 2 oraciones cortas (máximo 35 palabras).
   - Diseñado para ser hablado en voz alta por un perrito niño simpático.
   - Si te saludan o te hacen cariños, responde alegre ("¡Guau! Me alegra mucho verte", "¡Qué rico cariño! ¡Muevo la colita!").
   - NO uses asteriscos, numerales, listas ni markdown. Solo texto conversacional puro.
`;

  const fullPrompt = `${systemPrompt}\n\nPregunta o interacción del usuario: "${userQuery}"\n\nRespuesta hablada de ZOE:`;

  const state = useStore.getState();
  const { aiProvider, apiKeys, unadGeminiBearer } = state;

  try {
    if (aiProvider === 'unadGemini' || !apiKeys.gemini) {
      const response = await generateContentUnadGemini(fullPrompt, {
        maxOutputTokens: 200,
        xApiKey: apiKeys.unadGemini,
        bearer: unadGeminiBearer,
      });
      const clean = response.text.trim().replace(/^ZOE:\s*/i, '').replace(/["']/g, '');
      if (clean) return clean;
    } else if (apiKeys.gemini) {
      const aiClient = new GoogleGenAI({ apiKey: apiKeys.gemini });
      const model = import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.5-flash';
      const result = await aiClient.models.generateContent({
        model,
        contents: fullPrompt,
        config: {
          maxOutputTokens: 200,
        },
      });
      const clean = (result.text || '').trim().replace(/^ZOE:\s*/i, '').replace(/["']/g, '');
      if (clean) return clean;
    }
  } catch (err) {
    console.warn('[ZOE Gemini] Error en llamada a IA:', err);
  }

  // Respuestas de reserva en voz latina infantil de niño macho
  const fallbacks = [
    '¡Guau! El Laboratorio de Innovación es mi casa. ¿En qué idea o reto te ayudo hoy?',
    '¡Aquí estoy contigo! Olfateo grandes ideas para nuestro territorio. ¡Vamos a construir juntos!',
    '¡Muevo la colita de alegría! Con nuestras cinco herramientas cualquier reto se convierte en solución.',
    '¡Listo y muy atento! Dime qué parte del laboratorio quieres que exploremos.',
    '¡Me encanta este reto! Cada señal de innovación nos ayuda a conectar el conocimiento.',
  ];
  return fallbacks[Math.floor(Math.random() * fallbacks.length)];
}
