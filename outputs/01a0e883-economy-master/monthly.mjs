import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {FileBlob,SpreadsheetFile} from '@oai/artifact-tool';
const dir=new URL('.',import.meta.url).pathname.replace(/^\/([A-Za-z]):/,'$1:');
const w=await SpreadsheetFile.importXlsx(await FileBlob.load(dir+'QBot_主数值与内容投放规划_v1.0.xlsx'));
const sh=w.worksheets.add('月卡方案');
sh.showGridLines=false;
sh.getRange('A1:L121').format.font={name:'Microsoft YaHei',size:10,color:'#26343E'};
sh.getRange('A1:A121').format.columnWidth=31;sh.getRange('B1:B121').format.columnWidth=18;sh.getRange('C1:C121').format.columnWidth=22;sh.getRange('D1:D121').format.columnWidth=23;
sh.getRange('E1:L121').format.columnWidth=18;
sh.getRange('A2').values=[['陪伴月卡 · 数值提案']];sh.getRange('A2').format.font={name:'Microsoft YaHei',size:16,bold:true,color:'#23394C'};
sh.getRange('A3').values=[['2026-09-30 · 新增月卡；原90天收支保留免费基线，以下计算月卡增量。未实装或开启收费。']];
const rows=[
 ['价格（元）',30,'可调输入','首版仅一个档位，避免福利重叠'],
 ['有效天数',30,'固定产品周期','自然日，购买当天算第1日；跨日规则服务端统一'],
 ['每期即领赠晶',60,'可调输入','赠送子账；可抽奖、直购、加速，不能支付生成'],
 ['每天赠晶',12,'可调输入','每天自动入账，离线也到账；登录汇总展示'],
 ['每7个有效日旅行券',1,'可调输入','每券1小时；每期4次，第7/14/21/28日到账'],
 ['连续购买期数',3,'0—3整数','0=免费，1=30天，2=60天，3=90天；仅模型选择'],
 ['每期赠晶合计',null,'星晶','即领＋每日×30；不等同人民币现金价值'],
 ['每期额外完整抽数',null,'抽','假设所有月卡星晶都用于抽奖；直购或加速会减少抽数'],
 ['每期旅行减时额度',null,'小时','赠券可积攒；单次旅行仍受75%减时上限约束'],
 ['每期折算星晶单价',null,'元/星晶','分摊价仅用于对比；不用于生成成本定价'],
 ['D30累计抽数',null,'抽','原免费基线＋月卡；保留未满一抽余额'],
 ['D60累计抽数',null,'抽','不是每月充值预算，不与充值收入混算'],
 ['D90累计抽数',null,'抽','全部投入同一常驻池；跨池不能合并保底'],
 ['D90可积累碎片',null,'碎片','不提前兑换；不含抽中重复外观的额外碎片'],
 ['指定SSR首次可兑日',null,'天','到160碎片；没有达到则显示90天内未达到'],
 ['90天月卡支出',null,'元','购买期数×价格；无自动续费默认授权'],
 ['D90至少一个SSR下界',null,'概率','不足60抽用基础率保守下界；达到60抽必得'],
 ['定位','稳定的小额付费','体验原则','每天有积累，约三个月推进一个大奖；不承诺每月送外观'],
 ['权益边界','保留免费来源','规则','不送指定基因、不提升掉率、不叠天气概率、不直接送碎片'],
 ['续购与退款','叠加时长，不叠日产','待开发','重复购买顺延；下一期开始才发该期即领；退款按订单权益流水处理'],
 ['投放与联动','商店商品PASS_30','待开发','新手首次完成旅行后露出；常驻商店入口；可用赠晶消费处均支持'],
 ['材料影响','抽奖材料未估值','测算边界','当前只算抽数/碎片和旅行券；额外种子肥料会进一步填平养成缺口']
];
sh.getRange('A6:D6').values=[['项目','数值 / 规则','单位 / 性质','说明']];sh.getRange('A7:D28').values=rows;
sh.getRange('A6:D6').format={fill:'#30485B',font:{name:'Microsoft YaHei',bold:true,color:'#FFFFFF'},rowHeight:32};
sh.getRange('A7:D28').format.rowHeight=51;sh.getRange('A7:D28').format.wrapText=true;
sh.getRange('D1:D28').format.columnWidth=91;
for(let r=7;r<=28;r++)if(r%2===0)sh.getRange(`A${r}:D${r}`).format.fill='#F1F4F6';
sh.getRange('B7:B12').format.fill='#FFF0C2';sh.getRange('B12').dataValidation={rule:{type:'whole',operator:'between',formula1:0,formula2:3}};
const f=(a,s)=>sh.getRange(a).formulas=[[s]];
const params=w.worksheets.getItem('参数');
const pv=params.getRange('A7:D90').values;
const ref=key=>{const i=pv.findIndex(r=>r[0]===key);assert.ok(i>=0,key);return `'参数'!$D$${i+7}`;};
f('B13','=B9+B10*B8');f('B14',`=INT(B13/${ref('cosmeticCost')})`);f('B15','=INT(B8/7)*B11');f('B16','=B7/B13');
f('B17','=H61');f('B18','=H91');f('B19','=H121');f('B20','=I121');f('B21','=IF(COUNTIFS(J32:J121,1)=0,"90天内未达到",MATCH(1,J32:J121,0))');f('B22','=B7*B12');f('B23',`=IF(B19>=${ref('ssrN')},1,1-(1-${ref('ssrP')})^B19)`);
sh.getRange('B16').setNumberFormat('0.000');sh.getRange('B23').setNumberFormat('0.0%');
sh.getRange('A31:L31').values=[['天数','月卡有效','本期即领赠晶','每日赠晶','当日旅行券','累计月卡赠晶','额外完整抽数','累计总抽数','可攒碎片','160碎片达成','累计月卡支出','累计旅行券']];
sh.getRange('A31:L31').format={fill:'#30485B',font:{name:'Microsoft YaHei',bold:true,color:'#FFFFFF'},wrapText:true,rowHeight:36};
for(let i=0;i<90;i++){const r=i+32,m=i+7;sh.getRange(`A${r}`).values=[[i+1]];const fs=[`=IF(A${r}<=$B$8*$B$12,1,0)`,`=IF(AND(B${r}=1,MOD(A${r}-1,$B$8)=0),$B$9,0)`,`=B${r}*$B$10`,`=IF(AND(B${r}=1,MOD(MOD(A${r}-1,$B$8)+1,7)=0),$B$11,0)`,`=SUM($C$32:D${r})`,`=INT(F${r}/${ref('cosmeticCost')})`,`='90天收支'!S${m}+G${r}`,`=SUM('90天收支'!$T$7:T${m})+G${r}*2`,`=IF(I${r}>=160,1,0)`,`=MIN($B$12,INT((A${r}-1)/$B$8)+1)*$B$7`,`=SUM($E$32:E${r})`];sh.getRange(`B${r}:L${r}`).formulas=[fs];if(i%2)sh.getRange(`A${r}:L${r}`).format.fill='#F1F4F6';}
sh.freezePanes.freezeRows(6);
const baseline={};for(const n of ['总览','90天收支','概率与目标'])baseline[n]=w.worksheets.getItem(n).getRange(n==='90天收支'?'A7:W96':'A7:D26').values;
const tests=[];for(const n of [0,1,2,3]){sh.getRange('B12').values=[[n]];w.recalculate();const a=sh.getRange('B19:B22').values.flat();assert.equal(a[0],39+n*7);assert.equal(a[1],148+n*14);assert.equal(a[3],n*30);tests.push({months:n,draws:a[0],dust:a[1],firstExchange:a[2],spend:a[3]});}
sh.getRange('B12').values=[[3]];w.recalculate();
for(const n of Object.keys(baseline))assert.deepEqual(w.worksheets.getItem(n).getRange(n==='90天收支'?'A7:W96':'A7:D26').values,baseline[n]);
const errors=await w.inspect({kind:'match',searchTerm:'#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!',options:{useRegex:true,maxResults:10},maxChars:2000});assert.ok(errors.ndjson.includes('matched 0 entries'),errors.ndjson);
for(const [name,range] of [['monthly-plan','A1:D28'],['monthly-boundary','A57:F64']]){const img=await w.render({sheetName:'月卡方案',range,scale:1,format:'png'});await fs.writeFile(dir+name+'.png',new Uint8Array(await img.arrayBuffer()));}
await (await SpreadsheetFile.exportXlsx(w)).save(dir+'QBot_主数值与内容投放规划_v1.1_月卡.xlsx');
await fs.writeFile(dir+'monthly-verification.json',JSON.stringify({tests,errors:errors.ndjson,baselineUnchanged:true,nativeExcelVerified:false},null,2));console.log(JSON.stringify(tests));
