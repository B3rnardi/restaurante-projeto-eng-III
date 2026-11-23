import { api } from "../services/api.js";
import { sessao } from "../app/session.js";
import { toast } from "../components/toast.js";
import { logo } from "../components/navbar.js";
import { $, html, raw, ICONE_PIZZA } from "../utils/dom.js";

/** Tela de login (caso de uso "Realizar login"). */
export function telaLogin(raiz: HTMLElement): void {
  raiz.innerHTML = html`
  <div class="pg-login">
    <section class="pg-login-form">
      <div class="pg-login-brand">${raw(logo())}</div>
      <div class="pg-login-inner">
        <div class="pg-kicker mb-3">Sistema de gestão de pedidos</div>
        <h1 class="pg-hero"><span class="text-danger">Pizza</span>Gest</h1>
        <p class="pg-lead mb-4">Do pedido ao relatório de vendas, em um só lugar.</p>

        <form id="form-login" class="pg-form" novalidate>
          <div class="mb-3">
            <label for="login" class="form-label">Usuário</label>
            <div class="input-group">
              <span class="input-group-text"><i class="bi bi-person"></i></span>
              <input id="login" name="login" class="form-control form-control-lg" autocomplete="username" required autofocus placeholder="Seu usuário">
            </div>
          </div>
          <div class="mb-2">
            <label for="senha" class="form-label">Senha</label>
            <div class="input-group">
              <span class="input-group-text"><i class="bi bi-lock"></i></span>
              <input id="senha" name="senha" type="password" class="form-control form-control-lg" autocomplete="current-password" required placeholder="Sua senha">
              <button class="btn btn-outline-secondary pg-btn-eye" type="button" id="ver-senha" aria-label="Mostrar senha"><i class="bi bi-eye"></i></button>
            </div>
          </div>
          <div id="erro-login" class="pg-form-error" role="alert" hidden></div>
          <button class="btn btn-primary btn-lg w-100 mt-3" type="submit" id="btn-entrar">
            Entrar <i class="bi bi-arrow-right ms-1"></i>
          </button>
        </form>

        <div class="pg-quick mt-4">
          <div class="pg-label mb-2">Acesso rápido (protótipo)</div>
          <div class="d-flex flex-wrap gap-2">
            <button class="btn pg-chip" data-login="atendente" data-senha="123"><i class="bi bi-headset"></i> Atendente <span>atendente / 123</span></button>
            <button class="btn pg-chip" data-login="admin" data-senha="admin"><i class="bi bi-shield-lock"></i> Administrador <span>admin / admin</span></button>
          </div>
        </div>
      </div>
      <div class="pg-login-foot">Engenharia de Software III · IES300</div>
    </section>

    <aside class="pg-login-art" aria-hidden="true">
      <div class="pg-art-circle">
        <div class="pg-art-slice">${raw(ICONE_PIZZA)}</div>
        <div class="pg-art-bubble pg-art-bubble-1"><i class="bi bi-receipt-cutoff"></i></div>
        <div class="pg-art-bubble pg-art-bubble-2"><i class="bi bi-bicycle"></i></div>
      </div>
    </aside>
  </div>`;

  const form = $<HTMLFormElement>("#form-login", raiz);
  const campoLogin = $<HTMLInputElement>("#login", raiz);
  const campoSenha = $<HTMLInputElement>("#senha", raiz);
  const erro = $("#erro-login", raiz);
  const botao = $<HTMLButtonElement>("#btn-entrar", raiz);

  $("#ver-senha", raiz).addEventListener("click", (e) => {
    const visivel = campoSenha.type === "text";
    campoSenha.type = visivel ? "password" : "text";
    (e.currentTarget as HTMLElement).innerHTML = `<i class="bi ${visivel ? "bi-eye" : "bi-eye-slash"}"></i>`;
    campoSenha.focus();
  });

  async function entrar(): Promise<void> {
    erro.hidden = true;
    if (!campoLogin.value.trim() || !campoSenha.value) {
      erro.textContent = "Informe usuário e senha.";
      erro.hidden = false;
      (campoLogin.value.trim() ? campoSenha : campoLogin).focus();
      return;
    }
    botao.disabled = true;
    botao.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Entrando...`;
    try {
      const nova = await api.login(campoLogin.value.trim(), campoSenha.value);
      sessao.salvar(nova);
      toast(`Bem-vindo(a), ${nova.login}!`);
      location.hash = "#/pedido";
    } catch (e) {
      erro.textContent = e instanceof Error ? e.message : "Não foi possível entrar.";
      erro.hidden = false;
      campoSenha.select();
      botao.disabled = false;
      botao.innerHTML = `Entrar <i class="bi bi-arrow-right ms-1"></i>`;
    }
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    entrar();
  });
  raiz.querySelectorAll<HTMLButtonElement>("[data-login]").forEach((b) =>
    b.addEventListener("click", () => {
      campoLogin.value = b.dataset.login!;
      campoSenha.value = b.dataset.senha!;
      entrar();
    }),
  );
}
