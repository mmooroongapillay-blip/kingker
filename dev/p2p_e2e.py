import asyncio, http.server, threading, functools
from playwright.async_api import async_playwright
SITE='/home/claude/poker/site'; LIB=open('/home/claude/p2ptest/node_modules/peerjs/dist/peerjs.min.js').read()
def serve():
    h=functools.partial(http.server.SimpleHTTPRequestHandler, directory=SITE)
    h.log_message=lambda *a: None
    srv=http.server.ThreadingHTTPServer(('127.0.0.1',8766),h); threading.Thread(target=srv.serve_forever,daemon=True).start()
INIT="window.KK_PEER_OPTS={host:'127.0.0.1',port:9000,path:'/',secure:false,config:{iceServers:[]}};"
async def setup(ctx, errs, tag):
    pg=await ctx.new_page(); await pg.add_init_script(INIT)
    await pg.route('**/peerjs.min.js', lambda r: r.fulfill(status=200, content_type='application/javascript', body=LIB))
    await pg.route('**/gstatic.com/**', lambda r: r.abort())
    await pg.route('**/fonts.g*/**', lambda r: r.abort())
    pg.on('pageerror', lambda e: errs.append(tag+': '+str(e)))
    return pg
async def autoplay(pg, secs):
    for _ in range(int(secs*2)):
        await pg.wait_for_timeout(500)
        for sel in ['#a-show','#a-c','#b-back']:
            el=await pg.query_selector(sel)
            if el:
                try: await el.click(timeout=400)
                except Exception: pass
                break
async def main():
    serve(); errs=[]
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
        c1=await b.new_context(viewport={'width':390,'height':844}); c2=await b.new_context(viewport={'width':390,'height':844})
        host=await setup(c1,errs,'host'); guest=await setup(c2,errs,'guest')
        await host.goto('http://127.0.0.1:8766/index.html'); await host.fill('#in-name','Mahen'); await host.wait_for_timeout(800)
        print('host note:', await host.inner_text('#online-note'))
        await host.click('#b-host'); await host.click('[data-f="hu"]'); await host.click('#b-create'); await host.wait_for_timeout(1500)
        code=(await host.inner_text('#lob-code')).strip(); print('code', code)
        await guest.goto('http://127.0.0.1:8766/index.html?t='+code); await guest.fill('#in-name','Friend'); await guest.wait_for_timeout(800)
        print('prefilled', await guest.input_value('#in-code'))
        await guest.click('#b-join'); await host.wait_for_timeout(2500)
        print('host lobby:', (await host.inner_text('#lob-list')).replace('\n',' '))
        await host.click('#b-start'); await host.wait_for_timeout(3500)
        print('guest hero:', (await guest.inner_text('#hero')).replace('\n',' | '))
        await asyncio.gather(autoplay(host,25), autoplay(guest,25))
        print('hands', await host.evaluate('T.hand.n'), 'guest view hand', await guest.evaluate('view.T.hand.n'))
        print('guest hole', await guest.evaluate('JSON.stringify(view.hole)'), 'host knows', await host.evaluate('JSON.stringify(S.holes[T.seats.findIndex(s=>s.id!==myId)])'))
        # guest reload -> reconnect to same seat
        await guest.reload(); await guest.wait_for_timeout(800); await guest.fill('#in-code',code); await guest.click('#b-join'); await guest.wait_for_timeout(4000)
        print('after guest reload, guest seat', await guest.evaluate('mySeat()'), 'hole', await guest.evaluate('JSON.stringify(view.hole)'))
        await guest.screenshot(path='/home/claude/poker/shot_p2p_guest.png'); await host.screenshot(path='/home/claude/poker/shot_p2p_host.png')
        print('ERRORS', errs); await b.close()
asyncio.run(main())
