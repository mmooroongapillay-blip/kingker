import asyncio
from playwright.async_api import async_playwright
async def m():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
        for fmt,pl in [('hu',None),('sng9',9)]:
            pg=await b.new_page(viewport={'width':390,'height':844}); errs=[]; pg.on('pageerror',lambda e: errs.append(str(e)))
            await pg.goto('file:///home/claude/poker/index.html'); await pg.wait_for_timeout(400)
            await pg.fill('#in-name','Mahen'); await pg.click('#b-practice'); await pg.click(f'[data-f="{fmt}"]')
            if pl: await pg.click(f'#seg-players [data-v="{pl}"]')
            await pg.click('#b-create')
            t0=await pg.evaluate("performance.now()")
            for _ in range(200):
                await pg.wait_for_timeout(100)
                if await pg.evaluate("T.hand.ph!=='deal'"): break
            t1=await pg.evaluate("performance.now()")
            # play to flop and check staggered delays
            delays=None
            for _ in range(300):
                await pg.wait_for_timeout(150)
                d=await pg.evaluate("[...document.querySelectorAll('#board .card.deal')].map(c=>c.style.animationDelay)")
                if len(d)>=3: delays=d; break
                c=await pg.query_selector('#a-c')
                if c:
                    try: await c.click(timeout=300)
                    except: pass
            print(fmt, 'deal phase lasted %.1fs' % ((t1-t0)/1000), '| flop delays', delays, errs)
            await pg.close()
        await b.close()
asyncio.run(m())
