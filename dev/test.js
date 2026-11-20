const E = require('./engine.js');
const c = s => { const r = '23456789TJQKA'.indexOf(s[0]), u = 'shdc'.indexOf(s[1]); return u * 13 + r; };
const H = (...a) => E.eval7(a.map(c));
const lab = (...a) => E.handLabel(H(...a).score);
const asrt = (x, m) => { if (!x) { console.error('FAIL', m); process.exitCode = 1; } };
asrt(lab('As','Ks','Qs','Js','Ts','2d','3c') === 'Royal Flush', 'royal');
asrt(lab('As','2d','3c','4h','5s','9d','Kc') === 'Straight, Five high', 'wheel ' + lab('As','2d','3c','4h','5s','9d','Kc'));
asrt(lab('Ah','Ad','Kc','Ks','Kd','2c','3c') === 'Kings full of Aces', 'full');
asrt(H('Ah','Kh','2c','3d','7s','8s','9h').score > H('Ah','Qh','2c','3d','7s','8s','9h').score, 'kicker');
asrt(H('6h','6d','2c','2d','Ks','8s','9h').score > H('5h','5d','Ac','Ad','2s','3s','4h').score === false, 'twopair compare');
asrt(lab('6h','6d','6c','2d','Ks','8s','9h') === 'Three Sixes', 'sixes');
console.log('evaluator ok');

let games = 0, hands = 0;
for (const fmt of ['hu','spin','sng6','sng9']) {
  for (let g = 0; g < 6; g++) {
    const T = E.newTable({ fmt, stack: 1500, mins: 1, turn: 30, buyin: 100 }), S = {};
    const max = E.FORMATS[fmt].max;
    for (let k = 0; k < max; k++) E.addSeat(T, 'p' + k, 'Bot' + k, true);
    E.startGame(T, S);
    const total = T.set.stack * max; let guard = 0;
    while (T.status === 'play' && guard++ < 5000) {
      const h = T.hand; let steps = 0;
      while (h.ph !== 'done' && steps++ < 500) {
        if (h.ph === 'run') { E.endStreet(T, S); continue; }
        const i = h.turn; const d = E.botDecide(T, i, S.holes[i]);
        if (!E.act(T, S, i, d.a, d.x)) { console.error('illegal', d, E.legal(T, i)); process.exit(1); }
        const inPlay = T.seats.reduce((a, s) => a + s.s, 0) + h.tot.reduce((a, b) => a + b, 0);
        if (h.ph !== "done" && inPlay !== total) { console.error('chips mid-hand', inPlay, total); process.exit(1); }
      }
      const chips = T.seats.reduce((a, s) => a + s.s, 0);
      if (chips !== total) { console.error('chip leak', chips, total, JSON.stringify(h.res)); process.exit(1); }
      hands++;
      T.lvlLeft -= 20000;
      if (E.finishHand(T) === 'next') E.startHand(T, S);
    }
    asrt(T.status === 'over', 'finished ' + fmt);
    const pl = T.seats.map(s => s.pl).sort((a, b) => a - b);
    asrt(pl.join() === [...Array(max).keys()].map(x => x + 1).join(), 'places ' + pl);
    games++;
  }
}
const T = E.newTable({ fmt: 'sng9', stack: 1500, mins: 5, turn: 30 }); for (let k = 0; k < 9; k++) E.addSeat(T, 'abcdefgh' + k, 'Player Name' + k, k > 3);
E.startGame(T, {}); console.log('presence size approx', JSON.stringify(T).length);
console.log('games', games, 'hands', hands);
