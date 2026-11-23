import { html, raw } from "../utils/dom.js";

export function estadoVazio(icone: string, titulo: string, texto: string, acao?: { rotulo: string; href: string }): string {
  return html`<div class="pg-empty">
    <div class="pg-icon-circle pg-icon-circle-lg mb-3">${raw(icone.startsWith("<") ? icone : `<i class="bi ${icone}"></i>`)}</div>
    <h3 class="h6 fw-bold mb-1">${titulo}</h3>
    <p class="text-secondary small mb-3">${texto}</p>
    ${acao ? raw(html`<a class="btn btn-primary btn-sm" href="${acao.href}">${acao.rotulo}</a>`) : ""}
  </div>`;
}

export const carregando = (texto = "Carregando..."): string =>
  html`<div class="pg-loading"><div class="spinner-border spinner-border-sm text-danger" role="status"></div><span>${texto}</span></div>`;

/** Cabeçalho das telas, no estilo dos slides (kicker laranja + título). */
export function cabecalho(kicker: string, titulo: string, extra = ""): string {
  return html`<header class="pg-page-header">
    <div>
      <div class="pg-kicker">${kicker}</div>
      <h1 class="pg-title">${titulo}</h1>
    </div>
    ${raw(extra)}
  </header>`;
}
