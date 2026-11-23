/**
 * Ponto de entrada do front-end (camada de apresentação do PizzaGest).
 * Monta o layout, liga o roteador às telas e trata sessão expirada.
 */
import { criarRouter } from "./app/router.js";
import { sessao } from "./app/session.js";
import { carrinho } from "./app/cart.js";
import { api, definirAoExpirarSessao } from "./services/api.js";
import { navbar } from "./components/navbar.js";
import { toast } from "./components/toast.js";
import { telaLogin } from "./views/login.js";
import { telaNovoPedido } from "./views/novo-pedido.js";
import { telaPedidos } from "./views/pedidos.js";
import { telaCardapio } from "./views/cardapio.js";
import { telaRelatorio } from "./views/relatorio.js";

const app = document.getElementById("app")!;

function montarLayout(rota: string, publica: boolean): HTMLElement {
  // Ao trocar de tela, fecha qualquer modal que tenha ficado aberto.
  document.querySelectorAll(".modal.show").forEach((m) => bootstrap.Modal.getOrCreateInstance(m).hide());
  if (publica) {
    app.innerHTML = `<main id="tela" class="pg-public"></main>`;
  } else {
    app.innerHTML = `${navbar(rota)}<main id="tela" class="container-xl pg-main"></main>
      <footer class="container-xl pg-footer">PizzaGest · Sistema de Gestão de Pedidos para Delivery Local</footer>`;
    document.getElementById("btn-sair")?.addEventListener("click", sair);
  }
  return document.getElementById("tela")!;
}

async function sair(): Promise<void> {
  await api.logout().catch(() => undefined);
  sessao.limpar();
  carrinho.limpar();
  router.ir("#/login");
}

const router = criarRouter(
  {
    "#/login": { tela: telaLogin, publica: true },
    "#/pedido": { tela: telaNovoPedido },
    "#/pedidos": { tela: telaPedidos },
    "#/cardapio": { tela: telaCardapio },
    "#/relatorio": { tela: telaRelatorio, somenteAdmin: true },
  },
  montarLayout,
);

definirAoExpirarSessao(() => {
  if (!sessao.obter()) return;
  sessao.limpar();
  toast("Sua sessão expirou. Entre novamente.", "info");
  router.ir("#/login");
});

// Mantém o contador do carrinho no menu sempre atualizado.
carrinho.assinar(() => {
  const link = document.querySelector('.pg-nav-link[href="#/pedido"]');
  if (!link) return;
  link.querySelector("[data-cart-count]")?.remove();
  const qtd = carrinho.quantidadeItens;
  if (qtd > 0) link.insertAdjacentHTML("beforeend", `<span class="badge rounded-pill pg-badge-count" data-cart-count>${qtd}</span>`);
});

router.navegar();
