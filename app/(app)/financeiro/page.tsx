"use client";

import { ArrowLeft, Check, ChevronRight, Plus, Wallet, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSessao } from "@/components/AuthProvider";
import { useConfirmar } from "@/components/Confirmacao";
import { Abas, Botao, Cabecalho, Campo, Carregando, Cartao, Erro, Etiqueta, Vazio } from "@/components/ui";
import { api } from "@/lib/api";
import {
  dataBr,
  lerReais,
  NOME_FORMA_PAGAMENTO,
  NOME_SITUACAO,
  NOME_TIPO_COBRANCA,
  reais,
  TOM_SITUACAO,
} from "@/lib/formatar";
import type {
  Aluno,
  Cobranca,
  ExtratoAluno,
  FormaPagamento,
  ResumoFinanceiro,
  TipoCobranca,
} from "@/lib/tipos";
import { useApi } from "@/lib/use-api";

const TIPOS = Object.keys(NOME_TIPO_COBRANCA) as TipoCobranca[];
const FORMAS = Object.keys(NOME_FORMA_PAGAMENTO) as FormaPagamento[];

export default function PaginaFinanceiro() {
  const { usuario } = useSessao();
  if (!usuario) return null;
  if (usuario.papel === "professor") return <Erro mensagem="Área do financeiro e da direção." />;

  return usuario.papel === "responsavel" ? (
    <>
      <Cabecalho titulo="Financeiro" descricao="Matrícula, mensalidades e compras dos seus filhos." />
      <FinanceiroFamilia filhos={usuario.filhos ?? []} />
    </>
  ) : (
    <FinanceiroEquipe />
  );
}

/* ───────────────────────────── Família ───────────────────────────── */

function FinanceiroFamilia({ filhos }: { filhos: Aluno[] }) {
  const [alunoId, setAlunoId] = useState(filhos[0]?.id ?? "");
  if (filhos.length === 0) {
    return (
      <Cartao>
        <Vazio icone={Wallet} titulo="Nenhum aluno vinculado" texto="Peça à secretaria para vincular seus filhos à sua conta." />
      </Cartao>
    );
  }
  return (
    <>
      {filhos.length > 1 && (
        <Abas
          rotulo="Filhos"
          abas={filhos.map((f) => ({ id: f.id, rotulo: f.nome.split(" ")[0] }))}
          ativa={alunoId}
          setAtiva={setAlunoId}
        />
      )}
      <Extrato key={alunoId} alunoId={alunoId} equipe={false} />
      <p className="text-text-muted mt-4 text-xs">
        Os pagamentos são registrados pela escola. Se algo não estiver certo, fale com a secretaria em Mensagens.
      </p>
    </>
  );
}

/* ─────────────────────── Financeiro e direção ─────────────────────── */

function FinanceiroEquipe() {
  const [turmaId, setTurmaId] = useState("");
  const [busca, setBusca] = useState("");
  const [soAtraso, setSoAtraso] = useState(false);
  const [abertoId, setAbertoId] = useState<string | null>(null);
  const [lancando, setLancando] = useState(false);
  /** Sobe a cada lançamento: o extrato aberto busca de novo. */
  const [versao, setVersao] = useState(0);
  const resumo = useApi<ResumoFinanceiro>(`/financeiro/resumo${turmaId ? `?turmaId=${turmaId}` : ""}`);
  const { recarregar } = resumo;

  const alunos = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase("pt-BR");
    return (resumo.dados?.alunos ?? []).filter(
      (a) =>
        (!soAtraso || a.atrasadoCentavos > 0) &&
        (!termo ||
          a.nome.toLocaleLowerCase("pt-BR").includes(termo) ||
          a.responsaveis.some((r) => r.nome.toLocaleLowerCase("pt-BR").includes(termo))),
    );
  }, [resumo.dados, busca, soAtraso]);

  const aberto = resumo.dados?.alunos.find((a) => a.id === abertoId) ?? null;

  if (abertoId) {
    return (
      <>
        <button
          type="button"
          onClick={() => setAbertoId(null)}
          className="text-text-secondary hover:text-text mb-4 inline-flex cursor-pointer items-center gap-1.5 text-sm font-medium"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Todos os alunos
        </button>
        {lancando && resumo.dados && (
          <NovaCobranca
            resumo={resumo.dados}
            alunoFixoId={abertoId}
            aoFechar={() => setLancando(false)}
            aoCriar={() => {
              setLancando(false);
              setVersao((v) => v + 1);
              recarregar();
            }}
          />
        )}
        <Extrato
          key={abertoId}
          alunoId={abertoId}
          equipe
          versao={versao}
          aoMudar={recarregar}
          acao={
            !lancando && (
              <Botao onClick={() => setLancando(true)}>
                <Plus className="size-4" aria-hidden />
                Nova cobrança
              </Botao>
            )
          }
          contatos={aberto?.responsaveis}
        />
      </>
    );
  }

  const t = resumo.dados?.totais;
  return (
    <>
      <Cabecalho
        titulo="Financeiro"
        descricao="Matrícula, mensalidades, uniforme e livros de cada aluno."
        acao={
          !lancando && (
            <Botao onClick={() => setLancando(true)} disabled={!resumo.dados}>
              <Plus className="size-4" aria-hidden />
              Nova cobrança
            </Botao>
          )
        }
      />

      {lancando && resumo.dados && (
        <NovaCobranca
          resumo={resumo.dados}
          aoFechar={() => setLancando(false)}
          aoCriar={() => {
            setLancando(false);
            recarregar();
          }}
        />
      )}

      {resumo.erro && <Erro mensagem={resumo.erro} />}
      {resumo.carregando && <Carregando />}

      {t && (
        <>
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Total
              rotulo="Em atraso"
              valor={t.atrasadoCentavos}
              detalhe={
                t.alunosEmAtraso === 0
                  ? "Nenhum aluno em atraso"
                  : `${t.alunosEmAtraso} ${t.alunosEmAtraso === 1 ? "aluno" : "alunos"}`
              }
              perigo={t.atrasadoCentavos > 0}
            />
            <Total rotulo="A vencer" valor={t.aVencerCentavos} detalhe="Cobranças ainda no prazo" />
            <Total rotulo="Recebido neste mês" valor={t.recebidoNoMesCentavos} detalhe="Baixas com data deste mês" />
          </div>

          <div className="mb-4 flex flex-wrap items-end gap-3">
            <div className="w-48">
              <Campo tipo="select" rotulo="Turma" value={turmaId} onChange={(e) => setTurmaId(e.target.value)}>
                <option value="">Todas</option>
                {resumo.dados!.turmas.map((tu) => (
                  <option key={tu.id} value={tu.id}>
                    {tu.nome}
                  </option>
                ))}
              </Campo>
            </div>
            <div className="min-w-48 flex-1">
              <Campo
                rotulo="Buscar"
                type="search"
                placeholder="Nome do aluno ou do responsável"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
            </div>
            <label className="text-text flex cursor-pointer items-center gap-2 pb-2 text-sm">
              <input
                type="checkbox"
                className="accent-primary-solid size-4"
                checked={soAtraso}
                onChange={(e) => setSoAtraso(e.target.checked)}
              />
              Só em atraso
            </label>
          </div>

          {alunos.length === 0 ? (
            <Cartao>
              <Vazio icone={Wallet} titulo="Nenhum aluno encontrado" />
            </Cartao>
          ) : (
            <Cartao className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-text-muted border-border border-b text-xs uppercase">
                  <tr>
                    <th className="px-4 py-3 font-medium">Aluno</th>
                    <th className="px-4 py-3 font-medium">Responsáveis</th>
                    <th className="px-4 py-3 text-right font-medium">Em atraso</th>
                    <th className="px-4 py-3 text-right font-medium">A vencer</th>
                    <th className="px-4 py-3 font-medium">Próx. vencimento</th>
                    <th className="px-2 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-border divide-y">
                  {alunos.map((a) => (
                    <tr key={a.id} onClick={() => setAbertoId(a.id)} className="hover:bg-bg cursor-pointer">
                      <td className="px-4 py-3">
                        <button type="button" className="text-text cursor-pointer text-left font-medium">
                          {a.nome}
                        </button>
                        <p className="text-text-muted text-xs">{a.turma?.nome ?? "Sem turma"}</p>
                      </td>
                      <td className="text-text-secondary px-4 py-3">
                        {a.responsaveis.length === 0 && <span className="text-text-muted">—</span>}
                        {a.responsaveis.map((r) => (
                          <p key={r.id} className="whitespace-nowrap">
                            {r.nome}
                            {r.telefone && <span className="text-text-muted"> · {r.telefone}</span>}
                          </p>
                        ))}
                      </td>
                      <td className={`px-4 py-3 text-right whitespace-nowrap ${a.atrasadoCentavos ? "text-danger font-semibold" : "text-text-muted"}`}>
                        {a.atrasadoCentavos ? reais(a.atrasadoCentavos) : "—"}
                      </td>
                      <td className="text-text px-4 py-3 text-right whitespace-nowrap">
                        {a.aVencerCentavos ? reais(a.aVencerCentavos) : <span className="text-text-muted">—</span>}
                      </td>
                      <td className="text-text-secondary px-4 py-3 whitespace-nowrap">
                        {a.proximoVencimento ? dataBr(a.proximoVencimento) : <span className="text-text-muted">—</span>}
                      </td>
                      <td className="px-2 py-3">
                        <ChevronRight className="text-text-muted size-4" aria-hidden />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Cartao>
          )}
        </>
      )}
    </>
  );
}

function Total({ rotulo, valor, detalhe, perigo }: { rotulo: string; valor: number; detalhe: string; perigo?: boolean }) {
  return (
    <Cartao className="p-5">
      <p className="text-text-secondary text-sm">{rotulo}</p>
      <p className={`mt-1 text-2xl font-bold ${perigo ? "text-danger" : "text-text"}`}>{reais(valor)}</p>
      <p className="text-text-muted mt-1 text-xs">{detalhe}</p>
    </Cartao>
  );
}

/* ───────────────────────────── Extrato ───────────────────────────── */

/** Cobranças de um aluno. Com `equipe`, permite dar baixa, editar e cancelar. */
function Extrato({
  alunoId,
  equipe,
  versao,
  aoMudar,
  acao,
  contatos,
}: {
  alunoId: string;
  equipe: boolean;
  /** Muda quando alguém de fora lançou uma cobrança: busca de novo. */
  versao?: number;
  /** Algo mudou (baixa, edição…): quem lista os alunos precisa recarregar. */
  aoMudar?: () => void;
  acao?: React.ReactNode;
  contatos?: ResumoFinanceiro["alunos"][number]["responsaveis"];
}) {
  const extrato = useApi<ExtratoAluno>(`/financeiro/alunos/${alunoId}`);
  const [erro, setErro] = useState<string | null>(null);
  /** Cobrança com um formulário aberto (baixa ou edição). */
  const [acaoAberta, setAcaoAberta] = useState<{ id: string; modo: "baixa" | "editar" } | null>(null);
  const aceitar = useConfirmar();
  const { recarregar } = extrato;
  useEffect(() => {
    if (versao) recarregar();
  }, [versao, recarregar]);

  async function executar(chamada: () => Promise<unknown>) {
    setErro(null);
    try {
      await chamada();
      setAcaoAberta(null);
      recarregar();
      aoMudar?.();
    } catch (err) {
      setErro((err as Error).message);
    }
  }

  async function desfazerBaixa(c: Cobranca) {
    const ok = await aceitar({
      titulo: "Desfazer a baixa?",
      mensagem: <>“{c.descricao}” ({reais(c.valorCentavos)}) volta a constar como não paga.</>,
      confirmar: "Desfazer baixa",
      perigo: true,
    });
    if (ok) await executar(() => api(`/financeiro/cobrancas/${c.id}/pagamento`, { method: "DELETE" }));
  }

  async function alternarCancelada(c: Cobranca) {
    const cancelar = c.situacao !== "cancelada";
    const ok = await aceitar({
      titulo: cancelar ? "Cancelar esta cobrança?" : "Reativar esta cobrança?",
      mensagem: cancelar ? (
        <>“{c.descricao}” ({reais(c.valorCentavos)}) sai das somas e a família deixa de vê-la. Você pode reativar depois.</>
      ) : (
        <>“{c.descricao}” volta a valer e a aparecer para a família.</>
      ),
      confirmar: cancelar ? "Cancelar cobrança" : "Reativar",
      perigo: cancelar,
    });
    if (ok) await executar(() => api(`/financeiro/cobrancas/${c.id}`, { method: "PATCH", body: { cancelada: cancelar } }));
  }

  if (extrato.erro) return <Erro mensagem={extrato.erro} />;
  if (!extrato.dados) return <Carregando />;
  const { aluno, totais, cobrancas, hoje } = extrato.dados;

  return (
    <>
      <Cartao className="mb-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-text text-lg font-semibold">{aluno.nome}</h2>
            <p className="text-text-muted text-sm">
              {aluno.turma?.nome ?? "Sem turma"}
              {aluno.matricula && ` · Matrícula ${aluno.matricula}`}
            </p>
            {contatos && contatos.length > 0 && (
              <p className="text-text-secondary mt-2 text-sm">
                {contatos.map((r) => `${r.nome}${r.telefone ? `: ${r.telefone}` : ""}`).join(" · ")}
              </p>
            )}
          </div>
          {acao}
        </div>
        <dl className="border-border mt-4 grid grid-cols-3 gap-4 border-t pt-4">
          {(
            [
              ["Em atraso", totais.atrasadoCentavos, totais.atrasadoCentavos > 0 ? "text-danger" : "text-text"],
              ["A vencer", totais.aVencerCentavos, "text-text"],
              ["Pago", totais.pagoCentavos, "text-success"],
            ] as const
          ).map(([rotulo, valor, cor]) => (
            <div key={rotulo}>
              <dt className="text-text-muted text-xs">{rotulo}</dt>
              <dd className={`text-base font-semibold sm:text-lg ${cor}`}>{reais(valor)}</dd>
            </div>
          ))}
        </dl>
      </Cartao>

      {erro && (
        <div className="mb-4">
          <Erro mensagem={erro} />
        </div>
      )}

      {cobrancas.length === 0 ? (
        <Cartao>
          <Vazio
            icone={Wallet}
            titulo="Nenhuma cobrança lançada"
            texto={equipe ? "Use “Nova cobrança” para lançar a matrícula, as mensalidades ou uma compra." : undefined}
          />
        </Cartao>
      ) : (
        <Cartao>
          <ul className="divide-border divide-y">
            {cobrancas.map((c) => (
              <li key={c.id} className={`p-4 ${c.situacao === "cancelada" ? "opacity-60" : ""}`}>
                <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-text font-medium">{c.descricao}</p>
                      <Etiqueta>{NOME_TIPO_COBRANCA[c.tipo]}</Etiqueta>
                      <Etiqueta tom={TOM_SITUACAO[c.situacao]}>{NOME_SITUACAO[c.situacao]}</Etiqueta>
                    </div>
                    <p className="text-text-muted mt-1 text-xs">
                      {c.pagoEm
                        ? `Paga em ${dataBr(c.pagoEm)}${c.formaPagamento ? ` · ${NOME_FORMA_PAGAMENTO[c.formaPagamento]}` : ""} · vencia em ${dataBr(c.vencimento)}`
                        : `${c.situacao === "atrasada" ? "Venceu" : "Vence"} em ${dataBr(c.vencimento)}`}
                    </p>
                    {equipe && c.observacao && <p className="text-text-secondary mt-1 text-xs">Anotação: {c.observacao}</p>}
                  </div>
                  <p className={`text-base font-semibold whitespace-nowrap ${c.situacao === "atrasada" ? "text-danger" : "text-text"}`}>
                    {reais(c.valorCentavos)}
                  </p>
                </div>

                {equipe && acaoAberta?.id !== c.id && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(c.situacao === "pendente" || c.situacao === "atrasada") && (
                      <>
                        <Botao onClick={() => setAcaoAberta({ id: c.id, modo: "baixa" })}>
                          <Check className="size-4" aria-hidden />
                          Dar baixa
                        </Botao>
                        <Botao variante="secundario" onClick={() => setAcaoAberta({ id: c.id, modo: "editar" })}>
                          Editar
                        </Botao>
                      </>
                    )}
                    {c.situacao === "paga" && (
                      <Botao variante="secundario" onClick={() => desfazerBaixa(c)}>
                        Desfazer baixa
                      </Botao>
                    )}
                    {c.situacao !== "paga" && (
                      <Botao
                        variante={c.situacao === "cancelada" ? "secundario" : "perigo"}
                        onClick={() => alternarCancelada(c)}
                      >
                        {c.situacao === "cancelada" ? "Reativar" : "Cancelar"}
                      </Botao>
                    )}
                  </div>
                )}

                {acaoAberta?.id === c.id && acaoAberta.modo === "baixa" && (
                  <FormBaixa
                    hoje={hoje}
                    aoFechar={() => setAcaoAberta(null)}
                    aoSalvar={(body) => executar(() => api(`/financeiro/cobrancas/${c.id}/pagamento`, { method: "POST", body }))}
                  />
                )}
                {acaoAberta?.id === c.id && acaoAberta.modo === "editar" && (
                  <FormEdicao
                    cobranca={c}
                    aoFechar={() => setAcaoAberta(null)}
                    aoSalvar={(body) => executar(() => api(`/financeiro/cobrancas/${c.id}`, { method: "PATCH", body }))}
                  />
                )}
              </li>
            ))}
          </ul>
        </Cartao>
      )}
    </>
  );
}

function FormBaixa({
  hoje,
  aoFechar,
  aoSalvar,
}: {
  hoje: string;
  aoFechar: () => void;
  aoSalvar: (body: { pagoEm: string; formaPagamento: FormaPagamento }) => Promise<void>;
}) {
  const [pagoEm, setPagoEm] = useState(hoje);
  const [forma, setForma] = useState<FormaPagamento>("pix");
  const [salvando, setSalvando] = useState(false);
  return (
    <form
      className="bg-bg mt-3 flex flex-wrap items-end gap-3 rounded-lg p-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setSalvando(true);
        await aoSalvar({ pagoEm, formaPagamento: forma });
        setSalvando(false);
      }}
    >
      <div className="w-44">
        <Campo rotulo="Recebido em" type="date" required max={hoje} value={pagoEm} onChange={(e) => setPagoEm(e.target.value)} />
      </div>
      <div className="w-44">
        <Campo tipo="select" rotulo="Forma de pagamento" value={forma} onChange={(e) => setForma(e.target.value as FormaPagamento)}>
          {FORMAS.map((f) => (
            <option key={f} value={f}>
              {NOME_FORMA_PAGAMENTO[f]}
            </option>
          ))}
        </Campo>
      </div>
      <Botao type="submit" carregando={salvando}>
        Confirmar baixa
      </Botao>
      <Botao type="button" variante="fantasma" onClick={aoFechar}>
        Cancelar
      </Botao>
    </form>
  );
}

function FormEdicao({
  cobranca: c,
  aoFechar,
  aoSalvar,
}: {
  cobranca: Cobranca;
  aoFechar: () => void;
  aoSalvar: (body: Record<string, unknown>) => Promise<void>;
}) {
  const [tipo, setTipo] = useState(c.tipo);
  const [descricao, setDescricao] = useState(c.descricao);
  const [valor, setValor] = useState((c.valorCentavos / 100).toFixed(2).replace(".", ","));
  const [vencimento, setVencimento] = useState(c.vencimento);
  const [observacao, setObservacao] = useState(c.observacao ?? "");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  return (
    <form
      className="bg-bg mt-3 space-y-3 rounded-lg p-3"
      onSubmit={async (e) => {
        e.preventDefault();
        const valorCentavos = lerReais(valor);
        if (!valorCentavos) return setErro("Informe o valor, por exemplo 850,00.");
        setErro(null);
        setSalvando(true);
        await aoSalvar({ tipo, descricao, valorCentavos, vencimento, observacao });
        setSalvando(false);
      }}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Campo rotulo="Descrição" required maxLength={150} value={descricao} onChange={(e) => setDescricao(e.target.value)} />
        <Campo tipo="select" rotulo="Tipo" value={tipo} onChange={(e) => setTipo(e.target.value as TipoCobranca)}>
          {TIPOS.map((t) => (
            <option key={t} value={t}>
              {NOME_TIPO_COBRANCA[t]}
            </option>
          ))}
        </Campo>
        <Campo rotulo="Valor (R$)" required inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} />
        <Campo rotulo="Vencimento" type="date" required value={vencimento} onChange={(e) => setVencimento(e.target.value)} />
      </div>
      <Campo
        rotulo="Anotação interna"
        maxLength={500}
        value={observacao}
        onChange={(e) => setObservacao(e.target.value)}
        ajuda="A família não vê."
      />
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

/* ─────────────────────────── Nova cobrança ─────────────────────────── */

function NovaCobranca({
  resumo,
  alunoFixoId,
  aoFechar,
  aoCriar,
}: {
  resumo: ResumoFinanceiro;
  /** Lançando a partir do extrato de um aluno: o destino já está escolhido. */
  alunoFixoId?: string;
  aoFechar: () => void;
  aoCriar: () => void;
}) {
  const [destino, setDestino] = useState<"aluno" | "turma">("aluno");
  const [alunoId, setAlunoId] = useState(alunoFixoId ?? "");
  const [turmaId, setTurmaId] = useState("");
  const [tipo, setTipo] = useState<TipoCobranca>("mensalidade");
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [vencimento, setVencimento] = useState("");
  const [parcelas, setParcelas] = useState("1");
  const [observacao, setObservacao] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const aceitar = useConfirmar();

  const alunoFixo = resumo.alunos.find((a) => a.id === alunoFixoId);
  const n = Math.max(1, Number(parcelas) || 1);
  const valorCentavos = lerReais(valor);
  const paraQuem =
    destino === "turma"
      ? `todos os alunos da turma ${resumo.turmas.find((t) => t.id === turmaId)?.nome ?? ""}`
      : (resumo.alunos.find((a) => a.id === alunoId)?.nome ?? "");

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!valorCentavos) return setErro("Informe o valor, por exemplo 850,00.");
    if (destino === "aluno" ? !alunoId : !turmaId) return setErro(destino === "aluno" ? "Escolha o aluno." : "Escolha a turma.");
    setErro(null);
    const ok = await aceitar({
      titulo: n > 1 ? `Lançar ${n} cobranças mensais?` : "Lançar esta cobrança?",
      mensagem: (
        <>
          {NOME_TIPO_COBRANCA[tipo]} de <strong>{reais(valorCentavos)}</strong>
          {n > 1 && <> por mês, {n} parcelas ({reais(valorCentavos * n)} no total)</>} para <strong>{paraQuem}</strong>,
          {n > 1 ? " a primeira vencendo em " : " vencendo em "}
          {dataBr(vencimento)}.
        </>
      ),
      confirmar: "Lançar",
    });
    if (!ok) return;
    setSalvando(true);
    try {
      await api("/financeiro/cobrancas", {
        method: "POST",
        body: {
          ...(destino === "aluno" ? { alunoId } : { turmaId }),
          tipo,
          descricao: descricao.trim() || undefined,
          valorCentavos,
          vencimento,
          parcelas: n,
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
        <h2 className="text-text font-semibold">Nova cobrança{alunoFixo && ` para ${alunoFixo.nome}`}</h2>
        <button type="button" onClick={aoFechar} aria-label="Fechar" className="text-text-muted hover:text-text cursor-pointer rounded-lg p-1.5">
          <X className="size-4" />
        </button>
      </div>
      <form onSubmit={salvar} className="space-y-4">
        {!alunoFixo && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Campo tipo="select" rotulo="Para" value={destino} onChange={(e) => setDestino(e.target.value as "aluno" | "turma")}>
              <option value="aluno">Um aluno</option>
              <option value="turma">Turma inteira</option>
            </Campo>
            {destino === "aluno" ? (
              <Campo tipo="select" rotulo="Aluno" required value={alunoId} onChange={(e) => setAlunoId(e.target.value)}>
                <option value="">Escolha…</option>
                {resumo.alunos.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nome}
                    {a.turma ? ` (${a.turma.nome})` : ""}
                  </option>
                ))}
              </Campo>
            ) : (
              <Campo tipo="select" rotulo="Turma" required value={turmaId} onChange={(e) => setTurmaId(e.target.value)}>
                <option value="">Escolha…</option>
                {resumo.turmas.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nome}
                  </option>
                ))}
              </Campo>
            )}
          </div>
        )}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo
            tipo="select"
            rotulo="Tipo"
            value={tipo}
            onChange={(e) => {
              const novo = e.target.value as TipoCobranca;
              setTipo(novo);
              // Mensalidade costuma ser o ano todo; o resto, uma cobrança só.
              if (novo !== "mensalidade") setParcelas("1");
            }}
          >
            {TIPOS.map((t) => (
              <option key={t} value={t}>
                {NOME_TIPO_COBRANCA[t]}
              </option>
            ))}
          </Campo>
          <Campo
            rotulo="Descrição (opcional)"
            maxLength={130}
            placeholder={tipo === "mensalidade" ? "Mensalidade de março" : tipo === "uniforme" ? "Camiseta tam. 10" : NOME_TIPO_COBRANCA[tipo]}
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            ajuda={tipo === "mensalidade" ? "Em branco: “Mensalidade de” + o mês do vencimento." : "Em branco: o nome do tipo."}
          />
          <Campo
            rotulo={n > 1 ? "Valor de cada parcela (R$)" : "Valor (R$)"}
            required
            inputMode="decimal"
            placeholder="850,00"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
          />
          <Campo
            rotulo={n > 1 ? "Vencimento da 1ª parcela" : "Vencimento"}
            type="date"
            required
            value={vencimento}
            onChange={(e) => setVencimento(e.target.value)}
          />
          <Campo
            rotulo="Parcelas mensais"
            type="number"
            min={1}
            max={24}
            required
            value={parcelas}
            onChange={(e) => setParcelas(e.target.value)}
            ajuda={
              n > 1 && valorCentavos
                ? `${n} cobranças, uma por mês: ${reais(valorCentavos * n)} no total.`
                : "Ex.: 12 para lançar as mensalidades do ano de uma vez."
            }
          />
          <Campo
            rotulo="Anotação interna (opcional)"
            maxLength={500}
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            ajuda="A família não vê."
          />
        </div>
        {erro && <Erro mensagem={erro} />}
        <div className="flex flex-wrap gap-2">
          <Botao type="submit" carregando={salvando}>
            Lançar cobrança
          </Botao>
          <Botao type="button" variante="fantasma" onClick={aoFechar}>
            Cancelar
          </Botao>
        </div>
      </form>
    </Cartao>
  );
}
