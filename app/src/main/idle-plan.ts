import type { IdleDecision, IdlePlan } from '../shared/idle-plan';
import { sendToWindows } from './windows';
const plans=new Map<string,IdlePlan>();
export const getIdlePlan=(id:string):IdlePlan|null=>plans.get(id)??null;
export function applyIdleDecision(characterId:string,decision:IdleDecision,allowed:string[]):void{
  if(!decision.idleAction||!allowed.includes(decision.idleAction))return;
  const now=Date.now();
  const plan:IdlePlan={characterId,action:decision.idleAction,chosenAt:now,until:now+(decision.idleMinutes??5)*60000};
  plans.set(characterId,plan);sendToWindows('behavior:idlePlan',plan);
}
