/* Espelho das entidades da API (back/src/**\/*.entity.ts). */

export type Papel = "admin" | "professor" | "responsavel" | "financeiro";
export type Turno = "manha" | "tarde" | "integral" | "noite";
export type CategoriaComunicado =
  | "geral"
  | "pedagogico"
  | "evento"
  | "financeiro"
  | "urgente";
export type TipoEvento =
  | "reuniao"
  | "prova"
  | "passeio"
  | "feriado"
  | "festa"
  | "outro";

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  papel: Papel;
  telefone: string | null;
  ativo: boolean;
  /** Avisos por e-mail (novo comunicado, nova mensagem). */
  receberEmails: boolean;
  /** Ficha do professor. Endereço, alergias e nascimento só vêm para a direção e para o próprio. */
  dataNascimento?: string | null;
  endereco?: string | null;
  alergias?: string | null;
  /** Só a direção recebe. */
  anotacoes?: string | null;
  filhos?: Aluno[];
  turmas?: Turma[];
}

export interface Turma {
  id: string;
  nome: string;
  anoLetivo: number;
  turno: Turno;
  professores?: Usuario[];
  alunos?: Aluno[];
}

export interface Aluno {
  id: string;
  nome: string;
  dataNascimento: string | null;
  matricula: string | null;
  turma: Turma | null;
  responsaveis?: Usuario[];
  /** Ficha de saúde (preenchida pela família ou pela secretaria). */
  alergias: string | null;
  restricoesAlimentares: string | null;
  medicamentos: string | null;
  observacoesSaude: string | null;
  saudeAtualizadaEm: string | null;
}

export interface Comunicado {
  id: string;
  titulo: string;
  conteudo: string;
  categoria: CategoriaComunicado;
  exigeCiencia: boolean;
  autor: Usuario | null;
  turma: Turma | null;
  publicadoEm: string;
  ciente?: boolean;
  totalCiencias?: number;
  totalDestinatarios?: number;
}

export interface Evento {
  id: string;
  titulo: string;
  descricao: string | null;
  tipo: TipoEvento;
  /** Só em provas. */
  disciplina: string | null;
  inicio: string;
  fim: string | null;
  local: string | null;
  turma: Turma | null;
}

export type TipoCobranca = "matricula" | "mensalidade" | "uniforme" | "livros" | "outro";
export type FormaPagamento = "pix" | "boleto" | "cartao" | "dinheiro" | "transferencia";
export type SituacaoCobranca = "pendente" | "atrasada" | "paga" | "cancelada";

/** Uma cobrança do aluno. Valores sempre em centavos. */
export interface Cobranca {
  id: string;
  alunoId: string;
  tipo: TipoCobranca;
  descricao: string;
  valorCentavos: number;
  /** "AAAA-MM-DD" */
  vencimento: string;
  pagoEm: string | null;
  formaPagamento: FormaPagamento | null;
  situacao: SituacaoCobranca;
  /** Só o financeiro e a direção recebem. */
  observacao?: string | null;
  lancadaPor?: string | null;
}

/** GET /financeiro/alunos/:id */
export interface ExtratoAluno {
  hoje: string;
  aluno: { id: string; nome: string; matricula: string | null; turma: { id: string; nome: string } | null };
  totais: { aVencerCentavos: number; atrasadoCentavos: number; pagoCentavos: number };
  cobrancas: Cobranca[];
}

/** GET /financeiro/resumo */
export interface ResumoFinanceiro {
  hoje: string;
  totais: { aVencerCentavos: number; atrasadoCentavos: number; recebidoNoMesCentavos: number; alunosEmAtraso: number };
  turmas: { id: string; nome: string }[];
  alunos: {
    id: string;
    nome: string;
    matricula: string | null;
    turma: { id: string; nome: string } | null;
    responsaveis: { id: string; nome: string; telefone: string | null; email: string }[];
    aVencerCentavos: number;
    atrasadoCentavos: number;
    pagoCentavos: number;
    proximoVencimento: string | null;
  }[];
}

/** Aniversário na agenda (GET /eventos/aniversarios): só dia e mês. */
export interface Aniversario {
  /** "aluno:<uuid>" ou "professor:<uuid>". */
  id: string;
  tipo: "aluno" | "professor";
  nome: string;
  mes: number;
  dia: number;
  turmas: string[];
}

export interface Mensagem {
  id: string;
  texto: string;
  enviadaEm: string;
  autor: Usuario | null;
  /** Enviada pelo sistema em nome da escola (ex.: feliz aniversário). */
  automatica: boolean;
}

export interface Conversa {
  id: string;
  assunto: string;
  aluno: Aluno;
  responsavel: Usuario;
  ultimaMensagemEm: string;
  ultimaDaEscola: boolean;
  naoLida: boolean;
  mensagens?: Mensagem[];
}

export interface Disciplinas {
  disciplinas: string[];
  mediaMinima: number;
}

export interface NotaBoletim {
  disciplina: string;
  /** 1 a 4. */
  bimestre: number;
  valor: number;
}

export interface Boletim {
  aluno: Pick<Aluno, "id" | "nome" | "turma">;
  anoLetivo: number;
  notas: NotaBoletim[];
}

/** Notas de uma disciplina num bimestre, para a turma inteira. */
export interface Pauta {
  turma: Pick<Turma, "id" | "nome" | "anoLetivo">;
  disciplina: string;
  bimestre: number;
  alunos: { id: string; nome: string; valor: number | null }[];
}
