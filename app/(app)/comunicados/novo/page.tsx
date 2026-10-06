"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useSessao } from "@/components/AuthProvider";
import { Botao, Cabecalho, Campo, Cartao, Erro } from "@/components/ui";
import { api } from "@/lib/api";
import { NOME_CATEGORIA } from "@/lib/formatar";
import type { CategoriaComunicado, Turma } from "@/lib/tipos";
import { useApi } from "@/lib/use-api";

export default function NovoComunicado() {
  const { usuario } = useSessao();
  const router = useRouter();
  const turmas = useApi<Turma[]>("/turmas");
  const admin = usuario?.papel === "admin";

  const [titulo, setTitulo] = useState("");
  const [conteudo, setConteudo] = useState("");
  const [categoria, setCategoria] = useState<CategoriaComunicado>("geral");
  const [turmaId, setTurmaId] = useState("");
  const [exigeCiencia, setExigeCiencia] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  // Professor não publica para a escola inteira: pré-seleciona a 1ª turma.
  const turmaEscolhida = turmaId || (admin ? "" : (turmas.dados?.[0]?.id ?? ""));

  async function publicar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      await api("/comunicados", {
        method: "POST",
        body: { titulo, conteudo, categoria, exigeCiencia, turmaId: turmaEscolhida || undefined },
      });
      router.push("/comunicados");
    } catch (err) {
      setErro((err as Error).message);
      setEnviando(false);
    }
  }

  if (usuario?.papel === "responsavel") return <Erro mensagem="Só a equipe da escola publica comunicados." />;

  return (
    <>
      <Cabecalho titulo="Novo comunicado" descricao="As famílias veem o aviso assim que você publicar." />
      <Cartao className="max-w-2xl p-6">
        <form onSubmit={publicar} className="space-y-5">
          <Campo rotulo="Título" required maxLength={150} value={titulo} onChange={(e) => setTitulo(e.target.value)} />
          <div className="grid gap-5 sm:grid-cols-2">
            <Campo
              tipo="select"
              rotulo="Para quem"
              value={turmaEscolhida}
              onChange={(e) => setTurmaId(e.target.value)}
            >
              {admin && <option value="">Escola inteira</option>}
              {turmas.dados?.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome}
                </option>
              ))}
            </Campo>
            <Campo
              tipo="select"
              rotulo="Categoria"
              value={categoria}
              onChange={(e) => setCategoria(e.target.value as CategoriaComunicado)}
            >
              {Object.entries(NOME_CATEGORIA).map(([valor, nome]) => (
                <option key={valor} value={valor}>
                  {nome}
                </option>
              ))}
            </Campo>
          </div>
          <Campo
            tipo="textarea"
            rotulo="Mensagem"
            required
            rows={8}
            value={conteudo}
            onChange={(e) => setConteudo(e.target.value)}
          />
          <label className="text-text flex cursor-pointer items-start gap-3 text-sm">
            <input
              type="checkbox"
              className="accent-primary-solid mt-0.5 size-4"
              checked={exigeCiencia}
              onChange={(e) => setExigeCiencia(e.target.checked)}
            />
            <span>
              Pedir confirmação de leitura
              <span className="text-text-muted block text-xs">
                As famílias tocam em &quot;Estou ciente&quot; e você acompanha quem já leu.
              </span>
            </span>
          </label>
          {erro && <Erro mensagem={erro} />}
          <div className="flex gap-3">
            <Botao type="submit" carregando={enviando}>
              Publicar
            </Botao>
            <Botao type="button" variante="fantasma" onClick={() => router.back()}>
              Cancelar
            </Botao>
          </div>
        </form>
      </Cartao>
    </>
  );
}
