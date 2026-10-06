"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useSessao } from "@/components/AuthProvider";
import Logo from "@/components/Logo";
import { Botao, Campo, Cartao, Erro } from "@/components/ui";

export default function Entrar() {
  const { usuario, entrar } = useSessao();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  // Já logado (sessão restaurada): direto para o painel.
  useEffect(() => {
    if (usuario) router.replace("/painel");
  }, [usuario, router]);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      await entrar(email, senha);
    } catch (err) {
      setErro((err as Error).message);
      setEnviando(false);
    }
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <Logo />
      <Cartao className="mt-8 w-full max-w-sm p-6">
        <h1 className="text-text text-xl font-bold">Entrar</h1>
        <p className="text-text-secondary mt-1 text-sm">
          Use o e-mail e a senha que a escola enviou para você.
        </p>
        <form onSubmit={enviar} className="mt-6 space-y-4" noValidate>
          <Campo
            rotulo="E-mail"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Campo
            rotulo="Senha"
            type="password"
            autoComplete="current-password"
            required
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
          />
          {erro && <Erro mensagem={erro} />}
          <Botao type="submit" carregando={enviando} className="w-full">
            Entrar
          </Botao>
        </form>
        <p className="text-text-muted mt-6 text-center text-xs">
          Esqueceu a senha? Fale com a secretaria da escola.
        </p>
      </Cartao>
    </main>
  );
}
