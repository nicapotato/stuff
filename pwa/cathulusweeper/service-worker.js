/* Pilot PWA: scoped to /pwa/cathulusweeper/ — does not modify shared play.js or catalog. */
var VERSION = "cathulusweeper-pwa-1";
var CACHE_SHELL = "cathulusweeper-shell-" + VERSION;
var CACHE_RUNTIME = "cathulusweeper-runtime-" + VERSION;

var CATALOG_BASE =
  "https://prod-nicapotato-public-software.s3.eu-west-2.amazonaws.com";
var CATALOG_URL = CATALOG_BASE + "/games/released/catalog.json";
var GAME_KEY = "cathulusweeper";
var GAME_VERSION = "0.0.15-wasd-prototype";

var SHELL_PATHS = [
  "/pwa/cathulusweeper/index.html",
  "/styles.css",
  "/play.js",
];

function pickPlayPlatform(platforms) {
  if (!platforms) return null;
  if (platforms.wasm && platforms.wasm.play_url) return platforms.wasm;
  if (platforms.web && platforms.web.play_url) return platforms.web;
  return null;
}

self.addEventListener("install", function (event) {
  event.waitUntil(
    (async function () {
      var shell = await caches.open(CACHE_SHELL);
      for (var i = 0; i < SHELL_PATHS.length; i++) {
        try {
          await shell.add(SHELL_PATHS[i]);
        } catch (e) {
          console.warn("PWA shell precache failed:", SHELL_PATHS[i], e);
        }
      }
      try {
        var res = await fetch(CATALOG_URL);
        if (!res.ok) throw new Error("catalog HTTP " + res.status);
        var catalog = await res.clone().json();
        var root = (catalog && catalog.games) || {};
        var g = root[GAME_KEY];
        var v = g && g.versions && g.versions[GAME_VERSION];
        var play = v && pickPlayPlatform(v.platforms);
        var playUrl = play && play.play_url;
        var runtime = await caches.open(CACHE_RUNTIME);
        await runtime.put(CATALOG_URL, res);
        if (playUrl) {
          try {
            await runtime.add(playUrl);
          } catch (e) {
            console.warn("PWA game bundle precache failed:", e);
          }
        }
      } catch (e) {
        console.warn("PWA runtime precache skipped:", e);
      }
    })()
  );
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    (async function () {
      var keys = await caches.keys();
      var keep = [CACHE_SHELL, CACHE_RUNTIME];
      await Promise.all(
        keys
          .filter(function (k) {
            return k.indexOf("cathulusweeper-") === 0 && keep.indexOf(k) === -1;
          })
          .map(function (k) {
            return caches.delete(k);
          })
      );
    })()
  );
  self.clients.claim();
});

function isCatalogOrAsset(url) {
  return url.origin === new URL(CATALOG_BASE).origin || url.href.indexOf(CATALOG_BASE) === 0;
}

self.addEventListener("fetch", function (event) {
  if (event.request.method !== "GET") return;
  var url = new URL(event.request.url);

  if (url.origin === self.location.origin) {
    if (event.request.mode === "navigate") {
      var pathname = url.pathname.replace(/\/+$/, "") || "/";
      if (pathname === "/pwa/cathulusweeper") {
        event.respondWith(
          (async function () {
            var cached = await caches.match("/pwa/cathulusweeper/index.html");
            if (cached) return cached;
            return fetch(event.request);
          })()
        );
        return;
      }
    }
    event.respondWith(
      (async function () {
        var cached = await caches.match(event.request);
        if (cached) return cached;
        return fetch(event.request);
      })()
    );
    return;
  }

  if (isCatalogOrAsset(url)) {
    event.respondWith(
      (async function () {
        try {
          var res = await fetch(event.request);
          if (res.ok) {
            var runtime = await caches.open(CACHE_RUNTIME);
            await runtime.put(event.request, res.clone());
          }
          return res;
        } catch (e) {
          var fallback = await caches.match(event.request);
          if (fallback) return fallback;
          throw e;
        }
      })()
    );
  }
});
