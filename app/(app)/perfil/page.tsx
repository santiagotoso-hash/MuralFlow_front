"use client";

import { Check, LogOut } from "lucide-react";
import { useState } from "react";
import { useSessao } from "@/components/AuthProvider";
import { useConfirmar } from "@/components/Confirmacao";
import { Avatar, Botao, Cabecalho, Campo, Cartao, Erro } from "@/components/ui";
import { api } from "@/lib/api";
import { NOME_PAPEL } from "@/lib/formatar";

export default function Perfil() {
  const { usuario, sair, recarregarUsuario } = useSessao();
  const [nome, setNome] = useState(usuario?.nome ?? "");
  const [telefone, setTelefone] = useState(usuario?.telefone ?? "");
  const [senha, setSenha] = useState("");
  const [receberEmails, setReceberEmails] = useState(usuario?.receberEmails ?? true);
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const aceitar = useConfirmar();

  if (!usuario) return null;

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    const ok = await aceitar({
      titulo: "Salvar as alterações do perfil?",
      mensagem: senha ? "Sua senha também será trocada. Use a nova senha no próximo acesso." : undefined,
      confirmar: "Salvar",
    });
    if (!ok) return;
    setErro(null);
    setSalvo(false);
    setSalvando(true);
    try {
      await api("/usuarios/eu", {
        method: "PATCH",
        body: {
          nome,
          telefone: telefone || undefined,
          receberEmails,
          ...(senha ? { senha } : {}),
        },
      });
      await recarregarUsuario();
      setSenha("");
      setSalvo(true);
    } catch (err) {
      setErro((err as Error).message);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <>
      <Cabecalho titulo="Meu perfil" />
      <Cartao className="max-w-xl p-6">
        <div className="mb-6 flex items-center gap-3">
          <Avatar nome={usuario.nome} />
          <div>
            <p className="text-text font-semibold">{usuario.email}</p>
            <p className="text-text-muted text-sm">{NOME_PAPEL[usuario.papel]}</p>
          </div>
        </div>
        <form onSubmit={salvar} className="space-y-4">
          <Campo rotulo="Nome" required value={nome} onChange={(e) => setNome(e.target.value)} />
          <Campo
            rotulo="Telefone"
            type="tel"
            placeholder="(11) 98765-4321"
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
            ajuda="A escola usa para contato em caso de urgência."
          />
          <Campo
            rotulo="Nova senha"
            type="password"
            autoComplete="new-password"
            minLength={6}
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            ajuda="Deixe em branco para manter a atual."
          />
          <label className="text-text flex cursor-pointer items-start gap-3 text-sm">
            <input
              type="checkbox"
              className="accent-primary-solid mt-0.5 size-4"
              checked={receberEmails}
              onChange={(e) => setReceberEmails(e.target.checked)}
            />
            <span>
              Receber avisos por e-mail
              <span className="text-text-muted block text-xs">
                Quando sair um comunicado novo ou chegar uma mensagem para você.
              </span>
            </span>
          </label>
          {erro && <Erro mensagem={erro} />}
          <div className="flex flex-wrap items-center gap-3">
            <Botao type="submit" carregando={salvando}>
              Salvar alterações
            </Botao>
            {salvo && (
              <span role="status" className="text-success inline-flex items-center gap-1 text-sm">
                <Check className="size-4" aria-hidden />
                Salvo!
              </span>
            )}
          </div>
        </form>
      </Cartao>
      <Botao variante="perigo" onClick={sair} className="mt-6">
        <LogOut className="size-4" aria-hidden />
        Sair da conta
      </Botao>
    </>
  );
}
