"use client";

import { ClipboardList, Plus } from "lucide-react";
import { useState } from "react";
import { useSessao } from "@/components/AuthProvider";
import { useConfirmar } from "@/components/Confirmacao";
import { CartaoEvento, NovoEvento, removerEvento } from "@/components/eventos";
import { Botao, Cabecalho, Carregando, Cartao, Erro, Etiqueta, Vazio } from "@/components/ui";
import { chaveDia, dataCurta, diasAte } from "@/lib/formatar";
import type { Evento } from "@/lib/tipos";
import { useApi } from "@/lib/use-api";

/** Provas já realizadas aparecem por este tempo. */
const DIAS_ANTERIORES = 60;

export default function Provas() {
  const { usuario } = useSessao();
  const [de] = useState(() => new Date(Date.now() - DIAS_ANTERIORES * 86_400_000).toISOString());
  const { dados, erro, carregando, recarregar } = useApi<Evento[]>(`/eventos?tipo=prova&de=${encodeURIComponent(de)}`);
  const [criando, setCriando] = useState(false);
  const [acaoErro, setAcaoErro] = useState<string | null>(null);
  const aceitar = useConfirmar();

  if (!usuario) return null;
  const equipe = usuario.papel !== "responsavel";

  // Família: mostra o nome do filho em vez da turma (mais fácil de ler).
  const filhosDaTurma = (turmaId?: string) =>
    (usuario.filhos ?? [])
      .filter((f) => f.turma?.id === turmaId)
      .map((f) => f.nome.split(" ")[0])
      .join(" e ");

  const hoje = chaveDia(new Date().toISOString());
  const proximas = (dados ?? []).filter((p) => chaveDia(p.inicio) >= hoje);
  const realizadas = (dados ?? []).filter((p) => chaveDia(p.inicio) < hoje).reverse();

  async function remover(e: Evento) {
    try {
      if (await removerEvento(e, aceitar)) recarregar();
    } catch (err) {
      setAcaoErro((err as Error).message);
    }
  }

  const cartao = (p: Evento, passada = false) => {
    const quando = diasAte(p.inicio);
    const filhos = !equipe ? filhosDaTurma(p.turma?.id) : "";
    return (
      <CartaoEvento
        key={p.id}
        evento={p}
        rotuloHora={dataCurta(p.inicio).replace(".", "")}
        aoRemover={equipe ? remover : undefined}
        extra={
          <>
            {filhos && <Etiqueta tom="primario">{filhos}</Etiqueta>}
            {!passada && (
              <Etiqueta tom={quando === "hoje" || quando === "amanhã" ? "perigo" : "neutro"}>{quando}</Etiqueta>
            )}
          </>
        }
      />
    );
  };

  return (
    <>
      <Cabecalho
        titulo="Provas"
        descricao={equipe ? "Calendário de avaliações das suas turmas." : "As próximas provas e o que estudar para cada uma."}
        acao={
          equipe &&
          !criando && (
            <Botao onClick={() => setCriando(true)}>
              <Plus className="size-4" aria-hidden />
              Nova prova
            </Botao>
          )
        }
      />

      {criando && (
        <NovoEvento
          admin={usuario.papel === "admin"}
          soProva
          aoFechar={() => setCriando(false)}
          aoCriar={() => {
            setCriando(false);
            recarregar();
          }}
        />
      )}

      {erro && <Erro mensagem={erro} />}
      {acaoErro && (
        <div className="mb-4">
          <Erro mensagem={acaoErro} />
        </div>
      )}
      {carregando && <Carregando />}

      {dados && (
        <section className="space-y-3">
          <h2 className="text-text-secondary text-sm font-semibold">Próximas provas</h2>
          {proximas.length === 0 ? (
            <Cartao>
              <Vazio icone={ClipboardList} titulo="Nenhuma prova marcada" texto="Quando houver uma prova, ela aparece aqui com o conteúdo." />
            </Cartao>
          ) : (
            proximas.map((p) => cartao(p))
          )}
        </section>
      )}

      {realizadas.length > 0 && (
        <details className="group mt-8">
          <summary className="text-text-secondary hover:text-text cursor-pointer text-sm font-semibold">
            Já realizadas ({realizadas.length})
          </summary>
          <div className="mt-3 space-y-3 opacity-80">{realizadas.map((p) => cartao(p, true))}</div>
        </details>
      )}
    </>
  );
}
