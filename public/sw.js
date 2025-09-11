// Service Worker для TradeControl PWA - ВРЕМЕННО ОТКЛЮЧЕН
console.log('[SW] Service Worker отключен для отладки');
self.addEventListener('install', event => {
  console.log('[SW] Installing but doing nothing...');
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  console.log('[SW] Activating but doing nothing...');
  event.waitUntil(self.clients.claim());
});

// Отключаем перехват запросов
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