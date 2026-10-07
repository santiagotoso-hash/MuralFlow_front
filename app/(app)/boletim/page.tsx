"use client";

import { Check, GraduationCap } from "lucide-react";
import { useState } from "react";
import { useSessao } from "@/components/AuthProvider";
import { useConfirmar } from "@/components/Confirmacao";
import { Botao, Cabecalho, Campo, Carregando, Cartao, Erro, Vazio } from "@/components/ui";
import { api } from "@/lib/api";
import { nota } from "@/lib/formatar";
import type { Aluno, Boletim, Disciplinas, Pauta, Turma } from "@/lib/tipos";
import { useApi } from "@/lib/use-api";

const BIMESTRES = [1, 2, 3, 4] as const;

function Abas<T extends string>({
  abas,
  ativa,
  setAtiva,
  rotulo,
}: {
  abas: { id: T; rotulo: string }[];
  ativa: T;
  setAtiva: (id: T) => void;
  rotulo: string;
}) {
  return (
    <div role="tablist" aria-label={rotulo} className="border-border mb-6 flex gap-1 overflow-x-auto border-b">
      {abas.map((a) => (
        <button
          key={a.id}
          role="tab"
          type="button"
          aria-selected={ativa === a.id}
          onClick={() => setAtiva(a.id)}
          className={`-mb-px cursor-pointer border-b-2 px-4 py-2 text-sm font-medium whitespace-nowrap ${
            ativa === a.id ? "border-primary text-primary" : "text-text-secondary hover:text-text border-transparent"
          }`}
        >
          {a.rotulo}
        </button>
      ))}
    </div>
  );
}

export default function PaginaBoletim() {
  const { usuario } = useSessao();
  const disciplinas = useApi<Disciplinas>("/boletim/disciplinas");
  if (!usuario) return null;

  return usuario.papel === "responsavel" ? (
    <>
      <Cabecalho titulo="Boletim" descricao="Notas por disciplina em cada bimestre." />
      <BoletimFamilia filhos={usuario.filhos ?? []} config={disciplinas.dados} />
    </>
  ) : (
    <>
      <Cabecalho titulo="Boletim" descricao="Lance as notas da turma e consulte o boletim de cada aluno." />
      <BoletimEquipe config={disciplinas.dados} />
    </>
  );
}

function BoletimFamilia({ filhos, config }: { filhos: Aluno[]; config: Disciplinas | null }) {
  const [alunoId, setAlunoId] = useState(filhos[0]?.id ?? "");
  if (filhos.length === 0) {
    return (
      <Cartao>
        <Vazio icone={GraduationCap} titulo="Nenhum aluno vinculado" texto="Peça à secretaria para vincular seus filhos à sua conta." />
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
      <BoletimDoAluno alunoId={alunoId} config={config} />
    </>
  );
}

function BoletimEquipe({ config }: { config: Disciplinas | null }) {
  const [aba, setAba] = useState<"lancar" | "consultar">("lancar");
  const turmas = useApi<Turma[]>("/turmas");
  const [turmaId, setTurmaId] = useState("");
  const turma = turmaId || turmas.dados?.[0]?.id || "";

  if (turmas.dados?.length === 0) {
    return (
      <Cartao>
        <Vazio icone={GraduationCap} titulo="Você ainda não tem turmas" />
      </Cartao>
    );
  }

  return (
    <>
      <Abas
        rotulo="Seções do boletim"
        abas={[
          { id: "lancar", rotulo: "Lançar notas" },
          { id: "consultar", rotulo: "Boletim por aluno" },
        ]}
        ativa={aba}
        setAtiva={setAba}
      />
      <div className="mb-6 max-w-xs">
        <Campo tipo="select" rotulo="Turma" value={turma} onChange={(e) => setTurmaId(e.target.value)}>
          {turmas.dados?.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nome} ({t.anoLetivo})
            </option>
          ))}
        </Campo>
      </div>
      {turmas.erro && <Erro mensagem={turmas.erro} />}
      {turma && config && (aba === "lancar" ? <LancarNotas turmaId={turma} config={config} /> : <ConsultarAluno turmaId={turma} config={config} />)}
    </>
  );
}

/** "7,5" ou "7.5" → 7.5; vazio → null; inválido → NaN. */
function lerNota(texto: string): number | null {
  const t = texto.trim().replace(",", ".");
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 && n <= 10 ? Math.round(n * 100) / 100 : NaN;
}

function LancarNotas({ turmaId, config }: { turmaId: string; config: Disciplinas }) {
  const [disciplina, setDisciplina] = useState(config.disciplinas[0]);
  const [bimestre, setBimestre] = useState(1);
  const caminho = `/boletim/turmas/${turmaId}?disciplina=${encodeURIComponent(disciplina)}&bimestre=${bimestre}`;
  const pauta = useApi<Pauta>(caminho);
  // Enquanto a pauta nova carrega, useApi ainda devolve a anterior.
  const atual =
    pauta.dados?.turma.id === turmaId && pauta.dados.disciplina === disciplina && pauta.dados.bimestre === bimestre
      ? pauta.dados
      : null;

  return (
    <Cartao className="p-5">
      <div className="mb-5 grid gap-4 sm:grid-cols-2">
        <Campo tipo="select" rotulo="Disciplina" value={disciplina} onChange={(e) => setDisciplina(e.target.value)}>
          {config.disciplinas.map((d) => (
            <option key={d}>{d}</option>
          ))}
        </Campo>
        <Campo tipo="select" rotulo="Bimestre" value={bimestre} onChange={(e) => setBimestre(Number(e.target.value))}>
          {BIMESTRES.map((b) => (
            <option key={b} value={b}>
              {b}º bimestre
            </option>
          ))}
        </Campo>
      </div>

      {pauta.erro && <Erro mensagem={pauta.erro} />}
      {!atual && !pauta.erro && <Carregando />}
      {atual?.alunos.length === 0 && <p className="text-text-muted text-sm">Esta turma ainda não tem alunos.</p>}
      {/* key: trocar de pauta recria o formulário com as notas dela. */}
      {atual && atual.alunos.length > 0 && (
        <FormPauta key={caminho} pauta={atual} mediaMinima={config.mediaMinima} aoSalvar={pauta.setDados} />
      )}
    </Cartao>
  );
}

function FormPauta({
  pauta,
  mediaMinima,
  aoSalvar,
}: {
  pauta: Pauta;
  mediaMinima: number;
  aoSalvar: (p: Pauta) => void;
}) {
  const [valores, setValores] = useState<Record<string, string>>(() =>
    Object.fromEntries(pauta.alunos.map((a) => [a.id, a.valor === null ? "" : nota(a.valor)])),
  );
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);
  const aceitar = useConfirmar();
  const invalidos = Object.values(valores).filter((v) => Number.isNaN(lerNota(v)));

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (invalidos.length) return;
    const lancadas = Object.values(valores).filter((v) => v.trim() !== "").length;
    const ok = await aceitar({
      titulo: "Salvar as notas?",
      mensagem: (
        <>
          <strong>{pauta.disciplina}</strong>, {pauta.bimestre}º bimestre, {pauta.turma.nome}: {lancadas} de {pauta.alunos.length} alunos com
          nota. As famílias veem o boletim atualizado na hora.
        </>
      ),
      confirmar: "Salvar notas",
    });
    if (!ok) return;
    setSalvando(true);
    setErro(null);
    try {
      aoSalvar(
        await api<Pauta>(`/boletim/turmas/${pauta.turma.id}`, {
          method: "PUT",
          body: {
            disciplina: pauta.disciplina,
            bimestre: pauta.bimestre,
            notas: pauta.alunos.map((a) => ({ alunoId: a.id, valor: lerNota(valores[a.id] ?? "") })),
          },
        }),
      );
      setSalvo(true);
    } catch (err) {
      setErro((err as Error).message);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={salvar}>
      <ul className="divide-border divide-y">
        {pauta.alunos.map((a) => {
          const valor = valores[a.id] ?? "";
          const n = lerNota(valor);
          const invalido = Number.isNaN(n);
          return (
            <li key={a.id} className="flex items-center justify-between gap-4 py-2.5">
              <label htmlFor={`nota-${a.id}`} className="text-text min-w-0 truncate text-sm">
                {a.nome}
              </label>
              <input
                id={`nota-${a.id}`}
                inputMode="decimal"
                autoComplete="off"
                placeholder="—"
                value={valor}
                aria-invalid={invalido}
                aria-describedby="nota-ajuda"
                onChange={(e) => {
                  setValores((v) => ({ ...v, [a.id]: e.target.value }));
                  setSalvo(false);
                }}
                className={`bg-surface w-20 rounded-lg border px-3 py-1.5 text-right text-sm tabular-nums ${
                  invalido
                    ? "border-danger text-danger"
                    : n !== null && n < mediaMinima
                      ? "border-border text-danger"
                      : "border-border text-text"
                }`}
              />
            </li>
          );
        })}
      </ul>
      <p id="nota-ajuda" className={`mt-3 text-xs ${invalidos.length ? "text-danger" : "text-text-muted"}`}>
        Notas de 0 a 10 (ex.: 7,5). Deixe em branco para não lançar ou apagar.
      </p>
      {erro && (
        <div className="mt-3">
          <Erro mensagem={erro} />
        </div>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Botao type="submit" carregando={salvando} disabled={invalidos.length > 0}>
          Salvar notas
        </Botao>
        {salvo && (
          <span role="status" className="text-success inline-flex items-center gap-1 text-sm">
            <Check className="size-4" aria-hidden />
            Notas salvas
          </span>
        )}
      </div>
    </form>
  );
}

function ConsultarAluno({ turmaId, config }: { turmaId: string; config: Disciplinas }) {
  const alunos = useApi<Aluno[]>(`/alunos?turmaId=${turmaId}`);
  const [escolhido, setEscolhido] = useState("");
  const alunoId = alunos.dados?.some((a) => a.id === escolhido) ? escolhido : (alunos.dados?.[0]?.id ?? "");

  if (alunos.dados?.length === 0) return <p className="text-text-muted text-sm">Esta turma ainda não tem alunos.</p>;
  return (
    <>
      <div className="mb-6 max-w-xs">
        <Campo tipo="select" rotulo="Aluno" value={alunoId} onChange={(e) => setEscolhido(e.target.value)}>
          {alunos.dados?.map((a) => (
            <option key={a.id} value={a.id}>
              {a.nome}
            </option>
          ))}
        </Campo>
      </div>
      {alunoId && <BoletimDoAluno alunoId={alunoId} config={config} />}
    </>
  );
}

function BoletimDoAluno({ alunoId, config }: { alunoId: string; config: Disciplinas | null }) {
  const boletim = useApi<Boletim>(`/boletim/alunos/${alunoId}`);
  if (boletim.erro) return <Erro mensagem={boletim.erro} />;
  if (!boletim.dados || !config) return <Carregando />;

  const { notas, anoLetivo, aluno } = boletim.dados;
  // Ordem da lista oficial; disciplinas antigas que saíram da lista vão no fim.
  const comNota = new Set(notas.map((n) => n.disciplina));
  const linhas = [...config.disciplinas.filter((d) => comNota.has(d)), ...[...comNota].filter((d) => !config.disciplinas.includes(d))];

  if (linhas.length === 0) {
    return (
      <Cartao>
        <Vazio icone={GraduationCap} titulo="Nenhuma nota lançada ainda" texto={`As notas de ${anoLetivo} aparecem aqui assim que a escola lançar.`} />
      </Cartao>
    );
  }

  const valor = (d: string, b: number) => notas.find((n) => n.disciplina === d && n.bimestre === b)?.valor;
  const abaixo = (v: number) => v < config.mediaMinima;

  return (
    <Cartao className="overflow-hidden">
      <div className="border-border border-b px-5 py-4">
        <h2 className="text-text font-semibold">{aluno.nome}</h2>
        <p className="text-text-muted text-xs">
          {aluno.turma?.nome ?? "Sem turma"} · Ano letivo {anoLetivo}
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[30rem] text-sm">
          <caption className="sr-only">Boletim de {aluno.nome}, {anoLetivo}</caption>
          <thead>
            <tr className="text-text-muted text-xs">
              <th scope="col" className="px-5 py-2.5 text-left font-medium">Disciplina</th>
              {BIMESTRES.map((b) => (
                <th key={b} scope="col" className="px-2 py-2.5 text-center font-medium">
                  {b}º bim
                </th>
              ))}
              <th scope="col" className="px-5 py-2.5 text-center font-semibold">Média</th>
            </tr>
          </thead>
          <tbody className="divide-border divide-y">
            {linhas.map((d) => {
              const vs = BIMESTRES.map((b) => valor(d, b));
              const lancadas = vs.filter((v): v is number => v !== undefined);
              const media = lancadas.length ? lancadas.reduce((s, v) => s + v, 0) / lancadas.length : null;
              return (
                <tr key={d}>
                  <th scope="row" className="text-text px-5 py-3 text-left font-medium">{d}</th>
                  {vs.map((v, i) => (
                    <td key={i} className={`px-2 py-3 text-center tabular-nums ${v === undefined ? "text-text-muted" : abaixo(v) ? "text-danger font-semibold" : "text-text"}`}>
                      {v === undefined ? "—" : nota(v)}
                    </td>
                  ))}
                  <td className={`px-5 py-3 text-center font-semibold tabular-nums ${media === null ? "text-text-muted" : abaixo(media) ? "text-danger" : "text-primary"}`}>
                    {media === null ? "—" : nota(Math.round(media * 10) / 10)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-text-muted border-border border-t px-5 py-3 text-xs">
        Média = média das notas já lançadas. Em vermelho: abaixo de {nota(config.mediaMinima)}.
      </p>
    </Cartao>
  );
}
