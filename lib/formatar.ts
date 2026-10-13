import type {
  CategoriaComunicado,
  FormaPagamento,
  Papel,
  SituacaoCobranca,
  TipoCobranca,
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
  financeiro: "Financeiro",
};

/** Primeira tela de cada papel (o financeiro não tem painel). */
export const inicioDe = (papel: Papel) => (papel === "financeiro" ? "/financeiro" : "/painel");

/** Tratamento na saudação do painel ("Bom dia, Pro Carla!"). */
export const TRATAMENTO: Record<Papel, string> = {
  admin: "Diretor/a",
  professor: "Pro",
  responsavel: "Pai/Mãe",
  financeiro: "Financeiro",
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

/** Cor da etiqueta de cada tipo de evento (agenda, calendário, provas). */
export const TOM_TIPO_EVENTO: Record<TipoEvento, "info" | "alerta" | "perigo" | "sucesso" | "neutro"> = {
  reuniao: "info",
  prova: "alerta",
  passeio: "sucesso",
  feriado: "perigo",
  festa: "sucesso",
  outro: "neutro",
};

/** "2026-06-20": o dia (no fuso de Brasília) em que o instante cai. */
export const chaveDia = (iso: string) =>
  new Date(iso).toLocaleDateString("en-CA", { timeZone: TZ });

/** "hoje", "amanhã", "em 5 dias", "há 2 dias" — contando dias de calendário. */
export function diasAte(iso: string) {
  const dia = (chave: string) => Date.UTC(...(chave.split("-").map(Number) as [number, number, number]));
  const dif = Math.round((dia(chaveDia(iso)) - dia(chaveDia(new Date().toISOString()))) / 86_400_000);
  if (dif === 0) return "hoje";
  if (dif === 1) return "amanhã";
  if (dif === -1) return "ontem";
  return dif > 0 ? `em ${dif} dias` : `há ${-dif} dias`;
}

/** "2016-03-14" → "14 de março". */
export const dataAniversario = (data: string) =>
  new Date(`${data.slice(0, 10)}T12:00:00Z`).toLocaleDateString("pt-BR", { day: "numeric", month: "long", timeZone: "UTC" });

/** Hoje (em Brasília) é aniversário? Quem nasceu em 29/02 comemora em 28/02 nos outros anos. */
export function aniversarioHoje(data: string | null) {
  if (!data) return false;
  const hoje = chaveDia(new Date().toISOString());
  const [ano, mmdd] = [Number(hoje.slice(0, 4)), hoje.slice(5)];
  const bissexto = (ano % 4 === 0 && ano % 100 !== 0) || ano % 400 === 0;
  const dia = data.slice(5, 10);
  return dia === mmdd || (dia === "02-29" && mmdd === "02-28" && !bissexto);
}

/** Nota com vírgula: 7.5 → "7,5". */
export const nota = (valor: number) =>
  valor.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 2 });

/** "2026-06-20T14:00" (input datetime-local) → ISO com fuso de Brasília. */
export const localParaIso = (valor: string) =>
  valor ? new Date(`${valor}:00-03:00`).toISOString() : "";

/** 125050 (centavos) → "R$ 1.250,50". */
export const reais = (centavos: number) =>
  (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/**
 * Valor digitado → centavos, ou null se não for um valor. Aceita "1.250,50",
 * "1250,5", "R$ 89,90", "1250" e também "89.90" (ponto como decimal quando
 * há um só ponto seguido de 1 ou 2 dígitos; "1.250" é mil duzentos e cinquenta).
 */
export function lerReais(texto: string): number | null {
  const t = texto.replace(/[R$\s]/g, "");
  const m = /^(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d{1,2}))?$/.exec(t) ?? /^(\d+)\.(\d{1,2})$/.exec(t);
  if (!m) return null;
  return Number(m[1].replace(/\./g, "")) * 100 + Number((m[2] ?? "").padEnd(2, "0"));
}

/** "2026-10-31" → "31/10/2026". */
export const dataBr = (data: string) => data.slice(0, 10).split("-").reverse().join("/");

export const NOME_TIPO_COBRANCA: Record<TipoCobranca, string> = {
  matricula: "Matrícula",
  mensalidade: "Mensalidade",
  uniforme: "Uniforme",
  livros: "Livros",
  outro: "Outro",
};

export const NOME_FORMA_PAGAMENTO: Record<FormaPagamento, string> = {
  pix: "Pix",
  boleto: "Boleto",
  cartao: "Cartão",
  dinheiro: "Dinheiro",
  transferencia: "Transferência",
};

export const NOME_SITUACAO: Record<SituacaoCobranca, string> = {
  pendente: "A vencer",
  atrasada: "Em atraso",
  paga: "Paga",
  cancelada: "Cancelada",
};

export const TOM_SITUACAO: Record<SituacaoCobranca, "info" | "perigo" | "sucesso" | "neutro"> = {
  pendente: "info",
  atrasada: "perigo",
  paga: "sucesso",
  cancelada: "neutro",
};
