/** Tela "Pedidos": lista os pedidos fechados gravados na base (Singleton). */
import { api } from "../services/api.js";
import type { Pedido } from "../models/types.js";
import { cabecalho, carregando, estadoVazio } from "../components/empty-state.js";
import { cartaoPedido } from "../components/pedido-card.js";
import { $, html, raw } from "../utils/dom.js";
import { normalizar } from "../utils/format.js";

export async function telaPedidos(raiz: HTMLElement): Promise<void> {
  const topo = cabecalho("Pedidos finalizados", "Pedidos", `<a class="btn btn-primary" href="#/pedido"><i class="bi bi-plus-lg me-1"></i> Novo pedido</a>`);
  raiz.innerHTML = topo + carregando();

  let pedidos: Pedido[];
  try {
    pedidos = await api.listarPedidos();
  } catch (e) {
    raiz.innerHTML = topo + estadoVazio("bi-wifi-off", "Não foi possível carregar os pedidos", e instanceof Error ? e.message : "");
    return;
  }

  if (!pedidos.length) {
    raiz.innerHTML = topo + estadoVazio("bi-receipt", "Nenhum pedido fechado ainda", "Os pedidos aparecem aqui assim que forem fechados.", { rotulo: "Registrar o primeiro pedido", href: "#/pedido" });
    return;
  }

  raiz.innerHTML = html`${raw(topo)}
    <div class="pg-toolbar">
      <div class="pg-search">
        <i class="bi bi-search"></i>
        <input id="busca-pedido" type="search" class="form-control" placeholder="Buscar por cliente ou número..." aria-label="Buscar pedido">
      </div>
      <div class="small text-secondary" id="resumo"></div>
    </div>
    <div id="lista" class="pg-order-list"></div>`;

  const lista = $("#lista", raiz);
  function render(termo: string): void {
    const t = normalizar(termo).replace(/^#/, "");
    const filtrados = pedidos.filter((p) => !t || normalizar(p.cliente).includes(t) || String(p.numero) === t);
    $("#resumo", raiz).textContent = `${filtrados.length} de ${pedidos.length}`;
    lista.innerHTML = filtrados.length
      ? filtrados.map((p, i) => cartaoPedido(p, i === 0 && !t)).join("")
      : estadoVazio("bi-search", "Nenhum pedido encontrado", "Confira o nome do cliente ou o número.");
  }
  $<HTMLInputElement>("#busca-pedido", raiz).addEventListener("input", (e) => render((e.target as HTMLInputElement).value));
  render("");
}
