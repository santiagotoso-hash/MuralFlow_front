import { School } from "lucide-react";
import Link from "next/link";

export default function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="text-text inline-flex items-center gap-2 font-bold">
      <span className="bg-primary-solid rounded-lg p-1.5 text-white">
        <School className="size-5" aria-hidden />
      </span>
      Escola Conecta
    </Link>
  );
}
