"use client";

import { ArrowLeft, MessageCircle, Plus, Send, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useSessao } from "@/components/AuthProvider";
import { useConfirmar } from "@/components/Confirmacao";
import { Avatar, Botao, Cabecalho, Campo, Carregando, Cartao, Erro, Vazio } from "@/components/ui";
import { api } from "@/lib/api";
import { hora, tempoRelativo } from "@/lib/formatar";
import type { Aluno, Conversa, Mensagem, Usuario } from "@/lib/tipos";
import { useApi } from "@/lib/use-api";

/** Sem WebSocket por enquanto: a conversa aberta se atualiza a cada 15 s. */
const INTERVALO_ATUALIZACAO = 15_000;

export default function Mensagens() {
  const { usuario } = useSessao();
  const conversas = useApi<Conversa[]>("/conversas");
  const [abertaId, setAbertaId] = useState<string | null>(null);
  const [criando, setCriando] = useState(false);

  if (!usuario) return null;
  const familia = usuario.papel === "responsavel";
  const outroLado = (c: Conversa) => (familia ? `${c.aluno.turma?.nome ?? "Escola"}` : c.responsavel.nome);

  return (
    <>
      <Cabecalho
        titulo="Mensagens"
        descricao={familia ? "Converse com os professores e a direção." : "Conversas com as famílias."}
        acao={
          !criando && (
            <Botao
              onClick={() => {
                setCriando(true);
                setAbertaId(null);
              }}
            >
              <Plus className="size-4" aria-hidden />
              Nova conversa
            </Botao>
          )
        }
      />
      {conversas.erro && <Erro mensagem={conversas.erro} />}

      <Cartao className="grid min-h-[32rem] overflow-hidden md:grid-cols-[18rem_1fr]">
        {/* Lista — no celular some quando há uma conversa aberta. */}
        <ul className={`border-border divide-border divide-y md:border-r ${abertaId || criando ? "hidden md:block" : ""}`}>
          {conversas.carregando && <li className="px-4"><Carregando /></li>}
          {conversas.dados?.length === 0 && (
            <li className="text-text-muted px-4 py-6 text-sm">Nenhuma conversa ainda.</li>
          )}
          {conversas.dados?.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => {
                  setAbertaId(c.id);
                  setCriando(false);
                  // Abrir marca como lida no servidor; reflete na lista na hora.
                  conversas.setDados((l) => l?.map((x) => (x.id === c.id ? { ...x, naoLida: false } : x)) ?? null);
                }}
                className={`flex w-full cursor-pointer items-start gap-3 px-4 py-3 text-left ${
                  abertaId === c.id ? "bg-primary-subtle" : "hover:bg-bg"
                }`}
              >
                <Avatar nome={familia ? c.aluno.nome : c.responsavel.nome} tamanho="sm" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className={`text-text truncate text-sm ${c.naoLida ? "font-bold" : "font-medium"}`}>{c.assunto}</p>
                    <span className="text-text-muted shrink-0 text-[11px]">{tempoRelativo(c.ultimaMensagemEm)}</span>
                  </div>
                  <p className="text-text-muted truncate text-xs">
                    {c.aluno.nome} · {outroLado(c)}
                  </p>
                </div>
                {c.naoLida && <span className="bg-primary-solid mt-1.5 size-2 shrink-0 rounded-full" aria-label="Não lida" />}
              </button>
            </li>
          ))}
        </ul>

        <div className={`flex min-h-0 flex-col ${!abertaId && !criando ? "hidden md:flex" : ""}`}>
          {criando ? (
            <NovaConversa
              familia={familia}
              aoFechar={() => setCriando(false)}
              aoCriar={(c) => {
                setCriando(false);
                setAbertaId(c.id);
                conversas.recarregar();
              }}
            />
          ) : abertaId ? (
            <ConversaAberta
              key={abertaId}
              id={abertaId}
              eu={usuario}
              aoVoltar={() => setAbertaId(null)}
              aoEnviar={conversas.recarregar}
            />
          ) : (
            <div className="flex flex-1 items-center justify-center">
              <Vazio icone={MessageCircle} titulo="Escolha uma conversa" texto="Ou comece uma nova para falar sobre um aluno." />
            </div>
          )}
        </div>
      </Cartao>
    </>
  );
}

function ConversaAberta({
  id,
  eu,
  aoVoltar,
  aoEnviar,
}: {
  id: string;
  eu: Usuario;
  aoVoltar: () => void;
  aoEnviar: () => void;
}) {
  const { dados, erro, recarregar, setDados } = useApi<Conversa & { mensagens: Mensagem[] }>(`/conversas/${id}`);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erroEnvio, setErroEnvio] = useState<string | null>(null);
  const fimRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setInterval(recarregar, INTERVALO_ATUALIZACAO);
    return () => clearInterval(t);
  }, [recarregar]);

  const total = dados?.mensagens.length ?? 0;
  useEffect(() => {
    fimRef.current?.scrollIntoView({ block: "end" });
  }, [total]);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!texto.trim()) return;
    setEnviando(true);
    setErroEnvio(null);
    try {
      const nova = await api<Mensagem>(`/conversas/${id}/mensagens`, { method: "POST", body: { texto } });
      setDados((c) => (c ? { ...c, mensagens: [...c.mensagens, nova] } : c));
      setTexto("");
      aoEnviar();
    } catch (err) {
      setErroEnvio((err as Error).message);
    } finally {
      setEnviando(false);
    }
  }

  if (erro) return <div className="p-4"><Erro mensagem={erro} /></div>;
  if (!dados) return <div className="px-4"><Carregando /></div>;

  return (
    <>
      <div className="border-border flex items-center gap-3 border-b px-4 py-3">
        <button type="button" onClick={aoVoltar} aria-label="Voltar" className="text-text-muted cursor-pointer rounded-lg p-1 md:hidden">
          <ArrowLeft className="size-5" />
        </button>
        <div className="min-w-0">
          <p className="text-text truncate font-semibold">{dados.assunto}</p>
          <p className="text-text-muted truncate text-xs">
            {dados.aluno.nome} · {dados.aluno.turma?.nome ?? "sem turma"} · Responsável: {dados.responsavel.nome}
          </p>
        </div>
      </div>

      <div className="bg-bg flex max-h-[28rem] flex-1 flex-col gap-3 overflow-y-auto p-4">
        {dados.mensagens.map((m) => {
          const minha = m.autor?.id === eu.id;
          return (
            <div key={m.id} className={`max-w-[80%] ${minha ? "ml-auto text-right" : ""}`}>
              {!minha && (
                <p className="text-text-muted mb-1 text-xs">
                  {m.automatica ? "Escola · mensagem automática" : (m.autor?.nome ?? "Usuário removido")}
                </p>
              )}
              <p
                className={`inline-block rounded-2xl px-3 py-2 text-left text-sm whitespace-pre-line ${
                  minha ? "bg-primary-solid rounded-tr-sm text-white" : "bg-surface border-border text-text rounded-tl-sm border"
                }`}
              >
                {m.texto}
              </p>
              <p className="text-text-muted mt-1 text-[11px]">{hora(m.enviadaEm)}</p>
            </div>
          );
        })}
        <div ref={fimRef} />
      </div>

      <form onSubmit={enviar} className="border-border flex items-end gap-2 border-t p-3">
        <label htmlFor="nova-mensagem" className="sr-only">
          Mensagem
        </label>
        <textarea
          id="nova-mensagem"
          rows={1}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }
          }}
          placeholder="Escreva uma mensagem..."
          className="bg-surface border-border text-text placeholder:text-text-muted max-h-32 flex-1 resize-none rounded-lg border px-3 py-2 text-sm"
        />
        <Botao type="submit" carregando={enviando} aria-label="Enviar" className="px-3">
          {!enviando && <Send className="size-4" aria-hidden />}
        </Botao>
      </form>
      {erroEnvio && <div className="px-3 pb-3"><Erro mensagem={erroEnvio} /></div>}
    </>
  );
}

function NovaConversa({
  familia,
  aoFechar,
  aoCriar,
}: {
  familia: boolean;
  aoFechar: () => void;
  aoCriar: (c: Conversa) => void;
}) {
  const alunos = useApi<Aluno[]>("/alunos");
  const [alunoId, setAlunoId] = useState("");
  const [responsavelId, setResponsavelId] = useState("");
  const [assunto, setAssunto] = useState("");
  const [texto, setTexto] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const aceitar = useConfirmar();

  const alunoEscolhido = alunoId || alunos.dados?.[0]?.id || "";
  const aluno = alunos.dados?.find((a) => a.id === alunoEscolhido);
  const responsavelEscolhido = responsavelId || aluno?.responsaveis?.[0]?.id || "";

  async function iniciar(e: React.FormEvent) {
    e.preventDefault();
    const responsavel = aluno?.responsaveis?.find((r) => r.id === responsavelEscolhido);
    const ok = await aceitar({
      titulo: "Enviar a mensagem?",
      mensagem: (
        <>
          <strong>{assunto}</strong>, sobre {aluno?.nome ?? "o aluno"}
          {familia ? ", para os professores da turma" : responsavel ? `, para ${responsavel.nome}` : ""}.
        </>
      ),
      confirmar: "Enviar",
    });
    if (!ok) return;
    setErro(null);
    setEnviando(true);
    try {
      const c = await api<Conversa>("/conversas", {
        method: "POST",
        body: {
          alunoId: alunoEscolhido,
          assunto,
          texto,
          responsavelId: familia ? undefined : responsavelEscolhido || undefined,
        },
      });
      aoCriar(c);
    } catch (err) {
      setErro((err as Error).message);
      setEnviando(false);
    }
  }

  return (
    <div className="surgir p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-text font-semibold">Nova conversa</h2>
        <button type="button" onClick={aoFechar} aria-label="Fechar" className="text-text-muted hover:text-text cursor-pointer rounded-lg p-1">
          <X className="size-5" />
        </button>
      </div>
      {alunos.dados?.length === 0 ? (
        <p className="text-text-muted text-sm">Nenhum aluno vinculado a você ainda.</p>
      ) : (
        <form onSubmit={iniciar} className="space-y-4">
          <Campo
            tipo="select"
            rotulo="Sobre qual aluno"
            value={alunoEscolhido}
            onChange={(e) => {
              setAlunoId(e.target.value);
              setResponsavelId("");
            }}
          >
            {alunos.dados?.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nome} {a.turma ? `(${a.turma.nome})` : ""}
              </option>
            ))}
          </Campo>
          {!familia && (
            <Campo
              tipo="select"
              rotulo="Para qual responsável"
              value={responsavelEscolhido}
              onChange={(e) => setResponsavelId(e.target.value)}
            >
              {aluno?.responsaveis?.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nome}
                </option>
              ))}
            </Campo>
          )}
          <Campo rotulo="Assunto" required maxLength={150} value={assunto} onChange={(e) => setAssunto(e.target.value)} />
          <Campo tipo="textarea" rotulo="Mensagem" required rows={4} value={texto} onChange={(e) => setTexto(e.target.value)} />
          {erro && <Erro mensagem={erro} />}
          <Botao type="submit" carregando={enviando}>
            <Send className="size-4" aria-hidden />
            Enviar
          </Botao>
        </form>
      )}
    </div>
  );
}
