import asyncio
from playwright.async_api import async_playwright
async def m():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
        pg=await b.new_page(viewport={'width':390,'height':844},device_scale_factor=2)
        errs=[]; pg.on('pageerror',lambda e: errs.append(str(e)))
        await pg.goto('file:///home/claude/poker/index.html'); await pg.wait_for_timeout(400)
        await pg.fill('#in-name','Mahen'); await pg.click('#b-practice'); await pg.click('[data-f="hu"]')
        await pg.click('[data-k="ante"] [data-v="1"]'); await pg.click('[data-k="rb"] [data-v="99"]'); await pg.click('[data-k="rbl"] [data-v="2"]')
        await pg.fill('#in-buyin','200')
        await pg.screenshot(path='shot_setup.png', full_page=True)
        await pg.click('#b-struct'); await pg.wait_for_timeout(300); await pg.screenshot(path='shot_struct.png'); await pg.click('#st-close')
        await pg.click('#b-create')
        busted=False
        for _ in range(400):
            await pg.wait_for_timeout(300)
            if await pg.query_selector('#a-rb'):
                await pg.wait_for_timeout(600); await pg.screenshot(path='shot_rebuy.png')
                print('rebuy prompt:', await pg.inner_text('#actions'))
                await pg.click('#a-rb'); await pg.wait_for_timeout(1500)
                print('after rebuy seat:', await pg.evaluate("JSON.stringify(T.seats.map(s=>[s.n,s.o,s.s,s.rb]))"), 'ph', await pg.evaluate('T.hand.ph'))
                busted=True; break
            ai=await pg.query_selector('.presets button:last-child')
            if ai:
                try: await ai.click(timeout=300); await pg.click('#a-r', timeout=500)
                except Exception: pass
            else:
                c=await pg.query_selector('#a-c')
                if c:
                    try: await c.click(timeout=300)
                    except: pass
        # fast-forward to the end of the rebuy period
        await pg.evaluate("T.lvl = startLevelIdx(T.set.stack)+1; T.lvlLeft = 0;")
        brk=False
        for _ in range(200):
            await pg.wait_for_timeout(300)
            if await pg.evaluate("!!T.brk"):
                await pg.wait_for_timeout(700); await pg.screenshot(path='shot_addon.png'); print('break actions:', await pg.inner_text('#actions'))
                a=await pg.query_selector('#a-ad')
                if a: await a.click(); await pg.wait_for_timeout(500)
                print('after addon:', await pg.evaluate("JSON.stringify(T.seats.map(s=>[s.n,s.s,s.ad]))")); brk=True; break
            c=await pg.query_selector('#a-c')
            if c:
                try: await c.click(timeout=300)
                except: pass
        for _ in range(80):
            await pg.wait_for_timeout(300)
            if await pg.evaluate("!T.brk && T.hand.ph!=='done'"): break
        print('resumed hand', await pg.evaluate("T.hand.n"), 'ante', await pg.evaluate("T.hand.ante"), 'lvlbox:', (await pg.inner_text('#lvlbox')).replace('\n',' | '))
        print('pool', await pg.evaluate("JSON.stringify(payouts(T))"))
        print('status', await pg.evaluate('T.status'), 'busted',busted,'brk',brk,'ERR',errs); await b.close()
asyncio.run(m())
