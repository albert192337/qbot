// Exact arithmetic checks for the proposed rules. No simulation of production gameplay.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const c=JSON.parse(fs.readFileSync(path.join(__dirname,'config.json'),'utf8'));
assert.ok(Math.abs(c.weather.grades.reduce((s,g)=>s+g.chance,0)-1)<1e-12);
for(const g of c.weather.grades){assert.ok(Object.values(g.factorChances).every(p=>p>=0&&p<=1));assert.ok(Object.values(g.factorChances).reduce((s,p)=>s+p,0)<=1);}
for(const t of c.weather.types){const grade=c.weather.grades.find(g=>g.id===t.grade);assert.ok(grade);for(const [quality,p] of Object.entries(grade.factorChances))if(p>0)assert.ok(t.pools[quality].length>0);}
for(const p of c.plants)assert.ok(new Set(c.breeding.fallbacks[p.id]).size>=2);
assert.equal(c.weather.checkpoints.length,4);assert.ok(c.weather.checkpoints.every((p,i,a)=>p>0&&p<1&&(!i||p>a[i-1])));
for(const p of c.plants)assert.ok(p.seedCost>0&&p.seedCost<p.baseSale);
const percent=n=>(n*100).toFixed(2)+'%';
const weather=c.weather.grades.map(g=>({grade:g.id,any:1-(1-Object.values(g.factorChances).reduce((s,p)=>s+p,0))**4,goldOrRainbow:1-(1-g.factorChances.gold-g.factorChances.rainbow)**4,rainbow:1-(1-g.factorChances.rainbow)**4}));
const discovery=[1,5,10,20,100].map(n=>({n,weather:1-(1-.02)**n,furniture:1-(1-c.shop.rareSlotChance)**n}));
const breeding=[['one',c.breeding.targetSingle],['shared',c.breeding.targetShared]].map(([kind,p])=>({kind,chance:p,byThree:1-(1-p)**3,p50:Math.ceil(Math.log(.5)/Math.log(1-p)),p90:Math.ceil(Math.log(.1)/Math.log(1-p))}));
const growing=c.plants.map(p=>({id:p.id,name:p.name,netAllSold:p.baseSale-p.seedCost,netKeep35:p.baseSale*.65-p.seedCost,sellBreakEven:p.seedCost/p.baseSale,netPerPlotHour:(p.baseSale-p.seedCost)*60/p.minutes}));
assert.ok(growing.every(p=>p.netKeep35>0));
const coop=[1,2,4,8].map(n=>({n,seconds:c.cooperation.workSeconds/Math.min(n,c.cooperation.maxSpeedParticipants),share:1/n}));
assert.ok(coop.every(x=>x.seconds>=c.cooperation.minimumSeconds&&x.share>=c.cooperation.minimumShare));
const naturalRare=c.weather.grades.find(g=>g.id==='rare').chance,pityMeanSlots=(1-(1-naturalRare)**c.weather.pitySlots)/naturalRare;
const data={version:c.version,method:'exact-independent-draw-formulas-not-gameplay-simulation',weather,discovery,breeding,growing,coop,pity:{meanSlots:pityMeanSlots,longRunRareShare:1/pityMeanSlots}};
fs.writeFileSync(path.join(__dirname,'verification.json'),JSON.stringify(data,null,2));
const lines=['# v0.3 概率与经济边界核算','','这是新配置的公式核算，不是旧引擎重跑，也不是30/60天玩家模拟。概率按独立抽取计算；同一事件共享来源的房间不能当独立样本。','','## 一株作物四次均处于同等级天气','','|天气|至少一次因子候选|至少一次金或彩候选|至少一次彩候选|','|---|---:|---:|---:|'];
for(const x of weather)lines.push(`|${x.grade}|${percent(x.any)}|${percent(x.goldOrRainbow)}|${percent(x.rainbow)}|`);
lines.push('','以上是候选率；槽位冲突后最终保留率更低。自然稀有天气2%与稀有天气下单次彩候选1%是两个不同概率。',`第96段强制保底后，独立来源长期稀有天气占比约${percent(1/pityMeanSlots)}，平均间隔${pityMeanSlots.toFixed(2)}段；不是仍然精确2%。此计算假定每次稀有后计数归零。`,'', '## 浏览不同独立来源带来的发现概率','','|来源数|当前至少一个稀有天气，不含保底|当天至少一个稀有家具货架|','|---:|---:|---:|');
for(const x of discovery)lines.push(`|${x.n}|${percent(x.weather)}|${percent(x.furniture)}|`);
lines.push('','## 繁育指定目标的遗传','','|条件|单次|3次内至少1次|P50次数|P90次数|','|---|---:|---:|---:|---:|');
for(const x of breeding)lines.push(`|${x.kind==='one'?'只有一方有目标':'双方同槽同目标'}|${percent(x.chance)}|${percent(x.byThree)}|${x.p50}|${x.p90}|`);
lines.push('','该目标槽不参与后续截断；每周3次为账号限额。P90为同等条件连续尝试，不包含获得新亲本的时间。子代只能继承父母已有目标，不凭空生成更高品质。','', '## 单轮种植现金贡献','','不含赠送、心愿、天气溢价和初始赠种。35%留藏是假设，非实测玩家行为。','','|物种|全出售净币|35%留藏期望净币|最低出售比例|全出售每地块小时净币|','|---|---:|---:|---:|---:|');
for(const x of growing)lines.push(`|${x.name}|${x.netAllSold}|${x.netKeep35.toFixed(2)}|${percent(x.sellBreakEven)}|${x.netPerPlotHour.toFixed(2)}|`);
lines.push('','## 互助时间','','|从开始即参与人数|完成秒数|每人工作占比|','|---:|---:|---:|');
for(const x of coop)lines.push(`|${x.n}|${x.seconds}|${percent(x.share)}|`);
lines.push('','8人时总速度封顶4倍，每人的贡献按归一化后的有效工作记录，不能按未封顶速度记账。迟到参与者不保证达标。','', '## 仍然需要完整模拟','','- 新心愿、天气共享、逛店、繁育和旅行同时发生时的7/30/60天现金、资产与关系。','- 独自/少量好友/大量好友/公共房间四类社交网络，串房策略，天气保底的实际频率。','- 新收藏策略和离线长作物；本次正利润算式不证明长期现金一定足够。','- 父母继续出售以及双方各得种子的资产总供给；NPC供给必须单列。','- 稀有家具供给与购买能力是否匹配；按20店浏览时约81%能看到稀有货，不能宣传人人每天只有8%机会。');
fs.writeFileSync(path.join(__dirname,'概率与经济边界核算.md'),lines.join('\n'));console.log(JSON.stringify(data,null,2));
