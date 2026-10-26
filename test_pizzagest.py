import unittest
from pizzagest import (
    BaseDadosPizzariaSingleton,
    ProdutoFactory,
    Pedido,
    PrecoMaiorValorStrategy,
    PrecoMediaStrategy,
    ServicoPizzariaController,
)


class TestPizzaGest(unittest.TestCase):

    def setUp(self):
        """Limpa a instância Singleton antes de cada teste."""
        BaseDadosPizzariaSingleton.get_instance().limpar_dados()
        self.controller = ServicoPizzariaController()

    def test_01_entrada_valida(self):
        """CT01 - Entrada válida: Calcula pedido com pizza inteira e bebidas."""
        calabresa = ProdutoFactory.create("PIZZA", "Calabresa", 50.0)
        refri = ProdutoFactory.create("BEBIDA", "Guaraná 2L", 12.0)

        pedido = Pedido("João Silva", PrecoMaiorValorStrategy())
        pedido.adicionar_produto_inteiro(calabresa, 1)
        pedido.adicionar_produto_inteiro(refri, 2)

        self.assertEqual(pedido.calcular_total(), 74.0)

    def test_02_entrada_invalida(self):
        """CT02 - Entrada inválida: Rejeita quantidade negativa ou zero."""
        mussarela = ProdutoFactory.create("PIZZA", "Mussarela", 40.0)
        pedido = Pedido("Maria Oliveira")

        with self.assertRaises(ValueError):
            pedido.adicionar_produto_inteiro(mussarela, -2)

    def test_03_regra_de_negocio_strategy(self):
        """CT03 - Regra de negócio: Pizza meio a meio pelo maior valor e pela média."""
        mussarela = ProdutoFactory.create("PIZZA", "Mussarela", 40.0)
        camarao = ProdutoFactory.create("PIZZA", "Camarão", 70.0)

        pedido = Pedido("Carlos", PrecoMaiorValorStrategy())
        pedido.adicionar_pizza_meio_a_meio(mussarela, camarao, 1)
        self.assertEqual(pedido.calcular_total(), 70.0)

        # Troca dinâmica de algoritmo (Strategy) para média promocional
        pedido_promo = Pedido("Carlos", PrecoMediaStrategy())
        pedido_promo.adicionar_pizza_meio_a_meio(mussarela, camarao, 1)
        self.assertEqual(pedido_promo.calcular_total(), 55.0)

    def test_04_integracao_entre_modulos(self):
        """CT04 - Integração: Factory + Strategy + Pedido + Singleton + Relatório."""
        portuguesa = self.controller.gerenciar_cadastro_produto("PIZZA", "Portuguesa", 55.0)
        pedido = Pedido("Fernanda")
        pedido.adicionar_produto_inteiro(portuguesa, 1)
        pedido.fechar_pedido()

        relatorio = self.controller.emitir_relatorio_vendas("ADMINISTRADOR")
        self.assertEqual(pedido.status, "FECHADO")
        self.assertEqual(relatorio["total_pedidos"], 1)
        self.assertEqual(relatorio["faturacao_total"], 55.0)

    def test_05_tratamento_de_erro_pedido_vazio(self):
        """CT05 - Tratamento de erro: Impede o fecho de um pedido sem itens."""
        pedido_vazio = Pedido("Cliente Sem Itens")

        with self.assertRaises(RuntimeError):
            pedido_vazio.fechar_pedido()


if __name__ == "__main__":
    unittest.main(verbosity=2)