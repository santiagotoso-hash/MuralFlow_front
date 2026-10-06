"use client";

import { Check, Megaphone, PenSquare, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useSessao } from "@/components/AuthProvider";
import { Botao, Cabecalho, Carregando, Cartao, Erro, Etiqueta, Vazio } from "@/components/ui";
import { api } from "@/lib/api";
import { dataHora, NOME_CATEGORIA } from "@/lib/formatar";
import type { Comunicado } from "@/lib/tipos";
import { useApi } from "@/lib/use-api";

export default function Comunicados() {
  const { usuario } = useSessao();
  const { dados, erro, carregando, setDados } = useApi<Comunicado[]>("/comunicados");
  const [filtro, setFiltro] = useState<"todos" | "pendentes">("todos");
  const [acaoErro, setAcaoErro] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState<string | null>(null);

  if (!usuario) return null;
  const familia = usuario.papel === "responsavel";
  const pendentes = (dados ?? []).filter((c) => c.exigeCiencia && !c.ciente);
  const lista = filtro === "pendentes" ? pendentes : (dados ?? []);

  async function confirmar(id: string) {
    setConfirmando(id);
    setAcaoErro(null);
    try {
      await api(`/comunicados/${id}/ciencia`, { method: "POST" });
      setDados((atual) => atual?.map((c) => (c.id === id ? { ...c, ciente: true } : c)) ?? null);
    } catch (e) {
      setAcaoErro((e as Error).message);
    } finally {
      setConfirmando(null);
    }
  }

  async function remover(c: Comunicado) {
    if (!window.confirm(`Remover o comunicado "${c.titulo}"?`)) return;
    setAcaoErro(null);
    try {
      await api(`/comunicados/${c.id}`, { method: "DELETE" });
      setDados((atual) => atual?.filter((x) => x.id !== c.id) ?? null);
    } catch (e) {
      setAcaoErro((e as Error).message);
    }
  }

  return (
    <>
      <Cabecalho
        titulo="Comunicados"
        descricao={familia ? "Avisos da escola e das turmas dos seus filhos." : "Avisos publicados para as famílias."}
        acao={
          !familia && (
            <Link
              href="/comunicados/novo"
              className="bg-primary-solid hover:bg-primary-solid-hover inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white"
            >
              <PenSquare className="size-4" aria-hidden />
              Novo comunicado
            </Link>
          )
        }
      />

      {familia && (
        <div className="mb-4 flex gap-2" role="group" aria-label="Filtrar comunicados">
          {(["todos", "pendentes"] as const).map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={filtro === f}
              onClick={() => setFiltro(f)}
              className={`cursor-pointer rounded-full px-3 py-1.5 text-sm font-medium ${
                filtro === f ? "bg-primary-solid text-white" : "bg-surface border-border text-text-secondary border"
              }`}
            >
              {f === "todos" ? "Todos" : `Aguardando ciência (${pendentes.length})`}
            </button>
          ))}
        </div>
      )}

      {erro && <Erro mensagem={erro} />}
      {acaoErro && <div className="mb-4"><Erro mensagem={acaoErro} /></div>}
      {carregando && <Carregando />}

      {dados && lista.length === 0 && (
        <Cartao>
          <Vazio
            icone={Megaphone}
            titulo={filtro === "pendentes" ? "Tudo em dia!" : "Nenhum comunicado ainda"}
            texto={filtro === "pendentes" ? "Você já confirmou todos os comunicados." : undefined}
          />
        </Cartao>
      )}

      <div className="space-y-4">
        {lista.map((c) => {
          const podeRemover = usuario.papel === "admin" || c.autor?.id === usuario.id;
          const pct = c.totalDestinatarios ? Math.round(((c.totalCiencias ?? 0) / c.totalDestinatarios) * 100) : 0;
          return (
            <Cartao key={c.id} id={c.id} className="scroll-mt-24 p-5">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <Etiqueta tom={c.categoria === "urgente" ? "perigo" : "primario"}>
                  {NOME_CATEGORIA[c.categoria]}
                </Etiqueta>
                <Etiqueta>{c.turma ? c.turma.nome : "Escola inteira"}</Etiqueta>
                <span className="text-text-muted">
                  {c.autor?.nome ?? "Escola"} · {dataHora(c.publicadoEm)}
                </span>
              </div>
              <h2 className="text-text mt-3 text-lg font-semibold">{c.titulo}</h2>
              <p className="text-text-secondary mt-2 text-sm whitespace-pre-line">{c.conteudo}</p>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                {familia && c.exigeCiencia &&
                  (c.ciente ? (
                    <span className="bg-success-subtle text-success inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium">
                      <Check className="size-4" aria-hidden />
                      Ciente
                    </span>
                  ) : (
                    <Botao onClick={() => confirmar(c.id)} carregando={confirmando === c.id}>
                      <Check className="size-4" aria-hidden />
                      Estou ciente
                    </Botao>
                  ))}

                {!familia && c.exigeCiencia && (
                  <div className="w-full max-w-xs">
                    <p className="text-text-secondary mb-1 text-xs">
                      {c.totalCiencias} de {c.totalDestinatarios} famílias confirmaram
                    </p>
                    <div className="bg-bg h-2 overflow-hidden rounded-full" aria-hidden>
                      <div className="bg-primary-solid h-full rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )}

                {!familia && podeRemover && (
                  <Botao variante="perigo" onClick={() => remover(c)} className="ml-auto">
                    <Trash2 className="size-4" aria-hidden />
                    Remover
                  </Botao>
                )}
              </div>
            </Cartao>
          );
        })}
      </div>
    </>
  );
}
