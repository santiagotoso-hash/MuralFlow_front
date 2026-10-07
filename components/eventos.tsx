"use client";

import { BookOpen, Clock, MapPin, Trash2, X } from "lucide-react";
import { useState } from "react";
import { useConfirmar } from "@/components/Confirmacao";
import { Botao, Campo, Cartao, Erro, Etiqueta } from "@/components/ui";
import { api } from "@/lib/api";
import { dataHora, hora, localParaIso, NOME_TIPO_EVENTO, TOM_TIPO_EVENTO } from "@/lib/formatar";
import type { Disciplinas, Evento, TipoEvento, Turma } from "@/lib/tipos";
import { useApi } from "@/lib/use-api";

/** Um evento da agenda (usado na lista, no calendário e em Provas). */
export function CartaoEvento({
  evento: e,
  aoRemover,
  rotuloHora,
  extra,
}: {
  evento: Evento;
  aoRemover?: (e: Evento) => void;
  /** Texto na coluna da esquerda; padrão: a hora de início. */
  rotuloHora?: string;
  /** Etiqueta adicional (ex.: "em 3 dias"). */
  extra?: React.ReactNode;
}) {
  return (
    <Cartao className="flex gap-4 p-4">
      <div className="text-primary w-14 shrink-0 pt-0.5 text-sm font-semibold">{rotuloHora ?? hora(e.inicio)}</div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-text font-semibold">{e.titulo}</h3>
          <Etiqueta tom={TOM_TIPO_EVENTO[e.tipo]}>{e.disciplina ?? NOME_TIPO_EVENTO[e.tipo]}</Etiqueta>
          <Etiqueta>{e.turma ? e.turma.nome : "Escola inteira"}</Etiqueta>
          {extra}
        </div>
        {e.descricao && (
          <p className="text-text-secondary mt-1 text-sm">
            {e.tipo === "prova" && <BookOpen className="text-text-muted mr-1 inline size-3.5 align-[-2px]" aria-label="Conteúdo:" />}
            {e.descricao}
          </p>
        )}
        {(e.fim || e.local) && (
          <div className="text-text-muted mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
            {e.fim && (
              <span className="inline-flex items-center gap-1">
                <Clock className="size-3.5" aria-hidden />
                até {hora(e.fim)}
              </span>
            )}
            {e.local && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3.5" aria-hidden />
                {e.local}
              </span>
            )}
          </div>
        )}
      </div>
      {aoRemover && (
        <button
          type="button"
          onClick={() => aoRemover(e)}
          aria-label={`Remover ${e.titulo}`}
          className="text-text-muted hover:text-danger h-fit cursor-pointer rounded-lg p-2"
        >
          <Trash2 className="size-4" />
        </button>
      )}
    </Cartao>
  );
}

/** Pede aceitação e remove; devolve true se removeu. */
export async function removerEvento(e: Evento, aceitar: ReturnType<typeof useConfirmar>) {
  const ok = await aceitar({
    titulo: e.tipo === "prova" ? "Remover esta prova?" : "Remover este evento?",
    mensagem: <>“{e.titulo}” ({dataHora(e.inicio)}) sai da agenda de todos. Isso não pode ser desfeito.</>,
    confirmar: "Remover",
    perigo: true,
  });
  if (!ok) return false;
  await api(`/eventos/${e.id}`, { method: "DELETE" });
  return true;
}

/**
 * Formulário de evento. `soProva`: o tipo fica fixo em prova, o título é
 * opcional ("Prova de <disciplina>") e a descrição vira o conteúdo.
 */
export function NovoEvento({
  admin,
  soProva = false,
  aoFechar,
  aoCriar,
}: {
  admin: boolean;
  soProva?: boolean;
  aoFechar: () => void;
  aoCriar: () => void;
}) {
  const turmas = useApi<Turma[]>("/turmas");
  const disciplinas = useApi<Disciplinas>("/boletim/disciplinas");
  const [form, setForm] = useState({
    titulo: "",
    tipo: (soProva ? "prova" : "reuniao") as TipoEvento,
    disciplina: "",
    inicio: "",
    fim: "",
    local: "",
    descricao: "",
    turmaId: "",
  });
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const aceitar = useConfirmar();
  const campo = (nome: keyof typeof form) => ({
    value: form[nome],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [nome]: e.target.value })),
  });
  // Prova é sempre de uma turma; o resto pode ser da escola inteira (admin).
  const escolaInteira = admin && form.tipo !== "prova";
  const turmaId = form.turmaId || (escolaInteira ? "" : (turmas.dados?.[0]?.id ?? ""));
  const prova = form.tipo === "prova";

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    const titulo = form.titulo || (prova ? `Prova de ${form.disciplina}` : "");
    const turma = turmas.dados?.find((t) => t.id === turmaId);
    const ok = await aceitar({
      titulo: prova ? "Salvar a prova?" : "Salvar o evento?",
      mensagem: (
        <>
          <strong>{titulo}</strong> em {dataHora(localParaIso(form.inicio))}, para {turma ? turma.nome : "a escola inteira"}.
        </>
      ),
      confirmar: "Salvar",
    });
    if (!ok) return;
    setErro(null);
    setEnviando(true);
    try {
      await api("/eventos", {
        method: "POST",
        body: {
          titulo: form.titulo || (prova ? `Prova de ${form.disciplina}` : ""),
          tipo: form.tipo,
          disciplina: prova ? form.disciplina : undefined,
          inicio: localParaIso(form.inicio),
          fim: form.fim ? localParaIso(form.fim) : undefined,
          local: form.local || undefined,
          descricao: form.descricao || undefined,
          turmaId: turmaId || undefined,
        },
      });
      aoCriar();
    } catch (err) {
      setErro((err as Error).message);
      setEnviando(false);
    }
  }

  return (
    <Cartao className="surgir mb-8 p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-text font-semibold">{soProva ? "Nova prova" : "Novo evento"}</h2>
        <button type="button" onClick={aoFechar} aria-label="Fechar" className="text-text-muted hover:text-text cursor-pointer rounded-lg p-1">
          <X className="size-5" />
        </button>
      </div>
      <form onSubmit={salvar} className="grid gap-4 sm:grid-cols-2">
        {!soProva && (
          <Campo tipo="select" rotulo="Tipo" {...campo("tipo")}>
            {Object.entries(NOME_TIPO_EVENTO).map(([v, n]) => (
              <option key={v} value={v}>
                {n}
              </option>
            ))}
          </Campo>
        )}
        {prova && (
          <Campo tipo="select" rotulo="Disciplina" required {...campo("disciplina")}>
            <option value="" disabled>
              Escolha…
            </option>
            {disciplinas.dados?.disciplinas.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </Campo>
        )}
        <Campo tipo="select" rotulo={prova ? "Turma" : "Para quem"} {...campo("turmaId")} value={turmaId}>
          {escolaInteira && <option value="">Escola inteira</option>}
          {turmas.dados?.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nome}
            </option>
          ))}
        </Campo>
        <div className={soProva ? "" : "sm:col-span-2"}>
          <Campo
            rotulo={prova ? "Título (opcional)" : "Título"}
            required={!prova}
            placeholder={prova && form.disciplina ? `Prova de ${form.disciplina}` : undefined}
            {...campo("titulo")}
          />
        </div>
        <Campo rotulo={prova ? "Data e hora" : "Início"} type="datetime-local" required {...campo("inicio")} />
        {!prova && <Campo rotulo="Término (opcional)" type="datetime-local" {...campo("fim")} />}
        {!prova && (
          <div className="sm:col-span-2">
            <Campo rotulo="Local (opcional)" {...campo("local")} />
          </div>
        )}
        <div className="sm:col-span-2">
          <Campo
            tipo="textarea"
            rotulo={prova ? "Conteúdo da prova" : "Descrição (opcional)"}
            required={prova}
            placeholder={prova ? "Ex.: frações e números decimais (capítulos 4 e 5)" : undefined}
            rows={3}
            {...campo("descricao")}
          />
        </div>
        {erro && (
          <div className="sm:col-span-2">
            <Erro mensagem={erro} />
          </div>
        )}
        <div className="sm:col-span-2">
          <Botao type="submit" carregando={enviando}>
            {prova ? "Salvar prova" : "Salvar evento"}
          </Botao>
        </div>
      </form>
    </Cartao>
  );
}
