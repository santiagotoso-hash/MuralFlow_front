/* Espelho das entidades da API (back/src/**\/*.entity.ts). */

export type Papel = "admin" | "professor" | "responsavel" | "financeiro" | "superadmin";
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
  /** A escola do usuário (multiescola). Vem em /usuarios/eu. */
  escola?: IdentidadeEscola | null;
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
  /** O que entrou de fato (com juros ou desconto). null = não paga. */
  valorPagoCentavos: number | null;
  formaPagamento: FormaPagamento | null;
  situacao: SituacaoCobranca;
  /** Mensalidade lançada sozinha pelo sistema (mensalidade automática). */
  automatica: boolean;
  /** A família avisou que pagou; some quando a escola dá baixa. */
  pagamentoInformado: { em: string; por: string | null; observacao: string | null } | null;
  /** Só o financeiro e a direção recebem. */
  observacao?: string | null;
  lancadaPor?: string | null;
}

/** GET /financeiro/alunos/:id */
export interface ExtratoAluno {
  hoje: string;
  aluno: { id: string; nome: string; matricula: string | null; turma: { id: string; nome: string } | null };
  totais: { aVencerCentavos: number; atrasadoCentavos: number; pagoCentavos: number };
  /** Mensalidade automática do aluno. null = desligada. */
  mensalidade: { valorCentavos: number; dia: number } | null;
  /** A escola cadastrou PIX ou conta: a família vê o botão "Pagar". */
  pagamentoDisponivel: boolean;
  cobrancas: Cobranca[];
}

/** GET /financeiro/cobrancas/:id/pagar */
export interface ComoPagar {
  cobranca: Cobranca;
  pix: { chave: string; beneficiario: string; cidade: string; identificador: string; copiaECola: string } | null;
  /** Dados para transferência, uma linha cada. */
  transferencia: string[] | null;
}

/** GET /financeiro/resumo */
export interface ResumoFinanceiro {
  hoje: string;
  totais: {
    aVencerCentavos: number;
    atrasadoCentavos: number;
    recebidoNoMesCentavos: number;
    alunosEmAtraso: number;
    /** Cobranças que a família disse ter pago e o financeiro ainda não conferiu. */
    pagamentosInformados: number;
    /** Despesas da escola pagas neste mês (não muda com o filtro de turma). */
    despesasPagasNoMesCentavos: number;
  };
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
    pagamentosInformados: number;
  }[];
}

/** GET /diario/aulas: o que foi dado numa aula (diário de classe). */
export interface AulaDiario {
  id: string;
  turma: { id: string; nome: string };
  /** "AAAA-MM-DD" */
  data: string;
  disciplina: string;
  conteudo: string;
  professor: string | null;
  atualizadaEm: string;
}

/** GET /diario/tarefas: tarefa de casa. */
export interface TarefaDiario {
  id: string;
  turma: { id: string; nome: string };
  disciplina: string;
  titulo: string;
  descricao: string | null;
  /** "AAAA-MM-DD" */
  entrega: string;
  link: string | null;
  professor: string | null;
  /** O prazo já passou. */
  vencida: boolean;
  /** Só para a equipe: quantos alunos a família marcou como feita. */
  concluidas?: number;
  totalAlunos?: number;
  /** Só para a família: os filhos desta turma e se marcou como feita. */
  alunos?: { id: string; nome: string; concluida: boolean }[];
}

export type SituacaoPresenca = "presente" | "falta" | "falta_justificada" | "atraso";

/** GET /chamada/turmas/:id?data= : a chamada da turma num dia. */
export interface ChamadaDoDia {
  hoje: string;
  data: string;
  turma: { id: string; nome: string };
  /** false: ninguém fez a chamada deste dia ainda. */
  feita: boolean;
  registradaPor: string | null;
  atualizadaEm: string | null;
  alunos: { id: string; nome: string; situacao: SituacaoPresenca | null; observacao: string | null }[];
}

export interface ResumoFrequencia {
  /** Dias com chamada registrada para o aluno. */
  dias: number;
  presencas: number;
  atrasos: number;
  faltas: number;
  faltasJustificadas: number;
  /** % de dias em que veio (presença ou atraso). null sem nenhuma chamada. */
  frequencia: number | null;
}

/** GET /chamada/alunos/:id */
export interface FrequenciaAluno {
  aluno: { id: string; nome: string; turma: { id: string; nome: string } | null };
  anoLetivo: number;
  resumo: ResumoFrequencia;
  /** Faltas e atrasos, do mais recente para trás. */
  ocorrencias: { data: string; situacao: SituacaoPresenca; observacao: string | null }[];
}

/** GET /chamada/turmas/:id/resumo */
export interface FrequenciaTurma {
  turma: { id: string; nome: string; anoLetivo: number };
  diasComChamada: number;
  alunos: ({ id: string; nome: string } & ResumoFrequencia)[];
}

/** Um pagamento que entrou (de aluno) ou saiu (despesa). */
export interface LancamentoRelatorio {
  /** Dia do pagamento, "AAAA-MM-DD". */
  data: string;
  natureza: "entrada" | "saida";
  /** Tipo da cobrança ou categoria da despesa. */
  grupo: string;
  descricao: string;
  aluno: string | null;
  turma: string | null;
  valorCentavos: number;
  formaPagamento: FormaPagamento | null;
}

/** GET /financeiro/relatorio?de=&ate= */
export interface RelatorioFinanceiro {
  de: string;
  ate: string;
  totais: { entradasCentavos: number; saidasCentavos: number; saldoCentavos: number };
  entradasPorTipo: { nome: string; totalCentavos: number; quantidade: number }[];
  saidasPorCategoria: { nome: string; totalCentavos: number; quantidade: number }[];
  porMes: { mes: string; entradasCentavos: number; saidasCentavos: number }[];
  lancamentos: LancamentoRelatorio[];
}

/** GET /financeiro/historico: quem fez o quê. */
export interface LinhaHistorico {
  id: string;
  quando: string;
  quem: string;
  acao: string;
  alvo: "cobranca" | "despesa" | "categoria";
  alvoId: string | null;
  resumo: string;
}

/** GET /financeiro/pendencias: aluno com cobrança vencida e não paga. */
export interface PendenciaAluno {
  alunoId: string;
  atrasadoCentavos: number;
  quantidade: number;
  /** Vencimento da mais antiga, "AAAA-MM-DD". */
  desde: string;
}

/** Categoria de despesa (Aluguel, Energia…), criada e renomeada pela escola. */
export interface CategoriaDespesa {
  id: string;
  nome: string;
  ativa: boolean;
  totalDespesas?: number;
}

export type SituacaoDespesa = "pendente" | "atrasada" | "paga";

/** Uma conta da escola a pagar. */
export interface Despesa {
  id: string;
  categoria: { id: string; nome: string };
  descricao: string;
  valorCentavos: number;
  vencimento: string;
  pagoEm: string | null;
  valorPagoCentavos: number | null;
  formaPagamento: FormaPagamento | null;
  situacao: SituacaoDespesa;
  observacao: string | null;
  lancadaPor: string | null;
}

/** GET /financeiro/despesas?mes=AAAA-MM */
export interface ListaDespesas {
  hoje: string;
  mes: string;
  totais: { aPagarCentavos: number; atrasadoCentavos: number; pagoNoMesCentavos: number };
  despesas: Despesa[];
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

/** O que o app usa para se vestir com a cara da escola. */
export interface IdentidadeEscola {
  id: string;
  nome: string;
  slug: string;
  /** "#RRGGBB" ou null (a cor do MuralFlow). */
  cor: string | null;
  /** Caminho da imagem na API ("/escolas/<id>/logo?v=..."), ou null. */
  logo: string | null;
}

/** GET /escola (direção) e /plataforma/escolas/:id (superadmin). */
export interface EscolaCompleta extends IdentidadeEscola {
  ativa: boolean;
  cnpj: string | null;
  endereco: string | null;
  cidade: string | null;
  assinatura: string | null;
  pixChave: string | null;
  pixNome: string | null;
  pixCidade: string | null;
  dadosBancarios: string | null;
  criadaEm: string;
  atualizadaEm: string;
}

/** GET /plataforma/escolas */
export interface EscolaNaLista extends IdentidadeEscola {
  ativa: boolean;
  criadaEm: string;
  usuarios: number;
  alunos: number;
  pixConfigurado: boolean;
}
