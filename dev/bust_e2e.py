import asyncio
from playwright.async_api import async_playwright
async def m():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
        pg=await b.new_page(viewport={'width':390,'height':844},device_scale_factor=2)
        errs=[]; pg.on('pageerror',lambda e: errs.append(str(e)))
        await pg.goto('file:///home/claude/poker/index.html'); await pg.wait_for_timeout(400)
        await pg.fill('#in-name','Mahen'); await pg.click('#b-practice'); await pg.click('[data-f="sng6"]')
        await pg.click('#b-create')
        await pg.wait_for_timeout(6000)
        await pg.evaluate("(()=>{const i=mySeat(); const st=view.T.seats[i]; st.o=1; st.pl=4; st.s=0; st.aw=0; renderActions(true); renderHero();})()")
        await pg.wait_for_timeout(800); await pg.screenshot(path='shot_bust.png')
        print('ACTIONS:', (await pg.inner_text('#actions')).replace('\n',' | '))
        print('HERO:', (await pg.inner_text('#hero')).replace('\n',' | '))
        await pg.click('#a-watch'); await pg.wait_for_timeout(500); await pg.screenshot(path='shot_watch.png')
        print('WATCH:', (await pg.inner_text('#actions')).replace('\n',' | '))
        await pg.click('#b-leave-out'); await pg.wait_for_timeout(600)
        print('home visible:', await pg.is_visible('#b-practice'), 'ERR', errs); await b.close()
asyncio.run(m())
