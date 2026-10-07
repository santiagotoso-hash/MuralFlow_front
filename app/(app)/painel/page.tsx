"use client";

import {
  Cake,
  CalendarDays,
  ChevronRight,
  Megaphone,
  MessageCircle,
  PenSquare,
} from "lucide-react";
import Link from "next/link";
import { useSessao } from "@/components/AuthProvider";
import { Cartao, Erro, Etiqueta } from "@/components/ui";
import { aniversarioHoje, dataCurta, diasAte, hora, NOME_CATEGORIA, NOME_TIPO_EVENTO, tempoRelativo, TRATAMENTO } from "@/lib/formatar";
import type { Aluno, Comunicado, Conversa, Evento } from "@/lib/tipos";
import { useApi } from "@/lib/use-api";

function saudacao() {
  const h = new Date().getHours();
  return h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
}

export default function Painel() {
  const { usuario } = useSessao();
  const comunicados = useApi<Comunicado[]>("/comunicados");
  const eventos = useApi<Evento[]>("/eventos");
  const conversas = useApi<Conversa[]>("/conversas");
  // Equipe: alunos das suas turmas, para os aniversariantes do dia.
  const alunos = useApi<Aluno[]>(usuario && usuario.papel !== "responsavel" ? "/alunos" : null);

  if (!usuario) return null;
  const familia = usuario.papel === "responsavel";
  const pendentes = (comunicados.dados ?? []).filter((c) => c.exigeCiencia && !c.ciente);
  const naoLidas = (conversas.dados ?? []).filter((c) => c.naoLida);
  const erro = comunicados.erro ?? eventos.erro ?? conversas.erro;
  const aniversariantes = (alunos.dados ?? []).filter((a) => aniversarioHoje(a.dataNascimento));
  const provas = (eventos.dados ?? []).filter((e) => e.tipo === "prova");
  const outrosEventos = (eventos.dados ?? []).filter((e) => e.tipo !== "prova");

  const resumo = [
    familia
      ? {
          href: "/comunicados",
          icone: Megaphone,
          valor: pendentes.length,
          rotulo: pendentes.length === 1 ? "comunicado aguarda sua confirmação" : "comunicados aguardam sua confirmação",
        }
      : {
          href: "/comunicados",
          icone: Megaphone,
          valor: comunicados.dados?.length ?? 0,
          rotulo: "comunicados publicados",
        },
    {
      href: "/mensagens",
      icone: MessageCircle,
      valor: naoLidas.length,
      rotulo: naoLidas.length === 1 ? "mensagem não lida" : "mensagens não lidas",
    },
    {
      href: "/agenda",
      icone: CalendarDays,
      valor: outrosEventos.length,
      rotulo: "próximos eventos",
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-text text-2xl font-bold">
            {saudacao()}, {TRATAMENTO[usuario.papel]} {usuario.nome.split(" ")[0]}!
          </h1>
          {familia && usuario.filhos && usuario.filhos.length > 0 && (
            <p className="text-text-secondary mt-1 text-sm">
              Acompanhando{" "}
              {usuario.filhos
                .map((f) => `${f.nome.split(" ")[0]} (${f.turma?.nome ?? "sem turma"})`)
                .join(" e ")}
            </p>
          )}
        </div>
        {!familia && (
          <Link
            href="/comunicados/novo"
            className="bg-primary-solid hover:bg-primary-solid-hover inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white"
          >
            <PenSquare className="size-4" aria-hidden />
            Novo comunicado
          </Link>
        )}
      </div>

      {erro && <Erro mensagem={erro} />}

      {aniversariantes.length > 0 && (
        <Cartao className="border-success bg-success-subtle flex items-start gap-4 p-5">
          <span className="bg-surface text-success rounded-lg p-2.5">
            <Cake className="size-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 className="text-text font-semibold">
              {aniversariantes.length === 1 ? "Aniversariante de hoje" : "Aniversariantes de hoje"}
            </h2>
            <ul className="text-text-secondary mt-1 text-sm">
              {aniversariantes.map((a) => (
                <li key={a.id}>
                  <strong className="text-text">{a.nome}</strong>
                  {a.dataNascimento && ` · ${new Date().getFullYear() - Number(a.dataNascimento.slice(0, 4))} anos`}
                  {a.turma && ` · ${a.turma.nome}`}
                </li>
              ))}
            </ul>
            <p className="text-text-muted mt-1 text-xs">A família recebe uma mensagem de parabéns da escola (a partir das 7h).</p>
          </div>
        </Cartao>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        {resumo.map(({ href, icone: Icone, valor, rotulo }) => (
          <Link key={rotulo} href={href}>
            <Cartao className="hover:border-primary flex items-center gap-4 p-5 transition-colors">
              <span className="bg-primary-subtle text-primary rounded-lg p-2.5">
                <Icone className="size-5" aria-hidden />
              </span>
              <div>
                <p className="text-text text-2xl font-bold">{valor}</p>
                <p className="text-text-secondary text-sm">{rotulo}</p>
              </div>
            </Cartao>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Cartao>
          <div className="border-border flex items-center justify-between border-b px-5 py-4">
            <h2 className="text-text font-semibold">Últimos comunicados</h2>
            <Link href="/comunicados" className="text-primary text-sm font-medium">
              Ver todos
            </Link>
          </div>
          <ul className="divide-border divide-y">
            {(comunicados.dados ?? []).slice(0, 4).map((c) => (
              <li key={c.id}>
                <Link href={`/comunicados#${c.id}`} className="hover:bg-bg flex items-center gap-3 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-text truncate text-sm font-medium">{c.titulo}</p>
                    <p className="text-text-muted text-xs">
                      {NOME_CATEGORIA[c.categoria]} · {tempoRelativo(c.publicadoEm)}
                    </p>
                  </div>
                  {familia && c.exigeCiencia && !c.ciente && <Etiqueta tom="alerta">Pendente</Etiqueta>}
                  <ChevronRight className="text-text-muted size-4" aria-hidden />
                </Link>
              </li>
            ))}
            {comunicados.dados?.length === 0 && (
              <li className="text-text-muted px-5 py-6 text-sm">Nenhum comunicado ainda.</li>
            )}
          </ul>
        </Cartao>

        <div className="space-y-6">
        <Cartao>
          <div className="border-border flex items-center justify-between border-b px-5 py-4">
            <h2 className="text-text font-semibold">Próximas provas</h2>
            <Link href="/provas" className="text-primary text-sm font-medium">
              Ver provas
            </Link>
          </div>
          <ul className="divide-border divide-y">
            {provas.slice(0, 3).map((p) => (
              <li key={p.id}>
                <Link href="/provas" className="hover:bg-bg flex items-center gap-4 px-5 py-3">
                  <div className="bg-warning-subtle text-warning w-14 shrink-0 rounded-lg py-1.5 text-center text-xs font-semibold uppercase">
                    {dataCurta(p.inicio).replace(".", "")}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-text truncate text-sm font-medium">{p.disciplina ?? p.titulo}</p>
                    <p className="text-text-muted truncate text-xs">
                      {diasAte(p.inicio)}
                      {p.turma ? ` · ${p.turma.nome}` : ""}
                      {p.descricao ? ` · ${p.descricao}` : ""}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
            {eventos.dados && provas.length === 0 && (
              <li className="text-text-muted px-5 py-6 text-sm">Nenhuma prova marcada.</li>
            )}
          </ul>
        </Cartao>

        <Cartao>
          <div className="border-border flex items-center justify-between border-b px-5 py-4">
            <h2 className="text-text font-semibold">Próximos eventos</h2>
            <Link href="/agenda" className="text-primary text-sm font-medium">
              Ver agenda
            </Link>
          </div>
          <ul className="divide-border divide-y">
            {outrosEventos.slice(0, 4).map((e) => (
              <li key={e.id} className="flex items-center gap-4 px-5 py-3">
                <div className="bg-primary-subtle text-primary w-14 shrink-0 rounded-lg py-1.5 text-center text-xs font-semibold uppercase">
                  {dataCurta(e.inicio).replace(".", "")}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-text truncate text-sm font-medium">{e.titulo}</p>
                  <p className="text-text-muted text-xs">
                    {NOME_TIPO_EVENTO[e.tipo]} · {hora(e.inicio)}
                    {e.turma ? ` · ${e.turma.nome}` : ""}
                  </p>
                </div>
              </li>
            ))}
            {eventos.dados && outrosEventos.length === 0 && (
              <li className="text-text-muted px-5 py-6 text-sm">Nada marcado por enquanto.</li>
            )}
          </ul>
        </Cartao>
        </div>
      </div>
    </div>
  );
}
