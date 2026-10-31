"use client";

import { Landmark, Palette, QrCode, School } from "lucide-react";
import { useState } from "react";
import { useSessao } from "@/components/AuthProvider";
import { CamposInstitucionais, type Institucionais, ouNulo } from "@/components/DadosDaEscola";
import { Botao, Carregando, Cartao, Erro } from "@/components/ui";
import { api } from "@/lib/api";
import { urlDoLogo } from "@/lib/escola";
import type { EscolaCompleta } from "@/lib/tipos";
import { useApi } from "@/lib/use-api";

/**
 * Direção: os dados institucionais da escola (saem nas declarações e no
 * recibo). PIX, conta, logo e cor aparecem só para conferir: quem muda é o
 * suporte do MuralFlow, para ninguém desviar os pagamentos das famílias.
 */
export function AbaEscola() {
  const escola = useApi<EscolaCompleta>("/escola");
  if (escola.erro) return <Erro mensagem={escola.erro} />;
  if (!escola.dados) return <Carregando />;
  return <FormEscola escola={escola.dados} />;
}

function FormEscola({ escola }: { escola: EscolaCompleta }) {
  const { recarregarUsuario } = useSessao();
  const [form, setForm] = useState<Institucionais>({
    nome: escola.nome,
    cnpj: escola.cnpj,
    endereco: escola.endereco,
    cidade: escola.cidade,
    assinatura: escola.assinatura,
  });
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setSalvando(true);
    try {
      await api("/escola", {
        method: "PATCH",
        body: {
          nome: form.nome.trim(),
          cnpj: ouNulo(form.cnpj),
          endereco: ouNulo(form.endereco),
          cidade: ouNulo(form.cidade),
          assinatura: ouNulo(form.assinatura),
        },
      });
      setSalvo(true);
      // O nome da escola aparece no menu: atualiza a sessão.
      await recarregarUsuario();
    } catch (err) {
      setErro((err as Error).message);
    } finally {
      setSalvando(false);
    }
  }

  const logo = urlDoLogo(escola.logo);
  const transferencia = (escola.dadosBancarios ?? "").split("\n").filter((l) => l.trim());

  return (
    <div className="space-y-6">
      <Cartao className="p-5">
        <h2 className="text-text flex items-center gap-2 font-semibold">
          <School className="text-primary size-4" aria-hidden />
          Dados da escola
        </h2>
        <p className="text-text-secondary mt-1 mb-4 text-sm">Saem no cabeçalho e na assinatura das declarações e no recibo de pagamento.</p>
        <form onSubmit={salvar} className="space-y-4">
          <CamposInstitucionais
            valores={form}
            aoMudar={(campo, valor) => {
              setForm((f) => ({ ...f, [campo]: valor }));
              setSalvo(false);
            }}
          />
          {erro && <Erro mensagem={erro} />}
          <div className="flex items-center gap-3">
            <Botao type="submit" carregando={salvando}>
              Salvar dados
            </Botao>
            {salvo && <span className="text-success text-sm">Salvo.</span>}
          </div>
        </form>
      </Cartao>

      <Cartao className="p-5">
        <h2 className="text-text flex items-center gap-2 font-semibold">
          <QrCode className="text-primary size-4" aria-hidden />
          Pagamento das famílias
        </h2>
        <p className="text-text-secondary mt-1 mb-4 text-sm">
          É para onde vai o dinheiro do botão “Pagar”. Por segurança, só o suporte do MuralFlow muda estes dados: se precisar trocar,
          fale com a gente.
        </p>
        {!escola.pixChave && transferencia.length === 0 ? (
          <p className="text-text-muted text-sm">Ainda não configurado: as famílias não veem o botão “Pagar”.</p>
        ) : (
          <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-text-muted text-xs">Chave PIX</dt>
              <dd className="text-text break-all">{escola.pixChave ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-text-muted text-xs">Quem recebe</dt>
              <dd className="text-text">
                {escola.pixNome || escola.nome} · {escola.pixCidade || escola.cidade || "—"}
              </dd>
            </div>
            {transferencia.length > 0 && (
              <div className="sm:col-span-2">
                <dt className="text-text-muted flex items-center gap-1 text-xs">
                  <Landmark className="size-3" aria-hidden />
                  Transferência
                </dt>
                <dd className="text-text">
                  {transferencia.map((l) => (
                    <span key={l} className="block">
                      {l}
                    </span>
                  ))}
                </dd>
              </div>
            )}
          </dl>
        )}
      </Cartao>

      <Cartao className="p-5">
        <h2 className="text-text flex items-center gap-2 font-semibold">
          <Palette className="text-primary size-4" aria-hidden />
          Visual
        </h2>
        <p className="text-text-secondary mt-1 mb-4 text-sm">O logo e a cor da escola no app. Quem muda é o suporte do MuralFlow.</p>
        <div className="flex flex-wrap items-center gap-6 text-sm">
          <div className="flex items-center gap-3">
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element -- imagem da API, já otimizada no upload.
              <img src={logo} alt="Logo da escola" className="border-border h-14 max-w-32 rounded-lg border object-contain p-1" />
            ) : (
              <span className="text-text-muted">Sem logo</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="border-border size-6 rounded-md border" style={{ background: escola.cor ?? "var(--color-primary-solid)" }} />
            <span className="text-text-secondary">{escola.cor ?? "Cor padrão do MuralFlow"}</span>
          </div>
        </div>
      </Cartao>
    </div>
  );
}
