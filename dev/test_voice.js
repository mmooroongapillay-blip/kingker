const src = require('fs').readFileSync('app.html', 'utf8');
const fn = src.slice(src.indexOf('function parseVoice('), src.indexOf('let rec = null'));
const parseVoice = new Function(fn + '; return parseVoice;')();
// spot: big blind 20, current bet 20, my bet 0, stack 1480 -> maxTo 1480, minTo 40, pot 30
const L = { toCall: 20, canCheck: false, maxTo: 1480, minTo: 40, canRaise: true, cur: 20, bet: 0 };
const Lc = Object.assign({}, L, { toCall: 0, canCheck: true, cur: 0, minTo: 20 });
const pv = f => Math.round((20 + 50 * f) / 10) * 10;
const cases = [
  ['fold', L, 'fold'], ['I fold', L, 'fold'], ['je me couche', L, 'fold'],
  ['check', Lc, 'check'], ['parole', Lc, 'check'], ['check', L, null],
  ['call', L, 'call'], ['I call', L, 'call'], ['je suis', L, 'call'], ['call', Lc, 'check'],
  ['all in', L, 'allin'], ['all-in', L, 'allin'], ['tapis', L, 'allin'], ['shove', L, 'allin'],
  ['raise to 200', L, 'raise:200'], ['raise 200', L, 'raise:200'], ['raise by 100', L, 'raise:120'], ['bet 60', Lc, 'raise:60'],
  ['relance à 300', L, 'raise:300'], ['mise 100', Lc, 'raise:100'], ['raise 1,200', L, 'raise:1200'], ['raise 2k', L, 'allin'],
  ['raise 1 thousand', L, 'raise:1000'], ['bet 3 big blinds', Lc, 'raise:60'], ['raise 10', L, 'raise:40'],
  ['half pot', L, 'raise:' + pv(0.5)], ['pot', L, 'raise:' + pv(1)], ['moitié du pot', L, 'raise:' + pv(0.5)], ['min raise', L, 'raise:40'],
  ['raise', L, 'open'], ['relance', L, 'open'], ['hello there', L, 'none'], ['200', L, 'raise:200'],
];
let bad = 0;
for (const [t, l, exp] of cases) {
  const r = parseVoice(t, l, pv, 20);
  const got = !r ? 'none' : r.a === 'raise' ? 'raise:' + r.x : r.a;
  const ok = got === (exp === null ? null : exp) || (exp === null && r && r.a === null);
  if (!ok) { bad++; console.log('FAIL', JSON.stringify(t), '->', got, 'expected', exp); }
}
console.log(cases.length - bad, '/', cases.length, 'phrases parsed correctly');
process.exit(bad ? 1 : 0);
