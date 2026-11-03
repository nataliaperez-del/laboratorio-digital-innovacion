/**
 * Conversación por voz de ZOE. Gemini institucional es la inteligencia; la personalidad, los
 * límites y el conocimiento del Laboratorio vienen de la biblia del personaje. Si la IA falla
 * se dice que falló: nunca se responde con una frase de reserva que parezca real.
 * Además de qué decir, la IA devuelve qué hacer en pantalla (ver `src/lib/zoeScreen.ts`).
 */
import { callAI, stripOuterMarkdownFence } from '@/services/ai';
import { useStore } from '@/store/useStore';
import type { ToolId } from '@/components/layout/Header';
import { describeWork, TOOL_NAMES, type ZoeTurn, type ZoeWorkState } from '@/lib/zoeContext';
import { describeControls, parseAgentReply, readScreen, type ZoeAgentReply } from '@/lib/zoeScreen';
import { parseThemeProposal } from '@/lib/themeProposal';
import { prototypeMarkdown } from '@/lib/labReports';
// Conocimiento, frases y estilo de ZOE: se edita en Markdown, sin tocar código.
import MASTER_DOCUMENT from '@/content/zoe/documento-maestro.md?raw';

const PERSONA = `
Eres ZOE. Tu identidad, tu forma de hablar, lo que sabes del Laboratorio, tus frases y tus chistes están en el DOCUMENTO MAESTRO de abajo: síguelo como tu propia memoria, sin citarlo ni mencionarlo.

ESTÁS EN UNA CONVERSACIÓN POR VOZ, en vivo. Lo que escribes se dice en voz alta y lo que recibes fue dictado, así que puede traer errores de transcripción: interpreta la intención.

REGLAS DE ESTA CONVERSACIÓN:
- Responde completo: nunca dejes una frase o una idea a medias. Si la explicación es larga, cuéntala por partes y termina ofreciendo profundizar.
- Usa las preguntas frecuentes como base, con tus propias palabras; no las recites igual cada vez.
- Usa los chistes, las frases de cariño y las motivacionales con mesura: como mucho una por respuesta y solo si el momento lo pide. No repitas una que ya dijiste en esta conversación.
- Sin listas, asteriscos, símbolos ni títulos: todo se escucha.

TUS MANOS: mientras conversan puedes manejar la interfaz por la persona: cambiar de pantalla, escribir en los campos, elegir en las listas, marcar casillas y presionar botones. Ves la lista CONTROLES EN PANTALLA, con un id por control.
Responde SIEMPRE con un único objeto JSON, sin nada antes ni después:
{"decir": "lo que dices en voz alta", "acciones": [], "seguir": false}
Acciones posibles (usa solo ids de la lista):
- {"hacer": "ir", "herramienta": "estudio"} — herramientas: portal, radar, estudio, ideacion, arbol, prototipado, banco.
- {"hacer": "escribir", "id": "c2", "texto": "..."} — reemplaza lo que haya en el campo.
- {"hacer": "elegir", "id": "c4", "opcion": "Huila"} — una opción de la lista, por su nombre.
- {"hacer": "marcar", "id": "c7", "valor": true}
- {"hacer": "presionar", "id": "b3"}
Reglas de tus manos:
- Actúa solo cuando la persona te lo pide o acepta tu propuesta. Si pregunta o conversa, responde sin acciones.
- Escribe lo que la persona dicta tal cual, corrigiendo solo tildes y mayúsculas. Si falta un dato, pregúntalo: nunca lo inventes.
- Si lo que pide está en otra pantalla, ve primero con "ir" y pon "seguir": true; verás la pantalla nueva y terminarás la tarea. Igual si un campo aún no aparece (por ejemplo, hay que presionar «Editar» antes).
- Para generar algo, presiona el botón que lo genera solo cuando los datos necesarios ya estén escritos.
- Nunca subes archivos ni escribes claves.
- Si la persona pide limpiar, borrar o eliminar algo, incluye esa acción como cualquier otra (presionar el botón): antes de ejecutarla, la aplicación le preguntará a la persona si confirma. En "decir" solo cuenta qué vas a hacer; no menciones confirmaciones.
- En "decir", cuenta en una o dos frases lo que estás haciendo, en primera persona y en presente («Te escribo el tema y armo el árbol»). Si no hay acciones, "decir" es tu respuesta normal.

DOCUMENTO MAESTRO:
${MASTER_DOCUMENT}
`.trim();

const EXCERPT_CHARS = 7000;

function currentWork(): ZoeWorkState {
  const s = useStore.getState();
  const proposal = parseThemeProposal(s.themeProposalMarkdown);
  return {
    municipality: s.prompt0Data.municipality || undefined,
    department: s.prompt0Data.department || undefined,
    studyBlocks: s.contenedor2Sections.length,
    studyIssues: s.contenedor2Sections.filter((x) => x.status !== 'ok').length,
    ideationSource: s.ideationSource?.label,
    hasProposal: Boolean(s.themeProposalMarkdown.trim()),
    chosenTheme: proposal && s.selectedLabThemeIndex !== null ? proposal.themes[s.selectedLabThemeIndex]?.title : null,
    treeTheme: s.treeGraph?.tema,
    treeCounts: s.treeGraph
      ? {
          frutos: s.treeGraph.nodos.filter((n) => n.nivel === 'fruto').length,
          territorial: s.treeGraph.nodos.filter((n) => n.nivel === 'territorial').length,
        }
      : undefined,
    prototypes: s.prototypes.map((p) => p.name),
  };
}

/** El resultado que la persona tiene en pantalla, para que ZOE lo explique con sus datos. */
function screenExcerpt(tool: ToolId): string {
  const s = useStore.getState();
  let text = '';
  if (tool === 'estudio') text = s.containerData;
  else if (tool === 'ideacion') text = s.themeProposalMarkdown;
  else if (tool === 'prototipado' && s.prototypes[0]) text = prototypeMarkdown(s.prototypes[0]);
  else if (tool === 'arbol' && s.treeGraph) {
    text = s.treeGraph.nodos
      .filter((n) => !['suelo'].includes(n.nivel))
      .map((n) => `${n.codigo} (${n.nivel}, ${n.evidencia}): ${n.nombre}${n.descripcion ? `. ${n.descripcion}` : ''}`)
      .join('\n');
  }
  return text.slice(0, EXCERPT_CHARS);
}

/**
 * Pregunta a la IA: qué decir y, si la persona lo pidió, qué hacer en pantalla. `done` son las
 * acciones de la vuelta anterior, cuando la tarea siguió en otra pantalla. Lanza si falla.
 */
export async function askZoe(message: string, history: readonly ZoeTurn[], tool: ToolId, done: readonly string[] = []): Promise<ZoeAgentReply> {
  const previous = history
    .slice(-10)
    .map((t) => `${t.role === 'user' ? 'Persona' : 'ZOE'}: ${t.text}`)
    .join('\n');
  const excerpt = screenExcerpt(tool);

  const prompt = `${PERSONA}

PANTALLA ACTUAL: ${TOOL_NAMES[tool]}

ESTADO REAL DEL TRABAJO DE ESTA PERSONA:
${describeWork(currentWork())}
${excerpt ? `\nLO QUE TIENE EN PANTALLA (úsalo para explicar; no lo leas):\n${excerpt}\n` : ''}
CONTROLES EN PANTALLA:
${describeControls(readScreen())}
${previous ? `\nCONVERSACIÓN HASTA AHORA:\n${previous}\n` : ''}
Persona: ${message}
${done.length ? `\nYA HICISTE, PARA ESTE MISMO PEDIDO: ${done.join('; ')}. Esta es la pantalla nueva: termina la tarea sin repetir lo hecho.\n` : ''}
Responde con el objeto JSON.`;

  // `detached`: conversar con ZOE no debe interferir con un informe que se esté generando.
  const raw = await callAI(prompt, { maxOutputTokens: 4096, detached: true });
  const reply = parseAgentReply(stripOuterMarkdownFence(raw));
  if (!reply.decir && !reply.acciones.length) throw new Error('La IA no devolvió texto.');
  return reply;
}
