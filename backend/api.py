"""
API HTTP do PizzaGest (adaptador da camada de apresentação).

Expõe o núcleo do sistema (pizzagest.py) em rotas REST/JSON para o front-end.
Não altera nenhuma regra de negócio: apenas traduz requisições HTTP em chamadas
ao ServicoPizzariaController, à ProdutoFactory, às estratégias de preço e ao Pedido.

- Sem banco de dados: tudo fica no BaseDadosPizzariaSingleton, em memória.
- Sem dependências externas: usa somente a biblioteca padrão do Python (3.10+).

Executar:  python backend/api.py     (escuta em http://127.0.0.1:8000)
"""
import json
import secrets
import sys
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import urlparse

from pizzagest import (
    BaseDadosPizzariaSingleton,
    Pedido,
    PrecoMaiorValorStrategy,
    PrecoMediaStrategy,
    ServicoPizzariaController,
)

HOST, PORT = "127.0.0.1", 8000

controller = ServicoPizzariaController()
db = BaseDadosPizzariaSingleton.get_instance()

# Sessões ativas (token -> utilizador). Também em memória: reiniciar a API desloga todos.
sessoes: dict[str, dict] = {}

# Estratégias de preço disponíveis (padrão Strategy). A chave é o id usado pelo front-end.
ESTRATEGIAS = {
    "MAIOR_VALOR": {
        "classe": PrecoMaiorValorStrategy,
        "nome": "Maior valor",
        "descricao": "Cobra o sabor mais caro (regra padrão).",
    },
    "MEDIA": {
        "classe": PrecoMediaStrategy,
        "nome": "Média",
        "descricao": "Cobra a média dos dois sabores (promoção).",
    },
}


class ErroApi(Exception):
    def __init__(self, status: HTTPStatus, mensagem: str):
        super().__init__(mensagem)
        self.status = status
        self.mensagem = mensagem


# ---------------------------------------------------------------- serialização
def produto_json(produto) -> dict:
    return {
        "id": produto.nome.lower(),
        "nome": produto.nome,
        "categoria": produto.get_categoria(),
        "preco": produto.preco_base,
    }


def estrategia_id(estrategia) -> str:
    for chave, info in ESTRATEGIAS.items():
        if isinstance(estrategia, info["classe"]):
            return chave
    return "MAIOR_VALOR"


def pedido_json(pedido) -> dict:
    eid = estrategia_id(pedido.estrategia_preco)
    return {
        "numero": pedido.numero,
        "cliente": pedido.cliente,
        "dataHora": pedido.data_hora.isoformat(timespec="seconds"),
        "status": pedido.status,
        "estrategia": {"id": eid, "nome": ESTRATEGIAS[eid]["nome"]},
        "itens": [
            {
                "descricao": item.descricao,
                "quantidade": item.quantidade,
                "precoUnitario": item.preco_unitario,
                "subtotal": item.subtotal,
            }
            for item in pedido.itens
        ],
        "total": pedido.calcular_total(),
    }


# ---------------------------------------------------------------- auxiliares
def buscar_produto(produto_id) -> object:
    produto = db.cardapio.get(str(produto_id or "").strip().lower())
    if produto is None:
        raise ErroApi(HTTPStatus.BAD_REQUEST, f"Produto não encontrado no cardápio: {produto_id}")
    return produto


def buscar_pizza(produto_id):
    produto = buscar_produto(produto_id)
    if produto.get_categoria() != "Pizza":
        raise ErroApi(HTTPStatus.BAD_REQUEST, f"'{produto.nome}' não é uma pizza.")
    return produto


def criar_estrategia(eid):
    info = ESTRATEGIAS.get(str(eid or "MAIOR_VALOR").upper())
    if info is None:
        raise ErroApi(HTTPStatus.BAD_REQUEST, f"Estratégia de preço desconhecida: {eid}")
    return info["classe"]()


def inteiro(valor, campo: str) -> int:
    try:
        return int(valor)
    except (TypeError, ValueError):
        raise ErroApi(HTTPStatus.BAD_REQUEST, f"O campo '{campo}' deve ser um número inteiro.")


def numero(valor, campo: str) -> float:
    try:
        return float(valor)
    except (TypeError, ValueError):
        raise ErroApi(HTTPStatus.BAD_REQUEST, f"O campo '{campo}' deve ser um número.")


# ---------------------------------------------------------------- rotas
def rota_login(corpo, _sessao):
    login = str(corpo.get("login", "")).strip()
    perfil = controller.realizar_login(login, str(corpo.get("senha", "")))
    if perfil is None:
        raise ErroApi(HTTPStatus.UNAUTHORIZED, "Login ou senha inválidos.")
    token = secrets.token_hex(16)
    sessoes[token] = {"login": login, "perfil": perfil}
    return {"token": token, "login": login, "perfil": perfil}


def rota_logout(_corpo, sessao):
    sessoes.pop(sessao["token"], None)
    return {"ok": True}


def rota_listar_produtos(_corpo, _sessao):
    produtos = sorted(db.cardapio.values(), key=lambda p: (p.get_categoria() != "Pizza", p.nome))
    return [produto_json(p) for p in produtos]


def rota_cadastrar_produto(corpo, sessao):
    if sessao["perfil"] != "ADMINISTRADOR":
        raise ErroApi(HTTPStatus.FORBIDDEN, "Apenas o Administrador pode cadastrar produtos.")
    nome = str(corpo.get("nome", ""))
    if nome.strip().lower() in db.cardapio:
        raise ErroApi(HTTPStatus.CONFLICT, f"Já existe um produto chamado '{nome.strip()}'.")
    # Factory: o controlador decide a subclasse (Pizza ou Bebida) a partir do tipo.
    produto = controller.gerenciar_cadastro_produto(
        str(corpo.get("tipo", "")), nome, numero(corpo.get("preco"), "preco")
    )
    return produto_json(produto)


def rota_listar_estrategias(_corpo, _sessao):
    return [{"id": k, "nome": v["nome"], "descricao": v["descricao"]} for k, v in ESTRATEGIAS.items()]


def rota_preco_meio_a_meio(corpo, _sessao):
    # Strategy: a mesma dupla de sabores tem preços diferentes conforme a regra escolhida.
    sabor1 = buscar_pizza(corpo.get("sabor1"))
    sabor2 = buscar_pizza(corpo.get("sabor2"))
    estrategia = criar_estrategia(corpo.get("estrategia"))
    return {"preco": estrategia.calcular_preco_pizza(sabor1, sabor2)}


def rota_registrar_pedido(corpo, _sessao):
    itens = corpo.get("itens") or []
    if not isinstance(itens, list):
        raise ErroApi(HTTPStatus.BAD_REQUEST, "O campo 'itens' deve ser uma lista.")

    # Valida e resolve os itens antes de abrir o pedido: o Pedido gera seu número no
    # construtor (Singleton), então uma falha depois disso deixaria um "buraco" na numeração.
    # As mensagens são as mesmas que o núcleo usa em fechar_pedido() e ItemPedido.
    if not itens:
        raise ErroApi(HTTPStatus.BAD_REQUEST, "Não é possível fechar um pedido sem itens.")
    resolvidos = []
    for item in itens:
        quantidade = inteiro(item.get("quantidade"), "quantidade")
        if quantidade <= 0:
            raise ErroApi(HTTPStatus.BAD_REQUEST, "A quantidade deve ser maior que zero.")
        if item.get("tipo") == "MEIO_A_MEIO":
            resolvidos.append(("MEIO", buscar_pizza(item.get("sabor1")), buscar_pizza(item.get("sabor2")), quantidade))
        else:
            resolvidos.append(("INTEIRO", buscar_produto(item.get("produto")), None, quantidade))

    pedido = Pedido(str(corpo.get("cliente", "")), criar_estrategia(corpo.get("estrategia")))
    for tipo, produto, sabor2, quantidade in resolvidos:
        if tipo == "MEIO":
            pedido.adicionar_pizza_meio_a_meio(produto, sabor2, quantidade)
        else:
            pedido.adicionar_produto_inteiro(produto, quantidade)
    pedido.fechar_pedido()  # FECHADO + gravado no Singleton (RuntimeError se vazio)
    return pedido_json(pedido)


def rota_listar_pedidos(_corpo, _sessao):
    return [pedido_json(p) for p in sorted(db.pedidos, key=lambda p: p.numero, reverse=True)]


def rota_relatorio(_corpo, sessao):
    relatorio = controller.emitir_relatorio_vendas(sessao["perfil"])  # PermissionError se não for admin
    return {
        "totalPedidos": relatorio["total_pedidos"],
        "faturamentoTotal": relatorio["faturacao_total"],
        "pedidos": [pedido_json(p) for p in sorted(relatorio["pedidos"], key=lambda p: p.numero, reverse=True)],
    }


# (método, caminho) -> (função, exige login)
ROTAS = {
    ("POST", "/api/login"): (rota_login, False),
    ("POST", "/api/logout"): (rota_logout, True),
    ("GET", "/api/produtos"): (rota_listar_produtos, True),
    ("POST", "/api/produtos"): (rota_cadastrar_produto, True),
    ("GET", "/api/estrategias"): (rota_listar_estrategias, True),
    ("POST", "/api/precos/meio-a-meio"): (rota_preco_meio_a_meio, True),
    ("GET", "/api/pedidos"): (rota_listar_pedidos, True),
    ("POST", "/api/pedidos"): (rota_registrar_pedido, True),
    ("GET", "/api/relatorio"): (rota_relatorio, True),
}


class PizzaGestHandler(BaseHTTPRequestHandler):
    server_version = "PizzaGestAPI/1.0"

    def _responder(self, status: HTTPStatus, dados) -> None:
        corpo = json.dumps(dados, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(corpo)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.end_headers()
        self.wfile.write(corpo)

    def do_OPTIONS(self):
        self._responder(HTTPStatus.NO_CONTENT, {})

    def do_GET(self):
        self._despachar("GET")

    def do_POST(self):
        self._despachar("POST")

    def _despachar(self, metodo: str) -> None:
        caminho = urlparse(self.path).path.rstrip("/")
        try:
            if caminho == "/api/saude":
                return self._responder(HTTPStatus.OK, {"status": "ok"})
            rota = ROTAS.get((metodo, caminho))
            if rota is None:
                raise ErroApi(HTTPStatus.NOT_FOUND, "Rota não encontrada.")
            funcao, exige_login = rota

            sessao = None
            if exige_login:
                token = self.headers.get("Authorization", "").removeprefix("Bearer ").strip()
                if token not in sessoes:
                    raise ErroApi(HTTPStatus.UNAUTHORIZED, "Sessão expirada. Faça login novamente.")
                sessao = {**sessoes[token], "token": token}

            corpo = {}
            if metodo == "POST":
                tamanho = int(self.headers.get("Content-Length") or 0)
                if tamanho:
                    try:
                        corpo = json.loads(self.rfile.read(tamanho) or b"{}")
                    except json.JSONDecodeError:
                        raise ErroApi(HTTPStatus.BAD_REQUEST, "JSON inválido.")
                if not isinstance(corpo, dict):
                    raise ErroApi(HTTPStatus.BAD_REQUEST, "O corpo da requisição deve ser um objeto JSON.")

            status = HTTPStatus.CREATED if metodo == "POST" and caminho in ("/api/produtos", "/api/pedidos") else HTTPStatus.OK
            self._responder(status, funcao(corpo, sessao))

        # As exceções do núcleo viram respostas HTTP com a mensagem original.
        except ErroApi as e:
            self._responder(e.status, {"erro": e.mensagem})
        except PermissionError as e:
            self._responder(HTTPStatus.FORBIDDEN, {"erro": str(e)})
        except (ValueError, RuntimeError) as e:
            self._responder(HTTPStatus.BAD_REQUEST, {"erro": str(e)})
        except Exception as e:  # noqa: BLE001 - nunca derrubar o servidor
            self._responder(HTTPStatus.INTERNAL_SERVER_ERROR, {"erro": f"Erro interno: {e}"})

    def log_message(self, formato, *args):
        sys.stdout.write("[API] %s\n" % (formato % args))


def popular_cardapio() -> None:
    """Cardápio inicial, criado pela Factory (como no executar_prototipo)."""
    itens = [
        ("PIZZA", "Mussarela", 40.00),
        ("PIZZA", "Calabresa", 50.00),
        ("PIZZA", "Frango com Catupiry", 52.00),
        ("PIZZA", "Portuguesa", 55.00),
        ("PIZZA", "Quatro Queijos", 58.00),
        ("PIZZA", "Camarão", 70.00),
        ("BEBIDA", "Refrigerante 2L", 12.00),
        ("BEBIDA", "Guaraná 2L", 12.00),
        ("BEBIDA", "Suco Natural 500ml", 9.00),
        ("BEBIDA", "Água 500ml", 4.00),
    ]
    for tipo, nome, preco in itens:
        controller.gerenciar_cadastro_produto(tipo, nome, preco)


def main() -> None:
    popular_cardapio()
    # HTTPServer atende uma requisição por vez: o Singleton não é thread-safe.
    servidor = HTTPServer((HOST, PORT), PizzaGestHandler)
    print(f"[API] PizzaGest rodando em http://{HOST}:{PORT}  (Ctrl+C para parar)")
    print("[API] Usuários: atendente / 123  ·  admin / admin")
    try:
        servidor.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        servidor.server_close()


if __name__ == "__main__":
    main()
