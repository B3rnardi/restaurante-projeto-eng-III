/** Roteamento por hash (#/rota): troca a tela sem recarregar a página. */
import { sessao } from "./session.js";

export type Limpeza = () => void;
export type Tela = (raiz: HTMLElement) => void | Limpeza | Promise<void | Limpeza>;

interface Rota {
  tela: Tela;
  publica?: boolean;
  somenteAdmin?: boolean;
}

export function criarRouter(rotas: Record<string, Rota>, aoTrocar: (rota: string, publica: boolean) => HTMLElement) {
  let limpezaAtual: Limpeza | void;

  async function navegar(): Promise<void> {
    const logado = sessao.obter() !== null;
    let rota = location.hash || (logado ? "#/pedido" : "#/login");
    if (!rotas[rota]) rota = logado ? "#/pedido" : "#/login";
    if (!logado && !rotas[rota].publica) rota = "#/login";
    if (logado && rota === "#/login") rota = "#/pedido";
    if (rotas[rota].somenteAdmin && !sessao.ehAdmin()) rota = "#/pedido";
    if (location.hash !== rota) history.replaceState(null, "", rota);

    if (typeof limpezaAtual === "function") limpezaAtual();
    const raiz = aoTrocar(rota, !!rotas[rota].publica);
    window.scrollTo({ top: 0 });
    limpezaAtual = await rotas[rota].tela(raiz);
  }

  window.addEventListener("hashchange", navegar);
  return { navegar, ir: (rota: string) => (location.hash === rota ? navegar() : (location.hash = rota)) };
}
