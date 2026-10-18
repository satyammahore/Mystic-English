/* MysticEnglish service worker: lets lessons, quizzes and notes work offline.
   Bump CACHE_VERSION whenever you change files and want everyone to refresh them. */
const CACHE_VERSION = "v1";
const CACHE = "mysticenglish-" + CACHE_VERSION;

const TOPICS = ["Tense", "Model", "Preposition", "Article", "Determiners"];

const PRECACHE = [
    "./",
    "index.html",
    "style.css",
    "script.js",
    "manifest.webmanifest",
    "assets/favicon.svg",
    "assets/favicon-32.png",
    "assets/icon-192.png",
    "assets/icon-512.png",
    "assets/apple-touch-icon.png",
    "assets/poster.jpg",
    "pdfs/application.pdf",
    "pdfs/essay.pdf",
    "https://cdn.jsdelivr.net/npm/page-flip/dist/js/page-flip.browser.min.js"
].concat(
    TOPICS.map((t) => "data/" + t + "_data.json"),
    TOPICS.map((t) => "data/" + t + "_quiz.json")
);

// Each file is cached on its own, so one missing file (e.g. no poster yet) can't break the install.
self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE)
            .then((cache) => Promise.allSettled(PRECACHE.map((url) => cache.add(url))))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(
                keys.filter((k) => k.startsWith("mysticenglish-") && k !== CACHE)
                    .map((k) => caches.delete(k))
            ))
            .then(() => self.clients.claim())
    );
});

// Stale-while-revalidate: answer from cache right away, refresh the copy in the background.
self.addEventListener("fetch", (event) => {
    const req = event.request;
    if (req.method !== "GET") return;

    const url = new URL(req.url);
    // The background video is large and uses range requests, so it always goes to the network.
    if (req.headers.has("range") || req.destination === "video" || /\.(webm|mp4)$/i.test(url.pathname)) return;
    if (url.protocol !== "http:" && url.protocol !== "https:") return;

    event.respondWith((async () => {
        const cache = await caches.open(CACHE);
        const cached = await cache.match(req);

        const refresh = fetch(req)
            .then((res) => {
                if (res && (res.ok || res.type === "opaque")) cache.put(req, res.clone());
                return res;
            })
            .catch(() => null);

        if (cached) {
            event.waitUntil(refresh);
            return cached;
        }

        const fresh = await refresh;
        if (fresh) return fresh;

        // Offline and not cached: fall back to the app shell for page loads.
        if (req.mode === "navigate") {
            const shell = (await cache.match("./")) || (await cache.match("index.html"));
            if (shell) return shell;
        }
        return Response.error();
    })());
});
