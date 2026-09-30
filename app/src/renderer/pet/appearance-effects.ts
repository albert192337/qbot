import {equippedAppearance,type AppearanceInventory} from '../../shared/appearances';
import {isDesktopQuiet} from './desktop-visibility';
import type {Player} from './player';
/** Equipped effects for the active own desktop character. Footprints use an exterior surface. */
export class EquippedEffects {
  private actor='';private inventory:AppearanceInventory|undefined;private revision=0;private lastStep=-1;
  private cleanupPortal:(()=>void)|undefined;private motion=matchMedia('(prefers-reduced-motion: reduce)');
  private portalVersion=0;
  constructor(private stage:HTMLElement,private player:Player){
    const off=window.qbot.garden.onChanged(()=>void this.refresh(false));
    const clear=()=>{if(document.hidden||isDesktopQuiet()||this.motion.matches)this.cancel();};
    const desktopOff=window.qbot.desktop.onChanged(clear);
    document.addEventListener('visibilitychange',clear);this.motion.addEventListener('change',clear);
    window.addEventListener('pagehide',()=>{this.revision++;off();desktopOff();this.cancel();document.removeEventListener('visibilitychange',clear);this.motion.removeEventListener('change',clear);},{once:true});
  }
  private allowed(){return !document.hidden&&!isDesktopQuiet()&&!this.motion.matches;}
  activate(actor:string){const changed=this.actor!==actor;this.actor=actor;this.cancel();this.lastStep=-1;void this.refresh(changed);}
  private async refresh(enter:boolean){const revision=++this.revision;try{
    const state=await window.qbot.garden.get();if(revision!==this.revision)return;
    const previous=equippedAppearance(this.inventory,this.actor,'eclipse-portal');this.inventory=state.economy?.appearances;
    if(!equippedAppearance(this.inventory,this.actor,'eclipse-portal'))this.cancel();
    else if(enter||!previous)void this.entrance(revision);
  }catch{/* Economic connection failure does not interrupt the pet. */}}
  beginWalk(){this.lastStep=-1;}
  stepWalk(elapsed:number,duration:number){
    if(!this.allowed()||!equippedAppearance(this.inventory,this.actor,'petal-steps'))return;
    const pose=this.player.getSceneFeet(),time=pose?.action==='walk'?pose.time:elapsed,cycle=pose?.action==='walk'?pose.duration:duration;
    const half=Math.floor(time/(cycle/2));if(half<=this.lastStep)return;this.lastStep=half;
    const r=this.stage.getBoundingClientRect(),foot=half%2?pose?.right:pose?.left;
    window.qbot.appearances.foot(r.x+r.width*(foot?.x??(half%2?.53:.47)),r.y+r.height*(foot?.y??.89),r.height*.73);
  }
  cancel(){this.portalVersion++;this.cleanupPortal?.();this.cleanupPortal=undefined;}
  private async entrance(revision:number){
    if(!this.allowed())return;this.cancel();const portalVersion=this.portalVersion;
    const [{Application,Sprite,Texture},{createPortalFilter}]=await Promise.all([import('pixi.js'),import('../appearance-preview/portal')]);
    if(revision!==this.revision||portalVersion!==this.portalVersion||!this.allowed())return;
    const app=new Application();await app.init({width:innerWidth,height:innerHeight,backgroundAlpha:0,preference:'webgl',autoStart:false,resolution:Math.min(devicePixelRatio,1.5),autoDensity:true});
    if(revision!==this.revision||portalVersion!==this.portalVersion||!this.allowed()){app.destroy(true);return;}
    const material=createPortalFilter(),portal=new Sprite(Texture.WHITE);portal.filters=[material];portal.anchor.set(.5);app.stage.addChild(portal);app.ticker.maxFPS=30;
    app.canvas.style.cssText='position:fixed;inset:0;pointer-events:none;z-index:0';document.body.prepend(app.canvas);
    const anim=this.stage.animate([{opacity:0,filter:'blur(4px)'},{opacity:1,filter:'blur(0px)'}],{duration:1200,delay:500,fill:'backwards',easing:'ease-out'});
    let time=0,disposed=false;const started=performance.now();this.cleanupPortal=()=>{if(disposed)return;disposed=true;anim.cancel();app.destroy(true,{children:true});material.destroy();};
    const smooth=(v:number)=>{v=Math.max(0,Math.min(1,v));return v*v*(3-2*v);};
    app.ticker.add(()=>{time=(performance.now()-started)/1000;const r=this.stage.getBoundingClientRect();portal.position.set(r.x+r.width*.5,r.y+r.height*.5);portal.width=r.width*1.08;portal.height=r.height*1.18;material.resources.portal.uniforms.uTime=time;material.resources.portal.uniforms.uOpen=smooth(time/.55)*(1-smooth((time-2.3)/.8));if(time>3.2||!this.allowed())this.cancel();});app.start();
  }
}
