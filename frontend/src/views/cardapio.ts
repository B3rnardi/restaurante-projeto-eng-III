/** Tela "Cardápio": lista os produtos e, para o administrador, cadastra novos (ProdutoFactory). */
import { api } from "../services/api.js";
import { sessao } from "../app/session.js";
import type { Produto } from "../models/types.js";
import { cabecalho, carregando, estadoVazio } from "../components/empty-state.js";
import { toast } from "../components/toast.js";
import { iconeProduto } from "./novo-pedido.js";
import { $, $$, html, raw } from "../utils/dom.js";
import { formatarMoeda, plural } from "../utils/format.js";

export async function telaCardapio(raiz: HTMLElement): Promise<void> {
  const topo = cabecalho("Produtos e preços", "Cardápio");
  raiz.innerHTML = topo + carregando();

  let produtos: Produto[];
  try {
    produtos = await api.listarProdutos();
  } catch (e) {
    raiz.innerHTML = topo + estadoVazio("bi-wifi-off", "Não foi possível carregar o cardápio", e instanceof Error ? e.message : "");
    return;
  }
  const admin = sessao.ehAdmin();

  raiz.innerHTML = html`${raw(topo)}
    <div class="row g-4">
      <div class="${admin ? "col-lg-7 col-xl-8" : "col-12"}" id="secoes"></div>
      ${admin ? raw(formulario()) : ""}
    </div>`;

  function secao(categoria: "Pizza" | "Bebida", destaque: string | null): string {
    const itens = produtos.filter((p) => p.categoria === categoria);
    return html`<section class="pg-menu-section">
      <div class="d-flex align-items-baseline justify-content-between mb-2">
        <h2 class="h5 fw-bold mb-0">${categoria === "Pizza" ? "Pizzas" : "Bebidas"}</h2>
        <span class="small text-secondary">${plural(itens.length, "produto")}</span>
      </div>
      <div class="pg-menu-list">
        ${itens.length
          ? itens.map((p) =>
              raw(html`<div class="pg-menu-row ${p.id === destaque ? "pg-new" : ""}">
                <span class="pg-icon-circle pg-icon-circle-sm">${raw(iconeProduto(p.categoria))}</span>
                <span class="flex-grow-1 fw-bold">${p.nome}</span>
                <span class="pg-price">${formatarMoeda(p.preco)}</span>
              </div>`),
            )
          : raw(`<div class="p-3 small text-secondary">Nenhum produto nesta categoria.</div>`)}
      </div>
    </section>`;
  }

  function renderSecoes(destaque: string | null = null): void {
    $("#secoes", raiz).innerHTML =
      secao("Pizza", destaque) + secao("Bebida", destaque) +
      (admin ? "" : `<div class="pg-note"><i class="bi bi-info-circle"></i> Apenas o administrador pode cadastrar produtos.</div>`);
  }
  renderSecoes();
  if (!admin) return;

  // ------------------------------------------------------------ cadastro (admin)
  const form = $<HTMLFormElement>("#form-produto", raiz);
  const nome = $<HTMLInputElement>("#nome-produto", raiz);
  const preco = $<HTMLInputElement>("#preco-produto", raiz);
  let tipo: "PIZZA" | "BEBIDA" = "PIZZA";

  $$<HTMLButtonElement>("[data-tipo]", raiz).forEach((b) =>
    b.addEventListener("click", () => {
      tipo = b.dataset.tipo as "PIZZA" | "BEBIDA";
      $$("[data-tipo]", raiz).forEach((x) => {
        x.classList.toggle("active", x === b);
        x.setAttribute("aria-checked", String(x === b));
      });
    }),
  );

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const valor = Number(preco.value.replace(",", "."));
    nome.classList.toggle("is-invalid", !nome.value.trim());
    preco.classList.toggle("is-invalid", !(valor > 0));
    if (!nome.value.trim() || !(valor > 0)) return;

    const botao = $<HTMLButtonElement>("button[type=submit]", form);
    botao.disabled = true;
    try {
      const novo = await api.cadastrarProduto(tipo, nome.value.trim(), valor);
      produtos.push(novo);
      produtos.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
      renderSecoes(novo.id);
      toast(`${novo.categoria} "${novo.nome}" cadastrada no cardápio.`);
      form.reset();
      nome.focus();
    } catch (erro) {
      $("#erro-produto", raiz).textContent = erro instanceof Error ? erro.message : String(erro);
      $("#erro-produto", raiz).hidden = false;
    } finally {
      botao.disabled = false;
    }
  });
  form.addEventListener("input", () => {
    $("#erro-produto", raiz).hidden = true;
    nome.classList.remove("is-invalid");
    preco.classList.remove("is-invalid");
  });
}

function formulario(): string {
  return `<aside class="col-lg-5 col-xl-4">
    <form class="pg-cart" id="form-produto" novalidate>
      <div class="d-flex align-items-center gap-2 mb-3">
        <span class="pg-icon-circle pg-icon-circle-sm"><i class="bi bi-plus-lg"></i></span>
        <h2 class="h5 fw-bold mb-0">Novo produto</h2>
      </div>
      <div class="mb-3">
        <div class="form-label">Tipo</div>
        <div class="pg-segmented pg-segmented-full" role="radiogroup" aria-label="Tipo do produto">
          <button type="button" class="nav-link active" role="radio" aria-checked="true" data-tipo="PIZZA">Pizza</button>
          <button type="button" class="nav-link" role="radio" aria-checked="false" data-tipo="BEBIDA">Bebida</button>
        </div>
      </div>
      <div class="mb-3">
        <label class="form-label" for="nome-produto">Nome</label>
        <input class="form-control" id="nome-produto" maxlength="60" placeholder="Ex.: Margherita" autocomplete="off">
        <div class="invalid-feedback">Informe o nome do produto.</div>
      </div>
      <div class="mb-3">
        <label class="form-label" for="preco-produto">Preço</label>
        <div class="input-group has-validation">
          <span class="input-group-text">R$</span>
          <input class="form-control" id="preco-produto" inputmode="decimal" placeholder="0,00" autocomplete="off">
          <div class="invalid-feedback">O preço deve ser maior que zero.</div>
        </div>
      </div>
      <div class="pg-form-error mb-3" id="erro-produto" role="alert" hidden></div>
      <button class="btn btn-primary w-100" type="submit"><i class="bi bi-check2 me-1"></i> Cadastrar produto</button>
    </form>
  </aside>`;
}
