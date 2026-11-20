# KingKER — source files

The live website is the files in the repo root (index.html, config.js, manifest, sw.js, icons).
They are generated from the source in this folder.

- `app.html` — the app (UI, multiplayer, Bob the dealer). Contains a `/*ENGINE*/` placeholder.
- `engine.js` — Texas Hold'em rules engine (shuffle/deal, betting, side pots, hand evaluation, bots, all-in equity).
- `build.py` — builds `index.html` (Claude version, no website extras) and `site/` (website version). Run from a folder containing app.html + engine.js; copy `site/index.html` to the repo root.
- `test.js` — engine tests: `node test.js` (hand evaluator + hundreds of simulated tournaments, chip conservation).
- `e2e.py` — browser test of practice + online play (Claude room mock). Needs Playwright + Chrome.
- `p2p_e2e.py` + `server.js` — browser test of the website's direct phone-to-phone play against a local PeerJS server (`npm i peer peerjs@1.5.4`, `node server.js`).
- `icon.html` — source for the app icons.

Online play: direct phone-to-phone via PeerJS by default. Put a Firebase web config in `config.js`
(`window.FIREBASE_CONFIG = {...}`) to switch on the shared leaderboard, dealer takeover and server-based connection.
