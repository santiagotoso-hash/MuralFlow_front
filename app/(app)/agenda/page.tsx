"use client";

import { CalendarDays, List, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { useSessao } from "@/components/AuthProvider";
import { useConfirmar } from "@/components/Confirmacao";
import { Calendario } from "@/components/Calendario";
import { CartaoEvento, NovoEvento, removerEvento } from "@/components/eventos";
import { Botao, Cabecalho, Carregando, Cartao, Erro, Vazio } from "@/components/ui";
import { diaDaSemana } from "@/lib/formatar";
import type { Evento } from "@/lib/tipos";
import { useApi } from "@/lib/use-api";

type Visao = "calendario" | "lista";
const CHAVE_VISAO = "escola-conecta:agenda-visao";

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
        descricao="Provas, feriados, reuniões, passeios e todas as datas da escola."
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
            {equipe && !criando && (
              <Botao onClick={() => setCriando(true)}>
                <Plus className="size-4" aria-hidden />
                Novo evento
              </Botao>
            )}
          </div>
        }
      />

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

/** Próximos eventos, agrupados por dia. */
function ListaEventos({ versao, aoRemover }: { versao: number; aoRemover?: (e: Evento) => void }) {
  const { dados, erro, carregando, recarregar } = useApi<Evento[]>("/eventos");
  useEffect(() => {
    if (versao) recarregar();
  }, [versao, recarregar]);

  return (
    <>
      {erro && <Erro mensagem={erro} />}
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
                <CartaoEvento key={e.id} evento={e} aoRemover={aoRemover} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
