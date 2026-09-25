export type WishReminder = {day:string;count:number;last:number;dismissed:boolean};
export function reminderDay(now:number):string {const d=new Date(now);return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;}
export function canRemind(record:WishReminder|undefined,now:number):boolean {
  return !record || (record.day!==reminderDay(now) ? now-record.last>=4*60*60*1000 : !record.dismissed&&record.count<2&&now-record.last>=4*60*60*1000);
}
export function recordReminder(record:WishReminder|undefined,now:number):WishReminder {
  return {day:reminderDay(now),count:record?.day===reminderDay(now)?record.count+1:1,last:now,dismissed:false};
}
