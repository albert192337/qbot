from pathlib import Path
p=Path(__file__).with_name('build.mjs');s=p.read_text(encoding='utf-8')
s=s.replace("'基础纪念奖励',120", "'基础纪念家具（F_01_1）',120")
s=s.replace("'只靠周任务兑换R外观'", "'40碎片小件储备档（未上架）'")
s=s.replace("'首发12，M2/M3/M4各4'", "'首发范围12，M2/M3/M4各4；实际日期受产能约束'")
s=s.replace("'D90至少一SSR概率',null,'参数可调；不等于指定单件概率'", "'D90至少一SSR概率下界',null,'忽略SR保底的额外SSR机会；非指定单件概率'")
s=s.replace("'不可购买，精油提高概率与保底，不指定保留因子'", "'付费加速可推进部分目标；荣誉本身不能直接购买'")
s=s.replace("'玩法操作层','", "'玩法操作层','")
s=s.replace("'无遗传因子；肥料沿用原效果'", "'无遗传因子；免费补给肥沿用现有百分比效果'")
# Proposed fixed-time fertilizer must have a new ID instead of silently changing existing inventory.
s=s.replace("['FERT_SPEED','30分钟加速肥'", "['FERT_TIME30','30分钟加速肥'").replace("['FERT_SPEED3','3小时加速肥'", "['FERT_TIME180','3小时加速肥'")
pos=s.index('const dev=[')
s=s[:pos]+"""const genetics=[
 ['普通精油','金币价',35,'金币','现有规则','单方25%、双方30%、最多3因子；连续空继承第10次随机补1','金币可买，付费只是更多尝试；不指定因子'],
 ['浓缩精油','金币价',80,'金币','现有规则','单方40%、双方50%、最多4因子；连续空继承第5次随机补1','体型继承30%；普通20%；体型独立失败计数'],
 ['繁育资格','每周上限',90,'次','现有规则','双方均已揭晓、未繁育过、金色以上；每次1瓶油','保留金色门槛；教程直接送合格亲本和专肥'],
 ['继承规则','双亲同槽选择',.5,'概率','现有规则','先判槽位继承，再在双方该槽等概率选择；冲突自动裁决','精油提高概率与保底；不能自选保留'],
 ['天气刷新','时段',30,'分钟','代码实际','个人天气按时段确定；不因刷新客户端重抽','自然天气保留；稀有天气可由来访者带入'],
 ['稀有天气','随机SSR',.02,'概率/时段','代码实际','强制时段之外2%；SSR五类等权','稀有天气是邀请理由；不售卖访客受益资格'],
 ['稀有天气','固定保底间隔',48,'小时','代码实际','96个半小时=48小时；原注释四天与实现不符，应修正文案','个人时段偏移，SSR随机出现不推迟固定保底'],
 ['天气共享','接受后生效等待',2,'分钟','当前逻辑基础','房主与访客各自接受；保留来源剩余有效期，不复制时长','每人每节点只用一个天气；同房不叠乘概率'],
 ['天气共享','节点位置',4,'次/株','现有规则','自然时长20%/40%/60%/80%时结算；已结算节点不重抽','离房恢复个人天气；历史受益和物品归属不变'],
 ['R天气','蓝/紫/金/彩',.001,'金概率/节点','现有规则','8% / 1.9% / 0.1% / 0%；余90%无新增','先判品质再从本天气对应品质因子池均匀抽'],
 ['SR天气','蓝/紫/金/彩',.01,'金概率/节点','现有规则','12% / 5% / 1% / 0%；余82%无新增','同槽冲突/空候选池可能无新增；不等于最终成品率'],
 ['SSR天气','蓝/紫/金/彩',.08,'金概率/节点','现有规则','14% / 12% / 8% / 1%；余65%无新增','极光、流星、幻光、极昼、星图各有因子候选池'],
 ['成熟通知','记录保存',100,'条','现有规则','打开花园汇总：植物名＋天气名＋来源＋新增因子','邀请方和受益方均可看见共享带来的实际结果'],
 ['好友货架','每日稀有报价概率',.08,'概率/好友/日','当前六件家具规则','命中后4000/6000/9000金币档按60%/30%/10%','正式目录按同稀有档换物；跨好友购买仍须账本校验'],
 ['加速结算','累计减时上限',.75,'原时长比例','新提案','定时肥新ID FERT_TIME30/180；旧百分比肥库存不改语义','先结算已到节点；剩余节点持久化一次结算，不能刷新刷变异'],
 ['互助繁育','对象与归属',1,'邀请/配对','新增正式规则待开发','双亲拥有者都明确同意；一次会话锁亲本；发起者付油并获得种子','受邀方固定20金币每天最多3次，不复制稀有种子；拒绝不扣物'],
 ['互助繁育','同意有效期',10,'分钟','新提案','双方预览亲本和结果归属；确认后同时标记已繁育','不可跨会话复用亲本；超时释放；NPC仅教程不刷真人荣誉']
];table('天气与繁育',['系统','参数','值','单位','性质','具体规则','商业化/实现边界'],genetics,[22,29,18,24,24,109,108]);
"""+s[pos:]
# Tie displayed pool probabilities and pity counts to authoritative parameters.
pos=s.index('// Independent, source-level controls')
s=s[:pos]+"""for(const base of [10,13]){f('奖池规则',`F${base}`,`=1-${P('srP')}-${P('ssrP')}`);f('奖池规则',`F${base+1}`,`=${P('srP')}`);f('奖池规则',`F${base+2}`,`=${P('ssrP')}`);for(let r=base;r<base+3;r++){f('奖池规则',`G${r}`,`=${P('srN')}`);f('奖池规则',`H${r}`,`=${P('ssrN')}`);}}
sheets['总览'].getRange('B9:B14').format.horizontalAlignment='center';sheets['总览'].getRange('B18:B20').format.horizontalAlignment='center';
for(const [key] of drivers)for(let j=1;j<4;j++)sheets['参数'].getRange(`D${p[key]+j}`).format.fill='#FFF0C2';
for(const [key] of globals)sheets['参数'].getRange(`D${p[key]}`).format.fill='#FFF0C2';
"""+s[pos:]
s=s.replace("await fs.writeFile(path.join(out,'formula-check.txt'),errors.ndjson);", "await fs.writeFile(path.join(out,'formula-check.txt'),errors.ndjson);assert.ok(errors.ndjson.includes('matched 0 entries'),'Formula error check must be empty');")
s=s.replace("console.log('MODEL',JSON.stringify(profileChecks));", "assert.equal(sheets['加速与活动'].getRange('C19').values[0][0],148);assert.equal(sheets['加速与活动'].getRange('C21').values[0][0],6);console.log('MODEL',JSON.stringify(profileChecks));")
s=s.replace("['角色形态约束','现有Spine/视频/表情包播放器'", "['角色形态约束','现有播放器＋docs/appearance-preview-2026-09-29.md'")
p.write_text(s,encoding='utf-8')
