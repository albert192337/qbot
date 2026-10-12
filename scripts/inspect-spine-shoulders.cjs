const fs=require('node:fs/promises'),path=require('node:path');
const {_electron}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{const app=await _electron.launch({executablePath:require('electron'),args:[path.join(__dirname,'spine-lab-window.cjs')],env:{...process.env,SPINE_LAB_URL:'http://127.0.0.1:24361/?skin=sasuke-gpt'}});try{
const page=await app.firstWindow();await page.waitForFunction(()=>document.body.dataset.ready==='true');
const result=await page.evaluate(()=>{
const sk=spineLab.skeletons[1];sk.setToSetupPose();sk.updateWorldTransform();
return {bones:sk.bones.filter(b=>/arm_[RL][12]|body_[123]/.test(b.data.name)).map(b=>({name:b.data.name,x:b.worldX,y:b.worldY,length:b.data.length,a:b.a,b:b.b,c:b.c,d:b.d})),meshes:['右手_1无袖','左手_1无袖','躯干上部'].map(name=>{const s=sk.findSlot(name),m=s.getAttachment(),xy=new Float32Array(m.worldVerticesLength);m.computeWorldVertices(s,0,xy.length,xy,0,2);return {name,uvs:Array.from(m.regionUVs),xy:Array.from(xy)};})};
});await fs.writeFile(path.resolve('output/spine-lab/sasuke-gpt/shoulder-inspection.json'),JSON.stringify(result));console.log(JSON.stringify(result.bones));
}finally{await app.close();}})();
