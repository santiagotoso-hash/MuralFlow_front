"use client";

import { ShieldAlert, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import Logo from "@/components/Logo";
import { Cartao, Carregando } from "@/components/ui";
import { type Declaracao, formatarCodigo, localEData, NOME_TIPO_DECLARACAO, textoDaDeclaracao } from "@/lib/declaracoes";
import { useApi } from "@/lib/use-api";

/**
 * Resultado público da verificação: se o código existe, mostra exatamente o
 * que a declaração afirmou quando foi emitida.
 */
export default function ResultadoDaVerificacao() {
  const { codigo } = useParams<{ codigo: string }>();
  const limpo = decodeURIComponent(codigo ?? "").toUpperCase().replace(/[^0-9A-Z]/g, "");
  const declaracao = useApi<Declaracao>(limpo ? `/declaracoes/verificar/${limpo}` : null);

  return (
    <main className="flex min-h-dvh flex-col items-center px-4 py-12">
      <Logo />
      <Cartao className="mt-8 w-full max-w-2xl p-6">
        {declaracao.carregando && <Carregando texto="Verificando…" />}

        {declaracao.erro && (
          <div className="text-center">
            <span className="bg-danger-subtle text-danger mx-auto mb-3 inline-flex rounded-full p-3">
              <ShieldAlert className="size-6" aria-hidden />
            </span>
            <h1 className="text-text text-lg font-semibold">Declaração não encontrada</h1>
            <p className="text-text-secondary mt-1 text-sm">
              Nenhuma declaração foi emitida com o código <strong className="font-mono">{formatarCodigo(limpo)}</strong>. Confira se
              digitou certo. Se o código estiver correto, o documento não foi emitido por esta escola.
            </p>
          </div>
        )}

        {declaracao.dados && (
          <>
            <div className="mb-5 flex items-start gap-3">
              <span className="bg-success-subtle text-success rounded-full p-2.5">
                <ShieldCheck className="size-6" aria-hidden />
              </span>
              <div>
                <h1 className="text-text text-lg font-semibold">Declaração válida</h1>
                <p className="text-text-secondary text-sm">
                  {NOME_TIPO_DECLARACAO[declaracao.dados.tipo]} emitida por {declaracao.dados.conteudo.escola.nome} em{" "}
                  {new Date(declaracao.dados.emitidaEm).toLocaleString("pt-BR", {
                    timeZone: "America/Sao_Paulo",
                    dateStyle: "long",
                    timeStyle: "short",
                  })}
                  .
                </p>
              </div>
            </div>
            <div className="bg-bg border-border rounded-lg border p-5">
              <p className="text-text-muted mb-3 text-xs font-medium uppercase">O que ela declara</p>
              {textoDaDeclaracao(declaracao.dados).map((p) => (
                <p key={p} className="text-text mb-3 text-sm leading-relaxed">
                  {p}
                </p>
              ))}
              <p className="text-text-secondary text-right text-sm">{localEData(declaracao.dados)}</p>
            </div>
            <p className="text-text-muted mt-4 text-xs">
              Código {formatarCodigo(declaracao.dados.codigo)}. Compare com o documento que você recebeu: se o texto for diferente,
              o documento foi alterado.
            </p>
          </>
        )}
      </Cartao>
      <Link href="/verificar" className="text-primary mt-6 text-sm font-medium">
        Verificar outro código
      </Link>
    </main>
  );
}
