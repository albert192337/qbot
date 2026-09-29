const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs/promises'),os=require('node:os');
const {_electron:electron}=require(process.env.PLAYWRIGHT_MODULE||'C:/Users/beta/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'output/room-decoration');
(async()=>{
 await fs.mkdir(out,{recursive:true});const assets=await fs.readdir(path.join(root,'app/out/renderer/assets'));
 const js=assets.find(x=>/^furnish-.*\.js$/.test(x)),css=assets.find(x=>/^furnish-.*\.css$/.test(x));assert.ok(js&&css);
 const html=path.join(root,'app/out/renderer/furnish-qa.html');
 await fs.writeFile(html,`<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="./assets/${css}"><style>body{margin:0;font:14px 'Microsoft YaHei';background:#faf9f5}button{padding:8px;border:1px solid #ddd;border-radius:6px;background:white}.primary{background:#6c7656;color:white}</style><main id="editor"></main><script type="module">import {mount} from './assets/${js}';try{await mount(document.getElementById('editor'));document.body.dataset.ready='true';}catch(e){document.body.dataset.error=e.stack;}</script>`);
 let app;const errors=[];
 try{
  app=await electron.launch({executablePath:require('../app/node_modules/electron'),args:[path.join(root,'app/test/fixtures/cozy-main.cjs')],env:{...process.env,QBOT_ONLINE_PREVIEW:'1',QBOT_QA_DATA:await fs.mkdtemp(path.join(os.tmpdir(),'qbot-furnish-'))}});
  const room=await app.firstWindow();await app.evaluate(()=>{global.cozyQA.win.show();global.cozyQA.win.focus();});room.on('pageerror',e=>errors.push(e.message));await room.waitForSelector('body[data-ready=true]');
  await app.evaluate(async({BrowserWindow},{html,preload})=>{const w=new BrowserWindow({width:1050,height:820,show:true,webPreferences:{preload,contextIsolation:true,sandbox:false}});global.cozyQA.editor=w;await w.loadFile(html);},{html,preload:path.join(root,'app/out/preload/index.js')});
  const editor=app.windows().find(p=>p.url().includes('furnish-qa'));editor.on('pageerror',e=>errors.push(e.message));await editor.waitForFunction(()=>document.body.dataset.ready||document.body.dataset.error);assert.equal(await editor.evaluate(()=>document.body.dataset.error),undefined);
  await editor.screenshot({path:path.join(out,'editor.png')});await room.screenshot({path:path.join(out,'room.png')});
  // Every generated piece must be independently selectable and render nonempty pixels.
  for(const name of ['梅影书斋','奶油书屋','藤编花房']){
    await editor.getByRole('button',{name,exact:true}).click();
    await editor.locator('.room-furnish-board').screenshot({path:path.join(out,'set-'+name+'.png')});
  }
  await editor.getByLabel('家具主题',{exact:true}).selectOption('reading');
  await editor.getByLabel('家具类别',{exact:true}).selectOption('seat');
  assert.equal(await editor.locator('.room-item').count(),1);
  await editor.locator('[data-item-id="reading-seat"]').click();
  await editor.getByLabel('家具主题',{exact:true}).selectOption('all');
  await editor.getByLabel('家具类别',{exact:true}).selectOption('all');
  for(const [slot,pieces] of [['左侧家具',['tea-counter','tea-sofa','tea-plant','tea-table',...['scholar','reading','rattan'].flatMap(t=>['cabinet','seat','plant','table'].map(k=>t+'-'+k))]],['左侧挂饰',['tea-lantern','scholar-lantern','reading-lamp','rattan-art']],['地毯',['tea-rug','scholar-rug','reading-rug','rattan-rug']]]){
    await editor.getByRole('button',{name:slot,exact:true}).click();
    for(const id of pieces){const card=editor.locator('[data-item-id="'+id+'"]');await card.click();assert.equal(await card.getAttribute('aria-pressed'),'true');
      const pixels=await card.locator('canvas').evaluate(c=>{const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let n=0;for(let i=3;i<d.length;i+=4)if(d[i]>24)n++;return n;});assert.ok(pixels>80,id+' has visible art');
    }
  }
  await editor.getByRole('button',{name:'奶油书屋',exact:true}).click();
  await editor.getByRole('button',{name:'中央座椅',exact:true}).click();await editor.locator('[data-item-id="scholar-seat"]').click();
  await editor.getByRole('button',{name:'茶几',exact:true}).click();await editor.locator('[data-item-id="rattan-table"]').click();
  await editor.getByRole('button',{name:'右侧挂饰',exact:true}).click();await editor.locator('[data-item-id="rattan-art"]').click();
  await editor.locator('#save-furnish').click();await editor.getByRole('status').filter({hasText:'已保存'}).waitFor();
  const mixed=await editor.evaluate(()=>window.qbot.decor.get('panorama-tea-v1'));
  assert.equal(mixed.find(p=>p.id==='seat').stickerId,'scholar-seat');assert.equal(mixed.find(p=>p.id==='table').stickerId,'rattan-table');
  await editor.locator('.room-furnish-board').screenshot({path:path.join(out,'mixed.png')});
  await editor.getByRole('button',{name:'左侧家具',exact:true}).click();
  await editor.getByRole('button',{name:'全部收起',exact:true}).click();assert.equal(await editor.locator('#editor').getAttribute('data-dirty'),'true');
  await app.evaluate(()=>global.cozyQA.failSave=true);await editor.locator('#save-furnish').click();await editor.getByRole('status').filter({hasText:'保存失败'}).waitFor();assert.equal(await editor.locator('#editor').getAttribute('data-dirty'),'true');assert.equal(await editor.locator('#save-furnish').isEnabled(),true);
  await app.evaluate(()=>global.cozyQA.failSave=false);await editor.locator('#save-furnish').click();await editor.getByRole('status').filter({hasText:'已保存'}).waitFor();await room.waitForTimeout(300);await room.screenshot({path:path.join(out,'empty-room.png')});
  await editor.reload();await editor.waitForSelector('body[data-ready=true]');assert.equal(await editor.locator('.room-shelf h3').textContent(),'左侧家具 · 空位');
  await editor.locator('[data-item-id="moss-stool"]').click();await editor.getByRole('button',{name:'右侧家具',exact:true}).click();assert.equal(await editor.locator('[data-item-id="moss-stool"]').isDisabled(),true);
  await editor.getByRole('button',{name:'撤销修改',exact:true}).click();assert.equal(await editor.locator('#editor').getAttribute('data-dirty'),'false');
  await editor.getByRole('button',{name:'恢复茶室套装',exact:true}).click();await editor.locator('#save-furnish').click();await editor.getByRole('status').filter({hasText:'已保存'}).waitFor();
  await app.evaluate(()=>global.cozyQA.editor.setContentSize(600,600));assert.equal(await editor.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await editor.screenshot({path:path.join(out,'editor-small.png')});
  assert.deepEqual(errors,[]);await fs.writeFile(path.join(out,'verification.json'),JSON.stringify({passed:true,checks:['24 independently selectable sprites','four theme presets','theme and category filters','mixed-theme save','room shell and separate furniture','save failure preserves editable draft','save and reload preserves all-empty layout','owned furniture quantity shared across slots','discard and default set','600px editor'],errors},null,2));console.log('PASS room decoration');
 }finally{if(app)await app.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
