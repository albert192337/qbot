// User-requested two-clip trial. Persist task IDs before polling; reruns never repurchase.
import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createArkClient,toDataUrl,selectDualKeys,toWebm,rimDespillFilter} from '../pipeline/dist/index.js';
if(process.env.QBOT_GENERATE_HYBRID!=='1')throw Error('Explicit generation flag required');
const root=path.resolve(import.meta.dirname,'..'),base=path.resolve(process.env.QBOT_HYBRID_OUTPUT||'D:/QBot-Spine-Hybrid');
const free=process.argv.includes('--free'),out=free?path.join(base,'free-v2'):base;
await fs.mkdir(out,{recursive:true});
const read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
const config={...await read(path.join(root,'config.local.json')).catch(()=>({})),...await read(path.join(process.env.APPDATA,'@qbot/app/config.json')).catch(()=>({}))};
if(!config.arkApiKey)throw Error('Missing configured Ark key');
const ark=createArkClient({apiKey:config.arkApiKey}),ffmpeg=path.join(root,'app/node_modules/ffmpeg-static/ffmpeg.exe');
const stateFile=path.join(out,'generation.json'),state=await read(stateFile).catch(()=>({}));
const save=()=>fs.writeFile(stateFile,JSON.stringify(state,null,2));
const ids=['spine-wuxie','spine-zhangqiling'];
for(const id of ids){
 const dir=path.join(out,id),frame=path.join(dir,'video-frame.png');
 if(!state[id]){
  await fs.mkdir(dir,{recursive:true});
  if(free)await fs.copyFile(path.join(base,id,'spine-frame.png'),path.join(dir,'spine-frame.png'));
  execFileSync(ffmpeg,['-y','-f','lavfi','-i','color=c=0x00FF00:s=512x512','-i',path.join(dir,'spine-frame.png'),'-filter_complex','[0:v][1:v]overlay=0:0:format=auto,format=rgb24','-frames:v','1',frame],{stdio:'ignore'});
  const motion=id==='spine-wuxie'?'棕发黄外套小人开心地向观众挥手，然后双手在胸前轻轻比一个爱心，眼睛变成向上弯的开心弧线，最后手放回身体两侧并恢复首帧眼形。':'蓝兜帽黑发小人先微微歪头，然后抬起一只手轻轻接住从头顶跳到手心的小黄鸡，看一眼它；小鸡跳回头顶，手放回身体两侧，恢复首帧姿态。';
  const freeMotion=id==='spine-wuxie'?'棕发黄外套小人先惊喜地屈膝蓄力，张开双臂开心地向上小跳，双脚明显离地，落地后屈膝回弹，灵巧地转半圈再转向观众，用整个手臂大幅挥手，身体随挥手左右摆动，最后自然停在挥手的开心姿势。':'蓝色兜帽黑发小人发现头顶小黄鸡跳下来，立刻惊讶地弯腰屈膝，侧跨一小步，伸出双手向下接住小鸡，再自然起身把小鸡高高托起，抬头看它，头发、兜帽和衣摆跟随动作轻轻摆动，最后保持双手托着小鸡的姿势。';
  const prompt=free?`${freeMotion} 这是完整流畅、有鲜明预备动作、惯性、回弹和节奏变化的二维Q版动画演出。让全身关节与重心自然参与，不是贴纸左右摇摆，不是固定骨骼小幅摆动。只参考首帧角色身份、服装、配色、头身比例与平涂画风；允许转身、侧身、蹲下、跳跃和透视变化。面部保留两个纯黑胶囊眼或开心弧线眼，无嘴、无鼻、无眼白。角色全身与小鸡始终在画面内。单一固定镜头，纯鲜绿色均匀背景，无文字，无地面投影。以描述的结束姿势自然结束，不需要回到首帧，不需要循环。 --resolution 480p --duration 5 --camerafixed true`:`${motion} 保持首帧的二维Q版平涂画风、线条粗细、衣服细节、头身比例、肤色和发型。面部只有两个纯黑简洁胶囊眼或弧线眼，没有嘴巴，没有鼻子，没有眼白，没有高光瞳孔。身体动作温和自然，左右手各一只，手臂从各自肩膀袖口连续连接。脚底位置和人物大小固定，不走出原地，不旋转身体，不拉长手脚，不改变头部大小。固定镜头，无运镜，无缩放，无字幕，无额外人物，无背景道具。背景纯鲜绿色均匀恒定，无地面投影。首帧和尾帧完全相同，回到安静站立。 --resolution 480p --duration 5 --camerafixed true`;
  state[id]={taskId:await ark.submitVideoTask({prompt,frameDataUrl:toDataUrl(await fs.readFile(frame)),loopFrame:!free}),prompt,loopFrame:!free};await save();console.log(id+': submitted');
 }
}
await Promise.all(ids.map(async id=>{
 const dir=path.join(out,id),mp4=path.join(dir,'highlight.mp4');
 if(!await fs.stat(mp4).catch(()=>null)){
  const deadline=Date.now()+20*60_000;
  while(Date.now()<deadline){const task=await ark.getVideoTask(state[id].taskId);if(task.status==='failed')throw Error(id+': '+task.error);if(task.status==='succeeded'){await ark.downloadVideo(task.videoUrl,mp4);break;}await new Promise(r=>setTimeout(r,5000));}
 }
 const samples=execFileSync(ffmpeg,['-v','error','-i',mp4,'-vf','fps=1,scale=64:64','-f','rawvideo','-pix_fmt','rgb24','pipe:1']);
 const colors=[];for(let off=0;off+64*64*3<=samples.length;off+=64*64*3)for(const [x,y]of [[1,1],[62,1],[1,62],[62,62]]){const i=off+(y*64+x)*3;colors.push(samples.subarray(i,i+3).toString('hex'));}
 const keys=selectDualKeys(colors);if(!keys.length)throw Error('Missing uniform green background');
 await toWebm(mp4,path.join(dir,'highlight.webm'),keys,ffmpeg,undefined,0,0,rimDespillFilter(.5,3).replace(/^,/,''));
 console.log(id+': downloaded and keyed');
}));
