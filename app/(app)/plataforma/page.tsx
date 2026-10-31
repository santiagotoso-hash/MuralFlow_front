"use client";

import { Building2, ChevronRight, Plus, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useSessao } from "@/components/AuthProvider";
import { Botao, Cabecalho, Campo, Carregando, Cartao, Erro, Etiqueta, Vazio } from "@/components/ui";
import { api } from "@/lib/api";
import type { EscolaCompleta, EscolaNaLista } from "@/lib/tipos";
import { useApi } from "@/lib/use-api";
import { MarcaDaEscola, slugDe } from "./componentes";

/** Painel do dono da plataforma: as escolas clientes. */
export default function Plataforma() {
  const { usuario } = useSessao();
  const escolas = useApi<EscolaNaLista[]>("/plataforma/escolas");
  const [criando, setCriando] = useState(false);

  if (usuario?.papel !== "superadmin") return <Erro mensagem="Área do superadmin do MuralFlow." />;

  return (
    <>
      <Cabecalho
        titulo="Escolas"
        descricao="Cadastre as escolas clientes e configure os dados, o PIX, o logo e as cores de cada uma."
        acao={
          !criando && (
            <Botao onClick={() => setCriando(true)}>
              <Plus className="size-4" aria-hidden />
              Nova escola
            </Botao>
          )
        }
      />
      {criando && <NovaEscola aoFechar={() => setCriando(false)} />}

      {escolas.erro && <Erro mensagem={escolas.erro} />}
      {escolas.carregando && <Carregando />}
      {escolas.dados?.length === 0 && (
        <Cartao>
          <Vazio icone={Building2} titulo="Nenhuma escola cadastrada" texto="Use “Nova escola” para cadastrar a primeira." />
        </Cartao>
      )}
      {escolas.dados && escolas.dados.length > 0 && (
        <ul className="grid gap-3 md:grid-cols-2">
          {escolas.dados.map((e) => (
            <li key={e.id}>
              <Link href={`/plataforma/${e.id}`} className="block">
                <Cartao className={`hover:border-primary flex items-center gap-4 p-4 transition-colors ${e.ativa ? "" : "opacity-70"}`}>
                  <MarcaDaEscola escola={e} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-text truncate font-semibold">{e.nome}</p>
                      {!e.ativa && <Etiqueta tom="perigo">Desativada</Etiqueta>}
                      {e.ativa && !e.pixConfigurado && <Etiqueta tom="alerta">Sem PIX</Etiqueta>}
                    </div>
                    <p className="text-text-muted truncate font-mono text-xs">{e.slug}</p>
                    <p className="text-text-secondary mt-1 text-xs">
                      {e.usuarios} {e.usuarios === 1 ? "usuário" : "usuários"} · {e.alunos} {e.alunos === 1 ? "aluno" : "alunos"}
                    </p>
                  </div>
                  <ChevronRight className="text-text-muted size-5 shrink-0" aria-hidden />
                </Cartao>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

/** Escola nova com a primeira conta de direção. */
function NovaEscola({ aoFechar }: { aoFechar: () => void }) {
  const router = useRouter();
  const [form, setForm] = useState({ nome: "", slug: "", adminNome: "", adminEmail: "", adminSenha: "" });
  const [slugEditado, setSlugEditado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const muda = (campo: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [campo]: e.target.value }));

  async function criar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setSalvando(true);
    try {
      const nova = await api<EscolaCompleta>("/plataforma/escolas", { method: "POST", body: form });
      router.push(`/plataforma/${nova.id}`);
    } catch (err) {
      setErro((err as Error).message);
      setSalvando(false);
    }
  }

  return (
    <Cartao className="surgir mb-6 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-text font-semibold">Nova escola</h2>
        <button type="button" onClick={aoFechar} aria-label="Fechar" className="text-text-muted hover:text-text cursor-pointer rounded-lg p-1">
          <X className="size-5" />
        </button>
      </div>
      <form onSubmit={criar} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo
            rotulo="Nome da escola"
            required
            maxLength={120}
            value={form.nome}
            onChange={(e) => {
              const nome = e.target.value;
              setForm((f) => ({ ...f, nome, slug: slugEditado ? f.slug : slugDe(nome) }));
            }}
          />
          <Campo
            rotulo="Endereço (slug)"
            required
            maxLength={40}
            ajuda="Letras minúsculas, números e hífens. Identifica a escola no login."
            value={form.slug}
            onChange={(e) => {
              setSlugEditado(true);
              setForm((f) => ({ ...f, slug: e.target.value.toLowerCase() }));
            }}
          />
        </div>
        <fieldset className="border-border rounded-lg border p-4">
          <legend className="text-text px-1 text-sm font-medium">Primeira conta de direção</legend>
          <div className="grid gap-4 sm:grid-cols-3">
            <Campo rotulo="Nome" required maxLength={120} value={form.adminNome} onChange={muda("adminNome")} />
            <Campo rotulo="E-mail" type="email" required value={form.adminEmail} onChange={muda("adminEmail")} />
            <Campo
              rotulo="Senha inicial"
              type="text"
              required
              minLength={8}
              autoComplete="off"
              ajuda="Pelo menos 8 caracteres. Envie à direção e peça para trocar no Perfil."
              value={form.adminSenha}
              onChange={muda("adminSenha")}
            />
          </div>
        </fieldset>
        <p className="text-text-muted text-xs">
          A escola nasce com as 5 categorias de despesa padrão e sem PIX. Depois de criar, configure os dados, o PIX, o logo e a cor.
        </p>
        {erro && <Erro mensagem={erro} />}
        <div className="flex gap-2">
          <Botao type="submit" carregando={salvando}>
            Criar escola
          </Botao>
          <Botao type="button" variante="fantasma" onClick={aoFechar}>
            Cancelar
          </Botao>
        </div>
      </form>
    </Cartao>
  );
}
