/**
 * O texto das declarações, num lugar só: o PDF e a página de verificação
 * mostram exatamente as mesmas palavras.
 */

export type TipoDeclaracao = "matricula" | "frequencia" | "quitacao";

/** O que a declaração afirmou, como foi gravado na emissão. */
export interface ConteudoDeclaracao {
  escola: { nome: string; cnpj: string | null; endereco: string | null; cidade: string | null; assinatura: string | null };
  aluno: {
    nome: string;
    dataNascimento: string | null;
    matricula: string | null;
    turma: string | null;
    turno: string | null;
    anoLetivo: number | null;
  };
  frequencia?: { dias: number; faltas: number; faltasJustificadas: number; percentual: number | null };
}

/** POST /declaracoes e GET /declaracoes/verificar/:codigo */
export interface Declaracao {
  codigo: string;
  tipo: TipoDeclaracao;
  emitidaEm: string;
  conteudo: ConteudoDeclaracao;
  /** Só na lista da direção. */
  emitidaPor?: string;
}

export const NOME_TIPO_DECLARACAO: Record<TipoDeclaracao, string> = {
  matricula: "Declaração de matrícula",
  frequencia: "Declaração de frequência",
  quitacao: "Declaração de quitação (nada consta)",
};

export const DESCRICAO_TIPO_DECLARACAO: Record<TipoDeclaracao, string> = {
  matricula: "Comprova que o aluno está matriculado, com turma, turno e ano letivo.",
  frequencia: "Informa a frequência do aluno no ano letivo, tirada da chamada.",
  quitacao: "Informa que não há cobranças vencidas em aberto. Só é emitida sem débitos vencidos.",
};

/** "QTSJ476KVEXV" → "QTSJ-476K-VEXV" */
export const formatarCodigo = (codigo: string) => codigo.replace(/(.{4})(?=.)/g, "$1-");

/** "2014-03-09" → "9 de março de 2014" */
const porExtenso = (data: string) =>
  new Date(`${data.slice(0, 10)}T12:00:00Z`).toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

/** O dia da emissão em Brasília, "AAAA-MM-DD". */
const diaDaEmissao = (iso: string) => new Date(iso).toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });

const vezes = (n: number, uma: string, varias: string) => `${n} ${n === 1 ? uma : varias}`;

/** Os parágrafos do corpo da declaração. */
export function textoDaDeclaracao({ tipo, conteudo, emitidaEm }: Pick<Declaracao, "tipo" | "conteudo" | "emitidaEm">): string[] {
  const { aluno, frequencia } = conteudo;
  const emissao = porExtenso(diaDaEmissao(emitidaEm));
  const turma = aluno.turma
    ? `no ${aluno.turma}${aluno.turno ? `, turno da ${aluno.turno}` : ""}${aluno.anoLetivo ? `, no ano letivo de ${aluno.anoLetivo}` : ""}`
    : "";

  if (tipo === "matricula") {
    const nascimento = aluno.dataNascimento ? `, nascido(a) em ${porExtenso(aluno.dataNascimento)}` : "";
    const matricula = aluno.matricula ? `, matrícula n.º ${aluno.matricula}` : "";
    return [
      `Declaramos, para os devidos fins, que ${aluno.nome}${nascimento}${matricula}, está regularmente matriculado(a) nesta instituição de ensino ${turma}.`,
    ];
  }

  if (tipo === "frequencia" && frequencia) {
    return [
      `Declaramos, para os devidos fins, que ${aluno.nome}, matriculado(a) nesta instituição de ensino ${turma}, ` +
        `apresenta frequência de ${frequencia.percentual ?? 0}% nos ${vezes(frequencia.dias, "dia letivo registrado", "dias letivos registrados")} até ${emissao}, ` +
        `com ${vezes(frequencia.faltas, "falta", "faltas")} e ${vezes(frequencia.faltasJustificadas, "falta justificada", "faltas justificadas")}.`,
      "Os atrasos são contados como presença.",
    ];
  }

  return [
    `Declaramos, para os devidos fins, que não constam débitos vencidos em aberto em nome de ${aluno.nome}` +
      `${aluno.turma ? `, matriculado(a) ${turma}` : ""}, junto a esta instituição de ensino, até ${emissao}.`,
    "Cobranças com vencimento posterior a esta data não são abrangidas por esta declaração.",
  ];
}

/** "São Paulo, 15 de outubro de 2026." */
export const localEData = (d: Pick<Declaracao, "conteudo" | "emitidaEm">) =>
  `${d.conteudo.escola.cidade ? `${d.conteudo.escola.cidade}, ` : ""}${porExtenso(diaDaEmissao(d.emitidaEm))}.`;
