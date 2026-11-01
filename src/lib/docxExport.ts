/**
 * Exportación a Word real (.docx) del Documento Fundante: portada, tabla de
 * contenido, índices de tablas y figuras, numeración de páginas y epígrafes APA.
 *
 * La tabla de contenido y los índices son campos de Word (TOC/SEQ), no listas
 * escritas a mano: se actualizan solos al abrir el archivo y así los números de
 * página corresponden a la paginación real de Word. Se incluyen además entradas
 * en caché para que el documento se lea aunque el usuario no acepte actualizar.
 */

import {
  AlignmentType,
  BorderStyle,
  Document,
  ExternalHyperlink,
  Footer,
  Header,
  HeadingLevel,
  ImageRun,
  LevelFormat,
  PageBreak,
  PageNumber,
  Packer,
  Paragraph,
  SequentialIdentifier,
  ShadingType,
  Table,
  TableCell,
  TableOfContents,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
  type IParagraphOptions,
  type ParagraphChild,
} from 'docx';
import {
  buildDocumentPlan,
  formatSpanishDate,
  formatTerritory,
  type DocumentMeta,
  type DocumentPlan,
  type InlineNode,
  type PlanBlock,
  type PlanListItem,
} from '@/lib/documentPlan';
import { svgToPngBytes } from '@/lib/figures';

const BRAND = '005883';
const TEXT = '1F2937';
const BORDER = '94A3B8';
const HEADER_FILL = 'EAF1F6';

/** Ancho útil de la página A4 con márgenes de una pulgada, en píxeles a 96 ppp. */
const CONTENT_WIDTH_PX = 600;

const BULLET_REFERENCE = 'cip-bullets';
const ORDERED_REFERENCE = 'cip-ordered';

function runsFrom(nodes: readonly InlineNode[], overrides: { size?: number; color?: string } = {}): ParagraphChild[] {
  const children: ParagraphChild[] = [];
  for (const node of nodes) {
    if (node.lineBreak) {
      children.push(new TextRun({ break: 1 }));
      continue;
    }
    if (!node.text) continue;
    const run = new TextRun({
      text: node.text,
      bold: node.bold,
      italics: node.italic,
      strike: node.strike,
      font: node.code ? 'Consolas' : undefined,
      highlight: node.highlight ? 'yellow' : undefined,
      color: node.href ? '1155CC' : overrides.color,
      underline: node.href ? {} : undefined,
      size: overrides.size,
    });
    children.push(node.href ? new ExternalHyperlink({ children: [run], link: node.href }) : run);
  }
  return children;
}

const HEADING_BY_DEPTH = [
  HeadingLevel.HEADING_1,
  HeadingLevel.HEADING_1,
  HeadingLevel.HEADING_2,
  HeadingLevel.HEADING_3,
  HeadingLevel.HEADING_4,
  HeadingLevel.HEADING_5,
  HeadingLevel.HEADING_6,
] as const;

function listParagraphs(items: readonly PlanListItem[], ordered: boolean, level: number, instance: number): Paragraph[] {
  const out: Paragraph[] = [];
  for (const item of items) {
    out.push(
      new Paragraph({
        children: runsFrom(item.inline),
        numbering: {
          reference: ordered ? ORDERED_REFERENCE : BULLET_REFERENCE,
          level: Math.min(level, 4),
          instance,
        },
        spacing: { after: 60 },
        alignment: AlignmentType.LEFT,
      }),
    );
    for (const child of item.children) {
      if (child.kind === 'list') {
        out.push(...listParagraphs(child.items, child.ordered, level + 1, instance));
      } else if (child.kind === 'paragraph') {
        out.push(
          new Paragraph({
            children: runsFrom(child.inline),
            indent: { left: 720 * (level + 1) },
            spacing: { after: 60 },
          }),
        );
      }
    }
  }
  return out;
}

function cellParagraph(nodes: readonly InlineNode[], bold: boolean): Paragraph {
  const options: IParagraphOptions = {
    children: bold
      ? runsFrom(nodes.map((n) => ({ ...n, bold: true })), { size: 18 })
      : runsFrom(nodes, { size: 18 }),
    spacing: { before: 20, after: 20, line: 240 },
    alignment: AlignmentType.LEFT,
  };
  return new Paragraph(options);
}

function tableFrom(block: Extract<PlanBlock, { kind: 'table' }>): Table {
  const headerRow = new TableRow({
    tableHeader: true,
    cantSplit: true,
    children: block.header.map(
      (cell) =>
        new TableCell({
          children: [cellParagraph(cell, true)],
          shading: { type: ShadingType.CLEAR, fill: HEADER_FILL },
          verticalAlign: VerticalAlign.CENTER,
        }),
    ),
  });

  const columnCount = block.header.length;
  const bodyRows = block.rows.map(
    (row, rowIndex) =>
      new TableRow({
        cantSplit: true,
        children: Array.from({ length: columnCount }, (_, i) =>
          new TableCell({
            children: [cellParagraph(row[i] ?? [], false)],
            shading: rowIndex % 2 === 1 ? { type: ShadingType.CLEAR, fill: 'F8FAFC' } : undefined,
          }),
        ),
      }),
  );

  const border = { style: BorderStyle.SINGLE, size: 4, color: BORDER };
  return new Table({
    rows: [headerRow, ...bodyRows],
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: { top: border, bottom: border, left: border, right: border, insideHorizontal: border, insideVertical: border },
  });
}

/** Epígrafe numerado con campo SEQ, para que Word arme el índice correspondiente. */
function captionParagraph(label: 'Tabla' | 'Figura', title: string): Paragraph {
  return new Paragraph({
    style: 'Caption',
    keepNext: true,
    spacing: { before: 180, after: 60 },
    children: [
      new TextRun({ text: `${label} `, bold: true }),
      new SequentialIdentifier(label),
      new TextRun({ text: '. ', bold: true }),
      new TextRun({ text: title, italics: true }),
    ],
  });
}

async function figureChildren(block: Extract<PlanBlock, { kind: 'figure' }>): Promise<Array<Paragraph>> {
  const caption = captionParagraph('Figura', block.spec.title);
  const scale = CONTENT_WIDTH_PX / block.spec.width;
  try {
    const png = await svgToPngBytes(block.spec);
    return [
      caption,
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 60 },
        children: [
          new ImageRun({
            type: 'png',
            data: png,
            transformation: { width: CONTENT_WIDTH_PX, height: Math.round(block.spec.height * scale) },
            altText: { name: block.spec.title, description: block.spec.title, title: block.spec.title },
          }),
        ],
      }),
      new Paragraph({
        spacing: { after: 180 },
        children: [new TextRun({ text: block.spec.note, italics: true, size: 18 })],
      }),
    ];
  } catch {
    // Si el navegador no puede rasterizar el SVG, la figura se sustituye por su
    // nota: es preferible una figura ausente y declarada que un hueco silencioso.
    return [
      caption,
      new Paragraph({
        spacing: { after: 180 },
        children: [
          new TextRun({
            text: `Figura no incrustada en esta descarga. ${block.spec.note}`,
            italics: true,
            size: 18,
            highlight: 'yellow',
          }),
        ],
      }),
    ];
  }
}

async function blocksToChildren(blocks: readonly PlanBlock[]): Promise<Array<Paragraph | Table | TableOfContents>> {
  const out: Array<Paragraph | Table | TableOfContents> = [];
  let orderedInstance = 0;

  for (const block of blocks) {
    switch (block.kind) {
      case 'heading':
        out.push(
          new Paragraph({
            heading: HEADING_BY_DEPTH[Math.min(block.depth, 6)],
            children: runsFrom(block.inline),
            spacing: { before: block.depth <= 2 ? 320 : 220, after: 120 },
            keepNext: true,
          }),
        );
        break;
      case 'paragraph':
        out.push(new Paragraph({ children: runsFrom(block.inline), alignment: AlignmentType.JUSTIFIED, spacing: { after: 140 } }));
        break;
      case 'list':
        if (block.ordered) orderedInstance += 1;
        out.push(...listParagraphs(block.items, block.ordered, 0, orderedInstance));
        break;
      case 'quote':
        for (const inner of block.blocks) {
          if (inner.kind === 'paragraph') {
            out.push(
              new Paragraph({
                children: runsFrom(inner.inline),
                indent: { left: 480 },
                spacing: { after: 120 },
                border: { left: { style: BorderStyle.SINGLE, size: 12, color: BRAND, space: 8 } },
              }),
            );
          } else {
            out.push(...(await blocksToChildren([inner])));
          }
        }
        break;
      case 'code':
        out.push(
          new Paragraph({
            shading: { type: ShadingType.CLEAR, fill: 'F1F5F9' },
            spacing: { after: 140 },
            children: block.text.split('\n').flatMap((line, i) => [
              ...(i > 0 ? [new TextRun({ break: 1 })] : []),
              new TextRun({ text: line, font: 'Consolas', size: 18 }),
            ]),
          }),
        );
        break;
      case 'rule':
        out.push(
          new Paragraph({
            spacing: { before: 120, after: 120 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: BORDER } },
            children: [],
          }),
        );
        break;
      case 'table':
        out.push(captionParagraph('Tabla', block.title));
        out.push(tableFrom(block));
        out.push(new Paragraph({ text: '', spacing: { after: 140 } }));
        break;
      case 'figure':
        out.push(...(await figureChildren(block)));
        break;
    }
  }
  return out;
}

function coverChildren(meta: DocumentMeta): Paragraph[] {
  const territory = formatTerritory(meta);
  const line = (text: string, options: { size: number; bold?: boolean; italics?: boolean; before?: number; color?: string }) =>
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: options.before ?? 0, after: 120 },
      children: [
        new TextRun({ text, bold: options.bold, italics: options.italics, size: options.size, color: options.color ?? TEXT }),
      ],
    });

  return [
    line('UNIVERSIDAD NACIONAL ABIERTA Y A DISTANCIA', { size: 28, bold: true, before: 1200, color: BRAND }),
    line('Vicerrectoría de Innovación y Emprendimiento', { size: 24 }),
    line('DOCUMENTO FUNDANTE', { size: 52, bold: true, before: 900, color: BRAND }),
    line('Centro de Innovación y Productividad', { size: 26 }),
    line(meta.cipName?.trim() || 'Centro de Innovación y Productividad (nombre pendiente de confirmación)', {
      size: 32,
      bold: true,
      before: 200,
    }),
    ...(meta.zonaUNAD?.trim() ? [line(meta.zonaUNAD.trim(), { size: 24 })] : []),
    ...(territory ? [line(territory, { size: 24 })] : []),
    line(
      'Versión preliminar. Los objetivos, la misión, la visión, el diseño organizacional, los indicadores, los macroservicios y la ruta de maduración son formulaciones propuestas y quedan sujetas a validación institucional.',
      { size: 20, italics: true, before: 900 },
    ),
    line(formatSpanishDate(meta.generatedAt), { size: 22, before: 600 }),
    ...(meta.generatedBy?.trim() ? [line(`Generado por ${meta.generatedBy.trim()}`, { size: 20, italics: true })] : []),
    new Paragraph({ children: [new PageBreak()] }),
  ];
}

function indexHeading(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 240, after: 160 },
    children: [new TextRun({ text, bold: true, size: 32, color: BRAND })],
    // Fuera del esquema: los índices no deben aparecer dentro de la tabla de contenido.
    outlineLevel: 9,
  });
}

function frontMatter(plan: DocumentPlan): Array<Paragraph | TableOfContents> {
  const headingEntries = plan.blocks
    .filter((b): b is Extract<PlanBlock, { kind: 'heading' }> => b.kind === 'heading' && b.depth <= 3)
    .map((b) => ({ title: b.plainText, level: Math.max(1, b.depth - 1) }));

  const children: Array<Paragraph | TableOfContents> = [
    indexHeading('Tabla de contenido'),
    new TableOfContents('Tabla de contenido', {
      hyperlink: true,
      headingStyleRange: '1-3',
      cachedEntries: headingEntries,
    }),
  ];

  if (plan.tables.length > 0) {
    children.push(
      new Paragraph({ children: [new PageBreak()] }),
      indexHeading('Índice de tablas'),
      new TableOfContents('Índice de tablas', {
        hyperlink: true,
        // `captionLabelIncludingNumbers` genera `TOC \c`, que conserva «Tabla N.» en
        // la entrada del índice; `captionLabel` (`\a`) la omitiría.
        captionLabelIncludingNumbers: 'Tabla',
        cachedEntries: plan.tables.map((t) => ({ title: `Tabla ${t.number}. ${t.title}`, level: 1 })),
      }),
    );
  }

  if (plan.figures.length > 0) {
    children.push(
      indexHeading('Índice de figuras'),
      new TableOfContents('Índice de figuras', {
        hyperlink: true,
        captionLabelIncludingNumbers: 'Figura',
        cachedEntries: plan.figures.map((f) => ({ title: `Figura ${f.number}. ${f.title}`, level: 1 })),
      }),
    );
  }

  children.push(new Paragraph({ children: [new PageBreak()] }));
  return children;
}

/** Encabezado y pie compartidos por el cuerpo del documento. */
function bodyHeaderFooter(meta: DocumentMeta): { header: Header; footer: Footer } {
  const runningTitle = [meta.cipName?.trim() || 'Documento Fundante del CIP', meta.zonaUNAD?.trim()]
    .filter(Boolean)
    .join(' · ');
  return {
    header: new Header({
      children: [
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          spacing: { after: 60 },
          children: [new TextRun({ text: runningTitle, size: 18, color: '64748B' })],
        }),
      ],
    }),
    footer: new Footer({
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: 'Página ', size: 18, color: '64748B' }),
            new TextRun({ children: [PageNumber.CURRENT], size: 18, color: '64748B' }),
            new TextRun({ text: ' de ', size: 18, color: '64748B' }),
            new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18, color: '64748B' }),
          ],
        }),
      ],
    }),
  };
}

function documentStyles() {
  const heading = (size: number, color: string) => ({
    run: { size, bold: true, color, font: 'Calibri' },
    paragraph: { spacing: { before: 280, after: 120 }, keepNext: true },
  });
  return {
    default: {
      document: {
        run: { font: 'Calibri', size: 22, color: TEXT },
        paragraph: { spacing: { line: 300, after: 140 }, alignment: AlignmentType.JUSTIFIED },
      },
      heading1: heading(32, BRAND),
      heading2: heading(28, BRAND),
      heading3: heading(24, '1E3A5F'),
      heading4: heading(22, '334155'),
      heading5: heading(22, '334155'),
      heading6: heading(22, '334155'),
    },
    paragraphStyles: [
      {
        id: 'Caption',
        name: 'Caption',
        basedOn: 'Normal',
        next: 'Normal',
        quickFormat: true,
        run: { size: 20, color: TEXT },
        paragraph: { spacing: { before: 180, after: 60 }, alignment: AlignmentType.LEFT },
      },
    ],
  };
}

function numberingConfig() {
  const bulletLevels = ['•', '◦', '▪', '·', '–'].map((text, level) => ({
    level,
    format: LevelFormat.BULLET,
    text,
    alignment: AlignmentType.LEFT,
    style: { paragraph: { indent: { left: 480 + level * 360, hanging: 260 } } },
  }));
  const orderedFormats = [LevelFormat.DECIMAL, LevelFormat.LOWER_LETTER, LevelFormat.LOWER_ROMAN, LevelFormat.DECIMAL, LevelFormat.LOWER_LETTER];
  const orderedLevels = orderedFormats.map((format, level) => ({
    level,
    format,
    text: `%${level + 1}.`,
    alignment: AlignmentType.LEFT,
    style: { paragraph: { indent: { left: 480 + level * 360, hanging: 300 } } },
  }));
  return {
    config: [
      { reference: BULLET_REFERENCE, levels: bulletLevels },
      { reference: ORDERED_REFERENCE, levels: orderedLevels },
    ],
  };
}

/** Genera el archivo .docx completo, listo para descargar. */
export async function buildFundanteDocxBlob(plan: DocumentPlan, meta: DocumentMeta): Promise<Blob> {
  const body = await blocksToChildren(plan.blocks);
  const { header, footer } = bodyHeaderFooter(meta);
  const page = { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } };

  const doc = new Document({
    title: `Documento Fundante — ${meta.cipName || 'CIP'}`,
    creator: meta.generatedBy?.trim() || 'Universidad Nacional Abierta y a Distancia',
    description: 'Documento Fundante de Centro de Innovación y Productividad (versión preliminar sujeta a validación institucional)',
    // Word actualiza los campos TOC/SEQ al abrir el archivo.
    features: { updateFields: true },
    styles: documentStyles(),
    numbering: numberingConfig(),
    sections: [
      { properties: { page }, children: coverChildren(meta) },
      {
        properties: { page: { ...page, pageNumbers: { start: 1 } } },
        headers: { default: header },
        footers: { default: footer },
        children: [...frontMatter(plan), ...body],
      },
    ],
  });

  return Packer.toBlob(doc);
}

/**
 * Genera un archivo Word (.docx) editable para entregables individuales de cualquier fase
 * (Estudio Territorial / Contenedor 2, Vocación y Temas, Árbol de Innovación).
 */
export async function buildGenericDocxBlob({
  title,
  subtitle,
  markdown,
  meta,
}: {
  title: string;
  subtitle?: string;
  markdown: string;
  meta: DocumentMeta;
}): Promise<Blob> {
  const plan = buildDocumentPlan(markdown);
  const body = await blocksToChildren(plan.blocks);
  const { header, footer } = bodyHeaderFooter(meta);
  const page = { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } };

  const territory = formatTerritory(meta);
  const headerBlocks: Paragraph[] = [
    new Paragraph({
      spacing: { before: 180, after: 80 },
      children: [new TextRun({ text: title, bold: true, size: 36, color: BRAND, font: 'Calibri' })],
    }),
    ...(subtitle
      ? [
          new Paragraph({
            spacing: { before: 0, after: 100 },
            children: [new TextRun({ text: subtitle, size: 22, italics: true, color: '475569', font: 'Calibri' })],
          }),
        ]
      : []),
    new Paragraph({
      spacing: { before: 0, after: 260 },
      children: [
        new TextRun({
          text: `Universidad Nacional Abierta y a Distancia (UNAD)${meta.zonaUNAD ? ` · ${meta.zonaUNAD}` : ''}${territory ? ` · ${territory}` : ''} · ${formatSpanishDate(meta.generatedAt)}`,
          size: 18,
          color: '64748B',
          font: 'Calibri',
        }),
      ],
    }),
  ];

  const doc = new Document({
    title: `${title} — ${meta.cipName || 'CIP'}`,
    creator: meta.generatedBy?.trim() || 'Universidad Nacional Abierta y a Distancia',
    description: subtitle || title,
    features: { updateFields: true },
    styles: documentStyles(),
    numbering: numberingConfig(),
    sections: [
      {
        properties: { page: { ...page, pageNumbers: { start: 1 } } },
        headers: { default: header },
        footers: { default: footer },
        children: [...headerBlocks, ...body],
      },
    ],
  });

  return Packer.toBlob(doc);
}

/** Dispara la descarga del archivo Word (.docx) en el navegador del usuario. */
export function downloadDocxBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  document.body.appendChild(link);
  link.href = url;
  link.download = filename.endsWith('.docx') ? filename : `${filename}.docx`;
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
