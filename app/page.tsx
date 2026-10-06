import { CalendarDays, Check, Megaphone, MessageCircle } from "lucide-react";
import Link from "next/link";
import Logo from "@/components/Logo";

const RECURSOS = [
  {
    icone: Megaphone,
    titulo: "Comunicados com confirmação",
    texto:
      "A escola publica para a escola inteira ou só para uma turma. As famílias confirmam a leitura com um toque e a direção vê quem já leu.",
  },
  {
    icone: CalendarDays,
    titulo: "Agenda escolar",
    texto:
      "Reuniões, provas, passeios e festas organizados por data. Cada família vê só o que vale para a turma dos seus filhos.",
  },
  {
    icone: MessageCircle,
    titulo: "Mensagens diretas",
    texto:
      "Conversas privadas entre responsáveis e professores sobre cada aluno, sem misturar com grupos de WhatsApp.",
  },
];

const PASSOS = [
  "A secretaria cadastra a família e envia o acesso.",
  "O responsável entra e já vê os filhos, as turmas e os avisos.",
  "Tudo o que a escola comunica fica registrado em um só lugar.",
];

export default function Inicio() {
  return (
    <div className="min-h-dvh">
      <header className="border-border border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Logo />
          <Link
            href="/entrar"
            className="bg-primary-solid hover:bg-primary-solid-hover rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors"
          >
            Entrar
          </Link>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
          <div>
            <span className="bg-primary-subtle text-primary inline-flex rounded-full px-3 py-1 text-sm font-medium">
              Comunicação escolar sem ruído
            </span>
            <h1 className="text-text mt-5 text-4xl leading-tight font-bold lg:text-5xl">
              A escola e a família, na mesma página.
            </h1>
            <p className="text-text-secondary mt-5 max-w-prose text-lg">
              Comunicados, agenda e mensagens com os professores em um único
              lugar. Nada de bilhete perdido na mochila.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/entrar"
                className="bg-primary-solid hover:bg-primary-solid-hover rounded-lg px-6 py-3 font-medium text-white transition-colors"
              >
                Acessar minha conta
              </Link>
              <a
                href="#como-funciona"
                className="text-text-secondary hover:text-text px-4 py-3 font-medium"
              >
                Como funciona →
              </a>
            </div>
          </div>

          {/* Ilustração: um comunicado e uma mensagem como aparecem no app. */}
          <div
            role="img"
            aria-label="Exemplo do aplicativo: um comunicado da escola com o botão Estou ciente e uma mensagem da professora."
            className="space-y-4"
          >
            <div className="bg-surface border-border rounded-2xl border p-5 shadow-lg">
              <div className="flex items-center gap-2 text-xs">
                <span className="bg-primary-subtle text-primary rounded-full px-2 py-0.5 font-medium">
                  Evento
                </span>
                <span className="text-text-muted">Direção · hoje</span>
              </div>
              <p className="text-text mt-3 font-semibold">Reunião de pais e mestres</p>
              <p className="text-text-secondary mt-1 text-sm">
                Convidamos as famílias para a reunião do bimestre, quinta-feira às
                19h, no auditório.
              </p>
              <span className="bg-success-subtle text-success mt-4 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium">
                <Check className="size-4" aria-hidden />
                Ciente
              </span>
            </div>
            <div className="bg-surface border-border ml-auto max-w-sm rounded-2xl border p-4 shadow-lg sm:ml-12">
              <p className="text-text-muted text-xs">Prof.ª Carla · 5º Ano A</p>
              <p className="text-text mt-1 text-sm">
                Oi, Maria! O Lucas foi muito bem no trabalho de Ciências hoje. 🌱
              </p>
            </div>
          </div>
        </section>

        <section className="bg-surface border-border border-y">
          <div className="mx-auto grid max-w-6xl gap-6 px-4 py-16 sm:px-6 md:grid-cols-3">
            {RECURSOS.map(({ icone: Icone, titulo, texto }) => (
              <div key={titulo}>
                <span className="bg-primary-subtle text-primary inline-flex rounded-lg p-2.5">
                  <Icone className="size-5" aria-hidden />
                </span>
                <h2 className="text-text mt-4 font-semibold">{titulo}</h2>
                <p className="text-text-secondary mt-2 text-sm">{texto}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="como-funciona" className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
          <h2 className="text-text text-center text-2xl font-bold">Como funciona</h2>
          <ol className="mt-8 space-y-4">
            {PASSOS.map((passo, i) => (
              <li key={passo} className="flex items-start gap-4">
                <span className="bg-primary-solid flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white">
                  {i + 1}
                </span>
                <p className="text-text-secondary pt-1">{passo}</p>
              </li>
            ))}
          </ol>
        </section>
      </main>

      <footer className="border-border text-text-muted border-t py-8 text-center text-sm">
        © {new Date().getFullYear()} Escola Conecta
      </footer>
    </div>
  );
}
