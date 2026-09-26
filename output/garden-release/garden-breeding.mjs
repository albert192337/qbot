import core from './generated/garden-core.cjs';

const requireThat=(ok,message)=>{if(!ok)throw Error(message);};
const summary=p=>({id:p.id,species:p.species,traits:[...p.traits],kg:p.kg,value:p.value,bred:p.bred,growthVersion:p.growthVersion,slots:p.slots,locked:p.locked,revealed:p.revealed});
const fingerprint=p=>JSON.stringify(summary(p));
export function breedingRequests(db,id){
  return Object.values(db.data.breeding??{}).filter(r=>r.expiresAt>db.now()&&(r.from===id||r.to===id)).map(r=>({
    ...structuredClone(r),fromName:db.contacts.people[r.from]?.nickname??'朋友',toName:db.contacts.people[r.to]?.nickname??'朋友',
  }));
}
function parents(db,from,to,plant,parent){
  requireThat(from!==to&&db.contacts.areFriends(from,to),'请选择已确认的游戏好友');
  db.allow(from,to);
  const sender=db.ensure(from).state,owner=db.ensure(to).state;
  const a=owner.plots.find(p=>p?.id===plant),b=sender.produce.find(p=>p.id===parent);
  requireThat(a&&b&&a.id!==b.id&&a.readyAt<=db.now()&&core.canBreed(a)&&core.canBreed(b)&&!a.cultivation&&!b.traits.includes('mini'),'双方需要已揭晓、还有繁育次数的金色以上作物；申请人需提供背包中的非迷你果实');
  requireThat(!db.data.tasks[a.id]||db.data.tasks[a.id].done,'这株果实正在共同培育');
  core.refreshV3Day(sender,db.now());core.refreshV3Day(owner,db.now());
  requireThat(sender.v3.breeds<core.V3.weeklyBreeds&&owner.v3.breeds<core.V3.weeklyBreeds,'有一方本周繁育次数已满');
  return {sender,owner,a,b};
}
/** Called inside Gardens.transaction and the existing durable command receipt. */
export function friendBreed(db,id,c){
  const requests=db.data.breeding??={};
  for(const [key,r] of Object.entries(requests))if(r.expiresAt<=db.now())delete requests[key];
  if(c.type==='friendBreedRequest'){
    requireThat(['normal','rich'].includes(c.oil),'请选择繁育精油');
    const {sender,a,b}=parents(db,id,c.owner,c.plant,c.parent);
    requireThat(sender.v3.oils[c.oil]>0,'申请人需要一瓶繁育精油');
    requireThat(!Object.values(requests).some(r=>r.from===id&&r.to===c.owner&&r.plant.id===a.id&&r.parent.id===b.id),'这次繁育申请已发出');
    requireThat(Object.values(requests).filter(r=>r.from===id||r.to===id).length<20&&Object.values(requests).filter(r=>r.to===c.owner).length<20,'待处理的繁育申请过多，请先处理已有申请');
    const request={id:db.rng.id(),from:id,to:c.owner,plant:summary(a),parent:summary(b),oil:c.oil,expiresAt:db.now()+86400000};
    requests[request.id]=request;
    return {state:sender,reveal:{title:'繁育申请已送达',message:'好友同意后，双方各获得一包相同的子代种子。申请有效期为24小时，暂不消耗作物次数或精油。'}};
  }
  const r=Object.hasOwn(requests,c.request)?requests[c.request]:undefined;
  requireThat(r,'申请已处理或已过期');
  if(c.type==='friendBreedCancel'){
    requireThat(r.from===id,'只能撤回自己的申请');delete requests[r.id];return {state:db.ensure(id).state};
  }
  requireThat(r.to===id&&typeof c.accept==='boolean','只能回应发给自己的申请');
  if(!c.accept){delete requests[r.id];return {state:db.ensure(id).state};}
  const {sender,owner,a,b}=parents(db,r.from,r.to,r.plant.id,r.parent.id);
  requireThat(fingerprint(a)===fingerprint(r.plant)&&fingerprint(b)===fingerprint(r.parent),'亲本已发生变化，请拒绝这次申请并重新申请');
  const genes=p=>core.cappedTraits(p.traits.filter(t=>core.traitSlot(t)!=='size'));
  const seed=core.breedV3(sender,a,b,{type:'breed',first:a.id,second:b.id,oil:r.oil,firstGenes:genes(a),secondGenes:genes(b)},db.now(),db.rng);
  sender.seeds.push(seed);const shared={...structuredClone(seed),id:db.rng.id()};owner.seeds.push(shared);owner.v3.breeds++;
  for(const [who,state,peer] of [[r.from,sender,r.to],[r.to,owner,r.from]])core.recordGarden(state,db.now(),'friendBreed','和好友繁育成功，子代种子已放入双方背包',peer,who===r.to?a.id:b.id);
  // A crop has only one chance. Other requests using either parent are now invalid.
  for(const [key,other] of Object.entries(requests))if(other.plant.id===a.id||other.parent.id===b.id)delete requests[key];
  return {state:owner,reveal:{title:'共同繁育成功',seed:shared,message:'双方各获得一包子代种子，两株亲本保留，各消耗一次繁育资格。'}};
}
