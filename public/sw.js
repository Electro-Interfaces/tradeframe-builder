// Service Worker для TradeFrame PWA - Full PWA Version

// Детекция iOS для специальной обработки
const isIOS = /iPad|iPhone|iPod/.test(self.navigator.userAgent);

const CACHE_NAME = `tradeframe-v${Date.now()}`; // Уникальная версия для каждой сборки
const BASE_PATH = new URL(self.registration.scope).pathname;

// Критические ресурсы для кэширования
const CORE_CACHE_URLS = [
  BASE_PATH,
  BASE_PATH + 'index.html',
  BASE_PATH + 'manifest.json',
  BASE_PATH + 'icon.svg',
  BASE_PATH + 'favicon.ico',
  BASE_PATH + 'icon-192x192.png',
  BASE_PATH + 'icon-512x512.png'
];

// Полная установка SW с кэшированием
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(CORE_CACHE_URLS);
      })
      .then(() => {
        return self.skipWaiting(); // Активируем новый SW сразу
      })
      .catch(() => {
        // Продолжаем установку даже при ошибке кэширования
        return Promise.resolve();
      })
  );
});

// Активация SW
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        // Удаляем старые кеши
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME) {
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        return self.clients.claim();
      })
  );
});

// Обработка fetch запросов - Cache First для статики, Network First для данных
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Кэшируем статические ресурсы (изображения, иконки, манифест)
  if (event.request.destination === 'image' ||
      url.pathname.endsWith('.png') ||
      url.pathname.endsWith('.svg') ||
      url.pathname.endsWith('.ico') ||
      url.pathname.endsWith('manifest.json')) {
    event.respondWith(
      caches.match(event.request)
        .then(cachedResponse => {
          if (cachedResponse) {
            return cachedResponse;
          }
          return fetch(event.request).then(networkResponse => {
            // Кэшируем успешные ответы
            if (networkResponse.ok) {
              const responseClone = networkResponse.clone();
              caches.open(CACHE_NAME).then(cache => {
                cache.put(event.request, responseClone);
              });
            }
            return networkResponse;
          });
        })
        .catch(() => {
          // Возвращаем fallback для изображений
          if (event.request.destination === 'image') {
            return new Response('', { status: 404 });
          }
        })
    );
  }
  // Обрабатываем навигационные запросы для SPA
  // Используем Stale-While-Revalidate для мгновенной загрузки на мобильных
  else if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.match(BASE_PATH + 'index.html')
        .then(cachedResponse => {
          // Параллельно обновляем кеш в фоне
          const fetchPromise = fetch(event.request)
            .then(networkResponse => {
              if (networkResponse.ok) {
                const responseClone = networkResponse.clone();
                caches.open(CACHE_NAME).then(cache => {
                  cache.put(BASE_PATH + 'index.html', responseClone);
                });
              }
              return networkResponse;
            })
            .catch(() => {
              return cachedResponse;
            });

          // Возвращаем кеш СРАЗУ если есть, иначе ждём сеть
          if (cachedResponse) {
            return cachedResponse;
          }

          // Если кеша нет (первая загрузка), ждём сеть
          return fetchPromise.catch(() => {
            // Fallback offline страница только если совсем ничего нет
            return new Response(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>TradeFrame - Офлайн</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body {
      margin: 0; padding: 20px; font-family: Arial, sans-serif;
      background: #1e293b; color: white; text-align: center;
    }
    .offline { margin-top: 50px; }
    .retry { margin-top: 20px; padding: 10px 20px; background: #3b82f6;
             color: white; border: none; border-radius: 5px; cursor: pointer; }
  </style>
</head>
<body>
  <div class="offline">
    <h1>🌐 TradeFrame</h1>
    <p>Нет подключения к интернету</p>
    <button class="retry" onclick="window.location.reload()">Повторить</button>
  </div>
</body>
</html>`, {
                headers: { 'Content-Type': 'text/html' }
              });
            });
        })
    );
  }
});

// Обработка сообщений от клиента
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
/*
const CACHE_NAME = 'tradecontrol-v1';
const OFFLINE_URL = '/offline.html';

// Ресурсы для кэширования
const CACHE_URLS = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/icon.svg',
  '/favicon.ico'
];

// Установка Service Worker
self.addEventListener('install', event => {
  console.log('[SW] Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Caching app shell');
        return cache.addAll(CACHE_URLS);
      })
      .then(() => {
        console.log('[SW] Installed successfully');
        return self.skipWaiting();
      })
  );
});

// Активация Service Worker
self.addEventListener('activate', event => {
  console.log('[SW] Activating...');
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[SW] Activated successfully');
      return self.clients.claim();
    })
  );
});

*/