import type { Manifest } from '@qbot/pipeline';

// The runtime must match the 4.0 skeleton export, not the newest Spine release.
let runtimePromise: Promise<any> | undefined;
function runtime(): Promise<any> {
  return runtimePromise ??= new Promise((resolve,reject)=>{
    const script=document.createElement('script');
    script.src=new URL('./assets/spine/spine-webgl.js',import.meta.url).href;
    script.onload=()=>resolve((window as any).spine);
    script.onerror=()=>{runtimePromise=undefined;script.remove();reject(Error('Spine runtime unavailable'));};
    document.head.append(script);
  });
}
const bodySlots=new Set(['右手_1无袖','左手_1无袖','躯干上部','腿右','腿右fk','腿左','腿左fk','发中面部']);
const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n));

/** Live skeleton backend sharing Player's play/loop/end/dispose contract. */
export class SpinePlayer {
  private canvas=document.createElement('canvas');
  private disposed=false;
  private suspended=false;
  private ready=false;
  private frame=0;
  private last=0;
  private elapsed=0;
  private blink=0;
  private action='idle';
  private looping=true;
  private finished=false;
  private sk:any;private state:any;private renderer:any;private assets:any;private api:any;
  private gl:WebGLRenderingContext|null=null;
  private gazeX=0;private gazeY=0;
  private mouse:{x:number;y:number}|null=null;
  private cursorTimer:ReturnType<typeof setInterval>|null=null;
  private cursorPending=false;
  private originals=new Map<any,number[]>();
  private pointer=(e:PointerEvent)=>{this.mouse={x:e.clientX,y:e.clientY};};
  constructor(private container:HTMLElement,private dirId:string,private manifest:Manifest,private onEnded:()=>void){
    this.canvas.width=this.canvas.height=512;
    this.canvas.className='spine-player';
    this.canvas.dataset.backend='spine';
    this.canvas.style.cssText='position:absolute;inset:0;width:100%;height:100%;object-fit:contain;pointer-events:none;z-index:1';
    container.append(this.canvas);window.addEventListener('pointermove',this.pointer);
    this.cursorTimer=setInterval(()=>{
      if(this.disposed||this.suspended||document.hidden||this.cursorPending||document.body.classList.contains('pair-mode'))return;
      this.cursorPending=true;
      void window.qbot.pet.getCursor().then(p=>{if(!this.disposed)this.mouse=p;}).catch(()=>{}).finally(()=>{this.cursorPending=false;});
    },120);
    void this.load().catch(e=>{if(!this.disposed){this.canvas.dataset.error=String(e);console.error('[spine-player]',e);}});
  }
  private async load(){
    this.api=await runtime();if(this.disposed)return;
    const api=this.api,config=this.manifest.spine!;
    const base=`qbot-asset://${this.dirId}/`;
    for(const p of [config.skeleton,config.atlas,config.texture])if(!/^spine\/[a-zA-Z0-9_-]+\.(json|atlas|png)$/.test(p))throw Error('Invalid Spine asset path');
    this.gl=this.canvas.getContext('webgl',{alpha:true,premultipliedAlpha:false,preserveDrawingBuffer:true});
    if(!this.gl)throw Error('WebGL unavailable');
    this.renderer=new api.SceneRenderer(this.canvas,this.gl);
    this.assets=new api.AssetManager(this.gl);
    this.assets.loadTextureAtlas(base+config.atlas);this.assets.loadJson(base+config.skeleton);
    await this.assets.loadAll();if(this.disposed){this.assets.dispose();return;}
    const data=new api.SkeletonJson(new api.AtlasAttachmentLoader(this.assets.get(base+config.atlas))).readSkeletonData(this.assets.get(base+config.skeleton));
    this.sk=new api.Skeleton(data);this.state=new api.AnimationState(new api.AnimationStateData(data));
    for(const name of Object.values(config.actions))if(!data.findAnimation(name))throw Error('Unknown Spine action '+name);
    this.ready=true;this.canvas.dataset.ready='true';this.select();this.schedule();
  }
  play(action:string,looping:boolean){
    this.action=this.manifest.spine!.actions[action]?action:'idle';this.looping=looping;this.finished=false;this.elapsed=0;
    this.canvas.dataset.action=this.action;
    if(this.ready)this.select();this.schedule();
  }
  private select(){
    this.sk.setToSetupPose();this.state.clearTracks();
    this.state.setAnimation(0,this.manifest.spine!.actions[this.action],this.looping);
    this.elapsed=0;this.finished=false;
  }
  setSuspended(value:boolean){this.suspended=value;if(value){cancelAnimationFrame(this.frame);this.frame=0;this.last=0;}else this.schedule();}
  private schedule(){if(!this.frame&&!this.disposed&&!this.suspended&&this.ready)this.frame=requestAnimationFrame(this.tick);}
  private tick=(now:number)=>{
    this.frame=0;if(this.disposed||this.suspended)return;
    const dt=this.last?Math.min((now-this.last)/1000,.05):0;this.last=now;
    if(!document.hidden){this.render(dt);}
    this.schedule();
  };
  private gaze(dt:number){
    const own=this.container.getBoundingClientRect();
    const paired=document.body.classList.contains('pair-mode')&&(this.container.id==='stage'||this.container.id==='visitor-stage');
    const other=paired?document.getElementById(this.container.id==='stage'?'visitor-stage':'stage'):null;
    const rect=other?.getBoundingClientRect();
    const blocked=['sleep','drag'].includes(this.action);
    const target=rect?{x:rect.x+rect.width*.5,y:rect.y+rect.height*.36}:own.right>0?this.mouse:null;
    const mirrored=document.body.classList.contains(this.container.id==='visitor-stage'?'flip-visitor':'flip-host');
    const x=!blocked&&target?clamp((target.x-own.x-own.width*.5)/Math.max(own.width*.7,1),-1,1)*(mirrored?-1:1):0;
    const y=!blocked&&target?clamp((target.y-own.y-own.height*.36)/Math.max(own.height,1),-.6,.6):0;
    const mix=1-Math.exp(-dt*7);this.gazeX+=(x-this.gazeX)*mix;this.gazeY+=(y-this.gazeY)*mix;
    this.canvas.dataset.gaze=blocked?'pose':rect?'partner':target?'pointer':'idle';
    this.canvas.dataset.gazeX=this.gazeX.toFixed(3);
    // Small pitch/roll only: flat artwork cannot synthesize a full head turn.
    this.sk.findBone('head').rotation+=this.gazeX*1.5-this.gazeY*1.5;
  }
  private shiftEyes(slot:any){
    const mesh=slot.getAttachment();if(!mesh?.vertices)return;
    let original=this.originals.get(mesh);if(!original){original=Array.from(mesh.vertices);this.originals.set(mesh,original!);}
    const vertices=mesh.vertices,source=original!;vertices.set?vertices.set(source):source.forEach((n,i)=>vertices[i]=n);
    const move=(bone:any,index:number)=>{
      const det=bone.a*bone.d-bone.b*bone.c;if(Math.abs(det)<.0001)return;
      const dx=this.gazeX*2,dy=-this.gazeY*1.5;
      vertices[index]+=(bone.d*dx-bone.b*dy)/det;
      vertices[index+1]+=(-bone.c*dx+bone.a*dy)/det;
    };
    if(mesh.bones){let v=0;for(let b=0;b<mesh.bones.length;){const n=mesh.bones[b++];for(let j=0;j<n;j++){move(this.sk.bones[mesh.bones[b++]],v);v+=3;}}}
    else for(let v=0;v<vertices.length;v+=2)move(slot.bone,v);
  }
  private render(dt:number){
    const sk=this.sk,gl=this.gl!,r=this.renderer;this.blink+=dt;
    // Reset before evaluating timelines so unkeyed bones and gaze cannot accumulate.
    sk.setToSetupPose();this.state.update(this.finished?0:dt);this.state.apply(sk);this.elapsed+=this.finished?0:dt;
    sk.x=this.action==='drag'?70:0;sk.y=this.action==='drag'?-40:0;
    const root=sk.findBone('root');root.x=root.data.x;root.y=root.data.y;
    for(const slot of sk.slots)if(!bodySlots.has(slot.data.name))slot.color.a=0;
    const closed=this.action==='sleep'||this.blink%3.8>3.64;
    for(const [slot,name]of [['eye_LA0',closed?'hood_eye_L_closed':'eye_L_default'],['eye_RA0',closed?'hood_eye_R_closed':'eye_R_default'],['mouth_A0','mouth_0']]){
      sk.setAttachment(slot,name);sk.findSlot(slot).color.set(1,1,1,1);
    }
    if(['sleep','thinking','talk_annoyed'].includes(this.action))sk.findSlot('mouth_A0').color.a=0;
    this.gaze(dt);sk.updateWorldTransform();
    if(this.manifest.spine!.actions[this.action]==='town_shuangren_tietie01'){
      for(const side of ['L','R']){
        const h=sk.findBone('leg_'+side+'0'),f=sk.findBone('foot_'+side),k=sk.findBone('knee_'+side),dx=f.worldX-h.worldX,dy=f.worldY-h.worldY,len=Math.hypot(dx,dy);
        if(len<1)continue;const t=clamp(((k.worldX-h.worldX)*dx+(k.worldY-h.worldY)*dy)/(len*len),.35,.65),px=h.worldX+t*dx,py=h.worldY+t*dy,offset=clamp(((k.worldX-px)*-dy+(k.worldY-py)*dx)/len,-4,4);
        const local=k.parent.worldToLocal(new this.api.Vector2(px-offset*dy/len,py+offset*dx/len));k.x=local.x;k.y=local.y;
      }sk.updateWorldTransform();
    }
    for(const name of ['eye_LA0','eye_RA0'])this.shiftEyes(sk.findSlot(name));
    gl.viewport(0,0,512,512);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);
    r.camera.position.set(0,240,0);r.camera.viewportWidth=620;r.camera.viewportHeight=620;
    r.begin();r.drawSkeleton(sk,false);r.end();
    this.canvas.dataset.time=this.elapsed.toFixed(3);
    const entry=this.state.getCurrent(0);
    if(!this.looping&&!this.finished&&entry&&entry.trackTime>=entry.animationEnd){this.finished=true;this.onEnded();}
  }
  dispose(){
    this.disposed=true;cancelAnimationFrame(this.frame);window.removeEventListener('pointermove',this.pointer);
    if(this.cursorTimer)clearInterval(this.cursorTimer);
    this.canvas.remove();this.originals.clear();if(this.ready)this.assets?.dispose();this.renderer?.dispose();
    this.gl?.getExtension('WEBGL_lose_context')?.loseContext();
  }
}
