/**
 * Preparación del Markdown generado por la IA para su renderizado (vista previa,
 * Word y PDF). La pieza central es la conversión de organigramas en "arte ASCII"
 * (líneas con `[Cajas]`, `|` y `+---`) en listas jerárquicas de Markdown, que se
 * ven bien en la hoja estilo Word y sobreviven la exportación.
 */

/** Línea que solo dibuja conectores del diagrama: `|`, `+`, guiones y espacios. */
function isConnectorOnly(line: string): boolean {
  const t = line.trim();
  return t.length > 0 && /^[|+\-\s_·]+$/.test(t) && /[|+]/.test(t);
}

/** Etiqueta del diagrama con su profundidad, o null si la línea no es parte de uno. */
function diagramLabelOf(line: string): { depth: number; text: string } | null {
  // Rama: `+--- [Etiqueta]` o `|   |--- Texto` — la profundidad es el nº de conectores del prefijo.
  const branch = line.match(/^(\s*(?:[|+]\s*)*[|+]-{2,}>?\s*)(.+)$/);
  if (branch) {
    const depth = (branch[1].match(/[|+]/g) ?? []).length;
    return { depth, text: cleanLabel(branch[2]) };
  }
  // Nodo de la cadena principal: `[Etiqueta]` sola en la línea.
  const bracket = line.match(/^\s*\[([^\][]{1,120})\]\s*$/);
  if (bracket) return { depth: 0, text: bracket[1].trim() };
  return null;
}

function cleanLabel(raw: string): string {
  return raw
    .trim()
    .replace(/^\[([^\][]+)\]$/, '$1')
    .trim();
}

interface DiagramBlock {
  start: number;
  end: number; // exclusivo
  labels: { depth: number; text: string }[];
  connectors: number;
}

/** Fila separadora de tabla Markdown (`|---|---|`, `| :--- | ---: |`, etc.). */
function isTableSeparatorRow(line: string): boolean {
  const t = line.trim();
  if (!t.includes('|') || !t.includes('-')) return false;
  const stripped = t.replace(/[\s|:]/g, '');
  return stripped.length >= 3 && /^-+$/.test(stripped);
}

/**
 * Segunda pasada de limpieza: elimina las reglas horizontales decorativas sueltas
 * (`---`, `***`, `___` en una línea propia, precedidas de línea en blanco) y colapsa
 * las filas separadoras de tabla repetidas. Son artefactos que la IA emite a veces y
 * que el usuario ve como "líneas" en el documento. No toca los separadores de tabla
 * legítimos ni los subrayados setext de encabezados (línea de guiones bajo un texto).
 */
function stripStrayRules(markdown: string): string {
  const lines = markdown.split(/\r?\n/);
  const out: string[] = [];
  const hrOnlyRe = /^\s*([-*_])\1{2,}\s*$/;
  for (const line of lines) {
    if (isTableSeparatorRow(line)) {
      const prev = out.length ? out[out.length - 1] : '';
      if (isTableSeparatorRow(prev)) continue; // separador de tabla duplicado
      out.push(line);
      continue;
    }
    if (hrOnlyRe.test(line) && !line.includes('|')) {
      const prev = out.length ? out[out.length - 1] : '';
      // Precedida de línea en blanco => es una regla horizontal real (raya suelta): se quita.
      // Precedida de texto => puede ser subrayado setext de un encabezado: se conserva.
      if (prev.trim() === '') continue;
    }
    out.push(line);
  }
  return out.join('\n');
}

/**
 * Convierte los bloques de organigrama ASCII en listas anidadas de Markdown.
 * Los nodos de la cadena principal quedan en negrilla al primer nivel y las
 * ramas (`+---`, `|---`) como sub-viñetas según su profundidad.
 */
export function normalizeAsciiDiagrams(markdown: string): string {
  const lines = markdown.split(/\r?\n/);
  const blocks: DiagramBlock[] = [];

  let current: DiagramBlock | null = null;
  const closeCurrent = () => {
    // Solo cuenta como diagrama si hay varias etiquetas y al menos un conector:
    // así no se tocan listas o párrafos normales que usen corchetes.
    if (current && current.labels.length >= 2 && current.connectors >= 1) blocks.push(current);
    current = null;
  };

  lines.forEach((line, i) => {
    // El orden importa: una fila separadora de tabla (`|---|---|`) es "solo conectores",
    // nunca una etiqueta; así las tablas Markdown normales no se ven afectadas.
    const connector = isConnectorOnly(line);
    const label = connector ? null : diagramLabelOf(line);
    if (label || connector) {
      if (!current) current = { start: i, end: i + 1, labels: [], connectors: 0 };
      current.end = i + 1;
      if (label) current.labels.push(label);
      if (connector) current.connectors++;
    } else if (line.trim().length === 0 && current) {
      // Una línea en blanco no cierra el bloque todavía (puede seguir el diagrama).
      current.end = i + 1;
    } else {
      closeCurrent();
    }
  });
  closeCurrent();

  if (blocks.length === 0) return stripStrayRules(markdown);

  const out: string[] = [];
  let cursor = 0;
  for (const block of blocks) {
    // Si el diagrama venía dentro de un bloque de código cercado, se retiran los cercos.
    let start = block.start;
    let end = block.end;
    if (start - 1 >= cursor && /^\s*```/.test(lines[start - 1] ?? '') && /^\s*```/.test(lines[end] ?? '')) {
      start -= 1;
      end += 1;
    }
    out.push(...lines.slice(cursor, start));
    out.push('');
    for (const { depth, text } of block.labels) {
      out.push(depth === 0 ? `- **${text}**` : `${'  '.repeat(depth)}- ${text}`);
    }
    out.push('');
    cursor = end;
  }
  out.push(...lines.slice(cursor));
  return stripStrayRules(out.join('\n'));
}
