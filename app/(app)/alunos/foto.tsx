"use client";

import { Camera, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { useConfirmar } from "@/components/Confirmacao";
import ImagemProtegida from "@/components/ImagemProtegida";
import { Avatar, Botao, Erro } from "@/components/ui";
import { api } from "@/lib/api";
import { reduzirFoto } from "@/lib/foto";
import type { Aluno } from "@/lib/tipos";

/** Caminho da foto do aluno na API (com a versão, para não pegar a antiga do cache). */
export const caminhoDaFoto = (a: Aluno) =>
  a.fotoAtualizadaEm ? `/alunos/${a.id}/foto?v=${Date.parse(a.fotoAtualizadaEm)}` : null;

/** A foto do aluno, ou as iniciais quando não há foto. */
export function FotoDoAluno({ aluno, tamanho = "size-10" }: { aluno: Aluno; tamanho?: string }) {
  return (
    <ImagemProtegida
      caminho={caminhoDaFoto(aluno)}
      alt={`Foto de ${aluno.nome}`}
      className={`${tamanho} shrink-0 rounded-full object-cover`}
      reserva={<Avatar nome={aluno.nome} />}
    />
  );
}

/**
 * Pais: a foto do filho (opcional) e o que autorizam no aniversário. Nada
 * sai para a turma sem a autorização marcada aqui (LGPD: dado de criança).
 */
export function FotoEAniversario({ aluno: a, aoSalvar }: { aluno: Aluno; aoSalvar: (a: Aluno) => void }) {
  const entrada = useRef<HTMLInputElement>(null);
  const aceitar = useConfirmar();
  const [ocupado, setOcupado] = useState<"foto" | "aviso" | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const primeiroNome = a.nome.split(" ")[0];

  async function enviar(arquivo: File | undefined) {
    if (!arquivo) return;
    setErro(null);
    setOcupado("foto");
    try {
      const imagem = await reduzirFoto(arquivo);
      aoSalvar(await api<Aluno>(`/alunos/${a.id}/foto`, { method: "PUT", body: { imagem } }));
    } catch (err) {
      setErro((err as Error).message);
    } finally {
      setOcupado(null);
      if (entrada.current) entrada.current.value = "";
    }
  }

  async function remover() {
    const ok = await aceitar({
      titulo: "Remover a foto?",
      mensagem: <>A foto de {primeiroNome} sai da ficha e dos avisos de aniversário.</>,
      confirmar: "Remover",
      perigo: true,
    });
    if (!ok) return;
    setErro(null);
    setOcupado("foto");
    try {
      aoSalvar(await api<Aluno>(`/alunos/${a.id}/foto`, { method: "DELETE" }));
    } catch (err) {
      setErro((err as Error).message);
    } finally {
      setOcupado(null);
    }
  }

  async function autorizar(avisarTurma: boolean, comFoto: boolean) {
    setErro(null);
    setOcupado("aviso");
    try {
      aoSalvar(await api<Aluno>(`/alunos/${a.id}/aniversario`, { method: "PUT", body: { avisarTurma, comFoto } }));
    } catch (err) {
      setErro((err as Error).message);
    } finally {
      setOcupado(null);
    }
  }

  return (
    <div className="border-border mt-4 space-y-3 border-t pt-4">
      <p className="text-text text-sm font-medium">Foto e aniversário</p>
      <div className="flex flex-wrap items-center gap-3">
        <FotoDoAluno aluno={a} tamanho="size-16" />
        <input
          ref={entrada}
          type="file"
          accept="image/*"
          className="sr-only"
          aria-label={`Foto de ${a.nome}`}
          onChange={(e) => void enviar(e.target.files?.[0])}
        />
        <Botao variante="secundario" carregando={ocupado === "foto"} onClick={() => entrada.current?.click()}>
          {ocupado !== "foto" && <Camera className="size-4" aria-hidden />}
          {a.fotoAtualizadaEm ? "Trocar foto" : "Enviar foto"}
        </Botao>
        {a.fotoAtualizadaEm && (
          <Botao variante="perigo" onClick={remover} disabled={!!ocupado}>
            <Trash2 className="size-4" aria-hidden />
            Remover
          </Botao>
        )}
      </div>
      <p className="text-text-muted text-xs">
        Opcional. A foto aparece só para vocês, os professores da turma e a direção.
      </p>

      <fieldset className="space-y-2" disabled={ocupado === "aviso"}>
        <label className="flex cursor-pointer items-start gap-2 text-sm">
          <input
            type="checkbox"
            className="accent-primary-solid mt-0.5 size-4 shrink-0"
            checked={a.avisarAniversarioTurma}
            onChange={(e) => void autorizar(e.target.checked, e.target.checked && a.fotoNoAviso)}
          />
          <span className="text-text">
            Avisar a turma no dia do aniversário
            <span className="text-text-muted block text-xs">
              A escola publica para as famílias da turma de {primeiroNome} um comunicado com o nome e a idade. Ninguém de fora da
              turma vê.
            </span>
          </span>
        </label>
        <label className={`flex items-start gap-2 text-sm ${a.avisarAniversarioTurma && a.fotoAtualizadaEm ? "cursor-pointer" : "opacity-60"}`}>
          <input
            type="checkbox"
            className="accent-primary-solid mt-0.5 size-4 shrink-0"
            checked={a.fotoNoAviso}
            disabled={!a.avisarAniversarioTurma || !a.fotoAtualizadaEm}
            onChange={(e) => void autorizar(true, e.target.checked)}
          />
          <span className="text-text">
            Incluir a foto no aviso
            <span className="text-text-muted block text-xs">
              {!a.fotoAtualizadaEm
                ? "Envie uma foto para poder incluir."
                : !a.avisarAniversarioTurma
                  ? "Marque o aviso à turma primeiro."
                  : "Se desmarcar depois, a foto some também dos avisos já publicados."}
            </span>
          </span>
        </label>
        {a.avisarAniversarioTurma && !a.dataNascimento && (
          <p className="text-warning text-xs">Informe a data de nascimento para o aviso sair no dia certo.</p>
        )}
      </fieldset>
      {erro && <Erro mensagem={erro} />}
    </div>
  );
}
