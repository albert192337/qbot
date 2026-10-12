import * as THREE from './vendor/three.module.js';

// Isolated interaction fixture. No game API, user save, friend or purchase calls.
const gardenIds=new Set(['G0','G1','G2','G3','G4','G6','G10','G11','G13','G16','G19','G22']);
const roomIds=new Set(['P1','P10','R2','H0','H0W','H1','H2','H3','H4']);
const seeds=[{name:'草莓',color:0xce806e},{name:'菠萝',color:0xd5b456},{name:'蓝莓',color:0x8388aa}];
const furniture=[{key:'sofa',name:'蕨叶双人椅',category:'座椅',icon:'sofa',w:1.6,d:.8},{key:'table',name:'圆木矮桌',category:'桌子',icon:'table',w:1,d:.75},{key:'lamp',name:'铃兰落地灯',category:'灯饰',icon:'lamp',w:.55,d:.55},{key:'plant',name:'陶盆绿植',category:'装饰',icon:'plant',w:.5,d:.5}];
const makeGarden=()=>[{seed:0,mature:true,left:0},{seed:1,mature:false,left:768},{seed:2,mature:false,left:2286},null];
let moveAngle=null,gardens={},rooms={},stock=[8,3,2],fruit=[1,4,6],selectedSeed=null,selectedPlot=null,visitor=null,bagTab='种子',roomCategory='全部',editing=false,pending=null,selectedFurniture=null,moving=false,nextId=20,sceneView=null,api=null,lastType=null;
let weatherAt=Date.now()+38*60*1000;
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
const glyph=k=>window.QBOT_UI_ICON(k);
function button(label,action,icon,cls=''){const b=el('button',cls);b.type='button';if(icon)b.append(glyph(icon));if(label)b.append(el('span','',label));if(label||icon)b.setAttribute('aria-label',label||icon);b.onclick=e=>{e.stopPropagation();action?.();};return b;}
function ib(icon,label,action){const b=button('',action,icon,'icon-button');b.title=label;b.setAttribute('aria-label',label);return b;}
function refresh(){api.refresh();}
function ownGarden(){return gardens[api.actor]??=(makeGarden());}
function plots(){return visitor?(gardens['friend:'+visitor]??=makeGarden()):ownGarden();}
function myRoom(){return rooms[api.actor]??=[{id:nextId++,key:'sofa',x:-1.5,z:-1.3,angle:0},{id:nextId++,key:'table',x:-.7,z:.2,angle:0},{id:nextId++,key:'lamp',x:1.8,z:-1.9,angle:0}];}
function available(key){return 5-Object.values(rooms).flat().filter(x=>x.key===key).length;}
const fmt=t=>`${Math.floor(Math.max(0,t)/60).toString().padStart(2,'0')}:${Math.floor(Math.max(0,t)%60).toString().padStart(2,'0')}`;
function tabs(items,active,onPick,cls='space-tabs'){const nav=el('nav',cls);nav.setAttribute('aria-label','分类');for(const [label,icon]of items){const b=button(label,()=>onPick(label),icon,label===active?'selected':'');if(label===active)b.setAttribute('aria-current','page');nav.append(b);}return nav;}
function setGardenPage(label){selectedPlot=null;selectedSeed=null;bagTab='种子';visitor=null;api.navigate({背包:'G0',图鉴:'G6',商店:'G8',朋友:'G10'}[label]);}
function addInventory(container,items,onPick){const grid=el('div','space-inventory');for(const item of items){const b=button('',()=>onPick(item),null,'space-item'+(item.selected?' selected':''));b.setAttribute('aria-label',item.name+'，'+item.count);b.setAttribute('aria-pressed',String(!!item.selected));if(item.disabled)b.disabled=true;b.append(glyph(item.icon),el('span','space-item-name',item.name),el('span','space-count',item.count));grid.append(b);}container.append(grid);}
function makePanel(title,back){const panel=el('section','panel space-panel');panel.setAttribute('aria-label',title);panel.dataset.cScreen=api.current;const head=el('header','panel-header');if(back)head.append(ib('back','返回',back));head.append(el('h1','',title));panel.append(head);return {panel,head};}
function weather(head){const b=el('div','space-weather');b.append(glyph('rainbow'),el('span','space-weather-time'));head.append(b);const tick=()=>{const remain=Math.ceil((weatherAt-Date.now())/1000);b.classList.toggle('active-weather',remain<=0);b.title=remain>0?'下次特殊天气：彩虹':'彩虹天气 · 剩余时间';b.setAttribute('aria-label',b.title);b.lastChild.textContent=fmt(remain>0?remain:1800+remain);const gardenIcon=api.stage.querySelector('.native-garden');if(remain>0)gardenIcon?.querySelector('.native-rainbow')?.remove();else if(gardenIcon&&!gardenIcon.querySelector('.native-rainbow'))gardenIcon.append(el('span','native-rainbow','⌒'));};tick();sceneView.weatherTimer=setInterval(tick,1000);}
function gardenPanel(){
 const page=api.current;const back=visitor?()=>{visitor=null;selectedPlot=null;api.navigate('G10');}:page!=='G0'?()=>api.navigate('G0'):null;
 const {panel,head}=makePanel(visitor?visitor+'的花园':'花园',back);weather(head);head.append(ib('close','关闭花园',api.close));
 if(visitor)head.insertBefore(ib('home','回自己的花园',()=>{visitor=null;selectedPlot=null;api.navigate('G0');}),head.lastChild);
 else panel.append(tabs([['背包','bag'],['图鉴','book'],['商店','shop'],['朋友','users']],page==='G10'?'朋友':['G6','G16'].includes(page)?'图鉴':'背包',setGardenPage,'panel-navigation'));
 const body=el('div','body');panel.append(body);
 if(visitor){body.append(el('p','space-subheading',selectedPlot===null?'可助育 2 株':seeds[plots()[selectedPlot]?.seed??0].name));if(selectedPlot!==null){const actions=el('div','buttons');const p=plots()[selectedPlot];if(p){const help=button(p.helped?'已助育':'助育',()=>{p.helped=true;refresh();},p.helped?'check':'plant','selected');help.disabled=!!p.helped;actions.append(help,button(p.requested?'已申请':'申请繁育',()=>{p.requested=true;refresh();},'heart'));body.append(actions);}}}
 else if(page==='G10'){
  for(const name of ['阿圆','小林','张起灵']){const row=button('',()=>{visitor=name;selectedPlot=null;api.navigate('G19');},null,'space-friend');row.append(glyph('pet'),el('span','',name),el('small','',name==='小林'?'生长中':'可助育 2 株'),glyph('arrow'));body.append(row);}
 }else if(['G6','G16'].includes(page)){
  body.append(el('div','space-subheading','12 / 36'));addInventory(body,seeds.map(s=>({name:s.name,count:'已发现',icon:'plant'})),()=>{});
 }else{
  panel.insertBefore(tabs([['种子','plant'],['果实','bag'],['道具','gift']],bagTab,label=>{bagTab=label;selectedPlot=null;selectedSeed=null;refresh();}),body);
  if(bagTab==='种子')addInventory(body,seeds.map((s,i)=>({name:s.name+'种子',count:'× '+stock[i],icon:'plant',index:i,selected:selectedSeed===i,disabled:stock[i]===0})),item=>{selectedSeed=item.index;selectedPlot=null;refresh();});
  if(bagTab==='果实')addInventory(body,seeds.map((s,i)=>({name:s.name,count:'× '+fruit[i],icon:'plant'})),()=>api.navigate('G5'));
  if(bagTab==='道具')addInventory(body,[{name:'加速肥',count:'× 5',icon:'gift'},{name:'喷雾',count:'× 3',icon:'cloud'}],()=>{if(selectedPlot!==null&&plots()[selectedPlot]){plots()[selectedPlot].left=0;plots()[selectedPlot].mature=true;refresh();}});
  if(selectedSeed!==null){const strip=el('div','space-selection');strip.append(glyph('plant'),el('span','',seeds[selectedSeed].name+'种子'),ib('close','取消播种',()=>{selectedSeed=null;refresh();}));body.append(strip);}
  if(selectedPlot!==null&&plots()[selectedPlot]){const p=plots()[selectedPlot],context=el('section','space-context');context.append(el('h2','',seeds[p.seed].name),el('span','space-subheading',p.mature?'可收获':fmt(p.left)));const actions=el('div','buttons');if(p.mature)actions.append(button('收获',()=>{fruit[p.seed]++;plots()[selectedPlot]=null;selectedPlot=null;refresh();},'bag','selected'));else actions.append(button('施肥',()=>{p.mature=true;p.left=0;refresh();},'gift'),button('培育',()=>api.navigate('G7'),'plant'));context.append(actions);body.append(context);}
 }
 return panel;
}
function roomPanel(){
 myRoom();const {panel,head}=makePanel(api.actor+'的房间',()=>api.navigate(api.actor==='吴邪'?'P0W':'P0'));
 const edit=button(editing?'完成':'布置',()=>{editing=!editing;pending=null;selectedFurniture=null;moving=false;refresh();},editing?'check':'edit','space-edit'+(editing?' selected':''));head.append(edit,ib('close','关闭房间',api.close));
 panel.append(tabs([['全部','bag'],['座椅','sofa'],['桌子','table'],['灯饰','lamp'],['装饰','plant']],roomCategory,label=>{roomCategory=label;refresh();},'panel-navigation room-categories'));
 const body=el('div','body');panel.append(body);
 addInventory(body,furniture.filter(f=>roomCategory==='全部'||f.category===roomCategory).map(f=>({...f,count:'× '+available(f.key),selected:pending?.key===f.key,disabled:available(f.key)<=0})),f=>{pending={key:f.key,angle:0};editing=true;selectedFurniture=null;moving=false;refresh();});
 if(pending||moving){const f=furniture.find(f=>f.key===(pending?.key||myRoom().find(o=>o.id===selectedFurniture)?.key));const strip=el('div','space-selection');strip.append(glyph(f.icon),el('span','',f.name),ib('close','取消摆放',()=>{pending=null;moving=false;refresh();}));body.append(strip);}
 return panel;
}
function createScene(type){
 const host=el('section','space-view');host.setAttribute('aria-label',type==='garden'?'3D 花园操作区':'3D 房间操作区');const header=el('header','space-view-header');header.append(el('span','',type==='garden'?(visitor?visitor+'的花园':api.actor+'的花园'):api.actor+'的房间'),el('small','','3D'));const zoom=el('div','space-camera');let rotation=.78,scale=1;header.append(zoom);host.append(header);
 const viewport=el('div','space-viewport'),overlay=el('div','space-overlay');host.append(viewport);viewport.append(overlay);api.stage.append(host);
 const scene=new THREE.Scene();scene.background=new THREE.Color(type==='garden'?0xeceedd:0xeee8dc);
 const camera=new THREE.OrthographicCamera(-4.8,4.8,3.7,-3.7,.1,100);camera.position.set(7,8,7);camera.lookAt(0,0,0);
 let renderer;try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});}catch(err){host.append(el('p','space-error','3D 预览无法启动，请刷新重试。'));return {host,dispose(){},weatherTimer:null};}
 renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;viewport.prepend(renderer.domElement);renderer.domElement.setAttribute('aria-label','可点击的 3D 场景');
 scene.add(new THREE.HemisphereLight(0xfff9eb,0xb4ad91,2.6));const sun=new THREE.DirectionalLight(0xfff1d4,3);sun.position.set(-3,9,6);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-6;sun.shadow.camera.right=6;sun.shadow.camera.top=6;sun.shadow.camera.bottom=-6;sun.shadow.normalBias=.04;scene.add(sun);
 const targets=[],hotspots=[];let disposed=false,ghost=null,ghostValid=false,hoverPoint=null;
 const material=color=>new THREE.MeshStandardMaterial({color,roughness:1});
 function box(parent,w,h,d,color,x=0,y=0,z=0){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material(color));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
 function sphere(parent,r,color,x,y,z,sx=1,sy=1,sz=1){const m=new THREE.Mesh(new THREE.SphereGeometry(r,16,12),material(color));m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;parent.add(m);return m;}
 function plant(parent,p,x,z){const g=new THREE.Group();g.position.set(x,.1,z);parent.add(g);box(g,.035,.52,.035,0x648257,0,.28,0);sphere(g,.18,0x92b77a,-.15,.35,0,1.25,.35,.7).rotation.z=-.55;sphere(g,.2,0xa4c289,.15,.53,0,1.2,.4,.7).rotation.z=.55;if(p.mature){for(const [a,b,c]of [[0,.26,.09],[-.15,.18,.04],[.14,.2,.04]])sphere(g,.14,seeds[p.seed].color,a,b,c,1,1.12,1);}return g;}
 function furnitureMesh(parent,obj){const g=new THREE.Group();g.position.set(obj.x||0,.06,obj.z||0);g.rotation.y=(obj.angle||0)*Math.PI/2;parent.add(g);if(obj.key==='sofa'){box(g,1.6,.2,.78,0x9eb49b,0,.43,0);box(g,1.6,.65,.18,0x9eb49b,0,.7,-.33);for(const x of [-.73,.73])box(g,.14,.4,.8,0x718b75,x,.62,0);for(const x of [-.58,.58])for(const z of [-.26,.26])box(g,.1,.3,.1,0x96765a,x,.15,z);}else if(obj.key==='table'){const top=new THREE.Mesh(new THREE.CylinderGeometry(.53,.53,.11,32),material(0xc5a17c));top.position.y=.48;top.scale.z=.72;top.castShadow=true;g.add(top);for(const x of [-.32,.32])for(const z of [-.2,.2])box(g,.075,.42,.075,0x947454,x,.22,z);}else if(obj.key==='lamp'){box(g,.4,.05,.4,0x9a8167,0,.04,0);box(g,.055,1.35,.055,0x846b56,0,.7,0);const shade=new THREE.Mesh(new THREE.CylinderGeometry(.23,.38,.42,24),material(0xe9d39c));shade.position.y=1.39;shade.castShadow=true;g.add(shade);}else{const pot=new THREE.Mesh(new THREE.CylinderGeometry(.23,.18,.33,20),material(0xc69b80));pot.position.y=.17;g.add(pot);plant(g,{mature:false},0,0);g.scale.setScalar(1.1);}return g;}
 function hotspot(label,point,action,cls=''){const b=button('',action,null,'space-hotspot '+cls);b.setAttribute('aria-label',label);b.title=label;overlay.append(b);hotspots.push({button:b,point});return b;}
 const ground=box(scene,6.4,.18,5.8,type==='garden'?0xbac29b:0xd7c09e,0,-.12,0);ground.userData.floor=true;targets.push(ground);
 if(type==='garden'){
  const coords=[[-1.35,-1.15],[1.35,-1.15],[-1.35,1.15],[1.35,1.15]];
  for(let i=0;i<4;i++){const [x,z]=coords[i],p=plots()[i],plot=box(scene,1.95,.16,1.6,0xae8c6b,x,.03,z);plot.userData.plot=i;targets.push(plot);box(scene,2.02,.09,.09,0xd3b28b,x,.11,z-.8);box(scene,2.02,.09,.09,0xd3b28b,x,.11,z+.8);box(scene,.09,.09,1.65,0xd3b28b,x-1,.11,z);box(scene,.09,.09,1.65,0xd3b28b,x+1,.11,z);
   if(p){for(const dx of [-.38,.38])for(const dz of [-.28,.28])plant(scene,p,x+dx,z+dz);}
   const b=hotspot(p?`${seeds[p.seed].name}，${p.mature?'可收获':'生长中'}，土地 ${i+1}`:`空土地 ${i+1}`,new THREE.Vector3(x,p?.mature?.9:.65,z),()=>clickPlot(i),'plot-hit');b.append(glyph(p?(p.helped?'check':p.mature?'bag':'clock'):'plus'));if(p&&!p.mature)b.append(el('span','',fmt(p.left)));if(i===selectedPlot)b.classList.add('selected');if(!p&&selectedSeed!==null&&!visitor)b.classList.add('plant-ready');
  }
  for(const x of [-2.85,2.85])for(const z of [-2.5,-1.5,-.5,.5,1.5,2.5])box(scene,.09,.55,.09,0xe2d4b8,x,.21,z);for(const x of [-2.85,2.85])box(scene,.075,.075,5.1,0xe2d4b8,x,.4,0);
 }else{
  box(scene,6.4,2.3,.12,0xe5dcc6,0,1.1,-2.91);box(scene,.12,2.3,5.8,0xeee5d1,-3.21,1.1,0);
  box(scene,1.65,1.2,.035,0xaec7c4,.9,1.3,-2.83);box(scene,1.8,.08,.12,0xfff5df,.9,1.91,-2.79);box(scene,.06,1.22,.09,0xfff5df,.9,1.3,-2.78);box(scene,1.8,.07,.12,0xfff5df,.9,.68,-2.79);
  for(let x=-2.6;x<3;x+=.72)box(scene,.015,.01,5.6,0xc5ae8f,x,-.015,0);
  box(scene,2.4,.018,1.9,0xb8c0a5,.1,.005,.7);
  for(const obj of myRoom()){const mesh=furnitureMesh(scene,obj);mesh.traverse(n=>{if(n.isMesh){n.userData.furniture=obj.id;targets.push(n);}});if(editing&&!pending&&!moving){const b=hotspot(furniture.find(f=>f.key===obj.key).name,new THREE.Vector3(obj.x,1.35,obj.z),()=>{selectedFurniture=obj.id;refresh();},'furniture-hit');b.append(glyph('edit'));if(selectedFurniture===obj.id)b.classList.add('selected');}}
  if(editing&&selectedFurniture!==null&&!pending&&!moving){const obj=myRoom().find(o=>o.id===selectedFurniture);if(obj){const tool=el('div','space-object-tools');tool.append(ib('edit','移动家具',()=>{moving=true;moveAngle=obj.angle;refresh();}),ib('refresh','旋转家具',()=>{const next={...obj,angle:(obj.angle+1)%4};if(canPlace(next)){obj.angle=next.angle;refresh();}}),ib('bag','收回家具',()=>{rooms[api.actor]=myRoom().filter(o=>o.id!==obj.id);selectedFurniture=null;refresh();}));overlay.append(tool);hotspots.push({button:tool,point:new THREE.Vector3(obj.x,1.85,obj.z)});}}
  if(pending||moving){const obj=pending||{...myRoom().find(o=>o.id===selectedFurniture),angle:moveAngle};ghost=furnitureMesh(scene,{...obj,x:0,z:1.5});ghost.traverse(n=>{if(n.isMesh){n.material.transparent=true;n.material.opacity=.5;}});hoverPoint={x:0,z:1.5};ghostValid=canPlace({...obj,...hoverPoint});const prompt=el('div','space-placement-tools');prompt.append(ib('refresh','旋转待放家具',()=>{if(pending)pending.angle=(pending.angle+1)%4;else moveAngle=(moveAngle+1)%4;refresh();}),ib('close','取消摆放',()=>{pending=null;moving=false;refresh();}));host.append(prompt);}
 }
 function dims(o){const f=furniture.find(f=>f.key===o.key);return o.angle%2?[f.d,f.w]:[f.w,f.d];}
 function canPlace(obj){const [w,d]=dims(obj);if(Math.abs(obj.x)+w/2>3||Math.abs(obj.z)+d/2>2.7)return false;return !myRoom().some(o=>{if(moving&&o.id===selectedFurniture)return false;const [ow,od]=dims(o);return Math.abs(o.x-obj.x)<(w+ow)/2+.04&&Math.abs(o.z-obj.z)<(d+od)/2+.04;});}
 function clickPlot(index){const p=plots()[index];if(!p&&selectedSeed!==null&&!visitor&&stock[selectedSeed]>0){plots()[index]={seed:selectedSeed,mature:false,left:900};stock[selectedSeed]--;if(stock[selectedSeed]===0)selectedSeed=null;selectedPlot=null;}else{selectedPlot=index;selectedSeed=null;}refresh();}
 const ray=new THREE.Raycaster(),pointer=new THREE.Vector2();
 function hits(ev){const rect=renderer.domElement.getBoundingClientRect();pointer.set((ev.clientX-rect.left)/rect.width*2-1,-(ev.clientY-rect.top)/rect.height*2+1);ray.setFromCamera(pointer,camera);return ray.intersectObjects(targets,false);}
 function updateGhost(ev){if(!ghost)return;const hit=hits(ev).find(h=>h.object.userData.floor);if(!hit)return;hoverPoint={x:Math.round(hit.point.x*4)/4,z:Math.round(hit.point.z*4)/4};ghost.position.x=hoverPoint.x;ghost.position.z=hoverPoint.z;const obj=pending||{...myRoom().find(o=>o.id===selectedFurniture),angle:moveAngle};ghostValid=canPlace({...obj,...hoverPoint});ghost.traverse(n=>{if(n.isMesh)n.material.emissive.setHex(ghostValid?0x153415:0x701d1d);});renderer.domElement.style.cursor=ghostValid?'copy':'not-allowed';draw();}
 renderer.domElement.addEventListener('pointermove',updateGhost);
 renderer.domElement.addEventListener('click',ev=>{const h=hits(ev);if(type==='garden'){const hit=h.find(h=>h.object.userData.plot!==undefined);if(hit)clickPlot(hit.object.userData.plot);}else if(ghost){updateGhost(ev);if(!ghostValid||!hoverPoint)return;if(pending){if(available(pending.key)<=0)return;myRoom().push({id:nextId++,...pending,...hoverPoint});pending=null;}else{Object.assign(myRoom().find(o=>o.id===selectedFurniture),hoverPoint,{angle:moveAngle});moving=false;}refresh();}else if(editing){const hit=h.find(h=>h.object.userData.furniture!==undefined);selectedFurniture=hit?.object.userData.furniture??null;refresh();}});
 function draw(){if(disposed)return;camera.zoom=scale;camera.updateProjectionMatrix();camera.position.set(Math.sin(rotation)*10,8,Math.cos(rotation)*10);camera.lookAt(0,.1,0);renderer.render(scene,camera);for(const {button,point}of hotspots){const p=point.clone().project(camera);button.style.left=(p.x+1)*viewport.clientWidth/2+'px';button.style.top=(1-p.y)*viewport.clientHeight/2+'px';}}
 function resize(){const w=viewport.clientWidth||680,h=viewport.clientHeight||440;camera.left=-4.1*w/h;camera.right=4.1*w/h;camera.top=4.1;camera.bottom=-4.1;renderer.setSize(w,h,false);draw();}
 zoom.append(ib('refresh','转动视角',()=>{rotation+=Math.PI/4;draw();}),button('−',()=>{scale=Math.max(.75,scale-.15);draw();},null,'space-zoom'),button('+',()=>{scale=Math.min(1.7,scale+.15);draw();},null,'space-zoom'));
 const observer=new ResizeObserver(resize);observer.observe(viewport);resize();
 return {host,weatherTimer:null,dispose(){disposed=true;observer.disconnect();scene.traverse(n=>{n.geometry?.dispose();if(Array.isArray(n.material))n.material.forEach(m=>m.dispose());else n.material?.dispose();});renderer.dispose();renderer.forceContextLoss();},getDebug:()=>({type,visitor,selectedSeed,selectedPlot,editing,pending,moving,room:myRoom().map(o=>({...o})),stock:[...stock],plots:plots().map(p=>p?{...p}:null)})};
}
window.QBOT_SPACES={
 dispose(){if(sceneView){clearInterval(sceneView.weatherTimer);sceneView.dispose();sceneView=null;}document.getElementById('stage')?.classList.remove('space-open');},
 onNavigate(from,to){const isGarden=gardenIds.has(to),isRoom=roomIds.has(to);if(isGarden){if(!gardenIds.has(from)){visitor=null;bagTab='种子';selectedSeed=null;selectedPlot=null;}if((to==='G19'||to==='G22')&&!visitor)visitor='阿圆';if(to==='G0'){visitor=null;bagTab='种子';selectedPlot=null;}if(to==='G4')bagTab='果实';if(to==='G13')bagTab='道具';if(to==='G1')bagTab='种子';}if(isRoom&&!roomIds.has(from)){editing=['H0','H0W','H2'].includes(to);pending=null;selectedFurniture=null;moving=false;roomCategory='全部';}if(!isRoom){pending=null;selectedFurniture=null;moving=false;editing=false;}if(!isGarden){selectedSeed=null;selectedPlot=null;visitor=null;}},
 render(options){api=options;const type=gardenIds.has(api.current)?'garden':roomIds.has(api.current)?'room':null;if(!type)return false;lastType=type;api.stage.classList.add('space-open');document.body.classList.remove('c-detail');sceneView=createScene(type);const panel=type==='garden'?gardenPanel():roomPanel();api.stage.append(panel);return true;},
 escape(){if(!sceneView)return false;if(pending||moving){pending=null;moving=false;refresh();return true;}if(selectedSeed!==null||selectedPlot!==null||selectedFurniture!==null){selectedSeed=null;selectedPlot=null;selectedFurniture=null;refresh();return true;}if(editing){editing=false;refresh();return true;}return false;},
 reset(){gardens={};rooms={};stock=[8,3,2];fruit=[1,4,6];selectedSeed=selectedPlot=visitor=pending=selectedFurniture=null;editing=moving=false;bagTab='种子';roomCategory='全部';weatherAt=Date.now()+38*60000;},
 debug(){return sceneView?.getDebug?.();}
};
// Modules initialize after the classic-script prototype. Refresh only its current page.
if(window.QBOT_STATE)window.QBOT_NAV(window.QBOT_STATE.screen);
