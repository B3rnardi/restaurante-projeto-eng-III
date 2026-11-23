/**
 * Servidor Node.js do PizzaGest.
 *
 * - Entrega os arquivos do front-end (frontend/public) e as bibliotecas do Bootstrap.
 * - Repassa tudo que começa com /api para a API Python (backend/api.py), em 127.0.0.1:8000.
 * - Por padrão também inicia a API Python, para o projeto subir com um único comando.
 *   Use --sem-api se preferir rodar o back-end em outro terminal.
 */
import { spawn } from "node:child_process";
import { createReadStream, existsSync, statSync } from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const PUBLIC = path.join(RAIZ, "frontend", "public");
const PORTA = Number(process.env.PORT ?? 3000);
const API = { host: "127.0.0.1", porta: 8000 };
// Pastas servidas em /vendor/... (instaladas pelo npm install)
const VENDOR = {
    "/vendor/bootstrap/": path.join(RAIZ, "node_modules", "bootstrap", "dist"),
    "/vendor/bootstrap-icons/": path.join(RAIZ, "node_modules", "bootstrap-icons", "font"),
};
const TIPOS = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".map": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".ico": "image/x-icon",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".txt": "text/plain; charset=utf-8",
};
function responderJson(res, status, dados) {
    res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(dados));
}
/** Resolve o caminho pedido para um arquivo dentro de uma pasta permitida (sem sair dela). */
function resolverArquivo(urlPath) {
    for (const [prefixo, pasta] of Object.entries(VENDOR)) {
        if (urlPath.startsWith(prefixo))
            return dentroDe(pasta, urlPath.slice(prefixo.length));
    }
    return dentroDe(PUBLIC, urlPath === "/" ? "index.html" : urlPath);
}
function dentroDe(pasta, relativo) {
    const alvo = path.resolve(pasta, "." + path.posix.normalize("/" + relativo));
    return alvo.startsWith(pasta + path.sep) || alvo === pasta ? alvo : null;
}
function servirArquivo(req, res) {
    let urlPath;
    try {
        urlPath = decodeURIComponent(new URL(req.url ?? "/", "http://localhost").pathname);
    }
    catch {
        return responderJson(res, 400, { erro: "URL inválida." });
    }
    let arquivo = resolverArquivo(urlPath);
    if (arquivo && existsSync(arquivo) && statSync(arquivo).isDirectory())
        arquivo = path.join(arquivo, "index.html");
    if (!arquivo || !existsSync(arquivo)) {
        if (urlPath.startsWith("/vendor/")) {
            res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
            return void res.end("Biblioteca não encontrada. Rode 'npm install' na pasta do projeto.");
        }
        if (path.extname(urlPath)) {
            res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
            return void res.end("Arquivo não encontrado.");
        }
        arquivo = path.join(PUBLIC, "index.html"); // rotas do front-end caem no index
    }
    res.writeHead(200, {
        "Content-Type": TIPOS[path.extname(arquivo).toLowerCase()] ?? "application/octet-stream",
        "Cache-Control": "no-cache",
    });
    createReadStream(arquivo).pipe(res);
}
/** Proxy simples: /api/* -> API Python. O navegador fala só com este servidor (sem CORS). */
function repassarParaApi(req, res) {
    const proxy = http.request({ host: API.host, port: API.porta, path: req.url, method: req.method, headers: { ...req.headers, host: `${API.host}:${API.porta}` } }, (respostaApi) => {
        res.writeHead(respostaApi.statusCode ?? 502, respostaApi.headers);
        respostaApi.pipe(res);
    });
    proxy.on("error", () => responderJson(res, 502, {
        erro: "Não foi possível falar com o back-end (API Python). Verifique se ele está rodando na porta 8000.",
    }));
    req.pipe(proxy);
}
// ------------------------------------------------------------ API Python
let processoApi = null;
function iniciarApi(candidatos) {
    const [comando, ...resto] = candidatos;
    if (!comando) {
        console.error("[WEB] Python não encontrado. Rode o back-end manualmente: python backend/api.py");
        return;
    }
    const filho = spawn(comando, [path.join(RAIZ, "backend", "api.py")], {
        cwd: RAIZ,
        env: { ...process.env, PYTHONUNBUFFERED: "1", PYTHONIOENCODING: "utf-8" },
        stdio: "inherit",
    });
    filho.on("error", (erro) => {
        if (erro.code === "ENOENT")
            return iniciarApi(resto);
        console.error(`[WEB] Falha ao iniciar a API com '${comando}':`, erro.message);
    });
    filho.on("exit", (codigo) => {
        if (processoApi === filho && codigo !== 0 && codigo !== null) {
            console.error(`[WEB] A API Python encerrou (código ${codigo}). Se a porta 8000 já estiver em uso, ela pode já estar rodando.`);
        }
    });
    processoApi = filho;
}
function encerrar() {
    processoApi?.kill();
    process.exit(0);
}
// ------------------------------------------------------------ início
const servidor = http.createServer((req, res) => {
    if (req.url?.startsWith("/api/") || req.url === "/api")
        return repassarParaApi(req, res);
    if (req.method !== "GET" && req.method !== "HEAD")
        return responderJson(res, 405, { erro: "Método não permitido." });
    servirArquivo(req, res);
});
if (!process.argv.includes("--sem-api")) {
    iniciarApi(process.platform === "win32" ? ["python", "py", "python3"] : ["python3", "python"]);
}
servidor.listen(PORTA, () => {
    if (!existsSync(VENDOR["/vendor/bootstrap/"]))
        console.warn("[WEB] Bootstrap não encontrado: rode 'npm install'.");
    console.log(`[WEB] PizzaGest no ar: http://localhost:${PORTA}`);
});
process.on("SIGINT", encerrar);
process.on("SIGTERM", encerrar);
