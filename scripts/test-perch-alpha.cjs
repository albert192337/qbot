// Offline Electron verification of actual decoded alpha throughout a repaired clip.
const {app,BrowserWindow,session}=require('electron');
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const {pathToFileURL}=require('node:url');
app.setPath('userData',path.join(os.tmpdir(),'qbot-perch-alpha-'+process.pid));
app.whenReady().then(async()=>{try{
  session.defaultSession.webRequest.onBeforeRequest({urls:['http://*/*','https://*/*']},(_r,cb)=>cb({cancel:true}));
  const dir=path.resolve('output/perch-diagnosis');
  const video=pathToFileURL(path.join(dir,'repaired/actions/perch.webm')).href;
  const html=`<body style="margin:0;background:#eee"><video muted src="${video}" style="display:none"></video><canvas width="1280" height="640"></canvas></body>`;
  await fs.writeFile(path.join(dir,'review.html'),html);
  const win=new BrowserWindow({show:false,width:1280,height:640,webPreferences:{backgroundThrottling:false}});
  await win.loadFile(path.join(dir,'review.html'));
  const result=await win.webContents.executeJavaScript(`(async()=>{
    const v=document.querySelector('video'),grid=document.querySelector('canvas'),g=grid.getContext('2d');
    if(v.readyState<2)await new Promise((ok,no)=>{v.onloadeddata=ok;v.onerror=no});
    const c=document.createElement('canvas');c.width=c.height=640;const ctx=c.getContext('2d',{willReadFrequently:true});
    const frames=[];
    for(let n=0;n<10;n++){
      const t=.1+n*.48;await new Promise(ok=>{v.onseeked=ok;v.currentTime=t});
      ctx.clearRect(0,0,640,640);ctx.drawImage(v,0,0,640,640);const d=ctx.getImageData(0,0,640,640).data;
      let green=0,solid=0,clear=0;
      for(let i=0;i<d.length;i+=4){if(d[i+3]<16)clear++;if(d[i+3]>224)solid++;if(d[i+3]>32&&d[i+1]>d[i]+40&&d[i+1]>d[i+2]+40)green++}
      frames.push({t,green,solid,clear});const x=n%5*256,y=Math.floor(n/5)*320;
      g.fillStyle=n%2?'#28313d':'#f4ece0';g.fillRect(x,y,256,320);g.drawImage(c,x,y,256,256);g.fillStyle=n%2?'white':'black';g.font='18px sans-serif';g.fillText(t.toFixed(2)+' s',x+16,y+290);
    }
    return {duration:v.duration,frames,png:grid.toDataURL('image/png')};
  })()`);
  await fs.writeFile(path.join(dir,'electron-contact-sheet.png'),Buffer.from(result.png.split(',')[1],'base64'));delete result.png;
  await fs.writeFile(path.join(dir,'electron-quality.json'),JSON.stringify(result,null,2));
  if(result.frames.some(f=>f.green>640*640*.001||f.clear<640*640*.2||f.solid<640*640*.1))throw Error('Decoded alpha or green residual check failed');
  console.log(JSON.stringify(result));app.quit();
}catch(e){console.error(e);app.exit(1)}});
setTimeout(()=>{console.error('Video review timeout');app.exit(1)},60000).unref();
