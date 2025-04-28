const CACHE_NAME = 'inventario-granel-cache-v6'; // <-- Pode incrementar se quiser forçar update

self.addEventListener('install', e => {
  console.log('[Service Worker] Instalando...');
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[Service Worker] Fazendo cache dos arquivos da aplicação');
      return cache.addAll([
        './',
        './index.html',
        './app.js',
        './manifest.json',
        './potes.json',
        'https://cdn.tailwindcss.com',
        'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css'
      ]);
    }).then(() => {
      self.skipWaiting();
       console.log('[Service Worker] Instalação completa, skipWaiting chamado.');
    })
  );
});

self.addEventListener('activate', e => {
  console.log('[Service Worker] Ativando...');
  e.waitUntil(
    caches.keys().then(keyList => {
      return Promise.all(keyList.map(key => {
        if (key !== CACHE_NAME) {
          console.log('[Service Worker] Removendo cache antigo:', key);
          return caches.delete(key);
        }
      }));
    }).then(() => {
      console.log('[Service Worker] Cache limpo, ativado e pronto para controlar clientes.');
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', e => {
  // Estratégia Cache First para assets locais e CDNs conhecidas
  if (e.request.url.includes('cdn.tailwindcss.com') ||
      e.request.url.includes('cdnjs.cloudflare.com') ||
      e.request.url.startsWith(self.location.origin) &&
      ( e.request.mode === 'navigate' || // HTML requests
        e.request.url.endsWith('.js') ||
        e.request.url.endsWith('.json') ||
        e.request.url.endsWith('.css') ||
        e.request.url.endsWith('/') )) {

    e.respondWith(
      caches.match(e.request).then(response => {
        return response || fetch(e.request).then(networkResponse => {
          // Opcional: Atualizar o cache com a resposta da rede
          // let responseToCache = networkResponse.clone();
          // caches.open(CACHE_NAME).then(cache => {
          //   cache.put(e.request, responseToCache);
          // });
          return networkResponse;
        }).catch(error => {
          console.error('[Service Worker] Erro ao buscar na rede (Cache First):', error);
          // Implementar fallback offline se necessário
        });
      })
    );
  } else {
     // Para outras requisições (ex: POST para Google Script), usa Network Only
     e.respondWith(fetch(e.request).catch(error => {
         console.error('[Service Worker] Erro ao buscar na rede (Network Only):', error);
         // Não retorna nada do cache para estas requisições
     }));
  }
});
