import type { Pedido } from "../models/types.js";
import { html, raw } from "../utils/dom.js";
import { formatarDataHora, formatarMoeda, plural } from "../utils/format.js";

/** Cartão de um pedido fechado, com os itens recolhíveis. */
export function cartaoPedido(p: Pedido, aberto = false): string {
  const qtd = p.itens.reduce((s, i) => s + i.quantidade, 0);
  return html`<article class="pg-order">
    <button class="pg-order-head" type="button" data-bs-toggle="collapse" data-bs-target="#pedido-${p.numero}" aria-expanded="${aberto}" aria-controls="pedido-${p.numero}">
      <span class="pg-order-num">#${p.numero}</span>
      <span class="flex-grow-1 min-w-0 text-start">
        <span class="d-block fw-bold text-truncate">${p.cliente}</span>
        <span class="d-block small text-secondary">${formatarDataHora(p.dataHora)} · ${plural(qtd, "item", "itens")}${p.telefone ? raw(html` · <i class="bi bi-telephone"></i> ${p.telefone}`) : ""}</span>
      </span>
      <span class="pg-status"><i class="bi bi-check-circle-fill"></i> ${p.status === "FECHADO" ? "Fechado" : "Aberto"}</span>
      <span class="pg-order-total">${formatarMoeda(p.total)}</span>
      <i class="bi bi-chevron-down pg-chevron"></i>
    </button>
    <div class="collapse ${aberto ? "show" : ""}" id="pedido-${p.numero}">
      <div class="pg-order-body">
        <table class="table table-sm align-middle mb-2">
          <thead><tr><th>Item</th><th class="text-center">Qtd.</th><th class="text-end">Unitário</th><th class="text-end">Subtotal</th></tr></thead>
          <tbody>
            ${p.itens.map((i) =>
              raw(html`<tr><td>${i.descricao}</td><td class="text-center">${i.quantidade}</td><td class="text-end">${formatarMoeda(i.precoUnitario)}</td><td class="text-end fw-bold">${formatarMoeda(i.subtotal)}</td></tr>`),
            )}
          </tbody>
        </table>
        <div class="small text-secondary"><i class="bi bi-circle-half me-1"></i>Regra do meio a meio: <strong>${p.estrategia.nome}</strong></div>
      </div>
    </div>
  </article>`;
}