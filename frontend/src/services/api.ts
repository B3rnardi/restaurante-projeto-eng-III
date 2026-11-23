/**
 * Cliente HTTP da API do PizzaGest.
 * Toda comunicação com o back-end passa por aqui (o servidor Node repassa /api para o Python).
 */
import type { Estrategia, EstrategiaId, NovoPedido, Pedido, Produto, Relatorio, Sessao } from "../models/types.js";
import { sessao } from "../app/session.js";

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

/** Chamado quando a sessão expira (definido pelo app para voltar ao login). */
let aoExpirarSessao: () => void = () => {};
export const definirAoExpirarSessao = (fn: () => void): void => {
  aoExpirarSessao = fn;
};

async function requisitar<T>(metodo: "GET" | "POST", caminho: string, corpo?: unknown): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const atual = sessao.obter();
  if (atual) headers.Authorization = `Bearer ${atual.token}`;

  let resposta: Response;
  try {
    resposta = await fetch(`/api${caminho}`, {
      method: metodo,
      headers,
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
    });
  } catch {
    throw new ApiError("Sem conexão com o servidor. Ele está rodando (npm start)?", 0);
  }

  const dados = await resposta.json().catch(() => ({}));
  if (!resposta.ok) {
    const mensagem = (dados as { erro?: string }).erro ?? `Erro ${resposta.status}`;
    if (resposta.status === 401 && caminho !== "/login") aoExpirarSessao();
    throw new ApiError(mensagem, resposta.status);
  }
  return dados as T;
}

export const api = {
  login: (login: string, senha: string) => requisitar<Sessao>("POST", "/login", { login, senha }),
  logout: () => requisitar<{ ok: boolean }>("POST", "/logout"),

  /** Pizzas primeiro, depois bebidas, em ordem alfabética (pt-BR). */
  listarProdutos: () =>
    requisitar<Produto[]>("GET", "/produtos").then((lista) =>
      lista.sort((a, b) => (a.categoria === b.categoria ? a.nome.localeCompare(b.nome, "pt-BR") : a.categoria === "Pizza" ? -1 : 1)),
    ),
  cadastrarProduto: (tipo: "PIZZA" | "BEBIDA", nome: string, preco: number) =>
    requisitar<Produto>("POST", "/produtos", { tipo, nome, preco }),

  listarEstrategias: () => requisitar<Estrategia[]>("GET", "/estrategias"),
  precoMeioAMeio: (sabor1: string, sabor2: string, estrategia: EstrategiaId) =>
    requisitar<{ preco: number }>("POST", "/precos/meio-a-meio", { sabor1, sabor2, estrategia }),

  listarPedidos: () => requisitar<Pedido[]>("GET", "/pedidos"),
  registrarPedido: (pedido: NovoPedido) => requisitar<Pedido>("POST", "/pedidos", pedido),

  relatorio: () => requisitar<Relatorio>("GET", "/relatorio"),
};
