/** World travel is paid with garden coins; completed experiences are immutable memories. */
export const DESTINATIONS = [
 {id:'kyoto',name:'京都',region:'亚洲',subtitle:'把日子泡进一杯抹茶里',color:'#d9b5ba',projects:[
  {name:'茶屋',icon:'tea',steps:['尝一杯抹茶','学做和菓子','参加茶会']},
  {name:'古街',icon:'street',steps:['逛古街小店','挑选浴衣','夜游花灯街']},
  {name:'庭院',icon:'garden',steps:['看庭院樱花','樱花下野餐','留一张庭院合影']},
  {name:'温泉',icon:'spring',steps:['泡一会足汤','体验露天温泉','温泉旅馆留宿']},
  {name:'手作',icon:'craft',steps:['听风铃','制作风铃','带回纪念风铃']}],costs:[80,140,220]},
 {id:'paris',name:'巴黎',region:'欧洲',subtitle:'沿着河岸，慢慢走',color:'#bbcad9',projects:[
  {name:'面包房',icon:'tea',steps:['尝黄油可颂','烤一条法棍','准备野餐篮']},
  {name:'塞纳河',icon:'spring',steps:['沿河散步','乘一段游船','看落日河岸']},
  {name:'美术馆',icon:'craft',steps:['欣赏画作','画一张速写','挑选艺术明信片']},
  {name:'铁塔',icon:'street',steps:['铁塔下合影','登高看城市','等铁塔亮灯']},
  {name:'花园',icon:'garden',steps:['逛花园','喷泉边野餐','留一束干花']}],costs:[220,360,540]},
 {id:'island',name:'海岛',region:'大洋洲',subtitle:'今天的计划，是听海',color:'#9ad5ca',projects:[
  {name:'沙滩',icon:'garden',steps:['捡贝壳','堆一座沙堡','沙滩看日落']},
  {name:'海湾',icon:'spring',steps:['在浅水踏浪','浮潜看鱼群','拍一张海底照片']},
  {name:'小食摊',icon:'tea',steps:['喝一杯椰汁','品尝当地小食','准备海边晚餐']},
  {name:'灯塔',icon:'street',steps:['走近灯塔','登塔看海','看灯塔亮起']},
  {name:'纪念铺',icon:'craft',steps:['挑贝壳','串贝壳手链','寄一张海岛明信片']}],costs:[400,650,950]},
] as const;
export interface TravelPost { id:string; at:number; city:number; project:number; step:number; title:string; text:string; liked:boolean; actor?:string; name?:string; portrait?:string }
export interface TravelDiary { day:string; actor:string; name:string; text:string; signature:string; updatedAt:number; generated?:boolean }
export interface TravelState { current:number; startedAt:number; progress:number[][]; posts:TravelPost[]; diaries:TravelDiary[] }
/** Keep every paid experience in storage, but present one album per destination. */
export function travelAlbums(t:TravelState):{city:number;posts:TravelPost[];photos:TravelPost[];likeId:string}[] {
 return DESTINATIONS.map((_,city)=>{
  const posts=t.posts.filter(p=>p.city===city).sort((a,b)=>a.at-b.at);
  const photos=[...new Map(posts.map(p=>[p.project,p])).values()];
  return {city,posts,photos,likeId:posts[0]?.id??''};
 }).filter(a=>a.posts.length).sort((a,b)=>b.posts.at(-1)!.at-a.posts.at(-1)!.at);
}
export type TravelCommand = {type:'travelExperience';city:number;project:number;step:number}|{type:'travelNext';city:number}|{type:'travelLike';id:string};
export function initialTravel(now:number):TravelState {return {current:0,startedAt:now,progress:DESTINATIONS.map(d=>d.projects.map(()=>0)),posts:[],diaries:[]};}
export function travelComplete(t:TravelState,city=t.current):boolean {return t.progress[city].every(n=>n===3);}
export function localDay(at:number):string {const d=new Date(at);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
export function validateTravel(t:TravelState):void {
 if(!t||!Number.isInteger(t.current)||t.current<0||t.current>=DESTINATIONS.length||!Number.isFinite(t.startedAt)||!Array.isArray(t.progress)||t.progress.length!==DESTINATIONS.length||!t.progress.every(p=>Array.isArray(p)&&p.length===5&&p.every(n=>Number.isInteger(n)&&n>=0&&n<=3))||!Array.isArray(t.posts)||!Array.isArray(t.diaries))throw Error('旅行存档已损坏');
 if(t.progress.some((p,i)=>i<t.current&&!p.every(n=>n===3)||i>t.current&&p.some(n=>n!==0)))throw Error('旅行进度不一致');
 for(const p of t.posts)if(!p||typeof p.id!=='string'||!Number.isFinite(p.at)||!Number.isInteger(p.city)||!DESTINATIONS[p.city]||!Number.isInteger(p.project)||!DESTINATIONS[p.city].projects[p.project]||!Number.isInteger(p.step)||p.step<0||p.step>2||typeof p.title!=='string'||typeof p.text!=='string'||typeof p.liked!=='boolean'||(p.portrait!==undefined&&typeof p.portrait!=='string'))throw Error('旅行回忆已损坏');
 if(new Set(t.posts.map(p=>p.id)).size!==t.posts.length)throw Error('旅行回忆重复');
 for(const d of t.diaries)if(!d||typeof d.day!=='string'||typeof d.actor!=='string'||typeof d.name!=='string'||typeof d.text!=='string'||typeof d.signature!=='string'||!Number.isFinite(d.updatedAt))throw Error('旅行日记已损坏');
}
export function travelTransition(s:{coins:number;travel?:TravelState},cmd:TravelCommand,now:number):void {
 const t=s.travel??=initialTravel(now);validateTravel(t);
 if(cmd.type==='travelLike'){const p=t.posts.find(p=>p.id===cmd.id);if(!p)throw Error('这条回忆不存在');p.liked=!p.liked;return;}
 if(cmd.city!==t.current)throw Error('请在当前目的地继续旅行');
 if(cmd.type==='travelNext'){if(!travelComplete(t))throw Error('完成本站体验后再出发');if(t.current===DESTINATIONS.length-1)throw Error('新的目的地正在准备中');t.current++;return;}
 const d=DESTINATIONS[t.current],project=d.projects[cmd.project];
 if(!Number.isInteger(cmd.project)||!project||!Number.isInteger(cmd.step)||cmd.step<0||cmd.step>=3||t.progress[t.current][cmd.project]!==cmd.step)throw Error('体验已更新，请刷新后再试');
 const cost=d.costs[cmd.step];if(s.coins<cost)throw Error('旅费还差一点，去收获一些植物吧');
 s.coins-=cost;t.progress[t.current][cmd.project]++;
 const title=project.steps[cmd.step];t.posts.push({id:`${d.id}-${cmd.project}-${cmd.step}`,at:now,city:t.current,project:cmd.project,step:cmd.step,title,text:`今天在${d.name}，${title}。又多了一段和你一起的回忆。`,liked:false});
}
