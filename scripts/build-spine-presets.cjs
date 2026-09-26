// Package existing artwork and skeletons. No generation or video rendering.
const fs=require('node:fs/promises'),path=require('node:path');
const root=path.resolve(__dirname,'..'),catalog=require('./spine-desktop-actions.json');
const standard=new Set(['idle','drag','sleep','tea','talk_happy','talk_annoyed','wave','stretch','perch','writing']);
const expressions=new Set(['cheer','curious','dance']);
function duration(value){if(!value||typeof value!=='object')return 0;return Math.max(Number(value.time)||0,...Object.values(value).map(duration));}
(async()=>{for(const [skin,id,name,persona]of [
 ['wuxie','spine-wuxie','Spine 吴邪','你是吴邪，温和好奇、重情义，善于观察，讲话自然有生活气息。'],
 ['hood','spine-zhangqiling','Spine 张起灵','你是张起灵，沉静寡言、可靠细心，以简短具体的话表达关心。']]){
 const out=path.join(root,'app/resources/presets',id),source=path.join(root,'output/spine-lab');
 await fs.mkdir(path.join(out,'spine'),{recursive:true});
 await fs.copyFile(path.join(root,'output/spine-lab/vendor/LICENSE'),path.join(out,'LICENSE-Spine.txt'));
 // Retain abandoned video experiment outside the shipped preset.
 const old=path.join(out,'actions'),backup=path.join(root,'output/spine-desktop/abandoned-video',id);
 if(await fs.stat(old).catch(()=>null)){await fs.mkdir(path.dirname(backup),{recursive:true});if(!await fs.stat(backup).catch(()=>null))await fs.rename(old,backup);}
 const raw=JSON.parse(await fs.readFile(path.join(source,skin+'.json'),'utf8'));
 await fs.copyFile(path.join(source,skin+'.json'),path.join(out,'spine/character.json'));
 await fs.copyFile(path.join(source,skin+'-atlas.png'),path.join(out,'spine/character.png'));
 const atlas=(await fs.readFile(path.join(source,skin+'.atlas'),'utf8')).replace(skin+'-atlas.png','character.png');
 await fs.writeFile(path.join(out,'spine/character.atlas'),atlas);
 await fs.copyFile(path.join(root,'output/spine-desktop/review',id,'idle-0.png'),path.join(out,'source.png'));
 const actions={},customActions={},expressionActions={},annotations={},mapping={};
 for(const [key,spec]of Object.entries(catalog)){
  if(!raw.animations[spec.animation])throw Error('Missing animation '+spec.animation);
  const clip={webm:'',gif:'',durationSec:Math.max(.25,duration(raw.animations[spec.animation])),status:'done',facing:key==='talk'?'right':'left',...(key==='perch'?{perchAnchor:.79}:{})};
  (standard.has(key)?actions:expressions.has(key)?expressionActions:customActions)[key]=clip;
  mapping[key]=spec.animation;annotations[key]={name:spec.label,meaning:spec.label,tags:[key]};
 }
 const m={id,name,createdAt:'2026-09-26T00:00:00Z',tier:'S',pipelineVersion:'1',sourceImage:'source.png',sourceImagePurpose:'portrait',turnaround:'',persona,voice:{pack:'soft',pitchScale:skin==='hood'?.9:1,rateScale:1},actions,customActions,expressionActions,resourceAnnotations:annotations,scenePools:{idle:['idle'],sleep:['sleep'],tea:['tea'],talk_happy:['talk_happy'],talk_annoyed:['talk_annoyed'],wave:['wave'],perch:['perch'],writing:['writing'],garden_sow:['garden_sow'],garden_harvest:['garden_harvest']},agentActions:{thinking:'thinking',working:'working',waiting:'curious',error:'talk_annoyed',doneAction:'cheer',doneLoops:1,musicAction:'dance',meetingAction:'listen'},spine:{skeleton:'spine/character.json',atlas:'spine/character.atlas',texture:'spine/character.png',skin,actions:mapping}};
 await fs.writeFile(path.join(out,'manifest.json'),JSON.stringify(m,null,2));console.log(id+' realtime preset built');
}})().catch(e=>{console.error(e);process.exitCode=1;});
