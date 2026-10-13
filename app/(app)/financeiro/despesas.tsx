"use client";

import { Check, ChevronLeft, ChevronRight, Plus, Receipt, Tags, X } from "lucide-react";
import { useState } from "react";
import { useConfirmar } from "@/components/Confirmacao";
import { Botao, Campo, Carregando, Cartao, Erro, Etiqueta, Vazio } from "@/components/ui";
import { api } from "@/lib/api";
import {
  centavosParaCampo,
  chaveDia,
  dataBr,
  lerReais,
  NOME_FORMA_PAGAMENTO,
  NOME_SITUACAO_DESPESA,
  reais,
  TOM_SITUACAO,
} from "@/lib/formatar";
import type { CategoriaDespesa, Despesa, ListaDespesas } from "@/lib/tipos";
import { useApi } from "@/lib/use-api";
import { FormPagamento, Total } from "./pagamento";

/** "2026-10" → "outubro de 2026". */
const nomeDoMes = (mes: string) =>
  new Date(`${mes}-15T12:00:00Z`).toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });

/** "2026-12" + 1 → "2027-01". */
function somarMes(mes: string, delta: number) {
  const [a, m] = mes.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1 + delta, 1)).toISOString().slice(0, 7);
}

/* ───────────────────────────── Despesas ───────────────────────────── */

/** Contas da escola (aluguel, energia…): lançar, pagar, editar e excluir. */
export function Despesas() {
  const mesAtual = chaveDia(new Date().toISOString()).slice(0, 7);
  const [mes, setMes] = useState(mesAtual);
  const [lancando, setLancando] = useState(false);
  const [acaoAberta, setAcaoAberta] = useState<{ id: string; modo: "pagar" | "editar" } | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const lista = useApi<ListaDespesas>(`/financeiro/despesas?mes=${mes}`);
  const categorias = useApi<CategoriaDespesa[]>("/financeiro/categorias");
  const aceitar = useConfirmar();
  const { recarregar } = lista;

  async function executar(chamada: () => Promise<unknown>) {
    setErro(null);
    try {
      await chamada();
      setAcaoAberta(null);
      recarregar();
    } catch (err) {
      setErro((err as Error).message);
    }
  }

  async function desfazerPagamento(d: Despesa) {
    const ok = await aceitar({
      titulo: "Desfazer o pagamento?",
      mensagem: <>“{d.descricao}” ({reais(d.valorCentavos)}) volta a constar como não paga.</>,
      confirmar: "Desfazer pagamento",
      perigo: true,
    });
    if (ok) await executar(() => api(`/financeiro/despesas/${d.id}/pagamento`, { method: "DELETE" }));
  }

  async function excluir(d: Despesa) {
    const ok = await aceitar({
      titulo: "Excluir esta despesa?",
      mensagem: <>“{d.descricao}” ({reais(d.valorCentavos)}, vence em {dataBr(d.vencimento)}) é apagada. Isso não pode ser desfeito.</>,
      confirmar: "Excluir",
      perigo: true,
    });
    if (ok) await executar(() => api(`/financeiro/despesas/${d.id}`, { method: "DELETE" }));
  }

  const dados = lista.dados?.mes === mes ? lista.dados : null;
  const ativas = (categorias.dados ?? []).filter((c) => c.ativa);

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setMes(somarMes(mes, -1))}
            aria-label="Mês anterior"
            className="text-text-secondary hover:text-text hover:bg-bg cursor-pointer rounded-lg p-2"
          >
            <ChevronLeft className="size-5" />
          </button>
          <h2 className="text-text min-w-44 text-center text-lg font-semibold first-letter:uppercase">{nomeDoMes(mes)}</h2>
          <button
            type="button"
            onClick={() => setMes(somarMes(mes, 1))}
            aria-label="Próximo mês"
            className="text-text-secondary hover:text-text hover:bg-bg cursor-pointer rounded-lg p-2"
          >
            <ChevronRight className="size-5" />
          </button>
          {mes !== mesAtual && (
            <button
              type="button"
              onClick={() => setMes(mesAtual)}
              className="border-border text-text-secondary hover:text-text ml-1 cursor-pointer rounded-lg border px-3 py-1.5 text-sm"
            >
              Este mês
            </button>
          )}
        </div>
        {!lancando && (
          <Botao onClick={() => setLancando(true)} disabled={!categorias.dados}>
            <Plus className="size-4" aria-hidden />
            Nova despesa
          </Botao>
        )}
      </div>

      {lancando && (
        <NovaDespesa
          categorias={ativas}
          aoFechar={() => setLancando(false)}
          aoCriar={() => {
            setLancando(false);
            recarregar();
          }}
        />
      )}

      {(lista.erro ?? categorias.erro) && <Erro mensagem={(lista.erro ?? categorias.erro)!} />}
      {!dados && !lista.erro && <Carregando />}

      {dados && (
        <>
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Total
              rotulo="Em atraso"
              valor={dados.totais.atrasadoCentavos}
              detalhe={dados.totais.atrasadoCentavos ? "Contas vencidas e não pagas" : "Nenhuma conta vencida"}
              tom={dados.totais.atrasadoCentavos > 0 ? "perigo" : undefined}
            />
            <Total rotulo="A pagar" valor={dados.totais.aPagarCentavos} detalhe="Contas deste mês ainda no prazo" />
            <Total rotulo="Pago neste mês" valor={dados.totais.pagoNoMesCentavos} detalhe="Pagamentos com data deste mês" />
          </div>

          {erro && (
            <div className="mb-4">
              <Erro mensagem={erro} />
            </div>
          )}

          {dados.despesas.length === 0 ? (
            <Cartao>
              <Vazio
                icone={Receipt}
                titulo="Nenhuma despesa neste mês"
                texto="Use “Nova despesa” para lançar o aluguel, a conta de energia, uma manutenção…"
              />
            </Cartao>
          ) : (
            <Cartao>
              <ul className="divide-border divide-y">
                {dados.despesas.map((d) => (
                  <li key={d.id} className="p-4">
                    <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-text font-medium">{d.descricao}</p>
                          <Etiqueta>{d.categoria.nome}</Etiqueta>
                          <Etiqueta tom={TOM_SITUACAO[d.situacao]}>{NOME_SITUACAO_DESPESA[d.situacao]}</Etiqueta>
                        </div>
                        <p className="text-text-muted mt-1 text-xs">
                          {d.pagoEm
                            ? `Paga em ${dataBr(d.pagoEm)}${d.formaPagamento ? ` · ${NOME_FORMA_PAGAMENTO[d.formaPagamento]}` : ""} · vencia em ${dataBr(d.vencimento)}`
                            : `${d.situacao === "atrasada" ? "Venceu" : "Vence"} em ${dataBr(d.vencimento)}`}
                        </p>
                        {d.valorPagoCentavos !== null && d.valorPagoCentavos !== d.valorCentavos && (
                          <p className="text-text-secondary mt-1 text-xs">
                            Valor pago: <strong>{reais(d.valorPagoCentavos)}</strong> (conta de {reais(d.valorCentavos)})
                          </p>
                        )}
                        {d.observacao && <p className="text-text-secondary mt-1 text-xs">Anotação: {d.observacao}</p>}
                      </div>
                      <p className={`text-base font-semibold whitespace-nowrap ${d.situacao === "atrasada" ? "text-danger" : "text-text"}`}>
                        {reais(d.valorPagoCentavos ?? d.valorCentavos)}
                      </p>
                    </div>

                    {acaoAberta?.id !== d.id && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {d.situacao === "paga" ? (
                          <Botao variante="secundario" onClick={() => desfazerPagamento(d)}>
                            Desfazer pagamento
                          </Botao>
                        ) : (
                          <>
                            <Botao onClick={() => setAcaoAberta({ id: d.id, modo: "pagar" })}>
                              <Check className="size-4" aria-hidden />
                              Registrar pagamento
                            </Botao>
                            <Botao variante="secundario" onClick={() => setAcaoAberta({ id: d.id, modo: "editar" })}>
                              Editar
                            </Botao>
                            <Botao variante="perigo" onClick={() => excluir(d)}>
                              Excluir
                            </Botao>
                          </>
                        )}
                      </div>
                    )}

                    {acaoAberta?.id === d.id && acaoAberta.modo === "pagar" && (
                      <FormPagamento
                        hoje={dados.hoje}
                        valorCentavos={d.valorCentavos}
                        entrada={false}
                        aoFechar={() => setAcaoAberta(null)}
                        aoSalvar={(body) => executar(() => api(`/financeiro/despesas/${d.id}/pagamento`, { method: "POST", body }))}
                      />
                    )}
                    {acaoAberta?.id === d.id && acaoAberta.modo === "editar" && (
                      <EditarDespesa
                        despesa={d}
                        categorias={categorias.dados ?? []}
                        aoFechar={() => setAcaoAberta(null)}
                        aoSalvar={(body) => executar(() => api(`/financeiro/despesas/${d.id}`, { method: "PATCH", body }))}
                      />
                    )}
                  </li>
                ))}
              </ul>
            </Cartao>
          )}
        </>
      )}
    </>
  );
}

function NovaDespesa({
  categorias,
  aoFechar,
  aoCriar,
}: {
  /** Só as ativas. */
  categorias: CategoriaDespesa[];
  aoFechar: () => void;
  aoCriar: () => void;
}) {
  const [categoriaId, setCategoriaId] = useState("");
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [vencimento, setVencimento] = useState("");
  const [meses, setMeses] = useState("1");
  const [observacao, setObservacao] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const aceitar = useConfirmar();

  const n = Math.max(1, Number(meses) || 1);
  const valorCentavos = lerReais(valor);
  const categoria = categorias.find((c) => c.id === categoriaId);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!categoria) return setErro("Escolha a categoria.");
    if (!valorCentavos) return setErro("Informe o valor, por exemplo 3.500,00.");
    setErro(null);
    const ok = await aceitar({
      titulo: n > 1 ? `Lançar ${n} despesas mensais?` : "Lançar esta despesa?",
      mensagem: (
        <>
          <strong>{descricao.trim() || categoria.nome}</strong> ({categoria.nome}) de <strong>{reais(valorCentavos)}</strong>
          {n > 1 ? <> por mês, durante {n} meses ({reais(valorCentavos * n)} no total), a primeira vencendo em </> : " vencendo em "}
          {dataBr(vencimento)}.
        </>
      ),
      confirmar: "Lançar",
    });
    if (!ok) return;
    setSalvando(true);
    try {
      await api("/financeiro/despesas", {
        method: "POST",
        body: {
          categoriaId,
          descricao: descricao.trim() || undefined,
          valorCentavos,
          vencimento,
          meses: n,
          observacao: observacao.trim() || undefined,
        },
      });
      aoCriar();
    } catch (err) {
      setErro((err as Error).message);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Cartao className="mb-6 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-text font-semibold">Nova despesa</h2>
        <button type="button" onClick={aoFechar} aria-label="Fechar" className="text-text-muted hover:text-text cursor-pointer rounded-lg p-1.5">
          <X className="size-4" />
        </button>
      </div>
      {categorias.length === 0 ? (
        <p className="text-text-secondary text-sm">Nenhuma categoria ativa. Crie ou reative uma na aba Categorias.</p>
      ) : (
        <form onSubmit={salvar} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Campo
              tipo="select"
              rotulo="Categoria"
              required
              value={categoriaId}
              onChange={(e) => setCategoriaId(e.target.value)}
              ajuda="Falta alguma? Crie na aba Categorias."
            >
              <option value="">Escolha…</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </Campo>
            <Campo
              rotulo="Título (opcional)"
              maxLength={130}
              placeholder={categoria?.nome ?? "Conserto do portão"}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              ajuda="Em branco: o nome da categoria."
            />
            <Campo
              rotulo={n > 1 ? "Valor de cada mês (R$)" : "Valor (R$)"}
              required
              inputMode="decimal"
              placeholder="3.500,00"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
            />
            <Campo
              rotulo={n > 1 ? "1º vencimento" : "Vencimento"}
              type="date"
              required
              value={vencimento}
              onChange={(e) => setVencimento(e.target.value)}
            />
            <Campo
              rotulo="Repetir por quantos meses"
              type="number"
              min={1}
              max={24}
              required
              value={meses}
              onChange={(e) => setMeses(e.target.value)}
              ajuda={
                n > 1 && valorCentavos
                  ? `${n} despesas, uma por mês: ${reais(valorCentavos * n)} no total.`
                  : "1 = só esta. Ex.: 12 para lançar o aluguel do ano."
              }
            />
            <Campo rotulo="Anotação (opcional)" maxLength={500} value={observacao} onChange={(e) => setObservacao(e.target.value)} />
          </div>
          {erro && <Erro mensagem={erro} />}
          <div className="flex flex-wrap gap-2">
            <Botao type="submit" carregando={salvando}>
              Lançar despesa
            </Botao>
            <Botao type="button" variante="fantasma" onClick={aoFechar}>
              Cancelar
            </Botao>
          </div>
        </form>
      )}
    </Cartao>
  );
}

function EditarDespesa({
  despesa: d,
  categorias,
  aoFechar,
  aoSalvar,
}: {
  despesa: Despesa;
  categorias: CategoriaDespesa[];
  aoFechar: () => void;
  aoSalvar: (body: Record<string, unknown>) => Promise<void>;
}) {
  const [categoriaId, setCategoriaId] = useState(d.categoria.id);
  const [descricao, setDescricao] = useState(d.descricao);
  const [valor, setValor] = useState(centavosParaCampo(d.valorCentavos));
  const [vencimento, setVencimento] = useState(d.vencimento);
  const [observacao, setObservacao] = useState(d.observacao ?? "");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  // A categoria atual aparece mesmo desativada, para não trocar sem querer.
  const opcoes = categorias.filter((c) => c.ativa || c.id === d.categoria.id);

  return (
    <form
      className="bg-bg mt-3 space-y-3 rounded-lg p-3"
      onSubmit={async (e) => {
        e.preventDefault();
        const valorCentavos = lerReais(valor);
        if (!valorCentavos) return setErro("Informe o valor, por exemplo 3.500,00.");
        setErro(null);
        setSalvando(true);
        await aoSalvar({ categoriaId, descricao, valorCentavos, vencimento, observacao });
        setSalvando(false);
      }}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Campo rotulo="Título" required maxLength={150} value={descricao} onChange={(e) => setDescricao(e.target.value)} />
        <Campo tipo="select" rotulo="Categoria" value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)}>
          {opcoes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
              {c.ativa ? "" : " (desativada)"}
            </option>
          ))}
        </Campo>
        <Campo rotulo="Valor (R$)" required inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} />
        <Campo rotulo="Vencimento" type="date" required value={vencimento} onChange={(e) => setVencimento(e.target.value)} />
      </div>
      <Campo rotulo="Anotação" maxLength={500} value={observacao} onChange={(e) => setObservacao(e.target.value)} />
      {erro && <Erro mensagem={erro} />}
      <div className="flex flex-wrap gap-2">
        <Botao type="submit" carregando={salvando}>
          Salvar
        </Botao>
        <Botao type="button" variante="fantasma" onClick={aoFechar}>
          Cancelar
        </Botao>
      </div>
    </form>
  );
}

/* ──────────────────────────── Categorias ──────────────────────────── */

/** As categorias de despesa: criar, renomear, desativar e excluir. */
export function Categorias() {
  const categorias = useApi<CategoriaDespesa[]>("/financeiro/categorias");
  const [nova, setNova] = useState("");
  const [editando, setEditando] = useState<{ id: string; nome: string } | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const aceitar = useConfirmar();
  const { recarregar } = categorias;

  async function executar(chamada: () => Promise<unknown>) {
    setErro(null);
    setOcupado(true);
    try {
      await chamada();
      recarregar();
      return true;
    } catch (err) {
      setErro((err as Error).message);
      return false;
    } finally {
      setOcupado(false);
    }
  }

  async function criar(e: React.FormEvent) {
    e.preventDefault();
    if (await executar(() => api("/financeiro/categorias", { method: "POST", body: { nome: nova } }))) setNova("");
  }

  async function renomear(e: React.FormEvent) {
    e.preventDefault();
    if (!editando) return;
    const { id, nome } = editando;
    if (await executar(() => api(`/financeiro/categorias/${id}`, { method: "PATCH", body: { nome } }))) setEditando(null);
  }

  async function excluir(c: CategoriaDespesa) {
    const ok = await aceitar({
      titulo: "Excluir esta categoria?",
      mensagem: <>“{c.nome}” não tem despesas lançadas e será apagada.</>,
      confirmar: "Excluir",
      perigo: true,
    });
    if (ok) await executar(() => api(`/financeiro/categorias/${c.id}`, { method: "DELETE" }));
  }

  return (
    <>
      <p className="text-text-secondary mb-4 max-w-2xl text-sm">
        As categorias organizam as despesas da escola. Crie as que precisar e renomeie quando quiser: as despesas já
        lançadas acompanham o nome novo.
      </p>

      <form onSubmit={criar} className="mb-6 flex flex-wrap items-end gap-3">
        <div className="min-w-56 flex-1 sm:max-w-sm">
          <Campo
            rotulo="Nova categoria"
            required
            minLength={2}
            maxLength={60}
            placeholder="Ex.: Material de limpeza"
            value={nova}
            onChange={(e) => setNova(e.target.value)}
          />
        </div>
        <Botao type="submit" carregando={ocupado && !editando}>
          <Plus className="size-4" aria-hidden />
          Adicionar
        </Botao>
      </form>

      {erro && (
        <div className="mb-4">
          <Erro mensagem={erro} />
        </div>
      )}
      {categorias.erro && <Erro mensagem={categorias.erro} />}
      {categorias.carregando && <Carregando />}

      {categorias.dados?.length === 0 && (
        <Cartao>
          <Vazio icone={Tags} titulo="Nenhuma categoria" texto="Adicione a primeira no campo acima." />
        </Cartao>
      )}
      {categorias.dados && categorias.dados.length > 0 && (
        <Cartao>
          <ul className="divide-border divide-y">
            {categorias.dados.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 p-4">
                {editando?.id === c.id ? (
                  <form onSubmit={renomear} className="flex flex-1 flex-wrap items-end gap-2">
                    <div className="min-w-48 flex-1 sm:max-w-sm">
                      <Campo
                        rotulo="Nome da categoria"
                        required
                        minLength={2}
                        maxLength={60}
                        autoFocus
                        value={editando.nome}
                        onChange={(e) => setEditando({ id: c.id, nome: e.target.value })}
                      />
                    </div>
                    <Botao type="submit" carregando={ocupado}>
                      Salvar
                    </Botao>
                    <Botao type="button" variante="fantasma" onClick={() => setEditando(null)}>
                      Cancelar
                    </Botao>
                  </form>
                ) : (
                  <>
                    <div className={`min-w-0 flex-1 ${c.ativa ? "" : "opacity-60"}`}>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-text font-medium">{c.nome}</p>
                        {!c.ativa && <Etiqueta>Desativada</Etiqueta>}
                      </div>
                      <p className="text-text-muted text-xs">
                        {c.totalDespesas
                          ? `${c.totalDespesas} ${c.totalDespesas === 1 ? "despesa lançada" : "despesas lançadas"}`
                          : "Nenhuma despesa lançada"}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Botao variante="secundario" onClick={() => setEditando({ id: c.id, nome: c.nome })}>
                        Renomear
                      </Botao>
                      <Botao
                        variante="secundario"
                        disabled={ocupado}
                        onClick={() => executar(() => api(`/financeiro/categorias/${c.id}`, { method: "PATCH", body: { ativa: !c.ativa } }))}
                        title={c.ativa ? "Some da lista ao lançar; as despesas antigas ficam" : undefined}
                      >
                        {c.ativa ? "Desativar" : "Reativar"}
                      </Botao>
                      {!c.totalDespesas && (
                        <Botao variante="perigo" disabled={ocupado} onClick={() => excluir(c)}>
                          Excluir
                        </Botao>
                      )}
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        </Cartao>
      )}
    </>
  );
}
