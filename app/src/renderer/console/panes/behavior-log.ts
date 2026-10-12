import { BEHAVIOR_POLICY, behaviorDay, type BehaviorAudit } from '../../../shared/behavior-catalog';
const outcomes:Record<BehaviorAudit['outcome'],string>={proposed:'等待同意',approved:'已同意',rejected:'已拒绝',expired:'未回复过期',cancelled:'已取消',reserved:'已预占生成次数',started:'已开始',completed:'已完成',sent:'已发送',failed:'失败',skipped:'已跳过'};
export function mountBehaviorLog(host:HTMLElement):void {
  const title=document.createElement('h3');title.textContent='角色一天的行为';
  const hint=document.createElement('p');hint.textContent='记录最近 30 天的主动行为、授权结果与执行情况。已发送邀请不代表对方接受；已发送动作不代表播放完成。';
  const date=document.createElement('input');date.type='date';date.value=behaviorDay(Date.now());date.setAttribute('aria-label','行为日期');
  const actor=document.createElement('select');actor.setAttribute('aria-label','角色');
  const refresh=document.createElement('button');refresh.className='btn';refresh.textContent='刷新行为日志';
  const download=document.createElement('button');download.className='btn ghost';download.textContent='导出当天日志';
  const photos=document.createElement('button');photos.className='btn ghost';photos.textContent='打开合影相册';
  const status=document.createElement('p'),list=document.createElement('div');list.style.cssText='max-height:400px;overflow:auto;user-select:text';
  let entries:BehaviorAudit[]=[];
  let names=new Map<string,string>();
  const filtered=()=>entries.filter(e=>behaviorDay(e.at)===date.value&&(!actor.value||e.actor===actor.value));
  const render=()=>{
    const rows=filtered();list.replaceChildren();
    const autonomous=rows.filter(r=>r.source==='auto');
    status.textContent=`共 ${rows.length} 条记录；自主 ${autonomous.length} 条，其中申请 ${autonomous.filter(r=>r.outcome==='proposed').length} 次、完成 ${autonomous.filter(r=>r.outcome==='completed').length} 次。`;
    for(const row of rows.slice().reverse()){
      const p=document.createElement('p');
      const policy=BEHAVIOR_POLICY[row.behavior as keyof typeof BEHAVIOR_POLICY];
      p.textContent=`${new Date(row.at).toLocaleTimeString()} · ${names.get(row.actor)??row.actor} · ${{auto:'自主',rule:'规则',user:'用户',debug:'调试'}[row.source]} · ${policy?.label??({play:'播放动作',say:'说话',sign:'留言',photo:'保存合影'} as Record<string,string>)[row.behavior]??row.behavior} · ${outcomes[row.outcome]}：${row.reason}`;
      list.append(p);
    }
  };
  const load=async()=>{refresh.disabled=true;try{
    const [events,characters]=await Promise.all([window.qbot.autonomy.log(),window.qbot.characters.list()]);
    entries=events;names=new Map(characters.map(c=>[c.dirId,c.manifest.name]));const previous=actor.value;actor.replaceChildren(new Option('全部角色',''));
    for(const id of new Set(entries.map(e=>e.actor)))actor.add(new Option(names.get(id)??id,id));actor.value=previous;render();
  }catch{status.textContent='行为日志读取失败，请重试。';}finally{refresh.disabled=false;}};
  refresh.onclick=()=>void load();date.onchange=render;actor.onchange=render;
  download.onclick=()=>{
    const blob=new Blob([JSON.stringify(filtered(),null,2)],{type:'application/json'}),url=URL.createObjectURL(blob);
    const a=document.createElement('a');a.href=url;a.download=`qbot-behaviors-${date.value}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  };
  photos.onclick=()=>void window.qbot.autonomy.openPhotos().catch(()=>{status.textContent='合影相册暂时无法打开，请稍后重试。';});
  host.append(title,hint,date,actor,refresh,download,photos,status,list);void load();
}
