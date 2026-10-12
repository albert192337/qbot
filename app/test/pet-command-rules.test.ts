import {it,expect} from 'vitest';
import {parsePetCommand,chooseCommandOpportunity} from '../src/main/pet-command-rules';
import type {BehaviorOpportunity} from '../src/shared/behavior-catalog';
it('parses the explicit Chinese command variants and leaves ordinary conversation untouched',()=>{
 expect(parsePetCommand(' 指令： 双人打闹 ')).toEqual({type:'pair',kind:'fight'});
 expect(parsePetCommand('指令和小白白一起喝茶')).toEqual({type:'pair',kind:'tea',target:'小白白'});
 expect(parsePetCommand('指令邀请小白白过来玩')).toEqual({type:'invite',target:'小白白'});
 expect(parsePetCommand('指令拍照')).toEqual({type:'pair',kind:'photo'});
 expect(parsePetCommand('指令收菜')).toEqual({type:'harvest'});expect(parsePetCommand('指令')).toEqual({type:'help'});
 expect(parsePetCommand('什么是指令双人打闹')).toBeNull();expect(parsePetCommand('他说“指令打闹”')).toBeNull();
});
it('prefers visible peers, resolves exact names without substitutions, and rejects same-name ambiguity',()=>{
 const choice=(id:string,name:string):BehaviorOpportunity=>({id,target:id,behavior:'pair',kind:'fight',targetName:name,label:name,reason:'test',revision:'1'});
 const choices=[choice('local:a','甲'),choice('pair:b','乙')];
 expect(chooseCommandOpportunity({type:'pair',kind:'fight'},choices)?.target).toBe('pair:b');
 expect(chooseCommandOpportunity({type:'pair',kind:'fight',target:'甲'},choices)?.target).toBe('local:a');
 expect(chooseCommandOpportunity({type:'pair',kind:'fight',target:'丙'},choices)).toBeUndefined();
 expect(()=>chooseCommandOpportunity({type:'pair',kind:'fight',target:'甲'},[choice('local:a','甲'),choice('local:c','甲')])).toThrow('同名');
});
