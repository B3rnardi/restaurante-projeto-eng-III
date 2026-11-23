from abc import ABC, abstractmethod
from datetime import datetime


# =====================================================================
# CAMADA DE DADOS E PADRÃO SINGLETON
# =====================================================================
class BaseDadosPizzariaSingleton:
    """
    Padrão GoF SINGLETON: Garante uma única instância para um recurso
    partilhado (base de dados em memória e gerador de senhas de pedidos).
    """
    _instancia = None

    def __new__(cls):
        if cls._instancia is None:
            cls._instancia = super().__new__(cls)
            cls._instancia._inicializar()
        return cls._instancia

    def _inicializar(self):
        self.sequencial_pedido = 0
        self.pedidos = []
        self.cardapio = {}
        self.utilizadores = {
            "atendente": {"senha": "123", "perfil": "USUARIO"},
            "admin": {"senha": "admin", "perfil": "ADMINISTRADOR"}
        }

    @classmethod
    def get_instance(cls):
        return cls()

    def gerar_numero_pedido(self) -> int:
        self.sequencial_pedido += 1
        return self.sequencial_pedido

    def registar_produto(self, produto):
        self.cardapio[produto.nome.lower()] = produto

    def guardar_pedido(self, pedido):
        self.pedidos.append(pedido)

    def limpar_dados(self):
        self._inicializar()


# =====================================================================
# CAMADA DE NEGÓCIO: PADRÃO FACTORY (Criação de Produtos)
# =====================================================================
class Produto(ABC):
    def __init__(self, nome: str, preco_base: float):
        if not nome or not nome.strip():
            raise ValueError("O nome do produto é obrigatório.")
        if preco_base <= 0:
            raise ValueError("O preço do produto deve ser maior que zero.")
        self.nome = nome.strip()
        self.preco_base = float(preco_base)

    @abstractmethod
    def get_categoria(self) -> str:
        pass


class Pizza(Produto):
    def get_categoria(self) -> str:
        return "Pizza"


class Bebida(Produto):
    def get_categoria(self) -> str:
        return "Bebida"


class ProdutoFactory:
    """
    Padrão GoF FACTORY: Cria objetos (Pizza ou Bebida) sem expor
    a lógica de instanciação ao cliente.
    """
    @staticmethod
    def create(tipo: str, nome: str, preco: float) -> Produto:
        if not tipo:
            raise ValueError("O tipo de produto não pode ser vazio.")
        tipo_normalizado = tipo.strip().upper()
        if tipo_normalizado == "PIZZA":
            return Pizza(nome, preco)
        elif tipo_normalizado == "BEBIDA":
            return Bebida(nome, preco)
        else:
            raise ValueError(f"Tipo de produto desconhecido: {tipo}")


# =====================================================================
# CAMADA DE NEGÓCIO: PADRÃO STRATEGY (Cálculo de Preço Meio a Meio)
# =====================================================================
class CalculoPrecoStrategy(ABC):
    """
    Padrão GoF STRATEGY: Define uma família de algoritmos de precificação
    permitindo trocá-los sem alterar o contexto do pedido.
    """
    @abstractmethod
    def calcular_preco_pizza(self, sabor1: Produto, sabor2: Produto) -> float:
        pass


class PrecoMaiorValorStrategy(CalculoPrecoStrategy):
    """Cobra pelo sabor mais caro na pizza meio a meio (regra padrão)."""
    def calcular_preco_pizza(self, sabor1: Produto, sabor2: Produto) -> float:
        return max(sabor1.preco_base, sabor2.preco_base)


class PrecoMediaStrategy(CalculoPrecoStrategy):
    """Cobra a média simples entre os dois sabores (regra promocional)."""
    def calcular_preco_pizza(self, sabor1: Produto, sabor2: Produto) -> float:
        return (sabor1.preco_base + sabor2.preco_base) / 2.0


# =====================================================================
# CAMADA DE NEGÓCIO: ENTIDADES DE DOMÍNIO E SERVIÇOS
# =====================================================================
class ItemPedido:
    def __init__(self, descricao: str, quantidade: int, preco_unitario: float):
        if quantidade <= 0:
            raise ValueError("A quantidade deve ser maior que zero.")
        if preco_unitario <= 0:
            raise ValueError("O preço unitário deve ser maior que zero.")
        self.descricao = descricao
        self.quantidade = quantidade
        self.preco_unitario = preco_unitario

    @property
    def subtotal(self) -> float:
        return self.quantidade * self.preco_unitario


class Pedido:
    def __init__(self, cliente: str, estrategia_preco: CalculoPrecoStrategy = None):
        if not cliente or not cliente.strip():
            raise ValueError("O nome do cliente é obrigatório.")
        self.numero = BaseDadosPizzariaSingleton.get_instance().gerar_numero_pedido()
        self.cliente = cliente.strip()
        self.data_hora = datetime.now()
        self.itens: list[ItemPedido] = []
        self.status = "ABERTO"
        self.estrategia_preco = estrategia_preco or PrecoMaiorValorStrategy()

    def alterar_estrategia(self, nova_estrategia: CalculoPrecoStrategy):
        self.estrategia_preco = nova_estrategia

    def adicionar_produto_inteiro(self, produto: Produto, quantidade: int):
        item = ItemPedido(produto.nome, quantidade, produto.preco_base)
        self.itens.append(item)

    def adicionar_pizza_meio_a_meio(self, sabor1: Produto, sabor2: Produto, quantidade: int):
        preco = self.estrategia_preco.calcular_preco_pizza(sabor1, sabor2)
        descricao = f"Pizza 1/2 {sabor1.nome} + 1/2 {sabor2.nome}"
        item = ItemPedido(descricao, quantidade, preco)
        self.itens.append(item)

    def calcular_total(self) -> float:
        return sum(item.subtotal for item in self.itens)

    def fechar_pedido(self):
        if not self.itens:
            raise RuntimeError("Não é possível fechar um pedido sem itens.")
        self.status = "FECHADO"
        BaseDadosPizzariaSingleton.get_instance().guardar_pedido(self)


class ServicoPizzariaController:
    """Controlador da Camada de Negócio que orquestra Login, Cadastros e Relatórios."""
    def __init__(self):
        self.db = BaseDadosPizzariaSingleton.get_instance()

    def realizar_login(self, login: str, senha: str) -> str | None:
        registo = self.db.utilizadores.get(login)
        if registo and registo["senha"] == senha:
            return registo["perfil"]
        return None

    def gerenciar_cadastro_produto(self, tipo: str, nome: str, preco: float) -> Produto:
        produto = ProdutoFactory.create(tipo, nome, preco)
        self.db.registar_produto(produto)
        return produto

    def emitir_relatorio_vendas(self, perfil_utilizador: str) -> dict:
        if perfil_utilizador != "ADMINISTRADOR":
            raise PermissionError("Apenas o Administrador pode emitir relatórios.")
        pedidos_fechados = [p for p in self.db.pedidos if p.status == "FECHADO"]
        faturacao_total = sum(p.calcular_total() for p in pedidos_fechados)
        return {
            "total_pedidos": len(pedidos_fechados),
            "faturacao_total": faturacao_total,
            "pedidos": pedidos_fechados
        }


# =====================================================================
# CAMADA DE APRESENTAÇÃO (Protótipo Interativo em Consola)
# =====================================================================
def executar_prototipo():
    controller = ServicoPizzariaController()

    # Pré-registo de itens no cardápio usando a Factory
    mussarela = controller.gerenciar_cadastro_produto("PIZZA", "Mussarela", 40.00)
    camarao = controller.gerenciar_cadastro_produto("PIZZA", "Camarão", 70.00)
    refri = controller.gerenciar_cadastro_produto("BEBIDA", "Refrigerante 2L", 12.00)

    print("=" * 55)
    print(" 🍕 BEM-VINDO(A) AO SISTEMA PIZZAGEST (PROTÓTIPO) ")
    print("=" * 55)

    # 1. Caso de Uso: Realizar Login
    perfil = controller.realizar_login("admin", "admin")
    print(f"[LOGIN] Autenticado com sucesso! Perfil: {perfil}\n")

    # 2. Registo de Pedido com Padrão Strategy (Maior Valor vs Média)
    pedido1 = Pedido("Carlos Mendes", estrategia_preco=PrecoMaiorValorStrategy())
    pedido1.adicionar_pizza_meio_a_meio(mussarela, camarao, quantidade=1)
    pedido1.adicionar_produto_inteiro(refri, quantidade=2)
    pedido1.fechar_pedido()

    pedido2 = Pedido("Ana Sousa", estrategia_preco=PrecoMediaStrategy())
    pedido2.adicionar_pizza_meio_a_meio(mussarela, camarao, quantidade=1)
    pedido2.fechar_pedido()

    # 3. Caso de Uso: Emitir Relatórios (Exclusivo Administrador)
    relatorio = controller.emitir_relatorio_vendas(perfil)
    print("📊 RESUMO GERAL E ATIVIDADES RECENTES:")
    print(f"Total de Pedidos Fechados: {relatorio['total_pedidos']}")
    print(f"Faturação Total: R$ {relatorio['faturacao_total']:.2f}\n")

    for p in relatorio["pedidos"]:
        print(f"Pedido #{p.numero} | Cliente: {p.cliente} | Status: {p.status}")
        for item in p.itens:
            print(f"  - {item.quantidade}x {item.descricao}: R$ {item.subtotal:.2f}")
        print(f"  Total do Pedido: R$ {p.calcular_total():.2f}\n")


if __name__ == "__main__":
    executar_prototipo()