const E = require('./engine.js');
let hands = 0, bad = 0;
for (let g = 0; g < 30; g++) {
  const T = E.newTable({ fmt: 'sng6', stack: 1500, mins: 5, turn: 0, tb: 0, ante: 1, rb: 0, rbl: 4, ad: 0, buyin: 0, code: '' });
  for (let i = 0; i < 6; i++) E.addSeat(T, 'p' + i, 'P' + i, true);
  const S = { seed: E.randHex(32) }; T.fair = { c: E.sha256(S.seed), mix: 'aa11.bb22' };
  E.startGame(T, S);
  let guard = 0;
  while (T.status === 'play' && guard++ < 3000) {
    const h = T.hand; let steps = 0;
    while (h.ph !== 'done' && steps++ < 500) {
      if (h.ph === 'run') { E.endStreet(T, S); continue; }
      const i = h.turn; const d = E.botDecide(T, i, S.holes[i]); E.act(T, S, i, d.a, d.x);
    }
    const dl = E.replayDeal(E.seededDeck(E.fairMaterial(S.seed, T.fair.mix, h.n)), h.ord);
    hands++;
    const ok = h.board.every((c, k) => c === dl.board[k]) && Object.keys(S.holes).every(j => S.holes[j].join() === dl.holes[j].join());
    if (!ok) bad++;
    if (E.finishHand(T) === 'next') E.startHand(T, S); else break;
  }
}
console.log('fair replay: hands', hands, 'mismatches', bad);
