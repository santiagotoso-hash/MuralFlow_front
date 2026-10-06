/* Espelho das entidades da API (back/src/**\/*.entity.ts). */

export type Papel = "admin" | "professor" | "responsavel";
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
  inicio: string;
  fim: string | null;
  local: string | null;
  turma: Turma | null;
}

export interface Mensagem {
  id: string;
  texto: string;
  enviadaEm: string;
  autor: Usuario | null;
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
