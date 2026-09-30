import * as T from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { createFarmArt } from './farm-art';
import { gardenSceneLayout } from '../../shared/garden-scene-layout';

const urls = {
  pineapple: new URL('./assets/models/pineapple.glb', import.meta.url).href,
  strawberry: new URL('./assets/models/strawberry-tripo.glb', import.meta.url).href,
  base: new URL('./assets/models/strawberry-base.glb', import.meta.url).href,
};

/** One renderer for the entire farm. Paint on changes only; no idle animation loop. */
export function createFarmScene(onLayout, onError) {
  const element = document.createElement('section'); element.className = 'farm-scene';
  element.setAttribute('aria-label', '立体花园');
  const renderer = new T.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
  renderer.setClearColor(0, 0); renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.outputColorSpace = T.SRGBColorSpace; renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.domElement.className = 'farm-canvas'; element.append(renderer.domElement);
  const scene = new T.Scene(), world = new T.Group(); scene.add(world);
  const art = createFarmArt();
  scene.add(new T.HemisphereLight('#fffce5', '#829476', 1.6));
  const sun = new T.DirectionalLight('#fff3da', 2.5); sun.position.set(-3, 9, 6); scene.add(sun);
  const camera = new T.PerspectiveCamera(34, 1, .05, 150);
  const models = new Map(), loads = new Map(), textures = new Map();
  const geometries = new Set(), materials = new Set();
  let disposed = false, frame = 0, revision = 0, key = '', plots = [], buttons = [], layout = gardenSceneLayout([]);
  let angle = 0, scale = 1, left = 54, baseline = innerHeight - 66, width = 640, height = 420, selected = null;
  const tileMaterials = new Map();
  const raycaster = new T.Raycaster();
  const geometry = g => { geometries.add(g); return g; };
  const material = color => { const m = new T.MeshStandardMaterial({ color, roughness: 1 }); materials.add(m); return m; };
  const box = geometry(new RoundedBoxGeometry(1, 1, 1, 2, .1));
  const leaf = geometry(new T.SphereGeometry(1, 12, 8));
  const disk = geometry(new T.CircleGeometry(1, 28));
  function patchGeometry(w,d,h,softness=4){
    const shape=new T.Shape();
    for(let i=0;i<=80;i++){
      const a=i/80*Math.PI*2,c=Math.cos(a),s=Math.sin(a),r=1+.008*Math.sin(a*9);
      const x=Math.sign(c)*Math.abs(c)**(2/softness)*w/2*r,z=Math.sign(s)*Math.abs(s)**(2/softness)*d/2*r;
      if(i===0)shape.moveTo(x,z);else shape.lineTo(x,z);
    }
    const g=new T.ExtrudeGeometry(shape,{depth:h,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.018,bevelThickness:.018,curveSegments:12});g.rotateX(-Math.PI/2);return g;
  }
  const soilPatch=geometry(patchGeometry(.91,.91,.055));
  const terrainGeometries=new Set();
  function mesh(g, m, parent = world) { const o = new T.Mesh(g, m); parent.add(o); return o; }
  function slab(x, y, z, w, h, d, m, parent = world) { const o = mesh(box, m, parent); o.position.set(x, y, z); o.scale.set(w, h, d); return o; }
  const grass = art.groundMaterial('grass'), edge = material('#827155'), soil = art.groundMaterial('soil');
  const soilRim=material('#795941'),furrow=material('#805d43'),crumb=material('#b08b66');
  const flowerPetals=[material('#fff5d8'),material('#ecc7c0')],flowerCenter=material('#e9bd58');
  const greens = [material('#91bf8c'), material('#b4d5a2'), material('#719e78')];
  const shadowMaterial = new T.MeshBasicMaterial({ color: '#36452b', transparent: true, opacity: .12, depthWrite: false }); materials.add(shadowMaterial);
  function shadow(x, z, size) { const o = mesh(disk, shadowMaterial); o.rotation.x = -Math.PI / 2; o.position.set(x, .145, z); o.scale.set(size, size * .68, 1); }
  function sprout(parent, young) {
    const count = young ? 6 : 2;
    for (let i = 0; i < count; i++) {
      const a = i * Math.PI * 2 / count, o = mesh(leaf, greens[i % 3], parent);
      o.scale.set(.12, young ? .35 : .21, .045); o.position.set(Math.sin(a) * .15, young ? .27 : .19, Math.cos(a) * .15);
      o.rotation.set(Math.cos(a) * .65, a, -Math.sin(a) * .65);
    }
  }
  function load(name) {
    if (!loads.has(name)) loads.set(name, new GLTFLoader().loadAsync(urls[name]).then(g => {
      if (disposed) { disposeModel(g.scene); throw Error('closed'); }
      // Bake exporter transforms once. Some GLB roots retain authored matrices,
      // so normalizing a cloned scene by position/scale alone can bury the fruit.
      g.scene.updateMatrixWorld(true);
      const normalized = new T.Group(), originals = new Set();
      g.scene.traverse(o => { if(!o.isMesh)return;const baked=o.geometry.clone().applyMatrix4(o.matrixWorld);normalized.add(new T.Mesh(baked,o.material));originals.add(o.geometry); });
      originals.forEach(g=>g.dispose());
      models.set(name, normalized); return normalized;
    }));
    return loads.get(name);
  }
  function disposeModel(root) {
    const gs = new Set(), ms = new Set(), ts = new Set();
    root.traverse(o => { if (!o.isMesh) return; gs.add(o.geometry); for (const m of Array.isArray(o.material) ? o.material : [o.material]) { ms.add(m); Object.values(m).forEach(v => { if (v?.isTexture) ts.add(v); }); } });
    gs.forEach(g => g.dispose()); ms.forEach(m => m.dispose()); ts.forEach(t => t.dispose());
  }
  const cropMaterials = new Set();
  function specimen(template, size, traits, species) {
    const object = template.clone(true);
    object.traverse(o => {
      if (!o.isMesh) return;
      o.material = o.material.clone(); cropMaterials.add(o.material);
      o.material.metalness = 0; o.material.roughness = .85; o.material.metalnessMap = null;
      const tint = traits.includes('purple') ? '#b798da' : traits.includes('golden') ? '#edbd59' : traits.includes('jade') ? '#9dcca9' : traits.some(t => ['crystal','frost','dew'].includes(t)) ? '#b6e2ed' : traits.some(t => ['rainbow','prism','nebula'].includes(t)) ? '#c3b5eb' : null;
      if(traits.includes('shiny')){o.material.roughness=.28;o.material.metalness=.15;}
      // Strawberry uses a shared texture: recolor red fruit pixels while keeping green leaves and pale seeds.
      if(species==='strawberry'&&tint){
        const color=new T.Color(tint);
        o.material.onBeforeCompile=shader=>{
          shader.uniforms.fruitTint={value:color};
          shader.fragmentShader='uniform vec3 fruitTint;\n'+shader.fragmentShader;
          shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
            float fruitMask=smoothstep(0.03,0.16,diffuseColor.r-diffuseColor.g)*smoothstep(0.01,0.08,diffuseColor.r-diffuseColor.b);
            float fruitLight=clamp(max(diffuseColor.r,max(diffuseColor.g,diffuseColor.b)),0.15,1.0);
            diffuseColor.rgb=mix(diffuseColor.rgb,fruitTint*fruitLight,fruitMask);
          `);
        };
        o.material.customProgramCacheKey=()=> 'garden-fruit-tint';
      }
      // The pineapple model explicitly separates crown and fruit. Keep the crown green.
      if (species === 'pineapple' && o.material.name !== 'pineapple-crown') {
        if (tint) { o.material.map = null; o.material.color.set(tint); }
      }
      const rainbow=traits.some(t=>['rainbow','prism','nebula'].includes(t));
      const icy=traits.some(t=>['crystal','frost','dew'].includes(t));
      if ((rainbow||icy||traits.includes('golden')) && (species==='strawberry'||(species==='pineapple'&&o.material.name!=='pineapple-crown'))) {
        const previous=o.material.onBeforeCompile;
        o.material.roughness=icy?.2:.3; o.material.metalness=traits.includes('golden')?.55:.18;
        o.material.onBeforeCompile=shader=>{
          previous(shader);
          shader.vertexShader='varying vec3 fruitPoint;\n'+shader.vertexShader;
          shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nfruitPoint=position;');
          shader.fragmentShader='varying vec3 fruitPoint;\n'+shader.fragmentShader;
          const mask=species==='strawberry'?'fruitMask':'1.0';
          shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
            float sheen=pow(1.0-abs(dot(normalize(vNormal),normalize(vViewPosition))),2.0);
            vec3 spectrum=0.58+0.42*cos(fruitPoint.y*9.0+fruitPoint.x*5.0+vec3(0.0,2.1,4.2));
            diffuseColor.rgb=mix(diffuseColor.rgb,${rainbow?'spectrum':'vec3(0.64,0.86,0.98)'},${mask}*${rainbow?'.8':'.18'});
            diffuseColor.rgb+=${mask}*sheen*vec3(0.22,0.18,0.26);
          `);
        };
        o.material.customProgramCacheKey=()=>`farm-special-${species}-${rainbow}-${icy}`;
      }
    });
    const bounds = new T.Box3().setFromObject(object), center = bounds.getCenter(new T.Vector3()), dimensions = bounds.getSize(new T.Vector3());
    const factor = Math.min(size / dimensions.y, (traits.includes('giant')?1.02:.86) / Math.max(dimensions.x, dimensions.z));
    object.scale.multiplyScalar(factor); object.position.set(-center.x * factor, -bounds.min.y * factor, -center.z * factor);
    return object;
  }
  function fallback(parent, plot, version) {
    if (!plot.fallback) return;
    let promise = textures.get(plot.fallback);
    if (!promise) {
      promise = new T.TextureLoader().loadAsync(plot.fallback).then(t => { t.colorSpace = T.SRGBColorSpace; if (disposed) t.dispose(); return t; });
      textures.set(plot.fallback, promise);
    }
    promise.then(map => {
      if (disposed || version !== revision) return;
      const mat = new T.SpriteMaterial({ map, transparent: true, depthWrite: false }); cropMaterials.add(mat);
      const sprite = new T.Sprite(mat); sprite.position.y = .43; sprite.scale.set(.86, .86, 1); parent.add(sprite); requestPaint();
    }).catch(() => { if (!disposed && version === revision) { sprout(parent, true); requestPaint(); } });
  }
  function rebuild() {
    const version = ++revision; world.clear(); tileMaterials.clear(); cropMaterials.forEach(m => m.dispose()); cropMaterials.clear();
    terrainGeometries.forEach(g=>g.dispose());terrainGeometries.clear();
    element.dataset.models='0';
    layout = gardenSceneLayout(plots.map(p => p.index));
    const terrain=(w,d,h,y,m)=>{const g=patchGeometry(w,d,h,5);terrainGeometries.add(g);const o=mesh(g,m);o.position.y=y;};
    terrain(layout.width,layout.depth,.11,-.1,edge);
    terrain(layout.width+.015,layout.depth+.015,.075,-.005,grass);
    // Small leafy clusters, with open space between them, rather than a picket rim.
    const tuft=(x,z,i)=>{for(let j=0;j<3;j++){
      const o=mesh(leaf,greens[(i+j)%3]),a=(j-1)*.85+i*.4;
      o.scale.set(.058,.13+(i%3)*.015,.03);o.position.set(x+Math.sin(a)*.06,.15,z+Math.cos(a)*.04);o.rotation.set(Math.cos(a)*.65,a,-Math.sin(a)*.65);
    }};
    const bloom=(x,z,i)=>{for(let j=0;j<5;j++){const a=j*Math.PI*2/5,o=mesh(leaf,flowerPetals[i%2]);o.scale.set(.052,.026,.07);o.position.set(x+Math.sin(a)*.058,.18,z+Math.cos(a)*.058);o.rotation.y=a;}const center=mesh(leaf,flowerCenter);center.scale.set(.042,.03,.042);center.position.set(x,.205,z);};
    for(let i=0;i<Math.floor(layout.width/.72);i++){
      const x=-layout.width/2+.45+i*.72;
      if(i%3!==1)tuft(x,layout.depth/2-.17,i);
      if(i%3===0)tuft(x+.16,-layout.depth/2+.19,i+1);
    }
    for(let i=0;i<2;i++){
      const side=i?1:-1;tuft(side*(layout.width/2-.18),-.25,i+2);tuft(side*(layout.width/2-.2),.08,i+4);
      bloom(side*(layout.width/2-.27),layout.depth/2-.43,i);
      bloom(side*(layout.width/2-.45),-layout.depth/2+.3,i+1);
    }
    art.paths(world, layout);
    layout.cells.forEach((cell, n) => {
      const p = plots[n], m = soil.clone(); m.onBeforeCompile=soil.onBeforeCompile; m.customProgramCacheKey=soil.customProgramCacheKey; cropMaterials.add(m); tileMaterials.set(p.index, m);
      const rim=mesh(soilPatch,soilRim);rim.position.set(cell.x,.058,cell.z);rim.scale.set(1.035,.9,1.035);rim.userData.plotIndex=p.index;
      const plotMesh=mesh(soilPatch,m);plotMesh.position.set(cell.x,.082,cell.z);plotMesh.userData.plotIndex=p.index;
      for(let k=0;k<3;k++){const o=mesh(leaf,crumb);o.position.set(cell.x+[-.31,.32,.27][k],.158,cell.z+[.28,.25,-.3][k]);o.scale.set(.022+k*.007,.012,.018+k*.004);o.rotation.y=k;}
      if (p.stage === 'empty') {
        for (let k = 0; k < 3; k++){const o=mesh(leaf,furrow);o.position.set(cell.x+(k-1)*.015,.15,cell.z+(k-1)*.22);o.scale.set(.3,.014,.026);o.rotation.y=(k-1)*.025;}
        return;
      }
      shadow(cell.x, cell.z, .4);
      const crop = new T.Group(); crop.userData.plotIndex=p.index; crop.position.set(cell.x, .16, cell.z); world.add(crop);
      if (p.stage === 'hidden') { sprout(crop,true); art.effects(crop,[],true); return; }
      if (!urls[p.species]) { fallback(crop, p, version); return; }
      if (p.stage !== 'ripe') { sprout(crop, p.stage === 'young'); return; }
      crop.userData.species = p.species;
      art.effects(crop,p.traits);
      load(p.species).then(template => {
        if (disposed || version !== revision) return;
        const fruit = specimen(template, p.traits.includes('giant') ? 1.2 : .98, p.traits, p.species);
        if (p.species === 'strawberry') { fruit.scale.multiplyScalar(.65); fruit.position.y += .3; }
        crop.add(fruit);
        if(p.traits.includes('twin')){
          fruit.scale.multiplyScalar(.68);fruit.position.x-=.2;
          const twin=specimen(template,.74,p.traits,p.species);if(p.species==='strawberry'){twin.scale.multiplyScalar(.48);twin.position.y+=.27;}else twin.scale.multiplyScalar(.7);
          twin.position.x+=.23;twin.position.z+=.07;crop.add(twin);
        }
        crop.userData.modelReady = true;
        element.dataset.models = String(world.children.filter(o => o.userData.modelReady).length);
        if (p.species === 'pineapple') { const leaves = new T.Group(); leaves.scale.set(.7, .45, .7); sprout(leaves, true); crop.add(leaves); }
        requestPaint();
      }).catch(() => { if (!disposed && version === revision) { element.dataset.assetFallback = 'true'; fallback(crop, p, version); } });
      if (p.species === 'strawberry') load('base').then(template => {
        if (disposed || version !== revision) return;
        crop.add(specimen(template, .48, [], 'base')); requestPaint();
      }).catch(() => { if (!disposed && version === revision) { sprout(crop, true); requestPaint(); } });
    });
    element.dataset.plots = String(plots.length); requestPaint();
  }
  function project(x, y, z) {
    const p = new T.Vector3(x, y, z).project(camera);
    return { x: (p.x + 1) * width / 2, y: (1 - p.y) * height / 2 };
  }
  function paint() {
    frame = 0; if (disposed || document.hidden || !element.isConnected) return;
    const oldWidth = width, oldHeight = height;
    const extent = Math.max(layout.width, layout.depth);
    width = Math.round(Math.min(innerWidth - 24, Math.max(350, extent * 85) * scale));
    height = Math.round(Math.min(innerHeight - 100, width * .73));
    width = Math.max(180, width); height = Math.max(140, height);
    element.style.width = width + 'px'; element.style.height = height + 'px';
    const x = Math.max(8, Math.min(left, innerWidth - width - 8)), y = Math.max(8, Math.min(baseline - height, innerHeight - height - 58));
    element.style.left = x + 'px'; element.style.top = y + 'px';
    if (oldWidth !== width || oldHeight !== height || !element.dataset.sceneReady) renderer.setSize(width, height, false);
    // A lower overhead view reveals the fruit fronts. A narrow perspective lens
    // adds gentle depth, while fitting all terrain corners at every rotation.
    const elevation=T.MathUtils.degToRad(47),target=new T.Vector3(0,.4,0);
    const direction=new T.Vector3(Math.sin(angle)*Math.cos(elevation),Math.sin(elevation),Math.cos(angle)*Math.cos(elevation));
    camera.aspect=width/height;camera.position.copy(target).add(direction);camera.lookAt(target);camera.updateMatrixWorld();
    const tangent=Math.tan(T.MathUtils.degToRad(camera.fov/2));let distance=1;
    for(const cx of [-layout.width/2-.12,layout.width/2+.12])for(const cz of [-layout.depth/2-.12,layout.depth/2+.12])for(const cy of [-.15,1.35]){
      const p=new T.Vector3(cx,cy,cz).applyMatrix4(camera.matrixWorldInverse);
      distance=Math.max(distance,p.z+1+Math.max(Math.abs(p.x)/(tangent*camera.aspect),Math.abs(p.y)/tangent));
    }
    camera.position.copy(target).addScaledVector(direction,distance*1.035);camera.updateMatrixWorld();camera.updateProjectionMatrix();
    element.dataset.camera='perspective';element.dataset.elevation='47';
    const placements = [];
    layout.cells.forEach((cell, n) => {
      const b = buttons[n]; if (!b) return;
      const points = [[-.48,-.48],[.48,-.48],[.48,.48],[-.48,.48]].map(([dx,dz]) => project(cell.x + dx, .15, cell.z + dz));
      const head = project(cell.x, plots[n].stage === 'empty' ? .15 : 1.15, cell.z);
      const minX = Math.min(...points.map(p => p.x)), maxX = Math.max(...points.map(p => p.x));
      const minY = Math.min(head.y, ...points.map(p => p.y)), maxY = Math.max(...points.map(p => p.y));
      b.style.cssText = `left:${minX}px;top:${minY}px;width:${maxX-minX}px;height:${maxY-minY}px;z-index:${Math.round(maxY)};`;
      const center=project(cell.x,.15,cell.z);b.dataset.screenX=String(x+center.x);b.dataset.screenY=String(y+center.y);
      b.classList.toggle('selected', plots[n].index === selected);
      tileMaterials.get(plots[n].index)?.color.set(plots[n].index === selected ? '#ffe1a8' : '#ffffff');
      const foot = project(cell.x + .63, .15, cell.z + .4);
      placements.push({ index: plots[n].index, x: Math.max(0, Math.min(innerWidth, x + foot.x)), y: Math.max(0, Math.min(innerHeight, y + foot.y)) });
    });
    renderer.render(scene, camera); element.dataset.sceneReady = 'true'; element.dataset.draws = String(Number(element.dataset.draws || 0) + 1); element.dataset.angle = String(angle); element.dataset.scale = String(scale);
    onLayout({ width, height, plots: placements });
  }
  function requestPaint() { if (!disposed && !frame) frame = requestAnimationFrame(paint); }
  function hitTest(x,y) {
    const rect=element.getBoundingClientRect();
    if(x<rect.left||x>rect.right||y<rect.top||y>rect.bottom)return null;
    const painted=document.elementFromPoint(x,y)?.closest('.farm-mystery')?.closest('[data-plot]');
    if(painted&&element.contains(painted))return Number(painted.dataset.plot);
    raycaster.setFromCamera(new T.Vector2((x-rect.left)/width*2-1,1-(y-rect.top)/height*2),camera);
    for(const hit of raycaster.intersectObjects(world.children,true)){
      let object=hit.object;
      while(object&&object!==world){if(Number.isInteger(object.userData.plotIndex))return object.userData.plotIndex;object=object.parent;}
    }
    return null;
  }
  // Projected accessible controls can overlap after rotation. Native clicks are
  // resolved against the actual scene geometry, never by overlapping rectangles.
  element.addEventListener('click',e=>{
    if(!e.detail)return;
    e.preventDefault();e.stopImmediatePropagation();
    const index=hitTest(e.clientX,e.clientY);
    if(index!==null)buttons.find(b=>Number(b.dataset.plot)===index)?.click();
  },true);
  const visible = () => { if (!document.hidden) requestPaint(); };
  document.addEventListener('visibilitychange', visible); window.addEventListener('resize', requestPaint);
  renderer.domElement.addEventListener('webglcontextlost', e => { e.preventDefault(); element.dataset.sceneReady = 'false'; if(!disposed)onError('3D 画面暂时不可用，可切回手绘后重试。'); });
  renderer.domElement.addEventListener('webglcontextrestored', requestPaint);
  return {
    element,
    update(next, controls, selection) {
      plots = next; selected = selection;
      buttons.forEach(b => b.remove()); buttons = controls; element.append(...buttons);
      const nextKey = JSON.stringify(plots); if (key !== nextKey) { key = nextKey; rebuild(); } requestPaint();
    },
    place(x, y) { left = x; baseline = y; requestPaint(); },
    rotate(direction) { angle += direction * Math.PI / 12; requestPaint(); },
    zoom(direction) { scale = Math.max(.65, Math.min(1.5, scale + direction * .15)); requestPaint(); },
    reset() { angle = 0; scale = 1; requestPaint(); },
    hitTest,
    dispose() {
      disposed = true; revision++; cancelAnimationFrame(frame);
      document.removeEventListener('visibilitychange', visible); window.removeEventListener('resize', requestPaint);
      models.forEach(disposeModel); textures.forEach(p => p.then(t => t.dispose()).catch(() => {}));
      cropMaterials.forEach(m => m.dispose()); materials.forEach(m => m.dispose()); geometries.forEach(g => g.dispose());
      terrainGeometries.forEach(g=>g.dispose());
      art.dispose(); renderer.dispose(); renderer.forceContextLoss(); element.remove();
    },
  };
}
