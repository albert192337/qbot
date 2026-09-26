const {_electron}=require('C:/Users/beta/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs/promises'),path=require('node:path');
(async()=>{const app=await _electron.launch({executablePath:require('../app/node_modules/electron'),args:[path.join(__dirname,'spine-lab-window.cjs')]});try{const page=await app.firstWindow();await page.waitForSelector('body[data-ready=true]');await page.evaluate(()=>spineLab.setPaused(true));for(const t of [0,1,2,2.5,3,3.5,4,4.5,5]){const data=await page.evaluate(t=>{spineLab.setAnimation('town_shuangren_tietie01');spineLab.draw(t);return document.querySelector('canvas').toDataURL().split(',')[1]},t);await fs.writeFile(`output/spine-lab/together-${t}.png`,Buffer.from(data,'base64'));}
const report=await page.evaluate(()=>{
 const lab=spineLab,sk=lab.skeletons[1],pose=()=>['knee_L','knee_R'].flatMap(n=>{const b=sk.findBone(n);return[b.x,b.y]});
 lab.setAnimation('ship_spine_idle');lab.draw(.5);const idle=pose();
 lab.setAnimation('town_shuangren_tietie01');lab.draw(3);const direct=pose();
 lab.setAnimation('town_shuangren_tietie01');for(let i=0;i<180;i++)lab.draw(1/60);
 const sequential=pose();if(direct.some((v,i)=>Math.abs(v-sequential[i])>.01))throw Error('Knee correction accumulated across frames');
 let maxDeviation=0;for(let i=0;i<600;i++){lab.draw(1/60);for(const s of ['L','R']){const h=sk.findBone('leg_'+s+'0'),f=sk.findBone('foot_'+s),k=sk.findBone('knee_'+s);const dx=f.worldX-h.worldX,dy=f.worldY-h.worldY;const d=Math.abs((k.worldX-h.worldX)*dy-(k.worldY-h.worldY)*dx)/Math.hypot(dx,dy);maxDeviation=Math.max(d,maxDeviation);if(!Number.isFinite(d)||d>4.01)throw Error('Knee kinks beyond calibrated range');}}
 lab.setAnimation('ship_spine_idle');lab.draw(.5);if(idle.some((v,i)=>Math.abs(v-pose()[i])>.001))throw Error('Correction leaked to idle');
 return{frames:600,maxDeviation,sequentialEqualsDirect:true,idleRestored:true};
});await fs.writeFile('output/spine-lab/together-validation.json',JSON.stringify(report,null,2));console.log(report);
}finally{await app.close()}})().catch(e=>{console.error(e);process.exitCode=1});
