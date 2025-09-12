// Service Worker для TradeFrame PWA - Minimal Safe Version
console.log('[SW] TradeFrame Service Worker starting...');

const CACHE_NAME = 'tradeframe-v1';
const BASE_PATH = '/tradeframe-builder/';

// Минимальная установка SW
self.addEventListener('install', event => {
  console.log('[SW] Installing minimal service worker');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Cache opened successfully');
        // Не кешируем ничего при установке, чтобы избежать проблем
        return Promise.resolve();
      })
      .then(() => {
        console.log('[SW] Install complete, skipping waiting');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('[SW] Install failed:', error);
      })
  );
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