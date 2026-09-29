import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
// Original parametric meshes. Every model has a floor-centred origin and named parts.
let materials;
function texture(kind){
  const c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d');
  x.fillStyle=kind==='wood'?'#a48258':kind==='cloth'?'#bab5a0':'#a5a69b';x.fillRect(0,0,256,256);
  let seed=419;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  if(kind==='wood')for(let i=0;i<190;i++){x.strokeStyle=`rgba(${rnd()>.5?'49,29,12':'243,212,145'},${.025+rnd()*.1})`;x.lineWidth=.4+rnd()*1.4;x.beginPath();const y=rnd()*256;x.moveTo(0,y);for(let k=0;k<=256;k+=8)x.lineTo(k,y+Math.sin(k*.035+i)*2.5);x.stroke();}
  else if(kind==='cloth'){for(let i=0;i<256;i+=2){x.strokeStyle=i%4?'#ffffff22':'#34281920';x.beginPath();x.moveTo(i,0);x.lineTo(i,256);x.moveTo(0,i);x.lineTo(256,i);x.stroke();}}
  else for(let i=0;i<2600;i++){x.fillStyle=`rgba(55,49,42,${rnd()*.1})`;x.fillRect(rnd()*256,rnd()*256,rnd()*3,rnd()*2);}
  const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=4;return t;
}
export function mats(){if(materials)return materials;const wood=texture('wood'),cloth=texture('cloth'),stone=texture('stone');
 const m=(color,roughness=.8,map)=>new T.MeshStandardMaterial({color,roughness,map,bumpMap:map,bumpScale:map===wood?.012:.004});
 return materials={wood:m('#745032',.64,wood),edge:m('#ab8150',.64,wood),dark:m('#302b20',.9,wood),green:m('#647851',.97,cloth),cream:m('#e0d0a0',1,cloth),rug:m('#3f6251',1,cloth),gold:m('#c8a969',.65),ceramic:m('#9bae84',.28),porcelain:m('#ead8b0',.28),soil:m('#322a1e'),terra:m('#ac6740',.85),leaf:m('#375537',.7),vein:m('#75814b'),stone:m('#868778',1,stone),wall:m('#b0a38a',1,stone),iron:m('#292b25',.65),paper:new T.MeshStandardMaterial({color:'#ffe4a6',roughness:1,emissive:'#ffae3f',emissiveIntensity:.65})};
}
function mesh(g,geo,mat,x=0,y=0,z=0,name='part'){const o=new T.Mesh(geo,mat);o.position.set(x,y,z);o.name=name;o.castShadow=true;o.receiveShadow=true;g.add(o);return o;}
function box(g,w,h,d,x,y,z,mat,r=.025,name='joinery'){return mesh(g,new RoundedBoxGeometry(w,h,d,2,Math.min(r,w/3,h/3,d/3)),mat,x,y,z,name);}
function cyl(g,r1,r2,h,x,y,z,mat,n=24){return mesh(g,new T.CylinderGeometry(r1,r2,h,n),mat,x,y,z);}
function ball(g,x,y,z,sx,sy,sz,mat){const b=mesh(g,new T.SphereGeometry(1,20,12),mat,x,y,z);b.scale.set(sx,sy,sz);return b;}
function rod(g,a,b,r,mat){const av=new T.Vector3(...a),bv=new T.Vector3(...b),v=bv.clone().sub(av);const o=mesh(g,new T.CylinderGeometry(r,r,v.length(),8),mat);o.position.copy(av.add(bv).multiplyScalar(.5));o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v.normalize());return o;}
function ring(g,r,t,x,y,z,mat){const o=mesh(g,new T.TorusGeometry(r,t,8,32),mat,x,y,z);return o;}
function leaf(g,base,tip,width,mat){const v=new T.Vector3(...tip).sub(new T.Vector3(...base)),verts=[],indices=[],uv=[];for(let i=0;i<=14;i++)for(let j=0;j<=6;j++){const t=i/14,u=j/3-1;verts.push(u*width*Math.sin(Math.PI*t)**.7,t*v.length(),Math.sin(Math.PI*t)*.09*(1-Math.abs(u)));uv.push(j/6,t);if(i<14&&j<6){const k=i*7+j;indices.push(k,k+7,k+1,k+1,k+7,k+8);}}const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(verts,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();mat.side=T.DoubleSide;const o=mesh(g,geo,mat,...base,'curved-leaf');o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v.normalize());rod(g,base,tip,.009,mats().vein);return o;}
function cup(g,x,y,z){const m=mats();cyl(g,.072,.052,.09,x,y+.045,z,m.ceramic);cyl(g,.06,.06,.004,x,y+.089,z,m.soil);const r=ring(g,.067,.008,x,y+.09,z,m.ceramic);r.rotation.x=Math.PI/2;}
function teaSet(g,y){const m=mats();box(g,.91,.055,.46,-.13,y+.028,0,m.dark,.018,'tea-tray');for(const z of [-.22,.22])box(g,.94,.045,.026,-.13,y+.065,z,m.edge);cup(g,-.4,y+.06,.09);cup(g,-.15,y+.06,.09);ball(g,.12,y+.16,-.04,.115,.11,.1,m.ceramic);cyl(g,.077,.085,.025,.12,y+.262,-.04,m.ceramic);ball(g,.12,y+.287,-.04,.021,.026,.021,m.gold);rod(g,[.2,y+.16,-.04],[.32,y+.23,-.04],.03,m.ceramic);ring(g,.075,.019,.01,y+.17,-.04,m.ceramic);}
function plant(g,scale=1){const m=mats(),p=new T.Group();g.add(p);p.scale.setScalar(scale);
 const profile=[[.17,0],[.26,.06],[.29,.24],[.22,.4],[.22,.44]].map(([x,y])=>new T.Vector2(x,y));mesh(p,new T.LatheGeometry(profile,28),m.terra);cyl(p,.21,.21,.02,0,.418,0,m.soil);
 for(let i=0;i<9;i++){const a=i*2.399,h=.9+(i%3)*.25,r=.38+(i%2)*.16;const b=[Math.sin(a)*.14,.6+(i%3)*.18,Math.cos(a)*.14],t=[Math.sin(a)*r,h,Math.cos(a)*r];rod(p,[0,.42,0],b,.012,m.leaf);leaf(p,b,t,.12+(i%2)*.045,m.leaf);}return p;}
function sofa(variant){const g=new T.Group(),m=mats(),fabric=variant?m.cream:m.green;
 for(const x of [-1.1,1.1])for(const z of [-.37,.37])box(g,.16,.26,.16,x,.13,z,m.wood,.025,'leg');
 box(g,2.65,.19,1.02,0,.33,0,m.wood,.05,'frame');box(g,2.5,.73,.13,0,.8,-.46,m.wood,.04,'back-frame');
 for(const x of [-.62,.62]){box(g,1.19,.22,.84,x,.535,.02,fabric,.09,'seat-cushion');const b=box(g,1.18,.68,.2,x,.9,-.36,fabric,.08,'back-cushion');b.rotation.x=-.07;
 const pillow=box(g,.45,.45,.15,x, .91,-.17,variant?m.green:m.cream,.075,'loose-pillow');pillow.rotation.set(-.15,0,x<0?-.12:.12);
 // Raised embroidered leaf motif sits on the front of each pillow.
 const embroidery=new T.Group();embroidery.position.set(x,.91,-.073);for(let j=0;j<4;j++){const a=j*Math.PI/2+.4;const o=ball(embroidery,Math.sin(a)*.055,Math.cos(a)*.065,0,.027,.052,.002,variant?m.cream:m.green);o.rotation.z=-a;}g.add(embroidery);}
 for(const x of [-1.26,1.26]){box(g,.12,.44,.88,x,.6,0,m.wood);box(g,.19,.1,1.04,x,.84,.015,m.edge,.035,'armrest');for(const z of [-.3,0,.3])box(g,.07,.31,.045,x,.59,z,m.edge);}
 return g;}
function table(round){const g=new T.Group(),m=mats();if(round){cyl(g,.61,.61,.12,0,.52,0,m.wood,48);cyl(g,.57,.57,.025,0,.59,0,m.edge,48);for(let i=0;i<3;i++){const a=i*Math.PI*2/3;rod(g,[Math.sin(a)*.36,.02,Math.cos(a)*.36],[Math.sin(a)*.27,.5,Math.cos(a)*.27],.065,m.wood);}teaSet(g,.61);}
 else{for(const x of [-.79,.79])for(const z of [-.35,.35])box(g,.15,.4,.15,x,.2,z,m.wood);box(g,1.85,.13,.88,0,.36,0,m.wood,.025,'apron');box(g,2,.13,1.05,0,.49,0,m.edge,.045,'tabletop');box(g,.67,.012,1.03,.24,.563,0,m.green,.004,'runner');box(g,.67,.2,.017,.24,.47,.528,m.green,.003,'runner-drop');teaSet(g,.575);ball(g,.72,.7,-.16,.1,.145,.1,m.porcelain);for(let i=0;i<5;i++){const a=i*1.5;rod(g,[.72,.76,-.16],[.72+Math.cos(a)*.08, .97+(i%2)*.08,-.16+Math.sin(a)*.08],.006,m.leaf);for(let j=0;j<5;j++)ball(g,.72+Math.cos(a)*.08+Math.cos(j*1.256)*.035,.98+(i%2)*.08+Math.sin(j*1.256)*.035,-.13+Math.sin(a)*.08,.025,.025,.013,m.cream);}}
 return g;}
function cabinet(){const g=new T.Group(),m=mats();box(g,1.55,.78,.68,0,.43,0,m.wood,.03,'cabinet');for(const x of [-.38,.38]){box(g,.69,.6,.04,x,.46,.36,m.edge);for(const dx of [-.29,.29])box(g,.035,.54,.025,x+dx,.46,.39,m.dark);ball(g,x+(x<0?.2:-.2),.49,.403,.018,.018,.025,m.gold);}box(g,1.65,.11,.75,0,.88,0,m.edge);
 for(const x of [-.74,.74])box(g,.085,1.45,.3,x,1.56,-.23,m.wood);for(const y of [1.2,1.72,2.2])box(g,1.56,.075,.35,0,y,-.2,m.edge);
 for(let i=0;i<4;i++){const x=-.56+i*.28;cyl(g,.08,.085,.19,x,1.85,-.2,i%2?m.ceramic:m.terra);cyl(g,.085,.08,.025,x,1.96,-.2,m.dark);}
 for(let i=0;i<3;i++)box(g,.33,.09,.25,.49,1.28+i*.1,-.18,m.cream);
 box(g,.43,.06,.4,-.43,.97,.07,m.iron);ball(g,-.43,1.12,.07,.21,.16,.18,m.iron);ring(g,.15,.02,-.43,1.3,.07,m.gold);cyl(g,.1,.12,.025,-.43,1.28,.07,m.gold);cup(g,.14,.94,.18);cup(g,.38,.94,.18);
 const p=plant(g,.38);p.position.set(-.46,2.24,-.2);return g;}
function lantern(){const g=new T.Group(),m=mats();for(const y of [.055,.57])box(g,.48,.09,.48,0,y,0,m.wood,.045);box(g,.34,.45,.34,0,.31,0,m.paper,.025,'glowing-paper');for(const x of [-.18,.18])for(const z of [-.18,.18])box(g,.037,.51,.037,x,.32,z,m.dark,.008);for(const y of [.2,.42]){box(g,.4,.024,.4,0,y,0,m.edge,.008);}const roof=mesh(g,new T.ConeGeometry(.36,.15,4),m.wood,0,.68,0);roof.rotation.y=Math.PI/4;ring(g,.065,.013,0,.83,0,m.gold);return g;}
function rug(){const g=new T.Group(),m=mats();box(g,3.7,.018,2.6,0,.012,0,m.rug,.007,'woven-rug');for(const x of [-1.65,1.65])box(g,.025,.003,2.3,x,.024,0,m.gold,.001);for(const z of [-1.13,1.13])box(g,3.32,.003,.025,0,.024,z,m.gold,.001);for(const x of [-1.5,1.5])for(const z of [-.98,.98]){box(g,.24,.003,.025,x,.025,z,m.gold,.001);box(g,.025,.003,.18,x+Math.sign(x)*.11,.025,z-Math.sign(z)*.08,m.gold,.001);}return g;}
export function createModel(id){let g;if(id==='jade-sofa'||id==='walnut-bench')g=sofa(id==='walnut-bench');else if(id==='tea-table'||id==='round-table')g=table(id==='round-table');else if(id==='tea-cabinet')g=cabinet();else if(id==='broadleaf'){g=new T.Group();plant(g,1.45);}else if(id==='lantern')g=lantern();else if(id==='jade-rug')g=rug();else throw Error('Unknown furniture: '+id);g.name=id;g.userData={assetId:id,units:'metres',front:'+Z',origin:'floor-centre',revision:1};return g;}
export function createShell(onReady=()=>{}){const g=new T.Group(),m=mats();
 box(g,9.25,.22,5.55,0,-.14,0,m.dark,.065,'foundation');
 for(let x=0;x<12;x++)for(let z=0;z<8;z++)box(g,.747,.06,.673,-4.125+x*.75,-.005,-2.365+z*.675,m.stone,.012,'stone-tile');
 // Lower panelling, solid side walls and a genuinely open central window.
 box(g,9,.95,.18,0,.475,-2.66,m.wood);for(let x=-4.3;x<4.5;x+=.43)box(g,.024,.82,.028,x,.48,-2.552,m.edge,.006);
 for(const x of [-3.65,3.65]){box(g,1.7,2.18,.18,x,2.03,-2.66,m.wall);for(let y=1.08;y<3;y+=.38)for(let j=0;j<3;j++)box(g,.5,.32,.05,x-.55+j*.55+(Math.round(y*10)%2)*.08,y,-2.55,m.wall,.035,'stone-block');}
 for(const x of [-4.48,4.48]){const wall=box(g,.17,3.1,5.4,x,1.55,0,m.wall,.025,'side-wall');wall.userData.cutaway=true;for(const z of [-2.48,-.5,2.48])box(g,.22,3.12,.2,x,1.56,z,m.wood);box(g,.19,.75,5.4,x,.4,0,m.wood);box(g,.25,.16,5.5,x,3.05,0,m.edge);}
 for(const y of [.98,2.9])box(g,5.8,.13,.18,0,y,-2.6,m.dark);for(let x=-2.86;x<3;x+=1.43){box(g,.085,1.95,.12,x,1.95,-2.59,m.green);}
 for(let x=-2.72;x<2.8;x+=.27)for(const y of [1.1,2.77]){box(g,.16,.025,.075,x,y,-2.56,m.green,.003);box(g,.026,.14,.075,x-.068,y+(y>2?-.057:.057),-2.56,m.green,.003);}
 box(g,9.28,.22,.24,0,3.09,-2.6,m.edge);for(const x of [-2.86,2.86])box(g,.14,3,.18,x,1.5,-2.52,m.wood);
 // Only the distant window landscape is a painting; architecture/furniture remain geometry.
 const garden=new T.TextureLoader().load(new URL('./art/rain-garden.png',import.meta.url).href,onReady);garden.colorSpace=T.SRGBColorSpace;
 const outside=mesh(g,new T.PlaneGeometry(5.8,2.02),new T.MeshBasicMaterial({map:garden,color:'#bdd2db',side:T.DoubleSide}),0,1.95,-2.72,'window-landscape');outside.castShadow=false;
 for(const x of [-3.7,3.7]){const l=lantern();l.scale.setScalar(.65);l.position.set(x,1.95,-2.33);g.add(l);}
 return g;
}
/** Batch static surfaces per material for display. Source/export meshes retain named parts. */
export function batchModel(root){const output=new T.Group(),groups=new Map();root.updateMatrixWorld(true);root.traverse(o=>{if(!o.isMesh)return;const key=o.material;const geo=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();geo.applyMatrix4(o.matrixWorld);for(const name of Object.keys(geo.attributes))if(!['position','normal','uv'].includes(name))geo.deleteAttribute(name);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(geo);});
 for(const [mat,geometries]of groups){const geo=mergeGeometries(geometries,false),o=new T.Mesh(geo,mat);o.castShadow=!mat.isMeshBasicMaterial;o.receiveShadow=true;output.add(o);geometries.forEach(g=>g.dispose());}output.name=root.name;output.userData={...root.userData};const originals=new Set();root.traverse(o=>{if(o.geometry)originals.add(o.geometry);});originals.forEach(g=>g.dispose());return output;}
