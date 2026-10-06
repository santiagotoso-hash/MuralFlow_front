"use client";

import { Plus, X } from "lucide-react";
import { useState } from "react";
import { useSessao } from "@/components/AuthProvider";
import { Botao, Cabecalho, Campo, Carregando, Cartao, Erro, Etiqueta } from "@/components/ui";
import { api } from "@/lib/api";
import { NOME_PAPEL, NOME_TURNO } from "@/lib/formatar";
import type { Aluno, Papel, Turma, Turno, Usuario } from "@/lib/tipos";
import { useApi } from "@/lib/use-api";

const ABAS = [
  { id: "usuarios", rotulo: "Usuários" },
  { id: "turmas", rotulo: "Turmas" },
  { id: "alunos", rotulo: "Alunos" },
] as const;
type Aba = (typeof ABAS)[number]["id"];

export default function Gestao() {
  const { usuario } = useSessao();
  const [aba, setAba] = useState<Aba>("usuarios");

  if (usuario?.papel !== "admin") return <Erro mensagem="Área exclusiva da direção." />;

  return (
    <>
      <Cabecalho titulo="Gestão escolar" descricao="Cadastre famílias, professores, turmas e alunos." />
      <div role="tablist" aria-label="Seções da gestão" className="border-border mb-6 flex gap-1 border-b">
        {ABAS.map((a) => (
          <button
            key={a.id}
            role="tab"
            type="button"
            aria-selected={aba === a.id}
            onClick={() => setAba(a.id)}
            className={`-mb-px cursor-pointer border-b-2 px-4 py-2 text-sm font-medium ${
              aba === a.id ? "border-primary text-primary" : "text-text-secondary hover:text-text border-transparent"
            }`}
          >
            {a.rotulo}
          </button>
        ))}
      </div>
      {aba === "usuarios" && <AbaUsuarios />}
      {aba === "turmas" && <AbaTurmas />}
      {aba === "alunos" && <AbaAlunos />}
    </>
  );
}

/** Painel de formulário que abre/fecha acima da lista. */
function Formulario({
  titulo,
  aberto,
  setAberto,
  children,
}: {
  titulo: string;
  aberto: boolean;
  setAberto: (v: boolean) => void;
  children: React.ReactNode;
}) {
  if (!aberto) {
    return (
      <Botao onClick={() => setAberto(true)} className="mb-4">
        <Plus className="size-4" aria-hidden />
        {titulo}
      </Botao>
    );
  }
  return (
    <Cartao className="surgir mb-6 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-text font-semibold">{titulo}</h2>
        <button type="button" onClick={() => setAberto(false)} aria-label="Fechar" className="text-text-muted hover:text-text cursor-pointer rounded-lg p-1">
          <X className="size-5" />
        </button>
      </div>
      {children}
    </Cartao>
  );
}

function Checkboxes({
  legenda,
  opcoes,
  marcados,
  setMarcados,
}: {
  legenda: string;
  opcoes: { id: string; nome: string }[];
  marcados: string[];
  setMarcados: (ids: string[]) => void;
}) {
  return (
    <fieldset>
      <legend className="text-text mb-1.5 text-sm font-medium">{legenda}</legend>
      <div className="border-border max-h-40 space-y-1 overflow-y-auto rounded-lg border p-2">
        {opcoes.length === 0 && <p className="text-text-muted px-1 text-xs">Nenhum cadastrado ainda.</p>}
        {opcoes.map((o) => (
          <label key={o.id} className="text-text flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-sm">
            <input
              type="checkbox"
              className="accent-primary-solid size-4"
              checked={marcados.includes(o.id)}
              onChange={(e) =>
                setMarcados(e.target.checked ? [...marcados, o.id] : marcados.filter((id) => id !== o.id))
              }
            />
            {o.nome}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function useEnvio(aoConcluir: () => void) {
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  async function enviar(fn: () => Promise<unknown>) {
    setErro(null);
    setEnviando(true);
    try {
      await fn();
      aoConcluir();
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setEnviando(false);
    }
  }
  return { erro, enviando, enviar };
}

/* ── Usuários ────────────────────────────────────────────────────── */

function AbaUsuarios() {
  const usuarios = useApi<Usuario[]>("/usuarios");
  const [aberto, setAberto] = useState(false);
  const [form, setForm] = useState({ nome: "", email: "", senha: "", telefone: "", papel: "responsavel" as Papel });
  const { erro, enviando, enviar } = useEnvio(() => {
    setAberto(false);
    setForm({ nome: "", email: "", senha: "", telefone: "", papel: "responsavel" });
    usuarios.recarregar();
  });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function alternarAtivo(u: Usuario) {
    await api(`/usuarios/${u.id}`, { method: "PATCH", body: { ativo: !u.ativo } });
    usuarios.recarregar();
  }

  return (
    <>
      <Formulario titulo="Novo usuário" aberto={aberto} setAberto={setAberto}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void enviar(() => api("/usuarios", { method: "POST", body: { ...form, telefone: form.telefone || undefined } }));
          }}
          className="grid gap-4 sm:grid-cols-2"
        >
          <Campo rotulo="Nome completo" required value={form.nome} onChange={set("nome")} />
          <Campo rotulo="E-mail" type="email" required value={form.email} onChange={set("email")} />
          <Campo tipo="select" rotulo="Papel" value={form.papel} onChange={set("papel")}>
            {Object.entries(NOME_PAPEL).map(([v, n]) => (
              <option key={v} value={v}>
                {n}
              </option>
            ))}
          </Campo>
          <Campo rotulo="Telefone (opcional)" type="tel" value={form.telefone} onChange={set("telefone")} />
          <Campo
            rotulo="Senha inicial"
            type="text"
            required
            minLength={6}
            value={form.senha}
            onChange={set("senha")}
            ajuda="Envie para a pessoa; ela pode trocar no perfil."
          />
          {erro && <div className="sm:col-span-2"><Erro mensagem={erro} /></div>}
          <div className="sm:col-span-2">
            <Botao type="submit" carregando={enviando}>Cadastrar</Botao>
          </div>
        </form>
      </Formulario>

      {usuarios.erro && <Erro mensagem={usuarios.erro} />}
      {usuarios.carregando && <Carregando />}
      {usuarios.dados && (
        <Cartao className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-text-muted border-border border-b text-xs uppercase">
              <tr>
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium">E-mail</th>
                <th className="px-4 py-3 font-medium">Papel</th>
                <th className="px-4 py-3 font-medium">Situação</th>
              </tr>
            </thead>
            <tbody className="divide-border divide-y">
              {usuarios.dados.map((u) => (
                <tr key={u.id}>
                  <td className="text-text px-4 py-3 font-medium">{u.nome}</td>
                  <td className="text-text-secondary px-4 py-3">{u.email}</td>
                  <td className="px-4 py-3">
                    <Etiqueta tom={u.papel === "admin" ? "primario" : "neutro"}>{NOME_PAPEL[u.papel]}</Etiqueta>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => alternarAtivo(u)}
                      className="cursor-pointer"
                      title={u.ativo ? "Clique para desativar" : "Clique para reativar"}
                    >
                      <Etiqueta tom={u.ativo ? "sucesso" : "perigo"}>{u.ativo ? "Ativo" : "Desativado"}</Etiqueta>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Cartao>
      )}
    </>
  );
}

/* ── Turmas ──────────────────────────────────────────────────────── */

function AbaTurmas() {
  const turmas = useApi<Turma[]>("/turmas");
  const professores = useApi<Usuario[]>("/usuarios?papel=professor");
  const [aberto, setAberto] = useState(false);
  const [nome, setNome] = useState("");
  const [anoLetivo, setAnoLetivo] = useState(String(new Date().getFullYear()));
  const [turno, setTurno] = useState<Turno>("manha");
  const [professorIds, setProfessorIds] = useState<string[]>([]);
  const { erro, enviando, enviar } = useEnvio(() => {
    setAberto(false);
    setNome("");
    setProfessorIds([]);
    turmas.recarregar();
  });

  return (
    <>
      <Formulario titulo="Nova turma" aberto={aberto} setAberto={setAberto}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void enviar(() =>
              api("/turmas", { method: "POST", body: { nome, anoLetivo: Number(anoLetivo), turno, professorIds } }),
            );
          }}
          className="grid gap-4 sm:grid-cols-3"
        >
          <Campo rotulo="Nome" placeholder="5º Ano A" required value={nome} onChange={(e) => setNome(e.target.value)} />
          <Campo rotulo="Ano letivo" type="number" required value={anoLetivo} onChange={(e) => setAnoLetivo(e.target.value)} />
          <Campo tipo="select" rotulo="Turno" value={turno} onChange={(e) => setTurno(e.target.value as Turno)}>
            {Object.entries(NOME_TURNO).map(([v, n]) => (
              <option key={v} value={v}>
                {n}
              </option>
            ))}
          </Campo>
          <div className="sm:col-span-3">
            <Checkboxes legenda="Professores" opcoes={professores.dados ?? []} marcados={professorIds} setMarcados={setProfessorIds} />
          </div>
          {erro && <div className="sm:col-span-3"><Erro mensagem={erro} /></div>}
          <div className="sm:col-span-3">
            <Botao type="submit" carregando={enviando}>Criar turma</Botao>
          </div>
        </form>
      </Formulario>

      {turmas.erro && <Erro mensagem={turmas.erro} />}
      {turmas.carregando && <Carregando />}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {turmas.dados?.map((t) => (
          <Cartao key={t.id} className="p-5">
            <p className="text-text font-semibold">{t.nome}</p>
            <p className="text-text-muted text-xs">
              {t.anoLetivo} · {NOME_TURNO[t.turno]}
            </p>
            <p className="text-text-secondary mt-3 text-sm">
              {t.professores?.length ? t.professores.map((p) => p.nome).join(", ") : "Sem professor vinculado"}
            </p>
          </Cartao>
        ))}
      </div>
    </>
  );
}

/* ── Alunos ──────────────────────────────────────────────────────── */

function AbaAlunos() {
  const alunos = useApi<Aluno[]>("/alunos");
  const turmas = useApi<Turma[]>("/turmas");
  const responsaveis = useApi<Usuario[]>("/usuarios?papel=responsavel");
  const [aberto, setAberto] = useState(false);
  const [form, setForm] = useState({ nome: "", matricula: "", dataNascimento: "", turmaId: "" });
  const [responsavelIds, setResponsavelIds] = useState<string[]>([]);
  const { erro, enviando, enviar } = useEnvio(() => {
    setAberto(false);
    setForm({ nome: "", matricula: "", dataNascimento: "", turmaId: "" });
    setResponsavelIds([]);
    alunos.recarregar();
  });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <>
      <Formulario titulo="Novo aluno" aberto={aberto} setAberto={setAberto}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void enviar(() =>
              api("/alunos", {
                method: "POST",
                body: {
                  nome: form.nome,
                  matricula: form.matricula || undefined,
                  dataNascimento: form.dataNascimento || undefined,
                  turmaId: form.turmaId || undefined,
                  responsavelIds,
                },
              }),
            );
          }}
          className="grid gap-4 sm:grid-cols-2"
        >
          <Campo rotulo="Nome completo" required value={form.nome} onChange={set("nome")} />
          <Campo rotulo="Matrícula (opcional)" value={form.matricula} onChange={set("matricula")} />
          <Campo rotulo="Data de nascimento" type="date" value={form.dataNascimento} onChange={set("dataNascimento")} />
          <Campo tipo="select" rotulo="Turma" value={form.turmaId} onChange={set("turmaId")}>
            <option value="">Sem turma</option>
            {turmas.dados?.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nome}
              </option>
            ))}
          </Campo>
          <div className="sm:col-span-2">
            <Checkboxes
              legenda="Responsáveis"
              opcoes={responsaveis.dados ?? []}
              marcados={responsavelIds}
              setMarcados={setResponsavelIds}
            />
            <p className="text-text-muted mt-1 text-xs">
              Cadastre o responsável antes, na aba Usuários, com o papel &quot;Responsável&quot;.
            </p>
          </div>
          {erro && <div className="sm:col-span-2"><Erro mensagem={erro} /></div>}
          <div className="sm:col-span-2">
            <Botao type="submit" carregando={enviando}>Cadastrar aluno</Botao>
          </div>
        </form>
      </Formulario>

      {alunos.erro && <Erro mensagem={alunos.erro} />}
      {alunos.carregando && <Carregando />}
      {alunos.dados && (
        <Cartao className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-text-muted border-border border-b text-xs uppercase">
              <tr>
                <th className="px-4 py-3 font-medium">Aluno</th>
                <th className="px-4 py-3 font-medium">Matrícula</th>
                <th className="px-4 py-3 font-medium">Turma</th>
                <th className="px-4 py-3 font-medium">Responsáveis</th>
              </tr>
            </thead>
            <tbody className="divide-border divide-y">
              {alunos.dados.map((a) => (
                <tr key={a.id}>
                  <td className="text-text px-4 py-3 font-medium">{a.nome}</td>
                  <td className="text-text-secondary px-4 py-3">{a.matricula ?? "—"}</td>
                  <td className="text-text-secondary px-4 py-3">{a.turma?.nome ?? "—"}</td>
                  <td className="text-text-secondary px-4 py-3">
                    {a.responsaveis?.map((r) => r.nome).join(", ") || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Cartao>
      )}
    </>
  );
}
