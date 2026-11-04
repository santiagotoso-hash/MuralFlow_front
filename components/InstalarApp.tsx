"use client";

import { Check, Download, Share, SquarePlus, X } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Botao, Cartao } from "@/components/ui";
import {
  dispensa,
  ehCelular,
  ehIphone,
  estaInstalado,
  instalar,
  observarInstalacao,
  podeInstalar,
  registrarServiceWorker,
} from "@/lib/pwa";

type Situacao = "servidor" | "instalado" | "android" | "iphone" | "indisponivel";

/** Como está a instalação neste aparelho (no servidor ainda não se sabe). */
function situacaoAgora(): Situacao {
  if (estaInstalado()) return "instalado";
  if (ehIphone()) return "iphone";
  if (podeInstalar()) return "android";
  return "indisponivel";
}

function useSituacao() {
  return useSyncExternalStore(observarInstalacao, situacaoAgora, () => "servidor" as Situacao);
}

/** Registra o service worker uma vez (fica no layout raiz). */
export function RegistrarPwa() {
  useEffect(() => registrarServiceWorker(), []);
  return null;
}

function PassosDoIphone() {
  return (
    <>
      Toque em <Share className="inline size-4 align-[-3px]" aria-label="Compartilhar" /> <strong>Compartilhar</strong> e depois em{" "}
      <SquarePlus className="inline size-4 align-[-3px]" aria-hidden /> <strong>Adicionar à Tela de Início</strong>.
    </>
  );
}

/**
 * Convite para instalar no celular: botão no Android; no iPhone, o passo a
 * passo do Safari (a Apple não deixa o site abrir a instalação). Some quando o
 * app já está instalado e, com "Agora não", por 14 dias.
 */
export function ConviteInstalar({ className = "" }: { className?: string }) {
  const situacao = useSituacao();
  const [dispensado, setDispensado] = useState(false);
  const [jaDispensado] = useState(() => typeof window !== "undefined" && dispensa.ativa());

  if (dispensado || jaDispensado) return null;
  if (situacao !== "android" && situacao !== "iphone") return null;
  if (typeof window !== "undefined" && !ehCelular()) return null;

  function agoraNao() {
    dispensa.marcar();
    setDispensado(true);
  }

  return (
    <aside
      aria-label="Instalar o app"
      className={`bg-surface border-border flex items-center gap-3 rounded-xl border p-3 shadow-sm ${className}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- ícone fixo do app. */}
      <img src="/icons/icon-192.png" alt="" width={40} height={40} className="shrink-0 rounded-lg" />
      <div className="min-w-0 flex-1 text-sm">
        <p className="text-text font-semibold">Instale o app do PassaRecado</p>
        <p className="text-text-secondary text-xs">
          {situacao === "iphone" ? <PassosDoIphone /> : "Abre direto no app, em tela cheia, como os outros do celular."}
        </p>
      </div>
      {situacao === "android" && (
        <Botao onClick={() => instalar().then((ok) => ok && setDispensado(true))} className="shrink-0 px-3">
          Instalar
        </Botao>
      )}
      <button
        type="button"
        onClick={agoraNao}
        aria-label="Agora não"
        title="Agora não"
        className="text-text-muted hover:text-text shrink-0 cursor-pointer rounded-lg p-1"
      >
        <X className="size-5" aria-hidden />
      </button>
    </aside>
  );
}

/** No Perfil: sempre à mão, mesmo depois de "Agora não". */
export function InstalarNoPerfil() {
  const situacao = useSituacao();
  return (
    <Cartao className="mt-6 max-w-xl p-6">
      <h2 className="text-text font-semibold">App no celular</h2>
      <div className="text-text-secondary mt-1 text-sm">
        {situacao === "instalado" && (
          <p className="text-success inline-flex items-center gap-1.5">
            <Check className="size-4" aria-hidden />
            Você já está usando o app instalado.
          </p>
        )}
        {situacao === "android" && (
          <>
            <p className="mb-4">Instale o PassaRecado: ele abre direto, em tela cheia, como os outros apps do aparelho.</p>
            <Botao onClick={() => void instalar()}>
              <Download className="size-4" aria-hidden />
              Instalar o app
            </Botao>
          </>
        )}
        {situacao === "iphone" && (
          <p>
            No Safari: <PassosDoIphone />
          </p>
        )}
        {(situacao === "indisponivel" || situacao === "servidor") && (
          <p>
            Abra o PassaRecado no navegador do celular. No Android, toque em <strong>Instalar</strong> (ou no menu ⋮ →{" "}
            <strong>Instalar app</strong>); no iPhone, no Safari, toque em <strong>Compartilhar</strong> →{" "}
            <strong>Adicionar à Tela de Início</strong>.
          </p>
        )}
      </div>
    </Cartao>
  );
}
