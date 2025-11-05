const CACHE_NAME = 'offline-cache-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/style.css',
    '/tga.js',
    '/mapping.txt',
    '/placeholder.png',
    '/placeholder_mip0.png',
    '/placeholder_mip1.png',
    '/placeholder_mip2.png',
    '/placeholder_mip3.png',
    '/script.js',
    'https://cdnjs.cloudflare.com/ajax/libs/mdui/1.0.2/css/mdui.min.css',
    'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/downloadjs/1.4.8/download.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/mdui/1.0.2/js/mdui.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/mdui/1.0.2/fonts/roboto/Roboto-Medium.woff',
    'https://cdnjs.cloudflare.com/ajax/libs/mdui/1.0.2/fonts/roboto/Roboto-Regular.woff',
    'https://cdnjs.cloudflare.com/ajax/libs/mdui/1.0.2/fonts/roboto/Roboto-Bold.woff',
    'https://cdnjs.cloudflare.com/ajax/libs/mdui/1.0.2/icons/material-icons/MaterialIcons-Regular.woff',
    '/favicon.ico'
];

// 安装阶段：预缓存核心资源
self.addEventListener('install', function (event) {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(function (cache) {
                console.log('已打开缓存');
                return cache.addAll(urlsToCache);
            })
    );
});

self.addEventListener('activate', function (event) {
    event.waitUntil(
        caches.keys().then(function (cacheNames) {
            return Promise.all(
                cacheNames.map(function (cacheName) {
                    if (cacheName !== CACHE_NAME) {
                        console.log('删除旧缓存:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// 拦截请求：实现缓存优先策略
self.addEventListener('fetch', function (event) {
    event.respondWith(
        caches.match(event.request)
            .then(function (response) {
                // 如果缓存中有，直接返回缓存内容
                if (response) {
                    return response;
                }

                // 否则从网络请求，并缓存新请求
                return fetch(event.request).then(function (response) {
                    if (!response || response.status !== 200 || response.type !== 'basic' || !event.request.url.startsWith(self.location.origin)) {
                        return response;
                    }

                    const responseToCache = response.clone();

                    caches.open(CACHE_NAME)
                        .then(function (cache) {
                            cache.put(event.request, responseToCache);
                        });

                    return response;
                });
            }).catch(function () {
            })
    );
});