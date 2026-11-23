/** Sessão do usuário logado (guardada só nesta aba do navegador). */
import type { Sessao } from "../models/types.js";

const CHAVE = "pizzagest.sessao";
let atual: Sessao | null = ler();

function ler(): Sessao | null {
  try {
    const bruto = sessionStorage.getItem(CHAVE);
    return bruto ? (JSON.parse(bruto) as Sessao) : null;
  } catch {
    return null;
  }
}

export const sessao = {
  obter: (): Sessao | null => atual,
  ehAdmin: (): boolean => atual?.perfil === "ADMINISTRADOR",
  salvar(nova: Sessao): void {
    atual = nova;
    try {
      sessionStorage.setItem(CHAVE, JSON.stringify(nova));
    } catch {
      /* armazenamento indisponível: segue só em memória */
    }
  },
  limpar(): void {
    atual = null;
    try {
      sessionStorage.removeItem(CHAVE);
    } catch {
      /* ignora */
    }
  },
};
