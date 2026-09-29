const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),out=path.resolve(process.env.QBOT_HYBRID_OUTPUT||'D:/QBot-Spine-Hybrid');
for(const id of ['spine-wuxie','spine-zhangqiling']){
 const src=path.join(root,'app/resources/presets',id),dest=path.join(out,'characters',id);
 fs.mkdirSync(path.join(dest,'actions'),{recursive:true});fs.cpSync(path.join(src,'spine'),path.join(dest,'spine'),{recursive:true});fs.copyFileSync(path.join(src,'source.png'),path.join(dest,'source.png'));
 const m=JSON.parse(fs.readFileSync(path.join(src,'manifest.json'),'utf8'));m.spine.faceStyle='capsule';
 if(fs.existsSync(path.join(out,'stool.png'))){fs.copyFileSync(path.join(out,'stool.png'),path.join(dest,'spine/stool.png'));m.spine.seat={texture:'spine/stool.png',x:-82,y:-12,width:164,height:120};}
 const clip=path.join(out,id,'highlight.webm');
 if(fs.existsSync(clip)){fs.copyFileSync(clip,path.join(dest,'actions/highlight.webm'));m.customActions.highlight={webm:'actions/highlight.webm',gif:'',durationSec:5,status:'done',facing:'left'};}
 fs.writeFileSync(path.join(dest,'manifest.json'),JSON.stringify(m,null,2));
}
console.log('Prepared isolated hybrid characters');
