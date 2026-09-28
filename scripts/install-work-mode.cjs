// Install only the approved pair into the existing character, retaining all
// current identity, generation and other action fields. Run after normal exit.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const dir=path.join(process.env.APPDATA,'@qbot/app/characters/53ed5068-dd60-4e2a-82c7-fb94250369d1');
const file=path.join(dir,'manifest.json');
const manifest=JSON.parse(fs.readFileSync(file,'utf8'));
if(manifest.name!=='张起灵')throw Error('Unexpected target character; refusing to install.');
const stamp=new Date().toISOString().replace(/[:.]/g,'-');
const backup=path.join(dir,'.job','work-mode-backup-'+stamp);fs.mkdirSync(backup,{recursive:true});
fs.copyFileSync(file,path.join(backup,'manifest.json'));
manifest.customActions={...manifest.customActions};manifest.resourceAnnotations={...manifest.resourceAnnotations};
const installed=[];
for(const [id,name] of [['computer_idle','电脑前待机'],['computer_typing','敲键盘']]){
 for(const ext of ['webm','gif']){
  const source=path.join(root,'output/work-mode',id+'.'+ext),target=path.join(dir,'actions',id+'.'+ext);
  if(fs.statSync(source).size<1000)throw Error('Incomplete source: '+source);
  if(fs.existsSync(target))fs.copyFileSync(target,path.join(backup,id+'.'+ext));
  const temp=target+'.work-mode-tmp';fs.copyFileSync(source,temp);fs.renameSync(temp,target);
  installed.push({file:id+'.'+ext,sha256:crypto.createHash('sha256').update(fs.readFileSync(target)).digest('hex')});
 }
 manifest.customActions[id]={...manifest.customActions[id],webm:'actions/'+id+'.webm',gif:'actions/'+id+'.gif',durationSec:5,status:'done',facing:'left'};
 manifest.resourceAnnotations[id]={...manifest.resourceAnnotations[id],name,meaning:name,tags:['一起工作']};
}
fs.writeFileSync(file+'.work-mode-tmp',JSON.stringify(manifest,null,2));fs.renameSync(file+'.work-mode-tmp',file);
fs.writeFileSync(path.join(root,'output/work-mode/installed.json'),JSON.stringify({character:dir,backup,installed},null,2));
console.log('Installed work-mode pair into existing Zhang Qiling. Backup: '+backup);
