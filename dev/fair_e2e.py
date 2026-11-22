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
        for _ in range(900):
            await pg.wait_for_timeout(150)
            st=await pg.evaluate("(()=>{ if(T.status==='over') return 'over'; const H=T.hand; if(H&&H.ph==='bet'&&H.turn>=0){ doAct(H.turn,'allin',0); afterChange(); } return 'p'; })()")
            if st=='over': break
            if await pg.query_selector('#a-watch'): await pg.click('#a-watch')
        await pg.wait_for_timeout(1500)
        print('status', await pg.evaluate('T.status'), 'hands', await pg.evaluate('T.hand.n'))
        print('LINE:', await pg.inner_text('#b-fair2'))
        await pg.screenshot(path='shot_fair_over.png')
        await pg.click('#b-fair2'); await pg.wait_for_timeout(300); await pg.screenshot(path='shot_fair_sheet.png', full_page=True)
        # tamper check
        print('tampered:', await pg.evaluate("(()=>{const fd=JSON.parse(JSON.stringify(view.T.fairDone)); const L=fairLogs[fd.c]; const n=Object.keys(L).find(k=>L[k].b.length); L[n].b[0]=(L[n].b[0]+1)%52; return JSON.stringify(fairVerify(fd).bad)})()"))
        print('wrongkey:', await pg.evaluate("(()=>{const fd=JSON.parse(JSON.stringify(view.T.fairDone)); fd.s='00'+fd.s.slice(2); return fairVerify(fd).keyOk})()"))
        print('ERR', errs); await b.close()
asyncio.run(m())
