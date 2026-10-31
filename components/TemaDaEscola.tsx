"use client";

import { cssDaCor } from "@/lib/escola";

/** Veste o app com a cor da escola de quem está logado (sem cor: a do MuralFlow). */
export default function TemaDaEscola({ cor }: { cor: string | null | undefined }) {
  if (!cor || !/^#[0-9a-fA-F]{6}$/.test(cor)) return null;
  return <style>{cssDaCor(cor)}</style>;
}
