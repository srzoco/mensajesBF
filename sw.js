/* Armador de mensajes — abre rápido aunque el internet esté lento.
   La página: primero internet, pero si tarda más de 1,5 s se abre la guardada. config.js de CIL: lo guardado y se actualiza por detrás.
   Los datos (catálogo, descuento) nunca pasan por aquí: siempre se piden frescos. */
var CACHE = 'armador-v1';
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k.indexOf('armador-') === 0 && k !== CACHE; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); }));
});
function guardar(req, r) { if (r && r.ok) { var copia = r.clone(); caches.open(CACHE).then(function (c) { c.put(req, copia); }); } return r; }
self.addEventListener('fetch', function (e) {
  var req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  if (req.mode === 'navigate') {
    var red = fetch(req).then(function (r) { return guardar(req, r); });
    var guardada = caches.match(req, { ignoreSearch: true });
    e.waitUntil(red.catch(function () { /* sin internet */ }));
    e.respondWith(new Promise(function (ok, mal) {
      var listo = false, fin = function (r) { if (!listo && r) { listo = true; ok(r); } };
      var plan = function () { guardada.then(function (hit) { if (hit) fin(hit); else red.then(fin, mal); }); };
      var t = setTimeout(plan, 1500);
      red.then(function (r) { clearTimeout(t); fin(r); }, function () { clearTimeout(t); plan(); });
    }));
    return;
  }
  if (/\/cil\/config\.js$/.test(url.pathname) || /[?&]v=\d/.test(url.search) && /\/cil\/comun\//.test(url.pathname)) {
    var red2 = fetch(req).then(function (r) { return guardar(req, r); });
    e.waitUntil(red2.catch(function () { /* nada */ }));
    e.respondWith(caches.match(req).then(function (hit) { return hit || red2; }));
  }
});
