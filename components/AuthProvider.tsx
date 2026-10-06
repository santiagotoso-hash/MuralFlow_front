"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { api, EVENTO_SESSAO_EXPIRADA, lerToken, salvarToken } from "@/lib/api";
import type { Usuario } from "@/lib/tipos";

interface Sessao {
  usuario: Usuario | null;
  /** true até sabermos se há sessão salva (evita piscar a tela de login). */
  carregando: boolean;
  entrar: (email: string, senha: string) => Promise<Usuario>;
  sair: () => void;
  recarregarUsuario: () => Promise<void>;
}

const SessaoContext = createContext<Sessao | null>(null);

export function useSessao() {
  const ctx = useContext(SessaoContext);
  if (!ctx) throw new Error("useSessao fora do AuthProvider");
  return ctx;
}

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [carregando, setCarregando] = useState(true);

  const recarregarUsuario = useCallback(async () => {
    try {
      setUsuario(lerToken() ? await api<Usuario>("/usuarios/eu") : null);
    } catch {
      salvarToken(null);
      setUsuario(null);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    // Restaura a sessão salva. Roda depois da montagem porque o token
    // vive no localStorage, que não existe no servidor.
    void Promise.resolve().then(recarregarUsuario);

    const expirou = () => {
      salvarToken(null);
      setUsuario(null);
    };
    window.addEventListener(EVENTO_SESSAO_EXPIRADA, expirou);
    return () => window.removeEventListener(EVENTO_SESSAO_EXPIRADA, expirou);
  }, [recarregarUsuario]);

  const entrar = useCallback(async (email: string, senha: string) => {
    const { token } = await api<{ token: string }>("/auth/entrar", {
      method: "POST",
      body: { email, senha },
    });
    salvarToken(token);
    const eu = await api<Usuario>("/usuarios/eu");
    setUsuario(eu);
    return eu;
  }, []);

  const sair = useCallback(() => {
    salvarToken(null);
    setUsuario(null);
  }, []);

  const valor = useMemo(
    () => ({ usuario, carregando, entrar, sair, recarregarUsuario }),
    [usuario, carregando, entrar, sair, recarregarUsuario],
  );

  return <SessaoContext value={valor}>{children}</SessaoContext>;
}
