import asyncio
from playwright.async_api import async_playwright
MOCK = """window.__say='call';
class FakeSR { start(){ setTimeout(()=>{ this.onstart&&this.onstart(); setTimeout(()=>{ const alt=[{transcript:window.__say}]; this.onresult&&this.onresult({results:[alt]}); this.onend&&this.onend(); },300); },50); } stop(){ this.onend&&this.onend(); } }
window.webkitSpeechRecognition = FakeSR; window.SpeechRecognition = FakeSR;"""
async def waitturn(pg):
    for _ in range(200):
        await pg.wait_for_timeout(200)
        if await pg.evaluate("T.hand.ph==='bet' && T.hand.turn===mySeat()"): return True
    return False
async def m():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
        pg=await b.new_page(viewport={'width':390,'height':844},device_scale_factor=2)
        await pg.add_init_script(MOCK)
        errs=[]; pg.on('pageerror',lambda e: errs.append(str(e)))
        await pg.goto('file:///home/claude/poker/index.html'); await pg.wait_for_timeout(400)
        await pg.fill('#in-name','Mahen'); await pg.click('#b-practice'); await pg.click('[data-f="hu"]'); await pg.click('[data-k="turn"] [data-v="40"]'); await pg.click('#b-create')
        await pg.wait_for_timeout(500); await pg.click('#b-menu'); await pg.wait_for_timeout(200); await pg.click('#m-voice'); await pg.wait_for_timeout(200)
        await pg.screenshot(path='voice_menu.png'); await pg.click('#m-close')
        # 1) say "call" (or check)
        await waitturn(pg); await pg.wait_for_timeout(300)
        n=await pg.evaluate("T.hand.n"); await pg.evaluate("window.__say = legal(T, mySeat()).canCheck ? 'check' : 'call'")
        await pg.screenshot(path='voice_turn.png')
        await pg.click('#a-mic'); await pg.wait_for_timeout(900)
        print('after voice call/check:', await pg.evaluate("JSON.stringify(T.hand.last)"), 'me', await pg.evaluate("mySeat()"))
        # 2) next turn: say raise to 100 -> confirm
        ok=await waitturn(pg)
        await pg.evaluate("window.__say = 'raise to 100'"); await pg.click('#a-mic'); await pg.wait_for_timeout(900)
        await pg.screenshot(path='voice_raise.png')
        conf=await pg.evaluate("!!document.querySelector('#a-r.confirm')"); amt=await pg.evaluate("raiseTo")
        await pg.click('#a-r'); await pg.wait_for_timeout(500)
        print('raise pending confirm:', conf, 'amount set', amt, '-> after tap:', await pg.evaluate("JSON.stringify(T.hand.last)"))
        # 3) gibberish
        if await waitturn(pg):
            await pg.evaluate("window.__say = 'banana'"); await pg.click('#a-mic'); await pg.wait_for_timeout(900)
            print('gibberish toast:', await pg.inner_text('#toast'))
        print('ERR', errs); await b.close()
asyncio.run(m())
