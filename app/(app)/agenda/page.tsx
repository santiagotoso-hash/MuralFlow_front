"use client";

import { CalendarDays, Clock, MapPin, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { useSessao } from "@/components/AuthProvider";
import { Botao, Cabecalho, Campo, Carregando, Cartao, Erro, Etiqueta, Vazio } from "@/components/ui";
import { api } from "@/lib/api";
import { diaDaSemana, hora, localParaIso, NOME_TIPO_EVENTO } from "@/lib/formatar";
import type { Evento, TipoEvento, Turma } from "@/lib/tipos";
import { useApi } from "@/lib/use-api";

const TOM_TIPO: Record<TipoEvento, "primario" | "alerta" | "perigo" | "sucesso" | "neutro"> = {
  reuniao: "primario",
  prova: "alerta",
  passeio: "sucesso",
  feriado: "perigo",
  festa: "sucesso",
  outro: "neutro",
};

/** Agrupa por dia (no fuso de Brasília), mantendo a ordem cronológica. */
function porDia(eventos: Evento[]) {
  const grupos = new Map<string, Evento[]>();
  for (const e of eventos) {
    const dia = diaDaSemana(e.inicio);
    grupos.set(dia, [...(grupos.get(dia) ?? []), e]);
  }
  return [...grupos.entries()];
}

export default function Agenda() {
  const { usuario } = useSessao();
  const { dados, erro, carregando, recarregar, setDados } = useApi<Evento[]>("/eventos");
  const [criando, setCriando] = useState(false);
  const [acaoErro, setAcaoErro] = useState<string | null>(null);

  if (!usuario) return null;
  const equipe = usuario.papel !== "responsavel";

  async function remover(e: Evento) {
    if (!window.confirm(`Remover "${e.titulo}" da agenda?`)) return;
    try {
      await api(`/eventos/${e.id}`, { method: "DELETE" });
      setDados((atual) => atual?.filter((x) => x.id !== e.id) ?? null);
    } catch (err) {
      setAcaoErro((err as Error).message);
    }
  }

  return (
    <>
      <Cabecalho
        titulo="Agenda"
        descricao="Reuniões, provas, passeios e datas importantes."
        acao={
          equipe &&
          !criando && (
            <Botao onClick={() => setCriando(true)}>
              <Plus className="size-4" aria-hidden />
              Novo evento
            </Botao>
          )
        }
      />

      {criando && (
        <NovoEvento
          admin={usuario.papel === "admin"}
          aoFechar={() => setCriando(false)}
          aoCriar={() => {
            setCriando(false);
            recarregar();
          }}
        />
      )}

      {erro && <Erro mensagem={erro} />}
      {acaoErro && <div className="mb-4"><Erro mensagem={acaoErro} /></div>}
      {carregando && <Carregando />}
      {dados?.length === 0 && (
        <Cartao>
          <Vazio icone={CalendarDays} titulo="Nada marcado por enquanto" />
        </Cartao>
      )}

      <div className="space-y-8">
        {porDia(dados ?? []).map(([dia, eventos]) => (
          <section key={dia}>
            <h2 className="text-text-secondary mb-3 text-sm font-semibold first-letter:uppercase">{dia}</h2>
            <div className="space-y-3">
              {eventos.map((e) => (
                <Cartao key={e.id} className="flex gap-4 p-4">
                  <div className="text-primary w-14 shrink-0 pt-0.5 text-sm font-semibold">{hora(e.inicio)}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-text font-semibold">{e.titulo}</h3>
                      <Etiqueta tom={TOM_TIPO[e.tipo]}>{NOME_TIPO_EVENTO[e.tipo]}</Etiqueta>
                      <Etiqueta>{e.turma ? e.turma.nome : "Escola inteira"}</Etiqueta>
                    </div>
                    {e.descricao && <p className="text-text-secondary mt-1 text-sm">{e.descricao}</p>}
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
                  </div>
                  {equipe && (
                    <button
                      type="button"
                      onClick={() => remover(e)}
                      aria-label={`Remover ${e.titulo}`}
                      className="text-text-muted hover:text-danger h-fit cursor-pointer rounded-lg p-2"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </Cartao>
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}

function NovoEvento({
  admin,
  aoFechar,
  aoCriar,
}: {
  admin: boolean;
  aoFechar: () => void;
  aoCriar: () => void;
}) {
  const turmas = useApi<Turma[]>("/turmas");
  const [form, setForm] = useState({
    titulo: "",
    tipo: "reuniao" as TipoEvento,
    inicio: "",
    fim: "",
    local: "",
    descricao: "",
    turmaId: "",
  });
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const campo = (nome: keyof typeof form) => ({
    value: form[nome],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [nome]: e.target.value })),
  });
  const turmaId = form.turmaId || (admin ? "" : (turmas.dados?.[0]?.id ?? ""));

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      await api("/eventos", {
        method: "POST",
        body: {
          titulo: form.titulo,
          tipo: form.tipo,
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
        <h2 className="text-text font-semibold">Novo evento</h2>
        <button type="button" onClick={aoFechar} aria-label="Fechar" className="text-text-muted hover:text-text cursor-pointer rounded-lg p-1">
          <X className="size-5" />
        </button>
      </div>
      <form onSubmit={salvar} className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Campo rotulo="Título" required {...campo("titulo")} />
        </div>
        <Campo tipo="select" rotulo="Tipo" {...campo("tipo")}>
          {Object.entries(NOME_TIPO_EVENTO).map(([v, n]) => (
            <option key={v} value={v}>
              {n}
            </option>
          ))}
        </Campo>
        <Campo tipo="select" rotulo="Para quem" {...campo("turmaId")} value={turmaId}>
          {admin && <option value="">Escola inteira</option>}
          {turmas.dados?.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nome}
            </option>
          ))}
        </Campo>
        <Campo rotulo="Início" type="datetime-local" required {...campo("inicio")} />
        <Campo rotulo="Término (opcional)" type="datetime-local" {...campo("fim")} />
        <div className="sm:col-span-2">
          <Campo rotulo="Local (opcional)" {...campo("local")} />
        </div>
        <div className="sm:col-span-2">
          <Campo tipo="textarea" rotulo="Descrição (opcional)" rows={3} {...campo("descricao")} />
        </div>
        {erro && (
          <div className="sm:col-span-2">
            <Erro mensagem={erro} />
          </div>
        )}
        <div className="sm:col-span-2">
          <Botao type="submit" carregando={enviando}>
            Salvar evento
          </Botao>
        </div>
      </form>
    </Cartao>
  );
}
