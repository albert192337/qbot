/** A finite, cancellable visual copy. Never manipulates a desktop file or shortcut. */
export class IconPlay {
  private active?:{id:string;node:HTMLElement;animation:Animation;timer:ReturnType<typeof setTimeout>};
  constructor(private stage:HTMLElement,private report:(id:string,outcome:'started'|'completed'|'cancelled')=>void,private finished:()=>void){}
  isActive():boolean{return !!this.active;}
  start(id:string,image:string):void{
    this.cancel();
    const node=document.createElement(image?'img':'span');node.className='pet-icon-copy';node.setAttribute('aria-hidden','true');
    if(image&&(node instanceof HTMLImageElement))node.src=image;
    const rect=this.stage.getBoundingClientRect(),size=Math.min(40,Math.max(24,rect.width*.12));
    // A path beside the head, entirely within the pet window; no explanatory text.
    Object.assign(node.style,{position:'fixed',left:`${Math.max(size,Math.min(innerWidth-size*2,rect.x+rect.width*.3))}px`,top:`${Math.max(6,Math.min(innerHeight-size-6,rect.y+rect.height*.03))}px`,width:`${size}px`,height:`${size}px`,objectFit:'contain',zIndex:'60',pointerEvents:'none',filter:'drop-shadow(0 2px 2px #0003)'});
    if(!image)Object.assign(node.style,{background:'#f6dfb5',border:'2px solid #947051',borderRadius:'6px'});
    document.body.append(node);
    const travel=Math.max(8,Math.min(100,innerWidth-parseFloat(node.style.left)-size-8));
    const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    const animation=node.animate(reduced?[{opacity:0},{opacity:1},{opacity:0}]:[
      {transform:'translate(0, 12px) rotate(-15deg)',opacity:0},
      {transform:`translate(${travel*.5}px, -4px) rotate(150deg)`,opacity:1},
      {transform:`translate(${travel}px, 12px) rotate(315deg)`,opacity:1},
      {transform:`translate(${travel*.5}px, -4px) rotate(150deg)`,opacity:1},
      {transform:'translate(0, 12px) rotate(-15deg)',opacity:0},
    ],{duration:reduced?1600:3600,easing:'ease-in-out'});
    this.active={id,node,animation,timer:setTimeout(()=>this.end('completed'),4200)};
    animation.onfinish=()=>this.end('completed');this.report(id,'started');
  }
  cancel(id?:string):void{if(!id||id===this.active?.id)this.end('cancelled');}
  private end(outcome:'completed'|'cancelled'):void{
    const run=this.active;if(!run)return;this.active=undefined;
    clearTimeout(run.timer);run.animation.onfinish=null;run.animation.cancel();run.node.remove();
    this.report(run.id,outcome);this.finished();
  }
}
