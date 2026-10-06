"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "./api";

/**
 * GET simples com estado de carregamento/erro. `caminho = null` não busca.
 * `recarregar()` refaz a chamada (ex.: depois de criar algo).
 */
export function useApi<T>(caminho: string | null) {
  const [dados, setDados] = useState<T | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [versao, setVersao] = useState(0);

  useEffect(() => {
    if (!caminho) return;
    let ativo = true;
    api<T>(caminho)
      .then((d) => {
        if (!ativo) return;
        setDados(d);
        setErro(null);
      })
      .catch((e: Error) => ativo && setErro(e.message));
    return () => {
      ativo = false;
    };
  }, [caminho, versao]);

  const recarregar = useCallback(() => setVersao((v) => v + 1), []);

  return {
    dados,
    erro,
    carregando: dados === null && erro === null,
    recarregar,
    setDados,
  };
}
