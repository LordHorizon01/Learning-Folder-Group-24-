self.addEventListener("install", e=>{
  e.waitUntil(
    caches.open("video-cache").then(c=>{
      return c.addAll(["index.html"]);
    })
  );
});

self.addEventListener("fetch", e=>{
  e.respondWith(
    caches.match(e.request).then(res=>{
      return res || fetch(e.request);
    })
  );
});
