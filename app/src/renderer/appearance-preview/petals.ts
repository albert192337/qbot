/** Shared sparse petals for equipped desktop footsteps. No persistent draw loop. */
export class PetalField {
  readonly canvas=document.createElement('canvas');
  private ctx=this.canvas.getContext('2d')!;
  private petals:{x:number;y:number;dx:number;lift:number;angle:number;spin:number;size:number;born:number}[]=[];
  private frame=0;
  constructor(){this.canvas.style.cssText='position:absolute;inset:0;pointer-events:none;width:100%;height:100%';}
  emit(x:number,y:number,size:number){
    if(matchMedia('(prefers-reduced-motion: reduce)').matches||document.hidden)return;
    for(let i=0;i<3;i++)this.petals.push({x,y,dx:(Math.random()-.5)*size*.24,lift:size*(.04+Math.random()*.04),angle:Math.random()*6.28,spin:Math.random()-.5,size:size*(.045+Math.random()*.025),born:performance.now()});
    this.petals=this.petals.slice(-60);if(!this.frame)this.frame=requestAnimationFrame(this.draw);
  }
  private draw=(now:number)=>{
    this.frame=0;const c=this.ctx,w=this.canvas.clientWidth,h=this.canvas.clientHeight;
    if(this.canvas.width!==w||this.canvas.height!==h){this.canvas.width=w;this.canvas.height=h;}c.clearRect(0,0,w,h);
    this.petals=this.petals.filter(p=>now-p.born<3400);
    for(const p of this.petals){const age=(now-p.born)/1000,fade=Math.min(1,age/.12)*Math.min(1,(3.4-age)/1.2),drift=1-Math.exp(-age*2.6);
      c.save();c.translate(p.x+p.dx*drift,p.y-Math.sin(Math.min(1,age/1.3)*Math.PI)*p.lift);c.rotate(p.angle+p.spin*age);c.scale(p.size/80,p.size/80*(.4+.5*Math.abs(Math.cos(age*2+p.angle))));c.globalAlpha=fade*.88;
      const g=c.createLinearGradient(-30,-30,20,40);g.addColorStop(0,'#fff1e8');g.addColorStop(.4,'#f9c6d9');g.addColorStop(1,'#bd6e99');c.fillStyle=g;c.beginPath();c.moveTo(0,43);c.bezierCurveTo(-8,21,-41,8,-32,-23);c.bezierCurveTo(-26,-43,-8,-41,0,-29);c.bezierCurveTo(12,-42,31,-35,33,-15);c.bezierCurveTo(35,9,10,30,0,43);c.fill();c.restore();}
    if(this.petals.length)this.frame=requestAnimationFrame(this.draw);
  };
  clear(){cancelAnimationFrame(this.frame);this.frame=0;this.petals=[];this.ctx.clearRect(0,0,this.canvas.width,this.canvas.height);}
  dispose(){this.clear();this.canvas.remove();}
}
