import * as T from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mountGardenModel3D } from './strawberry-3d.js';

const modelUrl=new URL('./assets/models/pineapple.glb',import.meta.url).href;
let source,pending,unloaded=false,starTexture;
const sharedGeometries=new Set(),sharedTextures=new Set();
function load(){
 if(source)return Promise.resolve(source);
 if(!pending)pending=new GLTFLoader().loadAsync(modelUrl).then(gltf=>{
  source=gltf.scene;
  source.traverse(o=>{if(!o.isMesh)return;sharedGeometries.add(o.geometry);for(const v of Object.values(o.material))if(v?.isTexture)sharedTextures.add(v)});
  if(unloaded){disposeSource();throw Error('Page closed')}
  return source;
 }).catch(error=>{pending=undefined;throw error});
 return pending;
}
function disposeSource(){sharedGeometries.forEach(g=>g.dispose());sharedTextures.forEach(t=>t.dispose());source?.traverse(o=>{if(o.isMesh)o.material.dispose()});sharedGeometries.clear();sharedTextures.clear();source=undefined;}
function skin(base,traits){
 const has=t=>traits.includes(t),common={normalMap:base.normalMap,normalScale:new T.Vector2(.22,.22),metalness:0,envMapIntensity:1.05,clearcoat:.8};
 if(has('crystal')||has('frost')||has('dew'))return new T.MeshPhysicalMaterial({...common,color:'#d9f8ff',roughness:.09,transmission:.94,thickness:.48,ior:1.48,attenuationColor:'#8ae1e5',attenuationDistance:.8,iridescence:.18});
 if(has('jade'))return new T.MeshPhysicalMaterial({...common,color:'#b8efb9',roughness:.2,transmission:.67,thickness:.52,ior:1.36,attenuationColor:'#32aa73',attenuationDistance:.42});
 if(has('rainbow')||has('prism')||has('nebula'))return new T.MeshPhysicalMaterial({...common,color:'#dbcefa',roughness:.1,metalness:.08,transmission:.8,thickness:.5,ior:1.65,iridescence:1,iridescenceIOR:1.6,iridescenceThicknessRange:[180,480]});
 if(has('amber')||has('honey'))return new T.MeshPhysicalMaterial({...common,color:'#f8cc7f',roughness:.18,transmission:.6,thickness:.5,ior:1.45,attenuationColor:'#c18124',attenuationDistance:.7});
 const mat=base.clone();mat.metalness=has('golden')?.65:0;mat.metalnessMap=null;mat.roughness=has('golden')?.3:.7;mat.roughnessMap=null;mat.envMapIntensity=.35;
 for(const [trait,color] of [['purple','#b68ad6'],['mint','#a4d3b4'],['coral','#edacb1'],['golden','#efc45e']])if(has(trait)){mat.map=null;mat.color.set(color)}
 return mat;
}
function starMap(){
 if(starTexture)return starTexture;
 const canvas=document.createElement('canvas');canvas.width=canvas.height=64;const c=canvas.getContext('2d');
 const g=c.createRadialGradient(32,32,0,32,32,30);g.addColorStop(0,'#fffbe5');g.addColorStop(.25,'#ffe6a766');g.addColorStop(1,'#ffe6a700');c.fillStyle=g;c.fillRect(0,0,64,64);
 c.beginPath();c.moveTo(32,4);c.quadraticCurveTo(36,27,59,32);c.quadraticCurveTo(36,37,32,60);c.quadraticCurveTo(28,37,5,32);c.quadraticCurveTo(28,27,32,4);c.fillStyle='#fff3b7';c.fill();
 starTexture=new T.CanvasTexture(canvas);return starTexture;
}
function createScene(template,environment,mode,traits){
 const scene=new T.Scene();scene.environment=environment;
 scene.add(new T.HemisphereLight('#fff8df','#869b89',1.1));
 const sun=new T.DirectionalLight('#fff5e5',1.7);sun.position.set(-3,6,5);scene.add(sun);
 const rim=new T.DirectionalLight('#cbeaf2',.7);rim.position.set(3,3,-2);scene.add(rim);
 const ownedGeometry=new Set(),ownedMaterial=new Set(),root=new T.Group();scene.add(root);
 const add=(geometry,material,parent=root)=>{ownedGeometry.add(geometry);ownedMaterial.add(material);const mesh=new T.Mesh(geometry,material);parent.add(mesh);return mesh};
 if(mode==='plant'){
  const soil=add(new T.SphereGeometry(1,32,12),new T.MeshStandardMaterial({color:'#805a38',roughness:1}));soil.scale.set(.87,.11,.57);soil.position.y=.015;
  for(let i=0;i<7;i++){const a=i*2.4;const clod=add(new T.DodecahedronGeometry(.035,0),new T.MeshStandardMaterial({color:i%2?'#bf9970':'#876342',roughness:1}));clod.position.set(Math.sin(a)*.75,.1,Math.cos(a)*.47);clod.scale.y=.55}
 }
 const fruits=new T.Group();fruits.position.y=mode==='plant'?.1:0;root.add(fruits);
 function specimen(x,scale,rotation){
  const object=template.clone(true);object.scale.setScalar(scale);object.position.x=x;object.rotation.z=rotation;fruits.add(object);
  object.traverse(o=>{if(!o.isMesh)return;const base=o.material;if(base.name==='pineapple-crown'){o.material=base.clone();o.material.metalness=0;o.material.metalnessMap=null;o.material.roughness=.85;o.material.roughnessMap=null;o.material.envMapIntensity=.25}else{o.material=skin(base,traits)}ownedMaterial.add(o.material)});
 }
 if(traits.includes('twin')){specimen(-.4,1.45,-.1);specimen(.4,1.45,.1)}else specimen(0,1.9,0);
 const transparent=traits.some(t=>['crystal','frost','dew','jade','rainbow','prism','nebula','amber','honey'].includes(t));
 if(transparent&&!traits.includes('twin')){const core=add(new T.IcosahedronGeometry(.1,1),new T.MeshStandardMaterial({color:'#f4e7ae',emissive:'#b1d6cf',emissiveIntensity:.22,roughness:.35}),fruits);core.position.y=.52}
 const sparkles=[];
 if(traits.some(t=>['shiny','firefly','stardust','moon','halo','rainbow','prism','nebula','thunder'].includes(t)))for(let i=0;i<8;i++){const material=new T.SpriteMaterial({map:starMap(),color:i%3?'#fff0b8':'#caf1ff',transparent:true,depthWrite:false});ownedMaterial.add(material);const star=new T.Sprite(material);star.scale.setScalar(.085+(i%3)*.025);root.add(star);sparkles.push(star)}
 root.rotation.y=-.12;
 const camera=new T.PerspectiveCamera(34,1,.1,30);camera.position.set(0,2.25,4.8);camera.lookAt(0,.95,0);
 return {scene,camera,moving:[],animate(time){fruits.rotation.y=Math.sin(time*.7)*.045;sparkles.forEach((star,i)=>{const a=i*2.399+time*.2;star.position.set(Math.sin(a)*(.74+i%2*.13),.3+((i*.217+time*.13)%1.9),Math.cos(a)*.62);star.material.opacity=.3+.7*Math.sin(time*1.7+i)**2})},dispose(){ownedGeometry.forEach(g=>g.dispose());ownedMaterial.forEach(m=>m.dispose());scene.clear()}};
}
export function mountPineapple3D(host,{mode='fruit',ratio=1,traits=[]}={}){
 // The paid asset depicts ripe fruit. Keep the established early-growth artwork.
 if(mode==='plant'&&ratio<.8)return false;
 host.dataset.modelLoading='true';
 void load().then(template=>{
  if(unloaded||!host.isConnected)return;
  if(mountGardenModel3D(host,environment=>createScene(template,environment,mode,traits),mode==='plant'?'ripe':'fruit'))host.dataset.model='pineapple';
  delete host.dataset.modelLoading;
 }).catch(error=>{delete host.dataset.modelLoading;host.dataset.modelError='true';console.warn('菠萝模型不可用，保留原画',error)});
 return true;
}
window.addEventListener('pagehide',()=>{unloaded=true;disposeSource();starTexture?.dispose()},{once:true});
