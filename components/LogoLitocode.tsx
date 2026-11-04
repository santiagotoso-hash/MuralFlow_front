/** Logomarca da LitoCode (quem desenvolve o PassaRecado), igual à do PontoHub; em SVG para ficar nítida. */
export default function LogoLitocode() {
  return (
    <span role="img" aria-label="LitoCode — desenvolvimento full stack" className="inline-flex items-center gap-2.5">
      <svg viewBox="0 0 40 40" className="size-11 shrink-0" aria-hidden>
        <rect
          x="0.5"
          y="0.5"
          width="39"
          height="39"
          rx="10"
          className="fill-[#0f2236] stroke-[#0f2236] dark:fill-[#16304b] dark:stroke-[#2c4a6b]"
          strokeWidth="1"
        />
        <polyline points="15,12.5 8.5,20 15,27.5" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
        <polyline points="25,12.5 31.5,20 25,27.5" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M15.4 21.6 q2.3 -4.4 4.6 0 t4.6 0" fill="none" stroke="#f5a524" strokeWidth="2.8" strokeLinecap="round" />
      </svg>
      <span className="flex flex-col items-start leading-none" aria-hidden>
        <span className="text-[1.9rem] font-normal tracking-[-0.03em] text-[#0f2236] dark:text-[#e6e8eb]">
          <strong className="font-extrabold">lito</strong>code
        </span>
        <span className="mt-1 text-[0.5rem] font-bold tracking-[0.24em] text-[#1f7a8c] uppercase dark:text-[#4fb3c4]">
          Desenvolvimento full stack
        </span>
      </span>
    </span>
  );
}
