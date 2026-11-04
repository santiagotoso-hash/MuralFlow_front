// Service worker do PassaRecado (app instalável no celular).
// - A API fica em outro endereço (o back): nunca passa por aqui, os dados vêm sempre do servidor.
// - Telas: primeiro a rede, então cada deploy na Vercel chega na hora; sem internet, abre a última
//   versão salva daquela tela (ou a de entrar).
// - Arquivos com hash no nome (/_next/static) e ícones: do cache (o nome muda a cada versão).
const VERSAO = 'v1';
const TELAS = `passarecado-telas-${VERSAO}`;
const ARQUIVOS = `passarecado-arquivos-${VERSAO}`;
const MAX_ARQUIVOS = 120;

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      for (const chave of await caches.keys()) if (chave !== TELAS && chave !== ARQUIVOS) await caches.delete(chave);
      await self.clients.claim();
    })(),
  );
});

// Guarda só os arquivos mais recentes (versões antigas saem sozinhas).
async function aparar(cache) {
  const chaves = await cache.keys();
  for (const req of chaves.slice(0, Math.max(0, chaves.length - MAX_ARQUIVOS))) await cache.delete(req);
}

async function tela(request) {
  try {
    const res = await fetch(request);
    if (res.ok) (await caches.open(TELAS)).put(request, res.clone());
    return res;
  } catch {
    return (await caches.match(request)) ?? (await caches.match('/entrar')) ?? Response.error();
  }
}

async function arquivo(request) {
  const salvo = await caches.match(request);
  if (salvo) return salvo;
  const res = await fetch(request);
  if (res.ok) {
    const cache = await caches.open(ARQUIVOS);
    await cache.put(request, res.clone());
    aparar(cache);
  }
  return res;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (request.mode === 'navigate') event.respondWith(tela(request));
  else if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/')) event.respondWith(arquivo(request));
});
