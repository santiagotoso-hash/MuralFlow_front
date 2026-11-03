"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";
import { escolherTema, lerTema, observarTema, type Tema } from "@/lib/tema";

const escuroAgora = () => document.documentElement.dataset.theme === "dark";

/** A escolha do tema e se a tela está escura agora (no servidor: "sistema", claro). */
export function useTema() {
  const tema = useSyncExternalStore(observarTema, lerTema, () => "sistema" as Tema);
  const escuro = useSyncExternalStore(observarTema, escuroAgora, () => false);
  return { tema, escuro, escolher: escolherTema };
}

/** Botão de sol/lua: alterna entre claro e escuro (a escolha completa fica no Perfil). */
export function BotaoTema({ className = "" }: { className?: string }) {
  const { escuro, escolher } = useTema();
  const rotulo = escuro ? "Usar o modo claro" : "Usar o modo escuro";
  return (
    <button
      type="button"
      onClick={() => escolher(escuro ? "claro" : "escuro")}
      aria-label={rotulo}
      title={rotulo}
      className={`text-text-muted hover:text-text cursor-pointer rounded-lg p-2 ${className}`}
    >
      {escuro ? <Sun className="size-5" aria-hidden /> : <Moon className="size-5" aria-hidden />}
    </button>
  );
}

const OPCOES: { valor: Tema; rotulo: string; icone: typeof Sun }[] = [
  { valor: "claro", rotulo: "Claro", icone: Sun },
  { valor: "escuro", rotulo: "Escuro", icone: Moon },
  { valor: "sistema", rotulo: "Automático", icone: Monitor },
];

/** As três opções (Perfil). "Automático" segue o celular ou o computador. */
export function EscolhaDeTema() {
  const { tema, escolher } = useTema();
  return (
    <div role="radiogroup" aria-label="Aparência" className="bg-bg border-border inline-flex rounded-lg border p-1">
      {OPCOES.map(({ valor, rotulo, icone: Icone }) => (
        <button
          key={valor}
          type="button"
          role="radio"
          aria-checked={tema === valor}
          onClick={() => escolher(valor)}
          className={`inline-flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            tema === valor ? "bg-surface text-text shadow-sm" : "text-text-secondary hover:text-text"
          }`}
        >
          <Icone className="size-4" aria-hidden />
          {rotulo}
        </button>
      ))}
    </div>
  );
}
