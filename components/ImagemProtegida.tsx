"use client";

import { useEffect, useState } from "react";
import { API_URL, lerToken } from "@/lib/api";

/**
 * Imagem que exige login (foto de aluno): o <img> comum não manda o token,
 * então a imagem é baixada com ele e mostrada a partir da memória.
 */
export default function ImagemProtegida({
  caminho,
  alt,
  className,
  reserva = null,
}: {
  /** Caminho na API, ex.: "/alunos/<id>/foto?v=123". */
  caminho: string | null;
  alt: string;
  className?: string;
  /** O que mostrar sem imagem (ou enquanto carrega). */
  reserva?: React.ReactNode;
}) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!caminho) return;
    let ativo = true;
    let objeto: string | null = null;
    const token = lerToken();
    fetch(`${API_URL}${caminho}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then((r) => (r.ok ? r.blob() : null))
      .then((blob) => {
        if (!ativo || !blob) return;
        objeto = URL.createObjectURL(blob);
        setUrl(objeto);
      })
      .catch(() => {});
    return () => {
      ativo = false;
      if (objeto) URL.revokeObjectURL(objeto);
      setUrl(null);
    };
  }, [caminho]);

  if (!caminho || !url) return <>{reserva}</>;
  // eslint-disable-next-line @next/next/no-img-element -- imagem baixada com o token, já na memória.
  return <img src={url} alt={alt} className={className} />;
}
