/**
 * Abre um modal do Bootstrap criado na hora. Retorna o elemento e uma função para fechá-lo.
 * O modal é removido do DOM ao fechar.
 */
export function abrirModal(conteudo: string, opcoes: { tamanho?: "sm" | "lg"; aoFechar?: () => void } = {}) {
  const el = document.createElement("div");
  el.className = "modal fade";
  el.tabIndex = -1;
  el.setAttribute("aria-modal", "true");
  el.setAttribute("role", "dialog");
  el.innerHTML = `<div class="modal-dialog modal-dialog-centered modal-dialog-scrollable ${opcoes.tamanho ? "modal-" + opcoes.tamanho : ""}">
      <div class="modal-content pg-modal">${conteudo}</div>
    </div>`;
  document.body.appendChild(el);
  const modal = bootstrap.Modal.getOrCreateInstance(el);
  el.addEventListener("hidden.bs.modal", () => {
    modal.dispose();
    el.remove();
    opcoes.aoFechar?.();
  });
  el.addEventListener("shown.bs.modal", () => el.querySelector<HTMLElement>("[autofocus]")?.focus());
  modal.show();
  return { el, fechar: () => modal.hide() };
}
