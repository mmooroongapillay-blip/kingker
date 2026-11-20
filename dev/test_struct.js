const E = require('./engine.js');
let games = 0, hands = 0, rebuys = 0, addons = 0, waits = 0, antes = 0;
for (const fmt of ['hu', 'sng6', 'sng9']) for (let g = 0; g < 8; g++) {
  const T = E.newTable({ fmt, stack: 1500, mins: 1, turn: 10, buyin: 100, ante: 1, rb: g % 2 ? 99 : 2, rbl: 4, ad: 1 }), S = {};
  const max = E.FORMATS[fmt].max; for (let k = 0; k < max; k++) E.addSeat(T, 'p' + k, 'Bot' + k, true);
  E.startGame(T, S);
  const chips = () => T.seats.reduce((a, s) => a + s.s, 0);
  const added = () => T.seats.reduce((a, s) => a + (s.rb || 0) + (s.ad || 0), 0) * T.set.stack;
  let guard = 0;
  while (T.status === 'play' && guard++ < 6000) {
    const h = T.hand; if (h.ante) antes++;
    let st = 0;
    while (h.ph !== 'done' && st++ < 800) {
      if (h.ph === 'run') { E.endStreet(T, S); continue; }
      const i = h.turn, d = E.botDecide(T, i, S.holes[i]);
      if (!E.act(T, S, i, d.a, d.x)) { console.error('illegal', d); process.exit(1); }
    }
    hands++;
    if (chips() !== T.set.stack * max + added()) { console.error('chip leak', chips(), T.set.stack * max + added()); process.exit(1); }
    // bots sometimes top up while short
    T.seats.forEach((s, i) => { if (!s.o && Math.random() < 0.15 && E.doRebuy(T, i)) {} });
    const wasIn = E.inRebuyPeriod(T);
    T.lvlLeft -= 20000;
    let r = E.finishHand(T);
    // rebuy decisions for busted bots: 60% rebuy, else window expires
    T.seats.forEach((s, i) => { if (s.o === 2) { if (Math.random() < 0.6) { E.doRebuy(T, i); rebuys++; } else E.rebuyExpired(T, i); } });
    if (T.status === 'over') break;
    if (r === 'wait') waits++;
    if (E.activeCount(T) < 2) { console.error('cannot continue', JSON.stringify(T.seats.map(s => [s.o, s.s]))); process.exit(1); }
    if (wasIn && !E.inRebuyPeriod(T) && T.set.ad && !T.addonDone) { T.brk = { left: 20000 }; T.seats.forEach((s, i) => { if (E.doAddon(T, i)) addons++; }); T.brk = null; T.addonDone = 1; }
    E.applyPendingRebuys(T);
    if (chips() !== T.set.stack * max + added()) { console.error('chip leak after rebuys', chips(), T.set.stack * max + added()); process.exit(1); }
    E.startHand(T, S);
  }
  if (T.status !== 'over') { console.error('not finished', fmt); process.exit(1); }
  const pl = T.seats.map(s => s.pl).sort((a, b) => a - b).join();
  if (pl !== [...Array(max).keys()].map(x => x + 1).join()) { console.error('bad places', pl); process.exit(1); }
  const po = E.payouts(T); if (po.pool !== 100 * E.entriesOf(T)) { console.error('pool'); process.exit(1); }
  games++;
}
console.log({ games, hands, rebuys, addons, waits, antesHands: antes });
