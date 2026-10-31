"use client";

import { urlDoLogo } from "@/lib/escola";
import type { EscolaNaLista } from "@/lib/tipos";

/** "Colégio São José" → "colegio-sao-jose" */
export const slugDe = (nome: string) =>
  nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/, "");

/** Quadradinho com o logo da escola ou, sem logo, a inicial na cor dela. */
export function MarcaDaEscola({ escola, tamanho = "md" }: { escola: Pick<EscolaNaLista, "nome" | "cor" | "logo">; tamanho?: "md" | "lg" }) {
  const logo = urlDoLogo(escola.logo);
  const caixa = tamanho === "lg" ? "size-16 text-2xl" : "size-11 text-lg";
  if (logo) {
    // Logo largo (com o nome escrito) ganha largura em vez de encolher num quadrado.
    const altura = tamanho === "lg" ? "h-16 max-w-48" : "h-11 max-w-32";
    return (
      // eslint-disable-next-line @next/next/no-img-element -- imagem da API, já otimizada no upload.
      <img src={logo} alt="" className={`${altura} bg-surface border-border w-auto shrink-0 rounded-lg border object-contain p-1.5`} />
    );
  }
  return (
    <span
      className={`${caixa} flex shrink-0 items-center justify-center rounded-lg font-bold text-white`}
      style={{ background: escola.cor ?? "var(--color-primary-solid)" }}
      aria-hidden
    >
      {escola.nome.trim().charAt(0).toUpperCase()}
    </span>
  );
}
