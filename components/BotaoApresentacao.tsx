"use client";

import { Play, X } from "lucide-react";
import { useRef } from "react";
import { Botao } from "@/components/ui";

/** Botão que abre o vídeo de apresentação do app; o vídeo só carrega quando alguém abre. */
export default function BotaoApresentacao({ className = "" }: { className?: string }) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const video = useRef<HTMLVideoElement>(null);

  function abrir() {
    dialogo.current?.showModal();
    video.current?.play().catch(() => {});
  }

  return (
    <>
      <Botao type="button" variante="secundario" onClick={abrir} className={className}>
        <Play className="size-4" aria-hidden />
        Apresentação
      </Botao>
      <dialog
        ref={dialogo}
        aria-label="Apresentação do MuralFlow"
        onClose={() => video.current?.pause()}
        onClick={(e) => e.target === e.currentTarget && dialogo.current?.close()}
        className="bg-surface border-border m-auto w-[calc(100%-2rem)] max-w-4xl rounded-xl border p-0 shadow-xl backdrop:bg-black/70"
      >
        <div className="flex items-center justify-between px-4 py-2">
          <h2 className="text-text text-sm font-semibold">Apresentação do MuralFlow</h2>
          <Botao variante="fantasma" aria-label="Fechar" className="px-2" onClick={() => dialogo.current?.close()}>
            <X className="size-4" aria-hidden />
          </Botao>
        </div>
        <video ref={video} src="/apresentacao.mp4" controls playsInline preload="none" className="block w-full bg-black" />
      </dialog>
    </>
  );
}
