import { Sora } from "next/font/google";
import Link from "next/link";

/** A letra da logomarca ("passa" fino, "recado" forte); só o logo usa. */
const letraDaMarca = Sora({ subsets: ["latin"], weight: ["300", "800"], display: "swap" });

/**
 * O símbolo do PassaRecado ("Bilhete"): o bilhete da mochila com a seta que
 * leva o recado adiante. As cores são da marca, iguais em qualquer escola.
 */
export function IconeDaMarca({ className = "size-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden>
      <rect width="100" height="100" rx="22" fill="#0D7888" />
      <polygon points="20.7,23.8 55.6,23.8 69.2,37.4 69.2,70.7 20.7,70.7" fill="#fff" />
      <polygon points="55.6,23.8 69.2,37.4 55.6,37.4" fill="#BFE3DF" />
      <path d="M27.8 42.3H54.3M27.8 53.1H46.9" stroke="#0A1F32" strokeWidth="4.8" strokeLinecap="round" />
      <path
        d="M47.5 72.2H84.6M73.6 61.2l11 11-11 11"
        stroke="#FA993A"
        strokeWidth="8.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

export default function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} aria-label="PassaRecado" className="text-text inline-flex items-center gap-2">
      <IconeDaMarca />
      <span className={`${letraDaMarca.className} text-lg leading-none tracking-tight`} aria-hidden>
        <span className="font-light">passa</span>
        <span className="font-extrabold">recado</span>
      </span>
    </Link>
  );
}
