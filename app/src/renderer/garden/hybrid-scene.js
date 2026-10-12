import * as T from 'three';
import { botanicalArt } from './botanical-art';
const sproutUrl=new URL('./assets/sprout.png',import.meta.url).href;
const terrain=(x,z)=>.1+.1*Math.sin(x*.65)+.055*Math.cos(z+x*.4);

/** Real ground geometry with segmented painted plants. No GLB/model identity substitution. */
export function createHybridScene(host,onLayout,onError){
 const renderer=new T.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});
 renderer.setClearColor(0,0);renderer.setPixelRatio(1);renderer.outputColorSpace=T.SRGBColorSpace;
 renderer.domElement.className='hybrid-canvas';host.append(renderer.domElement);
 const scene=new T.Scene(),camera=new T.OrthographicCamera(-10,10,4.6,-.7,.1,160);
 scene.add(new T.HemisphereLight('#fff5df','#91a76b',2));const sun=new T.DirectionalLight('#fff4d9',2);sun.position.set(-6,10,5);scene.add(sun);
 camera.position.set(0,17,45);camera.lookAt(0,0,0);camera.updateMatrixWorld();
 const groundGeometry=new T.PlaneGeometry(180,16,240,18);groundGeometry.rotateX(-Math.PI/2);
 const a=groundGeometry.attributes.position,colors=[];for(let i=0;i<a.count;i++){const x=a.getX(i),z=a.getZ(i)+6;a.setXYZ(i,x,terrain(x,z),z);const c=new T.Color('#97bd6b').lerp(new T.Color('#b7d88b'),.22+.1*Math.sin(x*.4+z));colors.push(c.r,c.g,c.b);}
 groundGeometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));groundGeometry.computeVertexNormals();const groundMaterial=new T.MeshStandardMaterial({vertexColors:true,roughness:1});scene.add(new T.Mesh(groundGeometry,groundMaterial));
 const plants=new T.Group(),tufts=new T.Group();scene.add(plants,tufts);
 const tuftGeometry=new T.SphereGeometry(1,8,6),tuftMaterial=new T.MeshStandardMaterial({color:'#afcf84',roughness:1});
 for(let i=0;i<21;i++)for(let j=0;j<3;j++){const o=new T.Mesh(tuftGeometry,tuftMaterial);o.userData.ratio=(i/20-.5)*.97;o.userData.j=j;o.scale.set(.045,.11+(j===1?.03:0),.03);o.rotation.z=(j-1)*.5;tufts.add(o);}
 let disposed=false,revision=0,frame=0,last=0,width=1,height=1,worldWidth=20,nodes=[],hits=[],key='',data=[],frames=0;
 const textures=new Map(),sources=new Map(),pulses=new Map();const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 function request(){if(!disposed&&!frame)frame=requestAnimationFrame(draw);}
 function resize(){width=Math.max(1,host.clientWidth);height=Math.max(1,host.clientHeight);worldWidth=5.3*width/height;camera.left=-worldWidth/2;camera.right=worldWidth/2;camera.updateProjectionMatrix();renderer.setSize(width,height,false);for(const n of nodes)place(n);for(const t of tufts.children){const x=t.userData.ratio*worldWidth+(t.userData.j-1)*.08;t.position.set(x,terrain(x,1)+.1,1);}request();}
 function place(n){const x=(data.length===1?0:(n.order/(data.length-1)-.5)*.76)*worldWidth,z=n.order%2?.12:-.28;n.wrap.position.set(x,terrain(x,z),z);}
 function synthetic(stage){const c=document.createElement('canvas');c.width=260;c.height=320;const g=c.getContext('2d');
  if(stage==='empty'){c.height=90;g.strokeStyle='#e0edbd';g.lineWidth=7;g.setLineDash([8,9]);g.beginPath();g.ellipse(130,45,88,27,0,0,Math.PI*2);g.stroke();g.setLineDash([]);g.lineCap='round';g.beginPath();g.moveTo(111,45);g.lineTo(149,45);g.moveTo(130,26);g.lineTo(130,64);g.stroke();}
  else{g.fillStyle='#b5a7ce';g.beginPath();g.ellipse(130,174,76,101,0,0,Math.PI*2);g.fill();g.fillStyle='#a1c57b';g.beginPath();g.ellipse(82,247,50,23,.6,0,Math.PI*2);g.ellipse(177,247,50,23,-.6,0,Math.PI*2);g.fill();g.fillStyle='#fff4df';g.font='bold 83px sans-serif';g.textAlign='center';g.fillText('?',130,199);}
  return c;
 }
 async function source(url){if(!sources.has(url))sources.set(url,(async()=>{const im=new Image();im.src=url;await im.decode();const c=document.createElement('canvas');const scale=Math.min(1,700/Math.max(im.width,im.height));c.width=Math.ceil(im.width*scale);c.height=Math.ceil(im.height*scale);const g=c.getContext('2d',{willReadFrequently:true});g.drawImage(im,0,0,c.width,c.height);const pixels=g.getImageData(0,0,c.width,c.height).data;let left=c.width,top=c.height,right=0,bottom=0;for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++)if(pixels[(y*c.width+x)*4+3]>35){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}const cut=document.createElement('canvas');cut.width=Math.max(1,right-left+1);cut.height=Math.max(1,bottom-top+1);cut.getContext('2d').drawImage(c,left,top,cut.width,cut.height,0,0,cut.width,cut.height);return cut;})());return sources.get(url);}
 function filter(p){if(p.dyeHue!==undefined)return `hue-rotate(${p.dyeHue}deg)`;if(p.traits.includes('golden'))return 'sepia(1) saturate(2.5)';if(p.traits.includes('purple'))return 'hue-rotate(260deg)';if(p.traits.includes('jade')||p.traits.includes('mint'))return 'hue-rotate(75deg) saturate(.7)';if(p.traits.includes('frost')||p.traits.includes('crystal'))return 'saturate(.35) brightness(1.13)';if(p.traits.includes('nebula'))return 'hue-rotate(225deg) saturate(.85)';if(p.traits.includes('coral'))return 'hue-rotate(325deg)';return 'none';}
 async function texture(p){const special=['empty','hidden'].includes(p.stage),url=special?p.stage:p.stage==='sprout'?sproutUrl:botanicalArt(p.species,'plant');const id=url+'|'+filter(p);
  if(textures.has(id))return textures.get(id);const image=special?synthetic(p.stage):await source(url);if(disposed)return null;if(textures.has(id))return textures.get(id);
  const c=document.createElement('canvas');c.width=image.width;c.height=image.height;const g=c.getContext('2d');g.filter=filter(p);g.drawImage(image,0,0);if(p.traits.includes('rainbow')){g.filter='none';g.globalCompositeOperation='source-atop';const gradient=g.createLinearGradient(0,0,c.width,c.height);['#eec7e9','#b7d6ed','#e5e7b1','#f1c2b6'].forEach((color,i)=>gradient.addColorStop(i/3,color));g.fillStyle=gradient;g.globalAlpha=.5;g.fillRect(0,0,c.width,c.height);}const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=2;const result={tex,ratio:c.width/c.height,id};textures.set(id,result);return result;
 }
 function clear(){for(const n of nodes){n.wrap.traverse(o=>{o.geometry?.dispose();if(o.material)o.material.dispose();});plants.remove(n.wrap);}nodes=[];hits=[];}
 async function update(next){const k=JSON.stringify(next);if(k===key)return;key=k;data=next;const version=++revision;host.dataset.ready='loading';
  try{const art=await Promise.all(next.map(texture));if(disposed||version!==revision)return;clear();const keep=new Set(art.filter(Boolean).map(a=>a.id));for(const[id,a]of textures)if(!keep.has(id)){a.tex.dispose();textures.delete(id);}
   next.forEach((p,order)=>{const a=art[order];if(!a)return;const wrap=new T.Group();plants.add(wrap);const base=p.stage==='empty'?.48:p.stage==='sprout'?.8:p.stage==='hidden'?2.2:p.stage==='young'?1.3+Math.min(1,p.ratio)*1.4:2.95;let h=base*(p.traits.includes('giant')?1.16:p.traits.includes('mini')?.72:1);h=Math.min(h,worldWidth/Math.max(3,next.length)*.85/a.ratio);const w=h*a.ratio,sway={value:0};
    const geometry=new T.PlaneGeometry(w,h,8,16);geometry.translate(0,h/2,0);const material=new T.MeshBasicMaterial({map:a.tex,transparent:true,alphaTest:.06,side:T.DoubleSide});material.onBeforeCompile=shader=>{shader.uniforms.sway=sway;shader.vertexShader='uniform float sway;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n transformed.x += sway * pow(uv.y,2.0);');};material.customProgramCacheKey=()=> 'hybrid-garden-sway';wrap.add(new T.Mesh(geometry,material));
    if(p.traits.includes('twin')){const twin=new T.Mesh(geometry.clone(),material.clone());twin.position.x=w*.36;twin.position.z=-.06;twin.scale.setScalar(.8);wrap.add(twin);}
    if(p.traits.some(t=>['shiny','rainbow','crystal','nebula'].includes(t)))for(let i=0;i<4;i++){const dot=new T.Mesh(new T.SphereGeometry(.035,6,4),new T.MeshBasicMaterial({color:['#fff1ad','#ebd2f5','#e5f1db','#c8e8ef'][i]}));dot.position.set(Math.sin(i*2.1)*w*.5,h*(.38+i*.14),.12);wrap.add(dot);}
    const n={...p,order,wrap,h,w,sway};nodes.push(n);place(n);
   });host.dataset.stages=JSON.stringify(next);host.dataset.ready='true';host.dataset.plants=String(nodes.length);request();
  }catch(e){if(version===revision&&!disposed){host.dataset.ready='error';onError(String(e));}}
 }
 function project(v){const p=v.clone().project(camera);return{x:(p.x+1)*width/2,y:(1-p.y)*height/2};}
 function draw(now){frame=0;if(disposed)return;if(now-last<55){request();return;}last=now;const t=now/1000;hits=[];let moving=false;
  for(const n of nodes){const pulse=Math.max(0,1-(now-(pulses.get(n.index)??-1e5))/1000);moving ||=pulse>0;const wind=!reduced.matches&&n.stage!=='empty';n.sway.value=(wind?Math.sin(t*1.6+n.order)*.07:0)+Math.sin(pulse*17)*pulse*.15;n.wrap.rotation.z=Math.sin(pulse*17)*pulse*.045;
   const bottom=project(n.wrap.position),top=project(n.wrap.position.clone().add(new T.Vector3(0,n.h,0))),w=n.w/worldWidth*width;
   hits.push({index:n.index,x:bottom.x-w*.58,y:top.y,width:w*1.16,height:Math.max(22,bottom.y-top.y),baseline:bottom.y,center:bottom.x});
  }
  host.dataset.hits=JSON.stringify(hits);renderer.render(scene,camera);frames++;host.dataset.frames=String(frames);
  onLayout({width,height,plots:hits.map(h=>({index:h.index,x:h.center,y:h.baseline}))});
  if(!reduced.matches||moving)request();
 }
 function pick(x,y){return [...hits].reverse().find(h=>x>=h.x&&x<=h.x+h.width&&y>=h.y&&y<=h.y+h.height)?.index??null;}
 function shake(index){pulses.set(index,performance.now());host.dataset.lastShake=String(index);request();}
 const observer=new ResizeObserver(resize);observer.observe(host);reduced.addEventListener('change',request);resize();
 return {update,shake,pick,get hits(){return hits;},get info(){return {...renderer.info.memory,frames};},dispose(){disposed=true;revision++;cancelAnimationFrame(frame);observer.disconnect();reduced.removeEventListener('change',request);clear();textures.forEach(a=>a.tex.dispose());textures.clear();sources.clear();groundGeometry.dispose();groundMaterial.dispose();tuftGeometry.dispose();tuftMaterial.dispose();renderer.dispose();renderer.domElement.remove();}};
}
