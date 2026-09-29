const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs/promises'),os=require('node:os');
const {_electron:electron}=require('C:/Users/beta/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'output/social-economy');
(async()=>{
 await fs.mkdir(out,{recursive:true});const directory=await fs.mkdtemp(path.join(os.tmpdir(),'qbot-economy-qa-')),assets=await fs.readdir(path.join(root,'app/out/renderer/assets'));
 const js=name=>assets.find(x=>x.startsWith(name+'-')&&x.endsWith('.js'));
 const css=assets.filter(x=>/^(furnish|social-economy|capsule)-.*\.css$/.test(x));
 assert.ok(js('rewards')&&js('furnish'));
 await fs.writeFile(path.join(root,'app/out/renderer/economy-qa.html'),`<!doctype html><meta charset="utf-8"><title>家具经济试玩</title>${css.map(x=>`<link rel="stylesheet" href="assets/${x}">`).join('')}<style>body{margin:24px;font:14px 'Microsoft YaHei';background:#f8f3e9}nav{display:flex;gap:12px}button{padding:10px;border-radius:9px;border:1px solid #cdbd9e}main{max-width:1000px;margin:auto}</style><nav><button id="capsule">家具商店与扭蛋</button><button id="furnish">布置茶室</button></nav><main id="root"></main><script type="module">import * as rewards from './assets/${js('rewards')}';import * as furnish from './assets/${js('furnish')}';let current;window.showEconomyView=async name=>{current?.unmount?.();document.getElementById('root').replaceChildren();current=name==='furnish'?furnish:rewards;await current.mount(document.getElementById('root'));document.body.dataset.ready=name;};document.getElementById('capsule').onclick=()=>showEconomyView('rewards');document.getElementById('furnish').onclick=()=>showEconomyView('furnish');await showEconomyView('rewards');</script>`);
 let app;const errors=[];
 try{
  app=await electron.launch({executablePath:require('../app/node_modules/electron'),args:[path.join(root,'app/test/fixtures/social-economy-main.cjs')],env:{...process.env,QBOT_ECONOMY_DATA:directory,QBOT_ECONOMY_SHOW:'1'}});
  let page=await app.firstWindow();page.on('pageerror',e=>errors.push(e.message));await page.waitForSelector('body[data-ready=rewards]');
  await page.getByRole('button',{name:'模拟充值 +300',exact:true}).click();await page.getByText('◈ 300',{exact:true}).waitFor();
  await page.getByRole('button',{name:'转一次  ·  ◈ 60',exact:true}).click();await page.getByText('◈ 240',{exact:true}).waitFor();
  await page.getByRole('button',{name:'开心收下',exact:true}).click();await page.getByText('逛逛花园家具小店',{exact:true}).click();await page.getByRole('button',{name:'购买 · 120 花园币',exact:true}).click();await page.getByRole('status').filter({hasText:'苔绒小凳已收入收藏'}).waitFor();
  const state=await app.evaluate(()=>global.economyQA.getState());assert.equal(state.economy.tokens,240);assert.equal(state.coins,60);assert.ok(state.economy.furniture['moss-stool']>=1);
  await page.waitForFunction(()=>[...document.querySelectorAll('.capsule-machine img')].every(i=>i.complete&&i.naturalWidth>0));await page.screenshot({path:path.join(out,'capsule.png'),fullPage:true});
  await page.locator('#furnish').click();await page.waitForSelector('body[data-ready=furnish]');
  await page.getByRole('button',{name:'左侧家具',exact:true}).click().catch(async()=>{const names=await page.locator('.room-slots button').allTextContents();throw Error('Missing wall slot: '+names.join('/'));});
  await page.getByRole('button',{name:/苔绒小凳/}).filter({hasText:'收藏'}).click();await page.locator('#save-furnish').click();await page.getByRole('status').filter({hasText:'已保存'}).waitFor();
  await page.screenshot({path:path.join(out,'furniture.png'),fullPage:true});
  await app.close();app=null;
  app=await electron.launch({executablePath:require('../app/node_modules/electron'),args:[path.join(root,'app/test/fixtures/social-economy-main.cjs')],env:{...process.env,QBOT_ECONOMY_DATA:directory,QBOT_ECONOMY_SHOW:'1'}});page=await app.firstWindow();await page.waitForSelector('body[data-ready=rewards]');await page.getByText('◈ 240',{exact:true}).waitFor();
  assert.equal(await page.getByRole('button',{name:'模拟充值 +300',exact:true}).isDisabled(),true);
  await app.evaluate(()=>{global.economyQA.getState().economy.tokens=600;});await page.evaluate(()=>window.showEconomyView('rewards'));
  await page.getByRole('button',{name:'转十次  ·  ◈ 600',exact:true}).click();await page.getByRole('button',{name:'开心收下',exact:true}).waitFor();
  assert.equal(await page.locator('.capsule-dialog .capsule-reward').count(),10);
  const ten=await app.evaluate(()=>global.economyQA.getState());assert.equal(ten.economy.tokens,0);assert.equal(ten.economy.lastCapsule.rewards.length,10);assert.ok(ten.economy.lastCapsule.rewards.some(r=>r.tier!=='common'));
  await page.screenshot({path:path.join(out,'capsule-ten-rewards.png'),fullPage:true});await page.getByRole('button',{name:'开心收下',exact:true}).click();
  await app.evaluate(()=>global.economyQA.win.setContentSize(560,760));await page.waitForFunction(()=>innerWidth===560);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.waitForFunction(()=>[...document.querySelectorAll('.capsule-machine img')].every(i=>i.complete&&i.naturalWidth>0));await page.screenshot({path:path.join(out,'capsule-small.png'),fullPage:true});
  assert.deepEqual(errors,[]);await fs.writeFile(path.join(out,'verification.json'),JSON.stringify({passed:true,checks:['simulated topup','draw cost and saved reward','buy 2D furniture','place and save moss stool','restart preserves tokens and daily cap','560px width'],errors},null,2));console.log('PASS economy UI, placement and restart');
 }finally{if(app)await app.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});



