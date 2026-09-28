import {describe,it,expect} from 'vitest';
import {experienceProgress} from '../src/shared/experience-progress';
import {experienceHintPosition} from '../src/shared/pet-hint';
import {headAllows,headWinner} from '../src/shared/desktop-overlays';

describe('experience feedback',()=>{
  it('uses real level thresholds and handles crossing and maximum level',()=>{
    expect(experienceProgress(10)).toEqual({level:1,fraction:.5,max:false});
    expect(experienceProgress(20)).toEqual({level:2,fraction:0,max:false});
    expect(experienceProgress(40)).toEqual({level:2,fraction:.5,max:false});
    expect(experienceProgress(1200)).toEqual({level:10,fraction:1,max:true});
  });
  it('stays outside the character and suppresses at the upper screen edge',()=>{
    const area={x:0,y:0,width:1000,height:800};
    expect(experienceHintPosition({x:300,y:200,width:200,height:250},area)).toEqual({x:335,y:116});
    expect(experienceHintPosition({x:300,y:70,width:200,height:250},area)).toBeNull();
  });
  it('shares the interaction slot and hides other progress and head content',()=>{
    const winner=headWinner(['quest','speech','wish','interaction']);
    expect(winner).toBe('interaction');
    for(const kind of ['quest','speech','wish'] as const)expect(headAllows(winner,kind)).toBe(false);
  });
});
