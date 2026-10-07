"use client";

import { AlertTriangle, Check, HeartPulse, Pencil, Pill, Utensils } from "lucide-react";
import { useState } from "react";
import { useSessao } from "@/components/AuthProvider";
import { useConfirmar } from "@/components/Confirmacao";
import { Avatar, Botao, Cabecalho, Campo, Carregando, Cartao, Erro, Etiqueta, Vazio } from "@/components/ui";
import { api } from "@/lib/api";
import { dataCurta } from "@/lib/formatar";
import type { Aluno, Turma } from "@/lib/tipos";
import { useApi } from "@/lib/use-api";

const temFicha = (a: Aluno) => !!(a.alergias || a.restricoesAlimentares || a.medicamentos || a.observacoesSaude);

export default function Saude() {
  const { usuario } = useSessao();
  const familia = usuario?.papel === "responsavel";
  const [turmaId, setTurmaId] = useState("");
  const [todos, setTodos] = useState(false);
  const turmas = useApi<Turma[]>(familia ? null : "/turmas");
  const alunos = useApi<Aluno[]>(`/alunos${turmaId ? `?turmaId=${turmaId}` : ""}`);

  if (!usuario) return null;
  const podeEditar = familia || usuario.papel === "admin";

  const lista = familia || todos ? alunos.dados : alunos.dados?.filter(temFicha);
  const comAlergia = alunos.dados?.filter((a) => a.alergias).length ?? 0;

  const atualizar = (novo: Aluno) =>
    alunos.setDados((atual) => atual?.map((a) => (a.id === novo.id ? { ...a, ...novo } : a)) ?? null);

  return (
    <>
      <Cabecalho
        titulo="Saúde e alergias"
        descricao={
          familia
            ? "Mantenha a escola informada sobre alergias, restrições e medicamentos dos seus filhos."
            : "Alergias, restrições alimentares e medicamentos dos alunos. Consulte antes de lanches, passeios e festas."
        }
        acao={
          !familia && (
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

      {!familia && alunos.dados && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <p className="text-text-secondary text-sm">
            <strong className="text-danger">{comAlergia}</strong> {comAlergia === 1 ? "aluno com alergia" : "alunos com alergia"} ·{" "}
            {alunos.dados.filter(temFicha).length} com alguma informação de saúde
          </p>
          <label className="text-text-secondary flex cursor-pointer items-center gap-2 text-sm">
            <input type="checkbox" className="accent-primary-solid size-4" checked={todos} onChange={(e) => setTodos(e.target.checked)} />
            Mostrar todos os alunos
          </label>
        </div>
      )}

      {alunos.erro && <Erro mensagem={alunos.erro} />}
      {alunos.carregando && <Carregando />}
      {lista?.length === 0 && (
        <Cartao>
          <Vazio
            icone={HeartPulse}
            titulo={familia ? "Nenhum aluno vinculado" : "Nenhuma informação de saúde registrada"}
            texto={familia ? "Peça à secretaria para vincular seus filhos à sua conta." : "As famílias preenchem pela área Saúde do app."}
          />
        </Cartao>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {lista
          ?.slice()
          .sort((a, b) => Number(!!b.alergias) - Number(!!a.alergias) || a.nome.localeCompare(b.nome))
          .map((a) => (
            <FichaSaude key={a.id} aluno={a} podeEditar={podeEditar} iniciarEditando={familia && !temFicha(a)} aoSalvar={atualizar} />
          ))}
      </div>
    </>
  );
}

function FichaSaude({
  aluno: a,
  podeEditar,
  iniciarEditando,
  aoSalvar,
}: {
  aluno: Aluno;
  podeEditar: boolean;
  iniciarEditando: boolean;
  aoSalvar: (a: Aluno) => void;
}) {
  const [editando, setEditando] = useState(iniciarEditando);
  const [form, setForm] = useState({
    alergias: a.alergias ?? "",
    restricoesAlimentares: a.restricoesAlimentares ?? "",
    medicamentos: a.medicamentos ?? "",
    observacoesSaude: a.observacoesSaude ?? "",
  });
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);
  const aceitar = useConfirmar();
  const campo = (nome: keyof typeof form) => ({
    value: form[nome],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [nome]: e.target.value })),
  });

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    const ok = await aceitar({
      titulo: `Salvar a ficha de saúde de ${a.nome.split(" ")[0]}?`,
      mensagem: "A direção e os professores da turma vão ver estas informações.",
      confirmar: "Salvar",
    });
    if (!ok) return;
    setErro(null);
    setSalvando(true);
    try {
      aoSalvar(await api<Aluno>(`/alunos/${a.id}/saude`, { method: "PATCH", body: form }));
      setEditando(false);
      setSalvo(true);
    } catch (err) {
      setErro((err as Error).message);
    } finally {
      setSalvando(false);
    }
  }

  const linhas = [
    { icone: AlertTriangle, rotulo: "Alergias", valor: a.alergias, destaque: true },
    { icone: Utensils, rotulo: "Restrições alimentares", valor: a.restricoesAlimentares },
    { icone: Pill, rotulo: "Medicamentos", valor: a.medicamentos },
    { icone: HeartPulse, rotulo: "Observações", valor: a.observacoesSaude },
  ].filter((l) => l.valor);

  return (
    <Cartao className={`p-5 ${a.alergias ? "border-l-danger border-l-4" : ""}`}>
      <div className="flex items-start gap-3">
        <Avatar nome={a.nome} />
        <div className="min-w-0 flex-1">
          <p className="text-text truncate font-semibold">{a.nome}</p>
          <div className="mt-1 flex flex-wrap gap-2">
            <Etiqueta>{a.turma?.nome ?? "Sem turma"}</Etiqueta>
            {a.alergias && <Etiqueta tom="perigo">Alergia</Etiqueta>}
          </div>
        </div>
        {podeEditar && !editando && (
          <button
            type="button"
            onClick={() => {
              setEditando(true);
              setSalvo(false);
            }}
            aria-label={`Editar ficha de saúde de ${a.nome}`}
            className="text-text-muted hover:text-text cursor-pointer rounded-lg p-2"
          >
            <Pencil className="size-4" />
          </button>
        )}
      </div>

      {editando ? (
        <form onSubmit={salvar} className="mt-4 space-y-3">
          <Campo tipo="textarea" rows={2} rotulo="Alergias" placeholder="Ex.: amendoim, camarão, dipirona" {...campo("alergias")} />
          <Campo tipo="textarea" rows={2} rotulo="Restrições alimentares" placeholder="Ex.: intolerância à lactose" {...campo("restricoesAlimentares")} />
          <Campo tipo="textarea" rows={2} rotulo="Medicamentos" placeholder="Ex.: bombinha para asma na mochila" {...campo("medicamentos")} />
          <Campo tipo="textarea" rows={2} rotulo="Outras observações" placeholder="O que a escola precisa saber" {...campo("observacoesSaude")} />
          {erro && <Erro mensagem={erro} />}
          <div className="flex gap-2">
            <Botao type="submit" carregando={salvando}>
              Salvar
            </Botao>
            {temFicha(a) && (
              <Botao type="button" variante="fantasma" onClick={() => setEditando(false)}>
                Cancelar
              </Botao>
            )}
          </div>
        </form>
      ) : (
        <>
          {linhas.length === 0 ? (
            <p className="text-text-muted mt-4 text-sm">Nenhuma alergia, restrição ou medicamento informado.</p>
          ) : (
            <dl className="mt-4 space-y-3">
              {linhas.map(({ icone: Icone, rotulo, valor, destaque }) => (
                <div key={rotulo} className="flex gap-2.5">
                  <Icone className={`mt-0.5 size-4 shrink-0 ${destaque ? "text-danger" : "text-text-muted"}`} aria-hidden />
                  <div>
                    <dt className="text-text-muted text-xs">{rotulo}</dt>
                    <dd className={`text-sm whitespace-pre-line ${destaque ? "text-danger font-medium" : "text-text"}`}>{valor}</dd>
                  </div>
                </div>
              ))}
            </dl>
          )}
          <p className="text-text-muted mt-4 inline-flex items-center gap-1 text-xs">
            {salvo && <Check className="text-success size-3.5" aria-hidden />}
            {a.saudeAtualizadaEm ? `Atualizado em ${dataCurta(a.saudeAtualizadaEm)}` : "Ainda não preenchido"}
          </p>
        </>
      )}
    </Cartao>
  );
}
