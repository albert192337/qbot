import './travel.css';
import { experienceArt } from './travel-experience-art';
import { DESTINATIONS,initialTravel,travelComplete,travelAlbums,travelTransition,localDay,type TravelPost,type TravelState } from '../../shared/travel';
import type { GardenState,GardenCommand } from '../../shared/garden';
const world=new URL('./assets/travel/world.png',import.meta.url).href;
const art=[new URL('./assets/travel/kyoto.png',import.meta.url).href,new URL('./assets/travel/paris.png',import.meta.url).href,new URL('./assets/travel/island.png',import.meta.url).href];
const points=[[25,27],[77,30],[26,53],[76,56],[50,79]];
const mapPoints=[[82,28],[23,28],[60,72]];
let selected:number|undefined,local=false,project=0;
// Renderer-only rehearsal. Never send these purchases or memories to the real save.
let replay:{coins:number;travel:TravelState}|undefined;
let celebration:{city:number;project:number;step:number;until:number}|undefined;
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&document.body.classList.contains('travel-mode')&&!document.querySelector('.experience-preview[open]'))window.qbot.garden.closeTravel();});
export function celebrateTravel(city:number,project:number,step:number):void {celebration={city,project,step,until:Date.now()+3400};}
const e=<K extends keyof HTMLElementTagNameMap>(tag:K,text='',cls='')=>{const n=document.createElement(tag);n.textContent=text;n.className=cls;return n;};
const btn=(text:string,fn:()=>void,cls='',disabled=false)=>{const b=e('button',text,cls);b.type='button';b.disabled=disabled;b.onclick=fn;return b;};
function previewExperience(src:string,title:string):void {
 const dialog=e('dialog','','experience-preview'),img=e('img');img.src=src;img.alt=title;
 const close=btn('×',()=>dialog.close(),'preview-close');close.setAttribute('aria-label','关闭配图');
 dialog.append(close,img,e('p',title));dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
 dialog.addEventListener('close',()=>dialog.remove(),{once:true});document.body.append(dialog);dialog.showModal();close.focus();
}
export function travelIcon(kind:'travel'|'moments'):string {return kind==='travel'?'<svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="13" fill="#91d2cb" stroke="#594235" stroke-width="2"/><path d="m8 9 7-5 4 6-5 4 3 5-6 5-4-8zm15 3 5 4-4 8-4-3 2-5" fill="#e9d9a2"/></svg>':'<svg viewBox="0 0 32 32"><rect x="4" y="3" width="24" height="26" rx="3" fill="#a54f4d" stroke="#594235" stroke-width="2"/><path d="M9 4v24" stroke="#f5d8a8" stroke-width="2"/><path d="M13 9h11v12H13z" fill="#fff4db"/><path d="m14 20 4-6 5 6" fill="#86b8a2"/></svg>';}
function scene(city:number,cls=''):HTMLElement{
 const n=e('div','','travel-scene '+cls),img=e('img');img.src=art[city];img.alt=DESTINATIONS[city].name+'手绘旅行地图';img.draggable=false;n.append(img);return n;
}
function photo(p:TravelPost):HTMLElement{
 const f=e('figure','','travel-photo'),v=e('div','','photo-window'),img=e('img');
 const postcard=experienceArt(p.city,p.project,p.step);
 img.src=postcard??art[p.city];img.alt=p.title;
 if(postcard){v.classList.add('activity-photo');v.tabIndex=0;v.setAttribute('role','button');v.setAttribute('aria-label','查看'+p.title+'配图');v.onclick=()=>previewExperience(postcard,p.title);v.onkeydown=event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();previewExperience(postcard,p.title);}};}
 else img.style.transform='translate(-'+points[p.project][0]+'%,-'+points[p.project][1]+'%)';
 v.append(img);
 // Preserve the traveller as a small passport portrait, not an idle pose pasted into the scenery.
 if(p.portrait?.startsWith('data:image/')){const portrait=e('img','','traveller-seal');portrait.src=p.portrait;portrait.alt=p.name??'旅伴';v.append(portrait);}
 f.append(v,e('figcaption',p.title));return f;
}
export function renderTravel(host:HTMLElement,state:GardenState,page:string,act:(c:GardenCommand)=>Promise<void>,go:(s:string)=>void,busy:boolean):void{
 const realCurrent=state.travel?.current??0;
 const startReplay=(city:number)=>{
  if(busy||city>realCurrent)return;
  const travel=initialTravel(Date.now());travel.current=city;
  for(let i=0;i<city;i++)travel.progress[i].fill(3);
  replay={coins:50000,travel};selected=city;local=true;celebration=undefined;go('travel');
 };
 if(replay){
  const session=replay;state={...state,...session};busy=false;
  act=async command=>{
   if(replay!==session||!(command.type==='travelExperience'||command.type==='travelLike'))return;
   const next=structuredClone(session);
   try{travelTransition(next,command,Date.now());}catch{return;}
   replay=next;
   if(command.type==='travelExperience')celebrateTravel(command.city,command.project,command.step);
   go(page);
  };
 }
 const journalScroll=document.querySelector('.journal-pages')?.scrollTop??0;
 const navigate=(next:string)=>{go(next);window.scrollTo({top:0,behavior:'instant'});};
 const t=state.travel??initialTravel(Date.now());
 if(selected===undefined||selected>t.current)selected=t.current;
 const city=selected,d=DESTINATIONS[city],total=t.progress[city].reduce((a,b)=>a+b,0);
 const day=Math.max(1,Math.floor((Date.now()-t.startedAt)/86400000)+1);
 host.className='travel-shell '+(page==='moments'?'journal-shell':local?'local-shell':'atlas-shell');
 const head=e('div','','travel-heading');
 head.append(e('span',replay?'测试中':'DAY '+day,'travel-day'),e('strong',page==='moments'?'旅行手账':local?d.name:'世界旅行'),e('span',(replay?'测试币 ':'◉ ')+state.coins.toLocaleString(),'travel-wallet'));
 const close=btn('×',()=>window.qbot.garden.closeTravel(),'travel-close');close.title='收起旅行 · Esc';close.setAttribute('aria-label','收起旅行');head.append(close);head.title='拖动这里移动旅行面板';host.append(head);
 const nav=e('nav','','travel-tabs');
 nav.append(btn('世界地图',()=>{replay=undefined;celebration=undefined;local=false;navigate('travel');},page==='travel'&&!local?'active':''),btn('当地体验',()=>{local=true;navigate('travel');},page==='travel'&&local?'active':''),btn('旅行手账',()=>navigate('moments'),page==='moments'?'active':''),btn('花园',()=>{window.qbot.garden.open('shop');window.qbot.garden.closeTravel();}));
 if(page==='moments'){
  const cover=e('div','','journal-cover');cover.style.backgroundImage='url("'+art[t.current]+'")';cover.append(e('span','我们的旅行'),e('h1','把日子，过成风景。'),e('small','第 '+day+' 天 · '+travelAlbums(t).length+' 个目的地'));host.append(cover);
  const albums=travelAlbums(t);
  for(const album of albums){
   const last=album.posts.at(-1)!,first=album.posts[0],post=e('article','','moment-card');
   post.dataset.city=String(album.city);
   const date=new Date(last.at),badge=e('div','','date-ticket');badge.append(e('strong',String(date.getDate())),e('small',(date.getMonth()+1)+'月'));post.append(badge);
   const title=e('div','','moment-heading');title.append(e('small',(last.name??'旅伴')+'的旅行日记'),e('h2',DESTINATIONS[album.city].name+' · '+DESTINATIONS[album.city].subtitle));post.append(title);
   const photos=e('div','','album-photos');for(const p of album.photos)photos.append(photo(p));post.append(photos);
   const diary=t.diaries.find(x=>x.day===localDay(last.at)&&x.actor===last.actor);
   const sameCity=t.posts.filter(p=>localDay(p.at)===localDay(last.at)&&p.actor===last.actor).every(p=>p.city===album.city);
   post.append(e('p',diary&&sameCity?diary.text:'这一路，我们'+album.photos.map(p=>p.title).join('、')+'。想把这些小小的快乐，都留在这一页。','city-diary'));
   const foot=e('div','','moment-footer');foot.append(e('span',travelComplete(t,album.city)?'✓ 本站已集齐':'已收藏 '+album.photos.length+' / 5 段风景'),btn(first.liked?'♥ 喜欢':'♡ 喜欢',()=>void act({type:'travelLike',id:album.likeId}),'moment-like',busy));post.append(foot);host.append(post);
  }
  if(!albums.length)host.append(e('div','手账的第一页，等你一起出发。','travel-empty'));
 }else if(!local){
  const map=e('div','','world-map');const image=e('img');image.src=world;image.alt='手绘世界旅行路线';map.append(image);
  const route=document.createElementNS('http://www.w3.org/2000/svg','svg');route.setAttribute('viewBox','0 0 100 150');route.classList.add('atlas-route');route.setAttribute('aria-hidden','true');
  route.innerHTML='<path d="M82 48V66H23V48M23 48V92H60V114" fill="none" stroke="#345f58" stroke-width="1.2" stroke-dasharray="1 1" opacity=".65"/><path d="'+(t.current===0?'M82 48':t.current===1?'M82 48V66H23V48':'M82 48V66H23V48V92H60V114')+'" fill="none" stroke="#fff1c0" stroke-width="1.2"/>';
  map.append(route);
  DESTINATIONS.forEach((dest,i)=>{
   const marker=btn((i<t.current?'✓ ':i>t.current?'⌑ ':'')+dest.name,()=>{selected=i;local=true;project=0;navigate('travel');},'map-pin '+(i===t.current?'current':''),i>t.current);
   marker.style.left=mapPoints[i][0]+'%';marker.style.top=mapPoints[i][1]+'%';marker.title=i>t.current?'完成前一站后开放':dest.region;map.append(marker);
  });
  const ticket=e('div','','departure-ticket');ticket.append(e('small','下一段风景'),e('h2',DESTINATIONS[t.current].name),btn('出发 →',()=>{selected=t.current;local=true;project=0;navigate('travel');},'depart'));map.append(ticket);host.append(map);
 }else{
  const vista=scene(city,'destination-view');
  const label=e('div','','destination-heading');label.append(e('span',d.region+' / '+d.name),e('strong',total+' / 15'));vista.append(label);
  d.projects.forEach((p,i)=>{
   const step=t.progress[city][i],marker=btn(p.name+' '+(step===3?'✓':'●'.repeat(step)+'○'.repeat(3-step)),()=>{project=i;go('travel');},'place-pin '+(i===project?'selected':'')+(step===3?' complete':''));
   marker.style.left=points[i][0]+'%';marker.style.top=points[i][1]+'%';vista.append(marker);
   if(step){const keepsake=e('span',step===3?'✿':'✧','place-keepsake');keepsake.style.left=(points[i][0]+9)+'%';keepsake.style.top=(points[i][1]-7)+'%';vista.append(keepsake);}
  });
  if(celebration&&celebration.city===city&&celebration.until>Date.now()&&t.progress[city][celebration.project]>celebration.step){
   const event=celebration;
   const fx=e('div','','experience-celebration');fx.style.left=points[celebration.project][0]+'%';fx.style.top=points[celebration.project][1]+'%';
   for(let i=0;i<12;i++){const bit=e('i',i%3?'✦':'❀');bit.style.setProperty('--i',String(i));fx.append(bit);}fx.append(e('strong','回忆 +1','memory-stamp'));vista.append(fx);
   const reveal=e('div','','travel-photo-reveal');reveal.setAttribute('aria-live','polite');
   const title=d.projects[event.project].steps[event.step];
   const memory=photo({id:'reveal',at:Date.now(),city,project:event.project,step:event.step,title,text:'',liked:false});
   memory.classList.add('revealed-postcard');
   memory.querySelector('.photo-window')?.removeAttribute('tabindex');
   const stamp=e('span',d.name+' · 已收藏','postcard-stamp');memory.append(stamp);reveal.append(memory);host.append(reveal);
   requestAnimationFrame(()=>{
    if(!host.isConnected)return;
    const target=vista.querySelectorAll('.place-pin')[event.project].getBoundingClientRect();
    const bounds=memory.getBoundingClientRect();
    reveal.style.setProperty('--collect-x',(target.left+target.width/2-bounds.left-bounds.width/2)+'px');
    reveal.style.setProperty('--collect-y',(target.top+target.height/2-bounds.top-bounds.height/2)+'px');
    reveal.style.setProperty('--elapsed',Math.min(0,event.until-Date.now()-3400)+'ms');
    reveal.classList.add('playing');
    memory.addEventListener('animationend',()=>{reveal.remove();const marker=vista.querySelectorAll('.place-pin')[event.project];marker.classList.add('photo-collected');},{once:true});
   });
  }
  host.append(vista);
  const p=d.projects[project],step=t.progress[city][project];
  const card=e('div','','experience-card'),copy=e('div');
  const postcard=experienceArt(city,project,Math.min(step,2));
  if(postcard){const thumbnail=btn('',()=>previewExperience(postcard,p.steps[Math.min(step,2)]),'experience-thumbnail');thumbnail.setAttribute('aria-label','查看'+p.steps[Math.min(step,2)]+'配图');const img=e('img');img.src=postcard;img.alt=p.steps[Math.min(step,2)];thumbnail.append(img);card.append(thumbnail);}
  copy.className='experience-copy';copy.append(e('small',p.name+' · '+'●'.repeat(step)+'○'.repeat(3-step)),e('h2',step===3?'这一刻，记住了':p.steps[step]));card.append(copy);
  card.append(btn(step===3?'已体验':'◉ '+d.costs[step]+'  体验',()=>{
   void act({type:'travelExperience',city,project,step});
  },'experience-buy',busy||step===3||city!==t.current||state.coins<d.costs[step]));
  if(step<3&&state.coins<d.costs[step])card.append(e('small','还差 '+(d.costs[step]-state.coins)+' 金币','short-fare'));
  host.append(card);
  const next=e('div','','travel-next');next.append(btn('查看本站手账 →',()=>go('moments')));
  const test=btn(replay?'重新测试':'测试重玩',()=>startReplay(city),'travel-replay',busy);test.title='仅测试：重新体验本站，不扣真实金币、不修改旅行进度';next.append(test);
  if(replay)next.append(btn('退出测试',()=>{replay=undefined;celebration=undefined;go('travel');},'travel-replay-exit'));
  else if(city===t.current&&city<DESTINATIONS.length-1)next.append(btn('下一站 · '+DESTINATIONS[city+1].name,()=>{celebration=undefined;void act({type:'travelNext',city}).then(()=>{selected=undefined;project=0;go('travel');});},'depart',busy||!travelComplete(t,city)));
  else if(city===DESTINATIONS.length-1&&travelComplete(t,city))next.append(e('span','这一程，圆满收进手账。'));
  host.append(next);
 }
 if(page==='moments'){const pages=e('div','','journal-pages');for(const child of [...host.children])if(child!==head)pages.append(child);host.append(pages);requestAnimationFrame(()=>{if(host.isConnected)pages.scrollTop=journalScroll;});}
 host.append(nav);
}
