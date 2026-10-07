"use client";

import { AlertTriangle, Cake, Mail, MapPin, NotebookPen, Pencil, Presentation, Search } from "lucide-react";
import { useState } from "react";
import { useSessao } from "@/components/AuthProvider";
import { useConfirmar } from "@/components/Confirmacao";
import { BotoesContato } from "@/components/contato";
import { Avatar, Botao, Cabecalho, Campo, Carregando, Cartao, Erro, Etiqueta, Vazio } from "@/components/ui";
import { api } from "@/lib/api";
import { dataAniversario } from "@/lib/formatar";
import type { Usuario } from "@/lib/tipos";
import { useApi } from "@/lib/use-api";

const sem = (texto: string) => texto.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

export default function Professores() {
  const { usuario } = useSessao();
  const equipe = usuario?.papel !== "responsavel";
  const professores = useApi<Usuario[]>(usuario && equipe ? "/professores" : null);
  const [busca, setBusca] = useState("");

  if (!usuario) return null;
  if (!equipe) return <Erro mensagem="Área exclusiva da equipe da escola." />;
  const admin = usuario.papel === "admin";

  const termo = sem(busca.trim());
  const lista = (professores.dados ?? []).filter(
    (p) => !termo || sem(p.nome).includes(termo) || p.turmas?.some((t) => sem(t.nome).includes(termo)),
  );

  return (
    <>
      <Cabecalho
        titulo="Professores"
        descricao={
          admin
            ? "Contato, turmas e ficha de cada professor."
            : "Contato e turmas dos colegas. Mantenha a sua ficha atualizada."
        }
        acao={
          <div className="relative w-64">
            <Search className="text-text-muted pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" aria-hidden />
            <label htmlFor="busca-professor" className="sr-only">
              Buscar professor ou turma
            </label>
            <input
              id="busca-professor"
              type="search"
              placeholder="Buscar nome ou turma"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="bg-surface border-border text-text placeholder:text-text-muted w-full rounded-lg border py-2 pr-3 pl-9 text-sm"
            />
          </div>
        }
      />

      {professores.erro && <Erro mensagem={professores.erro} />}
      {professores.carregando && <Carregando />}
      {professores.dados && lista.length === 0 && (
        <Cartao>
          <Vazio
            icone={Presentation}
            titulo={busca ? "Nenhum professor encontrado" : "Nenhum professor cadastrado"}
            texto={!busca && admin ? "Cadastre professores em Gestão → Usuários." : undefined}
          />
        </Cartao>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {lista.map((p) => (
          <CartaoProfessor
            key={p.id}
            professor={p}
            admin={admin}
            souEu={p.id === usuario.id}
            aoSalvar={(novo) => professores.setDados((l) => l?.map((x) => (x.id === novo.id ? novo : x)) ?? null)}
          />
        ))}
      </div>
    </>
  );
}

function CartaoProfessor({
  professor: p,
  admin,
  souEu,
  aoSalvar,
}: {
  professor: Usuario;
  admin: boolean;
  souEu: boolean;
  aoSalvar: (p: Usuario) => void;
}) {
  const [editando, setEditando] = useState(false);
  const podeEditar = admin || souEu;

  return (
    <Cartao className={`p-5 ${p.ativo ? "" : "opacity-70"}`}>
      <div className="flex items-start gap-3">
        <Avatar nome={p.nome} />
        <div className="min-w-0 flex-1">
          <p className="text-text truncate font-semibold">
            {p.nome}
            {souEu && <span className="text-text-muted font-normal"> (você)</span>}
          </p>
          <a href={`mailto:${p.email}`} className="text-text-secondary hover:text-primary inline-flex max-w-full items-center gap-1 text-xs">
            <Mail className="size-3 shrink-0" aria-hidden />
            <span className="truncate">{p.email}</span>
          </a>
        </div>
        {podeEditar && !editando && (
          <button
            type="button"
            onClick={() => setEditando(true)}
            aria-label={`Editar ficha de ${p.nome}`}
            className="text-text-muted hover:text-text cursor-pointer rounded-lg p-2"
          >
            <Pencil className="size-4" />
          </button>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {!p.ativo && <Etiqueta tom="perigo">Desativado</Etiqueta>}
        {p.turmas?.length ? (
          p.turmas.map((t) => (
            <Etiqueta key={t.id} tom="primario">
              {t.nome}
            </Etiqueta>
          ))
        ) : (
          <Etiqueta tom="alerta">Sem turma</Etiqueta>
        )}
        {p.alergias && <Etiqueta tom="perigo">Alergia</Etiqueta>}
      </div>

      {editando ? (
        <FormProfessor
          professor={p}
          admin={admin}
          aoCancelar={() => setEditando(false)}
          aoSalvar={(novo) => {
            aoSalvar(novo);
            setEditando(false);
          }}
        />
      ) : (
        <>
          <div className="border-border mt-4 flex items-center gap-2 border-t pt-3">
            {p.telefone ? (
              <p className="text-text flex-1 text-sm">{p.telefone}</p>
            ) : (
              <p className="text-text-muted flex-1 text-sm">
                Telefone não cadastrado
                {podeEditar && (
                  <>
                    {" · "}
                    <button type="button" onClick={() => setEditando(true)} className="text-primary cursor-pointer font-medium">
                      Cadastrar
                    </button>
                  </>
                )}
              </p>
            )}
            <BotoesContato nome={p.nome} telefone={p.telefone} />
          </div>
          <dl className="mt-3 space-y-2 text-sm">
            {p.dataNascimento && (
              <Linha icone={Cake} rotulo="Aniversário">
                {dataAniversario(p.dataNascimento)}
              </Linha>
            )}
            {p.endereco && (
              <Linha icone={MapPin} rotulo="Endereço">
                {p.endereco}
              </Linha>
            )}
            {p.alergias && (
              <Linha icone={AlertTriangle} rotulo="Alergias" perigo>
                {p.alergias}
              </Linha>
            )}
          </dl>
          {admin && p.anotacoes && (
            <div className="bg-bg mt-4 rounded-lg p-3">
              <p className="text-text-muted mb-1 inline-flex items-center gap-1.5 text-xs font-medium">
                <NotebookPen className="size-3.5" aria-hidden />
                Anotações da direção
              </p>
              <p className="text-text-secondary text-sm whitespace-pre-line">{p.anotacoes}</p>
            </div>
          )}
          {souEu && !p.telefone && !p.dataNascimento && !p.endereco && (
            <button type="button" onClick={() => setEditando(true)} className="text-primary mt-3 cursor-pointer text-sm font-medium">
              Completar minha ficha
            </button>
          )}
        </>
      )}
    </Cartao>
  );
}

function Linha({
  icone: Icone,
  rotulo,
  perigo,
  children,
}: {
  icone: typeof Cake;
  rotulo: string;
  perigo?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-2.5">
      <Icone className={`mt-0.5 size-4 shrink-0 ${perigo ? "text-danger" : "text-text-muted"}`} aria-hidden />
      <div className="min-w-0">
        <dt className="text-text-muted text-xs">{rotulo}</dt>
        <dd className={`whitespace-pre-line ${perigo ? "text-danger font-medium" : "text-text"}`}>{children}</dd>
      </div>
    </div>
  );
}

function FormProfessor({
  professor: p,
  admin,
  aoCancelar,
  aoSalvar,
}: {
  professor: Usuario;
  admin: boolean;
  aoCancelar: () => void;
  aoSalvar: (p: Usuario) => void;
}) {
  const [form, setForm] = useState({
    nome: p.nome,
    email: p.email,
    telefone: p.telefone ?? "",
    dataNascimento: p.dataNascimento ?? "",
    endereco: p.endereco ?? "",
    alergias: p.alergias ?? "",
    anotacoes: p.anotacoes ?? "",
  });
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const aceitar = useConfirmar();
  const campo = (nome: keyof typeof form) => ({
    value: form[nome],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [nome]: e.target.value })),
  });

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    const trocouEmail = admin && form.email.trim().toLowerCase() !== p.email;
    const ok = await aceitar({
      titulo: `Salvar a ficha de ${form.nome.split(" ")[0]}?`,
      mensagem: trocouEmail ? (
        <>
          O e-mail de acesso muda para <strong>{form.email.trim()}</strong>. O professor passa a entrar com ele.
        </>
      ) : undefined,
      confirmar: "Salvar",
    });
    if (!ok) return;
    setErro(null);
    setSalvando(true);
    // E-mail e anotações: só a direção manda (o back recusa se vierem do professor).
    const { email, anotacoes, ...comum } = form;
    try {
      aoSalvar(
        await api<Usuario>(`/professores/${p.id}`, {
          method: "PATCH",
          body: admin ? { ...comum, email, anotacoes } : comum,
        }),
      );
    } catch (err) {
      setErro((err as Error).message);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={salvar} className="border-border mt-4 grid gap-3 border-t pt-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Campo rotulo="Nome completo" required minLength={2} {...campo("nome")} />
      </div>
      {admin && (
        <div className="sm:col-span-2">
          <Campo rotulo="E-mail (login)" type="email" required {...campo("email")} />
        </div>
      )}
      <Campo rotulo="Telefone" type="tel" placeholder="(11) 98765-4321" {...campo("telefone")} />
      <Campo rotulo="Data de nascimento" type="date" max={new Date().toISOString().slice(0, 10)} {...campo("dataNascimento")} />
      <div className="sm:col-span-2">
        <Campo tipo="textarea" rows={2} rotulo="Endereço" placeholder="Rua, número, bairro, cidade" {...campo("endereco")} />
      </div>
      <div className="sm:col-span-2">
        <Campo tipo="textarea" rows={2} rotulo="Alergias" placeholder="Ex.: dipirona, amendoim" {...campo("alergias")} />
      </div>
      {admin && (
        <div className="sm:col-span-2">
          <Campo
            tipo="textarea"
            rows={3}
            rotulo="Anotações da direção"
            ajuda="Só a direção vê. O professor não tem acesso."
            {...campo("anotacoes")}
          />
        </div>
      )}
      {erro && (
        <div className="sm:col-span-2">
          <Erro mensagem={erro} />
        </div>
      )}
      <div className="flex gap-2 sm:col-span-2">
        <Botao type="submit" carregando={salvando}>
          Salvar
        </Botao>
        <Botao type="button" variante="fantasma" onClick={aoCancelar}>
          Cancelar
        </Botao>
      </div>
    </form>
  );
}
