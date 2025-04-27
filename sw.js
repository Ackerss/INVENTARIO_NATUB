const CACHE_NAME = 'inventario-granel-cache-v1';
// Adiciona potes.json à lista de cache para que a busca funcione offline
const urlsToCache = [
    './', // Importante para PWA
    './index.html',
    './app.js',
    './manifest.json',
    './potes.json', // Adicionado aqui!
    'https://cdn.tailwindcss.com',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css',
    // URLs dos ícones (use os seus se tiver)
    'https://placehold.co/192x192/4A90E2/FFFFFF?text=InvG',
    'https://placehold.co/512x512/4A90E2/FFFFFF?text=InvGranel'
];

self.addEventListener('install', evt => {
    console.log('Service Worker: Instalando...');
    evt.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log('Service Worker: Cache aberto, adicionando arquivos estáticos...');
             return cache.addAll(urlsToCache).catch(error => {
                 console.error('Falha ao cachear alguns arquivos durante a instalação:', error);
             });
        }).then(() => {
            console.log('Service Worker: Instalação concluída. Ativando...');
            return self.skipWaiting(); // Ativa imediatamente
        })
    );
});

self.addEventListener('activate', evt => {
    console.log('Service Worker: Ativando...');
    evt.waitUntil(
        caches.keys().then(keys => Promise.all(
            keys.map(key => {
                if (key !== CACHE_NAME) {
                     console.log('Service Worker: Removendo cache antigo:', key);
                    return caches.delete(key);
                }
            })
        )).then(() => {
            console.log('Service Worker: Cache limpo, pronto para controlar a página.');
            return self.clients.claim(); // Controla clientes abertos imediatamente
        })
    );
});

// Estratégia Cache First
self.addEventListener('fetch', evt => {
    // Ignora requisições POST para o Google Apps Script
    if (evt.request.method === 'POST' && evt.request.url.startsWith('https://script.google.com/')) {
        console.log('Service Worker: Ignorando fetch POST para Google Script.');
        return; // Deixa a rede tratar
    }

    // Para outras requisições (GET, etc.)
    evt.respondWith(
        caches.match(evt.request).then(cachedResponse => {
            if (cachedResponse) {
                return cachedResponse; // Encontrado no cache
            }
            // Não encontrado no cache, busca na rede
            return fetch(evt.request).then(networkResponse => {
                // Opcional: Cachear novas respostas
                return networkResponse;
            }).catch(error => {
                 console.warn(`Service Worker: Falha ao buscar na rede para ${evt.request.url}:`, error);
                 // Opcional: Retornar página offline
            });
        })
    );
});
