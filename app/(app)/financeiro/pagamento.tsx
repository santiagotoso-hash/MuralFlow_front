"use client";

import { useState } from "react";
import { Botao, Campo, Cartao, Erro } from "@/components/ui";
import { centavosParaCampo, lerReais, NOME_FORMA_PAGAMENTO, reais } from "@/lib/formatar";
import type { FormaPagamento } from "@/lib/tipos";

export const FORMAS = Object.keys(NOME_FORMA_PAGAMENTO) as FormaPagamento[];

export interface DadosPagamento {
  pagoEm: string;
  formaPagamento: FormaPagamento;
  valorPagoCentavos: number;
}

/**
 * Registrar um pagamento: o que a escola recebeu de um aluno, ou o que
 * pagou de uma despesa. O valor vem preenchido com o cheio e pode ser
 * trocado (juros, multa, desconto).
 */
export function FormPagamento({
  hoje,
  valorCentavos,
  entrada,
  aoFechar,
  aoSalvar,
}: {
  /** "AAAA-MM-DD" de hoje em Brasília: a data não pode passar disso. */
  hoje: string;
  valorCentavos: number;
  /** true: a escola recebeu (aluno). false: a escola pagou (despesa). */
  entrada: boolean;
  aoFechar: () => void;
  aoSalvar: (dados: DadosPagamento) => Promise<void>;
}) {
  const [valor, setValor] = useState(centavosParaCampo(valorCentavos));
  const [pagoEm, setPagoEm] = useState(hoje);
  const [forma, setForma] = useState<FormaPagamento>("pix");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  return (
    <form
      className="bg-bg mt-3 rounded-lg p-3"
      onSubmit={async (e) => {
        e.preventDefault();
        const valorPagoCentavos = lerReais(valor);
        if (!valorPagoCentavos) return setErro("Informe o valor, por exemplo 850,00.");
        setErro(null);
        setSalvando(true);
        await aoSalvar({ pagoEm, formaPagamento: forma, valorPagoCentavos });
        setSalvando(false);
      }}
    >
      <div className="flex flex-wrap items-start gap-3">
        <div className="w-40">
          <Campo
            rotulo={entrada ? "Valor recebido (R$)" : "Valor pago (R$)"}
            required
            inputMode="decimal"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
          />
        </div>
        <div className="w-44">
          <Campo
            rotulo={entrada ? "Recebido em" : "Pago em"}
            type="date"
            required
            max={hoje}
            value={pagoEm}
            onChange={(e) => setPagoEm(e.target.value)}
          />
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
      </div>
      <p className="text-text-muted mt-2 text-xs">
        O valor vem preenchido com o total. Troque se {entrada ? "recebeu" : "pagou"} com juros, multa ou desconto.
      </p>
      {erro && (
        <div className="mt-3">
          <Erro mensagem={erro} />
        </div>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <Botao type="submit" carregando={salvando}>
          Confirmar pagamento
        </Botao>
        <Botao type="button" variante="fantasma" onClick={aoFechar}>
          Cancelar
        </Botao>
      </div>
    </form>
  );
}

/** Cartão de total (em atraso, a vencer, saldo…). */
export function Total({
  rotulo,
  valor,
  detalhe,
  tom,
}: {
  rotulo: string;
  valor: number;
  detalhe: string;
  tom?: "perigo" | "sucesso";
}) {
  const cor = tom === "perigo" ? "text-danger" : tom === "sucesso" ? "text-success" : "text-text";
  return (
    <Cartao className="p-5">
      <p className="text-text-secondary text-sm">{rotulo}</p>
      <p className={`mt-1 text-2xl font-bold ${cor}`}>{reais(valor)}</p>
      <p className="text-text-muted mt-1 text-xs">{detalhe}</p>
    </Cartao>
  );
}
