import type {
  CategoriaComunicado,
  Papel,
  TipoEvento,
  Turno,
} from "./tipos";

const TZ = "America/Sao_Paulo";

export const dataCurta = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    timeZone: TZ,
  });

export const dataHora = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TZ,
  });

export const hora = (iso: string) =>
  new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TZ,
  });

export const diaDaSemana = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: TZ,
  });

/** "há 5 min", "ontem", "12 de mar." */
export function tempoRelativo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "agora";
  if (diff < 3600) return `há ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `há ${Math.floor(diff / 3600)} h`;
  if (diff < 172800) return "ontem";
  return dataCurta(iso);
}

export function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/);
  return (partes[0][0] + (partes.length > 1 ? partes.at(-1)![0] : "")).toUpperCase();
}

export const NOME_PAPEL: Record<Papel, string> = {
  admin: "Direção",
  professor: "Professor(a)",
  responsavel: "Responsável",
};

export const NOME_TURNO: Record<Turno, string> = {
  manha: "Manhã",
  tarde: "Tarde",
  integral: "Integral",
  noite: "Noite",
};

export const NOME_CATEGORIA: Record<CategoriaComunicado, string> = {
  geral: "Geral",
  pedagogico: "Pedagógico",
  evento: "Evento",
  financeiro: "Financeiro",
  urgente: "Urgente",
};

export const NOME_TIPO_EVENTO: Record<TipoEvento, string> = {
  reuniao: "Reunião",
  prova: "Prova",
  passeio: "Passeio",
  feriado: "Feriado",
  festa: "Festa",
  outro: "Outro",
};

/** "2026-06-20T14:00" (input datetime-local) → ISO com fuso de Brasília. */
export const localParaIso = (valor: string) =>
  valor ? new Date(`${valor}:00-03:00`).toISOString() : "";
