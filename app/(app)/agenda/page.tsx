"use client";

import { CalendarDays, CalendarSync, List, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSessao } from "@/components/AuthProvider";
import { useConfirmar } from "@/components/Confirmacao";
import { Calendario } from "@/components/Calendario";
import { CartaoAniversario, CartaoEvento, NovoEvento, removerEvento } from "@/components/eventos";
import { SincronizarAgenda } from "@/components/SincronizarAgenda";
import { Botao, Cabecalho, Carregando, Cartao, Erro, Vazio } from "@/components/ui";
import { aniversariosNoAno } from "@/lib/aniversarios";
import { chaveDia, diaDaSemana } from "@/lib/formatar";
import type { Aniversario, Evento } from "@/lib/tipos";
import { useApi } from "@/lib/use-api";

type Visao = "calendario" | "lista";
const CHAVE_VISAO = "escola-conecta:agenda-visao";

/** Na lista, só os aniversários que estão chegando (não o ano inteiro). */
const DIAS_DE_ANIVERSARIOS = 30;

type ItemLista = { chave: string } & (
  | { tipo: "evento"; evento: Evento }
  | { tipo: "aniversario"; aniversario: Aniversario }
);

/**
 * Eventos e aniversários dos próximos dias, agrupados por dia (no fuso de
 * Brasília) em ordem cronológica; no mesmo dia, aniversários primeiro.
 */
function porDia(eventos: Evento[], aniversarios: Aniversario[]) {
  const hoje = chaveDia(new Date().toISOString());
  const limite = new Date(Date.parse(`${hoje}T00:00:00Z`) + DIAS_DE_ANIVERSARIOS * 86_400_000)
    .toISOString()
    .slice(0, 10);
  const ano = Number(hoje.slice(0, 4));
  const itens: ItemLista[] = eventos.map((e) => ({ chave: chaveDia(e.inicio), tipo: "evento", evento: e }));
  for (const a of [ano, ano + 1]) {
    for (const [chave, lista] of aniversariosNoAno(aniversarios, a)) {
      if (chave < hoje || chave > limite) continue;
      for (const aniversario of lista) itens.push({ chave, tipo: "aniversario", aniversario });
    }
  }
  itens.sort((x, y) => x.chave.localeCompare(y.chave) || (x.tipo === "aniversario" ? -1 : 0) - (y.tipo === "aniversario" ? -1 : 0));

  const grupos = new Map<string, ItemLista[]>();
  for (const i of itens) grupos.set(i.chave, [...(grupos.get(i.chave) ?? []), i]);
  return [...grupos.entries()].map(([chave, lista]) => [diaDaSemana(`${chave}T12:00:00-03:00`), lista] as const);
}

export default function Agenda() {
  const { usuario } = useSessao();
  // A área logada só renderiza no navegador (depende da sessão), então dá
  // para ler o localStorage já no estado inicial.
  const [visao, setVisao] = useState<Visao>(() => {
    try {
      return localStorage.getItem(CHAVE_VISAO) === "lista" ? "lista" : "calendario";
    } catch {
      return "calendario";
    }
  });
  const [versao, setVersao] = useState(0);
  const [criando, setCriando] = useState(false);
  const [sincronizando, setSincronizando] = useState(false);
  const [acaoErro, setAcaoErro] = useState<string | null>(null);
  const aceitar = useConfirmar();

  if (!usuario) return null;
  const equipe = usuario.papel !== "responsavel";

  function trocarVisao(v: Visao) {
    setVisao(v);
    try {
      localStorage.setItem(CHAVE_VISAO, v);
    } catch {
      /* ignora */
    }
  }

  async function remover(e: Evento) {
    try {
      if (await removerEvento(e, aceitar)) setVersao((v) => v + 1);
    } catch (err) {
      setAcaoErro((err as Error).message);
    }
  }

  return (
    <>
      <Cabecalho
        titulo="Agenda"
        descricao="Provas, feriados, reuniões, passeios, aniversários e todas as datas da escola."
        acao={
          <div className="flex flex-wrap items-center gap-2">
            <div className="border-border bg-surface inline-flex rounded-lg border p-0.5" role="group" aria-label="Modo de exibição">
              {(
                [
                  ["calendario", "Calendário", CalendarDays],
                  ["lista", "Lista", List],
                ] as const
              ).map(([v, rotulo, Icone]) => (
                <button
                  key={v}
                  type="button"
                  aria-pressed={visao === v}
                  onClick={() => trocarVisao(v)}
                  className={`inline-flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium ${
                    visao === v ? "bg-primary-subtle text-primary" : "text-text-secondary hover:text-text"
                  }`}
                >
                  <Icone className="size-4" aria-hidden />
                  {rotulo}
                </button>
              ))}
            </div>
            {!sincronizando && (
              <Botao variante="secundario" onClick={() => setSincronizando(true)}>
                <CalendarSync className="size-4" aria-hidden />
                Google Calendar
              </Botao>
            )}
            {equipe && !criando && (
              <Botao onClick={() => setCriando(true)}>
                <Plus className="size-4" aria-hidden />
                Novo evento
              </Botao>
            )}
          </div>
        }
      />

      {sincronizando && <SincronizarAgenda aoFechar={() => setSincronizando(false)} />}

      {criando && (
        <NovoEvento
          admin={usuario.papel === "admin"}
          aoFechar={() => setCriando(false)}
          aoCriar={() => {
            setCriando(false);
            setVersao((v) => v + 1);
          }}
        />
      )}

      {acaoErro && (
        <div className="mb-4">
          <Erro mensagem={acaoErro} />
        </div>
      )}

      {visao === "calendario" ? (
        <Calendario versao={versao} aoRemover={equipe ? remover : undefined} />
      ) : (
        <ListaEventos versao={versao} aoRemover={equipe ? remover : undefined} />
      )}
    </>
  );
}

/** Próximos eventos (e aniversários do próximo mês), agrupados por dia. */
function ListaEventos({ versao, aoRemover }: { versao: number; aoRemover?: (e: Evento) => void }) {
  const { dados, erro, carregando, recarregar } = useApi<Evento[]>("/eventos");
  const aniversarios = useApi<Aniversario[]>("/eventos/aniversarios");
  useEffect(() => {
    if (versao) recarregar();
  }, [versao, recarregar]);
  const grupos = useMemo(() => porDia(dados ?? [], aniversarios.dados ?? []), [dados, aniversarios.dados]);

  return (
    <>
      {(erro ?? aniversarios.erro) && <Erro mensagem={(erro ?? aniversarios.erro)!} />}
      {carregando && <Carregando />}
      {dados && grupos.length === 0 && (
        <Cartao>
          <Vazio icone={CalendarDays} titulo="Nada marcado por enquanto" />
        </Cartao>
      )}
      <div className="space-y-8">
        {grupos.map(([dia, itens]) => (
          <section key={dia}>
            <h2 className="text-text-secondary mb-3 text-sm font-semibold first-letter:uppercase">{dia}</h2>
            <div className="space-y-3">
              {itens.map((i) =>
                i.tipo === "aniversario" ? (
                  <CartaoAniversario key={i.aniversario.id} aniversario={i.aniversario} />
                ) : (
                  <CartaoEvento key={i.evento.id} evento={i.evento} aoRemover={aoRemover} />
                ),
              )}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
