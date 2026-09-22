import {WEATHER_FACTORS,LEGACY_WEATHER_FACTORS,WEATHER_CATALOG,WEATHER_QUALITY_NAMES,weatherCountdown,type GardenWeatherStatus} from '../../shared/garden-weather';
import {TRAITS,TIER_NAMES,SLOT_NAMES,traitSlot} from '../../shared/garden';
import {weatherIcon,weatherName} from '../weather-ui';
import './weather-card.css';
export function renderWeatherCard(host:HTMLElement,s:GardenWeatherStatus):void{
 const kind=s.preview??s.current?.kind??null,shown=kind??s.next.kind;
 host.innerHTML=`<article class="weather-card ${kind??'clear'}"><div class="weather-sky"><span class="weather-label">花园气象台 · ${s.test?'测试天气 · 真实生效':kind?'特殊天气进行中':'今日天气'}</span><div class="weather-emblem">${weatherIcon(kind)}</div><h1>${weatherName(kind)}</h1><strong class="weather-quality ${kind?WEATHER_CATALOG[kind].quality:'normal'}">${kind?WEATHER_QUALITY_NAMES[WEATHER_CATALOG[kind].quality]:'普通天气'}</strong><p class="weather-current-time"></p></div><div class="weather-info"><h2>${kind?'本场变异因子':'下一场 · '+weatherName(shown)}</h2><p class="weather-intro">每株每场各因子独立判定 · 升级提高概率。</p><div class="weather-factors"></div><div class="weather-next"><span>下一场 · ${weatherName(s.next.kind)}</span><strong class="weather-next-time"></strong><small>${new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:false}).format(s.next.start)} · 北京时间</small></div><p class="weather-rules">每天 8:00—22:00，每两小时一场，持续 45 分钟。<br>生长中和成熟留田都可变异；背包不参与。<br>自然天气无保底，离线最多补算 7 天。<br>每级因子概率提高 6%（相对加成）；开始培育后锁定结果。${s.test?'<br><b>手动测试沿用旧规则：成熟留田、基础概率、最多补足两株，会真实保存。</b>':''}</p></div></article>`;
 const factors=host.querySelector('.weather-factors')!;
 for(const f of (s.test?LEGACY_WEATHER_FACTORS[shown as 'meteor'|'aurora']:WEATHER_FACTORS[shown])){
  const row=document.createElement('div');row.className='weather-factor '+TRAITS[f.trait].tier;
  const name=document.createElement('strong');name.textContent=TRAITS[f.trait].name;
  const desc=document.createElement('small');desc.textContent=`植物 Lv.${TRAITS[f.trait].level} · 基础概率 · ${SLOT_NAMES[traitSlot(f.trait)]} · ${TIER_NAMES[TRAITS[f.trait].tier]}`;
  const chance=document.createElement('b');chance.textContent=`${+(f.chance*100).toFixed(2)}%`;
  row.append(name,desc,chance);factors.append(row);
 }
 const catalog=document.createElement('section');catalog.className='weather-catalog';
 for(const [id,c] of Object.entries(WEATHER_CATALOG)){
  const row=document.createElement('div');row.className='weather-catalog-row '+c.quality;
  row.textContent=c.icon+' '+c.name+' · '+WEATHER_QUALITY_NAMES[c.quality]+' · 权重 '+c.weight+'% · '+WEATHER_FACTORS[id as keyof typeof WEATHER_FACTORS].map(f=>TRAITS[f.trait].name).join(' / ');catalog.append(row);
 }
 host.querySelector('.weather-info')!.append(catalog);
 updateWeatherCountdown(host,s,s.now);
}
export function updateWeatherCountdown(host:HTMLElement,s:GardenWeatherStatus,now:number):void{
 const current=host.querySelector('.weather-current-time');if(current)current.textContent=s.current?`还将持续 ${weatherCountdown(s.current.end-now)}`:'阳光正好，等一场天空的礼物。';
 const next=host.querySelector('.weather-next-time');if(next)next.textContent=`还有 ${weatherCountdown(s.next.start-now)}`;
}
