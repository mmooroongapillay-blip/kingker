import asyncio
from playwright.async_api import async_playwright
# Safari-like mock: interim results only, never a final result, never ends by itself
MOCK = """window.__say='call';
class FakeSR { start(){ setTimeout(()=>{ this.onstart&&this.onstart();
  const words=window.__say.split(' '); let i=0; const tick=()=>{ i++; const r=[{transcript:words.slice(0,i).join(' ')}]; r.isFinal=false; this.onresult&&this.onresult({results:[r]}); if(i<words.length) setTimeout(tick,200); }; setTimeout(tick,200); },50); }
  stop(){ setTimeout(()=>this.onend&&this.onend(),50); } }
window.webkitSpeechRecognition = FakeSR; window.SpeechRecognition = FakeSR;"""
async def waitturn(pg):
    for _ in range(200):
        await pg.wait_for_timeout(200)
        if await pg.evaluate("T.hand.ph==='bet' && T.hand.turn===mySeat()"): return True
async def m():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
        pg=await b.new_page(viewport={'width':390,'height':844},device_scale_factor=2)
        await pg.add_init_script(MOCK); errs=[]; pg.on('pageerror',lambda e: errs.append(str(e)))
        await pg.goto('file:///home/claude/poker/index.html'); await pg.wait_for_timeout(400)
        await pg.fill('#in-name','Mahen'); await pg.click('#b-practice'); await pg.click('[data-f="hu"]'); await pg.click('[data-k="turn"] [data-v="40"]'); await pg.click('#b-create')
        await pg.wait_for_timeout(500); await pg.click('#b-menu'); await pg.wait_for_timeout(200); await pg.click('#m-voice'); await pg.wait_for_timeout(200)
        await pg.evaluate("window.__say='I call'"); await pg.click('#m-vtest'); await pg.wait_for_timeout(2500)
        print('test mic:', await pg.inner_text('#m-vres')); await pg.screenshot(path='voice_test.png'); await pg.click('#m-close')
        await waitturn(pg); await pg.evaluate("window.__say = legal(T, mySeat()).canCheck ? 'check' : 'call'")
        await pg.click('#a-mic'); await pg.wait_for_timeout(2200)
        print('safari-style call/check:', await pg.evaluate("JSON.stringify(T.hand.last)"), 'me', await pg.evaluate("mySeat()"))
        await waitturn(pg); await pg.evaluate("window.__say='raise to 100'"); await pg.click('#a-mic'); await pg.wait_for_timeout(2600)
        print('safari-style raise pending:', await pg.evaluate("!!document.querySelector('#a-r.confirm')"), await pg.evaluate("raiseTo"))
        print('ERR', errs); await b.close()
asyncio.run(m())
