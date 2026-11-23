/** Escapa texto para uso seguro dentro de HTML. */
export function esc(valor: unknown): string {
  return String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Template literal que escapa as variáveis; use raw() para HTML já confiável. */
export class Raw {
  constructor(readonly html: string) {}
}
export const raw = (html: string): Raw => new Raw(html);

export function html(partes: TemplateStringsArray, ...valores: unknown[]): string {
  return partes.reduce((acc, parte, i) => {
    if (i >= valores.length) return acc + parte;
    const v = valores[i];
    const texto = Array.isArray(v)
      ? v.map((x) => (x instanceof Raw ? x.html : esc(x))).join("")
      : v instanceof Raw
        ? v.html
        : esc(v);
    return acc + parte + texto;
  }, "");
}

export function $<T extends Element = HTMLElement>(seletor: string, raiz: ParentNode = document): T {
  const el = raiz.querySelector<T>(seletor);
  if (!el) throw new Error(`Elemento não encontrado: ${seletor}`);
  return el;
}

export const $$ = <T extends Element = HTMLElement>(seletor: string, raiz: ParentNode = document): T[] =>
  Array.from(raiz.querySelectorAll<T>(seletor));

/** Ícone de fatia de pizza (o Bootstrap Icons não tem um). */
export const ICONE_PIZZA = `<svg class="pg-icon-pizza" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" fill-rule="evenodd" d="M7.3 3.1c5.7-.6 11.3 2.7 13.6 8 .2.5 0 1-.5 1.2l-.7.3C17.9 8.2 13.4 5.4 8.6 5.3l-.4 0-.5-1.2c-.2-.5.1-1 .6-1zM7.9 6.7c4.5 0 8.7 2.7 10.6 6.9L4.2 21c-.6.3-1.3-.3-1.1-1L7.5 6.8l.4-.1zm1.6 3.4a1.3 1.3 0 1 0 0 2.6 1.3 1.3 0 0 0 0-2.6zm3.6 3.1a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4zm-5 2.6a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4z"/></svg>`;
