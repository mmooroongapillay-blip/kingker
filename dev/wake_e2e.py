import asyncio
from playwright.async_api import async_playwright
MOCK="""window.__wl=[];Object.defineProperty(navigator,"wakeLock",{configurable:true,value:{request:async t=>{const l={released:false,_h:[],addEventListener(e,f){this._h.push(f)},release:async function(){this.released=true;window.__wl.push('release');this._h.forEach(f=>f())}};window.__wl.push('request:'+t);return l;}}});"""
async def m():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
        pg=await b.new_page(); await pg.add_init_script(MOCK); errs=[]; pg.on('pageerror',lambda e: errs.append(str(e)))
        await pg.goto('file:///home/claude/poker/index.html'); await pg.wait_for_timeout(400)
        await pg.fill('#in-name','Mahen'); await pg.click('#b-practice'); await pg.click('[data-f="hu"]'); await pg.click('#b-create')
        await pg.wait_for_timeout(3000); print('in game:', await pg.evaluate('window.__wl'))
        await pg.evaluate('leaveTable(true)'); await pg.wait_for_timeout(800); print('after leave:', await pg.evaluate('window.__wl'), errs)
        await b.close()
asyncio.run(m())
