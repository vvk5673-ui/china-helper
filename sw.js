// Service worker — делает приложение «Помощник в Китае» оффлайн.
// При установке кладёт основные файлы в кэш. Дальше отдаёт из кэша,
// а недостающее (например mp3-озвучку) подкачивает и сохраняет.

var CACHE = "china-helper-v4";

// Файлы ядра, которые кэшируем сразу при установке
var CORE = [
  "./",
  "index.html",
  "style.css",
  "app.js",
  "data/phrases.js",
  "manifest.json",
  "assets/icon-180.png",
  "assets/icon-192.png",
  "assets/icon-512.png",
];

// Подтягиваем данные фраз, чтобы собрать список всех mp3 для оффлайна
try { importScripts("data/phrases.js"); } catch (e) { /* список аудио будет пустым */ }

var AUDIO = (typeof SECTIONS !== "undefined" ? SECTIONS : [])
  .reduce(function (acc, s) { return acc.concat(s.phrases); }, [])
  .filter(function (p) { return p.pinyin; })           // озвучка есть только у фраз с пиньинем
  .map(function (p) { return "audio/" + p.id + ".mp3"; });

var PRECACHE = CORE.concat(AUDIO);

// Установка: складываем ядро + всю озвучку в кэш (для полного оффлайна)
self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE).then(function (cache) {
      // addAll упадёт, если хоть один файл недоступен, поэтому кладём по одному
      return Promise.all(
        PRECACHE.map(function (url) {
          return cache.add(url).catch(function () { /* пропускаем отсутствующее */ });
        })
      );
    }).then(function () { return self.skipWaiting(); })
  );
});

// Активация: чистим старые версии кэша
self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.map(function (k) { if (k !== CACHE) return caches.delete(k); })
      );
    }).then(function () { return self.clients.claim(); })
  );
});

// Запросы: сначала кэш, потом сеть (а сетевой ответ дописываем в кэш)
self.addEventListener("fetch", function (event) {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then(function (cached) {
      if (cached) return cached;
      return fetch(event.request).then(function (resp) {
        // сохраняем удачные ответы того же origin (включая mp3)
        if (resp && resp.status === 200 && resp.type === "basic") {
          var copy = resp.clone();
          caches.open(CACHE).then(function (cache) {
            cache.put(event.request, copy);
          });
        }
        return resp;
      }).catch(function () {
        // оффлайн и нет в кэше — для навигации отдаём главную
        if (event.request.mode === "navigate") return caches.match("index.html");
      });
    })
  );
});
