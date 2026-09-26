import { unlockedPlots } from '../../shared/garden-progression';
import { characterLevel, currentGrowth } from '../../shared/garden-life';
import {publicGardenState,publicGardenPlant} from '../../shared/garden-public';
import {randomUUID} from 'node:crypto';
import {SPECIES,needsReveal,type GardenState,type GardenCommand,type GardenResult,type Species,type Trait} from '../../shared/garden';
import {SPRAYS,COOP_RULES,dailyOffers,type GardenVisit,type CoopTask,type SprayKind} from '../../shared/garden-life';
import {geneSlots} from '../../shared/garden-v3';
import {initialGarden,transition,value,refreshShop} from './rules';
import {enableV3,advanceV3,makeV3Plant} from './v3-rules';
import {ensureLife} from './life-rules';

type Member={id:string;name:string};
/** Session-only sandbox. No disk, account, network, points or memory side effects. */
export class LocalGardenRehearsal {
  private gardens=new Map<string,GardenState>();
  private tasks=new Map<string,CoopTask>();
  private rewards=new Map<string,number>();
  private ownInitialized=false;
  private rng={id:randomUUID,random:()=>Math.random()};
  constructor(public members:Member[],private now=()=>Date.now()){}
  initializeOwn(snapshot:GardenState):void {
    if(this.ownInitialized)return;
    const s=structuredClone(snapshot);enableV3(s,this.now());ensureLife(s,this.now(),this.rng,s.activeActor);
    s.life!.owner='test:me';s.online=true;
    // A rehearsal starts from the user's local collection, never from a generated replacement.
    for(const p of s.plots)if(p?.cultivation)delete p.cultivation.startedAt;
    this.gardens.set('test:me',s);this.ownInitialized=true;
  }
  private requireMember(id:string){if(!this.members.some(m=>m.id===id))throw Error('这个测试角色已经离开试演');}
  private ensure(id:string):GardenState {
    this.requireMember(id);
    let s=this.gardens.get(id);
    if(!s){
      const now=this.now();s=initialGarden(now,this.rng);enableV3(s,now);ensureLife(s,now,this.rng);
      s.life!.owner=id;s.coins=5000;s.online=true;
      for(const kind of Object.keys(SPRAYS) as SprayKind[])s.life!.sprays[kind]=5;
      s.seeds=(Object.keys(SPECIES) as Species[]).flatMap(species=>Array.from({length:4},()=>({id:randomUUID(),species,genes:[],bred:false})));
      for(const f of Object.keys(s.fertilizers) as (keyof typeof s.fertilizers)[])s.fertilizers[f]=5;
      // Ready parents, one unrevealed crop and empty plots allow the whole loop immediately.
      for(const [i,species] of (['strawberry','pineapple','strawberry'] as Species[]).entries()){
        const traits:Trait[]=i===2?['starcore','rainbow','halo']:['honey','golden'];
        const p=makeV3Plant(s,{id:randomUUID(),species,genes:traits,bred:false},i,now,this.rng);
        p.plantedAt=now-60000;p.readyAt=now;p.kg=SPECIES[species].kg*1.2;p.revealed=i!==2;
        p.batch!.settled=true;p.batch!.seedlingEnd=now;p.batch!.naturalReadyAt=now;p.slots=geneSlots(traits);p.value=value(p);s.plots[i]=p;
        if(i<2){const {batch,plantedAt,readyAt,fertilizers,...fruit}=p;s.produce.push({...fruit,id:randomUUID()});}
      }
      this.gardens.set(id,s);
    }
    advanceV3(s,this.now());refreshShop(s,this.now(),this.rng);return s;
  }
  private advance(){
    const now=this.now();
    for(const t of this.tasks.values()){
      if(t.done)continue;
      let from=t.updatedAt;
      const boundaries=[...new Set([...Object.values(t.members).map(m=>m.seenAt+COOP_RULES.leaseMs).filter(at=>at>from&&at<now),now])].sort((a,b)=>a-b);
      for(const end of boundaries){const active=Object.values(t.members).filter(m=>m.seenAt+COOP_RULES.leaseMs>from);if(active.length){const seconds=Math.min((end-from)/1000,t.remaining/(COOP_RULES.speed*active.length));for(const m of active){m.work+=COOP_RULES.speed*seconds;m.seconds+=seconds;}t.remaining=Math.max(0,t.remaining-seconds*COOP_RULES.speed*active.length);}from=end;if(!t.remaining)break;}
      t.updatedAt=now;
      const p=this.gardens.get(t.owner)?.plots[t.plot];
      if(p?.id===t.plant){p.cultivation={remainingMs:t.remaining/COOP_RULES.speed*1000};if(!t.remaining){p.revealed=true;delete p.cultivation;t.done=true;t.fruit=structuredClone(p);}}
    }
  }
  get(actor?:string):GardenState {
    this.advance();const s=this.ensure('test:me');ensureLife(s,this.now(),this.rng,actor);
    for(const t of this.tasks.values())if(t.owner==='test:me'&&!t.done&&t.members['test:me']?.seenAt+COOP_RULES.leaseMs>this.now()){for(const m of Object.values(t.members))if(m.seenAt+COOP_RULES.leaseMs>this.now())m.seenAt=this.now();}
    return publicGardenState({...s,rehearsal:{members:this.members},cooperations:[...this.tasks.values()].filter(t=>!!t.members['test:me'])});
  }
  act(command:GardenCommand,actor?:string):GardenResult {
    try{
      this.advance();const s=this.ensure('test:me');ensureLife(s,this.now(),this.rng,actor);
      if(command.type==='cultivate'||command.type==='pauseCultivation'){
        this.cooperate('test:me',command.plot,command.type==='cultivate'?'join':'leave');return {ok:true,state:this.get(actor)};
      }
      if(command.type==='buyDaily')this.requireMember(command.owner);
      // Prevent a simulation from invoking unrelated account features.
      if(command.type.startsWith('travel')||['exchange','box'].includes(command.type))throw Error('此操作请退出试演后进行');
      const result=transition(s,command,this.now(),this.rng,{actor,shopOwner:command.type==='buyDaily'?command.owner:undefined});
      if(result.points||result.boxes)throw Error('试演不使用真实积分或宝箱');
      this.gardens.set('test:me',result.state);return {ok:true,state:this.get(actor),reveal:result.reveal};
    }catch(e){return {ok:false,error:e instanceof Error?e.message:String(e)};}
  }
  visit(owner:string):GardenVisit {
    this.advance();const s=this.ensure(owner);ensureLife(s,this.now(),this.rng);
    return structuredClone({plotCount:unlockedPlots(s),owner,name:this.members.find(m=>m.id===owner)!.name+' · 模拟',plots:s.plots.map(p=>p?publicGardenPlant(p):null),offers:dailyOffers(owner,s.life!.day),day:s.life!.day,visibility:'public',actorLevel:characterLevel(currentGrowth(s)?.xp??0),landOpen:true,shopOpen:true,rewardsLeft:Math.max(0,5-(this.rewards.get(String(s.life!.day))??0)),tasks:[...this.tasks.values()].filter(t=>t.owner===owner)});
  }
  cooperate(owner:string,plot:number,action:'join'|'leave'|'claim'|'share'|'invite',target?:string,task?:string):GardenVisit {
    this.advance();const s=this.ensure(owner),p=s.plots[plot];
    if(!Number.isInteger(plot)||plot<0||plot>6)throw Error('无效土地');
    let t=task?this.tasks.get(task):p?this.tasks.get(p.id):undefined;
    if(t&&(t.owner!==owner||t.plot!==plot))throw Error('无效培育任务');
    if(!t){if(!p||p.readyAt>this.now()||!needsReveal(p))throw Error('请选择成熟的问号作物');t={id:p.id,plant:p.id,owner,plot,remaining:COOP_RULES.work,updatedAt:this.now(),members:{},done:false,claimed:[]};this.tasks.set(t.id,t);}
    if(action==='join'){
      if(t.done)return this.visit(owner);
      if([...this.tasks.values()].some(x=>x!==t&&!x.done&&(x.members['test:me']?.seenAt??0)+COOP_RULES.leaseMs>this.now()))throw Error('请先暂停另一株作物的培育');
      t.members['test:me']??={work:0,seconds:0,seenAt:0};t.members['test:me'].seenAt=this.now();
      // Invited test characters participate only while the user is present.
      for(const id of t.invited??[]){if(!this.members.some(m=>m.id===id))continue;t.members[id]??={work:0,seconds:0,seenAt:0};t.members[id].seenAt=this.now();}
      if(p)p.cultivation={remainingMs:t.remaining/COOP_RULES.speed*1000};
    }else if(action==='leave'){for(const m of Object.values(t.members))m.seenAt=0;}
    else if(action==='claim'){
      const me=t.members['test:me'];if(!t.done||!me||me.seconds<COOP_RULES.minSeconds||me.work<COOP_RULES.work*COOP_RULES.minContribution)throw Error('培育完成并参与至少20秒、贡献2%后可领取');
      if(!t.claimed.includes('test:me')){const mine=this.ensure('test:me'),key=String(mine.life!.day),count=this.rewards.get(key)??0;if(count>=5)throw Error('今日助育奖励已领满');mine.seeds.push({id:randomUUID(),species:'strawberry',genes:[],bred:false});t.claimed.push('test:me');this.rewards.set(key,count+1);}
    }else {
      if(owner!=='test:me'||t.done)throw Error('只能邀请培育自己尚未完成的作物');
      const ids=action==='invite'?[target!]:this.members.filter(m=>m.id!=='test:me').map(m=>m.id);for(const id of ids)this.requireMember(id);
      t.invited=[...new Set([...(t.invited??[]),...ids])];
    }
    return this.visit(owner);
  }
}
let rehearsal:LocalGardenRehearsal|undefined;
export const getRehearsal=()=>rehearsal;
export function setRehearsalMembers(members:Member[]){if(rehearsal)rehearsal.members=members;else rehearsal=new LocalGardenRehearsal(members);}
export function clearRehearsal(){rehearsal=undefined;}
