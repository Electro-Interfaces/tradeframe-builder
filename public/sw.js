// Service Worker для TradeFrame PWA - Minimal Safe Version
console.log('[SW] TradeFrame Service Worker starting...');

const CACHE_NAME = `tradeframe-v${Date.now()}`; // Уникальная версия для каждой сборки
const BASE_PATH = '/tradeframe-builder/';

// Минимальная установка SW
self.addEventListener('install', event => {
  console.log('[SW] Installing service worker version:', CACHE_NAME);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Cache opened successfully');
        return Promise.resolve();
      })
      .catch(error => {
        console.error('[SW] Install failed:', error);
      })
  );
  // Не вызываем skipWaiting() автоматически - ждем команды от клиента
});

// Активация SW
self.addEventListener('activate', event => {
  console.log('[SW] Activating service worker');
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        // Удаляем старые кеши
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Activation complete, claiming clients');
        return self.clients.claim();
      })
      .catch(error => {
        console.error('[SW] Activation failed:', error);
      })
  );
});

// Минимальная обработка fetch - только для навигации
self.addEventListener('fetch', event => {
  // Обрабатываем только навигационные запросы для SPA routing
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          // При ошибке сети возвращаем главную страницу
          console.log('[SW] Navigation failed, returning index');
          return caches.match(BASE_PATH) || fetch(BASE_PATH + 'index.html');
        })
    );
  }
  // Все остальные запросы проходят без изменений
});

// Обработка сообщений от клиента
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[SW] Received SKIP_WAITING message, activating new version');
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