import { API_URL } from "./api";

/** Endereço completo do logo da escola (a API devolve só o caminho). */
export const urlDoLogo = (caminho: string | null | undefined) => (caminho ? `${API_URL}${caminho}` : null);

/** Luminância relativa (WCAG) de "#RRGGBB". */
function luminancia(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Contraste entre a cor e o branco (texto dos botões). 4,5 ou mais é legível. */
export const contrasteComBranco = (hex: string) => 1.05 / (luminancia(hex) + 0.05);

/**
 * CSS que troca a cor principal do app pela da escola. Do tom escolhido saem
 * as variações: texto e ícones, fundo suave, botão e botão com o mouse em
 * cima, nos modos claro e escuro. Cor clara demais para texto em fundo
 * branco é escurecida só no texto (o botão mantém a cor original).
 */
export function cssDaCor(cor: string) {
  const textoClaro = contrasteComBranco(cor) < 4.5 ? `color-mix(in oklab, ${cor} 65%, black)` : cor;
  const claro = `
    --color-primary: ${textoClaro};
    --color-primary-subtle: color-mix(in oklab, ${cor} 10%, white);
    --color-primary-solid: ${cor};
    --color-primary-solid-hover: color-mix(in oklab, ${cor} 82%, black);`;
  const escuro = `
    --color-primary: color-mix(in oklab, ${cor} 55%, white);
    --color-primary-subtle: color-mix(in oklab, ${cor} 22%, #121A18);`;
  return `:root {${claro}}
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) {${escuro}} }
:root[data-theme="dark"] {${escuro}}`;
}
