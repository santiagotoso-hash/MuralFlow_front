"use client";

import { Check, ChevronLeft, ChevronRight, ClipboardCheck } from "lucide-react";
import { useState } from "react";
import { useSessao } from "@/components/AuthProvider";
import { Abas, Botao, Cabecalho, Campo, Carregando, Cartao, Erro, Etiqueta, TONS, Vazio } from "@/components/ui";
import { api } from "@/lib/api";
import { chaveDia, FREQUENCIA_MINIMA, NOME_SITUACAO_PRESENCA, TOM_SITUACAO_PRESENCA } from "@/lib/formatar";
import type { Aluno, ChamadaDoDia, FrequenciaAluno, FrequenciaTurma, SituacaoPresenca, Turma } from "@/lib/tipos";
import { useApi } from "@/lib/use-api";

const SITUACOES: SituacaoPresenca[] = ["presente", "falta", "falta_justificada", "atraso"];
/** Rótulo curto dos botões (cabem quatro lado a lado no celular). */
const ROTULO_CURTO: Record<SituacaoPresenca, string> = {
  presente: "Presente",
  falta: "Falta",
  falta_justificada: "Justificada",
  atraso: "Atraso",
};

/** "2026-10-13" + 1 → "2026-10-14". */
function somarDia(data: string, delta: number) {
  const [a, m, d] = data.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d + delta)).toISOString().slice(0, 10);
}

/** "segunda-feira, 13 de outubro" */
const diaPorExtenso = (data: string) =>
  new Date(`${data}T12:00:00Z`).toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

const fimDeSemana = (data: string) => [0, 6].includes(new Date(`${data}T12:00:00Z`).getUTCDay());

export default function PaginaChamada() {
  const { usuario } = useSessao();
  if (!usuario) return null;
  if (usuario.papel === "financeiro") return <Erro mensagem="A chamada é dos professores e da direção." />;

  return usuario.papel === "responsavel" ? (
    <>
      <Cabecalho titulo="Frequência" descricao="Presenças, faltas e atrasos dos seus filhos." />
      <FrequenciaFamilia filhos={usuario.filhos ?? []} />
    </>
  ) : (
    <ChamadaEquipe />
  );
}

/* ───────────────────────────── Família ───────────────────────────── */

function FrequenciaFamilia({ filhos }: { filhos: Aluno[] }) {
  const [alunoId, setAlunoId] = useState(filhos[0]?.id ?? "");
  if (filhos.length === 0) {
    return (
      <Cartao>
        <Vazio icone={ClipboardCheck} titulo="Nenhum aluno vinculado" texto="Peça à secretaria para vincular seus filhos à sua conta." />
      </Cartao>
    );
  }
  return (
    <>
      {filhos.length > 1 && (
        <Abas
          rotulo="Filhos"
          abas={filhos.map((f) => ({ id: f.id, rotulo: f.nome.split(" ")[0] }))}
          ativa={alunoId}
          setAtiva={setAlunoId}
        />
      )}
      <FrequenciaDoAluno key={alunoId} alunoId={alunoId} />
    </>
  );
}

/** Resumo do ano e a lista de faltas e atrasos de um aluno. */
function FrequenciaDoAluno({ alunoId }: { alunoId: string }) {
  const freq = useApi<FrequenciaAluno>(`/chamada/alunos/${alunoId}`);
  if (freq.erro) return <Erro mensagem={freq.erro} />;
  if (!freq.dados) return <Carregando />;
  const { aluno, anoLetivo, resumo, ocorrencias } = freq.dados;
  const baixa = resumo.frequencia !== null && resumo.frequencia < FREQUENCIA_MINIMA;

  return (
    <>
      <Cartao className="mb-4 p-5">
        <h2 className="text-text text-lg font-semibold">{aluno.nome}</h2>
        <p className="text-text-muted text-sm">
          {aluno.turma?.nome ?? "Sem turma"} · Ano letivo {anoLetivo}
        </p>
        <dl className="border-border mt-4 grid grid-cols-2 gap-4 border-t pt-4 sm:grid-cols-4">
          {(
            [
              ["Frequência", resumo.frequencia === null ? "—" : `${resumo.frequencia}%`, baixa ? "text-danger" : "text-success"],
              ["Faltas", String(resumo.faltas), resumo.faltas ? "text-danger" : "text-text"],
              ["Faltas justificadas", String(resumo.faltasJustificadas), "text-text"],
              ["Atrasos", String(resumo.atrasos), "text-text"],
            ] as const
          ).map(([rotulo, valor, cor]) => (
            <div key={rotulo}>
              <dt className="text-text-muted text-xs">{rotulo}</dt>
              <dd className={`text-xl font-semibold ${cor}`}>{valor}</dd>
            </div>
          ))}
        </dl>
        <p className="text-text-muted mt-3 text-xs">
          {resumo.dias === 0
            ? "Ainda não há chamadas registradas neste ano."
            : `${resumo.dias} ${resumo.dias === 1 ? "dia de aula registrado" : "dias de aula registrados"}. Atraso conta como presença.`}
          {baixa && ` Atenção: a frequência mínima para aprovação é de ${FREQUENCIA_MINIMA}%.`}
        </p>
      </Cartao>

      {resumo.dias > 0 && ocorrencias.length === 0 && (
        <Cartao>
          <Vazio icone={Check} titulo="Nenhuma falta nem atraso" texto="Presente em todos os dias com chamada." />
        </Cartao>
      )}
      {ocorrencias.length > 0 && (
        <Cartao>
          <h3 className="text-text border-border border-b px-5 py-4 font-semibold">Faltas e atrasos</h3>
          <ul className="divide-border divide-y">
            {ocorrencias.map((o) => (
              <li key={o.data} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-5 py-3">
                <p className="text-text min-w-0 flex-1 text-sm first-letter:uppercase">
                  {diaPorExtenso(o.data)}
                  {o.observacao && <span className="text-text-muted block text-xs">{o.observacao}</span>}
                </p>
                <Etiqueta tom={TOM_SITUACAO_PRESENCA[o.situacao]}>{NOME_SITUACAO_PRESENCA[o.situacao]}</Etiqueta>
              </li>
            ))}
          </ul>
        </Cartao>
      )}
    </>
  );
}

/* ─────────────────────── Professores e direção ─────────────────────── */

function ChamadaEquipe() {
  const turmas = useApi<Turma[]>("/turmas");
  const [turmaId, setTurmaId] = useState("");
  const [aba, setAba] = useState<"dia" | "resumo">("dia");
  const turma = turmaId || turmas.dados?.[0]?.id || "";

  return (
    <>
      <Cabecalho
        titulo="Chamada"
        descricao="Registre a presença da turma e acompanhe a frequência."
        acao={
          turmas.dados &&
          turmas.dados.length > 1 && (
            <div className="w-56">
              <Campo tipo="select" rotulo="Turma" value={turma} onChange={(e) => setTurmaId(e.target.value)}>
                {turmas.dados.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nome}
                  </option>
                ))}
              </Campo>
            </div>
          )
        }
      />
      {turmas.erro && <Erro mensagem={turmas.erro} />}
      {turmas.carregando && <Carregando />}
      {turmas.dados?.length === 0 && (
        <Cartao>
          <Vazio icone={ClipboardCheck} titulo="Você ainda não tem turmas" />
        </Cartao>
      )}
      {turma && (
        <>
          <Abas
            rotulo="Visão"
            abas={[
              { id: "dia", rotulo: "Chamada do dia" },
              { id: "resumo", rotulo: "Frequência da turma" },
            ]}
            ativa={aba}
            setAtiva={setAba}
          />
          {aba === "dia" ? <ChamadaDoDiaTela key={turma} turmaId={turma} /> : <ResumoDaTurma key={turma} turmaId={turma} />}
        </>
      )}
    </>
  );
}

function ChamadaDoDiaTela({ turmaId }: { turmaId: string }) {
  const hoje = chaveDia(new Date().toISOString());
  const [data, setData] = useState(hoje);
  const chamada = useApi<ChamadaDoDia>(data ? `/chamada/turmas/${turmaId}?data=${data}` : null);
  // Só mostra a resposta do dia escolhido (ao trocar de dia, a anterior ainda está na memória).
  const dados = chamada.dados && chamada.dados.data === data ? chamada.dados : null;

  return (
    <>
      <div className="mb-4 flex flex-wrap items-end gap-2">
        <button
          type="button"
          onClick={() => setData(somarDia(data || hoje, -1))}
          aria-label="Dia anterior"
          className="text-text-secondary hover:text-text hover:bg-bg cursor-pointer rounded-lg p-2"
        >
          <ChevronLeft className="size-5" />
        </button>
        <div className="w-44">
          <Campo rotulo="Dia" type="date" required max={hoje} value={data} onChange={(e) => setData(e.target.value)} />
        </div>
        <button
          type="button"
          onClick={() => setData(somarDia(data || hoje, 1))}
          disabled={!data || data >= hoje}
          aria-label="Próximo dia"
          className="text-text-secondary hover:text-text hover:bg-bg cursor-pointer rounded-lg p-2 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronRight className="size-5" />
        </button>
        {data !== hoje && (
          <button
            type="button"
            onClick={() => setData(hoje)}
            className="border-border text-text-secondary hover:text-text mb-0.5 cursor-pointer rounded-lg border px-3 py-1.5 text-sm"
          >
            Hoje
          </button>
        )}
      </div>

      {chamada.erro && <Erro mensagem={chamada.erro} />}
      {!dados && !chamada.erro && <Carregando />}
      {dados && (
        // Um formulário por dia: ao trocar de dia, as marcações recomeçam do que está gravado.
        <FormChamada key={dados.data} dados={dados} aoSalvar={chamada.setDados} />
      )}
    </>
  );
}

type Marcacao = { situacao: SituacaoPresenca; observacao: string };

function FormChamada({ dados, aoSalvar }: { dados: ChamadaDoDia; aoSalvar: (nova: ChamadaDoDia) => void }) {
  // Chamada ainda não feita: todo mundo começa como presente (o comum é marcar só quem faltou).
  const [marcas, setMarcas] = useState<Record<string, Marcacao>>(() =>
    Object.fromEntries(dados.alunos.map((a) => [a.id, { situacao: a.situacao ?? "presente", observacao: a.observacao ?? "" }])),
  );
  const [mexeu, setMexeu] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  function marcar(alunoId: string, mudanca: Partial<Marcacao>) {
    setMarcas((m) => ({ ...m, [alunoId]: { ...m[alunoId], ...mudanca } }));
    setMexeu(true);
    setSalvo(false);
  }

  async function salvar() {
    setErro(null);
    setSalvando(true);
    try {
      const nova = await api<ChamadaDoDia>(`/chamada/turmas/${dados.turma.id}`, {
        method: "PUT",
        body: {
          data: dados.data,
          registros: dados.alunos.map((a) => ({
            alunoId: a.id,
            situacao: marcas[a.id].situacao,
            observacao: marcas[a.id].observacao.trim() || undefined,
          })),
        },
      });
      setMexeu(false);
      setSalvo(true);
      aoSalvar(nova);
    } catch (err) {
      setErro((err as Error).message);
    } finally {
      setSalvando(false);
    }
  }

  if (dados.alunos.length === 0) {
    return (
      <Cartao>
        <Vazio icone={ClipboardCheck} titulo="Esta turma não tem alunos" />
      </Cartao>
    );
  }

  const contagem = SITUACOES.map((s) => [s, dados.alunos.filter((a) => marcas[a.id].situacao === s).length] as const).filter(([, n]) => n > 0);

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-text font-semibold first-letter:uppercase">{diaPorExtenso(dados.data)}</p>
          <p className="text-text-muted text-xs">
            {dados.feita
              ? `Chamada feita${dados.registradaPor ? ` por ${dados.registradaPor}` : ""}. Você pode corrigir e salvar de novo.`
              : "Chamada ainda não feita. Todos começam como presentes: marque quem faltou ou chegou atrasado."}
            {fimDeSemana(dados.data) && " Este dia é um fim de semana."}
          </p>
        </div>
        <Botao
          variante="secundario"
          onClick={() => {
            setMarcas(Object.fromEntries(dados.alunos.map((a) => [a.id, { situacao: "presente" as const, observacao: "" }])));
            setMexeu(true);
            setSalvo(false);
          }}
        >
          Todos presentes
        </Botao>
      </div>

      <Cartao>
        <ul className="divide-border divide-y">
          {dados.alunos.map((a) => {
            const m = marcas[a.id];
            return (
              <li key={a.id} className="p-4">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <p className="text-text min-w-40 flex-1 font-medium">{a.nome}</p>
                  <div className="grid w-full grid-cols-4 gap-1 sm:w-auto" role="radiogroup" aria-label={`Situação de ${a.nome}`}>
                    {SITUACOES.map((s) => (
                      <button
                        key={s}
                        type="button"
                        role="radio"
                        aria-checked={m.situacao === s}
                        onClick={() => marcar(a.id, { situacao: s })}
                        className={`cursor-pointer rounded-lg px-2 py-1.5 text-xs font-medium sm:px-3 sm:text-sm ${
                          m.situacao === s ? TONS[TOM_SITUACAO_PRESENCA[s]] + " ring-1 ring-current" : "border-border text-text-secondary hover:text-text border"
                        }`}
                      >
                        {ROTULO_CURTO[s]}
                      </button>
                    ))}
                  </div>
                </div>
                {m.situacao !== "presente" && (
                  <input
                    type="text"
                    maxLength={200}
                    value={m.observacao}
                    onChange={(e) => marcar(a.id, { observacao: e.target.value })}
                    placeholder={m.situacao === "atraso" ? "Observação (ex.: chegou às 8h20)" : "Observação (ex.: atestado médico)"}
                    aria-label={`Observação sobre ${a.nome}`}
                    className="bg-surface border-border text-text placeholder:text-text-muted mt-2 w-full rounded-lg border px-3 py-2 text-sm"
                  />
                )}
              </li>
            );
          })}
        </ul>
      </Cartao>

      {erro && (
        <div className="mt-4">
          <Erro mensagem={erro} />
        </div>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Botao onClick={salvar} carregando={salvando} disabled={dados.feita && !mexeu}>
          {dados.feita ? "Salvar correção" : "Salvar chamada"}
        </Botao>
        <p className="text-text-secondary text-sm">{contagem.map(([s, n]) => `${n} ${NOME_SITUACAO_PRESENCA[s].toLowerCase()}`).join(" · ")}</p>
        {salvo && !mexeu && (
          <span role="status" className="text-success inline-flex items-center gap-1 text-sm">
            <Check className="size-4" aria-hidden />
            Chamada salva
          </span>
        )}
        {mexeu && dados.feita && <span className="text-warning text-sm">Há alterações não salvas</span>}
      </div>
    </>
  );
}

/** Frequência de cada aluno da turma no ano letivo. */
function ResumoDaTurma({ turmaId }: { turmaId: string }) {
  const resumo = useApi<FrequenciaTurma>(`/chamada/turmas/${turmaId}/resumo`);
  if (resumo.erro) return <Erro mensagem={resumo.erro} />;
  if (!resumo.dados) return <Carregando />;
  const { turma, diasComChamada, alunos } = resumo.dados;

  if (diasComChamada === 0) {
    return (
      <Cartao>
        <Vazio icone={ClipboardCheck} titulo="Nenhuma chamada feita ainda" texto={`As chamadas de ${turma.anoLetivo} do ${turma.nome} aparecem aqui.`} />
      </Cartao>
    );
  }
  return (
    <>
      <p className="text-text-muted mb-3 text-xs">
        {turma.nome} · {turma.anoLetivo} · {diasComChamada} {diasComChamada === 1 ? "dia com chamada" : "dias com chamada"}. Em vermelho: frequência
        abaixo de {FREQUENCIA_MINIMA}%.
      </p>
      <Cartao className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-text-muted border-border border-b text-xs uppercase">
            <tr>
              <th className="px-4 py-3 font-medium">Aluno</th>
              <th className="px-4 py-3 text-right font-medium">Frequência</th>
              <th className="px-4 py-3 text-right font-medium">Presenças</th>
              <th className="px-4 py-3 text-right font-medium">Atrasos</th>
              <th className="px-4 py-3 text-right font-medium">Faltas</th>
              <th className="px-4 py-3 text-right font-medium">Justificadas</th>
            </tr>
          </thead>
          <tbody className="divide-border divide-y">
            {alunos.map((a) => {
              const baixa = a.frequencia !== null && a.frequencia < FREQUENCIA_MINIMA;
              return (
                <tr key={a.id} className={baixa ? "bg-danger-subtle" : ""}>
                  <td className="text-text px-4 py-3 font-medium">{a.nome}</td>
                  <td className={`px-4 py-3 text-right font-semibold ${baixa ? "text-danger" : "text-text"}`}>
                    {a.frequencia === null ? "—" : `${a.frequencia}%`}
                  </td>
                  <td className="text-text-secondary px-4 py-3 text-right">{a.presencas}</td>
                  <td className="text-text-secondary px-4 py-3 text-right">{a.atrasos}</td>
                  <td className={`px-4 py-3 text-right ${a.faltas ? "text-danger font-medium" : "text-text-secondary"}`}>{a.faltas}</td>
                  <td className="text-text-secondary px-4 py-3 text-right">{a.faltasJustificadas}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Cartao>
    </>
  );
}
