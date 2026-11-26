/* Zihan Wang Interactive CV · offline shell
   只缓存同源静态资源；AI 代理是跨域请求，不经过这里。 */
const CACHE = 'zihan-cv-v5';
const BASE = self.registration.scope;
const url = function (p) { return new URL(p, BASE).href; };

const CORE = [
  './', './index.html', './manifest.webmanifest',
  './css/3d.css',
  './js/main.js', './js/3d.js', './js/twin.js', './js/ta.js', './js/bid.js',
  './js/oec-card.js', './js/rtu-card.js',
  './js/drone-temps.js', './js/drone-card.js', './js/ux-card.js',
  './js/stepper-card.js', './js/ai-twin.js', './js/lazy3d.js',
  './assets/portrait/portrait-me.webp'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE)
      .then(function (c) { return c.addAll(CORE.map(url)); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (keys) { return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); })); })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  const req = e.request;
  if (req.method !== 'GET') return;
  const u = new URL(req.url);
  if (u.origin !== self.location.origin) return;      // AI 代理等跨域请求直连
  if (u.pathname.toLowerCase().endsWith('.mp4')) return; // 大视频不缓存，避免占手机空间

  if (req.mode === 'navigate') {
    // 页面：先网络，断网时用缓存的同一份首页
    e.respondWith(
      fetch(req).then(function (res) {
        const copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(url('./index.html'), copy); });
        return res;
      }).catch(function () { return caches.match(url('./index.html')); })
    );
    return;
  }

  // 静态资源：先缓存，后台顺便更新
  e.respondWith(
    caches.match(req).then(function (hit) {
      if (hit) {
        fetch(req).then(function (res) {
          if (res && res.ok) caches.open(CACHE).then(function (c) { c.put(req, res.clone()); });
        }).catch(function () {});
        return hit;
      }
      return fetch(req).then(function (res) {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); });
        }
        return res;
      });
    })
  );
});
