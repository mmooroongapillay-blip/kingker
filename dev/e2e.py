import asyncio, sys, http.server, threading, functools
from playwright.async_api import async_playwright

MOCK = r"""
(() => {
  const me = Math.random().toString(36).slice(2, 10);
  function deepFreeze(o){ if(o&&typeof o==='object'){ Object.freeze(o); for(const k in o) deepFreeze(o[k]); } return o; }
  function makeRoom(name){
    const bc = new BroadcastChannel('room-'+name); let mine = {}; const others = {}; const lsn = []; let snap = [];
    const rebuild = () => { snap = Object.freeze([{peer:me,presence:deepFreeze(structuredClone(mine)),updatedAt:Date.now(),sameTab:true,isMe:true,by:null,kind:'viewer',guest:false}, ...Object.values(others)]); };
    const notify = () => { rebuild(); const ch = {peers:snap, joined:[], left:[], updated:[]}; lsn.forEach(f=>setTimeout(()=>f(ch),0)); };
    bc.onmessage = e => { const d = e.data;
      if (d.t==='pres') { others[d.peer] = Object.freeze({peer:d.peer,presence:deepFreeze(d.p),updatedAt:Date.now(),sameTab:false,isMe:false,by:null,kind:'viewer',guest:false}); notify(); }
      if (d.t==='hello') bc.postMessage({t:'pres',peer:me,p:mine});
      if (d.t==='bye') { delete others[d.peer]; notify(); } };
    window.addEventListener('beforeunload',()=>bc.postMessage({t:'bye',peer:me}));
    bc.postMessage({t:'hello'}); rebuild();
    return { name,
      presence: async patch => { for (const k in patch) { if (patch[k]===null) delete mine[k]; else mine[k]=patch[k]; } const sz = JSON.stringify(mine).length; if (sz>4096) throw {code:'invalid_argument',message:'too big '+sz}; window.__maxPres = Math.max(window.__maxPres||0, sz); bc.postMessage({t:'pres',peer:me,p:structuredClone(mine)}); notify(); },
      onPeers: f => { lsn.push(f); setTimeout(notify,0); return ()=>{}; },
      peers: () => snap, connected: () => true, onConnection: f => { setTimeout(()=>f(true),0); return ()=>{}; },
      emit: async()=>{}, on: ()=>()=>{}, leave: async()=>{ bc.postMessage({t:'bye',peer:me}); bc.close(); } };
  }
  window.claude = { use: async n => n==='room' ? { join: async nm => makeRoom(nm) } : null };
})();
"""

def serve():
    h = functools.partial(http.server.SimpleHTTPRequestHandler, directory='/home/claude/poker')
    srv = http.server.ThreadingHTTPServer(('127.0.0.1', 8765), h)
    threading.Thread(target=srv.serve_forever, daemon=True).start()

async def autoplay(page, label, secs, errs):
    for _ in range(int(secs*2)):
        await page.wait_for_timeout(500)
        for sel in ['#a-show', '#a-c', '#b-back']:
            el = await page.query_selector(sel)
            if el:
                try: await el.click(timeout=500)
                except Exception: pass
                break

async def main():
    serve()
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        errs = []
        # ---- practice mode ----
        ctx = await b.new_context(viewport={'width':390,'height':844}, device_scale_factor=2)
        pg = await ctx.new_page()
        pg.on('pageerror', lambda e: errs.append('practice: '+str(e)))
        await pg.goto('http://127.0.0.1:8765/index.html')
        await pg.fill('#in-name', 'Mahen')
        await pg.click('#b-practice')
        await pg.click('[data-f="sng9"]'); await pg.click('#seg-players [data-v="9"]')
        await pg.click('#b-create')
        await pg.wait_for_timeout(2500)
        await pg.screenshot(path='shot_practice.png')
        await autoplay(pg, 'p', 25, errs)
        await pg.screenshot(path='shot_practice2.png')
        print('stats', await pg.evaluate('JSON.stringify(T.stats)'))
        await pg.evaluate("openStatsTable()"); await pg.wait_for_timeout(300); await pg.screenshot(path='shot_stats.png')
        await pg.evaluate("openPlayerStats(T.seats[1].id)"); await pg.wait_for_timeout(300); await pg.screenshot(path='shot_pstat.png')
        await pg.evaluate("T.seats.forEach(s=>{if(s.id!==myId){s.o=1;s.pl=2+T.seats.indexOf(s)%8}});T.seats.find(s=>s.id===myId).pl=1;T.set.buyin=200;recordCareer(T);closeSheet();refreshHome();show('home')")
        await pg.wait_for_timeout(300); await pg.screenshot(path='shot_career.png')
        # ---- online: host + client ----
        c1 = await b.new_context(viewport={'width':390,'height':844}); c1.set_default_timeout(8000)
        host = await c1.new_page(); await host.add_init_script(MOCK)
        host.on('pageerror', lambda e: errs.append('host: '+str(e)))
        host.on('console', lambda m: m.type=='error' and errs.append('host console: '+m.text))
        await host.goto('http://127.0.0.1:8765/index.html')
        await host.fill('#in-name', 'Host'); await host.wait_for_timeout(600)
        await host.click('#b-host'); await host.click('[data-f="hu"]'); await host.click('#b-create')
        await host.wait_for_timeout(800)
        code = (await host.inner_text('#lob-code')).strip()
        guest = await c1.new_page(); await guest.add_init_script(MOCK)
        guest.on('pageerror', lambda e: errs.append('guest: '+str(e)))
        guest.on('console', lambda m: m.type=='error' and errs.append('guest console: '+m.text))
        await guest.goto('http://127.0.0.1:8765/index.html')
        await guest.fill('#in-name', 'Friend'); await guest.wait_for_timeout(600)
        await guest.fill('#in-code', code); await guest.click('#b-join')
        await host.wait_for_timeout(1500)
        print('host lobby:', await host.inner_text('#lob-list'))
        await host.click('#b-start'); await host.wait_for_timeout(1500)
        hl = await guest.inner_text('#hero'); print('guest hero:', hl.replace('\n',' | '))
        await guest.screenshot(path='shot_guest.png')
        await asyncio.gather(autoplay(host,'h',30,errs), autoplay(guest,'g',30,errs))
        await host.screenshot(path='shot_host.png'); await guest.screenshot(path='shot_guest2.png')
        print('max presence bytes', await host.evaluate('window.__maxPres'))
        print('guest hist entries', await guest.evaluate('hist.length'), 'host hands', await host.evaluate('T.hand && T.hand.n'))
        print('guest saw hole', await guest.evaluate('JSON.stringify(view.hole)'), 'host knows', await host.evaluate('JSON.stringify(S.holes[T.seats.findIndex(s=>s.id!==myId)])'))
        print('guest show-log lines', await guest.evaluate("hist.flatMap(e=>e.lines).filter(l=>/Friend<\\/span>? shows|Friend shows|Friend mucks/.test(l)).length"), await host.evaluate("hist.flatMap(e=>e.lines).filter(l=>/shows|mucks/.test(l)).slice(0,4).join(' | ')"))
        print('ERRORS', errs)
        await b.close()
asyncio.run(main())
