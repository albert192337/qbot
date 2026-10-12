(() => {
 'use strict';
 const screens=window.QBOT_SCREENS, byId=Object.fromEntries(screens.map(s=>[s.id,s]));
 const stage=document.getElementById('stage'), list=document.getElementById('screenList');
 let current='D0',actor='小白白',lower=false,hidden=false,muted=false,work=false,online=false,photoOrigin='P5',timer;
 const edits={},toggles={},history=[],roomPositions={};
 const names={arrow:'打开',chat:'聊天',phone:'手机',plant:'花园',menu:'菜单',home:'房间',travel:'旅行',moments:'朋友圈',heart:'关系',capsule:'补给站',bag:'背包',book:'图鉴',shop:'商店',users:'朋友',tasks:'任务',pet:'角色',settings:'设置',close:'关闭',back:'返回',eye:'显示 / 隐藏',sound:'声音',edit:'布置',image:'图片',smile:'表情',send:'发送',coin:'金币',star:'外观',sofa:'座椅',table:'桌子',lamp:'灯饰',gift:'道具',play:'播放',pause:'暂停',check:'完成',clock:'等待',plus:'增加',refresh:'旋转 / 重试',lock:'未解锁',cloud:'连接',rainbow:'彩虹天气',more:'更多'};
 const groups={D:'桌面',C:'聊天',P:'手机',G:'种植',H:'房间与家具',K:'扭蛋',A:'外观',M:'多人',T:'玩家目标',R:'角色',S:'设置',E:'状态与反馈'};
 const e=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=String(text).replaceAll('小企鹅',actor);return n;};
 function icon(key,cls=''){return window.QBOT_UI_ICON(key,cls);}
 function btn(label,to,kind){const b=e('button',kind==='selected'?'selected':'',label);b.type='button';if(kind==='disabled')b.disabled=true;if(to)b.addEventListener('click',ev=>{ev.stopPropagation();go(to);});return b;}
 function ib(key,to){const b=btn('',to);b.className='icon-button';b.title=names[key]||key;b.setAttribute('aria-label',b.title);b.append(icon(key));return b;}
 function go(id,record=true){if(!byId[id])throw new Error('Missing screen '+id);if(id==='P12'&&current!=='P12')photoOrigin=['P2','P11','P5'].includes(current)?current:'P5';if(record&&id!==current)history.push(current);if(id==='R2'||id==='P0W'||id==='H0W')actor='吴邪';if(id==='D3'||id==='M0H')hidden=true;if(id==='S6')muted=true;if(id==='D0'){hidden=false;work=false;}if(id==='D1')work=true;if(id==='M3'||id==='C1'||id==='C2')online=true;if(id==='M2')online=false;if(id==='D2')lower=true;window.QBOT_SPACES?.onNavigate(current,id);current=id;render();}
 function back(){go(history.pop()||'D0',false);}
 function buttons(items){const r=e('div','buttons');for(const a of items){const b=a.icon?ib(a.icon,a.to):btn(a.label,a.to,a.kind);if(a.toggle){const key=actor+':'+a.toggle,active=!!toggles[key];b.classList.toggle('selected',active);b.setAttribute('aria-pressed',String(active));b.title=a.title||a.toggle;b.setAttribute('aria-label',b.title);b.onclick=()=>{toggles[key]=!active;render();};}r.append(b);}return r;}
 function quickControls(){const group=e('div','panel-header-actions');for(const [key,off,label] of [['eye',hidden,hidden?'显示角色':'隐藏角色'],['sound',muted,muted?'取消静音':'静音']]){const b=ib(key);b.title=label;b.setAttribute('aria-label',label);b.setAttribute('aria-pressed',String(off));b.classList.toggle('is-off',off);b.onclick=()=>{if(key==='eye'){hidden=!hidden;if(current==='M0H'&&!hidden)current='M0';}else{muted=!muted;if(current==='S6'&&!muted)current='S0';}render();};group.append(b);}return group;}
 function navigation(items){const nav=e('nav','panel-navigation');nav.setAttribute('aria-label','分类导航');for(const a of items){const b=btn('',a.to,a.kind);b.append(icon(a.icon),e('span','',a.label));if(a.kind==='selected')b.setAttribute('aria-current','page');nav.append(b);}return nav;}
 function row(a){const r=e('div','row'+(a.to?' clickable':''));if(a.icon)r.append(icon(a.icon));const c=e('div','copy');c.append(e('div','label',a.label));if(a.meta)c.append(e('div','meta',a.meta));r.append(c);if(a.action){const b=btn(a.action,a.to,a.kind);b.classList.add('act');r.append(b);}else if(a.to)r.append(ib('arrow',a.to));if(a.to){r.addEventListener('click',()=>go(a.to));r.setAttribute('role','button');r.tabIndex=0;r.addEventListener('keydown',ev=>{if(ev.key==='Enter')go(a.to);});}return r;}
 function scene(kind,h=170,targets={}){const sc=e('div','scene');sc.style.height=h+'px';if(kind==='room'){
 sc.append(e('div','wall'),e('div','floor'));
 for(const [cl,key] of [['sofa','sofa'],['table','table'],['actor','pet'],['lamp','lamp']]){const b=btn('',targets[cl]);b.className='room-obj '+cl;b.title=names[key];b.append(icon(key));if(current.startsWith('H')){b.draggable=false;const pos=roomPositions[actor+'-'+cl];if(pos){b.style.left=pos.x+'px';b.style.top=pos.y+'px';}b.addEventListener('pointerdown',ev=>{ev.preventDefault();b.setPointerCapture(ev.pointerId);const sx=ev.clientX,sy=ev.clientY,ox=b.offsetLeft,oy=b.offsetTop;b.onpointermove=mv=>{const x=Math.max(0,Math.min(sc.clientWidth-b.clientWidth,ox+mv.clientX-sx)),y=Math.max(0,Math.min(sc.clientHeight-b.clientHeight,oy+mv.clientY-sy));b.style.left=x+'px';b.style.top=y+'px';roomPositions[actor+'-'+cl]={x,y};};b.onpointerup=()=>{b.onpointermove=null;b.onpointerup=null;};});}sc.append(b);}
 if(targets.edit){const b=ib('edit',targets.edit);b.classList.add('edit');sc.append(b);}
 }else if(kind==='garden'){const g=e('div','garden-grid');for(let i=0;i<4;i++){const b=btn('',targets[i]||'G1');b.className='plot';b.append(icon(i===3?'plus':'plant'),e('span','meta',['✓','12:48','38:06','+'][i]));g.append(b);}sc.append(g);
 }else if(kind==='map'){[[12,20],[45,40],[72,65]].forEach(([x,y],i)=>{const b=ib('travel',targets[i]||'P4');b.classList.add('map-point');b.style.left=x+'%';b.style.top=y+'%';sc.append(b);});
 }else sc.append(icon(({machine:'capsule',reward:'star',photo:'image',plant:'plant',bag:'bag',lamp:'lamp'})[kind]||'pet','scene-icon'));return sc;}
 function blocks(container,arr){for(const a of arr||[]){if(a.type==='text')container.append(e('p','text '+(a.style||'body'),a.value));
 else if(a.type==='buttons'||a.type==='tabs')container.append(buttons(a.items));
 else if(a.type==='row')container.append(row(a));
 else if(a.type==='grid'){const g=e('div','grid');g.style.gridTemplateColumns='repeat('+a.cols+',1fr)';for(const t of a.items){const c=btn('',t.to);c.className='card'+(t.selected?' selected':'');c.style.minHeight=(a.h||112)+'px';c.append(icon(t.icon||'star'),e('span','label',t.label));if(t.meta)c.append(e('span','meta',t.meta));g.append(c);}container.append(g);}
 else if(a.type==='scene')container.append(scene(a.kind,a.h,a.targets));
 else if(a.type==='input'){const w=e('div','input-wrap');const key=current+':'+a.label+':'+container.children.length;if(a.label)w.append(e('label','',a.label));const field=e((a.h||40)>50?'textarea':'input');field.value=edits[key]??a.value??'';field.setAttribute('aria-label',a.label||'输入');if(a.h)field.style.height=a.h+'px';field.addEventListener('input',()=>edits[key]=field.value);w.append(field);container.append(w);}
 else if(a.type==='progress'){const p=e('div','progress'),track=e('div','track'),v=e('div');v.style.width=(a.value||.5)*100+'%';track.append(v);p.append(track);if(a.label)p.append(e('div','meta',a.label));container.append(p);}
 else if(a.type==='toggle'){const key=actor+':'+a.label;let checked=toggles[key]??a.on;const r=e('div','row'),l=e('div','copy',a.label),b=btn(checked?'开':'关',null,checked?'selected':null);b.setAttribute('role','switch');b.setAttribute('aria-checked',String(checked));b.onclick=()=>{toggles[key]=!checked;render();};r.append(l,b);container.append(r);}
 else if(a.type==='columns'){const r=e('div','columns'),l=e('div','column'),rr=e('div','column');blocks(l,a.left);blocks(rr,a.right);r.append(l,rr);container.append(r);}
 }}
 function render(){clearTimeout(timer);window.QBOT_SPACES?.dispose();const s=structuredClone(byId[current]);if(current==='P12'){s.back=s.close=photoOrigin;const details=s.blocks[0].right;details[0].value=photoOrigin==='P5'?'巴黎 · 花园漫步':'今天收到了第一颗草莓。';details[1].value=photoOrigin==='P5'?'10月11日':'今天 09:42';for(const item of details.find(a=>a.type==='buttons').items)item.to=photoOrigin;}document.getElementById('nativeRoomToggle').checked=online;stage.replaceChildren();document.getElementById('screenName').textContent=s.id+' · '+s.title;const win=e('div','work-window');win.append(e('div','top'));for(let i=0;i<7;i++)win.append(e('div','line'));win.addEventListener('click',()=>closePanel());stage.append(win,e('div','taskbar'));
 if(s.kind!=='large'){window.QBOT_NATIVE_DESKTOP.mount({stage,current,actor,lower,hidden:hidden||s.hidden,work,online,weather:s.weather,navigate:go,onClose:closePanel,onToggleWork:()=>go(work?'D0':'D1')});}
 const spaceHandled=window.QBOT_SPACES?.render({stage,current,actor,navigate:go,close:closePanel,refresh:render,lower});
 if(!spaceHandled&&s.kind!=='desktop'&&!current.startsWith('C')){
 const panel=e('section','panel '+s.kind);panel.setAttribute('aria-label',s.heading||s.title);if(s.kind!=='large')panel.style.top=lower?'120px':'310px';if(s.height)panel.style.height=s.height+'px';
 if(s.kind==='phone'){const stat=e('div','phone-status');stat.append(e('span','','09:41'),e('span','island'),icon('sound'));panel.append(stat);}
 const head=e('header','panel-header');if(s.back)head.append(ib('back',s.back));head.append(e('h1','',s.heading||s.title));if(s.quickControls)head.append(quickControls());const x=ib('close');x.onclick=()=>s.close?go(s.close):closePanel();head.append(x);panel.append(head);for(const a of s.blocks||[])if(a.type==='navigation')panel.append(navigation(a.items));const body=e('div','body');blocks(body,(s.blocks||[]).filter(a=>a.type!=='navigation'));panel.append(body);if(s.kind==='phone'){const home=btn('',actor==='吴邪'?'P0W':'P0');home.className='homebar';home.setAttribute('aria-label','手机首页');panel.append(home);}window.QBOT_DECORATE_PANEL?.(panel,s);stage.append(panel);}
 document.querySelectorAll('#screenList button').forEach(b=>b.classList.toggle('current',b.dataset.id===current));
 if(s.next)timer=setTimeout(()=>go(s.next.to),s.next.seconds*1000);
 window.QBOT_STATE={screen:current,actor,lower,hidden,muted,work,online};window.QBOT_AFTER_RENDER?.(s);
 }
 function closePanel(){if(hidden){current='D3';render();}else{current=work?'D1':'D0';render();}}
 function buildList(q=''){list.replaceChildren();let last='';for(const s of screens){if(q&&!s.title.includes(q)&&!s.id.toLowerCase().includes(q.toLowerCase()))continue;const group=s.id[0];if(last!==group){list.append(e('h3','',groups[group]||group));last=group;}const b=btn(s.id+' · '+s.title,s.id);b.dataset.id=s.id;list.append(b);}render();}
 document.getElementById('directory').onclick=()=>document.body.classList.toggle('show-index');
 document.getElementById('filter').addEventListener('input',ev=>buildList(ev.target.value));
 document.getElementById('anchor').onclick=()=>{lower=!lower;document.getElementById('anchor').textContent=lower?'角色移到上方':'角色移到底部';render();};
 document.getElementById('reset').onclick=()=>{window.QBOT_NATIVE_DESKTOP.reset();window.QBOT_SPACES?.reset();actor='小白白';lower=hidden=muted=work=online=false;document.getElementById('anchor').textContent='角色移到底部';document.getElementById('nativeRoomToggle').checked=false;go('D0');};
 document.getElementById('flowTab').onclick=()=>{document.getElementById('workspace').hidden=false;document.getElementById('workspace').style.display='flex';document.getElementById('art').hidden=true;};
 document.getElementById('artTab').onclick=()=>{document.getElementById('workspace').hidden=true;document.getElementById('workspace').style.display='none';document.getElementById('art').hidden=false;};
 document.addEventListener('keydown',ev=>{if(ev.key==='Escape'){if(window.QBOT_SPACES?.escape())return;if(current.startsWith('C')&&window.QBOT_NATIVE_DESKTOP.closeLayer())return;const s=byId[current];current==='P12'?go(photoOrigin):s.back?go(s.back):closePanel();}});
 stage.addEventListener('click',ev=>{if(ev.target===stage)closePanel();});
 function fitStage(){const wrap=document.getElementById('stageWrap');const scale=Math.min(1,(wrap.clientWidth-40)/1200,(wrap.clientHeight-40)/860);stage.style.zoom=String(Math.max(.35,scale));}new ResizeObserver(fitStage).observe(document.getElementById('stageWrap'));window.addEventListener('resize',fitStage);window.QBOT_SET_ONLINE=value=>{online=value;go(value?'C2':'C0');};window.QBOT_NAV=go;window.QBOT_SCREENS_BY_ID=byId;buildList();fitStage();
})();





