/*ENGINE START*/
const RANKS = '23456789TJQKA';
const RANK_NAMES = ['Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Jack','Queen','King','Ace'];
const HAND_NAMES = ['High Card','Pair','Two Pair','Three of a Kind','Straight','Flush','Full House','Four of a Kind','Straight Flush'];
const BLINDS = [[10,20],[15,30],[25,50],[40,80],[50,100],[75,150],[100,200],[150,300],[200,400],[300,600],[400,800],[500,1000],[600,1200],[800,1600],[1000,2000],[1500,3000],[2000,4000],[3000,6000],[4000,8000],[5000,10000],[7500,15000],[10000,20000]];
const P5 = 371293; // 13^5
const FORMATS = {
  hu:   { name: 'Heads-Up',      max: 2, sub: '1 vs 1' },
  spin: { name: '3-Max Hyper',   max: 3, sub: 'Spin / Expresso style' },
  sng6: { name: '6-Max Sit & Go', max: 6, sub: 'Up to 6 players' },
  sng9: { name: '9-Max Sit & Go', max: 9, sub: 'Full ring' }
};

function randInt(n) {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const lim = Math.floor(4294967296 / n) * n, a = new Uint32Array(1);
    do { crypto.getRandomValues(a); } while (a[0] >= lim);
    return a[0] % n;
  }
  return Math.floor(Math.random() * n);
}
function shuffled() {
  const d = [...Array(52).keys()];
  for (let i = 51; i > 0; i--) { const j = randInt(i + 1); [d[i], d[j]] = [d[j], d[i]]; }
  return d;
}
const zeros = n => Array(n).fill(0);
const sum = a => a.reduce((x, y) => x + y, 0);

function eval5(cs) {
  const r = cs.map(c => c % 13).sort((a, b) => b - a);
  const s0 = (cs[0] / 13) | 0;
  let flush = true; for (let i = 1; i < 5; i++) if (((cs[i] / 13) | 0) !== s0) { flush = false; break; }
  const cnt = {}; for (const x of r) cnt[x] = (cnt[x] || 0) + 1;
  const g = Object.keys(cnt).map(k => [cnt[k], +k]).sort((a, b) => b[0] - a[0] || b[1] - a[1]);
  let sh = -1;
  if (g.length === 5) { if (r[0] - r[4] === 4) sh = r[0]; else if (r[0] === 12 && r[1] === 3) sh = 3; }
  let cat, k;
  if (sh >= 0 && flush) { cat = 8; k = [sh]; }
  else if (g[0][0] === 4) { cat = 7; k = [g[0][1], g[1][1]]; }
  else if (g[0][0] === 3 && g[1][0] === 2) { cat = 6; k = [g[0][1], g[1][1]]; }
  else if (flush) { cat = 5; k = r; }
  else if (sh >= 0) { cat = 4; k = [sh]; }
  else if (g[0][0] === 3) { cat = 3; k = g.map(x => x[1]); }
  else if (g[0][0] === 2 && g[1][0] === 2) { cat = 2; k = g.map(x => x[1]); }
  else if (g[0][0] === 2) { cat = 1; k = g.map(x => x[1]); }
  else { cat = 0; k = r; }
  let sc = cat; for (let i = 0; i < 5; i++) sc = sc * 13 + (k[i] || 0);
  return sc;
}
function eval7(cs) {
  const n = cs.length; let best = -1, bc = null; const t = [0,0,0,0,0];
  for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) for (let c = b + 1; c < n; c++)
    for (let d = c + 1; d < n; d++) for (let e = d + 1; e < n; e++) {
      t[0] = cs[a]; t[1] = cs[b]; t[2] = cs[c]; t[3] = cs[d]; t[4] = cs[e];
      const s = eval5(t); if (s > best) { best = s; bc = t.slice(); }
    }
  return { score: best, cat: Math.floor(best / P5), cards: bc };
}
function plural(r) { return r === 4 ? 'Sixes' : RANK_NAMES[r] + 's'; }
function handLabel(score) {
  const cat = Math.floor(score / P5), k = [];
  for (let i = 0; i < 5; i++) k.push(Math.floor(score / Math.pow(13, 4 - i)) % 13);
  switch (cat) {
    case 8: return k[0] === 12 ? 'Royal Flush' : 'Straight Flush, ' + RANK_NAMES[k[0]] + ' high';
    case 7: return 'Four ' + plural(k[0]);
    case 6: return plural(k[0]) + ' full of ' + plural(k[1]);
    case 5: return 'Flush, ' + RANK_NAMES[k[0]] + ' high';
    case 4: return 'Straight, ' + RANK_NAMES[k[0]] + ' high';
    case 3: return 'Three ' + plural(k[0]);
    case 2: return 'Two Pair, ' + plural(k[0]) + ' & ' + plural(k[1]);
    case 1: return 'Pair of ' + plural(k[0]);
    default: return RANK_NAMES[k[0]] + ' high';
  }
}

function startLevelIdx(stack) { for (let i = 0; i < BLINDS.length; i++) if (stack / BLINDS[i][1] <= 100) return i; return 0; }
function blindsOf(T) { return BLINDS[Math.min(T.lvl, BLINDS.length - 1)]; }
function nextIdx(T, from, pred) {
  const n = T.seats.length;
  for (let k = 1; k <= n; k++) { const i = (from + k) % n; if (pred(i)) return i; }
  return -1;
}
function aliveIdx(T) { return T.seats.map((s, i) => i).filter(i => !T.seats[i].o); }

function newTable(o) {
  const spin = o.fmt === 'spin';
  const stack = spin ? 500 : o.stack;
  const mins = spin ? 2 : o.mins;
  return {
    v: 0, code: o.code || '', fmt: o.fmt, status: 'lobby',
    set: { stack, mins, turn: o.turn, buyin: o.buyin || 0, tb: o.turn ? (o.tb == null ? 30 : o.tb) : 0,
      ante: spin ? 0 : (o.ante ? 1 : 0),          // antes from level 4
      rb: spin ? 0 : (o.rb || 0),                 // max rebuys per player: 0 off, 99 unlimited
      rbl: o.rbl || 4,                            // rebuy period = first N levels
      ad: spin || !o.rb ? 0 : (o.ad ? 1 : 0) },   // one add-on at the end of the rebuy period
    seats: [], lvl: 0, lvlLeft: mins * 60000, paused: 0, hand: null, hist: 0
  };
}
function addSeat(T, id, name, bot) {
  if (T.seats.length >= FORMATS[T.fmt].max) return false;
  T.seats.push({ id, n: name, s: T.set.stack, b: bot ? 1 : 0, o: 0, pl: 0, tb: T.set.tb * 1000, mk: 1, rb: 0, ad: 0 });
  return true;
}
function startGame(T, S) {
  const d = T.seats;
  for (let i = d.length - 1; i > 0; i--) { const j = randInt(i + 1); [d[i], d[j]] = [d[j], d[i]]; }
  d.forEach(s => { s.s = T.set.stack; s.o = 0; s.pl = 0; s.tb = T.set.tb * 1000; s.rb = 0; s.ad = 0; s.rbp = 0; s.wl = 0; });
  T.status = 'play'; T.addonDone = 0; T.brk = null; T.lvl = startLevelIdx(T.set.stack); T.lvlLeft = T.set.mins * 60000; T.hand = null; T.paused = 0;
  startHand(T, S);
}
function put(T, i, amt) {
  const H = T.hand, s = T.seats[i], a = Math.max(0, Math.min(amt, s.s));
  s.s -= a; H.bets[i] += a; H.tot[i] += a; if (s.s === 0) H.allin[i] = 1;
  return a;
}
function canActCount(T, except) {
  const H = T.hand; let c = 0;
  for (let j = 0; j < T.seats.length; j++) if (j !== except && !H.fold[j] && !H.allin[j]) c++;
  return c;
}
function needs(T, i) {
  const H = T.hand;
  if (H.fold[i] || H.allin[i]) return false;
  if (canActCount(T, -1) <= 1 && H.bets[i] >= H.cur) return false;
  return !H.acted[i] || H.bets[i] < H.cur;
}
function resetTimer(T) { if (T.hand) T.hand.tl = T.set.turn * 1000; }

function startHand(T, S) {
  const n = T.seats.length, alive = i => !T.seats[i].o, prev = T.hand;
  let d;
  if (!prev) { const al = aliveIdx(T); d = al[randInt(al.length)]; } else d = nextIdx(T, prev.d, alive);
  const H = {
    n: prev ? prev.n + 1 : 1, d, st: 0, board: [], bets: zeros(n), tot: zeros(n),
    fold: T.seats.map(s => s.o ? 1 : 0), allin: zeros(n), acted: zeros(n),
    start: T.seats.map(s => s.s), cur: 0, minR: 0, turn: -1, last: null, ph: 'bet', res: null, shown: null, win: null, tl: 0, tbOn: 0
  };
  T.hand = H;
  const cnt = aliveIdx(T).length;
  let sb, bb;
  if (cnt === 2) { sb = d; bb = nextIdx(T, d, alive); } else { sb = nextIdx(T, d, alive); bb = nextIdx(T, sb, alive); }
  const [SB, BB] = blindsOf(T);
  H.sb = sb; H.bb = bb; H.bl = [SB, BB];
  H.ante = anteOf(T);
  if (H.ante) for (const j of order0(T, sb)) { const s = T.seats[j], a = Math.min(H.ante, s.s); s.s -= a; H.tot[j] += a; if (s.s === 0) H.allin[j] = 1; }
  put(T, sb, SB); put(T, bb, BB);
  H.cur = BB; H.minR = BB;
  S.deck = shuffled(); S.holes = {};
  const order = []; let i = sb; do { order.push(i); i = nextIdx(T, i, alive); } while (i !== sb);
  for (let r = 0; r < 2; r++) for (const j of order) (S.holes[j] = S.holes[j] || []).push(S.deck.pop());
  H.turn = nextIdx(T, bb, j => needs(T, j));
  if (H.turn === -1) { H.ph = 'run'; revealAllin(T, S); }
  resetTimer(T);
}

function legal(T, i) {
  const H = T.hand, s = T.seats[i];
  const toCall = Math.min(H.cur - H.bets[i], s.s);
  const maxTo = H.bets[i] + s.s;
  const minTo = Math.min(H.cur + H.minR, maxTo);
  const canRaise = maxTo > H.cur && canActCount(T, i) > 0;
  return { toCall, canCheck: H.cur <= H.bets[i], maxTo, minTo, canRaise, cur: H.cur, bet: H.bets[i] };
}

function act(T, S, i, a, x) {
  const H = T.hand;
  if (!H || H.ph !== 'bet' || H.turn !== i) return false;
  const L = legal(T, i);
  let label = a;
  if (a === 'allin' && !L.canRaise) a = L.canCheck ? 'check' : 'call';
  if (a === 'raise' && !L.canRaise) a = L.canCheck ? 'check' : 'call';
  if (a === 'fold') { H.fold[i] = 1; label = 'fold'; }
  else if (a === 'check') { if (!L.canCheck) return false; label = 'check'; }
  else if (a === 'call') {
    if (L.canCheck) label = 'check';
    else { put(T, i, L.toCall); label = T.seats[i].s === 0 ? 'allin' : 'call'; }
  } else if (a === 'raise' || a === 'allin') {
    let to = a === 'allin' ? L.maxTo : Math.round(+x || 0);
    to = Math.max(L.minTo, Math.min(to, L.maxTo));
    const prevCur = H.cur, inc = to - H.cur;
    if (inc >= H.minR) { H.minR = inc; for (let j = 0; j < T.seats.length; j++) if (j !== i) H.acted[j] = 0; }
    H.cur = to; put(T, i, to - H.bets[i]);
    label = T.seats[i].s === 0 ? 'allin' : (prevCur === 0 ? 'bet' : 'raise');
  } else return false;
  H.acted[i] = 1; H.tbOn = 0;
  H.last = { i, a: label, x: H.bets[i], st: H.st };
  advance(T, S, i);
  return true;
}

function advance(T, S, i) {
  const H = T.hand;
  const live = T.seats.map((s, j) => j).filter(j => !H.fold[j]);
  if (live.length === 1) { awardSingle(T, live[0]); return; }
  const nx = nextIdx(T, i, j => needs(T, j));
  if (nx !== -1) { H.turn = nx; resetTimer(T); return; }
  endStreet(T, S);
}
function endStreet(T, S) {
  const H = T.hand, n = T.seats.length;
  H.bets = zeros(n); H.acted = zeros(n); H.cur = 0; H.minR = H.bl[1]; H.turn = -1;
  if (H.st === 3) { showdown(T, S); return; }
  H.st++; S.deck.pop();
  if (H.st === 1) H.board.push(S.deck.pop(), S.deck.pop(), S.deck.pop()); else H.board.push(S.deck.pop());
  const nx = nextIdx(T, H.d, j => needs(T, j));
  if (nx === -1) { H.ph = 'run'; revealAllin(T, S); } else { H.ph = 'bet'; H.turn = nx; resetTimer(T); }
}
// all-in and no more betting possible: every player still in the hand turns their cards face up
function revealAllin(T, S) {
  const H = T.hand; H.allinShow = 1; H.shown = {};
  T.seats.forEach((s, j) => { if (!H.fold[j] && S.holes[j]) H.shown[j] = S.holes[j]; });
}
function awardSingle(T, w) {
  const H = T.hand, total = sum(H.tot);
  T.seats[w].s += total;
  H.res = [{ amt: total, w: [w], h: null }];
  H.ph = 'done'; H.turn = -1; H.bets = zeros(T.seats.length);
}
function showdown(T, S) {
  const H = T.hand, n = T.seats.length;
  H.ph = 'done'; H.turn = -1;
  const live = T.seats.map((s, j) => j).filter(j => !H.fold[j]);
  const ev = {};
  for (const j of live) ev[j] = eval7(S.holes[j].concat(H.board));
  const lv = [...new Set(H.tot.filter(t => t > 0))].sort((a, b) => a - b);
  const pots = []; let prev = 0;
  for (const L of lv) {
    let amt = 0; for (let j = 0; j < n; j++) amt += Math.max(0, Math.min(H.tot[j], L) - prev);
    const el = live.filter(j => H.tot[j] >= L); prev = L;
    if (!amt) continue;
    if (!el.length) { if (pots.length) pots[pots.length - 1].amt += amt; else pots.push({ amt, el: live.slice() }); continue; }
    const last = pots[pots.length - 1];
    if (last && last.el.length === el.length && last.el.every((x, k) => x === el[k])) last.amt += amt;
    else pots.push({ amt, el });
  }
  H.res = []; H.win = {};
  pots.forEach((p, pi) => {
    let best = -1; for (const j of p.el) best = Math.max(best, ev[j].score);
    const w = p.el.filter(j => ev[j].score === best).sort((a, b) => ((a - H.d - 1 + n) % n) - ((b - H.d - 1 + n) % n));
    const share = Math.floor(p.amt / w.length); let rem = p.amt - share * w.length;
    for (const j of w) { T.seats[j].s += share + (rem > 0 ? 1 : 0); if (rem > 0) rem--; }
    H.res.push({ amt: p.amt, w, h: p.el.length > 1 ? handLabel(best) : null });
    if (pi === 0) for (const j of w) H.win[j] = ev[j].cards;
  });
  // winners and all-in players must show; others muck if their auto-muck is on (seat.mk)
  const winners = new Set(H.res.flatMap(r => r.w));
  H.shown = {}; H.muck = [];
  for (const j of live) {
    if (H.allinShow || winners.has(j) || H.allin[j] || !T.seats[j].mk) H.shown[j] = S.holes[j]; else H.muck.push(j);
  }
  if (live.length < 2) { H.shown = null; H.muck = null; }
}
// ---- structure helpers: antes, rebuys, add-on ----
const REBUY_WINDOW = 15000;
function anteOf(T) { if (!T.set.ante) return 0; const st = startLevelIdx(T.set.stack); if (T.lvl < st + 3) return 0; return Math.max(1, Math.round(blindsOf(T)[1] / 10)); }
function inRebuyPeriod(T) { return !!T.set.rb && T.lvl < startLevelIdx(T.set.stack) + T.set.rbl; }
function canRebuy(T, i) { const s = T.seats[i]; return inRebuyPeriod(T) && s.o !== 1 && (s.rb || 0) < T.set.rb && !s.rbp && (s.o === 2 || s.s <= T.set.stack); }
function order0(T, from) { const out = []; for (let k = 0; k < T.seats.length; k++) { const j = (from + k) % T.seats.length; if (!T.seats[j].o) out.push(j); } return out; }
// rebuy: busted player (o=2) comes straight back; a player still in gets chips at the start of the next hand
function doRebuy(T, i) {
  if (!canRebuy(T, i)) return false;
  const s = T.seats[i];
  if (s.o === 2) { s.o = 0; s.s = T.set.stack; s.wl = 0; s.rb = (s.rb || 0) + 1; }
  else s.rbp = 1;
  return true;
}
function applyPendingRebuys(T) { T.seats.forEach(s => { if (s.rbp && !s.o) { s.s += T.set.stack; s.rb = (s.rb || 0) + 1; } s.rbp = 0; }); }
function doAddon(T, i) { const s = T.seats[i]; if (!T.brk || s.o || s.ad) return false; s.s += T.set.stack; s.ad = 1; return true; }
// final elimination with correct finishing places (bigger stack at the start of the hand finishes higher)
function eliminate(T, idxs, H) {
  if (!idxs.length) return;
  const cnt = T.seats.filter(s => s.o !== 1).length;
  idxs.sort((a, b) => (H ? H.start[b] - H.start[a] : 0)).forEach((i, k) => { const s = T.seats[i]; s.o = 1; s.wl = 0; s.pl = cnt - idxs.length + 1 + k; });
}
function checkOver(T) {
  const left = T.seats.map((s, i) => i).filter(i => T.seats[i].o !== 1);
  if (left.length <= 1) { if (left.length) { T.seats[left[0]].pl = 1; T.seats[left[0]].o = 0; } T.status = 'over'; return true; }
  return false;
}
function activeCount(T) { return T.seats.filter(s => !s.o).length; }
function finishHand(T) {
  const H = T.hand;
  // a rebuy requested during the hand is honoured even if the player then busted
  T.seats.forEach(x => { if (!x.o && x.rbp && x.s === 0) { x.s = T.set.stack; x.rb = (x.rb || 0) + 1; x.rbp = 0; } });
  const busted = aliveIdx(T).filter(i => T.seats[i].s === 0);
  const waitR = busted.filter(i => canRebuy(T, i));          // still inside the rebuy period: 15 s to rebuy
  waitR.forEach(i => { T.seats[i].o = 2; T.seats[i].wl = REBUY_WINDOW; T.seats[i].rbp = 0; });
  eliminate(T, busted.filter(i => !waitR.includes(i)), H);
  if (checkOver(T)) return 'over';
  if (T.lvlLeft <= 0) { T.lvl++; T.lvlLeft = T.set.mins * 60000; }
  if (activeCount(T) < 2) return 'wait';                     // e.g. heads-up bust: wait for the rebuy decision
  return 'next';
}
// rebuy window ran out (or the player said no)
function rebuyExpired(T, i) { const s = T.seats[i]; if (s.o !== 2) return false; eliminate(T, [i], null); checkOver(T); return true; }
function entriesOf(T) { return T.seats.reduce((a, s) => a + 1 + (s.rb || 0) + (s.ad || 0), 0); }
function payouts(T) {
  const n = T.seats.length, pool = (T.set.buyin || 0) * entriesOf(T);
  const pct = n <= 3 ? [100] : n <= 5 ? [65, 35] : [50, 30, 20];
  return { pool, pct, amt: pct.map(p => Math.round(pool * p / 100)) };
}

// win % for hands that are all face up (all-in run-out): exact when 1-2 cards to come, sampled pre-flop
function allinEquity(hands, board) {
  const ids = Object.keys(hands), used = new Set(board); ids.forEach(i => hands[i].forEach(c => used.add(c)));
  const rest = []; for (let c = 0; c < 52; c++) if (!used.has(c)) rest.push(c);
  const need = 5 - board.length, win = {}; ids.forEach(i => win[i] = 0); let n = 0;
  const score = b => { let best = -1, w = []; for (const i of ids) { const sc = eval7(hands[i].concat(b)).score; if (sc > best) { best = sc; w = [i]; } else if (sc === best) w.push(i); } w.forEach(i => win[i] += 1 / w.length); n++; };
  if (need === 0) score(board);
  else if (need === 1) for (const a of rest) score(board.concat([a]));
  else if (need === 2) for (let x = 0; x < rest.length; x++) for (let y = x + 1; y < rest.length; y++) score(board.concat([rest[x], rest[y]]));
  else for (let it = 0; it < 1500; it++) { const r = rest.slice(); for (let k = 0; k < need; k++) { const j = k + Math.floor(Math.random() * (r.length - k)); [r[k], r[j]] = [r[j], r[k]]; } score(board.concat(r.slice(0, need))); }
  const out = {}; ids.forEach(i => out[i] = Math.round(win[i] / n * 100)); return out;
}
// ---------- bots ----------
function equity(hole, board, opp, iters) {
  const used = new Set(hole.concat(board));
  const rest = []; for (let c = 0; c < 52; c++) if (!used.has(c)) rest.push(c);
  let won = 0; const need = opp * 2 + (5 - board.length);
  for (let it = 0; it < iters; it++) {
    for (let k = 0; k < need; k++) { const j = k + Math.floor(Math.random() * (rest.length - k)); [rest[k], rest[j]] = [rest[j], rest[k]]; }
    const b = board.concat(rest.slice(opp * 2, need));
    const me = eval7(hole.concat(b)).score;
    let best = 0, ties = 0, lose = false;
    for (let o = 0; o < opp; o++) {
      const s = eval7([rest[o * 2], rest[o * 2 + 1]].concat(b)).score;
      if (s > me) { lose = true; break; } if (s === me) ties++;
    }
    if (!lose) won += 1 / (ties + 1);
  }
  return won / iters;
}
function botDecide(T, i, hole) {
  const H = T.hand, L = legal(T, i), BB = H.bl[1];
  const opp = T.seats.filter((s, j) => j !== i && !H.fold[j]).length;
  const eq = equity(hole, H.board, Math.max(1, opp), H.st === 0 ? 140 : 180);
  const str = eq * (opp + 1);
  const pot = sum(H.tot);
  const po = L.toCall / (pot + L.toCall || 1);
  const sBB = T.seats[i].s / BB, r = Math.random();
  const raiseTo = f => H.cur + Math.max(H.minR, Math.round(pot * f / BB) * BB);
  if (H.st === 0 && sBB <= 12) {
    if (str >= 1.15 || (L.canCheck && r < 0.1)) return { a: 'allin' };
    return L.canCheck ? { a: 'check' } : { a: str >= 1.0 && po < 0.35 ? 'call' : 'fold' };
  }
  if (eq > 0.78 || str >= 1.9) {
    if (!L.canRaise) return { a: 'call' };
    if (sBB < 18 && r < 0.5) return { a: 'allin' };
    return { a: 'raise', x: raiseTo(0.65 + r * 0.4) };
  }
  if (str >= 1.3) {
    if (L.canCheck) return r < 0.65 && L.canRaise ? { a: 'raise', x: raiseTo(0.5 + r * 0.2) } : { a: 'check' };
    if (r < 0.2 && L.canRaise) return { a: 'raise', x: raiseTo(0.7) };
    return { a: 'call' };
  }
  if (L.canCheck) return r < 0.1 && L.canRaise ? { a: 'raise', x: raiseTo(0.5) } : { a: 'check' };
  if (eq >= po + 0.04 && (str >= 0.85 || L.toCall <= BB)) return { a: 'call' };
  return { a: 'fold' };
}
/*ENGINE END*/
if (typeof module !== 'undefined') module.exports = { eval7, handLabel, newTable, addSeat, startGame, startHand, act, endStreet, finishHand, legal, botDecide, payouts, allinEquity, FORMATS, BLINDS, doRebuy, doAddon, applyPendingRebuys, rebuyExpired, canRebuy, inRebuyPeriod, activeCount, anteOf, startLevelIdx, entriesOf };
