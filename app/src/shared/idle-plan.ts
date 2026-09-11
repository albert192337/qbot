export interface IdlePlan { characterId:string; action:string; chosenAt:number; until:number }
export interface IdleDecision { idleAction?:string; idleMinutes?:number }
export function parseIdleDecision(obj:Record<string,unknown>,allowed:string[]):IdleDecision{
  if(typeof obj.idleAction!=='string'||!allowed.includes(obj.idleAction))return {};
  const minutes=typeof obj.idleMinutes==='number'&&Number.isFinite(obj.idleMinutes)?obj.idleMinutes:5;
  return {idleAction:obj.idleAction,idleMinutes:Math.max(3,Math.min(15,minutes))};
}
export function idleInstructions(candidates?:Array<{id:string;description:string}>,plan?:IdlePlan|null):string{
  return `额外决定即时动作/台词结束后接下来一段时间做什么待机。只从这些安静候选中选 idleAction：${JSON.stringify(candidates??[])}。idleMinutes 为 3～15 分钟，默认 5。结合这次对话、心情、时间和工作状态选择，不要为变化而变化；合适时维持原待机。当前计划：${JSON.stringify(plan??null)}。没有合适候选或不想改变就省略 idleAction；action 是短暂即时表情，与 idleAction 分开。即使 do=false、不冒泡，也可以给出待机计划。`;
}
/** One stable idle choice; model choices have precedence, rule fallback changes slowly. */
export class IdleDirector{
  plan:IdlePlan|null=null;
  current='idle';
  private switchAt=0;
  reset():void{this.plan=null;this.current='idle';this.switchAt=0;}
  accept(plan:IdlePlan):void{this.plan=plan;}
  next(pool:string[],fallback:string,llm:boolean,now:number,random:()=>number):string{
    if(this.plan&&pool.includes(this.plan.action)&&(llm||now<this.plan.until))return this.current=this.plan.action;
    if(this.plan)this.plan=null;
    if(llm){if(!pool.includes(this.current))this.current=pool.includes(fallback)?fallback:pool[0]??fallback;return this.current;}
    if(!pool.includes(this.current)||now>=this.switchAt){
      const different=pool.filter(id=>id!==this.current);const choices=different.length?different:pool;
      this.current=choices[Math.floor(random()*choices.length)]??fallback;
      this.switchAt=now+180000+Math.floor(random()*240000);
    }
    return this.current;
  }
}
