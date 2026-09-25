import {createHash, randomBytes, randomUUID} from 'node:crypto';
import {existsSync, readFileSync, readdirSync, writeFileSync, renameSync} from 'node:fs';
import path from 'node:path';
import core from './generated/garden-core.cjs';

export const RESIDENTS = [
  {key:'moss', name:'苔苔', room:0, species:['strawberry','lotus'], xp:60, welcome:'来啦，给你留了个晒太阳的位置。'},
  {key:'orange', name:'橘子汽水', room:0, species:['tomato','pineapple'], xp:300, welcome:'欢迎呀，今天想逛花园还是坐着聊会儿？'},
  {key:'page', name:'翻到第七页', room:1, species:['sunflower','carrot'], xp:20, welcome:'嗨，一起安静待会儿吧，累了也可以休息。'},
  {key:'cloud', name:'云朵慢半拍', room:1, species:['tulip','strawberry'], xp:120, welcome:'刚泡好茶，你来得正好。'},
  {key:'moon', name:'月亮打烊前', room:2, species:['blueberry','lotus'], xp:440, welcome:'欢迎来坐坐，今天过得怎么样？'},
  {key:'rice', name:'小饭团', room:2, species:['apple','tomato'], xp:0, welcome:'嗨！我刚开始种东西，慢慢来就好。'},
];
const THEMES = [
  {roomId:'CMPGARDN',name:'苔苔的花园茶会',kind:'idle',description:'晒太阳、看看花，陪伴角色在这里等你。',lines:[['我给草莓留了块向阳的位置。','那我坐旁边，负责给它加油。'],['种东西最难的是忍住一直去看。','没关系，想看就再看一眼。'],['今天也给自己留一点发呆的时间吧。','同意，茶已经准备好了。']]},
  {roomId:'CMPSTUDY',name:'翻页声自习室',kind:'study',description:'各忙各的，偶尔喝口茶 · 陪伴角色小屋',lines:[['这一页总算看完了。','辛苦啦，伸个懒腰再继续。'],['先做完手边这一小件事。','嗯，不用一次做完所有事。'],['窗边的花长得很慢。','我们也可以慢一点。']]},
  {roomId:'CMPNIGHT',name:'晚风慢慢聊',kind:'night',description:'闲聊、发呆，给疲惫的一天留个座位 · 陪伴角色小屋',lines:[['要是能把好心情装进饭团就好了。','那今晚的馅料就叫轻松一点。'],['今天想给自己放个小假。','批准，先坐下来喝杯茶。'],['有时候没什么特别的事也挺好。','平平常常的一天也值得好好收尾。']]},
];
const hash = value => createHash('sha256').update(value).digest('hex');

/** Validate the same asset-only container consumed by the desktop client. */
export function readMarketPack(buffer, expected) {
  if(buffer.length<4||buffer.length>64*1024*1024||hash(buffer).slice(0,16)!==expected)throw Error('invalid market pack hash');
  const length=buffer.readUInt32BE(0);
  if(length>1024*1024||length+4>buffer.length)throw Error('invalid pack header');
  const header=JSON.parse(buffer.subarray(4,4+length));let offset=4+length, manifest;
  const seen=new Set();
  for(const file of header.files??[]){
    if(!/^(manifest\.json|source\.png|actions\/[^/\\]+\.webm)$/.test(file.path)||seen.has(file.path)||!Number.isSafeInteger(file.size)||file.size<0||offset+file.size>buffer.length)throw Error('invalid pack entry');
    seen.add(file.path);
    if(file.path==='manifest.json')manifest=JSON.parse(buffer.subarray(offset,offset+file.size));
    offset+=file.size;
  }
  const actions=Object.entries({...manifest?.actions,...manifest?.importedActions,...manifest?.expressionActions,...manifest?.customActions})
    .filter(([,a])=>a?.webm&&seen.has(a.webm)&&(!a.status||a.status==='done')).map(([id,a])=>({id,label:a.sourceName??id}));
  if(offset!==buffer.length||!manifest||!actions.length)throw Error('missing playable assets');
  return {name:String(manifest.name||'市场角色').slice(0,32),actions};
}

export class Companions {
  constructor({file,marketDir,contacts,gardens,installPack,now=Date.now,random=Math.random}) {
    Object.assign(this,{file,marketDir,contacts,gardens,installPack,now,random});
    this.saved=existsSync(file)?JSON.parse(readFileSync(file,'utf8')):{bindings:{},invited:{}};
    this.peers=[];this.rooms=[];this.queue=[];this.visits=new Map();this.roomNext=new Map();this.turns=new Map();this.replyAfter=new Map();this.roomRevision=new Map();this.responses=new Map();this.worldNext=now()+2500;
    this.saved.gardenNext??={};
  }
  save(){writeFileSync(this.file+'.tmp',JSON.stringify(this.saved),{mode:0o600});renameSync(this.file+'.tmp',this.file);}
  start(){
    const catalog=[];
    if(!existsSync(this.marketDir))return;
    const wanted=new Set(Object.values(this.saved.bindings).map(b=>b.hash));
    for(const entry of readdirSync(this.marketDir).sort()){
      if(!/^[0-9a-f]{16}$/.test(entry))continue;
      if(catalog.length>=RESIDENTS.length&&!wanted.has(entry))continue;
      try{const buffer=readFileSync(path.join(this.marketDir,entry,'pack.bin'));catalog.push({hash:entry,buffer,...readMarketPack(buffer,entry)});}catch{/* Unavailable market items are never advertised. */}
    }
    for(const [index,profile] of RESIDENTS.entries()){
      const old=this.saved.bindings[profile.key];
      const asset=old?catalog.find(a=>a.hash===old.hash):catalog[index%catalog.length];
      if(!asset)continue;
      const id=old?.id??hash('qbot-companion-v1:'+profile.key).slice(0,12).toUpperCase();
      // Never take over an existing human identity, even in the unlikely event of collision.
      if(this.contacts.people[id]&&!this.contacts.people[id].companion)throw Error('companion identity collision');
      this.contacts.transaction(()=>{this.contacts.people[id]??={secret:hash(randomBytes(32)),nickname:profile.name,character:asset.name,friends:[],incoming:[],seen:{},companion:true};});
      this.saved.bindings[profile.key]={id,hash:asset.hash};
      this.installPack(asset.hash,asset.buffer);
      const actor='companion-'+profile.key;
      this.gardens.transaction(()=>{
        const existed=!!this.gardens.data.people[id];const s=this.gardens.ensure(id,actor).state;
        if(existed)return;
        s.life.visibility='public';s.life.shopVisibility='public';s.life.characters[actor].xp=profile.xp;
        s.coins=300+index*137;
        const rng={id:randomUUID,random:this.random};
        for(let plot=0;plot<2+index%4;plot++){
          const species=profile.species[plot%2],fraction=[.08,.42,.73,1.1][(plot+index)%4];
          const seed={id:randomUUID(),species,genes:plot===0&&index%2?['honey']:[],bred:false};
          const p=core.makeV3Plant(s,seed,plot,this.now(),rng),duration=p.readyAt-p.plantedAt;
          p.plantedAt-=duration*fraction;p.readyAt-=duration*fraction;p.batch.seedlingEnd-=duration*fraction;p.batch.naturalReadyAt-=duration*fraction;
          s.plots[plot]=p;
        }
        core.advanceV3(s,this.now());
      });
      const peer={memberId:id,nickname:profile.name,companion:true,profile,actor,packHash:asset.hash,mode:profile.room===1?'working':'idle',action:asset.actions.find(a=>a.id==='idle')?.id??asset.actions[0].id,actions:asset.actions,roomId:THEMES[profile.room].roomId,readyState:1,OPEN:1,hello:true};
      // Virtual peers receive only animation frames; no sockets or hidden external messages.
      peer.send=raw=>{const frame=JSON.parse(raw);if(frame.t==='garden:interaction')this.animate?.(peer,frame);};
      this.peers.push(peer);
      this.saved.gardenNext[id]??=this.now()+(index+1)*180000;
    }
    for(const theme of THEMES){const peers=this.peers.filter(p=>p.roomId===theme.roomId);if(!peers.length)continue;
      this.rooms.push({...theme,companion:true,capacity:8,listed:true,chatEnabled:true,language:'zh',ownerId:peers[0].memberId,ownerToken:randomBytes(16).toString('hex'),members:peers.map(p=>({memberId:p.memberId,nickname:p.nickname,companion:true,joinedAt:this.now(),lastSeenAt:this.now()})),banned:[],reports:[],chat:[],createdAt:this.now(),lastActiveAt:this.now()});
      this.roomNext.set(theme.roomId,this.now()+22000+this.random()*18000);
    }
    this.save();
  }
  schedule(delay,run){this.queue.push({at:this.now()+delay,run});}
  joined(user){
    const peer=this.peers.find(p=>p.roomId===user.roomId);if(!peer)return;
    const visit={roomId:user.roomId,at:this.now(),user,lastSpoke:0,quiet:false};this.visits.set(user,visit);
    this.schedule(4000+this.random()*6000,()=>{if(this.visits.get(user)===visit&&!visit.lastSpoke&&user.roomId===visit.roomId&&user.readyState===user.OPEN)this.say(peer,peer.profile.welcome);});
  }
  left(user){this.visits.delete(user);this.responses.delete(user);}
  tend(peer){
    const id=peer.memberId,now=this.now(),rng={id:randomUUID,random:this.random};
    this.gardens.transaction(()=>{
      const row=this.gardens.ensure(id,peer.actor);let s=row.state;
      const act=command=>{s=core.transition(s,command,now,rng,{actor:peer.actor}).state;};
      // Leave the first plot as a keepsake. Work on one other plot per visit to the garden.
      const ready=s.plots.findIndex((p,i)=>i>0&&p&&p.readyAt<=now&&!p.keep&&!core.needsReveal(p));
      if(ready>=0)act({type:'harvest',plot:ready});
      const fruit=s.produce.find(p=>!p.locked);if(fruit)act({type:'sell',id:fruit.id});
      const empty=s.plots.findIndex((p,i)=>i>0&&i<2+RESIDENTS.indexOf(peer.profile)%4&&!p);
      if(empty>=0){
        let seed=s.seeds.find(p=>peer.profile.species.includes(p.species))??s.seeds[0];
        if(!seed){const offer=s.shop.offers.find(o=>o.kind==='seed'&&o.stock>0&&o.price<=s.coins&&peer.profile.species.includes(o.item));if(offer){act({type:'buy',offer:offer.id});seed=s.seeds.at(-1);}}
        if(seed)act({type:'plant',plot:empty,seed:seed.id});
      }
      row.state=s;
    });
  }
  heard(user,text){
    const roomId=user.roomId,visit=this.visits.get(user),peers=this.peers.filter(p=>p.roomId===roomId);if(!peers.length)return;
    if(!visit)return;
    visit.lastSpoke=this.now();visit.quiet=/想安静|不想聊|别说话|不要打扰|安静一会|先忙|再见|拜拜/.test(text);
    this.roomRevision.set(roomId,(this.roomRevision.get(roomId)??0)+1);
    this.roomNext.set(roomId,this.now()+60000);
    // One pending response per visitor: short follow-up messages replace the unsent reply.
    const entry=this.responses.get(user);
    if(entry){entry.text=text;entry.at=this.now()+3500+this.random()*2000;return;}
    this.responses.set(user,{visit,text,peer:peers[(visit.replies??0)%peers.length],at:Math.max(this.now()+3500+this.random()*3000,(this.replyAfter.get(roomId)??0))});
  }
  tick({humans,worldActive,say,invite,answer,pending}){
    this.say=say;const now=this.now();
    for(const [user,response] of this.responses){
      if(now<response.at)continue;this.responses.delete(user);
      const {visit,peer,text}=response;if(this.visits.get(user)!==visit||user.roomId!==visit.roomId||user.readyState!==user.OPEN)continue;
      const room=this.rooms.find(r=>r.roomId===visit.roomId),turn=visit.replies??0;visit.replies=turn+1;
      const choose=items=>items[turn%items.length];
      const reply=visit.quiet?'好，那就安静陪你待会儿。想聊的时候再叫我。':/累|难过|烦|压力/.test(text)?choose(['辛苦啦。想说说哪件事最累，还是先在这里歇一会儿？','听起来今天不太轻松。不用勉强找话题，坐会儿也好。','那先给自己一点喘气的时间吧，我在。']):/谢谢|好多了|开心/.test(text)?choose(['不用客气呀，你能轻松一点就好。','那就把这点好心情留住，陪你坐会儿。']):/刚刚|聊什么/.test(text)?`${room?.kind==='study'?'刚刚在聊看书累了怎么休息':room?.kind==='night'?'刚刚在聊给自己放个小假':'刚刚在聊种花，还有怎么理直气壮地发呆'}。你想加入哪个话题？`:/你好|嗨|大家好/.test(text)?choose(['嗨，欢迎你！想聊就聊，也可以安静坐会儿。','来啦，刚好一起坐。今天想做点什么？']):/花|种|草莓|果/.test(text)?`我这边种了${peer.profile.species.map(s=>core.SPECIES[s].name).join('和')}，可以点我的花园看看。你喜欢种什么？`:/茶|喝水/.test(text)?'那就一起喝口水，休息一下。':/你是谁|真人|机器人|假人/.test(text)?'我是这里的陪伴角色，用准备好的小话题陪大家聊聊，也能一起做双人互动。':choose(['这句我还没太听明白，可以换个说法吗？','我比较会聊种花、喝茶和休息的小事。也想听听你今天怎么样。']);
      say(peer,reply);this.replyAfter.set(visit.roomId,now+7000);
    }
    for(const peer of this.peers)if(now>=this.saved.gardenNext[peer.memberId]){
      this.saved.gardenNext[peer.memberId]=now+720000+this.random()*660000;this.save();this.tend(peer);
    }
    const due=this.queue.filter(q=>q.at<=now);this.queue=this.queue.filter(q=>q.at>now);for(const q of due)q.run();
    for(const [user,visit] of this.visits){
      if(user.readyState!==user.OPEN||user.roomId!==visit.roomId){this.visits.delete(user);continue;}
      if(now-visit.at<45000||(this.saved.invited[user.memberId]??0)>now-1800000)continue;
      if(visit.quiet||now-visit.lastSpoke<15000||user.mode&&user.mode!=='idle')continue;
      const peer=this.peers.find(p=>p.roomId===user.roomId);if(!peer)continue;
      // Persist before delivery: restart or ignored invites cannot cause repeated nudges.
      this.saved.invited[user.memberId]=now;for(const [id,at] of Object.entries(this.saved.invited))if(at<now-86400000)delete this.saved.invited[id];this.save();
      try{invite(peer,user,['tea','wave','heart'][Math.floor(this.random()*3)]);}catch{/* Busy actors can try again next cooldown. */}
    }
    for(const [id,item] of pending){const peer=this.peers.find(p=>p.memberId===item.to);if(!peer||item.companionQueued)continue;item.companionQueued=true;
      this.schedule(4000+this.random()*4000,()=>{if(pending.has(id)&&item.expiresAt>this.now()&&peer.roomId===item.roomId)try{answer(peer,id);}catch{pending.delete(id);}});
    }
    for(const room of this.rooms){
      if(!humans.some(p=>p.roomId===room.roomId)||[...this.visits.values()].some(v=>v.roomId===room.roomId&&v.quiet)||now<(this.roomNext.get(room.roomId)??0))continue;
      const peers=this.peers.filter(p=>p.roomId===room.roomId),turn=this.turns.get(room.roomId)??0;
      const lines=room.lines[turn%room.lines.length];say(peers[0],lines[0]);
      const revision=this.roomRevision.get(room.roomId);
      if(peers[1])this.schedule(5000+this.random()*5000,()=>{if(this.hasHumans?.(room.roomId)&&this.roomRevision.get(room.roomId)===revision)say(peers[1],lines[1]);});
      this.turns.set(room.roomId,turn+1);this.roomNext.set(room.roomId,now+(room.kind==='study'?180000:65000)+this.random()*60000);
    }
    if(worldActive&&this.peers.length&&now>=this.worldNext){const turn=this.turns.get('world')??0,peer=this.peers[turn%this.peers.length];say(peer,`${['有人想来坐一会儿吗？','给路过的你留一个休息的位置。','今天也慢慢来吧。'][turn%3]} 我在「${THEMES[peer.profile.room].name}」。`,true);this.turns.set('world',turn+1);this.worldNext=now+240000+this.random()*120000;}
  }
}
