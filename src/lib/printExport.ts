/**
 * Salida de impresión (PDF) construida desde el mismo plan de documento que el
 * .docx, para que ambas descargas tengan la misma portada, la misma numeración de
 * tablas y figuras y los mismos epígrafes. La diferencia es que aquí los números de
 * página los pone el navegador al imprimir, así que los índices no los incluyen.
 */

import {
  formatSpanishDate,
  formatTerritory,
  type DocumentMeta,
  type DocumentPlan,
  type InlineNode,
  type PlanBlock,
  type PlanListItem,
} from '@/lib/documentPlan';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function inlineToHtml(nodes: readonly InlineNode[]): string {
  return nodes
    .map((node) => {
      if (node.lineBreak) return '<br/>';
      if (!node.text) return '';
      let html = escapeHtml(node.text);
      if (node.code) html = `<code>${html}</code>`;
      if (node.bold) html = `<strong>${html}</strong>`;
      if (node.italic) html = `<em>${html}</em>`;
      if (node.strike) html = `<s>${html}</s>`;
      if (node.highlight) html = `<mark>${html}</mark>`;
      if (node.href) html = `<a href="${escapeHtml(node.href)}">${html}</a>`;
      return html;
    })
    .join('');
}

function listToHtml(items: readonly PlanListItem[], ordered: boolean): string {
  const tag = ordered ? 'ol' : 'ul';
  const body = items
    .map((item) => {
      const nested = item.children.map(blockToHtml).join('');
      return `<li>${inlineToHtml(item.inline)}${nested}</li>`;
    })
    .join('');
  return `<${tag}>${body}</${tag}>`;
}

function slugFor(kind: 'tabla' | 'figura', number: number): string {
  return `${kind}-${number}`;
}

function blockToHtml(block: PlanBlock): string {
  switch (block.kind) {
    case 'heading': {
      const depth = Math.min(Math.max(block.depth, 1), 6);
      return `<h${depth} id="${escapeHtml(headingSlug(block.plainText))}">${inlineToHtml(block.inline)}</h${depth}>`;
    }
    case 'paragraph':
      return `<p>${inlineToHtml(block.inline)}</p>`;
    case 'list':
      return listToHtml(block.items, block.ordered);
    case 'quote':
      return `<blockquote>${block.blocks.map(blockToHtml).join('')}</blockquote>`;
    case 'code':
      return `<pre><code>${escapeHtml(block.text)}</code></pre>`;
    case 'rule':
      return '<hr/>';
    case 'table': {
      const head = `<tr>${block.header.map((cell) => `<th>${inlineToHtml(cell)}</th>`).join('')}</tr>`;
      const body = block.rows
        .map((row) => `<tr>${row.map((cell) => `<td>${inlineToHtml(cell)}</td>`).join('')}</tr>`)
        .join('');
      return `<div class="table-block"><p class="caption" id="${slugFor('tabla', block.number)}"><strong>Tabla ${block.number}.</strong> <em>${escapeHtml(
        block.title,
      )}</em></p><table><thead>${head}</thead><tbody>${body}</tbody></table></div>`;
    }
    case 'figure':
      return `<figure id="${slugFor('figura', block.number)}"><p class="caption"><strong>Figura ${block.number}.</strong> <em>${escapeHtml(
        block.spec.title,
      )}</em></p><div class="figure-canvas">${block.spec.svg}</div><figcaption>${escapeHtml(block.spec.note)}</figcaption></figure>`;
  }
}

function headingSlug(text: string): string {
  return `sec-${text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60)}`;
}

function coverHtml(meta: DocumentMeta): string {
  const territory = formatTerritory(meta);
  return `<section class="cover">
    <p class="cover-institution">UNIVERSIDAD NACIONAL ABIERTA Y A DISTANCIA</p>
    <p class="cover-unit">Vicerrectoría de Innovación y Emprendimiento</p>
    <p class="cover-title">DOCUMENTO FUNDANTE</p>
    <p class="cover-subtitle">Centro de Innovación y Productividad</p>
    <p class="cover-cip">${escapeHtml(meta.cipName?.trim() || 'Centro de Innovación y Productividad (nombre pendiente de confirmación)')}</p>
    ${meta.zonaUNAD?.trim() ? `<p class="cover-line">${escapeHtml(meta.zonaUNAD.trim())}</p>` : ''}
    ${territory ? `<p class="cover-line">${escapeHtml(territory)}</p>` : ''}
    <p class="cover-disclaimer">Versión preliminar. Los objetivos, la misión, la visión, el diseño organizacional, los indicadores, los macroservicios y la ruta de maduración son formulaciones propuestas y quedan sujetas a validación institucional.</p>
    <p class="cover-line">${escapeHtml(formatSpanishDate(meta.generatedAt))}</p>
    ${meta.generatedBy?.trim() ? `<p class="cover-by">Generado por ${escapeHtml(meta.generatedBy.trim())}</p>` : ''}
  </section>`;
}

function frontMatterHtml(plan: DocumentPlan): string {
  const headings = plan.blocks.filter(
    (b): b is Extract<PlanBlock, { kind: 'heading' }> => b.kind === 'heading' && b.depth <= 3,
  );
  const toc = headings
    .map(
      (h) =>
        `<li class="toc-level-${h.depth}"><a href="#${escapeHtml(headingSlug(h.plainText))}">${escapeHtml(h.plainText)}</a></li>`,
    )
    .join('');

  const tables = plan.tables
    .map((t) => `<li><a href="#${slugFor('tabla', t.number)}">Tabla ${t.number}. ${escapeHtml(t.title)}</a></li>`)
    .join('');
  const figures = plan.figures
    .map((f) => `<li><a href="#${slugFor('figura', f.number)}">Figura ${f.number}. ${escapeHtml(f.title)}</a></li>`)
    .join('');

  return `<section class="front-matter">
    <h1 class="index-title">Tabla de contenido</h1>
    <ul class="toc">${toc}</ul>
    ${tables ? `<h1 class="index-title">Índice de tablas</h1><ul class="toc">${tables}</ul>` : ''}
    ${figures ? `<h1 class="index-title">Índice de figuras</h1><ul class="toc">${figures}</ul>` : ''}
  </section>`;
}

const PRINT_CSS = `
  @page { size: A4; margin: 25mm 20mm; }
  body { font-family: 'Calibri', 'Segoe UI', Arial, sans-serif; line-height: 1.55; color: #1f2937; font-size: 12.5px; margin: 0; }
  h1 { font-size: 20px; color: #005883; border-bottom: 2px solid #005883; padding-bottom: 5px; margin: 22px 0 12px; page-break-after: avoid; }
  h2 { font-size: 17px; color: #005883; margin: 18px 0 8px; page-break-after: avoid; }
  h3 { font-size: 14.5px; color: #1e3a5f; margin: 14px 0 6px; page-break-after: avoid; }
  h4, h5, h6 { font-size: 13px; color: #334155; margin: 12px 0 4px; page-break-after: avoid; }
  p { margin: 0 0 9px; text-align: justify; }
  ul, ol { margin: 0 0 12px; padding-left: 22px; }
  li { margin-bottom: 3px; }
  mark { background: #fef08a; }
  blockquote { border-left: 4px solid #005883; background: #f1f7fa; padding: 8px 14px; margin: 0 0 12px; }
  .table-block { page-break-inside: avoid; margin-bottom: 14px; }
  table { width: 100%; border-collapse: collapse; font-size: 10.5px; }
  thead { display: table-header-group; }
  tr { page-break-inside: avoid; }
  th, td { border: 1px solid #94a3b8; padding: 4px 7px; text-align: left; vertical-align: top; word-break: break-word; }
  th { background: #eaf1f6; color: #0f172a; }
  p.caption { margin: 0 0 4px; font-size: 11.5px; }
  figure { margin: 14px 0 18px; page-break-inside: avoid; }
  .figure-canvas svg { width: 100%; height: auto; }
  figcaption { font-size: 10.5px; font-style: italic; color: #475569; margin-top: 4px; }
  pre { background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 12px; font-size: 11px; white-space: pre-wrap; page-break-inside: avoid; }
  code { font-family: Consolas, 'Courier New', monospace; font-size: 11px; }
  hr { border: none; border-top: 1px solid #cbd5e1; margin: 14px 0; }
  .cover { height: 247mm; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; page-break-after: always; }
  .cover p { text-align: center; margin: 0 0 10px; }
  .cover-institution { font-size: 19px; font-weight: 700; color: #005883; letter-spacing: .4px; }
  .cover-unit { font-size: 14px; }
  .cover-title { font-size: 40px; font-weight: 700; color: #005883; margin-top: 34px !important; letter-spacing: 1px; }
  .cover-subtitle { font-size: 16px; }
  .cover-cip { font-size: 22px; font-weight: 700; margin-top: 10px !important; }
  .cover-line { font-size: 14px; }
  .cover-disclaimer { font-size: 11px; font-style: italic; max-width: 125mm; margin-top: 34px !important; color: #475569; }
  .cover-by { font-size: 11px; font-style: italic; color: #475569; }
  .front-matter { page-break-after: always; }
  .index-title { border-bottom: none; }
  ul.toc { list-style: none; padding-left: 0; }
  ul.toc li { margin-bottom: 3px; }
  ul.toc a { color: #1f2937; text-decoration: none; }
  ul.toc li.toc-level-3 { padding-left: 16px; font-size: 12px; color: #334155; }
`;

/** Documento HTML completo para abrir en la ventana de impresión del navegador. */
export function buildPrintHtml(plan: DocumentPlan, meta: DocumentMeta): string {
  const title = `Documento Fundante — ${meta.cipName?.trim() || 'CIP'}`;
  const body = plan.blocks.map(blockToHtml).join('\n');
  return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>${PRINT_CSS}</style></head><body>${coverHtml(
    meta,
  )}${frontMatterHtml(plan)}<main>${body}</main></body></html>`;
}
