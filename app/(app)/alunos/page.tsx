"use client";

import { Phone, Users } from "lucide-react";
import { useState } from "react";
import { useSessao } from "@/components/AuthProvider";
import { Avatar, Cabecalho, Campo, Carregando, Cartao, Erro, Etiqueta, Vazio } from "@/components/ui";
import { NOME_TURNO } from "@/lib/formatar";
import type { Aluno, Turma } from "@/lib/tipos";
import { useApi } from "@/lib/use-api";

function idade(dataNascimento: string | null) {
  if (!dataNascimento) return null;
  const nasc = new Date(`${dataNascimento}T12:00:00`);
  const hoje = new Date();
  let anos = hoje.getFullYear() - nasc.getFullYear();
  if (hoje < new Date(hoje.getFullYear(), nasc.getMonth(), nasc.getDate())) anos--;
  return anos;
}

export default function Alunos() {
  const { usuario } = useSessao();
  const [turmaId, setTurmaId] = useState("");
  const familia = usuario?.papel === "responsavel";
  const turmas = useApi<Turma[]>(familia ? null : "/turmas");
  const alunos = useApi<Aluno[]>(`/alunos${turmaId ? `?turmaId=${turmaId}` : ""}`);

  if (!usuario) return null;

  return (
    <>
      <Cabecalho
        titulo={familia ? "Meus filhos" : "Alunos"}
        descricao={familia ? "Os alunos vinculados à sua conta." : "Alunos das suas turmas e seus responsáveis."}
        acao={
          !familia && (
            <div className="w-56">
              <Campo tipo="select" rotulo="Turma" value={turmaId} onChange={(e) => setTurmaId(e.target.value)}>
                <option value="">Todas</option>
                {turmas.dados?.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nome}
                  </option>
                ))}
              </Campo>
            </div>
          )
        }
      />
      {alunos.erro && <Erro mensagem={alunos.erro} />}
      {alunos.carregando && <Carregando />}
      {alunos.dados?.length === 0 && (
        <Cartao>
          <Vazio
            icone={Users}
            titulo="Nenhum aluno encontrado"
            texto={familia ? "Peça à secretaria para vincular seus filhos à sua conta." : undefined}
          />
        </Cartao>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {alunos.dados?.map((a) => {
          const anos = idade(a.dataNascimento);
          return (
            <Cartao key={a.id} className="p-5">
              <div className="flex items-center gap-3">
                <Avatar nome={a.nome} />
                <div className="min-w-0">
                  <p className="text-text truncate font-semibold">{a.nome}</p>
                  <p className="text-text-muted text-xs">
                    {anos !== null && `${anos} anos · `}
                    Matrícula {a.matricula ?? "—"}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {a.turma ? (
                  <>
                    <Etiqueta tom="primario">{a.turma.nome}</Etiqueta>
                    <Etiqueta>{NOME_TURNO[a.turma.turno]}</Etiqueta>
                  </>
                ) : (
                  <Etiqueta tom="alerta">Sem turma</Etiqueta>
                )}
              </div>
              {!familia && a.responsaveis && (
                <ul className="border-border mt-4 space-y-2 border-t pt-3">
                  {a.responsaveis.map((r) => (
                    <li key={r.id} className="text-sm">
                      <p className="text-text">{r.nome}</p>
                      {r.telefone && (
                        <a href={`tel:${r.telefone.replace(/\D/g, "")}`} className="text-primary inline-flex items-center gap-1 text-xs">
                          <Phone className="size-3" aria-hidden />
                          {r.telefone}
                        </a>
                      )}
                    </li>
                  ))}
                  {a.responsaveis.length === 0 && <li className="text-text-muted text-xs">Nenhum responsável vinculado.</li>}
                </ul>
              )}
            </Cartao>
          );
        })}
      </div>
    </>
  );
}
