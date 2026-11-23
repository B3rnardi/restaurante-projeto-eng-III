/**
 * Carrinho do pedido em montagem. Fica no navegador até o pedido ser fechado;
 * o total oficial e o número do pedido vêm do back-end ao fechar.
 */
import type { EstrategiaId, ItemCarrinho, NovoPedido } from "../models/types.js";

const CHAVE = "pizzagest.carrinho";

interface Estado {
  cliente: string;
  estrategia: EstrategiaId;
  itens: ItemCarrinho[];
}

type Ouvinte = (estado: Readonly<Estado>) => void;

const vazio = (): Estado => ({ cliente: "", estrategia: "MAIOR_VALOR", itens: [] });
let estado: Estado = carregar();
const ouvintes = new Set<Ouvinte>();

function carregar(): Estado {
  try {
    const bruto = sessionStorage.getItem(CHAVE);
    return bruto ? { ...vazio(), ...(JSON.parse(bruto) as Estado) } : vazio();
  } catch {
    return vazio();
  }
}

function mudou(): void {
  try {
    sessionStorage.setItem(CHAVE, JSON.stringify(estado));
  } catch {
    /* ignora */
  }
  ouvintes.forEach((fn) => fn(estado));
}

export const carrinho = {
  get estado(): Readonly<Estado> {
    return estado;
  },
  get total(): number {
    return estado.itens.reduce((soma, i) => soma + i.quantidade * i.precoUnitario, 0);
  },
  get quantidadeItens(): number {
    return estado.itens.reduce((soma, i) => soma + i.quantidade, 0);
  },
  assinar(fn: Ouvinte): () => void {
    ouvintes.add(fn);
    return () => ouvintes.delete(fn);
  },

  definirCliente(cliente: string): void {
    estado.cliente = cliente;
    try {
      sessionStorage.setItem(CHAVE, JSON.stringify(estado));
    } catch {
      /* ignora */
    }
  },
  definirEstrategia(estrategia: EstrategiaId, novosPrecos: Map<string, number>): void {
    estado.estrategia = estrategia;
    estado.itens = estado.itens.map((i) => (novosPrecos.has(i.chave) ? { ...i, precoUnitario: novosPrecos.get(i.chave)! } : i));
    mudou();
  },
  /** Adiciona um item; se já existir um igual, soma a quantidade. */
  adicionar(item: Omit<ItemCarrinho, "chave">): void {
    const chave = item.tipo === "INTEIRO" ? `I:${item.produto}` : `M:${[item.sabor1, item.sabor2].sort().join("|")}`;
    const existente = estado.itens.find((i) => i.chave === chave);
    if (existente) existente.quantidade += item.quantidade;
    else estado.itens.push({ ...item, chave });
    mudou();
  },
  alterarQuantidade(chave: string, delta: number): void {
    const item = estado.itens.find((i) => i.chave === chave);
    if (!item) return;
    item.quantidade += delta;
    if (item.quantidade <= 0) estado.itens = estado.itens.filter((i) => i.chave !== chave);
    mudou();
  },
  remover(chave: string): void {
    estado.itens = estado.itens.filter((i) => i.chave !== chave);
    mudou();
  },
  limpar(): void {
    estado = vazio();
    mudou();
  },
  /** Monta o corpo de POST /api/pedidos. */
  paraEnvio(): NovoPedido {
    return {
      cliente: estado.cliente.trim(),
      estrategia: estado.estrategia,
      itens: estado.itens.map((i) =>
        i.tipo === "INTEIRO"
          ? { tipo: "INTEIRO", produto: i.produto!, quantidade: i.quantidade }
          : { tipo: "MEIO_A_MEIO", sabor1: i.sabor1!, sabor2: i.sabor2!, quantidade: i.quantidade },
      ),
    };
  },
};
