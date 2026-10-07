/**
 * Feriados nacionais do Brasil, calculados (não vêm da API). A escola
 * cadastra na agenda só o que é dela: recessos, feriados municipais etc.
 */

/** Domingo de Páscoa (algoritmo de Meeus/Jones/Butcher). */
function pascoa(ano: number) {
  const a = ano % 19;
  const b = Math.floor(ano / 100);
  const c = ano % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return Date.UTC(ano, mes - 1, dia);
}

const chave = (utc: number) => new Date(utc).toISOString().slice(0, 10);
const DIA = 86_400_000;

/** Mapa "AAAA-MM-DD" → nome do feriado. */
export function feriadosNacionais(ano: number): Map<string, string> {
  const p = pascoa(ano);
  const fixos: [number, number, string][] = [
    [1, 1, "Confraternização Universal"],
    [4, 21, "Tiradentes"],
    [5, 1, "Dia do Trabalho"],
    [9, 7, "Independência do Brasil"],
    [10, 12, "Nossa Senhora Aparecida"],
    [11, 2, "Finados"],
    [11, 15, "Proclamação da República"],
    [11, 20, "Dia da Consciência Negra"],
    [12, 25, "Natal"],
  ];
  return new Map([
    ...fixos.map(([m, d, nome]) => [chave(Date.UTC(ano, m - 1, d)), nome] as const),
    [chave(p - 48 * DIA), "Carnaval (ponto facultativo)"],
    [chave(p - 47 * DIA), "Carnaval (ponto facultativo)"],
    [chave(p - 2 * DIA), "Sexta-feira Santa"],
    [chave(p + 60 * DIA), "Corpus Christi (ponto facultativo)"],
  ]);
}
