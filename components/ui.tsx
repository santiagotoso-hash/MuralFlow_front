import type { LucideIcon } from "lucide-react";
import { Loader2 } from "lucide-react";
import { useId } from "react";
import { iniciais } from "@/lib/formatar";

type BotaoProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: "primario" | "secundario" | "fantasma" | "perigo" | "perigoSolido";
  carregando?: boolean;
};

const VARIANTES = {
  primario: "bg-primary-solid hover:bg-primary-solid-hover text-white",
  secundario:
    "bg-surface border-border text-text hover:bg-primary-subtle border",
  fantasma: "text-text-secondary hover:text-text hover:bg-primary-subtle",
  perigo: "text-danger hover:bg-danger-subtle",
  // text-surface: branco no tema claro, quase preto no escuro (o vermelho clareia).
  perigoSolido: "bg-danger text-surface hover:opacity-90",
};

export function Botao({
  variante = "primario",
  carregando,
  className = "",
  children,
  disabled,
  ...props
}: BotaoProps) {
  return (
    <button
      {...props}
      disabled={disabled || carregando}
      className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-60 ${VARIANTES[variante]} ${className}`}
    >
      {carregando && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

const CLASSE_CAMPO =
  "bg-surface border-border text-text placeholder:text-text-muted w-full rounded-lg border px-3 py-2 text-sm";

type CampoProps = {
  rotulo: string;
  ajuda?: string;
} & (
  | ({ tipo?: "input" } & React.InputHTMLAttributes<HTMLInputElement>)
  | ({ tipo: "textarea" } & React.TextareaHTMLAttributes<HTMLTextAreaElement>)
  | ({ tipo: "select" } & React.SelectHTMLAttributes<HTMLSelectElement>)
);

export function Campo(props: CampoProps) {
  const { rotulo, ajuda, tipo = "input", ...resto } = props;
  const id = useId();
  const ajudaId = ajuda ? `${id}-ajuda` : undefined;
  const comuns = { id, "aria-describedby": ajudaId, className: CLASSE_CAMPO };
  const controle =
    tipo === "textarea" ? (
      <textarea rows={5} {...comuns} {...(resto as React.TextareaHTMLAttributes<HTMLTextAreaElement>)} />
    ) : tipo === "select" ? (
      <select {...comuns} {...(resto as React.SelectHTMLAttributes<HTMLSelectElement>)} />
    ) : (
      <input {...comuns} {...(resto as React.InputHTMLAttributes<HTMLInputElement>)} />
    );
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-text block text-sm font-medium">
        {rotulo}
      </label>
      {controle}
      {ajuda && (
        <p id={ajudaId} className="text-text-muted text-xs">
          {ajuda}
        </p>
      )}
    </div>
  );
}

export function Cartao({
  className = "",
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={`bg-surface border-border rounded-xl border shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}

export const TONS = {
  neutro: "bg-bg text-text-secondary border-border border",
  primario: "bg-primary-subtle text-primary",
  info: "bg-info-subtle text-info",
  alerta: "bg-warning-subtle text-warning",
  perigo: "bg-danger-subtle text-danger",
  sucesso: "bg-success-subtle text-success",
};

export function Etiqueta({
  tom = "neutro",
  children,
}: {
  tom?: keyof typeof TONS;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${TONS[tom]}`}
    >
      {children}
    </span>
  );
}

export function Avatar({ nome, tamanho = "md" }: { nome: string; tamanho?: "sm" | "md" }) {
  return (
    <span
      aria-hidden
      className={`bg-primary-subtle text-primary inline-flex shrink-0 items-center justify-center rounded-full font-semibold ${
        tamanho === "sm" ? "size-8 text-xs" : "size-10 text-sm"
      }`}
    >
      {iniciais(nome)}
    </span>
  );
}

export function Carregando({ texto = "Carregando..." }: { texto?: string }) {
  return (
    <div role="status" className="text-text-muted flex items-center gap-2 py-10 text-sm">
      <Loader2 className="size-4 animate-spin" aria-hidden />
      {texto}
    </div>
  );
}

export function Erro({ mensagem }: { mensagem: string }) {
  return (
    <p role="alert" className="bg-danger-subtle text-danger rounded-lg px-4 py-3 text-sm">
      {mensagem}
    </p>
  );
}

export function Vazio({
  icone: Icone,
  titulo,
  texto,
}: {
  icone: LucideIcon;
  titulo: string;
  texto?: string;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <span className="bg-primary-subtle text-primary mb-3 rounded-full p-3">
        <Icone className="size-6" aria-hidden />
      </span>
      <p className="text-text font-medium">{titulo}</p>
      {texto && <p className="text-text-muted mt-1 max-w-sm text-sm">{texto}</p>}
    </div>
  );
}

export function Cabecalho({
  titulo,
  descricao,
  acao,
}: {
  titulo: string;
  descricao?: string;
  acao?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-text text-2xl font-bold">{titulo}</h1>
        {descricao && <p className="text-text-secondary mt-1 text-sm">{descricao}</p>}
      </div>
      {acao}
    </div>
  );
}
