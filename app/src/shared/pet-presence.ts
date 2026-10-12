export type PresenceKind = 'attention' | 'return' | 'visitor' | 'resume';
export type PresenceSignal = {actor:string;kind:'attention';active:boolean} | {actor:string;kind:'return'|'visitor';target?:string};
export interface PresenceApi {
 input(active:boolean):void;
 onSignal(cb:(signal:PresenceSignal)=>void):()=>void;
 report(actor:string,kind:PresenceKind,action:string,outcome:'started'|'completed'|'cancelled'):void;
}
/** A return needs a real absence edge. Ordinary pauses and startup never greet. */
export class ReturnGreetingGate {
 private away=false;
 private last=-Infinity;
 sample(idleSeconds:number,locked:boolean,now:number):boolean {
  if(locked||idleSeconds>=300){this.away=true;return false;}
  if(!this.away||idleSeconds>2)return false;
  this.away=false;
  if(now-this.last<600000)return false;
  this.last=now;return true;
 }
}
/** One interrupted activity, never a stack of stale animations to replay later. */
export class ActivityMemory<T> {
 private saved:{actor:string;value:T;at:number}|null=null;
 remember(actor:string,value:T,now:number):void {if(!this.saved||this.saved.actor!==actor||now-this.saved.at>600000)this.saved={actor,value,at:now};}
 take(actor:string,now:number):T|null {const item=this.saved;this.saved=null;return item?.actor===actor&&now-item.at<=600000?item.value:null;}
 clear():void {this.saved=null;}
}
