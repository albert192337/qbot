import {desktopPreview} from './desktop.js';
import './style.css';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {TRAITS,traitSlot} from '../../shared/garden';
import {repairPineappleRegions} from './regions.js';
import {strawberryParts,strawberryBase} from './strawberry.js';
let species='pineapple',showBase=true;const templates={};const speciesName=()=>species==='strawberry'?'草莓':'菠萝';

const studyTraits={...TRAITS,cotton:{name:'云朵棉花',tier:'purple'},balloon:{name:'浮空气球',tier:'gold'},pinkbow:{name:'丝缎蝴蝶结',tier:'gold'}};
const slotOf=id=>id==='cotton'?'fruit':['balloon','pinkbow'].includes(id)?'accessory':traitSlot(id);
const qualityNames={blue:'蓝',purple:'紫',gold:'金',rainbow:'彩'};

// This study maps the existing skin IDs to the crown. It never changes game rules or saves.
const $=id=>document.getElementById(id);
const descriptions={
 pinkbow:'独立的粉色丝缎蝴蝶结模型悬浮在果实上方，保留原贴图与材质。',cotton:'下面的果实变成蓬松棉花团，表面有细细的纤维绒毛。',balloon:'叶冠上方系一颗大气球，带弯曲细绳，轻轻上下浮动。',
 twin:'下面长出两颗并排的果实，共用一簇叶冠。',honey:'果实体呈透亮蜜金色，外壁挂着蜜滴。',nebula:'果实体变为半透紫晶，外围有一圈紫色星云。',sugar:'果实体表面结出白色糖晶。',fragrant:'浅黄果实体上方升起绿色香气细环。',juicy:'果实体湿润透亮，附着大颗蓝色水珠。',nectar:'深橙蜜色果实体，蜜滴沿底部垂下。',milky:'果实体呈奶油白色，带柔软乳白圆珠。',softcore:'果实体矮胖圆润，呈暖糯米色。',delicate:'果实体收成修长小巧的粉金形状。',abundant:'主果两侧长出小型金黄副果。',starcore:'透明金色果实体里悬着一颗发光星芯。',glassheart:'通透浅青果实体里浮着粉色爱心。',galaxycore:'透明深蓝果实体里环绕着星河光点。',
 purple:'叶冠变成紫色。',golden:'叶冠变成金属鎏金。',rainbow:'叶冠显出柔和虹彩，随视角闪色。',mint:'叶冠染成清凉薄荷绿。',coral:'叶冠染成珊瑚粉。',frost:'叶冠覆上霜白色，叶尖长出冰晶。',dew:'绿叶表面挂着蓝色露珠。',striped:'叶冠出现明暗相间的条纹。',jade:'叶冠呈温润半透的翡翠色。',crystal:'叶冠变成通透的浅蓝水晶。',amber:'叶冠呈半透明琥珀色。',prism:'叶冠覆上强烈棱镜虹膜，并带彩色晶尖。',velvet:'叶冠呈哑光灰白绒霜。',celadon:'叶冠呈光滑青瓷釉色。',wax:'叶冠呈半透蜜蜡黄色。',pearl:'叶冠呈奶白珠光，缀有小珍珠。',nightdye:'叶冠染成深靛蓝，点缀微亮蓝点。',redgold:'叶冠呈红铜金属光泽。',silver:'叶冠变成冷亮秘银。',obsidian:'叶冠变成黑亮曜石。',iridescent:'叶冠呈浓郁紫粉幻彩。',daylight:'叶冠呈明亮白金，自带柔光。',
 shiny:'金色四角星围绕果实闪动。',punk:'果实腰间扣上黑色铆钉环。',classical:'果实前方佩戴金链与椭圆宝石。',firefly:'暖黄萤火虫在两侧浮动。',petals:'粉色花瓣绕着果实飘落。',thunder:'果实旁悬着醒目的黄色闪电。',breezy:'侧面挂一串青绿色风铃。',moon:'果实侧上方悬着金色弯月。',stardust:'细小蓝紫星粒环绕果实。',halo:'叶冠上方升起金色光冠。',mist:'半透明白雾环绕果实底部。',raindrop:'侧面悬挂一串蓝色雨珠。',leafwhistle:'果实前方系一枚绿色叶哨。',flowerknot:'果实前方系粉色花结。',butterfly:'金色蝴蝶在侧面振翅。',snowbell:'侧面悬挂银白雪铃与冰晶坠。',glowring:'绿色流萤形成一条环绕光带。',goldbell:'侧面挂一只金铃与红绳。',meteorRing:'倾斜星环上带着彗星尾迹。',dreambutterfly:'一对紫青幻蝶围绕果实振翅。',
 mini:'整株缩小为原来的 65%。',plump:'整株增大为原来的 112%。',large:'整株增大为原来的 128%。',giant:'整株增大为原来的 148%。',
};
const categories={fruit:['果实','下面的主体 · 选 1 项'],skin:['叶冠','上面的叶子 · 选 1 项'],accessory:['挂饰','外部装饰 · 最多 2 项'],size:['体型','整体大小 · 选 1 项']};
let chosen={fruit:[],skin:[],accessory:[],size:[]},renderer,scene,camera,controls,template=[],specimen,environment,frame=0,elapsed=0,last=0,disposed=false;
let desktopBridge;
let motion=!matchMedia('(prefers-reduced-motion: reduce)').matches,rotate=false,dynamics=[];
const presets=[['原生外观',[]],['蜜心 · 晶叶 · 金蝶',['honey','crystal','butterfly']],['星芯 · 金叶 · 弯月',['starcore','golden','moon']],['双生 · 紫叶 · 花结',['twin','purple','flowerknot']],['奶香 · 青瓷 · 银铃',['milky','celadon','snowbell']],['星河 · 极昼 · 幻蝶',['galaxycore','daylight','dreambutterfly']],['云朵棉花 · 浮空气球',['cotton','mint','balloon']],['丝缎蝴蝶结',['pinkbow']]];
function buildUI(){
 for(const [slot,[name,hint]] of Object.entries(categories)){
  const field=document.createElement('fieldset');field.innerHTML=`<legend>${name}<small>${hint}</small></legend><div class="choices"></div><div class="desc" id="desc-${slot}">保留原生外观</div>`;
  for(const [id,t] of Object.entries(studyTraits).filter(([id])=>slotOf(id)===slot)){
   if(!descriptions[id])throw Error('Missing visual definition: '+id);
   const label=document.createElement('label');label.className='choice';label.dataset.quality=t.tier;label.title=descriptions[id];label.innerHTML=`<input type="checkbox" data-trait="${id}" data-slot="${slot}"><span>${t.name}</span><small class="quality">${qualityNames[t.tier]||'普通'}</small>`;
   label.querySelector('input').addEventListener('change',e=>{const list=chosen[slot];$('notice').textContent='';if(e.target.checked){if(slot==='accessory'&&list.length===2){e.target.checked=false;$('notice').textContent='挂饰已选两项，请先取消一项。';return;}chosen[slot]=slot==='accessory'?[...list,id]:[id];}else chosen[slot]=list.filter(x=>x!==id);rebuild();sync();});field.querySelector('.choices').append(label);
  }$('slots').append(field);
 }
 presets.forEach(([name,ids],i)=>{const b=document.createElement('button');b.textContent=name;b.dataset.preset=i;b.onclick=()=>select(ids);$('presets').append(b);});
}
function select(ids){chosen={fruit:[],skin:[],accessory:[],size:[]};for(const id of ids)chosen[slotOf(id)].push(id);$('notice').textContent='';rebuild();sync();}
function sync(){
 const ids=Object.values(chosen).flat();for(const c of document.querySelectorAll('[data-trait]'))c.checked=ids.includes(c.dataset.trait);
 for(const slot of Object.keys(categories))$('desc-'+slot).textContent=chosen[slot].map(id=>descriptions[id]).join(' ' )||'保留原生外观';
 $('tags').replaceChildren();for(const slot of Object.keys(categories)){const s=document.createElement('span');s.textContent=categories[slot][0]+' · '+(chosen[slot].map(id=>studyTraits[id].name).join('＋')||'原生');$('tags').append(s);}
 $('name').textContent=(ids.length?'我的':'原生')+speciesName()+(ids.length?'标本':'');$('status').textContent=template.length?speciesName()+' / 实时外观试验':'正在载入…';document.body.dataset.species=species;$('base-toggle').disabled=species!=='strawberry';$('base-toggle').textContent=showBase?'隐藏底座':'显示底座';
 $('motion').setAttribute('aria-pressed',String(motion));$('motion').textContent=motion?'暂停动效':'开启动效';$('rotate').setAttribute('aria-pressed',String(rotate));$('rotate').textContent=rotate?'暂停旋转':'自动旋转';document.body.dataset.selection=ids.join(',');desktopBridge?.send();
}
const mat=(color,extra={})=>new T.MeshPhysicalMaterial({color,roughness:.38,clearcoat:.6,...extra});
function add(parent,geo,material,x=0,y=0,z=0){const m=new T.Mesh(geo,material);m.position.set(x,y,z);parent.add(m);return m;}
const ball=(p,c,x,y,z,r=.075)=>add(p,new T.SphereGeometry(r,16,12),mat(c),x,y,z);
function ring(p,c,r,y=0,tube=.018){const m=add(p,new T.TorusGeometry(r,tube,8,64),mat(c,{metalness:.65}),0,y,0);m.rotation.x=Math.PI/2;return m;}
function polygon(p,points,c,x,y,z,depth=.025){const s=new T.Shape();points.forEach(([a,b],i)=>i?s.lineTo(a,b):s.moveTo(a,b));s.closePath();return add(p,new T.ExtrudeGeometry(s,{depth,bevelEnabled:false}),mat(c,{side:T.DoubleSide}),x,y,z);}
function star(p,c,x,y,z,r=.15){return polygon(p,Array.from({length:10},(_,i)=>{const a=i*Math.PI/5,s=i%2?r*.4:r;return[Math.sin(a)*s,Math.cos(a)*s];}),c,x,y,z);}
function crystal(p,c,x,y,z,r=.08){return add(p,new T.OctahedronGeometry(r),mat(c,{transmission:.35,thickness:.15,roughness:.12}),x,y,z);}
function scatter(p,n,fn,lo=-.9,hi=.15,r=.65){for(let i=0;i<n;i++){const a=i*2.399,y=lo+(hi-lo)*(i+.5)/n;fn(Math.sin(a)*r,y,Math.cos(a)*r,i);}}
function clear(){if(!specimen)return;scene.remove(specimen);const gs=new Set(),ms=new Set(),ts=new Set();specimen.traverse(o=>{if(o.isInstancedMesh)o.dispose();if(o.geometry&&!Object.values(templates).flat().some(t=>t.geometry===o.geometry))gs.add(o.geometry);if(o.material){ms.add(o.material);if(o.material.userData.ownedMap)ts.add(o.material.map);}});gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());ts.forEach(t=>t.dispose());dynamics=[];}
const leafOptions={purple:['#9861c4',.45,0],golden:['#f1bd42',.22,.85],rainbow:['#c7e6db',.13,.25,.4,1],mint:['#a1e9c2',.5,0],coral:['#f29183',.43,0],frost:['#e0f7ff',.7,0],dew:['#609b64',.15,0],jade:['#8fd8a2',.2,0,.6],crystal:['#b9edff',.065,0,.92],amber:['#eea93f',.2,0,.65],prism:['#b6c5ff',.075,.25,.6,1],velvet:['#c1d6ce',1,0],celadon:['#78b7ae',.17,.08],wax:['#dfbc69',.45,0,.3],pearl:['#fff0e1',.12,.3,0,.6],nightdye:['#24265b',.45,.2],redgold:['#b9683c',.2,.85],silver:['#d9e9f8',.17,.95],obsidian:['#171b26',.09,.65],iridescent:['#cf66d3',.1,.4,.2,1],daylight:['#fff1a2',.25,.25]};
function leafMat(base,id){if(!id)return base.clone();const [color,roughness,metalness,transmission=0,iridescence=0]=leafOptions[id]||['#59975b',.5,0];const m=mat(color,{roughness,metalness,transmission,iridescence,thickness:.35,side:T.DoubleSide,normalMap:base.normalMap});if(id==='daylight'){m.emissive.set('#ffe399');m.emissiveIntensity=.6;}if(id==='striped'){const c=document.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d');ctx.fillStyle='#e0e99a';ctx.fillRect(0,0,128,128);ctx.fillStyle='#317f50';for(let i=0;i<128;i+=24)ctx.fillRect(i,0,12,128);m.map=new T.CanvasTexture(c);m.map.colorSpace=T.SRGBColorSpace;m.userData.ownedMap=true;}return m;}
const bodyOptions={honey:['#efc354',.3,.58],nebula:['#8e66d7',.2,.65],fragrant:['#f6e892',.5,0],juicy:['#f4d97c',.07,.45],nectar:['#d99130',.17,.25],milky:['#fff3cf',.5,0],softcore:['#eadcb6',.85,0],delicate:['#e6b095',.3,0],starcore:['#f5e8ad',.1,.94],glassheart:['#b7efed',.07,.96],galaxycore:['#698bbf',.1,.94]};
function bodyMat(base,id){if(!bodyOptions[id])return base.clone();const [color,roughness,transmission]=bodyOptions[id];return mat(color,{roughness,transmission,thickness:.55,ior:1.35,normalMap:base.normalMap,envMapIntensity:1});}
function fruitDetails(p,id){
 if(id==='cotton'){
  const surface=template.find(t=>!t.leaf).geometry.getAttribute('position');
  const fluff=new T.InstancedMesh(new T.SphereGeometry(1,12,9),mat('#fff9ee',{roughness:1,clearcoat:0,sheen:1,sheenColor:new T.Color('#fff5ec'),sheenRoughness:1}),260);
  const dummy=new T.Object3D(),fibres=[],colors=[];let seed=271828;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  for(let i=0;i<260;i++){
   const index=Math.floor(random()*surface.count),center=new T.Vector3().fromBufferAttribute(surface,index),radius=.065+random()*.06;
   dummy.position.copy(center);dummy.scale.set(radius,radius*.88,radius);dummy.updateMatrix();fluff.setMatrixAt(i,dummy.matrix);fluff.setColorAt(i,new T.Color().setRGB(.94+random()*.06,.93+random()*.06,.91+random()*.07));
   for(let j=0;j<30;j++){const z=random()*2-1,a=random()*Math.PI*2,d=new T.Vector3(Math.sqrt(1-z*z)*Math.cos(a),z,Math.sqrt(1-z*z)*Math.sin(a)),from=center.clone().addScaledVector(d,radius*.94),to=center.clone().addScaledVector(d,radius+.012+random()*.027);fibres.push(...from.toArray(),...to.toArray());const c=.86+random()*.14;colors.push(c,c,c,c,c,c);}
  }p.add(fluff);const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(fibres,3));geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));p.add(new T.LineSegments(geometry,new T.LineBasicMaterial({vertexColors:true,transparent:true,opacity:.36,depthWrite:false})));
 }
 if(id==='sugar')scatter(p,28,(x,y,z)=>crystal(p,'#fff7db',x,y,z,.055));
 if(['honey','nectar','juicy','milky'].includes(id))scatter(p,id==='milky'?12:16,(x,y,z)=>{const b=ball(p,id==='juicy'?'#9be3f2':id==='milky'?'#fff9e9':id==='nectar'?'#db8b26':'#ffd76b',x,y,z,id==='milky'?.07:.065);b.scale.y=id==='nectar'?2.2:1.35;},id==='nectar'?-1.1:-.9,id==='nectar'?-.6:.12);
 if(id==='fragrant')for(let i=0;i<3;i++){const r=ring(p,'#bdd795',.16+i*.08,.25+i*.12,.012);dynamics.push({node:r,type:'float',base:r.position.clone(),phase:i});}
 if(id==='nebula'){const r=ring(p,'#b284ef',.8,-.45,.05);r.rotation.z=.3;for(let i=0;i<9;i++)star(p,'#d8baff',Math.sin(i)*.77,-.45,Math.cos(i)*.77,.04);}
 if(id==='starcore'){const s=star(p,'#ffca39',0,-.45,.35,.32);s.material.emissive.set('#ffc44c');s.material.emissiveIntensity=1.6;}
 if(id==='glassheart'){const s=new T.Shape();s.moveTo(0,-.23);s.bezierCurveTo(-.65,.1,-.22,.48,0,.2);s.bezierCurveTo(.22,.48,.65,.1,0,-.23);const m=add(p,new T.ExtrudeGeometry(s,{depth:.08,bevelEnabled:true,bevelSize:.025,bevelThickness:.02,bevelSegments:2,steps:1}),mat('#f49dab',{emissive:'#b3457b',emissiveIntensity:.5}),0,-.4,.24);m.scale.setScalar(.65);}
 if(id==='galaxycore')for(let i=0;i<26;i++){const a=i*.7,r=.06+i*.014;const b=ball(p,i%2?'#a6ebff':'#ffd9ef',Math.sin(a)*r,-.45+Math.cos(a)*r,Math.sin(i*2)*.18,.025);b.material.emissive.copy(b.material.color);b.material.emissiveIntensity=1;}
}
function leafDetails(p,id){if(!['frost','dew','prism','pearl','nightdye'].includes(id))return;scatter(p,12,(x,y,z,i)=>{if(id==='frost'||id==='prism')crystal(p,id==='frost'?'#e4f8ff':['#d887e5','#7cdaeb','#f4d981'][i%3],x,y,z,.065);else ball(p,id==='dew'?'#a5e9ff':id==='pearl'?'#fff5de':'#6cbbea',x,y,z,.04);},.4,1.05,.4);}
function butterfly(p,c,x,y,z,phase){const b=new T.Group();b.position.set(x,y,z);p.add(b);ball(b,'#786344',0,0,0,.04).scale.y=2;const wings=[];for(const side of [-1,1]){const w=new T.Group();b.add(w);for(const [yy,r] of [[.07,.14],[-.09,.1]]){const wing=ball(w,c,side*.12,yy,0,r);wing.scale.set(1,.85,.12);}wings.push(w);}dynamics.push({node:b,type:'butterfly',base:b.position.clone(),phase,wings});}
function flower(p,x,y,z,c='#f1a8c3'){const g=new T.Group();g.position.set(x,y,z);p.add(g);for(let i=0;i<5;i++){const a=i*Math.PI*2/5;ball(g,c,Math.sin(a)*.1,Math.cos(a)*.1,0,.085).scale.z=.28;}ball(g,'#f9da77',0,0,.04,.048);return g;}
function bell(p,c,x,y,z){const g=new T.Group();g.position.set(x,y,z);p.add(g);const m=add(g,new T.ConeGeometry(.12,.19,24,1,true),mat(c,{metalness:.6,side:T.DoubleSide}));m.rotation.z=Math.PI;ball(g,c,0,-.11,0,.038);ring(g,c,.12,-.09,.012);const wire=add(g,new T.CylinderGeometry(.008,.008,.23,6),mat('#d0bc77'),0,.2,0);return g;}
function ornament(p,id,index){const g=new T.Group();g.name='ornament-'+id;p.add(g);const side=index?-1:1;
 if(id==='pinkbow'){
  const bow=new T.Group();bow.name='pink-bow-model';bow.position.set(chosen.accessory.includes('balloon')?side*.72:0,species==='strawberry'?1.65:1.95,.08);g.add(bow);
  for(const t of templates.bow)bow.add(new T.Mesh(t.geometry,t.material.clone()));
  dynamics.push({node:bow,type:'float',base:bow.position.clone(),phase:index});
 }
 if(id==='balloon'){
  const balloon=new T.Group();balloon.position.set(.2,2.12,0);g.add(balloon);
  const skin=ball(balloon,'#ee9bb5',0,0,0,.4);skin.scale.set(.84,1.12,.84);skin.material.roughness=.22;skin.material.clearcoat=1;skin.material.sheen=.3;
  add(balloon,new T.ConeGeometry(.055,.085,12),mat('#d9789a'),0,-.46,0);
  const rope=new T.CatmullRomCurve3([new T.Vector3(-.16,1.05,0),new T.Vector3(.16,1.32,.04),new T.Vector3(.1,1.48,0),new T.Vector3(.2,1.66,0)]);
  add(g,new T.TubeGeometry(rope,24,.009,6,false),mat('#e8d3b3',{roughness:1}));
  dynamics.push({node:balloon,type:'balloon',base:balloon.position.clone(),phase:0});
 }
 if(id==='shiny')for(let i=0;i<7;i++){const a=i*2.399;const s=star(g,'#ffe38a',Math.sin(a)*.92,-.7+i*.26,Math.cos(a)*.83,.07);dynamics.push({node:s,type:'pulse',phase:i});}
 if(id==='punk'){ring(g,'#383945',.71,-.55,.045);for(let i=0;i<12;i++){const a=i*Math.PI/6;const s=add(g,new T.ConeGeometry(.045,.15,5),mat('#c5c5d0',{metalness:.85}),Math.sin(a)*.73,-.55,Math.cos(a)*.73);s.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),new T.Vector3(Math.sin(a),0,Math.cos(a)));}}
 if(id==='classical'){const r=ring(g,'#eac470',.7,-.35,.018);r.rotation.z=.22;const jewel=add(g,new T.OctahedronGeometry(.14),mat('#a14d68'),0,-.6,.75);jewel.scale.y=1.4;}
 if(id==='firefly'||id==='stardust'||id==='glowring'){const n=id==='firefly'?9:id==='stardust'?35:20;for(let i=0;i<n;i++){const a=i*2*Math.PI/n;const b=ball(g,id==='firefly'?'#ffe692':id==='glowring'?'#a5ffc1':i%2?'#b5adff':'#b6efff',Math.sin(a)*.92,id==='glowring'?-.35:-.8+i/n*1.8,Math.cos(a)*.92,id==='stardust'?.02:.036);b.material.emissive.copy(b.material.color);b.material.emissiveIntensity=1;dynamics.push({node:b,type:'float',base:b.position.clone(),phase:i});}if(id==='glowring')ring(g,'#b4f8b3',.92,-.35,.013);}
 if(id==='petals')for(let i=0;i<9;i++){const a=i*2.399;const b=ball(g,'#edafc7',Math.sin(a)*.9,-.7+i*.18,Math.cos(a)*.8,.09);b.scale.set(.6,1,.16);dynamics.push({node:b,type:'float',base:b.position.clone(),phase:i});}
 if(id==='thunder')polygon(g,[[-.04,.3],[-.2,-.02],[-.03,-.01],[-.1,-.3],[.2,.09],[.03,.06],[.14,.3]],'#ffe161',side*.88,-.12,.3);
 if(id==='moon'){const s=new T.Shape();s.absarc(0,0,.22,Math.PI*.22,Math.PI*1.78,false);s.quadraticCurveTo(-.15,0,.22*Math.cos(Math.PI*.22),.22*Math.sin(Math.PI*.22));add(g,new T.ExtrudeGeometry(s,{depth:.035,bevelEnabled:false}),mat('#ffe3a0'),side*.88,.7,0);}
 if(id==='halo'){ring(g,'#ffdf91',.55,1.55,.035);for(let i=0;i<8;i++)star(g,'#fff2b7',Math.sin(i*Math.PI/4)*.55,1.55,Math.cos(i*Math.PI/4)*.55,.045);}
 if(id==='mist')for(let i=0;i<4;i++){const r=ring(g,'#dcebea',.65+i*.1,-1.05+i*.08,.055);r.material.transparent=true;r.material.opacity=.18;dynamics.push({node:r,type:'float',base:r.position.clone(),phase:i});}
 if(id==='raindrop'){for(let i=0;i<5;i++){const b=ball(g,'#9fd9fa',side*.83,.55-i*.2,.2,.05);b.scale.y=1.6;}add(g,new T.CylinderGeometry(.007,.007,.9,6),mat('#b5d5d7'),side*.83,.13,.2);}
 if(id==='leafwhistle'){const l=ball(g,'#81ac60',0,-.4,.77,.18);l.scale.set(.6,1.6,.18);l.rotation.z=.65;for(let i=0;i<3;i++)ball(g,'#284f30',-.055+i*.05,-.47+i*.06,.81,.017);}
 if(id==='flowerknot'){flower(g,0,-.45,.76);for(const side of [-1,1])polygon(g,[[0,0],[side*.18,-.32],[side*.04,-.25]],'#d47f9e',0,-.54,.73);}
 if(id==='butterfly')butterfly(g,'#f6d16e',side*.87,.25,.25,0);
 if(id==='dreambutterfly'){butterfly(g,'#c59deb',side*.93,.5,.1,0);butterfly(g,'#8de1df',-side*.9,-.1,.35,2);}
 if(['breezy','snowbell','goldbell'].includes(id)){const color=id==='breezy'?'#98d5ba':id==='snowbell'?'#daeefa':'#ecc35b';for(let i=0;i<(id==='breezy'?3:1);i++){const b=bell(g,color,side*(.82+i*.08),.25-i*.24,.2);dynamics.push({node:b,type:'float',base:b.position.clone(),phase:i});}if(id==='snowbell')crystal(g,'#c9eaff',side*.82,-.15,.2,.09);if(id==='goldbell')polygon(g,[[0,0],[.045,0],[.045,.36],[0,.36]],'#c36363',side*.82,.35,.2);}
 if(id==='meteorRing'){const r=new T.Group();g.add(r);r.rotation.z=.45;ring(r,'#c9b1f1',1.03,-.1,.014);star(r,'#fff1c4',1.03,-.1,0,.16);for(let i=1;i<10;i++)ball(r,'#b9d9ff',Math.cos(i*.13)*1.03,-.1,Math.sin(i*.13)*1.03,.06*(1-i/12));}
}
function rebuild(){if(!template.length)return;clear();specimen=new T.Group();scene.add(specimen);const body=chosen.fruit[0],leaf=chosen.skin[0];
 const bodyGroup=new T.Group();specimen.add(bodyGroup);
 for(const t of template){if(t.base){if(showBase)specimen.add(new T.Mesh(t.geometry,t.material.clone()));continue;}if(t.leaf){const m=new T.Mesh(t.geometry,leafMat(t.material,leaf));specimen.add(m);}else{const m=new T.Mesh(t.geometry,body==='cotton'?mat('#f5eee0',{roughness:1,clearcoat:0}):bodyMat(t.material,body));bodyGroup.add(m);}}
 if(body==='twin'){for(const m of [...bodyGroup.children]){m.scale.set(.7,.83,.8);m.position.x=-.35;const other=new T.Mesh(m.geometry,m.material.clone());other.scale.copy(m.scale);other.position.x=.35;bodyGroup.add(other);}}
 if(body==='softcore')bodyGroup.scale.set(1.15,.86,1.1);if(body==='delicate')bodyGroup.scale.set(.78,1.03,.8);
 if(body==='abundant')for(const side of [-1,1])for(const t of template.filter(t=>!t.leaf&&!t.base)){const m=new T.Mesh(t.geometry,t.material.clone());m.scale.setScalar(.38);m.position.set(side*.62,-.65,0);bodyGroup.add(m);}
 fruitDetails(specimen,body);leafDetails(specimen,leaf);chosen.accessory.forEach((id,i)=>ornament(specimen,id,i));specimen.scale.setScalar(({mini:.65,plump:1.12,large:1.28,giant:1.48})[chosen.size[0]]||1);
 if(chosen.accessory.some(id=>['balloon','pinkbow'].includes(id))){const size=specimen.scale.x;controls.target.set(0,.6*size,0);camera.position.set(0,1*size,Math.max(9.8,9.8*size));controls.maxDistance=18;}else if(controls.target.y>0){controls.target.set(0,-.1,0);camera.position.set(0,.65,7.7);}controls.update();render();
}
function render(){if(renderer&&!disposed)renderer.render(scene,camera);}
function tick(now){frame=0;if(disposed||document.hidden)return;if(now-last<33){frame=requestAnimationFrame(tick);return;}const dt=last?Math.min(.1,(now-last)/1000):0;last=now;if(motion)elapsed+=dt;controls.autoRotate=rotate;controls.update(dt);for(const d of dynamics){if(d.type==='pulse')d.node.scale.setScalar(.7+.3*Math.sin(elapsed*2+d.phase));else{d.node.position.copy(d.base);d.node.position.y+=Math.sin(elapsed*1.4+d.phase)*.045;if(d.type==='butterfly')d.wings.forEach((w,i)=>w.rotation.y=(i?1:-1)*Math.sin(elapsed*7+d.phase)*.8);}}render();frame=requestAnimationFrame(tick);}
desktopBridge=desktopPreview({getState:()=>({species,chosen,showBase,motion,rotate}),applyState:s=>{if(!s||!templates[s.species]||!s.chosen)return;clear();species=s.species;template=templates[species];showBase=!!s.showBase;motion=!!s.motion;rotate=!!s.rotate;chosen={fruit:[],skin:[],accessory:[],size:[]};for(const slot of Object.keys(chosen))chosen[slot]=(Array.isArray(s.chosen[slot])?s.chosen[slot]:[]).filter(id=>studyTraits[id]&&slotOf(id)===slot).slice(0,slot==='accessory'?2:1);$('species').value=species;rebuild();sync();},render});
buildUI();sync();
$('species').onchange=()=>{clear();species=$('species').value;template=templates[species];rebuild();sync();};$('base-toggle').onclick=()=>{showBase=!showBase;rebuild();sync();};$('reset').onclick=()=>select([]);$('background').onclick=()=>document.querySelector('.viewer').classList.toggle('light');$('rotate').onclick=()=>{rotate=!rotate;sync();};$('motion').onclick=()=>{motion=!motion;sync();};$('front').onclick=()=>{controls.reset();rotate=false;rebuild();sync();};
async function initialize(){try{
 renderer=new T.WebGLRenderer({canvas:$('scene'),alpha:true,antialias:true,powerPreference:'low-power'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1;scene=new T.Scene();camera=new T.PerspectiveCamera(35,1,.1,40);camera.position.set(0,.65,7.7);controls=new OrbitControls(camera,$('scene'));controls.target.set(0,-.1,0);controls.enablePan=false;controls.minDistance=4.7;controls.maxDistance=11;controls.autoRotateSpeed=.7;controls.saveState();
 const pm=new T.PMREMGenerator(renderer),room=new RoomEnvironment();environment=pm.fromScene(room,.04);scene.environment=environment.texture;room.dispose();pm.dispose();scene.add(new T.HemisphereLight('#fff7df','#72938d',1.5));const sun=new T.DirectionalLight('#fff2d9',2.4);sun.position.set(-3,5,4);scene.add(sun);const rim=new T.DirectionalLight('#cee5ff',1.8);rim.position.set(3,3,-2);scene.add(rim);
 const resize=()=>{const b=$('scene').getBoundingClientRect();renderer.setSize(b.width,b.height,false);camera.aspect=b.width/b.height;camera.updateProjectionMatrix();render();};new ResizeObserver(resize).observe($('scene'));resize();
 const gltf=await new GLTFLoader().loadAsync(new URL('../garden/assets/models/pineapple.glb',import.meta.url).href);gltf.scene.updateMatrixWorld(true);const box=new T.Box3().setFromObject(gltf.scene),center=box.getCenter(new T.Vector3()),scale=2.65/box.getSize(new T.Vector3()).y;
 gltf.scene.traverse(o=>{if(!o.isMesh)return;const geometry=o.geometry.clone().applyMatrix4(o.matrixWorld);geometry.translate(-center.x,-center.y,-center.z);geometry.scale(scale,scale,scale);template.push({geometry,material:o.material,leaf:o.material.name==='pineapple-crown'});});const originals=new Set();gltf.scene.traverse(o=>{if(o.geometry)originals.add(o.geometry);});originals.forEach(g=>g.dispose());const repaired=repairPineappleRegions(template);template=repaired.parts;document.body.dataset.regionRepair=JSON.stringify(repaired.stats);if(!template.some(t=>t.leaf)||!template.some(t=>!t.leaf))throw Error('模型未包含独立的果实和叶冠');templates.pineapple=template;const loader=new GLTFLoader();
 const bow=await loader.loadAsync(new URL('../garden/assets/models/pink-bow-tripo.glb',import.meta.url).href);bow.scene.updateMatrixWorld(true);const bowBox=new T.Box3().setFromObject(bow.scene),bowCenter=bowBox.getCenter(new T.Vector3()),bowScale=1.3/bowBox.getSize(new T.Vector3()).x;templates.bow=[];bow.scene.traverse(o=>{if(!o.isMesh)return;const geometry=o.geometry.clone().applyMatrix4(o.matrixWorld);geometry.translate(-bowCenter.x,-bowCenter.y,-bowCenter.z);geometry.scale(bowScale,bowScale,bowScale);templates.bow.push({geometry,material:o.material});o.geometry.dispose();});document.body.dataset.bowTriangles=String(templates.bow.reduce((n,t)=>n+(t.geometry.index?.count||t.geometry.attributes.position.count)/3,0));
 const [fruit,base]=await Promise.all([loader.loadAsync(new URL('../garden/assets/models/strawberry-tripo.glb',import.meta.url).href),loader.loadAsync(new URL('../garden/assets/models/strawberry-base.glb',import.meta.url).href)]);templates.strawberry=[...strawberryParts(fruit.scene),...strawberryBase(base.scene)];document.body.dataset.strawberryRegions=JSON.stringify(templates.strawberry.map(p=>({leaf:!!p.leaf,base:!!p.base,triangles:(p.geometry.index?.count||p.geometry.attributes.position.count)/3})));if(new URLSearchParams(location.search).get('model')==='strawberry'){species='strawberry';template=templates.strawberry;$('species').value=species;}if(new URLSearchParams(location.search).get('accessory')==='pinkbow')chosen.accessory=['pinkbow'];rebuild();sync();document.body.dataset.ready='true';desktopBridge.ready();frame=requestAnimationFrame(tick);
 }catch(e){$('error').hidden=false;$('error').textContent='菠萝预览未能加载：'+e.message;$('status').textContent='载入失败';console.error(e);}}
$('scene').addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)||!camera)return;e.preventDefault();const offset=camera.position.clone().sub(controls.target),s=new T.Spherical().setFromVector3(offset);s.theta+=e.key==='ArrowLeft'?-.15:e.key==='ArrowRight'?.15:0;s.phi=T.MathUtils.clamp(s.phi+(e.key==='ArrowUp'?-.1:e.key==='ArrowDown'?.1:0),.2,Math.PI-.2);camera.position.copy(controls.target).add(new T.Vector3().setFromSpherical(s));controls.update();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;}else if(!frame&&renderer){last=0;frame=requestAnimationFrame(tick);}});
window.addEventListener('pagehide',()=>{disposed=true;cancelAnimationFrame(frame);clear();const textures=new Set();for(const t of Object.values(templates).flat()){t.geometry.dispose();for(const value of Object.values(t.material))if(value?.isTexture)textures.add(value);t.material.dispose();}textures.forEach(t=>t.dispose());environment?.dispose();controls?.dispose();renderer?.dispose();},{once:true});
initialize();
