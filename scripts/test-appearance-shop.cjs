const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs/promises'),os=require('node:os');
const {_electron:electron}=require('C:/Users/beta/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'output/social-economy');
(async()=>{
 await fs.mkdir(out,{recursive:true});const directory=await fs.mkdtemp(path.join(os.tmpdir(),'qbot-economy-qa-')),assets=await fs.readdir(path.join(root,'app/out/renderer/assets'));
 const js=name=>assets.find(x=>x.startsWith(name+'-')&&x.endsWith('.js'));
 const css=assets.filter(x=>/^(furnish|social-economy|capsule)-.*\.css$/.test(x));
 assert.ok(js('rewards')&&js('furnish'));
 await fs.writeFile(path.join(root,'app/out/renderer/economy-qa.html'),`<!doctype html><meta charset="utf-8"><title>外观商城 · 本地试用</title>${css.map(x=>`<link rel="stylesheet" href="assets/${x}">`).join('')}<style>body{margin:24px;font:14px 'Microsoft YaHei';background:#f8f3e9}nav{display:flex;gap:12px}button{padding:10px;border-radius:9px;border:1px solid #cdbd9e}main{max-width:1000px;margin:auto}</style><nav><button id="capsule">外观商城与扭蛋</button><span>本地试用 · 测试余额，不影响正式账号</span><button id="furnish" hidden>布置茶室</button></nav><main id="root"></main><script type="module">import * as rewards from './assets/${js('rewards')}';import * as furnish from './assets/${js('furnish')}';let current;window.showEconomyView=async name=>{current?.unmount?.();document.getElementById('root').replaceChildren();current=name==='furnish'?furnish:rewards;await current.mount(document.getElementById('root'));document.body.dataset.ready=name;};document.getElementById('capsule').onclick=()=>showEconomyView('rewards');document.getElementById('furnish').onclick=()=>showEconomyView('furnish');await showEconomyView('rewards');</script>`);
 let app;const errors=[];
 try{
  app=await electron.launch({executablePath:require('../app/node_modules/electron'),args:[path.join(root,'app/test/fixtures/social-economy-main.cjs')],env:{...process.env,QBOT_ECONOMY_DATA:directory,QBOT_ECONOMY_SHOW:'1'}});
  let page=await app.firstWindow();page.on('pageerror',e=>errors.push(e.message));await page.waitForSelector('body[data-ready=rewards]');
  await app.evaluate(()=>{global.economyQA.getState().coins=20000;});await page.evaluate(()=>window.showEconomyView('rewards'));
  await page.screenshot({path:path.join(out,'appearance-shop.png'),fullPage:true});
  await page.getByRole('button',{name:'购买 月蚀之门 · 9000 花园币',exact:true}).click();
  const portal=page.locator('[data-appearance="eclipse-portal"]');await portal.locator('select:not([disabled])').waitFor();
  await portal.locator('select').selectOption('mascot');await portal.getByRole('button',{name:'装配给所选角色'}).click();
  await portal.getByText(/正在使用：小青/).waitFor();
  await portal.locator('select').selectOption('spine-zhangqiling');await portal.getByRole('button',{name:'装配给所选角色'}).click();await portal.getByText(/正在使用：Spine 张起灵/).waitFor();
  await page.getByRole('button',{name:'购买 步生花 · 4000 花园币',exact:true}).click();
  const petals=page.locator('[data-appearance="petal-steps"]');await petals.locator('select:not([disabled])').waitFor();await petals.locator('select').selectOption('spine-zhangqiling');await petals.getByRole('button',{name:'装配给所选角色'}).click();await petals.getByText(/正在使用：Spine 张起灵/).waitFor();
  let cosmetics=await app.evaluate(()=>global.economyQA.getState());assert.equal(cosmetics.coins,7000);assert.deepEqual(cosmetics.economy.appearances.equipped,{'eclipse-portal':'spine-zhangqiling','petal-steps':'spine-zhangqiling'});
  const invalid=await page.evaluate(()=>window.qbot.garden.act({type:'equipAppearance',item:'petal-steps',actor:'stranger'}));assert.equal(invalid.ok,false);
  await app.evaluate(()=>{global.economyQA.getState().economy.tokens=120;global.economyQA.setRolls([.99,.9]);});await page.evaluate(()=>window.showEconomyView('rewards'));
  await page.getByRole('button',{name:'转一次  ·  ◈ 60',exact:true}).click();await page.getByText('重复 · 返还 60 代币',{exact:true}).waitFor();await page.getByRole('button',{name:'开心收下',exact:true}).click();
  cosmetics=await app.evaluate(()=>global.economyQA.getState());assert.equal(cosmetics.economy.tokens,120);assert.equal(cosmetics.economy.appearances.equipped['eclipse-portal'],'spine-zhangqiling');
  await page.screenshot({path:path.join(out,'appearance-equipped.png'),fullPage:true});
  await app.close();app=null;
  app=await electron.launch({executablePath:require('../app/node_modules/electron'),args:[path.join(root,'app/test/fixtures/social-economy-main.cjs')],env:{...process.env,QBOT_ECONOMY_DATA:directory,QBOT_ECONOMY_SHOW:'1'}});page=await app.firstWindow();page.on('pageerror',e=>errors.push(e.message));await page.waitForSelector('body[data-ready=rewards]');
  await page.locator('[data-appearance="eclipse-portal"]').getByText(/正在使用：Spine 张起灵/).waitFor();
  await page.locator('[data-appearance="petal-steps"]').getByRole('button',{name:'卸下外观'}).click();await page.locator('[data-appearance="petal-steps"]').getByText('已收藏 · 尚未装配',{exact:true}).waitFor();
  assert.deepEqual(errors,[]);await fs.writeFile(path.join(out,'appearance-shop-verification.json'),JSON.stringify({passed:true,checks:['purchase both appearances','equipment transfer is exclusive','both slots on same character','invalid character rejected','duplicate draw compensation','restart preserves equipment','unequip keeps unlock'],errors},null,2));console.log('PASS appearance shop, exclusive equipment, duplicates and restart');
 }finally{if(app)await app.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});



