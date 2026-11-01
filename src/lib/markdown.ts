import { Marked, type TokenizerAndRendererExtension } from 'marked';
import { normalizeAsciiDiagrams } from '@/lib/formatMarkdownDoc';

/**
 * `==texto==` es la marca de alerta de verificación humana que usan los prompts
 * institucionales del proceso. No es Markdown estándar: sin esta extensión el líder de
 * zona vería los signos de igual crudos en pantalla, mientras que las descargas de Word y
 * PDF sí la resaltan en amarillo (ver `documentPlan.ts`).
 *
 * Vive en una instancia propia de `marked` para no alterar el analizador global, del que
 * depende esa exportación: allí las alertas deben seguir llegando como texto con `==`.
 */
const humanReviewHighlight: TokenizerAndRendererExtension = {
  name: 'humanReviewHighlight',
  level: 'inline',
  start(src) {
    return src.indexOf('==');
  },
  tokenizer(src) {
    const match = /^==(?!=)([^=]+)==/.exec(src);
    if (!match) return undefined;
    return {
      type: 'humanReviewHighlight',
      raw: match[0],
      tokens: this.lexer.inlineTokens(match[1]),
    };
  },
  renderer(token) {
    return `<mark>${this.parser.parseInline(token.tokens ?? [])}</mark>`;
  },
};

const screenRenderer = new Marked().use({ extensions: [humanReviewHighlight] });

/**
 * Etiquetas permitidas en el HTML que se inyecta en pantalla. El Markdown viene
 * de la IA y de documentos de Drive, así que puede traer HTML incrustado: solo
 * se conserva lo que produce Markdown legítimo.
 */
const ALLOWED_TAGS = new Set([
  'a', 'blockquote', 'br', 'code', 'del', 'em', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'hr', 'img', 'input', 'li', 'mark', 'ol', 'p', 'pre', 'span', 'strong', 'sub', 'sup',
  'table', 'tbody', 'td', 'tfoot', 'th', 'thead', 'tr', 'ul',
]);

/** Etiquetas que se eliminan con todo su contenido (no se «desenvuelven»). */
const DROP_TAGS = new Set(['script', 'style', 'iframe', 'object', 'embed', 'form', 'link', 'meta']);

const ALLOWED_ATTRS: Record<string, string[]> = {
  a: ['href', 'title'],
  img: ['src', 'alt', 'title'],
  // Casillas de las listas de tareas de Markdown (`- [x] …`), siempre deshabilitadas.
  input: ['type', 'checked', 'disabled'],
  td: ['colspan', 'rowspan', 'align'],
  th: ['colspan', 'rowspan', 'align'],
};

const SAFE_URL = /^(https?:|mailto:|tel:|#|\/|\.\/|\.\.\/)/i;

/**
 * Limpia el HTML generado: quita etiquetas peligrosas, atributos no permitidos
 * (incluidos los `on*`) y URLs que no sean http(s), mailto, tel o relativas.
 */
export function sanitizeHtml(html: string): string {
  // El documento del DOMParser es inerte: nada del HTML analizado se ejecuta.
  const doc = new DOMParser().parseFromString('<!doctype html><body></body>', 'text/html');
  const root = doc.createElement('div');
  root.innerHTML = html;

  const visit = (element: Element) => {
    // Copia: la lista viva cambia al desenvolver o eliminar nodos.
    [...element.children].forEach((child) => {
      const tag = child.tagName.toLowerCase();

      if (DROP_TAGS.has(tag)) {
        child.remove();
        return;
      }

      if (!ALLOWED_TAGS.has(tag)) {
        // Etiqueta desconocida: se conserva el texto y se descarta el envoltorio.
        visit(child);
        child.replaceWith(...child.childNodes);
        return;
      }

      const allowed = ALLOWED_ATTRS[tag] ?? [];
      [...child.attributes].forEach((attr) => {
        const name = attr.name.toLowerCase();
        if (!allowed.includes(name)) {
          child.removeAttribute(attr.name);
          return;
        }
        if ((name === 'href' || name === 'src') && !SAFE_URL.test(attr.value.trim())) {
          child.removeAttribute(attr.name);
        }
      });

      // Los enlaces se abren aparte: navegar en la misma pestaña perdería el trabajo en curso.
      if (tag === 'a' && child.hasAttribute('href')) {
        child.setAttribute('rel', 'noopener noreferrer');
        child.setAttribute('target', '_blank');
      }
      if (tag === 'input') child.setAttribute('disabled', '');

      visit(child);
    });
  };

  visit(root);
  return root.innerHTML;
}

/**
 * Única conversión Markdown → HTML de la aplicación (hoja tipo Word, resúmenes
 * del árbol de innovación, etc.): normaliza los diagramas ASCII, renderiza con
 * `marked` y desinfecta el resultado antes de inyectarlo.
 */
export function markdownToHtml(markdown: string): string {
  const html = screenRenderer.parse(normalizeAsciiDiagrams(markdown), { async: false }) as string;
  try {
    return sanitizeHtml(html);
  } catch (e) {
    // Antes de mostrar HTML sin revisar, se muestra el texto plano del documento.
    console.error('[markdown] No se pudo desinfectar el HTML; se muestra como texto.', e);
    const escaped = html.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c] as string);
    return `<pre>${escaped}</pre>`;
  }
}
