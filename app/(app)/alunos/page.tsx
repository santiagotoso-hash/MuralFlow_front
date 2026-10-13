"use client";

import { Cake, ChevronRight, CircleAlert, Pencil, Users } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useSessao } from "@/components/AuthProvider";
import { useConfirmar } from "@/components/Confirmacao";
import { BotoesContato } from "@/components/contato";
import { Avatar, Botao, Cabecalho, Campo, Carregando, Cartao, Erro, Etiqueta, Vazio } from "@/components/ui";
import { api } from "@/lib/api";
import { aniversarioHoje, dataAniversario, dataBr, NOME_TURNO, reais } from "@/lib/formatar";
import type { Aluno, PendenciaAluno, Turma } from "@/lib/tipos";
import { useApi } from "@/lib/use-api";

function idade(dataNascimento: string | null) {
  if (!dataNascimento) return null;
  const nasc = new Date(`${dataNascimento}T12:00:00`);
  const hoje = new Date();
  let anos = hoje.getFullYear() - nasc.getFullYear();
  if (hoje < new Date(hoje.getFullYear(), nasc.getMonth(), nasc.getDate())) anos--;
  return anos;
}

export default function Alunos() {
  const { usuario } = useSessao();
  const [turmaId, setTurmaId] = useState("");
  const familia = usuario?.papel === "responsavel";
  // O financeiro não acessa as turmas: vê a lista inteira (o filtro por turma
  // dele fica na tela Financeiro).
  const financeiro = usuario?.papel === "financeiro";
  const turmas = useApi<Turma[]>(familia || financeiro ? null : "/turmas");
  const alunos = useApi<Aluno[]>(`/alunos${turmaId ? `?turmaId=${turmaId}` : ""}`);
  // Cobranças vencidas: financeiro e direção veem de todos; a família, dos
  // próprios filhos. Professores não veem finanças.
  const pendencias = useApi<PendenciaAluno[]>(usuario && usuario.papel !== "professor" ? "/financeiro/pendencias" : null);
  const pendenciaDe = new Map((pendencias.dados ?? []).map((p) => [p.alunoId, p]));

  if (!usuario) return null;

  return (
    <>
      <Cabecalho
        titulo={familia ? "Meus filhos" : "Alunos"}
        descricao={
          familia
            ? "Os alunos vinculados à sua conta."
            : financeiro
              ? "Todos os alunos e o contato dos responsáveis."
              : "Alunos das suas turmas e seus responsáveis."
        }
        acao={
          !familia &&
          !financeiro && (
            <div className="w-56">
              <Campo tipo="select" rotulo="Turma" value={turmaId} onChange={(e) => setTurmaId(e.target.value)}>
                <option value="">Todas</option>
                {turmas.dados?.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nome}
                  </option>
                ))}
              </Campo>
            </div>
          )
        }
      />
      {alunos.erro && <Erro mensagem={alunos.erro} />}
      {alunos.carregando && <Carregando />}
      {alunos.dados?.length === 0 && (
        <Cartao>
          <Vazio
            icone={Users}
            titulo="Nenhum aluno encontrado"
            texto={familia ? "Peça à secretaria para vincular seus filhos à sua conta." : undefined}
          />
        </Cartao>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {alunos.dados?.map((a) => (
          <CartaoAluno
            key={a.id}
            aluno={a}
            familia={familia}
            pendencia={pendenciaDe.get(a.id)}
            aoSalvar={(novo) => alunos.setDados((l) => l?.map((x) => (x.id === novo.id ? { ...x, ...novo } : x)) ?? null)}
          />
        ))}
      </div>
    </>
  );
}

function CartaoAluno({
  aluno: a,
  familia,
  pendencia,
  aoSalvar,
}: {
  aluno: Aluno;
  familia: boolean;
  /** Cobrança vencida e não paga (só para quem pode ver finanças). */
  pendencia?: PendenciaAluno;
  aoSalvar: (a: Aluno) => void;
}) {
  const [editando, setEditando] = useState(false);
  const [data, setData] = useState(a.dataNascimento ?? "");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const aceitar = useConfirmar();
  const anos = idade(a.dataNascimento);
  const hojeEhAniversario = aniversarioHoje(a.dataNascimento);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    const ok = await aceitar({
      titulo: "Salvar a data de nascimento?",
      mensagem: <>{a.nome}: <strong>{new Date(`${data}T12:00:00Z`).toLocaleDateString("pt-BR", { timeZone: "UTC" })}</strong></>,
      confirmar: "Salvar",
    });
    if (!ok) return;
    setErro(null);
    setSalvando(true);
    try {
      aoSalvar(await api<Aluno>(`/alunos/${a.id}/nascimento`, { method: "PATCH", body: { dataNascimento: data } }));
      setEditando(false);
    } catch (err) {
      setErro((err as Error).message);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Cartao className={`p-5 ${pendencia ? "border-danger! bg-danger-subtle!" : ""}`}>
      <div className="flex items-center gap-3">
        <Avatar nome={a.nome} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-text truncate font-semibold">{a.nome}</p>
            {pendencia && (
              <span className="bg-danger text-surface inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold">
                <CircleAlert className="size-3" aria-hidden />
                Pendência
              </span>
            )}
          </div>
          <p className="text-text-muted text-xs">
            {anos !== null && `${anos} anos · `}
            Matrícula {a.matricula ?? "—"}
          </p>
        </div>
        {familia && !editando && (
          <button
            type="button"
            onClick={() => {
              setData(a.dataNascimento ?? "");
              setEditando(true);
            }}
            aria-label={`Editar dados de ${a.nome}`}
            className="text-text-muted hover:text-text cursor-pointer self-start rounded-lg p-2"
          >
            <Pencil className="size-4" />
          </button>
        )}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {a.turma ? (
          <>
            <Etiqueta tom="primario">{a.turma.nome}</Etiqueta>
            <Etiqueta>{NOME_TURNO[a.turma.turno]}</Etiqueta>
          </>
        ) : (
          <Etiqueta tom="alerta">Sem turma</Etiqueta>
        )}
        {hojeEhAniversario && <Etiqueta tom="sucesso">🎂 Aniversário hoje!</Etiqueta>}
        {a.alergias && <Etiqueta tom="perigo">Alergia</Etiqueta>}
        {a.restricoesAlimentares && <Etiqueta tom="alerta">Restrição alimentar</Etiqueta>}
      </div>

      {editando ? (
        <form onSubmit={salvar} className="border-border mt-4 space-y-3 border-t pt-4">
          <Campo
            rotulo="Data de nascimento"
            type="date"
            required
            max={new Date().toISOString().slice(0, 10)}
            value={data}
            onChange={(e) => setData(e.target.value)}
            ajuda="No dia do aniversário, a escola manda uma mensagem de parabéns e avisa os professores."
          />
          {erro && <Erro mensagem={erro} />}
          <div className="flex gap-2">
            <Botao type="submit" carregando={salvando}>
              Salvar
            </Botao>
            <Botao type="button" variante="fantasma" onClick={() => setEditando(false)}>
              Cancelar
            </Botao>
          </div>
        </form>
      ) : (
        <p className="text-text-secondary mt-3 inline-flex items-center gap-1.5 text-xs">
          <Cake className="size-3.5" aria-hidden />
          {a.dataNascimento ? (
            `Aniversário: ${dataAniversario(a.dataNascimento)}`
          ) : familia ? (
            <button type="button" onClick={() => setEditando(true)} className="text-primary cursor-pointer font-medium">
              Informar data de nascimento
            </button>
          ) : (
            "Data de nascimento não informada"
          )}
        </p>
      )}

      {(a.alergias || a.restricoesAlimentares) && (
        <Link href="/saude" className="mt-2 block text-xs">
          {a.alergias && <span className="text-danger block font-medium">Alergia: {a.alergias}</span>}
          {a.restricoesAlimentares && <span className="text-text-secondary block">Restrição: {a.restricoesAlimentares}</span>}
        </Link>
      )}
      {pendencia && (
        <Link
          href={`/financeiro?aluno=${a.id}`}
          className="bg-surface border-danger text-danger mt-3 flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium hover:underline"
        >
          <span className="min-w-0 flex-1">
            {reais(pendencia.atrasadoCentavos)} em atraso
            <span className="block text-xs font-normal">
              {pendencia.quantidade === 1 ? "1 cobrança vencida" : `${pendencia.quantidade} cobranças vencidas`}, desde{" "}
              {dataBr(pendencia.desde)}
            </span>
          </span>
          <span className="inline-flex shrink-0 items-center gap-0.5">
            Ver pendência
            <ChevronRight className="size-4" aria-hidden />
          </span>
        </Link>
      )}
      {!familia && a.responsaveis && (
        <ul className="border-border mt-4 space-y-2 border-t pt-3">
          {a.responsaveis.map((r) => (
            <li key={r.id} className="flex items-center gap-2 text-sm">
              <div className="min-w-0 flex-1">
                <p className="text-text truncate">{r.nome}</p>
                {r.telefone && <p className="text-text-muted text-xs">{r.telefone}</p>}
              </div>
              {r.telefone && <BotoesContato nome={r.nome} telefone={r.telefone} />}
            </li>
          ))}
          {a.responsaveis.length === 0 && <li className="text-text-muted text-xs">Nenhum responsável vinculado.</li>}
        </ul>
      )}
    </Cartao>
  );
}
