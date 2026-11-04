/**
 * App instalável (PWA), como no PontoHub: registra o service worker, guarda o
 * convite de instalação do Android/Chrome e diz se dá para instalar.
 *
 * O Chrome pode mandar o convite (beforeinstallprompt) antes de o React
 * carregar: SCRIPT_DO_PWA, no <head>, já o guarda em window.__passarecadoInstalar.
 */

interface ConviteDeInstalacao extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

declare global {
  interface Window {
    __passarecadoInstalar?: ConviteDeInstalacao | null;
  }
}

const EVENTO = "passarecado:instalar";
const CHAVE_DISPENSA = "passarecado:instalar-dispensado";
const DIAS_DE_DISPENSA = 14;

/** Roda no <head>: guarda o convite que chegar antes do React. */
export const SCRIPT_DO_PWA = `(function(){window.addEventListener("beforeinstallprompt",function(e){e.preventDefault();window.__passarecadoInstalar=e;window.dispatchEvent(new Event(${JSON.stringify(EVENTO)}));});window.addEventListener("appinstalled",function(){window.__passarecadoInstalar=null;window.dispatchEvent(new Event(${JSON.stringify(EVENTO)}));});})();`;

/** Registra o service worker (só em produção: no desenvolvimento ele atrapalharia o recarregar). */
export function registrarServiceWorker() {
  if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
  navigator.serviceWorker.register("/sw.js").catch(() => {});
}

export const estaInstalado = () =>
  window.matchMedia?.("(display-mode: standalone)").matches ||
  (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

export const ehIphone = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

export const ehCelular = () => Boolean(window.matchMedia?.("(pointer: coarse)").matches);

export const podeInstalar = () => Boolean(window.__passarecadoInstalar);

export function observarInstalacao(avisar: () => void) {
  window.addEventListener(EVENTO, avisar);
  return () => window.removeEventListener(EVENTO, avisar);
}

/** Abre a janela de instalação do Android/Chrome. Devolve true se a pessoa instalou. */
export async function instalar() {
  const convite = window.__passarecadoInstalar;
  if (!convite) return false;
  window.__passarecadoInstalar = null;
  window.dispatchEvent(new Event(EVENTO));
  await convite.prompt();
  const { outcome } = await convite.userChoice;
  return outcome === "accepted";
}

/** "Agora não": o convite volta depois de alguns dias. */
export const dispensa = {
  ativa: () => {
    try {
      const em = Number(localStorage.getItem(CHAVE_DISPENSA));
      return Boolean(em) && Date.now() - em < DIAS_DE_DISPENSA * 86_400_000;
    } catch {
      return false;
    }
  },
  marcar: () => {
    try {
      localStorage.setItem(CHAVE_DISPENSA, String(Date.now()));
    } catch {
      /* sem armazenamento: o convite só volta na próxima visita */
    }
  },
};
