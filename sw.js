// Speichert das Spiel nach dem ersten Start, damit es offline läuft.
const CACHE = "tag-der-arbeit-v1";
const CORE = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "icons/icon-180.png",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "ruffle/ruffle.js",
  "ruffle/core.ruffle.16d61072ac7fdc4d5013.js",
  "ruffle/core.ruffle.994eeef0a471a88cd0e3.js",
  "swf/preloader.swf",
  "swf/main.swf",
  "swf/game.swf",
];

// Die Original-Highscore-Liste kam von einem PHP-Server, den es nicht mehr gibt.
const HSCORE = "&points0=XJ&name0=Happy May Day";

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;

  if (url.pathname.endsWith(".php")) {
    const body = url.pathname.endsWith("hscore.php") ? HSCORE : "";
    e.respondWith(new Response(body, { headers: { "Content-Type": "text/plain" } }));
    return;
  }
  if (e.request.method !== "GET") return;

  // Die Seite selbst: erst Netz (für Updates), offline aus dem Cache.
  if (e.request.mode === "navigate") {
    e.respondWith(
      fetch(e.request).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put("index.html", copy));
        return res;
      }).catch(() => caches.match("index.html"))
    );
    return;
  }

  // Alles andere: Cache zuerst; die große Ruffle-WASM-Datei wird beim ersten Laden mitgespeichert.
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(hit => hit || fetch(e.request).then(res => {
      if (res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
      }
      return res;
    }))
  );
});
