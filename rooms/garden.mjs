import {randomUUID} from 'node:crypto';
import {existsSync,readFileSync,writeFileSync,renameSync,mkdirSync,copyFileSync} from 'node:fs';
import path from 'node:path';
import core from './generated/garden-core.cjs';
import {breedingRequests,friendBreed} from './garden-breeding.mjs';
const rng={random:Math.random,id:randomUUID};
const requireThat=(ok,msg)=>{if(!ok)throw Error(msg);};
const actorKey=s=>typeof s==='string'&&/^[\w.\-]{1,160}$/.test(s)&&!['__proto__','constructor','prototype'].includes(s)?s:undefined;
const TOTAL_WORK=core.COOP_RULES.work;

export class Gardens {
  constructor(file,contacts,now=()=>Date.now(),random=rng){
    this.file=file;this.contacts=contacts;this.now=now;this.rng=random;this.data={people:{},tasks:{},rewards:{}};
    if(existsSync(file)){
      let loaded=false;
      for(const p of [file,file+'.bak'])try{const data=JSON.parse(readFileSync(p,'utf8'));for(const row of Object.values(data.people))core.validateGarden(row.state);requireThat(data.tasks&&data.rewards,'invalid');this.data=data;loaded=true;break;}catch{}
      requireThat(loaded,'Garden save and backup invalid; refusing to replace user assets');
    }
    for(const t of Object.values(this.data.tasks))for(const m of Object.values(t.members))m.seenAt=0;
  }
  transaction(fn){const before=structuredClone(this.data);try{const result=fn();mkdirSync(path.dirname(this.file),{recursive:true});if(existsSync(this.file))copyFileSync(this.file,this.file+'.bak');writeFileSync(this.file+'.tmp',JSON.stringify(this.data));renameSync(this.file+'.tmp',this.file);return result;}catch(e){this.data=before;throw e;}}
  ensure(id,actor){
    requireThat(this.contacts.people[id],'请先登录');
    let row=this.data.people[id];
    if(!row){const state=core.initialGarden(this.now(),this.rng);core.ensureLife(state,this.now(),this.rng);state.life.owner=id;row=this.data.people[id]={state,receipts:{}};}
    requireThat(!actor||actorKey(actor),'角色标识无效');
    requireThat(!actor||row.state.life.characters[actor]||Object.keys(row.state.life.characters).length<100,'最多培养 100 个角色');
    core.enableV3(row.state,this.now());core.ensureLife(row.state,this.now(),this.rng,actorKey(actor)??row.state.activeActor);
    core.applyWeatherMutations(row.state,this.now());core.refreshShop(row.state,this.now(),this.rng);
    row.state.v3.sunActive=row.state.v3.sunPartners.filter(peer=>this.contacts.areFriends(id,peer)&&this.data.people[peer]?.state.plots.some(p=>p?.species==='sunflower')).length;row.state.online=true;return row;
  }
  permitted(viewer,owner,scope='land'){
    const s=this.data.people[owner]?.state;if(!s)return false;
    const visibility=scope==='shop'?(s.life.shopVisibility??s.life.visibility):s.life.visibility;
    return viewer===owner||visibility==='public'||visibility==='friends'&&this.contacts.areFriends(viewer,owner);
  }
  allow(viewer,owner,scope='land'){requireThat(this.permitted(viewer,owner,scope),'主人尚未向你开放'+(scope==='shop'?'商店':'土地'));}
  taskAllowed(viewer,t){return !!t&&(viewer===t.owner||t.shared||t.invited?.includes(viewer)||t.members[viewer]);}
  publicState(state){const s=core.publicGardenState(state);s.friendBreeding=breedingRequests(this,s.life.owner);s.cooperationRewardsLeft=Math.max(0,5-(this.data.rewards[`${s.life.owner}:${core.gardenDay(this.now())}`]??0));for(const p of s.plots)if(p?.batch)p.batch.seed=0;for(const a of Object.values(s.v3?.appraisals??{}))a.board=[];return s;}
  publicPlant(p){return p?core.publicGardenPlant(p):null;}
  box(row,id,f){
    requireThat(f.owner===id,'开箱账号已切换，请切回原账号');
    requireThat(typeof f.operation==='string'&&/^\d{13}-[\da-f-]{36}$/.test(f.operation),'缺少开箱交易编号');
    row.boxReceipts??={};
    let receipt=row.boxReceipts[f.operation];
    if(f.action==='box:prepare'){
      if(!receipt){
        const at=Number(f.operation.slice(0,13));requireThat(at<=this.now()+60000&&at>this.now()-7*86400000,'开箱交易已过期');
        requireThat(!Object.values(row.boxReceipts).some(r=>r.status==='prepared'),'请先完成上一次开箱');
        receipt=row.boxReceipts[f.operation]={token:randomUUID(),status:'prepared'};
      }
      requireThat(receipt.status!=='cancelled','这次开箱已取消');
      return {ok:true,token:receipt.token,points:500,boxes:1};
    }
    requireThat(receipt&&receipt.token===f.token,'开箱凭据无效');
    if(f.action==='box:cancel'){
      requireThat(receipt.status!=='committed','开箱已经完成');receipt.status='cancelled';return {ok:true};
    }
    requireThat(f.action==='box:commit'&&f.payment===f.operation,'缺少本机扣费回执');
    requireThat(receipt.status!=='cancelled','这次开箱已取消');
    if(receipt.status!=='committed'){
      // Wallet authority is the installed client's durable progress journal. Only this
      // authenticated ticket may deliver its reward; raw act/box stays forbidden.
      const result=core.transition(row.state,{type:'box'},this.now(),this.rng);
      requireThat(result.points===-500&&result.boxes===-1,'开箱费用版本不一致');
      row.state=result.state;receipt.status='committed';receipt.reveal=result.reveal;
    }
    // Keep completed receipts: an offline client can retry long after seven days.
    return {ok:true,state:this.publicState(row.state),reveal:receipt.reveal};
  }
  view(viewer,owner,task){
    requireThat(this.data.people[owner],'这位朋友还没有开通联机花园');const s=this.ensure(owner).state,landOpen=this.permitted(viewer,owner),shopOpen=this.permitted(viewer,owner,'shop');
    const tasks=Object.values(this.data.tasks).filter(t=>t.owner===owner&&(!task||t.id===task)&&(landOpen||this.taskAllowed(viewer,t))).slice(-20);
    requireThat(landOpen||shopOpen||tasks.length,'主人尚未向你开放土地或商店');
    return {companion:this.contacts.people[owner].companion===true,friend:viewer!==owner&&this.contacts.areFriends(viewer,owner),plotCount:core.unlockedPlots(s),owner,name:this.contacts.people[owner].nickname,actorName:this.contacts.people[owner].character,landOpen,shopOpen,plots:s.plots.map(p=>p&&(landOpen||tasks.some(t=>t.plant===p.id))?this.publicPlant(p):null),offers:shopOpen?core.dailyOffers(owner,s.life.day):[],day:s.life.day,visibility:s.life.visibility,actorLevel:core.characterLevel(s.life.characters[s.activeActor]?.xp??0),rewardsLeft:Math.max(0,5-(this.data.rewards[`${viewer}:${core.gardenDay(this.now())}`]??0)),tasks:structuredClone(tasks)};
  }
  sun(id,c){
    requireThat(typeof c.target==='string'&&Object.hasOwn(this.contacts.people,c.target),'玩家不存在');const a=this.ensure(id).state,b=this.ensure(c.target).state;
    requireThat(id!==c.target&&this.contacts.areFriends(id,c.target),'请选择已确认的游戏好友');
    const av=a.v3,bv=b.v3;
    if(c.type==='sunRequest'){requireThat(av.sunPartners.length<2&&bv.sunPartners.length<2,'每人最多两位向日葵伙伴');requireThat(!av.sunPartners.includes(c.target),'已经是向日葵伙伴');bv.sunRequests??=[];requireThat(bv.sunRequests.length<20,'朋友暂时有太多邀请');if(!bv.sunRequests.includes(id))bv.sunRequests.push(id);}
    else if(c.type==='sunAnswer'){requireThat(av.sunRequests?.includes(c.target),'邀请已失效');if(c.accept){requireThat(av.sunPartners.length<2&&bv.sunPartners.length<2,'每人最多两位向日葵伙伴');av.sunPartners.push(c.target);bv.sunPartners.push(id);core.recordGarden(a,this.now(),'sun','结成向日葵伙伴',c.target);core.recordGarden(b,this.now(),'sun','结成向日葵伙伴',id);}av.sunRequests=av.sunRequests.filter(x=>x!==c.target);}
    else {av.sunPartners=av.sunPartners.filter(x=>x!==c.target);bv.sunPartners=bv.sunPartners.filter(x=>x!==id);}
    return {state:a};
  }
  advance(t){
    const now=this.now();
    if(!t.workBudget){if(!t.done){const scale=TOTAL_WORK/216000;t.remaining*=scale;for(const m of Object.values(t.members))m.work*=scale;}t.workBudget=TOTAL_WORK;}
    if(t.done){t.updatedAt=now;return;}
    let from=t.updatedAt;
    const boundaries=[...new Set([...Object.values(t.members).map(m=>m.seenAt+15000).filter(at=>at>from&&at<now),now])].sort((a,b)=>a-b);
    for(const end of boundaries){const active=Object.values(t.members).filter(m=>m.seenAt+15000>from);if(active.length){const seconds=Math.min((end-from)/1000,t.remaining/(360*active.length));for(const m of active){m.work+=360*seconds;m.seconds+=seconds;}t.remaining=Math.max(0,t.remaining-seconds*360*active.length);}from=end;if(!t.remaining)break;}
    t.updatedAt=now;const growing=this.data.people[t.owner]?.state.plots[t.plot];if(growing?.id===t.plant&&!t.done)growing.cultivation={remainingMs:t.remaining/360*1000};
    if(t.remaining<=0){t.done=true;const p=this.data.people[t.owner]?.state.plots[t.plot];if(p?.id===t.plant){p.revealed=true;delete p.cultivation;t.fruit=this.publicPlant(p);}for(const who of Object.keys(t.members)){const state=this.data.people[who]?.state;if(state)core.recordGarden(state,now,Object.keys(t.members).length===1?'soloComplete':'coopComplete','一起培育的果实揭晓了',who===t.owner?undefined:t.owner,t.plant);}}
  }
  coop(id,owner,plot,command,task){
    requireThat(Number.isInteger(plot)&&plot>=0&&plot<7,'土地不存在');
    const saved=command==='claim'&&task?this.data.tasks[task]:undefined;
    if(saved)requireThat(saved.owner===owner&&saved.plot===plot&&saved.members[id],'培育记录不属于你');else if(!this.taskAllowed(id,this.data.tasks[this.data.people[owner]?.state.plots[plot]?.id]))this.allow(id,owner);
    const s=this.ensure(owner).state,p=s.plots[plot];if(!saved)requireThat(p&&p.readyAt<=this.now(),'果实尚未成熟');
    let t=saved??this.data.tasks[p.id];
    if(!t){requireThat(core.needsReveal(p),'这株果实不需要培育');t=this.data.tasks[p.id]={id:p.id,plant:p.id,owner,plot,remaining:TOTAL_WORK,workBudget:TOTAL_WORK,updatedAt:this.now(),members:{},done:false,claimed:[],room:s.v3.realm};}
    this.advance(t);
    if(command==='join'){
      if(t.done)return this.view(id,owner);
      const active=Object.entries(t.members).filter(([,m])=>m.seenAt+15000>this.now());requireThat(active.length<8||active.some(([who])=>who===id),'已经有 8 位伙伴在培育');
      requireThat(!Object.values(this.data.tasks).some(other=>other.id!==t.id&&!other.done&&(other.members[id]?.seenAt??0)+15000>this.now()),'正在培育另一株果实');
      if(!t.members[id]){const helper=this.ensure(id).state;if(helper.v3.records.some(r=>r.kind==='coopJoin'&&r.peer===owner))core.recordGarden(helper,this.now(),'repeatCoop','再次和这位伙伴一起培育',owner,t.plant);if(t.invited?.includes(id))core.recordGarden(helper,this.now(),'inviteJoin','接受了朋友的培育邀请',owner,t.plant);else if(t.shared&&id!==owner)core.recordGarden(helper,this.now(),'worldJoin','从公开任务来一起培育',owner,t.plant);core.recordGarden(helper,this.now(),'coopJoin','参加了一次共同培育',owner,t.plant);if(id!==owner)core.recordGarden(s,this.now(),'helper','朋友来帮忙培育了',id,t.plant);}t.members[id]??={work:0,seconds:0,seenAt:0};t.members[id].seenAt=this.now();p.cultivation={remainingMs:t.remaining/360*1000};
    }else if(command==='leave'){if(t.members[id])t.members[id].seenAt=0;}
    else if(command==='claim'){
      const m=t.members[id];requireThat(t.done&&m?.seconds>=core.COOP_RULES.minSeconds&&m.work>=TOTAL_WORK*.02,'需要培育完成，且参与至少20秒并贡献2%工作量');
      if(!t.claimed.includes(id)){
        const row=this.ensure(id),day=core.gardenDay(this.now()),key=`${id}:${day}`;requireThat((this.data.rewards[key]??0)<5,'今日 5 次物资奖励已领满');
        const n=Math.min(8,Object.values(t.members).filter(m=>m.seconds>=core.COOP_RULES.minSeconds&&m.work>=TOTAL_WORK*.02).length);
        requireThat(t.fruit,'培育成果暂不可用，请稍后再试');
        const seed=core.cultivationSeed(t.fruit,n,this.rng);row.state.seeds.push(seed);
        this.data.rewards[key]=(this.data.rewards[key]??0)+1;t.claimed.push(id);core.recordGarden(row.state,this.now(),'coopReward','领到了共同培育礼物',owner,t.plant);
      }
    }else if(command==='share'||command==='invite'){requireThat(id===owner&&!t.done,'只能邀请培育自己尚未完成的果实');if(command==='share')t.shared=true;core.recordGarden(s,this.now(),command==='share'?'share':'invite','邀请伙伴一起培育',undefined,t.plant);}
    else throw Error('无效培育操作');
    if(saved)return {owner,name:this.contacts.people[owner].nickname,plots:[],offers:[],day:s.life.day,visibility:s.life.visibility,actorLevel:1,tasks:[t]};
    return this.view(id,owner);
  }
  handle(id,f){
    return this.transaction(()=>{
      const row=this.ensure(id,f.actor),now=this.now();if(typeof f.realm==='string')row.state.v3.realm=f.realm;
      for(const t of Object.values(this.data.tasks)){this.advance(t);if(f.action==='get'&&t.owner===id&&t.members[id]&&!t.done&&t.members[id].seenAt+15000>now)t.members[id].seenAt=now;}
      if(['box:prepare','box:commit','box:cancel'].includes(f.action))return this.box(row,id,f);
      if(f.action==='get')return {ok:true,boxProtocol:1,state:{...this.publicState(row.state),cooperations:Object.values(this.data.tasks).filter(t=>t.members[id]&&!t.claimed.includes(id)).map(t=>structuredClone(t))}};
      if(f.action==='preview')return {ok:true,visit:this.view(id,f.owner)};
      if(f.action==='visit'){const visit=this.view(id,f.owner,f.task);if(id!==f.owner&&!row.state.v3.records.some(r=>r.kind==='visit'&&r.peer===f.owner&&now-r.at<3600000)){core.recordGarden(row.state,now,'visit','去朋友的花园逛了逛',f.owner);core.recordGarden(this.data.people[f.owner].state,now,'visitor','朋友来花园做客',id);}return {ok:true,visit};}
      if(f.action==='coop'){const visit=this.coop(id,f.owner,f.plot,f.command,f.task);if(f.command==='invite'){const t=this.data.tasks[row.state.plots[f.plot]?.id];requireThat(t&&this.contacts.areFriends(id,f.target),'请选择好友');t.invited??=[];if(!t.invited.includes(f.target))t.invited.push(f.target);}return {ok:true,visit};}
      requireThat(f.action==='act'&&f.command&&typeof f.command.type==='string','无效花园操作');
      requireThat(typeof f.operation==='string'&&/^\d{13}-[\da-f-]{36}$/.test(f.operation),'缺少交易编号');
      const at=Number(f.operation.slice(0,13));requireThat(at<=now+60000&&at>now-7*86400000,'交易已过期');
      const key=JSON.stringify([f.actor??null,f.command]);
      const previous=row.receipts[f.operation];if(previous){requireThat(previous.key===key,'交易编号不能重复用于其他操作');return {...previous.result,state:this.publicState(row.state)};}
      requireThat(!['box','mature','revealPlant','travelMomentLike','travelRehearsalLike'].includes(f.command.type),'联机花园不支持该本地或测试操作');
      if(f.command.type==='buyDaily')this.allow(id,f.command.owner,'shop');
      const active=Object.values(this.data.tasks).find(t=>t.owner===id&&!t.done&&row.state.plots[t.plot]?.id===t.plant);
      if(active&&['spray','breed','harvest','harvestMany','resolveFactors'].includes(f.command.type)){
        const c=f.command;requireThat(c.target!==active.plant&&c.first!==active.plant&&c.second!==active.plant&&c.plot!==active.plot&&c.type!=='harvestMany','这株果实正在共同培育');
      }
      let result;
      if(['cultivate','pauseCultivation'].includes(f.command.type)){this.coop(id,id,f.command.plot,f.command.type==='cultivate'?'join':'leave');result={state:row.state};}
      else if(['sunRequest','sunAnswer','sunRemove'].includes(f.command.type))result=this.sun(id,f.command);
      else if(['companionGardenRefresh','friendBreedRequest','friendBreedAnswer','friendBreedCancel'].includes(f.command.type))result=friendBreed(this,id,f.command);
      else result=core.transition(row.state,f.command,now,this.rng,{actor:actorKey(f.actor),shopOwner:f.command.type==='buyDaily'?f.command.owner:undefined});
      row.state=result.state;row.state.online=true;if(result.points>0){row.state.coins+=result.points;if(result.reveal)result.reveal.message=`领取 ${result.points} 花园币，各物种同时获得图鉴经验。`;}
      const response={ok:true,...(result.reveal?{reveal:result.reveal}:{})};
      row.receipts[f.operation]={at,key,result:response};for(const [op,r] of Object.entries(row.receipts))if(r.at<=now-7*86400000)delete row.receipts[op];
      return {...response,state:this.publicState(row.state)};
    });
  }
  disconnect(id){this.transaction(()=>{for(const t of Object.values(this.data.tasks)){this.advance(t);if(t.members[id])t.members[id].seenAt=0;}});}
}
