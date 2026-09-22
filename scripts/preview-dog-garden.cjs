// Same-frame art study using the active character's existing local animation.
// No application state is written; no network or generation API is used.
const {app,BrowserWindow,screen,session}=require('electron');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..'),out=path.join(root,'output/dog-garden-study');
fs.mkdirSync(out,{recursive:true});
const data=path.join(app.getPath('appData'),'@qbot','app');
const settings=JSON.parse(fs.readFileSync(path.join(data,'config.json'),'utf8'));
const dir=path.join(data,'characters',settings.activeCharacter);
const manifest=JSON.parse(fs.readFileSync(path.join(dir,'manifest.json'),'utf8'));
if(!manifest.name.includes('狗'))throw Error('Current character is not a dog. Select the intended character explicitly.');
const video='data:video/webm;base64,'+fs.readFileSync(path.join(dir,manifest.actions.idle.webm)).toString('base64');
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'qbot-dog-garden-')));
const renderer=pathToFileURL(path.join(root,'app/out/renderer/gene-preview/index.html')).href;
const html=`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>小黄狗 × 立体草莓 · 同框试摆</title>
<style>
*{box-sizing:border-box}html,body{margin:0;background:transparent;font:12px 'Microsoft YaHei',sans-serif;color:#405347;overflow:hidden}body{height:100vh;border-radius:22px;transition:background .2s}body[data-bg=cream]{background:#f3eee1}body[data-bg=dark]{background:#263b42;color:#edf2e5}header{height:54px;display:flex;align-items:center;justify-content:space-between;padding:0 22px;-webkit-app-region:drag}header strong{font-size:14px}button,select{font:inherit;-webkit-app-region:no-drag;border:1px solid #9da99c80;border-radius:16px;background:#f8f8eced;color:#425645;padding:6px 12px;cursor:pointer}header button{padding:4px 10px}section{height:242px;display:flex;align-items:flex-end;justify-content:center;gap:10px;padding-bottom:25px}.item{position:relative;width:190px;height:200px}.item:after{content:'';position:absolute;left:32%;right:32%;bottom:19px;height:9px;background:#59645326;border-radius:50%;filter:blur(4px);z-index:0}.dog{width:215px}.dog:after{left:23%;right:23%}video{position:absolute;width:230px;height:230px;left:-8px;bottom:-30px;object-fit:contain;z-index:1}iframe{position:absolute;border:0;width:190px;height:215px;bottom:-32px;z-index:1;background:transparent}small{position:absolute;top:calc(100% + 3px);width:100%;text-align:center;font-size:11px;color:inherit}footer{display:flex;align-items:center;justify-content:center;gap:8px;height:49px}.hint{opacity:.65;margin-left:8px;font-size:10px}body[data-bg=transparent] header strong,body[data-bg=transparent] small{background:#f8f5e6dd;border-radius:12px;padding:3px 9px;color:#405347}body[data-bg=transparent] .hint{display:none}body[data-scale=small] section{transform:scale(.8);transform-origin:center bottom}body[data-scale=large] section{transform:scale(1.12);transform-origin:center bottom}
</style><body data-bg="cream" data-scale="normal"><header><strong>小黄狗与奇珍草莓</strong><button id="close" title="关闭">×</button></header>
<section><div class="item dog"><video id="dog" muted autoplay loop playsinline></video><small>现在的小黄狗 · 2D</small></div><div class="item"><iframe id="natural" src="${renderer}?desktop=1&companion=1&skin=natural"></iframe><small>普通草莓 · 柔和哑光</small></div><div class="item"><iframe id="crystal" src="${renderer}?desktop=1&companion=1&skin=crystal"></iframe><small>水晶草莓 · 少量金蝶</small></div></section>
<footer><select id="background" aria-label="背景"><option value="cream">浅色背景</option><option value="dark">深色背景</option><option value="transparent">直接放桌面</option></select><select id="scale" aria-label="尺寸"><option value="small">小号</option><option value="normal" selected>中号</option><option value="large">大号</option></select><button id="motion">暂停动效</button><span class="hint">拖动标题移动 · Esc 关闭</span></footer>
<script>
document.getElementById('dog').src=${JSON.stringify(video)};
document.getElementById('close').onclick=()=>window.close();
document.getElementById('background').onchange=e=>document.body.dataset.bg=e.target.value;
document.getElementById('scale').onchange=e=>document.body.dataset.scale=e.target.value;
let paused=false;document.getElementById('motion').onclick=()=>{paused=!paused;const dog=document.getElementById('dog');paused?dog.pause():dog.play();for(const f of document.querySelectorAll('iframe')){const b=f.contentDocument.getElementById('motion');if(b.getAttribute('aria-pressed')===String(paused))b.click();}document.getElementById('motion').textContent=paused?'继续动效':'暂停动效';};
</script></body></html>`;
const file=path.join(out,'preview.html');fs.writeFileSync(file,html);
const wait=ms=>new Promise(r=>setTimeout(r,ms));
app.whenReady().then(async()=>{
 try{
 session.defaultSession.webRequest.onBeforeRequest({urls:['http://*/*','https://*/*']},(_,cb)=>cb({cancel:true}));
 const area=screen.getPrimaryDisplay().workArea;
 const win=new BrowserWindow({width:720,height:345,x:area.x+Math.round((area.width-720)/2),y:area.y+area.height-390,transparent:true,frame:false,hasShadow:false,backgroundColor:'#00000000',alwaysOnTop:true,resizable:false,webPreferences:{sandbox:true,contextIsolation:true,nodeIntegration:false}});
 win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
 win.webContents.on('before-input-event',(_e,input)=>{if(input.key==='Escape')win.close();});
 const errors=[];win.webContents.on('console-message',e=>{if(e.level==='error')errors.push(e.message);});
 await win.loadFile(file);const js=s=>win.webContents.executeJavaScript(s);
 for(let i=0;i<80;i++){if(await js(`document.getElementById('dog').readyState>=2&&[...document.querySelectorAll('iframe')].every(f=>f.contentDocument?.body.dataset.ready==='true')`))break;await wait(250);}
 if(!await js(`document.getElementById('dog').readyState>=2&&[...document.querySelectorAll('iframe')].every(f=>f.contentDocument?.body.dataset.ready==='true')`))throw Error('Dog or 3D preview failed to load');
 for(const bg of ['cream','dark','transparent']){await js(`document.body.dataset.bg='${bg}';document.getElementById('background').value='${bg}'`);await wait(1600);await win.webContents.capturePage();await wait(500);fs.writeFileSync(path.join(out,bg+'.png'),(await win.webContents.capturePage()).toPNG());}
 await js(`document.body.dataset.bg='cream';document.getElementById('background').value='cream'`);
 fs.writeFileSync(path.join(out,'result.json'),JSON.stringify({ok:true,character:manifest.name,pid:process.pid,errors,checks:['active dog video decoded','two WebGL scenes ready','three backgrounds captured']},null,2));
 if(!process.argv.includes('--show'))app.quit();
 }catch(e){fs.writeFileSync(path.join(out,'result.json'),JSON.stringify({ok:false,error:String(e.stack)}));app.exit(1);}
});
app.on('window-all-closed',()=>app.quit());
