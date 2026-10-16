export const SPIN_MS=4200, HOLD_MS=1400;
const coins=amount=>({label:amount.toLocaleString('en-US'),coins:amount,prize:null});
// Eight equal sectors, eight equal chances. Owned cosmetics visibly become coins.
export function wheelSegments(unlocked=[]){return [coins(2000),coins(5000),unlocked.includes('petals')?coins(5000):{label:'花瓣足迹',coins:0,prize:'petals'},coins(10000),coins(2000),unlocked.includes('orbit')?coins(5000):{label:'星环',coins:0,prize:'orbit'},coins(5000),coins(20000)];}
export function chooseWheel(seed,unlocked=[]){
 // A separate stream keeps the second-stage draw from changing ball trajectories.
 let x=(seed^0x9e3779b9)>>>0;x=Math.imul(x^(x>>>16),0x21f0aaad);x=Math.imul(x^(x>>>15),0x735a2d97);x=(x^(x>>>15))>>>0;
 const segments=wheelSegments(unlocked),index=Math.floor(x/4294967296*segments.length);
 return{index,segments,...segments[index]};
}
export function wheelRevealed(ticket,now){return ticket.startedAt!=null&&now>=ticket.startedAt+SPIN_MS;}
export function wheelAngle(index,elapsed){const t=Math.max(0,Math.min(1,elapsed/SPIN_MS));return(6*Math.PI*2-index*Math.PI/4)*(1-(1-t)**4);}
export function roundReceipt(result){return{id:result.id,coins:result.coins+(result.wheel?.coins??0),prize:result.wheel?.prize??result.prize,jackpot:result.jackpot,launchCount:result.launchCount,summary:result.summary?{...result.summary,bonusCoins:result.summary.bonusCoins+(result.wheel?.coins??0)}:undefined};}
// Timers advance presentation only. Debit, draw and all awards were saved atomically.
export function advanceWheels(wallet,now){
 const tickets=wallet.pendingWheels??[];let current=tickets.find(t=>t.startedAt!=null),next=wallet;
 if(current&&now>=current.startedAt+SPIN_MS+HOLD_MS){next={...wallet,pendingWheels:tickets.filter(t=>t.id!==current.id),lastWheel:{id:current.id,receipt:current.receipt,endedAt:current.startedAt+SPIN_MS+HOLD_MS}};current=null;}
 if(!current){const due=(next.pendingWheels??[]).filter(t=>t.triggerAt<=now).sort((a,b)=>a.triggerAt-b.triggerAt)[0];if(due)next={...next,pendingWheels:next.pendingWheels.map(t=>t.id===due.id?{...t,startedAt:now}:t)};}
 return next;
}
