// sw.js — Service Worker for offline-first caching
const CACHE_NAME = 'superxo-v1.0.0';

const ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './css/home.css',
  './css/game.css',
  './css/animations.css',
  './css/themes.css',
  './css/responsive.css',
  './js/main.js',
  './js/storage.js',
  './js/theme.js',
  './js/settings.js',
  './js/sound.js',
  './js/timer.js',
  './js/ai.js',
  './js/hint.js',
  './js/classic.js',
  './js/ultimate.js',
  './js/replay.js',
  './js/statistics.js',
  './js/achievements.js',
  './js/tutorial.js',
  './manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});
