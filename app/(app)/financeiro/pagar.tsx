"use client";

import { Check, Copy, Landmark, QrCode, RefreshCw } from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { Botao, Campo, Carregando, Erro } from "@/components/ui";
import { api } from "@/lib/api";
import { centavosParaCampo, dataBr, lerReais, reais } from "@/lib/formatar";
import type { Cobranca, ComoPagar, ExtratoAluno } from "@/lib/tipos";
import { useApi } from "@/lib/use-api";

/** Botão que copia um texto e mostra "Copiado" por um instante. */
function BotaoCopiar({ texto, rotulo }: { texto: string; rotulo: string }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <Botao
      type="button"
      variante={copiado ? "secundario" : "primario"}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(texto);
        } catch {
          // Navegador sem permissão: o texto continua visível para copiar à mão.
          return;
        }
        setCopiado(true);
        setTimeout(() => setCopiado(false), 2500);
      }}
    >
      {copiado ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
      {copiado ? "Copiado!" : rotulo}
    </Botao>
  );
}

/** QR Code do PIX, sempre em preto no branco (o app do banco precisa ler). */
function QrDoPix({ codigo }: { codigo: string }) {
  const [imagem, setImagem] = useState<string | null>(null);
  useEffect(() => {
    let ativo = true;
    QRCode.toDataURL(codigo, { margin: 2, width: 240, errorCorrectionLevel: "M" })
      .then((url) => ativo && setImagem(url))
      .catch(() => ativo && setImagem(null));
    return () => {
      ativo = false;
    };
  }, [codigo]);
  if (!imagem) return <div className="size-[200px] rounded-lg bg-white" />;
  // eslint-disable-next-line @next/next/no-img-element -- data URL gerada aqui, sem otimização a fazer.
  return <img src={imagem} alt="QR Code do PIX" width={200} height={200} className="rounded-lg bg-white" />;
}

/**
 * Como pagar uma cobrança (família): QR Code e PIX copia e cola com o valor
 * exato, os dados para transferência e o "Avisar que paguei".
 */
export function PainelPagar({
  cobranca,
  aoAvisar,
  aoFechar,
}: {
  cobranca: Cobranca;
  aoAvisar: () => void;
  aoFechar: () => void;
}) {
  const dados = useApi<ComoPagar>(`/financeiro/cobrancas/${cobranca.id}/pagar`);
  const [recado, setRecado] = useState(cobranca.pagamentoInformado?.observacao ?? "");
  const [avisando, setAvisando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function avisar() {
    setErro(null);
    setAvisando(true);
    try {
      await api(`/financeiro/cobrancas/${cobranca.id}/informar-pagamento`, {
        method: "POST",
        body: { observacao: recado.trim() || undefined },
      });
      aoAvisar();
    } catch (err) {
      setErro((err as Error).message);
      setAvisando(false);
    }
  }

  if (dados.erro) {
    return (
      <div className="mt-3">
        <Erro mensagem={dados.erro} />
      </div>
    );
  }
  if (!dados.dados) return <Carregando />;
  const { pix, transferencia } = dados.dados;

  return (
    <div className="bg-bg mt-3 space-y-5 rounded-lg p-4">
      {pix && (
        <section aria-labelledby={`pix-${cobranca.id}`}>
          <h3 id={`pix-${cobranca.id}`} className="text-text mb-3 flex items-center gap-2 text-sm font-semibold">
            <QrCode className="size-4" aria-hidden />
            Pagar com PIX
          </h3>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className="self-center sm:self-start">
              <QrDoPix codigo={pix.copiaECola} />
            </div>
            <div className="min-w-0 flex-1 space-y-3 text-sm">
              <p className="text-text-secondary">
                Abra o app do seu banco, escolha <strong>PIX → Ler QR Code</strong> ou <strong>PIX Copia e Cola</strong>. O valor de{" "}
                <strong className="text-text">{reais(cobranca.valorCentavos)}</strong> já vem preenchido.
              </p>
              <div>
                <p className="text-text-muted mb-1 text-xs">PIX copia e cola</p>
                <p className="bg-surface border-border text-text rounded-lg border p-2 font-mono text-xs break-all">{pix.copiaECola}</p>
              </div>
              <BotaoCopiar texto={pix.copiaECola} rotulo="Copiar código PIX" />
              <dl className="text-text-secondary grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
                <dt className="text-text-muted">Recebedor</dt>
                <dd>{pix.beneficiario}</dd>
                <dt className="text-text-muted">Chave</dt>
                <dd className="break-all">{pix.chave}</dd>
                <dt className="text-text-muted">Identificador</dt>
                <dd className="font-mono">{pix.identificador}</dd>
              </dl>
            </div>
          </div>
        </section>
      )}

      {transferencia && (
        <section aria-labelledby={`ted-${cobranca.id}`} className={pix ? "border-border border-t pt-4" : ""}>
          <h3 id={`ted-${cobranca.id}`} className="text-text mb-2 flex items-center gap-2 text-sm font-semibold">
            <Landmark className="size-4" aria-hidden />
            {pix ? "Ou por transferência" : "Pagar por transferência"}
          </h3>
          <ul className="text-text space-y-0.5 text-sm">
            {transferencia.map((linha) => (
              <li key={linha}>{linha}</li>
            ))}
          </ul>
          <p className="text-text-muted mt-2 text-xs">
            Valor: {reais(cobranca.valorCentavos)}. Na descrição da transferência, escreva o nome do aluno.
          </p>
          <div className="mt-2">
            <BotaoCopiar texto={transferencia.join("\n")} rotulo="Copiar dados bancários" />
          </div>
        </section>
      )}

      <section className="border-border border-t pt-4">
        <h3 className="text-text text-sm font-semibold">Já pagou?</h3>
        <p className="text-text-muted mb-3 text-xs">
          Avise a escola: o financeiro confere no extrato e registra o pagamento. Enquanto isso você não recebe lembretes desta cobrança.
        </p>
        <Campo
          rotulo="Recado (opcional)"
          placeholder="Ex.: paguei pelo PIX da conta do pai"
          maxLength={300}
          value={recado}
          onChange={(e) => setRecado(e.target.value)}
        />
        {erro && (
          <div className="mt-3">
            <Erro mensagem={erro} />
          </div>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <Botao variante="secundario" carregando={avisando} onClick={avisar}>
            {!avisando && <Check className="size-4" aria-hidden />}
            {cobranca.pagamentoInformado ? "Atualizar aviso" : "Avisar que paguei"}
          </Botao>
          <Botao variante="fantasma" onClick={aoFechar}>
            Fechar
          </Botao>
        </div>
      </section>
    </div>
  );
}

/** Aviso "a família disse que pagou", para a família e para o financeiro. */
export function AvisoDePagamento({ cobranca, equipe }: { cobranca: Cobranca; equipe: boolean }) {
  const aviso = cobranca.pagamentoInformado;
  if (!aviso) return null;
  const quando = dataBr(new Date(aviso.em).toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" }));
  return (
    <p role="status" className="bg-warning-subtle text-warning mt-2 rounded-lg px-3 py-2 text-xs">
      {equipe
        ? `${aviso.por ?? "A família"} avisou em ${quando} que pagou. Confira no extrato do banco e registre o pagamento.`
        : `Você avisou em ${quando} que pagou. A escola vai conferir e registrar.`}
      {aviso.observacao && <span className="mt-0.5 block">Recado: “{aviso.observacao}”</span>}
    </p>
  );
}

/**
 * Mensalidade automática do aluno (financeiro e direção): valor e dia do
 * vencimento. Todo mês a cobrança aparece sozinha 10 dias antes de vencer.
 */
export function MensalidadeAutomatica({
  alunoId,
  mensalidade,
  aoMudar,
}: {
  alunoId: string;
  mensalidade: ExtratoAluno["mensalidade"];
  aoMudar: () => void;
}) {
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState(mensalidade ? centavosParaCampo(mensalidade.valorCentavos) : "");
  const [dia, setDia] = useState(String(mensalidade?.dia ?? 10));
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  async function salvar(body: { valorCentavos: number | null; dia: number | null }) {
    setErro(null);
    setSalvando(true);
    try {
      const r = await api<{ lancadas: number }>(`/financeiro/alunos/${alunoId}/mensalidade`, { method: "PUT", body });
      setEditando(false);
      setAviso(
        body.valorCentavos === null
          ? "Mensalidade automática desligada."
          : r.lancadas > 0
            ? "Salvo. A mensalidade deste mês já foi lançada."
            : "Salvo. A próxima mensalidade aparece 10 dias antes do vencimento.",
      );
      aoMudar();
    } catch (err) {
      setErro((err as Error).message);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="border-border mt-4 border-t pt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-text flex items-center gap-2 text-sm">
          <RefreshCw className="text-primary size-4" aria-hidden />
          <span>
            Mensalidade automática:{" "}
            {mensalidade ? (
              <strong>
                {reais(mensalidade.valorCentavos)}, vence todo dia {mensalidade.dia}
              </strong>
            ) : (
              <span className="text-text-muted">desligada</span>
            )}
          </span>
        </p>
        {!editando && (
          <Botao
            variante="secundario"
            onClick={() => {
              // Começa sempre do que está salvo agora.
              setValor(mensalidade ? centavosParaCampo(mensalidade.valorCentavos) : "");
              setDia(String(mensalidade?.dia ?? 10));
              setErro(null);
              setAviso(null);
              setEditando(true);
            }}
          >
            {mensalidade ? "Alterar" : "Ligar"}
          </Botao>
        )}
      </div>
      {aviso && !editando && <p className="text-success mt-2 text-xs">{aviso}</p>}

      {editando && (
        <form
          className="bg-bg mt-3 rounded-lg p-3"
          onSubmit={(e) => {
            e.preventDefault();
            const valorCentavos = lerReais(valor);
            if (!valorCentavos) return setErro("Informe o valor, por exemplo 1.200,00.");
            void salvar({ valorCentavos, dia: Number(dia) });
          }}
        >
          <div className="flex flex-wrap items-start gap-3">
            <div className="w-40">
              <Campo rotulo="Valor (R$)" required inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} />
            </div>
            <div className="w-40">
              <Campo tipo="select" rotulo="Vence todo dia" value={dia} onChange={(e) => setDia(e.target.value)}>
                {Array.from({ length: 28 }, (_, i) => String(i + 1)).map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </Campo>
            </div>
          </div>
          <p className="text-text-muted mt-2 text-xs">
            Todo mês o sistema lança “Mensalidade de &lt;mês&gt;” sozinho, 10 dias antes do vencimento, e a família recebe o aviso com o PIX.
            Se você já lançou a mensalidade de um mês à mão, ele não lança outra.
          </p>
          {erro && (
            <div className="mt-3">
              <Erro mensagem={erro} />
            </div>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <Botao type="submit" carregando={salvando}>
              Salvar
            </Botao>
            {mensalidade && (
              <Botao type="button" variante="perigo" disabled={salvando} onClick={() => void salvar({ valorCentavos: null, dia: null })}>
                Desligar
              </Botao>
            )}
            <Botao type="button" variante="fantasma" onClick={() => setEditando(false)}>
              Cancelar
            </Botao>
          </div>
        </form>
      )}
    </div>
  );
}
