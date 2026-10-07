"use client";

import { AlertTriangle, CircleHelp } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Botao } from "@/components/ui";

export interface PedidoConfirmacao {
  titulo: string;
  mensagem?: React.ReactNode;
  /** Texto do botão de confirmar (ex.: "Desativar"). Padrão: "Confirmar". */
  confirmar?: string;
  /** Ação destrutiva: botão vermelho e foco inicial em "Cancelar". */
  perigo?: boolean;
}

type Confirmar = (pedido: PedidoConfirmacao) => Promise<boolean>;

const Contexto = createContext<Confirmar | null>(null);

/**
 * Toda ação que muda dados pede aceitação antes:
 *
 *   const confirmar = useConfirmar();
 *   if (!(await confirmar({ titulo: "Desativar Maria?", perigo: true }))) return;
 */
export function useConfirmar() {
  const confirmar = useContext(Contexto);
  if (!confirmar) throw new Error("useConfirmar precisa do <ConfirmacaoProvider>");
  return confirmar;
}

export function ConfirmacaoProvider({ children }: { children: React.ReactNode }) {
  const [pedido, setPedido] = useState<PedidoConfirmacao | null>(null);
  const resolver = useRef<((ok: boolean) => void) | null>(null);
  const dialogo = useRef<HTMLDialogElement>(null);

  const confirmar = useCallback<Confirmar>(
    (p) =>
      new Promise<boolean>((resolve) => {
        resolver.current?.(false); // um pedido novo cancela o anterior
        resolver.current = resolve;
        setPedido(p);
      }),
    [],
  );

  const responder = useCallback((ok: boolean) => {
    resolver.current?.(ok);
    resolver.current = null;
    setPedido(null);
  }, []);

  // showModal: prende o foco no diálogo, Esc fecha e o foco volta ao botão de origem.
  useEffect(() => {
    const d = dialogo.current;
    if (pedido && d && !d.open) d.showModal();
    if (!pedido && d?.open) d.close();
  }, [pedido]);

  const Icone = pedido?.perigo ? AlertTriangle : CircleHelp;

  return (
    <Contexto.Provider value={confirmar}>
      {children}
      <dialog
        ref={dialogo}
        aria-labelledby="confirmacao-titulo"
        aria-describedby={pedido?.mensagem ? "confirmacao-mensagem" : undefined}
        onCancel={(e) => {
          e.preventDefault();
          responder(false);
        }}
        onClick={(e) => e.target === e.currentTarget && responder(false)}
        className="bg-surface text-text border-border m-auto w-[calc(100%-2rem)] max-w-md rounded-xl border p-0 shadow-xl backdrop:bg-black/40"
      >
        {pedido && (
          <div className="surgir p-6">
            <div className="flex gap-4">
              <span
                className={`h-fit shrink-0 rounded-full p-2.5 ${
                  pedido.perigo ? "bg-danger-subtle text-danger" : "bg-primary-subtle text-primary"
                }`}
              >
                <Icone className="size-5" aria-hidden />
              </span>
              <div className="min-w-0">
                <h2 id="confirmacao-titulo" className="text-text text-lg font-semibold">
                  {pedido.titulo}
                </h2>
                {pedido.mensagem && (
                  <div id="confirmacao-mensagem" className="text-text-secondary mt-1.5 text-sm">
                    {pedido.mensagem}
                  </div>
                )}
              </div>
            </div>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <Botao variante="secundario" autoFocus={pedido.perigo} onClick={() => responder(false)}>
                Cancelar
              </Botao>
              <Botao
                variante={pedido.perigo ? "perigoSolido" : "primario"}
                autoFocus={!pedido.perigo}
                onClick={() => responder(true)}
              >
                {pedido.confirmar ?? "Confirmar"}
              </Botao>
            </div>
          </div>
        )}
      </dialog>
    </Contexto.Provider>
  );
}
