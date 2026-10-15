"use client";

import { ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Logo from "@/components/Logo";
import { Botao, Campo, Cartao } from "@/components/ui";

/** Página pública: digitar o código impresso numa declaração. */
export default function Verificar() {
  const router = useRouter();
  const [codigo, setCodigo] = useState("");
  const limpo = codigo.toUpperCase().replace(/[^0-9A-Z]/g, "");

  return (
    <main className="flex min-h-dvh flex-col items-center px-4 py-12">
      <Logo />
      <Cartao className="mt-8 w-full max-w-md p-6">
        <div className="mb-4 flex items-center gap-3">
          <span className="bg-primary-subtle text-primary rounded-lg p-2.5">
            <ShieldCheck className="size-5" aria-hidden />
          </span>
          <h1 className="text-text text-lg font-semibold">Verificar declaração</h1>
        </div>
        <p className="text-text-secondary mb-4 text-sm">
          Digite o código de verificação impresso no rodapé da declaração para conferir se ela foi emitida pela escola.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (limpo.length === 12) router.push(`/verificar/${limpo}`);
          }}
          className="space-y-4"
        >
          <Campo
            rotulo="Código de verificação"
            required
            placeholder="XXXX-XXXX-XXXX"
            autoComplete="off"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            ajuda={limpo.length > 0 && limpo.length !== 12 ? "O código tem 12 letras e números." : undefined}
          />
          <Botao type="submit" disabled={limpo.length !== 12} className="w-full">
            Verificar
          </Botao>
        </form>
      </Cartao>
    </main>
  );
}
