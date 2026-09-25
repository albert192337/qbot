/** Deliberate hover strokes; distance is measured in CSS pixels (DIP). */
export class PettingGesture {
  private origin: {x:number;y:number;at:number} | null = null;
  private direction: {x:number;y:number} | null = null;
  private distance = 0;
  private reversals = 0;
  private started = 0;
  private lastTrigger = -Infinity;
  reset(): void { this.origin=null; this.direction=null; this.distance=0; this.reversals=0; }
  move(x:number,y:number,at:number,buttons=0): boolean {
    if(buttons || at-this.lastTrigger<8000){this.reset();return false;}
    if(!this.origin || at-this.started>1400){this.reset();this.origin={x,y,at};this.started=at;return false;}
    const dx=x-this.origin.x,dy=y-this.origin.y,length=Math.hypot(dx,dy);
    if(length<12)return false;
    if(this.direction && dx*this.direction.x+dy*this.direction.y < -length*.5)this.reversals++;
    this.direction={x:dx/length,y:dy/length};this.distance+=length;this.origin={x,y,at};
    if(this.reversals<2 || this.distance<70)return false;
    this.lastTrigger=at;this.reset();return true;
  }
}
