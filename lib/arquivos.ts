/** Arquivos gerados no navegador: planilha (CSV) e recibo (PDF). */

import { dataBr, NOME_FORMA_PAGAMENTO, NOME_TIPO_COBRANCA, reais } from "./formatar";
import type { Cobranca } from "./tipos";

/** Nome da escola nos recibos (cada instalação configura o seu). */
export const NOME_DA_ESCOLA = process.env.NEXT_PUBLIC_ESCOLA_NOME?.trim() || "MuralFlow";

function baixar(nome: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Planilha que o Excel em português abre direto: separador ";", vírgula
 * decimal e BOM (para os acentos). Campos com ; " ou quebra vão entre aspas.
 */
export function montarCsv(linhas: (string | number)[][]) {
  const campo = (v: string | number) => {
    const t = String(v);
    return /[;"\r\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
  };
  return "﻿" + linhas.map((l) => l.map(campo).join(";")).join("\r\n") + "\r\n";
}

export function baixarCsv(nome: string, linhas: (string | number)[][]) {
  baixar(nome, new Blob([montarCsv(linhas)], { type: "text/csv;charset=utf-8" }));
}

/** 125050 → "1250,50": número que a planilha entende (sem "R$" nem ponto de milhar). */
export const valorParaPlanilha = (centavos: number) => (centavos / 100).toFixed(2).replace(".", ",");

export interface DadosRecibo {
  cobranca: Cobranca;
  aluno: { nome: string; matricula: string | null; turma: string | null };
}

/** Número curto do recibo, a partir do id da cobrança. */
export const numeroDoRecibo = (cobrancaId: string) => cobrancaId.replace(/-/g, "").slice(0, 8).toUpperCase();

/** As linhas do recibo, na ordem em que aparecem (rótulo, valor). */
export function linhasDoRecibo({ cobranca: c, aluno }: DadosRecibo): [string, string][] {
  const recebido = c.valorPagoCentavos ?? c.valorCentavos;
  return [
    ["Aluno", aluno.nome],
    ["Turma", aluno.turma ?? "—"],
    ["Matrícula", aluno.matricula ?? "—"],
    ["Referente a", `${c.descricao} (${NOME_TIPO_COBRANCA[c.tipo]})`],
    ["Vencimento", dataBr(c.vencimento)],
    ["Valor da cobrança", reais(c.valorCentavos)],
    ["Valor recebido", reais(recebido)],
    ["Data do pagamento", c.pagoEm ? dataBr(c.pagoEm) : "—"],
    ["Forma de pagamento", c.formaPagamento ? NOME_FORMA_PAGAMENTO[c.formaPagamento] : "—"],
  ];
}

/**
 * Recibo de um pagamento, em PDF (A4). A biblioteca só é carregada quando
 * alguém pede um recibo. Usa a fonte padrão do PDF, que cobre os acentos
 * do português, por isso o texto fica só com caracteres comuns.
 */
export async function baixarRecibo(dados: DadosRecibo) {
  const { jsPDF } = await import("jspdf");
  const { cobranca: c, aluno } = dados;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const limpo = (t: string) => t.replace(/[  ]/g, " ").replace(/[“”]/g, '"').replace(/—/g, "-");
  const numero = numeroDoRecibo(c.id);
  const esquerda = 20;
  const direita = 190;
  let y = 24;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(limpo(NOME_DA_ESCOLA), esquerda, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Recibo n.º ${numero}`, direita, y, { align: "right" });
  y += 6;
  doc.setDrawColor(200);
  doc.line(esquerda, y, direita, y);

  y += 14;
  doc.setTextColor(0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("Recibo de pagamento", esquerda, y);

  y += 10;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  const frase = limpo(
    `Recebemos de ${aluno.nome} a quantia de ${reais(c.valorPagoCentavos ?? c.valorCentavos)}, referente a ${c.descricao}.`,
  );
  const quebrada = doc.splitTextToSize(frase, direita - esquerda) as string[];
  doc.text(quebrada, esquerda, y);
  y += quebrada.length * 6 + 6;

  for (const [rotulo, valor] of linhasDoRecibo(dados)) {
    doc.setTextColor(100);
    doc.setFontSize(10);
    doc.text(limpo(rotulo), esquerda, y);
    doc.setTextColor(0);
    doc.setFontSize(11);
    const linhas = doc.splitTextToSize(limpo(valor), direita - esquerda - 55) as string[];
    doc.text(linhas, esquerda + 55, y);
    y += Math.max(1, linhas.length) * 6 + 2;
    doc.setDrawColor(230);
    doc.line(esquerda, y - 3, direita, y - 3);
    y += 2;
  }

  y += 10;
  doc.setTextColor(100);
  doc.setFontSize(9);
  const emitido = new Date().toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
  doc.text(limpo(`Emitido em ${emitido} pelo MuralFlow.`), esquerda, y);
  y += 5;
  doc.text("Este recibo comprova o pagamento registrado pela escola e não substitui nota fiscal.", esquerda, y);

  const nomeArquivo = `recibo-${numero}-${aluno.nome.split(" ")[0].toLowerCase()}.pdf`.normalize("NFD").replace(/[̀-ͯ]/g, "");
  baixar(nomeArquivo, doc.output("blob"));
}
