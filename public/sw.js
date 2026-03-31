// Service worker mínimo para PWA (instalação e ativação).
// Não intercepta requisições fetch para evitar conflitos com uploads.

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});
