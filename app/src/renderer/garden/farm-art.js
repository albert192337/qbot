import * as T from 'three';

// Shared, deterministic art resources. Dispose once with the scene.
export function createFarmArt() {
  const resources = [];
  const own = value => { resources.push(value); return value; };
  const noise = n => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };
  function texture(kind) {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
    const c = canvas.getContext('2d');
    c.fillStyle = kind === 'grass' ? '#79965a' : '#806044'; c.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 9000; i++) {
      const v = noise(i + 1), x = noise(i + 2) * 256, y = noise(i + 3) * 256;
      c.fillStyle = kind === 'grass' ? (v > .5 ? '#b9c980' : '#4b713e') : (v > .5 ? '#b59974' : '#503d30');
      c.globalAlpha = .12 + v * .25; c.fillRect(x, y, 1 + v * 3, kind === 'grass' ? 2 + v * 5 : 1 + v * 2);
    }
    const t = own(new T.CanvasTexture(canvas)); t.colorSpace = T.SRGBColorSpace;
    t.wrapS = t.wrapT = T.RepeatWrapping; return t;
  }
  function groundMaterial(kind) {
    const map = texture(kind), m = own(new T.MeshStandardMaterial({ color: '#ffffff', roughness: 1 }));
    m.onBeforeCompile = s => {
      s.uniforms.groundMap = {value: map};
      s.vertexShader = 'varying vec3 groundPoint;\n' + s.vertexShader;
      s.vertexShader = s.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\ngroundPoint=(modelMatrix*vec4(position,1.0)).xyz;');
      s.fragmentShader = 'uniform sampler2D groundMap; varying vec3 groundPoint;\n' + s.fragmentShader;
      s.fragmentShader = s.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb*=texture2D(groundMap,groundPoint.xz*1.7).rgb;');
    };
    m.customProgramCacheKey = () => `farm-ground-${kind}`; return m;
  }
  const stones = Array.from({length: 6}, (_, i) => {
    const shape = new T.Shape();
    for(let k=0;k<7;k++) { const a=k/6*Math.PI*2, r=.8+noise(i*20+k%6)*.2; const x=Math.cos(a)*r,z=Math.sin(a)*r; k?shape.lineTo(x,z):shape.moveTo(x,z); }
    const g = own(new T.ExtrudeGeometry(shape,{depth:.055,bevelEnabled:true,bevelSize:.035,bevelThickness:.025,bevelSegments:2,steps:1})); g.rotateX(-Math.PI/2); return g;
  });
  const stoneMats = ['#b6b4a1','#c4c0ac','#a6ada0'].map(color => own(new T.MeshStandardMaterial({color,roughness:1})));
  function paths(world, layout) {
    const positions=[];
    const lane=(axis,fixed,length)=>{
      for(let t=-length/2+.25,i=0;t<length/2-.2;t+=.32,i++){
        const offset=(noise(i*7+fixed)-.5)*.065;
        positions.push(axis==='x'?[fixed+offset,t]:[t,fixed+offset]);
      }
    };
    for(let x=-layout.width/2+2.625;x<layout.width/2-.4;x+=2.75)lane('x',x,layout.depth);
    for(let z=-layout.depth/2+2.625;z<layout.depth/2-.4;z+=2.75)lane('z',z,layout.width);
    positions.forEach(([x,z],i)=>{
      // Keep crossing stones apart instead of drawing two intersecting strips.
      if(positions.slice(0,i).some(([a,b])=>Math.hypot(a-x,b-z)<.23))return;
      const o=new T.Mesh(stones[i%6],stoneMats[i%3]);o.position.set(x,.085,z);o.scale.set(.19+noise(i)*.025,1,.14+noise(i+8)*.025);o.rotation.y=(noise(i+4)-.5)*.6;world.add(o);
    });
  }
  const orb=own(new T.SphereGeometry(1,32,24)), crystal=own(new T.OctahedronGeometry(1));
  const ring=own(new T.RingGeometry(.34,.36,64));
  const mysteryMat=own(new T.MeshPhysicalMaterial({color:'#c8db70',roughness:.33,metalness:.12,clearcoat:1}));
  const glowMat=own(new T.MeshBasicMaterial({color:'#f9e7aa',transparent:true,opacity:.55,side:T.DoubleSide,depthWrite:false}));
  const crystalMat=own(new T.MeshPhysicalMaterial({color:'#a5e6ff',metalness:.22,roughness:.16,clearcoat:1,emissive:'#42688b',emissiveIntensity:.25}));
  function glyph(text) {
    const canvas=document.createElement('canvas');canvas.width=canvas.height=128;const c=canvas.getContext('2d');
    const gradient=c.createLinearGradient(20,12,105,118);['#fff8bd','#a4f3e6','#d8b5ff','#fff2bd'].forEach((v,i)=>gradient.addColorStop(i/3,v));
    c.font=`bold ${text==='?'?104:88}px Georgia`;c.textAlign='center';c.textBaseline='middle';c.shadowColor='#fff7d3';c.shadowBlur=10;c.fillStyle=gradient;
    if(text==='?'){c.strokeStyle='#76845e';c.lineWidth=3;c.strokeText(text,64,68);}c.fillText(text,64,68);
    const map=own(new T.CanvasTexture(canvas));map.colorSpace=T.SRGBColorSpace;return own(new T.SpriteMaterial({map,depthWrite:false,transparent:true}));
  }
  const question=glyph('?'),star=glyph('✦');
  function sprite(parent,mat,x,y,z,size){const s=new T.Sprite(mat);s.position.set(x,y,z);s.scale.setScalar(size);parent.add(s);}
  function effects(parent,traits,hidden=false) {
    if(!hidden&&!traits.some(t=>['crystal','frost','dew','rainbow','prism','nebula','shiny','golden','purple','jade'].includes(t)))return;
    const halo=new T.Mesh(ring,glowMat);halo.rotation.x=-Math.PI/2;halo.position.y=.05;halo.scale.setScalar(1.25);parent.add(halo);
    for(let i=0;i<5;i++){const a=i*2.4;sprite(parent,star,Math.cos(a)*.4,.3+noise(i)*.8,Math.sin(a)*.34,.09+noise(i+5)*.09);}
    if(hidden){
      const fruit=new T.Mesh(orb,mysteryMat);fruit.position.y=.53;fruit.scale.set(.32,.34,.32);parent.add(fruit);
      sprite(parent,question,.37,.85,.28,.5);sprite(parent,question,-.35,.49,.26,.32);return;
    }
    if(traits.some(t=>['crystal','frost','dew','prism'].includes(t)))for(let i=0;i<5;i++){
      const a=i*2.4,o=new T.Mesh(crystal,crystalMat);o.position.set(Math.cos(a)*.32,.12,Math.sin(a)*.32);o.scale.set(.07,.19+noise(i)*.15,.07);o.rotation.z=Math.cos(a)*.3;parent.add(o);
    }
  }
  return {groundMaterial,paths,effects,dispose(){resources.forEach(r=>r.dispose());}};
}
