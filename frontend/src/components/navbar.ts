import { sessao } from "../app/session.js";
import { carrinho } from "../app/cart.js";
import { html, raw, ICONE_PIZZA } from "../utils/dom.js";

interface Link {
  rota: string;
  rotulo: string;
  icone: string;
  somenteAdmin?: boolean;
}

export const LINKS: Link[] = [
  { rota: "#/pedido", rotulo: "Novo pedido", icone: "bi-plus-circle" },
  { rota: "#/pedidos", rotulo: "Pedidos", icone: "bi-receipt" },
  { rota: "#/cardapio", rotulo: "Cardápio", icone: "bi-book" },
  { rota: "#/relatorio", rotulo: "Relatório", icone: "bi-bar-chart-line", somenteAdmin: true },
];

export function logo(): string {
  return html`<span class="pg-logo-mark">${raw(ICONE_PIZZA)}</span><span class="pg-wordmark"><span class="text-danger">Pizza</span>Gest</span>`;
}

/** Barra superior com navegação e usuário logado. */
export function navbar(rotaAtual: string): string {
  const s = sessao.obter()!;
  const links = LINKS.filter((l) => !l.somenteAdmin || sessao.ehAdmin());
  const qtd = carrinho.quantidadeItens;
  return html`<nav class="navbar navbar-expand-md pg-navbar sticky-top">
    <div class="container-xl">
      <a class="navbar-brand d-flex align-items-center gap-2" href="#/pedido">${raw(logo())}</a>
      <button class="navbar-toggler border-0" type="button" data-bs-toggle="collapse" data-bs-target="#pg-menu" aria-controls="pg-menu" aria-expanded="false" aria-label="Abrir menu">
        <i class="bi bi-list fs-2"></i>
      </button>
      <div class="collapse navbar-collapse" id="pg-menu">
        <ul class="navbar-nav mx-md-auto gap-md-1">
          ${links.map((l) =>
            raw(html`<li class="nav-item">
              <a class="nav-link pg-nav-link ${rotaAtual === l.rota ? "active" : ""}" href="${l.rota}" ${rotaAtual === l.rota ? raw('aria-current="page"') : ""}>
                <i class="bi ${l.icone}"></i> ${l.rotulo}
                ${l.rota === "#/pedido" && qtd > 0 ? raw(`<span class="badge rounded-pill pg-badge-count" data-cart-count>${qtd}</span>`) : ""}
              </a>
            </li>`),
          )}
        </ul>
        <div class="d-flex align-items-center gap-2 pg-user py-2 py-md-0">
          <span class="pg-avatar"><i class="bi bi-person-fill"></i></span>
          <div class="lh-sm me-2">
            <div class="fw-bold small">${s.login}</div>
            <div class="pg-perfil">${s.perfil === "ADMINISTRADOR" ? "Administrador" : "Atendente"}</div>
          </div>
          <button class="btn btn-light btn-sm pg-btn-icon" id="btn-sair" title="Sair" aria-label="Sair"><i class="bi bi-box-arrow-right"></i></button>
        </div>
      </div>
    </div>
  </nav>`;
}
