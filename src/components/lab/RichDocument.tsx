import React, { useMemo, useState } from 'react';
import { AlertTriangle, ChevronDown } from 'lucide-react';
import { buildDocumentPlan, type InlineNode, type PlanBlock } from '@/lib/documentPlan';

/** Texto en línea sin HTML inyectado: el Markdown viene de la IA y no es confiable. */
export const InlineText: React.FC<{ nodes: readonly InlineNode[] }> = ({ nodes }) => (
  <>
    {nodes.map((n, i) => {
      if (n.lineBreak) return <br key={i} />;
      if (!n.text) return null;
      let el: React.ReactNode = n.code ? <code className="lab-code">{n.text}</code> : n.text;
      if (n.bold) el = <strong className="font-semibold text-white">{el}</strong>;
      if (n.italic) el = <em>{el}</em>;
      if (n.strike) el = <s>{el}</s>;
      if (n.highlight) el = <mark className="lab-alert-inline">{el}</mark>;
      if (n.href && /^https?:/i.test(n.href)) {
        el = (
          <a href={n.href} target="_blank" rel="noopener noreferrer" className="text-[var(--brand-teal-text)] underline break-all">
            {el}
          </a>
        );
      }
      return <React.Fragment key={i}>{el}</React.Fragment>;
    })}
  </>
);

/** Párrafo que solo trae una alerta de verificación: se presenta como aviso destacado. */
function isAlertOnly(nodes: readonly InlineNode[]): boolean {
  const filled = nodes.filter((n) => n.text.trim());
  return filled.length > 0 && filled.every((n) => n.highlight);
}

const Block: React.FC<{ block: PlanBlock }> = ({ block }) => {
  switch (block.kind) {
    case 'heading':
      return (
        <h4 className="text-sm font-bold text-white sy mt-3">
          <InlineText nodes={block.inline} />
        </h4>
      );
    case 'paragraph':
      if (isAlertOnly(block.inline)) {
        return (
          <div className="lab-callout" role="note">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
            <span>
              {block.inline
                .map((n) => n.text)
                .join('')
                .replace(/^⚠️\s*/, '')}
            </span>
          </div>
        );
      }
      return (
        <p className="text-sm leading-relaxed text-brand-textSecondary">
          <InlineText nodes={block.inline} />
        </p>
      );
    case 'list': {
      const Tag = block.ordered ? 'ol' : 'ul';
      return (
        <Tag className={`text-sm leading-relaxed text-brand-textSecondary space-y-1.5 pl-5 ${block.ordered ? 'list-decimal' : 'list-disc'}`}>
          {block.items.map((item, i) => (
            <li key={i}>
              <InlineText nodes={item.inline} />
              {item.children.map((c, j) => (
                <Block key={j} block={c} />
              ))}
            </li>
          ))}
        </Tag>
      );
    }
    case 'quote':
      return (
        <blockquote className="border-l-2 border-[var(--brand-teal-text)] pl-3 space-y-2">
          {block.blocks.map((b, i) => (
            <Block key={i} block={b} />
          ))}
        </blockquote>
      );
    case 'code':
      return <pre className="lab-code text-xs whitespace-pre-wrap p-3 rounded-lg">{block.text}</pre>;
    case 'rule':
      return null;
    case 'table':
      return <DataTable title={block.title} header={block.header} rows={block.rows} />;
    case 'figure':
      return null;
  }
};

/** Tabla con desplazamiento propio: el ancho de la tabla nunca desborda la página. */
export const DataTable: React.FC<{ title?: string; header: InlineNode[][]; rows: InlineNode[][][] }> = ({ title, header, rows }) => (
  <figure className="space-y-1.5">
    {title && <figcaption className="text-xs font-semibold text-brand-textMuted">{title}</figcaption>}
    <div className="lab-table-wrap">
      <table className="lab-table">
        <thead>
          <tr>
            {header.map((cell, i) => (
              <th key={i} scope="col">
                <InlineText nodes={cell} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j}>
                  <InlineText nodes={cell} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </figure>
);

export const Disclosure: React.FC<{ title: React.ReactNode; defaultOpen?: boolean; children: React.ReactNode }> = ({ title, defaultOpen, children }) => {
  const [open, setOpen] = useState(Boolean(defaultOpen));
  return (
    <div className="lab-disclosure">
      <button type="button" className="lab-disclosure-head" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <span className="min-w-0">{title}</span>
        <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      {open && <div className="lab-disclosure-body">{children}</div>}
    </div>
  );
};

/** Parte los bloques por subtítulos para que cada uno se pueda plegar. */
export function groupByHeading(blocks: readonly PlanBlock[], depth = 3): Array<{ title: InlineNode[] | null; plain: string; blocks: PlanBlock[] }> {
  const groups: Array<{ title: InlineNode[] | null; plain: string; blocks: PlanBlock[] }> = [{ title: null, plain: '', blocks: [] }];
  for (const block of blocks) {
    if (block.kind === 'heading' && block.depth <= depth) {
      groups.push({ title: block.inline, plain: block.plainText, blocks: [] });
    } else {
      groups[groups.length - 1].blocks.push(block);
    }
  }
  return groups.filter((g) => g.title || g.blocks.length);
}

/**
 * Lectura interactiva de cualquier resultado: los subtítulos se pliegan, las tablas se
 * desplazan y las alertas se destacan. El texto corrido y el Markdown crudo no llegan a pantalla.
 */
export const RichDocument: React.FC<{ markdown: string; dropTitle?: boolean }> = ({ markdown, dropTitle }) => {
  const groups = useMemo(() => {
    const { blocks } = buildDocumentPlan(markdown);
    // El título del bloque ya lo muestra la tarjeta que contiene al documento.
    const visible = dropTitle ? blocks.filter((b) => !(b.kind === 'heading' && b.depth <= 2)) : blocks;
    return groupByHeading(visible);
  }, [markdown, dropTitle]);

  return (
    <div className="space-y-3">
      {groups.map((group, i) =>
        group.title ? (
          <Disclosure
            key={i}
            defaultOpen={groups.length <= 3}
            title={
              <span className="font-semibold text-white sy text-sm">
                <InlineText nodes={group.title} />
              </span>
            }
          >
            <div className="space-y-3">
              {group.blocks.map((b, j) => (
                <Block key={j} block={b} />
              ))}
            </div>
          </Disclosure>
        ) : (
          <div key={i} className="space-y-3">
            {group.blocks.map((b, j) => (
              <Block key={j} block={b} />
            ))}
          </div>
        ),
      )}
    </div>
  );
};
