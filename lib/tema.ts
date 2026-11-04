/**
 * Modo claro/escuro. A escolha fica no aparelho (localStorage) e vale para o
 * app inteiro, inclusive antes do login. "sistema" segue o celular/computador.
 *
 * O CSS (globals.css) troca as cores pelo atributo data-theme do <html>; o
 * script SCRIPT_DO_TEMA aplica a escolha antes da página pintar, para quem
 * usa o modo escuro não ver um clarão branco ao abrir o app.
 */
export type Tema = "claro" | "escuro" | "sistema";

export const CHAVE_DO_TEMA = "passarecado:tema";
const EVENTO = "passarecado:tema";

const prefereEscuro = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;

export function lerTema(): Tema {
  try {
    const t = localStorage.getItem(CHAVE_DO_TEMA);
    return t === "claro" || t === "escuro" ? t : "sistema";
  } catch {
    return "sistema";
  }
}

/** Põe no <html> o tema de verdade (claro ou escuro) da escolha. */
export function aplicarTema(tema: Tema) {
  const escuro = tema === "escuro" || (tema === "sistema" && prefereEscuro());
  const html = document.documentElement;
  html.dataset.theme = escuro ? "dark" : "light";
  html.style.colorScheme = escuro ? "dark" : "light";
}

export function escolherTema(tema: Tema) {
  try {
    if (tema === "sistema") localStorage.removeItem(CHAVE_DO_TEMA);
    else localStorage.setItem(CHAVE_DO_TEMA, tema);
  } catch {
    /* modo privado: vale só nesta aba */
  }
  aplicarTema(tema);
  window.dispatchEvent(new Event(EVENTO));
}

/** Assinatura para o useSyncExternalStore: escolha nesta aba, em outra aba ou no sistema. */
export function observarTema(avisar: () => void) {
  const midia = window.matchMedia("(prefers-color-scheme: dark)");
  const mudouSistema = () => {
    if (lerTema() === "sistema") aplicarTema("sistema");
    avisar();
  };
  const mudouOutraAba = (e: StorageEvent) => {
    if (e.key !== CHAVE_DO_TEMA) return;
    aplicarTema(lerTema());
    avisar();
  };
  window.addEventListener(EVENTO, avisar);
  window.addEventListener("storage", mudouOutraAba);
  midia.addEventListener("change", mudouSistema);
  return () => {
    window.removeEventListener(EVENTO, avisar);
    window.removeEventListener("storage", mudouOutraAba);
    midia.removeEventListener("change", mudouSistema);
  };
}

/** Roda no <head>, antes de tudo: mesma regra de aplicarTema, sem depender do bundle. */
export const SCRIPT_DO_TEMA = `(function(){try{var t=localStorage.getItem(${JSON.stringify(CHAVE_DO_TEMA)});var e=t==="escuro"||(t!=="claro"&&matchMedia("(prefers-color-scheme: dark)").matches);var h=document.documentElement;h.dataset.theme=e?"dark":"light";h.style.colorScheme=e?"dark":"light";}catch(_){}})();`;
