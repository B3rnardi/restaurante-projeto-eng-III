/**
- Tela "Novo pedido" (casos de uso: registrar pedido, pizza meio a meio, fechar pedido).
- O carrinho é montado no navegador; ao fechar, o back-end cria o Pedido, aplica a
- estratégia de preço escolhida, fecha e grava no Singleton.
 */
import { api } from "../services/api.js";
import { carrinho } from "../app/cart.js";
import type { Estrategia, EstrategiaId, ItemCarrinho, Pedido, Produto } from "../models/types.js";
import { abrirModal } from "../components/modal.js";
import { toast, toastErro } from "../components/toast.js";
import { cabecalho, carregando, estadoVazio } from "../components/empty-state.js";
import { $, $$, html, raw, ICONE_PIZZA } from "../utils/dom.js";
import { formatarMoeda, normalizar, plural } from "../utils/format.js";

type Filtro = "Todos" | "Pizza" | "Bebida";

export const iconeProduto = (categoria: string): string =>
  categoria === "Pizza" ? ICONE_PIZZA : `<i class="bi bi-cup-straw"></i>`;

export async function telaNovoPedido(raiz: HTMLElement) {
  raiz.innerHTML = cabecalho("Registro de pedidos", "Novo pedido") + carregando("Carregando cardápio...");

  let produtos: Produto[];
  let estrategias: Estrategia[];
  try {
    [produtos, estrategias] = await Promise.all([api.listarProdutos(), api.listarEstrategias()]);
  } catch (e) {
    raiz.innerHTML = cabecalho("Registro de pedidos", "Novo pedido") +
      estadoVazio("bi-wifi-off", "Não foi possível carregar o cardápio", e instanceof Error ? e.message : "");
    return;
  }

  let filtro: Filtro = "Todos";
  let busca = "";
  const pizzas = () => produtos.filter((p) => p.categoria === "Pizza");

  raiz.innerHTML = html`
    ${raw(cabecalho("Registro de pedidos", "Novo pedido"))}
    <div class="row g-4">
      <section class="col-lg-7 col-xl-8" aria-label="Cardápio">
        <div class="pg-toolbar">
          <div class="pg-search">
            <i class="bi bi-search"></i>
            <input id="busca" type="search" class="form-control" placeholder="Buscar no cardápio..." aria-label="Buscar no cardápio">
          </div>
          <div class="nav pg-segmented" role="tablist" id="filtros">
            ${(["Todos", "Pizza", "Bebida"] as Filtro[]).map((f) =>
              raw(html`<button class="nav-link ${f === filtro ? "active" : ""}" data-filtro="${f}" role="tab">${f === "Todos" ? "Todos" : f + "s"}</button>`),
            )}
          </div>
        </div>
        <div id="grade" class="row g-3"></div>
      </section>

      <aside class="col-lg-5 col-xl-4" id="carrinho" aria-label="Pedido em montagem">
        <div class="pg-cart">
          <div class="pg-cart-head">
            <div class="d-flex align-items-center gap-2">
              <span class="pg-icon-circle pg-icon-circle-sm"><i class="bi bi-receipt"></i></span>
              <h2 class="h5 fw-bold mb-0">Pedido</h2>
              <span class="pg-count" id="contagem"></span>
            </div>
            <button class="btn btn-link btn-sm pg-link-muted" id="limpar">Limpar</button>
          </div>

          <div class="mb-3">
            <label for="cliente" class="form-label">Cliente</label>
            <input id="cliente" class="form-control" placeholder="Nome do cliente" autocomplete="off" maxlength="80">
            <div class="invalid-feedback">Informe o nome do cliente.</div>
          </div>

          <div class="mb-3">
            <label for="telefone" class="form-label">Telefone</label>
            <input id="telefone" type="tel" class="form-control" placeholder="(11) 99999-9999" autocomplete="off" maxlength="20">
          </div>

          <div class="mb-3">
            <div class="form-label d-flex justify-content-between">
              <span>Preço do meio a meio</span>
              <span class="spinner-border spinner-border-sm text-danger" id="recalc" hidden></span>
            </div>
            <div class="pg-segmented pg-segmented-full" role="radiogroup" aria-label="Regra de preço do meio a meio" id="estrategias">
              ${estrategias.map((e) =>
                raw(html`<button type="button" class="nav-link" role="radio" data-estrategia="${e.id}">${e.nome}</button>`),
              )}
            </div>
            <div class="form-text" id="desc-estrategia"></div>
          </div>

          <ul class="pg-cart-items" id="itens" aria-live="polite"></ul>

          <div class="pg-cart-total">
            <span>Total</span>
            <strong id="total">${formatarMoeda(0)}</strong>
          </div>
          <button class="btn btn-primary btn-lg w-100" id="fechar"><i class="bi bi-check2-circle me-1"></i> Fechar pedido</button>
          <div class="pg-hint" id="dica"></div>
        </div>
      </aside>
    </div>

    <div class="pg-cart-bar d-lg-none" id="barra" hidden>
      <div><div class="small text-white-50" id="barra-qtd"></div><div class="fw-bold" id="barra-total"></div></div>
      <button type="button" class="btn btn-light btn-sm fw-bold" id="ver-pedido">Ver pedido <i class="bi bi-arrow-down"></i></button>
    </div>`;

  const grade = $("#grade", raiz);
  // No celular o carrinho fica abaixo do cardápio: a barra fixa leva até ele.
  $("#ver-pedido", raiz).addEventListener("click", () => $("#carrinho", raiz).scrollIntoView({ behavior: "smooth", block: "start" }));
  const campoCliente = $<HTMLInputElement>("#cliente", raiz);
  const campoTelefone = $<HTMLInputElement>("#telefone", raiz);
  const botaoFechar = $<HTMLButtonElement>("#fechar", raiz);

  // ------------------------------------------------------------ cardápio
  function renderGrade(): void {
    const termo = normalizar(busca);
    const lista = produtos.filter(
      (p) => (filtro === "Todos" || p.categoria === filtro) && (!termo || normalizar(p.nome).includes(termo)),
    );
    if (!lista.length) {
      grade.innerHTML = `<div class="col-12">${estadoVazio("bi-search", "Nada encontrado", "Tente outro nome ou categoria.")}</div>`;
      return;
    }
    grade.innerHTML = lista
      .map((p) => html`<div class="col-sm-6 col-xxl-4">
        <article class="pg-product">
          <div class="d-flex align-items-start gap-3">
            <div class="pg-icon-circle">${raw(iconeProduto(p.categoria))}</div>
            <div class="flex-grow-1 min-w-0">
              <h3 class="pg-product-name">${p.nome}</h3>
              <div class="pg-product-cat">${p.categoria}</div>
            </div>
            <div class="pg-price">${formatarMoeda(p.preco)}</div>
          </div>
          <div class="pg-product-actions">
            <button class="btn btn-primary btn-sm flex-grow-1" data-add="${p.id}"><i class="bi bi-plus-lg"></i> Adicionar</button>
            ${p.categoria === "Pizza" && pizzas().length > 1
              ? raw(html`<button class="btn btn-outline-danger btn-sm" data-meio="${p.id}" title="Pizza meio a meio"><i class="bi bi-circle-half"></i> Meio a meio</button>`)
              : ""}
          </div>
        </article>
      </div>`)
      .join("");
  }

  grade.addEventListener("click", (e) => {
    const alvo = (e.target as HTMLElement).closest<HTMLButtonElement>("button");
    if (!alvo) return;
    const produto = produtos.find((p) => p.id === (alvo.dataset.add ?? alvo.dataset.meio));
    if (!produto) return;
    if (alvo.dataset.add) {
      carrinho.adicionar({ tipo: "INTEIRO", produto: produto.id, descricao: produto.nome, categoria: produto.categoria, quantidade: 1, precoUnitario: produto.preco });
      confirmarBotao(alvo);
    } else {
      abrirMeioAMeio(produto);
    }
  });

  const timers = new WeakMap<HTMLButtonElement, number>();
  function confirmarBotao(botao: HTMLButtonElement): void {
    clearTimeout(timers.get(botao));
    botao.innerHTML = `<i class="bi bi-check2"></i> Adicionado`;
    botao.classList.add("pg-added");
    timers.set(botao, window.setTimeout(() => {
      botao.innerHTML = `<i class="bi bi-plus-lg"></i> Adicionar`;
      botao.classList.remove("pg-added");
    }, 900));
  }

  $("#busca", raiz).addEventListener("input", (e) => {
    busca = (e.target as HTMLInputElement).value;
    renderGrade();
  });
  $$<HTMLButtonElement>("[data-filtro]", raiz).forEach((b) =>
    b.addEventListener("click", () => {
      filtro = b.dataset.filtro as Filtro;
      $$("[data-filtro]", raiz).forEach((x) => x.classList.toggle("active", x === b));
      renderGrade();
    }),
  );

  // ------------------------------------------------------------ meio a meio
  function abrirMeioAMeio(sabor1: Produto): void {
    const opcoes = pizzas().filter((p) => p.id !== sabor1.id);
    let sabor2: Produto | null = null;
    let quantidade = 1;
    let precos: Partial<Record<EstrategiaId, number>> = {};
    const atual = () => carrinho.estado.estrategia;

    const { el, fechar } = abrirModal(html`
      <div class="modal-header border-0 pb-0">
        <div>
          <div class="pg-kicker">Pizza meio a meio</div>
          <h2 class="modal-title h5 fw-bold">Escolha o segundo sabor</h2>
        </div>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Fechar"></button>
      </div>
      <div class="modal-body">
        <div class="pg-half-pick mb-3">
          <span class="pg-half pg-half-on"><span class="pg-half-label">1ª metade</span>${sabor1.nome}<small>${formatarMoeda(sabor1.preco)}</small></span>
          <i class="bi bi-plus-lg text-secondary"></i>
          <span class="pg-half" id="metade2"><span class="pg-half-label">2ª metade</span>Escolha abaixo</span>
        </div>
        <div class="pg-options" role="radiogroup" aria-label="Segundo sabor">
          ${opcoes.map((p) =>
            raw(html`<button type="button" class="pg-option" role="radio" aria-checked="false" data-sabor="${p.id}">
              <span>${p.nome}</span><span class="text-secondary">${formatarMoeda(p.preco)}</span>
            </button>`),
          )}
        </div>
        <div id="comparacao" class="mt-3"></div>
      </div>
      <div class="modal-footer border-0 pt-0 justify-content-between">
        <div class="pg-stepper" aria-label="Quantidade">
          <button type="button" class="btn" data-q="-1" aria-label="Diminuir"><i class="bi bi-dash-lg"></i></button>
          <span id="qtd">1</span>
          <button type="button" class="btn" data-q="1" aria-label="Aumentar"><i class="bi bi-plus-lg"></i></button>
        </div>
        <button type="button" class="btn btn-primary" id="confirmar-meio" disabled>Adicionar</button>
      </div>`);

    const comparacao = $("#comparacao", el);
    const confirmar = $<HTMLButtonElement>("#confirmar-meio", el);

    function atualizarRodape(): void {
      $("#qtd", el).textContent = String(quantidade);
      const preco = precos[atual()];
      confirmar.disabled = !sabor2 || preco === undefined;
      confirmar.innerHTML = preco === undefined ? "Adicionar" : `Adicionar · ${formatarMoeda(preco * quantidade)}`;
    }

    function renderComparacao(): void {
      comparacao.innerHTML = html`<div class="pg-compare">
        ${estrategias.map((e) =>
          raw(html`<div class="pg-compare-item ${e.id === atual() ? "active" : ""}">
            <div class="small fw-bold">${e.nome}${e.id === atual() ? raw(' <span class="pg-tag">neste pedido</span>') : ""}</div>
            <div class="pg-compare-price">${precos[e.id] !== undefined ? formatarMoeda(precos[e.id]!) : "—"}</div>
            <div class="small text-secondary">${e.descricao}</div>
          </div>`),
        )}
      </div>`;
    }

    el.addEventListener("click", async (e) => {
      const alvo = (e.target as HTMLElement).closest<HTMLElement>("[data-sabor],[data-q]");
      if (!alvo) return;
      if (alvo.dataset.q) {
        quantidade = Math.max(1, Math.min(20, quantidade + Number(alvo.dataset.q)));
        return atualizarRodape();
      }
      sabor2 = opcoes.find((p) => p.id === alvo.dataset.sabor) ?? null;
      $$(".pg-option", el).forEach((o) => {
        o.classList.toggle("active", o === alvo);
        o.setAttribute("aria-checked", String(o === alvo));
      });
      const metade2 = $("#metade2", el);
      metade2.classList.add("pg-half-on");
      metade2.innerHTML = html`<span class="pg-half-label">2ª metade</span>${sabor2!.nome}<small>${formatarMoeda(sabor2!.preco)}</small>`;
      precos = {};
      comparacao.innerHTML = carregando("Calculando preço...");
      atualizarRodape();
      try {
        // Strategy no back-end: a mesma dupla de sabores calculada por cada regra.
        const escolhido = sabor2!;
        const resultados = await Promise.all(estrategias.map((est) => api.precoMeioAMeio(sabor1.id, escolhido.id, est.id)));
        if (sabor2 !== escolhido) return;
        estrategias.forEach((est, i) => (precos[est.id] = resultados[i].preco));
        renderComparacao();
      } catch (erro) {
        comparacao.innerHTML = "";
        toastErro(erro);
      }
      atualizarRodape();
    });

    confirmar.addEventListener("click", () => {
      const preco = precos[atual()];
      if (!sabor2 || preco === undefined) return;
      carrinho.adicionar({
        tipo: "MEIO_A_MEIO",
        sabor1: sabor1.id,
        sabor2: sabor2.id,
        descricao: `Pizza 1/2 ${sabor1.nome} + 1/2 ${sabor2.nome}`,
        categoria: "Pizza",
        quantidade,
        precoUnitario: preco,
      });
      fechar();
      toast("Pizza meio a meio adicionada ao pedido.");
    });
  }

  // ------------------------------------------------------------ carrinho
  function linhaItem(i: ItemCarrinho): string {
    return html`<li class="pg-cart-item">
      <div class="pg-icon-circle pg-icon-circle-sm">${raw(i.tipo === "MEIO_A_MEIO" ? '<i class="bi bi-circle-half"></i>' : iconeProduto(i.categoria))}</div>
      <div class="flex-grow-1 min-w-0">
        <div class="pg-cart-item-name">${i.descricao}</div>
        <div class="small text-secondary">${formatarMoeda(i.precoUnitario)} cada</div>
      </div>
      <div class="text-end">
        <div class="fw-bold mb-1">${formatarMoeda(i.precoUnitario * i.quantidade)}</div>
        <div class="pg-stepper pg-stepper-sm">
          <button type="button" class="btn" data-menos="${i.chave}" aria-label="${i.quantidade === 1 ? "Remover" : "Diminuir"} ${i.descricao}">
            <i class="bi ${i.quantidade === 1 ? "bi-trash3" : "bi-dash-lg"}"></i>
          </button>
          <span>${i.quantidade}</span>
          <button type="button" class="btn" data-mais="${i.chave}" aria-label="Aumentar ${i.descricao}"><i class="bi bi-plus-lg"></i></button>
        </div>
      </div>
    </li>`;
  }

  function renderCarrinho(): void {
    const { itens, estrategia } = carrinho.estado;
    const qtd = carrinho.quantidadeItens;
    $("#contagem", raiz).textContent = qtd ? plural(qtd, "item", "itens") : "";
    $("#limpar", raiz).hidden = !itens.length;
    $("#itens", raiz).innerHTML = itens.length
      ? itens.map(linhaItem).join("")
      : `<li class="pg-cart-empty"><i class="bi bi-bag"></i><span>Nenhum item ainda.<br>Escolha produtos no cardápio.</span></li>`;

    const total = $("#total", raiz);
    total.textContent = formatarMoeda(carrinho.total);
    total.classList.remove("pg-bump");
    void total.offsetWidth;
    total.classList.add("pg-bump");

    $$<HTMLButtonElement>("[data-estrategia]", raiz).forEach((b) => {
      const ativa = b.dataset.estrategia === estrategia;
      b.classList.toggle("active", ativa);
      b.setAttribute("aria-checked", String(ativa));
    });
    const desc = estrategias.find((e) => e.id === estrategia)?.descricao ?? "";
    $("#desc-estrategia", raiz).textContent = desc;

    botaoFechar.disabled = !itens.length;
    $("#dica", raiz).textContent = itens.length ? "O total final é confirmado pelo sistema ao fechar." : "Pedido vazio não pode ser fechado.";

    const barra = $("#barra", raiz);
    barra.hidden = !itens.length;
    $("#barra-qtd", raiz).textContent = plural(qtd, "item", "itens");
    $("#barra-total", raiz).textContent = formatarMoeda(carrinho.total);
  }

  $("#itens", raiz).addEventListener("click", (e) => {
    const alvo = (e.target as HTMLElement).closest<HTMLButtonElement>("button");
    if (alvo?.dataset.mais) carrinho.alterarQuantidade(alvo.dataset.mais, 1);
    if (alvo?.dataset.menos) carrinho.alterarQuantidade(alvo.dataset.menos, -1);
  });

  $("#limpar", raiz).addEventListener("click", () => {
    const cliente = campoCliente.value;
    carrinho.limpar();
    carrinho.definirCliente(cliente);
  });

  campoCliente.value = carrinho.estado.cliente;
  campoCliente.addEventListener("input", () => {
    carrinho.definirCliente(campoCliente.value);
    if (campoCliente.value.trim()) campoCliente.classList.remove("is-invalid");
  });

  // Troca de estratégia: recalcula no back-end o preço das pizzas meio a meio do carrinho.
  $$<HTMLButtonElement>("[data-estrategia]", raiz).forEach((b) =>
    b.addEventListener("click", async () => {
      const nova = b.dataset.estrategia as EstrategiaId;
      if (nova === carrinho.estado.estrategia) return;
      const meios = carrinho.estado.itens.filter((i) => i.tipo === "MEIO_A_MEIO");
      const spinner = $("#recalc", raiz);
      spinner.hidden = false;
      $$<HTMLButtonElement>("[data-estrategia]", raiz).forEach((x) => (x.disabled = true));
      try {
        const precos = await Promise.all(meios.map((i) => api.precoMeioAMeio(i.sabor1!, i.sabor2!, nova)));
        carrinho.definirEstrategia(nova, new Map(meios.map((i, k) => [i.chave, precos[k].preco])));
        if (meios.length) toast(`Preços recalculados pela regra "${estrategias.find((e) => e.id === nova)?.nome}".`, "info");
      } catch (erro) {
        toastErro(erro);
      } finally {
        spinner.hidden = true;
        $$<HTMLButtonElement>("[data-estrategia]", raiz).forEach((x) => (x.disabled = false));
      }
    }),
  );

  // Fechar pedido: o back-end cria, calcula, fecha e grava (Singleton).
  botaoFechar.addEventListener("click", async () => {
    if (!campoCliente.value.trim()) {
      campoCliente.classList.add("is-invalid");
      campoCliente.focus();
      campoCliente.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    botaoFechar.disabled = true;
    botaoFechar.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Fechando...`;
    try {
      const pedido = await api.registrarPedido({
        ...carrinho.paraEnvio(),
        telefone: campoTelefone.value.trim(),
      });
      carrinho.limpar();
      campoCliente.value = "";
      campoTelefone.value = "";
      mostrarRecibo(pedido);
    } catch (erro) {
      toastErro(erro);
    } finally {
      botaoFechar.innerHTML = `<i class="bi bi-check2-circle me-1"></i> Fechar pedido`;
      botaoFechar.disabled = !carrinho.estado.itens.length;
    }
  });

  function mostrarRecibo(pedido: Pedido): void {
    const { el, fechar } = abrirModal(html`
      <div class="modal-body p-4 text-center">
        <div class="pg-success-icon mb-3"><i class="bi bi-check-lg"></i></div>
        <div class="pg-kicker">Pedido fechado</div>
        <h2 class="h3 fw-bold mb-1">Pedido #${pedido.numero}</h2>
        <p class="text-secondary mb-4">${pedido.cliente}${pedido.telefone ? ` · ${pedido.telefone}` : ""} · regra ${pedido.estrategia.nome.toLowerCase()}</p>
        <ul class="pg-receipt text-start">
          ${pedido.itens.map((i) =>
            raw(html`<li><span>${i.quantidade}× ${i.descricao}</span><span>${formatarMoeda(i.subtotal)}</span></li>`),
          )}
          <li class="pg-receipt-total"><span>Total</span><span>${formatarMoeda(pedido.total)}</span></li>
        </ul>
        <div class="d-grid gap-2 mt-4">
          <button class="btn btn-primary btn-lg" data-bs-dismiss="modal" autofocus>Novo pedido</button>
          <a class="btn btn-link pg-link-muted" href="#/pedidos" id="ir-pedidos">Ver pedidos fechados</a>
        </div>
      </div>`);
    $("#ir-pedidos", el).addEventListener("click", () => fechar());
    el.addEventListener("hidden.bs.modal", () => campoCliente.focus());
  }

  // Esconde a barra do celular enquanto o próprio carrinho está visível na tela.
  const observador = new IntersectionObserver(([entrada]) => $("#barra", raiz).classList.toggle("pg-out", entrada.isIntersecting), { threshold: 0.15 });
  observador.observe($("#carrinho", raiz));

  renderGrade();
  renderCarrinho();
  const cancelar = carrinho.assinar(renderCarrinho);
  return () => {
    cancelar();
    observador.disconnect();
  };
}