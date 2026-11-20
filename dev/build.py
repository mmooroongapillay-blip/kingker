import re, os, json
src = open('app.html').read()
eng = open('engine.js').read()
eng = eng[eng.index('/*ENGINE START*/'):eng.index('/*ENGINE END*/') + len('/*ENGINE END*/')]
assert src.count('/*ENGINE*/') == 1
full = src.replace('/*ENGINE*/', eng)
# claude.ai build: no site-only assets
claude = re.sub(r'<!--SITE-->.*?<!--/SITE-->\n?', '', full, flags=re.S)
open('index.html', 'w').write(claude)
# website build
os.makedirs('site', exist_ok=True)
open('site/index.html', 'w').write(full.replace('<!--SITE-->\n', '').replace('<!--/SITE-->\n', ''))
if not os.path.exists('site/config.js'):
    open('site/config.js', 'w').write("// KingKER website settings\nwindow.KK_SITE = true;\n// Paste the Firebase web config here later to switch on the shared leaderboard + dealer takeover\nwindow.FIREBASE_CONFIG = null;\n")
open('site/manifest.webmanifest', 'w').write(json.dumps({
  "name": "KingKER — Texas Hold'em", "short_name": "KingKER", "start_url": "./", "scope": "./", "display": "standalone",
  "orientation": "portrait", "background_color": "#0a100e", "theme_color": "#0a100e",
  "description": "Texas Hold'em with your friends — Heads-Up & Sit & Go",
  "icons": [{"src": "icon-192.png", "sizes": "192x192", "type": "image/png"},
            {"src": "icon-512.png", "sizes": "512x512", "type": "image/png"},
            {"src": "icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"}]}, indent=1))
open('site/sw.js', 'w').write("""// KingKER offline support: network first, cached copy when offline
const C = 'kingker-v1';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];
self.addEventListener('install', e => { self.skipWaiting(); e.waitUntil(caches.open(C).then(c => c.addAll(SHELL)).catch(() => {})); });
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(r => { const cp = r.clone(); caches.open(C).then(c => c.put(e.request, cp)); return r; })
    .catch(() => caches.match(e.request).then(r => r || caches.match('./index.html'))));
});
""")
open('site/.nojekyll', 'w').write('')
print('built', len(claude), len(full))
