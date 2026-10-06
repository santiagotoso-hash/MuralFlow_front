export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4001";

const TOKEN_KEY = "escola-conecta:token";

export function lerToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function salvarToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* modo privado / storage bloqueado: a sessão dura só esta aba */
  }
}

export class ErroApi extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

/** Avisa o AuthProvider quando a sessão expira (401 em qualquer chamada). */
export const EVENTO_SESSAO_EXPIRADA = "escola-conecta:sessao-expirada";

export async function api<T>(
  caminho: string,
  opcoes: { method?: string; body?: unknown } = {},
): Promise<T> {
  const token = lerToken();
  let resposta: Response;
  try {
    resposta = await fetch(`${API_URL}${caminho}`, {
      method: opcoes.method ?? "GET",
      headers: {
        ...(opcoes.body !== undefined
          ? { "Content-Type": "application/json" }
          : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: opcoes.body !== undefined ? JSON.stringify(opcoes.body) : undefined,
    });
  } catch {
    throw new ErroApi(
      "Não foi possível falar com o servidor. Verifique sua conexão.",
      0,
    );
  }

  if (resposta.status === 401 && token) {
    window.dispatchEvent(new Event(EVENTO_SESSAO_EXPIRADA));
  }
  if (!resposta.ok) {
    const corpo = await resposta.json().catch(() => null);
    const msg = Array.isArray(corpo?.message)
      ? corpo.message[0]
      : (corpo?.message ?? "Algo deu errado. Tente de novo.");
    throw new ErroApi(msg, resposta.status);
  }
  if (resposta.status === 204) return undefined as T;
  return resposta.json() as Promise<T>;
}
