import type { Metadata, Viewport } from "next";
import AuthProvider from "@/components/AuthProvider";
import { ConfirmacaoProvider } from "@/components/Confirmacao";
import { RegistrarPwa } from "@/components/InstalarApp";
import { SCRIPT_DO_PWA } from "@/lib/pwa";
import { SCRIPT_DO_TEMA } from "@/lib/tema";
import "./globals.css";

export const metadata: Metadata = {
  title: "PassaRecado — a escola e a família na mesma página",
  description:
    "Comunicados, agenda e mensagens entre a escola e os responsáveis dos alunos, em um só lugar.",
  // App instalável no iPhone (o Android usa o app/manifest.ts).
  appleWebApp: { capable: true, title: "PassaRecado", statusBarStyle: "default" },
  // Com icons definido aqui, o Next não põe o app/icon.svg sozinho: vão os dois.
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: "/icons/apple-touch-icon.png",
  },
};

/** Cor da barra do celular e do app instalado, nos dois modos. */
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0D7888" },
    { media: "(prefers-color-scheme: dark)", color: "#0B1110" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // O script do tema muda o <html> antes do React: suppressHydrationWarning.
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        {/* Claro/escuro antes de pintar a página (sem clarão branco no modo escuro). */}
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_DO_TEMA }} />
        {/* Guarda o convite de instalação do Android, que pode chegar antes do React. */}
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_DO_PWA }} />
      </head>
      {/* Extensões do navegador (ex.: ColorZilla) põem atributos no body antes do React. */}
      <body className="min-h-dvh antialiased" suppressHydrationWarning>
        <AuthProvider>
          <ConfirmacaoProvider>{children}</ConfirmacaoProvider>
          <RegistrarPwa />
        </AuthProvider>
      </body>
    </html>
  );
}
