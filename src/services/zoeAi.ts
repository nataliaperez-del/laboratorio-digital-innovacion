/**
 * Conversación por voz de ZOE. Gemini institucional es la inteligencia; la personalidad, los
 * límites y el conocimiento del Laboratorio vienen de la biblia del personaje. Si la IA falla
 * se dice que falló: nunca se responde con una frase de reserva que parezca real.
 */
import { callAI, stripOuterMarkdownFence } from '@/services/ai';
import { useStore } from '@/store/useStore';
import type { ToolId } from '@/components/layout/Header';
import { cleanZoeReply, describeWork, TOOL_NAMES, type ZoeTurn, type ZoeWorkState } from '@/lib/zoeContext';
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

/** Pregunta a la IA. Lanza si falla; quien llama decide cómo decirlo. */
export async function askZoe(message: string, history: readonly ZoeTurn[], tool: ToolId): Promise<string> {
  const previous = history
    .slice(-10)
    .map((t) => `${t.role === 'user' ? 'Persona' : 'ZOE'}: ${t.text}`)
    .join('\n');
  const excerpt = screenExcerpt(tool);

  const prompt = `${PERSONA}

PANTALLA ACTUAL: ${TOOL_NAMES[tool]}

ESTADO REAL DEL TRABAJO DE ESTA PERSONA:
${describeWork(currentWork())}
${excerpt ? `\nLO QUE TIENE EN PANTALLA (úsalo para explicar; no lo leas):\n${excerpt}\n` : ''}${previous ? `\nCONVERSACIÓN HASTA AHORA:\n${previous}\n` : ''}
Persona: ${message}
ZOE:`;

  // `detached`: conversar con ZOE no debe interferir con un informe que se esté generando.
  const raw = await callAI(prompt, { maxOutputTokens: 4096, detached: true });
  const reply = cleanZoeReply(stripOuterMarkdownFence(raw));
  if (!reply) throw new Error('La IA no devolvió texto.');
  return reply;
}
