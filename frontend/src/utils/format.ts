const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const dataHora = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });
const hora = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" });

export const formatarMoeda = (valor: number): string => moeda.format(valor);

export function formatarDataHora(iso: string): string {
  const data = new Date(iso);
  const hoje = new Date();
  const mesmoDia = data.toDateString() === hoje.toDateString();
  return mesmoDia ? `Hoje, ${hora.format(data)}` : dataHora.format(data);
}

export const plural = (n: number, singular: string, pluralForma = singular + "s"): string =>
  `${n} ${n === 1 ? singular : pluralForma}`;

/** Normaliza texto para busca (sem acentos e minúsculo). */
export const normalizar = (texto: string): string =>
  texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
