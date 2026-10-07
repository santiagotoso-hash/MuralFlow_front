"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { CartaoEvento } from "@/components/eventos";
import { Cartao, Erro, Etiqueta, TONS } from "@/components/ui";
import { feriadosNacionais } from "@/lib/feriados";
import { chaveDia, NOME_TIPO_EVENTO, TOM_TIPO_EVENTO } from "@/lib/formatar";
import type { Evento } from "@/lib/tipos";
import { useApi } from "@/lib/use-api";

const SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const DIA = 86_400_000;

/** Bolinha (celular) de cada tom de etiqueta. */
const PONTO: Record<keyof typeof TONS, string> = {
  primario: "bg-primary",
  info: "bg-info",
  alerta: "bg-warning",
  perigo: "bg-danger",
  sucesso: "bg-success",
  neutro: "bg-text-muted",
};

type Item =
  | { tipo: "evento"; evento: Evento }
  | { tipo: "feriado"; nome: string };

const chaveUtc = (utc: number) => new Date(utc).toISOString().slice(0, 10);
const utcDaChave = (chave: string) => Date.parse(`${chave}T00:00:00Z`);

/** Visão mensal com todos os eventos (provas, feriados, reuniões…). */
export function Calendario({
  versao,
  aoRemover,
}: {
  /** Muda quando a lista de eventos mudou (criou/removeu) e precisa recarregar. */
  versao: number;
  aoRemover?: (e: Evento) => void;
}) {
  const hoje = chaveDia(new Date().toISOString());
  const [mes, setMes] = useState(() => hoje.slice(0, 7)); // "2026-10"
  const [selecionado, setSelecionado] = useState(hoje);

  // Semanas completas (domingo a sábado) que cobrem o mês.
  const dias = useMemo(() => {
    const [a, m] = mes.split("-").map(Number);
    const primeiro = Date.UTC(a, m - 1, 1);
    const inicio = primeiro - new Date(primeiro).getUTCDay() * DIA;
    const ultimo = Date.UTC(a, m, 0);
    const fim = ultimo + (6 - new Date(ultimo).getUTCDay()) * DIA;
    const lista: string[] = [];
    for (let t = inicio; t <= fim; t += DIA) lista.push(chaveUtc(t));
    return lista;
  }, [mes]);

  const de = new Date(`${dias[0]}T00:00:00-03:00`).toISOString();
  const ate = new Date(`${dias.at(-1)}T23:59:59-03:00`).toISOString();
  const eventos = useApi<Evento[]>(`/eventos?de=${encodeURIComponent(de)}&ate=${encodeURIComponent(ate)}`);
  const { recarregar } = eventos;
  useEffect(() => {
    if (versao) recarregar();
  }, [versao, recarregar]);

  const porDia = useMemo(() => {
    const mapa = new Map<string, Item[]>();
    const add = (chave: string, item: Item) => mapa.set(chave, [...(mapa.get(chave) ?? []), item]);
    const anos = new Set(dias.map((d) => Number(d.slice(0, 4))));
    for (const ano of anos) {
      for (const [chave, nome] of feriadosNacionais(ano)) add(chave, { tipo: "feriado", nome });
    }
    for (const e of eventos.dados ?? []) {
      // Evento de vários dias aparece em cada um deles (máx. 31).
      const ini = utcDaChave(chaveDia(e.inicio));
      const fim = e.fim ? Math.min(utcDaChave(chaveDia(e.fim)), ini + 30 * DIA) : ini;
      for (let t = ini; t <= fim; t += DIA) add(chaveUtc(t), { tipo: "evento", evento: e });
    }
    return mapa;
  }, [eventos.dados, dias]);

  function mudarMes(delta: number) {
    const [a, m] = mes.split("-").map(Number);
    const novo = chaveUtc(Date.UTC(a, m - 1 + delta, 1)).slice(0, 7);
    setMes(novo);
    setSelecionado(hoje.startsWith(novo) ? hoje : `${novo}-01`);
  }

  const tituloMes = new Date(`${mes}-15T12:00:00Z`).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  const tituloDia = (chave: string) =>
    new Date(`${chave}T12:00:00Z`).toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      timeZone: "UTC",
    });
  const doDia = porDia.get(selecionado) ?? [];

  return (
    <div className="space-y-6">
      <Cartao className="p-3 sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="text-text text-lg font-semibold first-letter:uppercase">{tituloMes}</h2>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                setMes(hoje.slice(0, 7));
                setSelecionado(hoje);
              }}
              className="border-border text-text-secondary hover:text-text mr-1 cursor-pointer rounded-lg border px-3 py-1.5 text-sm"
            >
              Hoje
            </button>
            <button type="button" onClick={() => mudarMes(-1)} aria-label="Mês anterior" className="text-text-secondary hover:text-text hover:bg-bg cursor-pointer rounded-lg p-2">
              <ChevronLeft className="size-5" />
            </button>
            <button type="button" onClick={() => mudarMes(1)} aria-label="Próximo mês" className="text-text-secondary hover:text-text hover:bg-bg cursor-pointer rounded-lg p-2">
              <ChevronRight className="size-5" />
            </button>
          </div>
        </div>

        {eventos.erro && <Erro mensagem={eventos.erro} />}

        <div className="grid grid-cols-7 gap-px" role="group" aria-label={`Dias de ${tituloMes}`}>
          {SEMANA.map((d) => (
            <div key={d} aria-hidden className="text-text-muted pb-2 text-center text-xs font-medium">
              {d}
            </div>
          ))}
          {dias.map((chave) => {
            const itens = porDia.get(chave) ?? [];
            const foraDoMes = !chave.startsWith(mes);
            const ehHoje = chave === hoje;
            const ativo = chave === selecionado;
            const tom = (i: Item) => (i.tipo === "feriado" ? "perigo" : TOM_TIPO_EVENTO[i.evento.tipo]);
            const rotulo = (i: Item) => (i.tipo === "feriado" ? i.nome : i.evento.titulo);
            return (
              <button
                key={chave}
                type="button"
                onClick={() => setSelecionado(chave)}
                aria-pressed={ativo}
                aria-label={`${tituloDia(chave)}${itens.length ? `, ${itens.length} ${itens.length === 1 ? "item" : "itens"}` : ""}`}
                className={`flex min-h-14 cursor-pointer flex-col items-stretch rounded-lg p-1 text-left transition-colors sm:min-h-24 sm:p-1.5 ${
                  ativo ? "bg-primary-subtle ring-primary ring-1" : "hover:bg-bg"
                } ${foraDoMes ? "opacity-45" : ""}`}
              >
                <span
                  className={`mx-auto inline-flex size-7 items-center justify-center rounded-full text-sm sm:mx-0 ${
                    ehHoje ? "bg-primary-solid font-semibold text-white" : "text-text"
                  }`}
                >
                  {Number(chave.slice(8))}
                </span>
                {/* Celular: bolinhas */}
                <span className="mt-1 flex justify-center gap-0.5 sm:hidden" aria-hidden>
                  {itens.slice(0, 3).map((i, n) => (
                    <span key={n} className={`size-1.5 rounded-full ${PONTO[tom(i)]}`} />
                  ))}
                </span>
                {/* Telas maiores: títulos */}
                <span className="mt-1 hidden space-y-0.5 sm:block" aria-hidden>
                  {itens.slice(0, 2).map((i, n) => (
                    <span key={n} className={`block truncate rounded px-1 py-px text-[11px] leading-4 font-medium ${TONS[tom(i)]}`}>
                      {rotulo(i)}
                    </span>
                  ))}
                  {itens.length > 2 && <span className="text-text-muted block px-1 text-[11px]">+{itens.length - 2}</span>}
                </span>
              </button>
            );
          })}
        </div>

        <div className="text-text-muted mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs" aria-label="Legenda">
          {(["prova", "feriado", "reuniao", "passeio", "outro"] as const).map((t) => (
            <span key={t} className="inline-flex items-center gap-1.5">
              <span className={`size-2 rounded-full ${PONTO[TOM_TIPO_EVENTO[t]]}`} aria-hidden />
              {t === "passeio" ? "Passeio / festa" : NOME_TIPO_EVENTO[t]}
            </span>
          ))}
        </div>
      </Cartao>

      <section aria-live="polite">
        <h2 className="text-text-secondary mb-3 text-sm font-semibold first-letter:uppercase">{tituloDia(selecionado)}</h2>
        {doDia.length === 0 && <p className="text-text-muted text-sm">Nada marcado neste dia.</p>}
        <div className="space-y-3">
          {doDia.map((i, n) =>
            i.tipo === "feriado" ? (
              <Cartao key={`f${n}`} className="flex items-center gap-3 p-4">
                <span className="text-text font-semibold">{i.nome}</span>
                <Etiqueta tom="perigo">Feriado nacional</Etiqueta>
              </Cartao>
            ) : (
              <CartaoEvento key={i.evento.id} evento={i.evento} aoRemover={aoRemover} />
            ),
          )}
        </div>
      </section>
    </div>
  );
}
