import type { Metadata } from "next";
import AuthProvider from "@/components/AuthProvider";
import { ConfirmacaoProvider } from "@/components/Confirmacao";
import "./globals.css";

export const metadata: Metadata = {
  title: "MuralFlow — a escola e a família na mesma página",
  description:
    "Comunicados, agenda e mensagens entre a escola e os responsáveis dos alunos, em um só lugar.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      {/* Extensões do navegador (ex.: ColorZilla) põem atributos no body antes do React. */}
      <body className="min-h-dvh antialiased" suppressHydrationWarning>
        <AuthProvider>
          <ConfirmacaoProvider>{children}</ConfirmacaoProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
