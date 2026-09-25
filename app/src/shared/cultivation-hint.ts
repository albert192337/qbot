import {COOP_RULES,type CoopTask} from './garden-life';
/** Interpolate only work covered by a live participant lease; reconcile on every snapshot. */
export function cultivationFraction(task:CoopTask,now:number):number {
  if(task.done)return 1;
  const work=Object.values(task.members).reduce((sum,m)=>sum+Math.max(0,Math.min(now,m.seenAt+COOP_RULES.leaseMs)-task.updatedAt)/1000*COOP_RULES.speed,0);
  return Math.max(0,Math.min(1,1-(task.remaining-work)/(task.workBudget??COOP_RULES.work)));
}
export function cultivationHintPosition(p:{left:number;right:number;top:number;bottom:number},width:number,height:number,vw:number,vh:number){
  const x=Math.max(8,Math.min((p.left+p.right-width)/2,vw-width-8));
  const y=Math.max(8,Math.min((p.top+p.bottom-height)/2,vh-height-8));
  return [{x,y:p.bottom+8},{x:p.right+8,y},{x:p.left-width-8,y},{x,y:p.top-height-8}]
    .find(r=>r.x>=8&&r.y>=8&&r.x+width<=vw-8&&r.y+height<=vh-8)??null;
}
