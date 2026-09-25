import {expect,it} from 'vitest';
import {exteriorHintPosition,HINT_SIZE} from '../src/shared/pet-hint';
import {canRemind,recordReminder,reminderDay} from '../src/shared/wish-reminder';
it('keeps hints wholly outside the actor at every edge, with negative monitor coordinates',()=>{
  const area={x:-1600,y:-200,width:1600,height:1000};
  for(const x of [-1600,-1200,-360])for(const y of [-200,100,440]){
    const pet={x,y,width:360,height:360},p=exteriorHintPosition(pet,area)!;
    expect(p).not.toBeNull();expect(p.x).toBeGreaterThanOrEqual(area.x);expect(p.y).toBeGreaterThanOrEqual(area.y);
    expect(p.x+HINT_SIZE.width).toBeLessThanOrEqual(area.x+area.width);expect(p.y+HINT_SIZE.height).toBeLessThanOrEqual(area.y+area.height);
    expect(p.x+HINT_SIZE.width<=x||p.x>=x+360||p.y+HINT_SIZE.height<=y||p.y>=y+360).toBe(true);
  }
});
it('suppresses the hint when no exterior space exists',()=>expect(exteriorHintPosition({x:0,y:0,width:360,height:360},{x:0,y:0,width:360,height:360})).toBeNull());
it('caps at twice daily with four hours between, and respects dismissal across reload',()=>{
  const now=new Date(2026,8,25,9).getTime(),hour=3600000;
  expect(canRemind(undefined,now)).toBe(true);
  let record=recordReminder(undefined,now);
  expect(canRemind(JSON.parse(JSON.stringify(record)),now+hour)).toBe(false);
  expect(canRemind(record,now+4*hour)).toBe(true);
  record=recordReminder(record,now+4*hour);expect(canRemind(record,now+8*hour)).toBe(false);
  expect(canRemind({...record,count:1,dismissed:true},now+8*hour)).toBe(false);
  expect(canRemind(record,now+24*hour)).toBe(true);
});
it('midnight does not bypass the interval',()=>{
  const now=new Date(2026,8,25,23).getTime(),r=recordReminder(undefined,now);
  expect(reminderDay(now+2*3600000)).not.toBe(r.day);expect(canRemind(r,now+2*3600000)).toBe(false);
});
