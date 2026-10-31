"use client";

import { Campo } from "@/components/ui";
import type { EscolaCompleta } from "@/lib/tipos";

export type Institucionais = Pick<EscolaCompleta, "nome" | "cnpj" | "endereco" | "cidade" | "assinatura">;

/** Os campos que a direção e o superadmin editam (saem nas declarações e no recibo). */
export function CamposInstitucionais({
  valores,
  aoMudar,
}: {
  valores: Institucionais;
  aoMudar: (campo: keyof Institucionais, valor: string) => void;
}) {
  const campo = (c: keyof Institucionais) => ({
    value: valores[c] ?? "",
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => aoMudar(c, e.target.value),
  });
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Campo rotulo="Nome da escola" required minLength={3} maxLength={120} {...campo("nome")} />
      <Campo rotulo="CNPJ" maxLength={20} placeholder="12.345.678/0001-90" {...campo("cnpj")} />
      <div className="sm:col-span-2">
        <Campo rotulo="Endereço" maxLength={200} placeholder="Rua das Flores, 100 - Centro - São Paulo/SP" {...campo("endereco")} />
      </div>
      <Campo rotulo="Cidade" maxLength={60} ajuda="Sai em “São Paulo, 15 de outubro de 2026.” nas declarações." {...campo("cidade")} />
      <Campo
        rotulo="Assinatura das declarações"
        maxLength={120}
        placeholder="Ana Paula Ribeiro - Diretora"
        ajuda="Nome e cargo de quem assina."
        {...campo("assinatura")}
      />
    </div>
  );
}

/** Texto aparado; vazio vira null (a API apaga o campo). */
export const ouNulo = (v: string | null | undefined) => (v?.trim() ? v.trim() : null);
