/** Tela "Relatório de vendas" (somente administrador; o back-end também verifica o perfil). */
import { api } from "../services/api.js";
import type { Relatorio } from "../models/types.js";
import { cabecalho, carregando, estadoVazio } from "../components/empty-state.js";
import { cartaoPedido } from "../components/pedido-card.js";
import { html, raw } from "../utils/dom.js";
import { formatarMoeda } from "../utils/format.js";

export async function telaRelatorio(raiz: HTMLElement): Promise<void> {
  const topo = cabecalho("Vendas", "Relatório de vendas", `<button class="btn btn-light pg-btn-soft" id="atualizar"><i class="bi bi-arrow-repeat me-1"></i> Atualizar</button>`);

  async function carregar(): Promise<void> {
    raiz.innerHTML = topo + carregando("Gerando relatório...");
    let r: Relatorio;
    try {
      r = await api.relatorio();
    } catch (e) {
      raiz.innerHTML = topo + estadoVazio("bi-shield-lock", "Relatório indisponível", e instanceof Error ? e.message : "");
      return;
    }
    const itensVendidos = r.pedidos.reduce((s, p) => s + p.itens.reduce((a, i) => a + i.quantidade, 0), 0);
    const ticket = r.totalPedidos ? r.faturamentoTotal / r.totalPedidos : 0;
    const kpi = (icone: string, rotulo: string, valor: string, destaque = false) =>
      raw(html`<div class="col-6 col-lg-3"><div class="pg-kpi ${destaque ? "pg-kpi-red" : ""}">
        <div class="pg-icon-circle pg-icon-circle-sm"><i class="bi ${icone}"></i></div>
        <div class="pg-kpi-value">${valor}</div>
        <div class="pg-kpi-label">${rotulo}</div>
      </div></div>`);

    raiz.innerHTML = html`${raw(topo)}
      <div class="row g-3 mb-4">
        ${kpi("bi-cash-stack", "Faturamento total", formatarMoeda(r.faturamentoTotal), true)}
        ${kpi("bi-receipt", "Pedidos fechados", String(r.totalPedidos))}
        ${kpi("bi-graph-up-arrow", "Ticket médio", formatarMoeda(ticket))}
        ${kpi("bi-bag-check", "Itens vendidos", String(itensVendidos))}
      </div>
      <h2 class="h5 fw-bold mb-3">Pedidos do período</h2>
      ${r.pedidos.length
        ? raw(`<div class="pg-order-list">${r.pedidos.map((p) => cartaoPedido(p)).join("")}</div>`)
        : raw(estadoVazio("bi-bar-chart-line", "Ainda não há vendas", "Feche um pedido para ver os números aqui.", { rotulo: "Novo pedido", href: "#/pedido" }))}`;
  }

  raiz.addEventListener("click", (e) => {
    if ((e.target as HTMLElement).closest("#atualizar")) carregar();
  });
  await carregar();
}
