import{f as d,a as f}from"./index-BcilhMRS.js";function r(e){return e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function l(e){return e.map(t=>{if(t.lineBreak)return"<br/>";if(!t.text)return"";let i=r(t.text);return t.code&&(i=`<code>${i}</code>`),t.bold&&(i=`<strong>${i}</strong>`),t.italic&&(i=`<em>${i}</em>`),t.strike&&(i=`<s>${i}</s>`),t.highlight&&(i=`<mark>${i}</mark>`),t.href&&(i=`<a href="${r(t.href)}">${i}</a>`),i}).join("")}function g(e,t){const i=t?"ol":"ul",o=e.map(n=>{const a=n.children.map(p).join("");return`<li>${l(n.inline)}${a}</li>`}).join("");return`<${i}>${o}</${i}>`}function s(e,t){return`${e}-${t}`}function p(e){switch(e.kind){case"heading":{const t=Math.min(Math.max(e.depth,1),6);return`<h${t} id="${r(c(e.plainText))}">${l(e.inline)}</h${t}>`}case"paragraph":return`<p>${l(e.inline)}</p>`;case"list":return g(e.items,e.ordered);case"quote":return`<blockquote>${e.blocks.map(p).join("")}</blockquote>`;case"code":return`<pre><code>${r(e.text)}</code></pre>`;case"rule":return"<hr/>";case"table":{const t=`<tr>${e.header.map(o=>`<th>${l(o)}</th>`).join("")}</tr>`,i=e.rows.map(o=>`<tr>${o.map(n=>`<td>${l(n)}</td>`).join("")}</tr>`).join("");return`<div class="table-block"><p class="caption" id="${s("tabla",e.number)}"><strong>Tabla ${e.number}.</strong> <em>${r(e.title)}</em></p><table><thead>${t}</thead><tbody>${i}</tbody></table></div>`}case"figure":return`<figure id="${s("figura",e.number)}"><p class="caption"><strong>Figura ${e.number}.</strong> <em>${r(e.spec.title)}</em></p><div class="figure-canvas">${e.spec.svg}</div><figcaption>${r(e.spec.note)}</figcaption></figure>`}}function c(e){return`sec-${e.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"").slice(0,60)}`}function u(e){var i,o;const t=d(e);return`<section class="cover">
    <p class="cover-institution">UNIVERSIDAD NACIONAL ABIERTA Y A DISTANCIA</p>
    <p class="cover-unit">Vicerrectoría de Innovación y Emprendimiento</p>
    <p class="cover-unit">Observatorio InnovaHub360 · Laboratorio de Innovación en Línea</p>
    <p class="cover-title">${r(e.reportType)}</p>
    <p class="cover-lab">${r(e.title)}</p>
    ${(i=e.subtitle)!=null&&i.trim()?`<p class="cover-subtitle">${r(e.subtitle.trim())}</p>`:""}
    ${(o=e.zonaUNAD)!=null&&o.trim()?`<p class="cover-line">${r(e.zonaUNAD.trim())}</p>`:""}
    ${t?`<p class="cover-line">${r(t)}</p>`:""}
    <p class="cover-disclaimer">${r(e.disclaimer)}</p>
    <p class="cover-line">${r(f(e.generatedAt))}</p>
  </section>`}function m(e){const i=e.blocks.filter(a=>a.kind==="heading"&&a.depth<=3).map(a=>`<li class="toc-level-${a.depth}"><a href="#${r(c(a.plainText))}">${r(a.plainText)}</a></li>`).join(""),o=e.tables.map(a=>`<li><a href="#${s("tabla",a.number)}">Tabla ${a.number}. ${r(a.title)}</a></li>`).join(""),n=e.figures.map(a=>`<li><a href="#${s("figura",a.number)}">Figura ${a.number}. ${r(a.title)}</a></li>`).join("");return`<section class="front-matter">
    <h1 class="index-title">Tabla de contenido</h1>
    <ul class="toc">${i}</ul>
    ${o?`<h1 class="index-title">Índice de tablas</h1><ul class="toc">${o}</ul>`:""}
    ${n?`<h1 class="index-title">Índice de figuras</h1><ul class="toc">${n}</ul>`:""}
  </section>`}const x=`
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
  .cover-title { font-size: 32px; font-weight: 700; color: #005883; margin-top: 34px !important; letter-spacing: 1px; }
  .cover-subtitle { font-size: 16px; }
  .cover-lab { font-size: 22px; font-weight: 700; margin-top: 10px !important; }
  .cover-line { font-size: 14px; }
  .cover-disclaimer { font-size: 11px; font-style: italic; max-width: 125mm; margin-top: 34px !important; color: #475569; }
  .cover-by { font-size: 11px; font-style: italic; color: #475569; }
  .front-matter { page-break-after: always; }
  .index-title { border-bottom: none; }
  ul.toc { list-style: none; padding-left: 0; }
  ul.toc li { margin-bottom: 3px; }
  ul.toc a { color: #1f2937; text-decoration: none; }
  ul.toc li.toc-level-3 { padding-left: 16px; font-size: 12px; color: #334155; }
`;function h(e,t){const i=`${t.reportType} — ${t.title}`,o=e.blocks.map(p).join(`
`);return`<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>${r(i)}</title><style>${x}</style></head><body>${u(t)}${m(e)}<main>${o}</main></body></html>`}export{h as buildPrintHtml};
