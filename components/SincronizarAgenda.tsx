"use client";

import { CalendarSync, Check, Copy, ExternalLink, RefreshCw, X } from "lucide-react";
import { useState } from "react";
import { useConfirmar } from "@/components/Confirmacao";
import { Botao, Cartao, Erro } from "@/components/ui";
import { api, API_URL } from "@/lib/api";
import { useApi } from "@/lib/use-api";

/**
 * Assinatura da agenda: um link secreto (.ics) que o Google Calendar, o
 * Outlook ou o iPhone consultam sozinhos. Só da escola para lá: o que muda
 * aqui aparece lá em algumas horas (o intervalo é o app de calendário que
 * decide).
 */
export function SincronizarAgenda({ aoFechar }: { aoFechar: () => void }) {
  const { dados, erro, setDados } = useApi<{ token: string }>("/agenda/assinatura");
  const [copiado, setCopiado] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [acaoErro, setAcaoErro] = useState<string | null>(null);
  const aceitar = useConfirmar();

  const link = dados ? `${API_URL}/agenda/ics/${dados.token}.ics` : null;
  const webcal = link?.replace(/^https?:/, "webcal:");
  const google = webcal ? `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal)}` : null;
  // O Google busca o arquivo dos servidores dele: localhost não funciona.
  const local = /\/\/(localhost|127\.0\.0\.1)/.test(API_URL);

  async function copiar() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      setAcaoErro("Não deu para copiar. Selecione o link e copie manualmente.");
    }
  }

  async function gerarNovo() {
    const ok = await aceitar({
      titulo: "Gerar um link novo?",
      mensagem:
        "O link atual para de funcionar: quem já assinou (você, em outros aparelhos) precisa adicionar a agenda de novo. Use se o link foi compartilhado sem querer.",
      confirmar: "Gerar link novo",
      perigo: true,
    });
    if (!ok) return;
    setAcaoErro(null);
    setGerando(true);
    try {
      setDados(await api<{ token: string }>("/agenda/assinatura", { method: "POST" }));
    } catch (err) {
      setAcaoErro((err as Error).message);
    } finally {
      setGerando(false);
    }
  }

  return (
    <Cartao className="mb-6 p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="bg-primary-subtle text-primary rounded-lg p-2.5">
            <CalendarSync className="size-5" aria-hidden />
          </span>
          <div>
            <h2 className="text-text font-semibold">Ver a agenda no Google Calendar</h2>
            <p className="text-text-secondary mt-1 max-w-2xl text-sm">
              Provas, reuniões, eventos e aniversários aparecem na sua agenda do Google e se atualizam sozinhos. O que
              mudar aqui chega lá em algumas horas.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={aoFechar}
          aria-label="Fechar"
          className="text-text-muted hover:text-text cursor-pointer rounded-lg p-1.5"
        >
          <X className="size-4" />
        </button>
      </div>

      {erro && (
        <div className="mt-4">
          <Erro mensagem={erro} />
        </div>
      )}

      {link && google && (
        <div className="mt-5 space-y-4">
          {local && (
            <p className="bg-warning-subtle text-warning rounded-lg px-3 py-2 text-sm">
              A API está rodando em localhost: o Google não consegue acessá-la. Teste a sincronização no site
              publicado.
            </p>
          )}
          <a
            href={google}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-primary-solid hover:bg-primary-solid-hover inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white"
          >
            <ExternalLink className="size-4" aria-hidden />
            Adicionar ao Google Calendar
          </a>

          <div>
            <p className="text-text text-sm font-medium">Outlook, iPhone ou outro app</p>
            <p className="text-text-muted mb-2 text-xs">
              Copie o link e use a opção “Adicionar calendário da internet” (ou “Assinar calendário”) do app.
            </p>
            <div className="flex flex-wrap gap-2">
              <input
                readOnly
                value={link}
                aria-label="Link da agenda"
                onFocus={(e) => e.currentTarget.select()}
                className="bg-bg border-border text-text-secondary min-w-0 flex-1 rounded-lg border px-3 py-2 font-mono text-xs"
              />
              <Botao variante="secundario" onClick={copiar}>
                {copiado ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
                {copiado ? "Copiado!" : "Copiar link"}
              </Botao>
            </div>
          </div>

          <div className="border-border flex flex-wrap items-center justify-between gap-2 border-t pt-4">
            <p className="text-text-muted max-w-xl text-xs">
              O link é pessoal: quem tiver ele vê a sua agenda. Não compartilhe.
            </p>
            <Botao variante="fantasma" onClick={gerarNovo} carregando={gerando}>
              {!gerando && <RefreshCw className="size-4" aria-hidden />}
              Gerar link novo
            </Botao>
          </div>
          {acaoErro && <Erro mensagem={acaoErro} />}
        </div>
      )}
    </Cartao>
  );
}
