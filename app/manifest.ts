import type { MetadataRoute } from "next";

/** App instalável (PWA): o ícone na tela do celular abre o PassaRecado em tela cheia. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "PassaRecado",
    short_name: "PassaRecado",
    description: "Comunicados, agenda, mensagens e a vida escolar dos filhos, num mural só.",
    lang: "pt-BR",
    start_url: "/entrar",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#F5F7F6",
    theme_color: "#0D7888",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
