import { html } from "../utils/dom.js";

type Tipo = "sucesso" | "erro" | "info";
const ICONES: Record<Tipo, string> = { sucesso: "bi-check-circle-fill", erro: "bi-exclamation-triangle-fill", info: "bi-info-circle-fill" };

/** Mostra uma notificação rápida no canto da tela. */
export function toast(mensagem: string, tipo: Tipo = "sucesso"): void {
  const area = document.getElementById("toasts");
  if (!area) return;
  const el = document.createElement("div");
  el.className = `toast pg-toast pg-toast-${tipo}`;
  el.setAttribute("role", tipo === "erro" ? "alert" : "status");
  el.innerHTML = html`<div class="d-flex align-items-center gap-2 p-3">
      <i class="bi ${ICONES[tipo]} fs-5"></i>
      <div class="flex-grow-1">${mensagem}</div>
      <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Fechar"></button>
    </div>`;
  area.appendChild(el);
  el.addEventListener("hidden.bs.toast", () => el.remove());
  bootstrap.Toast.getOrCreateInstance(el, { delay: tipo === "erro" ? 6000 : 3000 }).show();
}

export const toastErro = (erro: unknown): void => toast(erro instanceof Error ? erro.message : String(erro), "erro");
