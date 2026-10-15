"use client";

import { BookOpen, ChevronLeft, ChevronRight, ExternalLink, NotebookPen, Plus, X } from "lucide-react";
import { useState } from "react";
import { useSessao } from "@/components/AuthProvider";
import { useConfirmar } from "@/components/Confirmacao";
import { Abas, Botao, Cabecalho, Campo, Carregando, Cartao, Erro, Etiqueta, Vazio } from "@/components/ui";
import { api } from "@/lib/api";
import { chaveDia, dataBr, diasAte } from "@/lib/formatar";
import type { Aluno, AulaDiario, Disciplinas, TarefaDiario, Turma } from "@/lib/tipos";
import { useApi } from "@/lib/use-api";

/** Quantos dias de aulas a tela mostra por vez. */
const JANELA = 14;

function somarDias(data: string, dias: number) {
  const [a, m, d] = data.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d + dias)).toISOString().slice(0, 10);
}

/** "quinta-feira, 15 de outubro" */
const diaPorExtenso = (data: string) =>
  new Date(`${data}T12:00:00Z`).toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

/** "em 3 dias", "amanhã"… para uma data "AAAA-MM-DD". */
const prazo = (data: string) => diasAte(`${data}T12:00:00-03:00`);

/** Agrupa por uma chave de data, mantendo a ordem em que vieram. */
function agruparPor<T>(lista: T[], chave: (x: T) => string) {
  const mapa = new Map<string, T[]>();
  for (const x of lista) mapa.set(chave(x), [...(mapa.get(chave(x)) ?? []), x]);
  return [...mapa.entries()];
}

export default function PaginaDiario() {
  const { usuario } = useSessao();
  if (!usuario) return null;
  if (usuario.papel === "financeiro") return <Erro mensagem="O diário de classe é dos professores, da direção e das famílias." />;

  return usuario.papel === "responsavel" ? (
    <>
      <Cabecalho titulo="Tarefas" descricao="As tarefas de casa e o que foi visto em aula na turma de cada filho." />
      <DiarioFamilia filhos={usuario.filhos ?? []} />
    </>
  ) : (
    <DiarioEquipe />
  );
}

/* ───────────────────────────── Família ───────────────────────────── */

function DiarioFamilia({ filhos }: { filhos: Aluno[] }) {
  const [alunoId, setAlunoId] = useState(filhos[0]?.id ?? "");
  const filho = filhos.find((f) => f.id === alunoId);
  if (filhos.length === 0) {
    return (
      <Cartao>
        <Vazio icone={NotebookPen} titulo="Nenhum aluno vinculado" texto="Peça à secretaria para vincular seus filhos à sua conta." />
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
      {filho?.turma ? (
        <DoFilho key={filho.id} filho={filho} turmaId={filho.turma.id} />
      ) : (
        <Cartao>
          <Vazio icone={NotebookPen} titulo="Sem turma" texto="Este aluno ainda não está em uma turma." />
        </Cartao>
      )}
    </>
  );
}

function DoFilho({ filho, turmaId }: { filho: Aluno; turmaId: string }) {
  const hoje = chaveDia(new Date().toISOString());
  const tarefas = useApi<TarefaDiario[]>(`/diario/tarefas?turmaId=${turmaId}`);
  const aulas = useApi<AulaDiario[]>(`/diario/aulas?turmaId=${turmaId}`);
  const [erro, setErro] = useState<string | null>(null);

  async function marcar(t: TarefaDiario, concluida: boolean) {
    setErro(null);
    // Atualiza na hora; se a API recusar, volta.
    const trocar = (valor: boolean) =>
      tarefas.setDados(
        (l) =>
          l?.map((x) =>
            x.id === t.id ? { ...x, alunos: x.alunos?.map((a) => (a.id === filho.id ? { ...a, concluida: valor } : a)) } : x,
          ) ?? null,
      );
    trocar(concluida);
    try {
      await api(`/diario/tarefas/${t.id}/concluida`, { method: "PUT", body: { alunoId: filho.id, concluida } });
    } catch (err) {
      trocar(!concluida);
      setErro((err as Error).message);
    }
  }

  const lista = tarefas.dados ?? [];
  const pendentes = lista.filter((t) => t.entrega >= hoje);
  const passadas = lista.filter((t) => t.entrega < hoje).reverse();

  return (
    <div className="space-y-8">
      {(erro ?? tarefas.erro) && <Erro mensagem={(erro ?? tarefas.erro)!} />}
      <section>
        <h2 className="text-text mb-3 font-semibold">Para entregar</h2>
        {tarefas.carregando && <Carregando />}
        {tarefas.dados && pendentes.length === 0 && (
          <Cartao>
            <Vazio icone={NotebookPen} titulo="Nenhuma tarefa para entregar" />
          </Cartao>
        )}
        <div className="space-y-3">
          {pendentes.map((t) => (
            <CartaoTarefa key={t.id} tarefa={t}>
              <FeitaPelaFamilia tarefa={t} alunoId={filho.id} aoMarcar={(v) => marcar(t, v)} />
            </CartaoTarefa>
          ))}
        </div>
      </section>

      {passadas.length > 0 && (
        <section>
          <h2 className="text-text mb-3 font-semibold">Prazo encerrado</h2>
          <div className="space-y-3">
            {passadas.map((t) => (
              <CartaoTarefa key={t.id} tarefa={t}>
                <FeitaPelaFamilia tarefa={t} alunoId={filho.id} aoMarcar={(v) => marcar(t, v)} />
              </CartaoTarefa>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-text mb-3 font-semibold">O que foi visto em aula</h2>
        {aulas.erro && <Erro mensagem={aulas.erro} />}
        {aulas.carregando && <Carregando />}
        {aulas.dados?.length === 0 && (
          <Cartao>
            <Vazio icone={BookOpen} titulo="Nenhuma aula registrada nas últimas duas semanas" />
          </Cartao>
        )}
        <ListaDeAulas aulas={aulas.dados ?? []} />
      </section>
    </div>
  );
}

function FeitaPelaFamilia({ tarefa, alunoId, aoMarcar }: { tarefa: TarefaDiario; alunoId: string; aoMarcar: (v: boolean) => void }) {
  const feita = tarefa.alunos?.find((a) => a.id === alunoId)?.concluida ?? false;
  return (
    <label className="text-text mt-3 inline-flex cursor-pointer items-center gap-2 text-sm">
      <input type="checkbox" className="accent-primary-solid size-4" checked={feita} onChange={(e) => aoMarcar(e.target.checked)} />
      {feita ? "Feita" : "Marcar como feita"}
    </label>
  );
}

/* ─────────────────────── Professores e direção ─────────────────────── */

function DiarioEquipe() {
  const turmas = useApi<Turma[]>("/turmas");
  const disciplinas = useApi<Disciplinas>("/boletim/disciplinas");
  const [turmaId, setTurmaId] = useState("");
  const [aba, setAba] = useState<"tarefas" | "aulas">("tarefas");
  const turma = turmaId || turmas.dados?.[0]?.id || "";
  const lista = disciplinas.dados?.disciplinas ?? [];

  return (
    <>
      <Cabecalho
        titulo="Diário de classe"
        descricao="Tarefas de casa e o registro do que foi dado em cada aula."
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
      {(turmas.erro ?? disciplinas.erro) && <Erro mensagem={(turmas.erro ?? disciplinas.erro)!} />}
      {turmas.carregando && <Carregando />}
      {turmas.dados?.length === 0 && (
        <Cartao>
          <Vazio icone={NotebookPen} titulo="Você ainda não tem turmas" />
        </Cartao>
      )}
      {turma && (
        <>
          <Abas
            rotulo="Visão"
            abas={[
              { id: "tarefas", rotulo: "Tarefas" },
              { id: "aulas", rotulo: "Aulas registradas" },
            ]}
            ativa={aba}
            setAtiva={setAba}
          />
          {aba === "tarefas" ? (
            <TarefasDaTurma key={turma} turmaId={turma} disciplinas={lista} />
          ) : (
            <AulasDaTurma key={turma} turmaId={turma} disciplinas={lista} />
          )}
        </>
      )}
    </>
  );
}

function TarefasDaTurma({ turmaId, disciplinas }: { turmaId: string; disciplinas: string[] }) {
  const hoje = chaveDia(new Date().toISOString());
  const tarefas = useApi<TarefaDiario[]>(`/diario/tarefas?turmaId=${turmaId}`);
  const [criando, setCriando] = useState(false);
  const [editando, setEditando] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const aceitar = useConfirmar();

  async function excluir(t: TarefaDiario) {
    const ok = await aceitar({
      titulo: "Excluir esta tarefa?",
      mensagem: <>“{t.titulo}” some para as famílias, junto com as marcações de feita. Isso não pode ser desfeito.</>,
      confirmar: "Excluir",
      perigo: true,
    });
    if (!ok) return;
    setErro(null);
    try {
      await api(`/diario/tarefas/${t.id}`, { method: "DELETE" });
      tarefas.recarregar();
    } catch (err) {
      setErro((err as Error).message);
    }
  }

  const lista = tarefas.dados ?? [];
  const pendentes = lista.filter((t) => t.entrega >= hoje);
  const passadas = lista.filter((t) => t.entrega < hoje).reverse();
  const cartao = (t: TarefaDiario) =>
    editando === t.id ? (
      <FormTarefa
        key={t.id}
        turmaId={turmaId}
        disciplinas={disciplinas}
        tarefa={t}
        aoFechar={() => setEditando(null)}
        aoSalvar={() => {
          setEditando(null);
          tarefas.recarregar();
        }}
      />
    ) : (
      <CartaoTarefa key={t.id} tarefa={t}>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Botao variante="secundario" onClick={() => setEditando(t.id)}>
            Editar
          </Botao>
          <Botao variante="perigo" onClick={() => excluir(t)}>
            Excluir
          </Botao>
        </div>
      </CartaoTarefa>
    );

  return (
    <>
      <div className="mb-4 flex justify-end">
        {!criando && (
          <Botao onClick={() => setCriando(true)} disabled={disciplinas.length === 0}>
            <Plus className="size-4" aria-hidden />
            Nova tarefa
          </Botao>
        )}
      </div>
      {criando && (
        <FormTarefa
          turmaId={turmaId}
          disciplinas={disciplinas}
          aoFechar={() => setCriando(false)}
          aoSalvar={() => {
            setCriando(false);
            tarefas.recarregar();
          }}
        />
      )}
      {(erro ?? tarefas.erro) && (
        <div className="mb-4">
          <Erro mensagem={(erro ?? tarefas.erro)!} />
        </div>
      )}
      {tarefas.carregando && <Carregando />}
      {tarefas.dados && lista.length === 0 && (
        <Cartao>
          <Vazio icone={NotebookPen} titulo="Nenhuma tarefa por aqui" texto="Use “Nova tarefa” para passar uma tarefa de casa para a turma." />
        </Cartao>
      )}
      {pendentes.length > 0 && (
        <section className="mb-8">
          <h2 className="text-text mb-3 font-semibold">Para entregar</h2>
          <div className="space-y-3">{pendentes.map(cartao)}</div>
        </section>
      )}
      {passadas.length > 0 && (
        <section>
          <h2 className="text-text mb-3 font-semibold">Prazo encerrado (último mês)</h2>
          <div className="space-y-3">{passadas.map(cartao)}</div>
        </section>
      )}
    </>
  );
}

/** Uma tarefa: título, disciplina, prazo, descrição, material e (equipe) quantos fizeram. */
function CartaoTarefa({ tarefa: t, children }: { tarefa: TarefaDiario; children?: React.ReactNode }) {
  const hoje = chaveDia(new Date().toISOString());
  return (
    <Cartao className={`p-4 ${t.vencida ? "opacity-80" : ""}`}>
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-text font-semibold">{t.titulo}</h3>
            <Etiqueta tom="primario">{t.disciplina}</Etiqueta>
            {t.entrega === hoje && <Etiqueta tom="alerta">Entrega hoje</Etiqueta>}
          </div>
          <p className="text-text-muted mt-1 text-xs">
            Entrega {dataBr(t.entrega)} · {prazo(t.entrega)}
            {t.professor && ` · ${t.professor}`}
          </p>
          {t.descricao && <p className="text-text-secondary mt-2 text-sm whitespace-pre-line">{t.descricao}</p>}
          {t.link && (
            <a
              href={t.link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary mt-2 inline-flex items-center gap-1 text-sm font-medium hover:underline"
            >
              <ExternalLink className="size-4" aria-hidden />
              Abrir material
            </a>
          )}
        </div>
        {t.totalAlunos !== undefined && (
          <p className="text-text-secondary text-right text-sm">
            <strong className="text-text">{t.concluidas ?? 0}</strong> de {t.totalAlunos}
            <span className="text-text-muted block text-xs">marcaram como feita</span>
          </p>
        )}
      </div>
      {children}
    </Cartao>
  );
}

function FormTarefa({
  turmaId,
  disciplinas,
  tarefa,
  aoFechar,
  aoSalvar,
}: {
  turmaId: string;
  disciplinas: string[];
  /** Presente: editando esta tarefa. */
  tarefa?: TarefaDiario;
  aoFechar: () => void;
  aoSalvar: () => void;
}) {
  const hoje = chaveDia(new Date().toISOString());
  const [disciplina, setDisciplina] = useState(tarefa?.disciplina ?? "");
  const [titulo, setTitulo] = useState(tarefa?.titulo ?? "");
  const [descricao, setDescricao] = useState(tarefa?.descricao ?? "");
  const [entrega, setEntrega] = useState(tarefa?.entrega ?? somarDias(hoje, 1));
  const [link, setLink] = useState(tarefa?.link ?? "");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setSalvando(true);
    const campos = { disciplina, titulo, descricao, entrega, link: link.trim() || (tarefa ? "" : undefined) };
    try {
      if (tarefa) await api(`/diario/tarefas/${tarefa.id}`, { method: "PATCH", body: campos });
      else await api("/diario/tarefas", { method: "POST", body: { turmaId, ...campos, descricao: descricao.trim() || undefined } });
      aoSalvar();
    } catch (err) {
      setErro((err as Error).message);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Cartao className="mb-4 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-text font-semibold">{tarefa ? "Editar tarefa" : "Nova tarefa"}</h2>
        <button type="button" onClick={aoFechar} aria-label="Fechar" className="text-text-muted hover:text-text cursor-pointer rounded-lg p-1.5">
          <X className="size-4" />
        </button>
      </div>
      <form onSubmit={salvar} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo tipo="select" rotulo="Disciplina" required value={disciplina} onChange={(e) => setDisciplina(e.target.value)}>
            <option value="">Escolha…</option>
            {disciplinas.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </Campo>
          <Campo rotulo="Entrega" type="date" required min={tarefa ? undefined : hoje} value={entrega} onChange={(e) => setEntrega(e.target.value)} />
        </div>
        <Campo
          rotulo="Título"
          required
          minLength={3}
          maxLength={150}
          placeholder="Exercícios 1 a 10 da pág. 43"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
        />
        <Campo
          tipo="textarea"
          rotulo="Instruções (opcional)"
          maxLength={3000}
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
        />
        <Campo
          rotulo="Link do material (opcional)"
          type="url"
          placeholder="https://"
          maxLength={500}
          value={link}
          onChange={(e) => setLink(e.target.value)}
          ajuda="Um vídeo, um site ou um documento compartilhado."
        />
        {erro && <Erro mensagem={erro} />}
        <div className="flex flex-wrap gap-2">
          <Botao type="submit" carregando={salvando}>
            {tarefa ? "Salvar" : "Passar tarefa"}
          </Botao>
          <Botao type="button" variante="fantasma" onClick={aoFechar}>
            Cancelar
          </Botao>
        </div>
      </form>
    </Cartao>
  );
}

function AulasDaTurma({ turmaId, disciplinas }: { turmaId: string; disciplinas: string[] }) {
  const hoje = chaveDia(new Date().toISOString());
  const [ate, setAte] = useState(hoje);
  const de = somarDias(ate, -(JANELA - 1));
  const aulas = useApi<AulaDiario[]>(`/diario/aulas?turmaId=${turmaId}&de=${de}&ate=${ate}`);
  const [erro, setErro] = useState<string | null>(null);
  const aceitar = useConfirmar();

  async function excluir(a: AulaDiario) {
    const ok = await aceitar({
      titulo: "Excluir o registro desta aula?",
      mensagem: (
        <>
          {a.disciplina} de {dataBr(a.data)} some do diário e da visão das famílias.
        </>
      ),
      confirmar: "Excluir",
      perigo: true,
    });
    if (!ok) return;
    setErro(null);
    try {
      await api(`/diario/aulas/${a.id}`, { method: "DELETE" });
      aulas.recarregar();
    } catch (err) {
      setErro((err as Error).message);
    }
  }

  return (
    <>
      <FormAula turmaId={turmaId} disciplinas={disciplinas} aoSalvar={() => aulas.recarregar()} />

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-text font-semibold">
          De {dataBr(de)} a {dataBr(ate)}
        </h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setAte(somarDias(ate, -JANELA))}
            aria-label="Duas semanas antes"
            className="text-text-secondary hover:text-text hover:bg-bg cursor-pointer rounded-lg p-2"
          >
            <ChevronLeft className="size-5" />
          </button>
          <button
            type="button"
            onClick={() => setAte(somarDias(ate, JANELA) > hoje ? hoje : somarDias(ate, JANELA))}
            disabled={ate >= hoje}
            aria-label="Duas semanas depois"
            className="text-text-secondary hover:text-text hover:bg-bg cursor-pointer rounded-lg p-2 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronRight className="size-5" />
          </button>
        </div>
      </div>
      {(erro ?? aulas.erro) && (
        <div className="mb-4">
          <Erro mensagem={(erro ?? aulas.erro)!} />
        </div>
      )}
      {aulas.carregando && <Carregando />}
      {aulas.dados?.length === 0 && (
        <Cartao>
          <Vazio icone={BookOpen} titulo="Nenhuma aula registrada neste período" />
        </Cartao>
      )}
      <ListaDeAulas aulas={aulas.dados ?? []} aoExcluir={excluir} aoEditar={() => aulas.recarregar()} />
    </>
  );
}

/** Registrar (ou corrigir) a aula de um dia numa disciplina. */
function FormAula({ turmaId, disciplinas, aoSalvar }: { turmaId: string; disciplinas: string[]; aoSalvar: () => void }) {
  const hoje = chaveDia(new Date().toISOString());
  const [data, setData] = useState(hoje);
  const [disciplina, setDisciplina] = useState("");
  const [conteudo, setConteudo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setSalvo(false);
    setSalvando(true);
    try {
      await api("/diario/aulas", { method: "PUT", body: { turmaId, data, disciplina, conteudo } });
      setConteudo("");
      setSalvo(true);
      aoSalvar();
    } catch (err) {
      setErro((err as Error).message);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Cartao className="mb-6 p-5">
      <h2 className="text-text mb-1 font-semibold">Registrar aula</h2>
      <p className="text-text-muted mb-4 text-xs">
        Registrar de novo a mesma disciplina no mesmo dia substitui o que estava escrito.
      </p>
      <form onSubmit={salvar} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo rotulo="Dia" type="date" required max={hoje} value={data} onChange={(e) => setData(e.target.value)} />
          <Campo tipo="select" rotulo="Disciplina" required value={disciplina} onChange={(e) => setDisciplina(e.target.value)}>
            <option value="">Escolha…</option>
            {disciplinas.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </Campo>
        </div>
        <Campo
          tipo="textarea"
          rotulo="O que foi trabalhado"
          required
          minLength={3}
          maxLength={3000}
          placeholder="Frações equivalentes; correção dos exercícios da pág. 42."
          value={conteudo}
          onChange={(e) => {
            setConteudo(e.target.value);
            setSalvo(false);
          }}
        />
        {erro && <Erro mensagem={erro} />}
        <div className="flex flex-wrap items-center gap-3">
          <Botao type="submit" carregando={salvando}>
            Registrar aula
          </Botao>
          {salvo && <span className="text-success text-sm">Aula registrada</span>}
        </div>
      </form>
    </Cartao>
  );
}

/** Aulas agrupadas por dia. Com `aoExcluir`/`aoEditar`, a equipe corrige o texto. */
function ListaDeAulas({
  aulas,
  aoExcluir,
  aoEditar,
}: {
  aulas: AulaDiario[];
  aoExcluir?: (a: AulaDiario) => void;
  aoEditar?: () => void;
}) {
  const [editando, setEditando] = useState<{ id: string; texto: string } | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    if (!editando) return;
    setErro(null);
    setSalvando(true);
    try {
      await api(`/diario/aulas/${editando.id}`, { method: "PATCH", body: { conteudo: editando.texto } });
      setEditando(null);
      aoEditar?.();
    } catch (err) {
      setErro((err as Error).message);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="space-y-6">
      {agruparPor(aulas, (a) => a.data).map(([data, doDia]) => (
        <section key={data}>
          <h3 className="text-text-secondary mb-2 text-sm font-semibold first-letter:uppercase">{diaPorExtenso(data)}</h3>
          <Cartao>
            <ul className="divide-border divide-y">
              {doDia.map((a) => (
                <li key={a.id} className="p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Etiqueta tom="primario">{a.disciplina}</Etiqueta>
                    {a.professor && <span className="text-text-muted text-xs">{a.professor}</span>}
                  </div>
                  {editando?.id === a.id ? (
                    <div className="mt-2 space-y-2">
                      <Campo
                        tipo="textarea"
                        rotulo="O que foi trabalhado"
                        maxLength={3000}
                        value={editando.texto}
                        onChange={(e) => setEditando({ id: a.id, texto: e.target.value })}
                      />
                      {erro && <Erro mensagem={erro} />}
                      <div className="flex gap-2">
                        <Botao onClick={salvar} carregando={salvando}>
                          Salvar
                        </Botao>
                        <Botao variante="fantasma" onClick={() => setEditando(null)}>
                          Cancelar
                        </Botao>
                      </div>
                    </div>
                  ) : (
                    <p className="text-text mt-2 text-sm whitespace-pre-line">{a.conteudo}</p>
                  )}
                  {aoExcluir && editando?.id !== a.id && (
                    <div className="mt-3 flex gap-2">
                      <Botao variante="secundario" onClick={() => setEditando({ id: a.id, texto: a.conteudo })}>
                        Editar
                      </Botao>
                      <Botao variante="perigo" onClick={() => aoExcluir(a)}>
                        Excluir
                      </Botao>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </Cartao>
        </section>
      ))}
    </div>
  );
}
