import type { Aniversario } from "./tipos";

const bissexto = (ano: number) => (ano % 4 === 0 && ano % 100 !== 0) || ano % 400 === 0;
const dd = (n: number) => String(n).padStart(2, "0");

/**
 * Mapa "AAAA-MM-DD" → aniversariantes daquele dia, no ano pedido. Quem
 * nasceu em 29/02 aparece em 28/02 nos anos que não são bissextos (igual ao
 * aviso automático do back).
 */
export function aniversariosNoAno(lista: Aniversario[], ano: number): Map<string, Aniversario[]> {
  const mapa = new Map<string, Aniversario[]>();
  for (const a of lista) {
    const dia = a.mes === 2 && a.dia === 29 && !bissexto(ano) ? 28 : a.dia;
    const chave = `${ano}-${dd(a.mes)}-${dd(dia)}`;
    mapa.set(chave, [...(mapa.get(chave) ?? []), a]);
  }
  return mapa;
}

export const NOME_ANIVERSARIANTE: Record<Aniversario["tipo"], string> = {
  aluno: "Aluno(a)",
  professor: "Professor(a)",
};
