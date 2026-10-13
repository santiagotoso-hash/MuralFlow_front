"use client";

import { Download, History, TableProperties } from "lucide-react";
import { useState } from "react";
import { Botao, Campo, Carregando, Cartao, Erro, Etiqueta, Vazio } from "@/components/ui";
import { api } from "@/lib/api";
import { baixarCsv, valorParaPlanilha } from "@/lib/arquivos";
import { chaveDia, dataBr, NOME_FORMA_PAGAMENTO, reais } from "@/lib/formatar";
import type { LinhaHistorico, RelatorioFinanceiro } from "@/lib/tipos";
import { useApi } from "@/lib/use-api";
import { Total } from "./pagamento";

/** "2026-10" → "out. de 2026". */
const mesCurto = (mes: string) =>
  new Date(`${mes}-15T12:00:00Z`).toLocaleDateString("pt-BR", { month: "short", year: "numeric", timeZone: "UTC" });

/* ───────────────────────────── Relatório ───────────────────────────── */

/**
 * Entradas e saídas de um período, pela data do pagamento. Mostra os
 * totais, a divisão por tipo e por categoria e o mês a mês; exporta os
 * lançamentos para planilha.
 */
export function Relatorio() {
  const hoje = chaveDia(new Date().toISOString());
  const [de, setDe] = useState(`${hoje.slice(0, 4)}-01-01`);
  const [ate, setAte] = useState(hoje);
  // Só busca com as duas datas preenchidas e em ordem (evita um 400 a cada tecla).
  const valido = !!de && !!ate && de <= ate;
  const rel = useApi<RelatorioFinanceiro>(valido ? `/financeiro/relatorio?de=${de}&ate=${ate}` : null);
  const dados = rel.dados && rel.dados.de === de && rel.dados.ate === ate ? rel.dados : null;

  function exportar() {
    if (!dados) return;
    baixarCsv(`financeiro-${dados.de}-a-${dados.ate}.csv`, [
      ["Data", "Entrada ou saída", "Tipo / categoria", "Descrição", "Aluno", "Turma", "Forma de pagamento", "Valor (R$)"],
      ...dados.lancamentos.map((l) => [
        dataBr(l.data),
        l.natureza === "entrada" ? "Entrada" : "Saída",
        l.grupo,
        l.descricao,
        l.aluno ?? "",
        l.turma ?? "",
        l.formaPagamento ? NOME_FORMA_PAGAMENTO[l.formaPagamento] : "",
        // Saída com sinal negativo: a soma da coluna dá o saldo.
        valorParaPlanilha(l.natureza === "entrada" ? l.valorCentavos : -l.valorCentavos),
      ]),
    ]);
  }

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end gap-3">
        <div className="w-44">
          <Campo rotulo="De" type="date" required max={ate || undefined} value={de} onChange={(e) => setDe(e.target.value)} />
        </div>
        <div className="w-44">
          <Campo rotulo="Até" type="date" required min={de || undefined} value={ate} onChange={(e) => setAte(e.target.value)} />
        </div>
        <Botao variante="secundario" onClick={exportar} disabled={!dados || dados.lancamentos.length === 0}>
          <Download className="size-4" aria-hidden />
          Exportar planilha
        </Botao>
      </div>
      <p className="text-text-muted -mt-3 mb-6 text-xs">
        Conta o que entrou e saiu de fato no período, pela data do pagamento. Cobranças e contas ainda não pagas não
        entram.
      </p>

      {!valido && <Erro mensagem="Escolha as duas datas, com o início antes do fim." />}
      {rel.erro && <Erro mensagem={rel.erro} />}
      {valido && !dados && !rel.erro && <Carregando />}

      {dados && (
        <>
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Total rotulo="Entradas" valor={dados.totais.entradasCentavos} detalhe="Recebido dos alunos" />
            <Total rotulo="Saídas" valor={dados.totais.saidasCentavos} detalhe="Despesas pagas" />
            <Total
              rotulo="Saldo do período"
              valor={dados.totais.saldoCentavos}
              detalhe="Entradas menos saídas"
              tom={dados.totais.saldoCentavos < 0 ? "perigo" : "sucesso"}
            />
          </div>

          {dados.lancamentos.length === 0 ? (
            <Cartao>
              <Vazio icone={TableProperties} titulo="Nenhum pagamento neste período" />
            </Cartao>
          ) : (
            <>
              <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
                <Divisao titulo="Entradas por tipo" linhas={dados.entradasPorTipo} total={dados.totais.entradasCentavos} vazio="Nenhuma entrada" />
                <Divisao
                  titulo="Saídas por categoria"
                  linhas={dados.saidasPorCategoria}
                  total={dados.totais.saidasCentavos}
                  vazio="Nenhuma saída"
                />
              </div>

              <Cartao className="overflow-x-auto">
                <h3 className="text-text border-border border-b px-5 py-4 font-semibold">Mês a mês</h3>
                <table className="w-full text-left text-sm">
                  <thead className="text-text-muted border-border border-b text-xs uppercase">
                    <tr>
                      <th className="px-5 py-3 font-medium">Mês</th>
                      <th className="px-5 py-3 text-right font-medium">Entradas</th>
                      <th className="px-5 py-3 text-right font-medium">Saídas</th>
                      <th className="px-5 py-3 text-right font-medium">Saldo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-border divide-y">
                    {dados.porMes.map((m) => {
                      const saldo = m.entradasCentavos - m.saidasCentavos;
                      return (
                        <tr key={m.mes}>
                          <td className="text-text px-5 py-3 first-letter:uppercase">{mesCurto(m.mes)}</td>
                          <td className="text-text px-5 py-3 text-right whitespace-nowrap">{reais(m.entradasCentavos)}</td>
                          <td className="text-text px-5 py-3 text-right whitespace-nowrap">{reais(m.saidasCentavos)}</td>
                          <td className={`px-5 py-3 text-right font-semibold whitespace-nowrap ${saldo < 0 ? "text-danger" : "text-text"}`}>
                            {reais(saldo)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </Cartao>
            </>
          )}
        </>
      )}
    </>
  );
}

/** Uma divisão (por tipo ou por categoria): valor, parcela do total e uma barra. */
function Divisao({
  titulo,
  linhas,
  total,
  vazio,
}: {
  titulo: string;
  linhas: RelatorioFinanceiro["entradasPorTipo"];
  total: number;
  vazio: string;
}) {
  return (
    <Cartao>
      <h3 className="text-text border-border border-b px-5 py-4 font-semibold">{titulo}</h3>
      {linhas.length === 0 ? (
        <p className="text-text-muted px-5 py-6 text-sm">{vazio}</p>
      ) : (
        <ul className="divide-border divide-y">
          {linhas.map((l) => {
            const pct = total ? Math.round((l.totalCentavos / total) * 100) : 0;
            return (
              <li key={l.nome} className="px-5 py-3">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-text min-w-0 truncate text-sm font-medium">{l.nome}</p>
                  <p className="text-text text-sm font-semibold whitespace-nowrap">{reais(l.totalCentavos)}</p>
                </div>
                <div className="mt-1 flex items-center gap-3">
                  <div className="bg-bg h-1.5 flex-1 overflow-hidden rounded-full" aria-hidden>
                    <div className="bg-primary-solid h-full rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-text-muted w-28 text-right text-xs whitespace-nowrap">
                    {pct}% · {l.quantidade} {l.quantidade === 1 ? "pagamento" : "pagamentos"}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Cartao>
  );
}

/* ───────────────────────────── Histórico ───────────────────────────── */

const NOME_ALVO: Record<LinhaHistorico["alvo"], string> = {
  cobranca: "Cobrança",
  despesa: "Despesa",
  categoria: "Categoria",
};

const dataHoraBr = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });

/** Quem fez o quê no financeiro, do mais recente para o mais antigo. */
export function Historico() {
  const primeira = useApi<LinhaHistorico[]>("/financeiro/historico");
  const [mais, setMais] = useState<LinhaHistorico[]>([]);
  const [acabou, setAcabou] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const linhas = [...(primeira.dados ?? []), ...mais];
  // A API manda 50 por vez: menos que isso na primeira página = não há mais.
  const temMais = !acabou && (primeira.dados?.length ?? 0) === 50;

  async function carregarMais() {
    const ultima = linhas.at(-1);
    if (!ultima) return;
    setErro(null);
    setCarregando(true);
    try {
      const pagina = await api<LinhaHistorico[]>(`/financeiro/historico?antesDe=${encodeURIComponent(ultima.quando)}`);
      setMais((m) => [...m, ...pagina]);
      if (pagina.length < 50) setAcabou(true);
    } catch (err) {
      setErro((err as Error).message);
    } finally {
      setCarregando(false);
    }
  }

  return (
    <>
      <p className="text-text-secondary mb-4 max-w-2xl text-sm">
        Tudo o que foi lançado, editado, recebido, pago, cancelado ou desfeito no financeiro, com quem fez e quando.
        Nada aqui pode ser alterado nem apagado.
      </p>
      {(primeira.erro ?? erro) && <Erro mensagem={(primeira.erro ?? erro)!} />}
      {primeira.carregando && <Carregando />}
      {primeira.dados?.length === 0 && (
        <Cartao>
          <Vazio icone={History} titulo="Nenhuma ação registrada ainda" texto="As próximas ações no financeiro aparecem aqui." />
        </Cartao>
      )}
      {linhas.length > 0 && (
        <Cartao>
          <ul className="divide-border divide-y">
            {linhas.map((l) => (
              <li key={l.id} className="px-5 py-3">
                <p className="text-text text-sm">{l.resumo}</p>
                <p className="text-text-muted mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                  <Etiqueta>{NOME_ALVO[l.alvo]}</Etiqueta>
                  <span>
                    {l.quem} · {dataHoraBr(l.quando)}
                  </span>
                </p>
              </li>
            ))}
          </ul>
        </Cartao>
      )}
      {temMais && (
        <div className="mt-4 text-center">
          <Botao variante="secundario" onClick={carregarMais} carregando={carregando}>
            Ver mais antigas
          </Botao>
        </div>
      )}
    </>
  );
}
