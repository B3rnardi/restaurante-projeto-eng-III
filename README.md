# PizzaGest – Front-end + API local

Interface web do **PizzaGest – Sistema de Gestão de Pedidos para Delivery Local**
(Engenharia de Software III · IES300).

O front-end usa **Node.js + TypeScript + HTML + CSS com Bootstrap 5**, com as cores e a tipografia
(Lato) da apresentação. Ele conversa com o back-end em Python (`pizzagest.py`) através de uma API
HTTP local. **Não há banco de dados:** tudo fica em memória no `BaseDadosPizzariaSingleton`, então
os dados voltam ao estado inicial sempre que o servidor é reiniciado.

---

## Como rodar

**Pré-requisitos:** Node.js 18+ e Python 3.10+ (o Python não precisa de nenhuma biblioteca extra).

```bash
npm install     # instala Bootstrap, Bootstrap Icons e TypeScript
npm start       # compila o TypeScript e sobe o front-end + a API Python
```

Depois, abra **http://localhost:3000**.

| Usuário     | Senha   | Perfil        | O que pode fazer                                   |
|-------------|---------|---------------|----------------------------------------------------|
| `atendente` | `123`   | USUARIO       | Registrar pedidos, ver pedidos e cardápio          |
| `admin`     | `admin` | ADMINISTRADOR | Tudo acima + cadastrar produtos + relatório        |

A tela de login tem botões de **acesso rápido** para os dois perfis.

### Rodando o back-end separado (opcional)

O `npm start` já inicia a API Python sozinho. Se preferir dois terminais:

```bash
# terminal 1 – back-end (porta 8000)
python backend/api.py          # no Linux/macOS: python3 backend/api.py

# terminal 2 – front-end (porta 3000), sem iniciar a API
npm run start:web
```

### Outros comandos

```bash
npm run build          # só compila (TypeScript -> JavaScript)
npm run watch          # recompila o front-end a cada alteração (recarregue a página)
npm run typecheck      # verifica os tipos sem gerar arquivos
npm run test:backend   # roda os 5 testes do pizzagest.py (CT01 a CT05)
```

---

## Estrutura de pastas (três camadas)

```
pizzagest-app/
├── backend/                     ← NEGÓCIO + DADOS (Python)
│   ├── pizzagest.py             ← núcleo original, sem alterações (Singleton, Factory, Strategy)
│   ├── test_pizzagest.py        ← testes CT01–CT05
│   └── api.py                   ← adaptador HTTP: traduz rotas /api em chamadas ao controller
│
├── frontend/                    ← APRESENTAÇÃO
│   ├── server/
│   │   └── server.ts            ← servidor Node: entrega o site e repassa /api para o Python
│   ├── src/                     ← código do navegador (TypeScript)
│   │   ├── main.ts              ← ponto de entrada: layout, rotas e sessão
│   │   ├── app/                 ← estado da aplicação (router, sessão, carrinho)
│   │   ├── models/              ← tipos de dados (Produto, Pedido, Estratégia...)
│   │   ├── services/            ← comunicação com o back-end (api.ts)
│   │   ├── views/               ← telas: login, novo pedido, pedidos, cardápio, relatório
│   │   ├── components/          ← partes reutilizáveis: navbar, modal, toast, cartão de pedido
│   │   ├── utils/               ← formatação (R$, datas) e helpers de HTML
│   │   └── types/               ← tipagem do Bootstrap carregado no navegador
│   └── public/                  ← o que o navegador recebe
│       ├── index.html
│       ├── css/tokens.css       ← paleta e tipografia dos slides + ajustes do Bootstrap
│       ├── css/app.css          ← estilos das telas
│       ├── assets/              ← fonte Lato (OFL) e ícone
│       └── js/                  ← gerado pelo TypeScript (não versionar)
│
├── package.json · tsconfig.json · tsconfig.server.json
└── README.md
```

O fluxo de uma requisição é:
**Tela (views) → services/api.ts → servidor Node (/api) → backend/api.py → ServicoPizzariaController / Pedido → BaseDadosPizzariaSingleton**.

Como a API apenas reaproveita as classes de `pizzagest.py`, a interface de console
(`executar_prototipo`) pôde ser trocada por uma interface web **sem mudar nenhuma regra de negócio**.

---

## Onde os padrões GoF aparecem na interface

| Padrão        | Na tela                                                                                       | No back-end                                                        |
|---------------|-----------------------------------------------------------------------------------------------|--------------------------------------------------------------------|
| **Singleton** | Números de pedido sequenciais; pedidos, cardápio e relatório sempre mostram os mesmos dados   | `BaseDadosPizzariaSingleton` guarda tudo em memória                |
| **Factory**   | Cardápio → *Novo produto* (Pizza ou Bebida), só para o administrador                          | `controller.gerenciar_cadastro_produto()` → `ProdutoFactory.create()` |
| **Strategy**  | Novo pedido → *Preço do meio a meio* (Maior valor / Média) e a comparação no modal meio a meio | `PrecoMaiorValorStrategy` / `PrecoMediaStrategy` aplicadas pelo `Pedido` |

Exemplo do projeto: Mussarela (R$ 40,00) + Camarão (R$ 70,00) custa **R$ 70,00** pela regra
*Maior valor* e **R$ 55,00** pela regra *Média*.

---

## Rotas da API (backend/api.py)

Todas as rotas, exceto o login, exigem o cabeçalho `Authorization: Bearer <token>`.

| Método | Rota                       | Descrição                                                    |
|--------|----------------------------|--------------------------------------------------------------|
| POST   | `/api/login`               | `{login, senha}` → `{token, login, perfil}`                  |
| POST   | `/api/logout`              | Encerra a sessão                                             |
| GET    | `/api/produtos`            | Lista o cardápio                                             |
| POST   | `/api/produtos`            | `{tipo: "PIZZA"\|"BEBIDA", nome, preco}` (somente admin)     |
| GET    | `/api/estrategias`         | Regras de preço do meio a meio                               |
| POST   | `/api/precos/meio-a-meio`  | `{sabor1, sabor2, estrategia}` → `{preco}`                   |
| GET    | `/api/pedidos`             | Pedidos fechados                                             |
| POST   | `/api/pedidos`             | `{cliente, estrategia, itens[]}` → cria, fecha e grava       |
| GET    | `/api/relatorio`           | Total de pedidos e faturamento (somente admin)               |

Os erros do núcleo voltam com a mensagem original, por exemplo
`"Não é possível fechar um pedido sem itens."` ou `"Apenas o Administrador pode emitir relatórios."`.

---

## Observações

- **Sem banco de dados:** reiniciar o `npm start` limpa pedidos, produtos cadastrados e sessões.
- O servidor Python atende uma requisição por vez, porque o Singleton não é *thread-safe*
  (ponto já registrado no relatório técnico).
- Se aparecer *"Python não encontrado"*, rode o back-end manualmente (`python backend/api.py`) e use
  `npm run start:web`.
- Se a porta 8000 ou 3000 estiver ocupada, feche a outra instância. A porta do front-end pode ser
  trocada com a variável `PORT` (ex.: `PORT=4000 npm start` no Linux/macOS).
