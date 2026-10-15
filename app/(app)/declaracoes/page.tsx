"use client";

import { FileDown, FileText, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useSessao } from "@/components/AuthProvider";
import { Botao, Cabecalho, Campo, Carregando, Cartao, Erro, Etiqueta, Vazio } from "@/components/ui";
import { api } from "@/lib/api";
import { baixarDeclaracao } from "@/lib/arquivos";
import {
  type Declaracao,
  DESCRICAO_TIPO_DECLARACAO,
  formatarCodigo,
  NOME_TIPO_DECLARACAO,
  type TipoDeclaracao,
} from "@/lib/declaracoes";
import type { Aluno } from "@/lib/tipos";
import { useApi } from "@/lib/use-api";

const TODOS: TipoDeclaracao[] = ["matricula", "frequencia", "quitacao"];

/** Endereço público de verificação de uma declaração (o mesmo impresso no PDF). */
const urlDeVerificacao = (codigo: string) => `${window.location.origin}/verificar/${formatarCodigo(codigo)}`;

export default function PaginaDeclaracoes() {
  const { usuario } = useSessao();
  const familia = usuario?.papel === "responsavel";
  const financeiro = usuario?.papel === "financeiro";
  // A família escolhe entre os filhos; direção e financeiro, entre todos os alunos.
  const alunos = useApi<Aluno[]>(usuario && !familia ? "/alunos" : null);
  const [alunoId, setAlunoId] = useState("");
  const [tipo, setTipo] = useState<TipoDeclaracao>(financeiro ? "quitacao" : "matricula");
  const [emitindo, setEmitindo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [ultima, setUltima] = useState<Declaracao | null>(null);
  const [versao, setVersao] = useState(0);

  if (!usuario) return null;
  if (usuario.papel === "professor") return <Erro mensagem="As declarações são emitidas pela direção e pelas famílias." />;

  const opcoes = familia ? (usuario.filhos ?? []) : (alunos.dados ?? []);
  const escolhido = alunoId || (opcoes.length === 1 ? opcoes[0].id : "");
  const tipos = financeiro ? (["quitacao"] as TipoDeclaracao[]) : TODOS;

  async function emitir() {
    if (!escolhido) return setErro("Escolha o aluno.");
    setErro(null);
    setEmitindo(true);
    try {
      const d = await api<Declaracao>("/declaracoes", { method: "POST", body: { alunoId: escolhido, tipo } });
      setUltima(d);
      setVersao((v) => v + 1);
      await baixarDeclaracao(d, urlDeVerificacao(d.codigo));
    } catch (err) {
      setErro((err as Error).message);
    } finally {
      setEmitindo(false);
    }
  }

  return (
    <>
      <Cabecalho
        titulo="Declarações"
        descricao="Emita declarações em PDF, prontas para entregar, com código de verificação."
      />

      <Cartao className="mb-6 p-5">
        {alunos.erro && <Erro mensagem={alunos.erro} />}
        {!familia && alunos.carregando && <Carregando />}
        {opcoes.length === 0 && !alunos.carregando ? (
          <Vazio icone={FileText} titulo="Nenhum aluno disponível" texto={familia ? "Peça à secretaria para vincular seus filhos à sua conta." : undefined} />
        ) : (
          <div className="space-y-5">
            <div className="max-w-md">
              <Campo
                tipo="select"
                rotulo="Aluno"
                value={escolhido}
                onChange={(e) => {
                  setAlunoId(e.target.value);
                  setUltima(null);
                }}
              >
                {opcoes.length > 1 && <option value="">Escolha…</option>}
                {opcoes.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nome}
                    {a.turma ? ` (${a.turma.nome})` : ""}
                  </option>
                ))}
              </Campo>
            </div>

            <fieldset>
              <legend className="text-text mb-2 text-sm font-medium">Tipo</legend>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                {tipos.map((t) => (
                  <label
                    key={t}
                    className={`cursor-pointer rounded-lg border p-4 ${
                      tipo === t ? "border-primary bg-primary-subtle" : "border-border hover:bg-bg"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <input type="radio" name="tipo" className="accent-primary-solid" checked={tipo === t} onChange={() => setTipo(t)} />
                      <span className="text-text text-sm font-semibold">{NOME_TIPO_DECLARACAO[t]}</span>
                    </span>
                    <span className="text-text-secondary mt-1 block text-xs">{DESCRICAO_TIPO_DECLARACAO[t]}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            {erro && <Erro mensagem={erro} />}
            <div className="flex flex-wrap items-center gap-3">
              <Botao onClick={emitir} carregando={emitindo} disabled={!escolhido}>
                {!emitindo && <FileDown className="size-4" aria-hidden />}
                Emitir e baixar PDF
              </Botao>
              {ultima && (
                <span className="text-success inline-flex items-center gap-1 text-sm">
                  <ShieldCheck className="size-4" aria-hidden />
                  Emitida · código {formatarCodigo(ultima.codigo)}
                </span>
              )}
            </div>
            <p className="text-text-muted text-xs">
              Cada declaração sai com um código. Quem a receber confere em{" "}
              <Link href="/verificar" className="text-primary font-medium">
                {typeof window !== "undefined" ? window.location.host : ""}/verificar
              </Link>{" "}
              se ela foi mesmo emitida pela escola.
            </p>
          </div>
        )}
      </Cartao>

      {usuario.papel === "admin" && <Emitidas versao={versao} />}
    </>
  );
}

/** As emitidas mais recentes (direção), com a opção de baixar de novo. */
function Emitidas({ versao }: { versao: number }) {
  const lista = useApi<Declaracao[]>(`/declaracoes?v=${versao}`);
  const [erro, setErro] = useState<string | null>(null);
  return (
    <section>
      <h2 className="text-text mb-3 font-semibold">Emitidas recentemente</h2>
      {(lista.erro ?? erro) && <Erro mensagem={(lista.erro ?? erro)!} />}
      {lista.carregando && <Carregando />}
      {lista.dados?.length === 0 && (
        <Cartao>
          <Vazio icone={FileText} titulo="Nenhuma declaração emitida ainda" />
        </Cartao>
      )}
      {lista.dados && lista.dados.length > 0 && (
        <Cartao className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-text-muted border-border border-b text-xs uppercase">
              <tr>
                <th className="px-4 py-3 font-medium">Aluno</th>
                <th className="px-4 py-3 font-medium">Tipo</th>
                <th className="px-4 py-3 font-medium">Código</th>
                <th className="px-4 py-3 font-medium">Emitida</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-border divide-y">
              {lista.dados.map((d) => (
                <tr key={d.codigo}>
                  <td className="text-text px-4 py-3 font-medium">{d.conteudo.aluno.nome}</td>
                  <td className="px-4 py-3">
                    <Etiqueta>{NOME_TIPO_DECLARACAO[d.tipo].replace(/^Declaração de /, "").replace(/ \(.*\)$/, "")}</Etiqueta>
                  </td>
                  <td className="text-text-secondary px-4 py-3 font-mono text-xs whitespace-nowrap">{formatarCodigo(d.codigo)}</td>
                  <td className="text-text-secondary px-4 py-3 text-xs whitespace-nowrap">
                    {new Date(d.emitidaEm).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" })}
                    {d.emitidaPor && <span className="text-text-muted block">por {d.emitidaPor}</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => baixarDeclaracao(d, urlDeVerificacao(d.codigo)).catch(() => setErro("Não foi possível gerar o PDF."))}
                      className="text-primary cursor-pointer text-sm font-medium whitespace-nowrap hover:underline"
                    >
                      Baixar de novo
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Cartao>
      )}
    </section>
  );
}
