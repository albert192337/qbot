/** Finish complete clips, repeating short expressions for a readable minimum duration. */
export class ActionHold {
  private until=0;
  private remaining=0;
  action:string|null=null;
  begin(action:string,loops:number,now:number,minMs=6000):void{
    this.action=action;this.remaining=Math.max(1,Math.floor(loops)||1);this.until=now+minMs;
  }
  ended(now:number):string|null{
    if(!this.action)return null;
    this.remaining--;
    if(this.remaining>0||now<this.until)return this.action;
    this.cancel();return null;
  }
  cancel():void{this.action=null;this.remaining=0;this.until=0;}
}
