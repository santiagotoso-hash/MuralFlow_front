"use client";

import {
  CalendarDays,
  House,
  LogOut,
  Megaphone,
  MessageCircle,
  Settings,
  UserRound,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useSessao } from "@/components/AuthProvider";
import Logo from "@/components/Logo";
import { Avatar, Carregando } from "@/components/ui";
import { NOME_PAPEL } from "@/lib/formatar";
import type { Papel } from "@/lib/tipos";

interface ItemMenu {
  href: string;
  rotulo: string;
  icone: typeof House;
  papeis?: Papel[];
}

function menu(papel: Papel): ItemMenu[] {
  const itens: ItemMenu[] = [
    { href: "/painel", rotulo: "Início", icone: House },
    { href: "/comunicados", rotulo: "Comunicados", icone: Megaphone },
    { href: "/agenda", rotulo: "Agenda", icone: CalendarDays },
    { href: "/mensagens", rotulo: "Mensagens", icone: MessageCircle },
    {
      href: "/alunos",
      rotulo: papel === "responsavel" ? "Meus filhos" : "Alunos",
      icone: Users,
    },
    { href: "/gestao", rotulo: "Gestão", icone: Settings, papeis: ["admin"] },
    { href: "/perfil", rotulo: "Perfil", icone: UserRound },
  ];
  return itens.filter((i) => !i.papeis || i.papeis.includes(papel));
}

export default function AreaLogada({ children }: { children: React.ReactNode }) {
  const { usuario, carregando, sair } = useSessao();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!carregando && !usuario) router.replace("/entrar");
  }, [carregando, usuario, router]);

  if (!usuario) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Carregando />
      </div>
    );
  }

  const itens = menu(usuario.papel);
  const ativo = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="min-h-dvh lg:flex">
      {/* ── Barra lateral (desktop) ── */}
      <aside className="bg-surface border-border sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r p-4 lg:flex">
        <div className="px-2 py-2">
          <Logo href="/painel" />
        </div>
        <nav className="mt-6 flex-1 space-y-1" aria-label="Menu principal">
          {itens.map(({ href, rotulo, icone: Icone }) => (
            <Link
              key={href}
              href={href}
              aria-current={ativo(href) ? "page" : undefined}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                ativo(href)
                  ? "bg-primary-subtle text-primary"
                  : "text-text-secondary hover:bg-bg hover:text-text"
              }`}
            >
              <Icone className="size-4" aria-hidden />
              {rotulo}
            </Link>
          ))}
        </nav>
        <div className="border-border flex items-center gap-3 border-t px-2 pt-4">
          <Avatar nome={usuario.nome} tamanho="sm" />
          <div className="min-w-0 flex-1">
            <p className="text-text truncate text-sm font-medium">{usuario.nome}</p>
            <p className="text-text-muted text-xs">{NOME_PAPEL[usuario.papel]}</p>
          </div>
          <button
            type="button"
            onClick={sair}
            className="text-text-muted hover:text-danger cursor-pointer rounded-lg p-2"
            aria-label="Sair"
            title="Sair"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </aside>

      {/* ── Topo (celular) ── */}
      <header className="bg-surface border-border sticky top-0 z-10 flex items-center justify-between border-b px-4 py-3 lg:hidden">
        <Logo href="/painel" />
        {/* Gestão e Perfil não cabem na barra inferior: ficam aqui. */}
        <div className="flex items-center gap-1">
          {usuario.papel === "admin" && (
            <Link href="/gestao" aria-label="Gestão" className="text-text-muted hover:text-text rounded-lg p-2">
              <Settings className="size-5" />
            </Link>
          )}
          <Link href="/perfil" aria-label="Meu perfil" className="rounded-full p-1">
            <Avatar nome={usuario.nome} tamanho="sm" />
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-6 pb-28 sm:px-6 lg:py-10">
        {children}
      </main>

      {/* ── Navegação inferior (celular): só os 5 primeiros itens ── */}
      <nav
        aria-label="Menu principal"
        className="bg-surface border-border fixed inset-x-0 bottom-0 z-10 grid grid-cols-5 border-t pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        {itens.slice(0, 5).map(({ href, rotulo, icone: Icone }) => (
          <Link
            key={href}
            href={href}
            aria-current={ativo(href) ? "page" : undefined}
            className={`flex flex-col items-center gap-1 py-2 text-[11px] font-medium ${
              ativo(href) ? "text-primary" : "text-text-muted"
            }`}
          >
            <Icone className="size-5" aria-hidden />
            <span className="truncate">{rotulo}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
