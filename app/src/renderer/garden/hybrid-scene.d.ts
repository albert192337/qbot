import type { HybridPlant } from '../../shared/garden-hybrid';
import type { GardenScenePlacement } from '../../shared/garden-scene-layout';
export interface HybridScene {
 update(plants:HybridPlant[]):Promise<void>; shake(index:number):void; pick(x:number,y:number):number|null; dispose():void;
 readonly hits:{index:number;x:number;y:number;width:number;height:number;center:number;baseline:number}[];
 readonly info:{geometries:number;textures:number;frames:number};
}
export function createHybridScene(host:HTMLElement,onLayout:(p:GardenScenePlacement)=>void,onError:(message:string)=>void):HybridScene;
