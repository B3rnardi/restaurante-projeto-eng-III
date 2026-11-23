/** Modelos de dados trocados com a API (espelham as classes de pizzagest.py). */

export type Perfil = "USUARIO" | "ADMINISTRADOR";
export type Categoria = "Pizza" | "Bebida";
export type EstrategiaId = "MAIOR_VALOR" | "MEDIA";

export interface Sessao {
  token: string;
  login: string;
  perfil: Perfil;
}

/** Produto do cardápio (Pizza ou Bebida, criado pela ProdutoFactory). */
export interface Produto {
  id: string;
  nome: string;
  categoria: Categoria;
  preco: number;
}

/** Regra de preço da pizza meio a meio (padrão Strategy). */
export interface Estrategia {
  id: EstrategiaId;
  nome: string;
  descricao: string;
}

export interface ItemPedido {
  descricao: string;
  quantidade: number;
  precoUnitario: number;
  subtotal: number;
}

export interface Pedido {
  numero: number;
  cliente: string;
  dataHora: string;
  status: "ABERTO" | "FECHADO";
  estrategia: { id: EstrategiaId; nome: string };
  itens: ItemPedido[];
  total: number;
}

export interface Relatorio {
  totalPedidos: number;
  faturamentoTotal: number;
  pedidos: Pedido[];
}

/** Item como é enviado para POST /api/pedidos. */
export type ItemNovoPedido =
  | { tipo: "INTEIRO"; produto: string; quantidade: number }
  | { tipo: "MEIO_A_MEIO"; sabor1: string; sabor2: string; quantidade: number };

export interface NovoPedido {
  cliente: string;
  estrategia: EstrategiaId;
  itens: ItemNovoPedido[];
}

/** Item do carrinho no navegador (antes de o pedido ser fechado no back-end). */
export interface ItemCarrinho {
  chave: string;
  tipo: "INTEIRO" | "MEIO_A_MEIO";
  descricao: string;
  categoria: Categoria;
  produto?: string;
  sabor1?: string;
  sabor2?: string;
  quantidade: number;
  precoUnitario: number;
}
