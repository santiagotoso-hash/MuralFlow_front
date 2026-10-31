"use client";

import { ArrowLeft, ImageUp, Landmark, Palette, Power, QrCode, School, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useRef, useState } from "react";
import { useSessao } from "@/components/AuthProvider";
import { useConfirmar } from "@/components/Confirmacao";
import { CamposInstitucionais, type Institucionais, ouNulo } from "@/components/DadosDaEscola";
import { Botao, Campo, Carregando, Cartao, Erro, Etiqueta } from "@/components/ui";
import { api } from "@/lib/api";
import { contrasteComBranco } from "@/lib/escola";
import type { EscolaCompleta } from "@/lib/tipos";
import { useApi } from "@/lib/use-api";
import { MarcaDaEscola } from "../componentes";

const COR_PADRAO = "#0F766E";
const LOGO_MAXIMO = 300 * 1024;

/** Superadmin: tudo de uma escola (dados, PIX, conta, logo, cor e situação). */
export default function EditarEscola() {
  const { usuario } = useSessao();
  const { id } = useParams<{ id: string }>();
  const escola = useApi<EscolaCompleta>(`/plataforma/escolas/${id}`);

  if (usuario?.papel !== "superadmin") return <Erro mensagem="Área do superadmin do MuralFlow." />;
  return (
    <>
      <Link href="/plataforma" className="text-text-secondary hover:text-text mb-4 inline-flex items-center gap-1.5 text-sm font-medium">
        <ArrowLeft className="size-4" aria-hidden />
        Todas as escolas
      </Link>
      {escola.erro && <Erro mensagem={escola.erro} />}
      {escola.carregando && <Carregando />}
      {escola.dados && (
        // O formulário guarda o que está sendo digitado; logo e situação vêm da escola atualizada.
        <Editor key={escola.dados.id} escola={escola.dados} aoMudar={escola.setDados} />
      )}
    </>
  );
}

function Editor({ escola, aoMudar }: { escola: EscolaCompleta; aoMudar: (e: EscolaCompleta) => void }) {
  const aceitar = useConfirmar();
  const [form, setForm] = useState({
    nome: escola.nome,
    slug: escola.slug,
    cnpj: escola.cnpj,
    endereco: escola.endereco,
    cidade: escola.cidade,
    assinatura: escola.assinatura,
    pixChave: escola.pixChave,
    pixNome: escola.pixNome,
    pixCidade: escola.pixCidade,
    dadosBancarios: escola.dadosBancarios,
    cor: escola.cor,
  });
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);
  const muda = <K extends keyof typeof form>(campo: K, valor: (typeof form)[K]) => {
    setForm((f) => ({ ...f, [campo]: valor }));
    setSalvo(false);
  };

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    const pixMudou = (ouNulo(form.pixChave) ?? "") !== (escola.pixChave ?? "");
    if (pixMudou) {
      const ok = await aceitar({
        titulo: form.pixChave?.trim() ? "Trocar a chave PIX?" : "Tirar o PIX desta escola?",
        mensagem: form.pixChave?.trim() ? (
          <>
            As famílias de <strong>{escola.nome}</strong> passam a pagar na chave <strong>{form.pixChave}</strong>. Confira com a escola
            antes: um erro aqui manda o dinheiro para a conta errada.
          </>
        ) : (
          <>O botão “Pagar” some para as famílias, a menos que haja dados para transferência.</>
        ),
        confirmar: form.pixChave?.trim() ? "Trocar a chave" : "Tirar o PIX",
        perigo: true,
      });
      if (!ok) return;
    }
    setErro(null);
    setSalvando(true);
    try {
      const atualizada = await api<EscolaCompleta>(`/plataforma/escolas/${escola.id}`, {
        method: "PATCH",
        body: {
          nome: form.nome.trim(),
          slug: form.slug.trim(),
          cnpj: ouNulo(form.cnpj),
          endereco: ouNulo(form.endereco),
          cidade: ouNulo(form.cidade),
          assinatura: ouNulo(form.assinatura),
          pixChave: ouNulo(form.pixChave),
          pixNome: ouNulo(form.pixNome),
          pixCidade: ouNulo(form.pixCidade),
          dadosBancarios: ouNulo(form.dadosBancarios),
          cor: form.cor,
        },
      });
      setSalvo(true);
      aoMudar(atualizada);
    } catch (err) {
      setErro((err as Error).message);
    } finally {
      setSalvando(false);
    }
  }

  async function alternarAtiva() {
    const desativar = escola.ativa;
    const ok = await aceitar({
      titulo: desativar ? `Desativar ${escola.nome}?` : `Reativar ${escola.nome}?`,
      mensagem: desativar
        ? "Ninguém da escola consegue mais entrar, e quem estiver usando o app é desconectado. Os dados ficam guardados: dá para reativar depois."
        : "Todos da escola voltam a conseguir entrar.",
      confirmar: desativar ? "Desativar escola" : "Reativar",
      perigo: desativar,
    });
    if (!ok) return;
    try {
      aoMudar(await api<EscolaCompleta>(`/plataforma/escolas/${escola.id}`, { method: "PATCH", body: { ativa: !desativar } }));
    } catch (err) {
      setErro((err as Error).message);
    }
  }

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <MarcaDaEscola escola={{ nome: form.nome || escola.nome, cor: form.cor, logo: escola.logo }} tamanho="lg" />
        <div className="min-w-0 flex-1">
          <h1 className="text-text text-2xl font-bold">{escola.nome}</h1>
          <p className="text-text-muted font-mono text-sm">{escola.slug}</p>
        </div>
        <Etiqueta tom={escola.ativa ? "sucesso" : "perigo"}>{escola.ativa ? "Ativa" : "Desativada"}</Etiqueta>
      </div>

      <form onSubmit={salvar} className="space-y-6">
        <Secao icone={School} titulo="Dados da escola" texto="Saem nas declarações e no recibo. A direção da escola também pode mudar estes.">
          <CamposInstitucionais valores={form as Institucionais} aoMudar={(c, v) => muda(c, v)} />
          <div className="mt-4 max-w-sm">
            <Campo
              rotulo="Endereço (slug)"
              required
              maxLength={40}
              ajuda="Letras minúsculas, números e hífens. Identifica a escola no login."
              value={form.slug}
              onChange={(e) => muda("slug", e.target.value.toLowerCase())}
            />
          </div>
        </Secao>

        <Secao icone={QrCode} titulo="Pagamento" texto="Só você muda: a direção da escola vê, mas não altera. Sem PIX nem conta, o botão “Pagar” não aparece.">
          <div className="grid gap-4 sm:grid-cols-3">
            <Campo
              rotulo="Chave PIX"
              maxLength={100}
              placeholder="CNPJ, e-mail, +55… ou aleatória"
              value={form.pixChave ?? ""}
              onChange={(e) => muda("pixChave", e.target.value)}
            />
            <Campo
              rotulo="Nome de quem recebe"
              maxLength={60}
              placeholder={form.nome}
              ajuda="Como o banco mostra. Vazio = o nome da escola."
              value={form.pixNome ?? ""}
              onChange={(e) => muda("pixNome", e.target.value)}
            />
            <Campo
              rotulo="Cidade de quem recebe"
              maxLength={60}
              placeholder={form.cidade ?? ""}
              ajuda="Vazio = a cidade da escola."
              value={form.pixCidade ?? ""}
              onChange={(e) => muda("pixCidade", e.target.value)}
            />
          </div>
          <div className="mt-4">
            <Campo
              tipo="textarea"
              rows={4}
              maxLength={500}
              rotulo="Dados para transferência"
              placeholder={"Banco do Brasil (001)\nAgência 1234-5\nConta corrente 67890-1\nColégio Exemplo Ltda · CNPJ 12.345.678/0001-90"}
              ajuda="Uma informação por linha. Aparece em “Ou por transferência”."
              value={form.dadosBancarios ?? ""}
              onChange={(e) => muda("dadosBancarios", e.target.value)}
            />
          </div>
        </Secao>

        <Secao icone={Palette} titulo="Visual" texto="O logo aparece no menu do app, nas declarações e no recibo; a cor, nos botões e destaques.">
          <Logo escola={escola} aoMudar={aoMudar} />
          <Cor cor={form.cor} aoMudar={(c) => muda("cor", c)} />
        </Secao>

        {erro && <Erro mensagem={erro} />}
        <div className="flex flex-wrap items-center gap-3">
          <Botao type="submit" carregando={salvando}>
            Salvar alterações
          </Botao>
          {salvo && <span className="text-success text-sm">Salvo.</span>}
        </div>
      </form>

      <Cartao className="border-danger/40 mt-8 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-text flex items-center gap-2 font-semibold">
              <Power className="size-4" aria-hidden />
              {escola.ativa ? "Desativar a escola" : "A escola está desativada"}
            </h2>
            <p className="text-text-secondary mt-1 text-sm">
              {escola.ativa
                ? "Bloqueia a entrada de todos da escola (por exemplo, contrato encerrado). Nada é apagado."
                : "Ninguém da escola consegue entrar. Os dados estão guardados."}
            </p>
          </div>
          <Botao variante={escola.ativa ? "perigo" : "primario"} onClick={alternarAtiva}>
            {escola.ativa ? "Desativar" : "Reativar escola"}
          </Botao>
        </div>
      </Cartao>
    </>
  );
}

function Secao({
  icone: Icone,
  titulo,
  texto,
  children,
}: {
  icone: typeof School;
  titulo: string;
  texto: string;
  children: React.ReactNode;
}) {
  return (
    <Cartao className="p-5">
      <h2 className="text-text flex items-center gap-2 font-semibold">
        <Icone className="text-primary size-4" aria-hidden />
        {titulo}
      </h2>
      <p className="text-text-secondary mt-1 mb-4 text-sm">{texto}</p>
      {children}
    </Cartao>
  );
}

/** Sobe (PNG/JPEG até 300 KB) ou remove o logo; vale na hora. */
function Logo({ escola, aoMudar }: { escola: EscolaCompleta; aoMudar: (e: EscolaCompleta) => void }) {
  const entrada = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function escolher(arquivo: File | undefined) {
    if (!arquivo) return;
    setErro(null);
    if (!["image/png", "image/jpeg"].includes(arquivo.type)) return setErro("Use uma imagem PNG ou JPEG.");
    if (arquivo.size > LOGO_MAXIMO) return setErro("O logo pode ter no máximo 300 KB.");
    setEnviando(true);
    try {
      const imagem = await new Promise<string>((ok, falha) => {
        const leitor = new FileReader();
        leitor.onload = () => ok(String(leitor.result));
        leitor.onerror = () => falha(new Error("Não foi possível ler o arquivo."));
        leitor.readAsDataURL(arquivo);
      });
      aoMudar(await api<EscolaCompleta>(`/plataforma/escolas/${escola.id}/logo`, { method: "PUT", body: { imagem } }));
    } catch (err) {
      setErro((err as Error).message);
    } finally {
      setEnviando(false);
      if (entrada.current) entrada.current.value = "";
    }
  }

  async function remover() {
    setErro(null);
    try {
      aoMudar(await api<EscolaCompleta>(`/plataforma/escolas/${escola.id}/logo`, { method: "DELETE" }));
    } catch (err) {
      setErro((err as Error).message);
    }
  }

  return (
    <div className="mb-5">
      <p className="text-text mb-2 text-sm font-medium">Logo</p>
      <div className="flex flex-wrap items-center gap-3">
        <MarcaDaEscola escola={escola} tamanho="lg" />
        <input
          ref={entrada}
          type="file"
          accept="image/png,image/jpeg"
          className="sr-only"
          id="logo-da-escola"
          onChange={(e) => void escolher(e.target.files?.[0])}
        />
        <Botao type="button" variante="secundario" carregando={enviando} onClick={() => entrada.current?.click()}>
          {!enviando && <ImageUp className="size-4" aria-hidden />}
          {escola.logo ? "Trocar logo" : "Enviar logo"}
        </Botao>
        {escola.logo && (
          <Botao type="button" variante="perigo" onClick={remover}>
            <Trash2 className="size-4" aria-hidden />
            Remover
          </Botao>
        )}
      </div>
      <p className="text-text-muted mt-2 text-xs">PNG ou JPEG, até 300 KB. De preferência com fundo transparente e mais largo que alto.</p>
      {erro && (
        <div className="mt-2">
          <Erro mensagem={erro} />
        </div>
      )}
    </div>
  );
}

/** Cor principal, com prévia de um botão e aviso se o texto branco ficar ilegível. */
function Cor({ cor, aoMudar }: { cor: string | null; aoMudar: (cor: string | null) => void }) {
  const atual = cor ?? COR_PADRAO;
  const legivel = contrasteComBranco(atual) >= 4.5;
  return (
    <div>
      <p className="text-text mb-2 text-sm font-medium">Cor principal</p>
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="color"
          aria-label="Escolher a cor"
          value={atual.toLowerCase()}
          onChange={(e) => aoMudar(e.target.value.toUpperCase())}
          className="border-border h-10 w-14 cursor-pointer rounded-lg border bg-transparent p-1"
        />
        <input
          aria-label="Código da cor"
          value={atual}
          maxLength={7}
          onChange={(e) => {
            const v = e.target.value.trim();
            if (/^#[0-9a-fA-F]{0,6}$/.test(v)) aoMudar(v.length === 7 ? v.toUpperCase() : v);
          }}
          className="bg-surface border-border text-text w-28 rounded-lg border px-3 py-2 font-mono text-sm"
        />
        <span className="rounded-lg px-4 py-2 text-sm font-medium text-white" style={{ background: atual }}>
          Botão de exemplo
        </span>
        {cor && (
          <Botao type="button" variante="fantasma" onClick={() => aoMudar(null)}>
            Voltar à cor do MuralFlow
          </Botao>
        )}
      </div>
      {!legivel && /^#[0-9a-fA-F]{6}$/.test(atual) && (
        <p className="text-warning mt-2 text-xs">
          Cor clara demais: o texto branco dos botões fica difícil de ler. Prefira um tom mais escuro.
        </p>
      )}
      {!cor && <p className="text-text-muted mt-2 text-xs">Sem cor própria: a escola usa a cor do MuralFlow.</p>}
      <p className="text-text-muted mt-2 flex items-center gap-1 text-xs">
        <Landmark className="size-3" aria-hidden />A cor vale para todos da escola assim que você salvar.
      </p>
    </div>
  );
}
