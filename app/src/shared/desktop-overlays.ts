/** One occupant per desktop head area. Keep docs/desktop-ui-priority.md in sync. */
export const HEAD_PRIORITY={interaction:60,wish:50,speech:30,quest:10} as const;
export type HeadOverlay=keyof typeof HEAD_PRIORITY;
export type HeadSnapshot={revision:number;winner:HeadOverlay|null};
export const headWinner=(active:readonly HeadOverlay[]):HeadOverlay|null=>
  [...active].sort((a,b)=>HEAD_PRIORITY[b]-HEAD_PRIORITY[a])[0]??null;
export const headAllows=(winner:HeadOverlay|null,kind:HeadOverlay)=>winner===null||HEAD_PRIORITY[kind]>=HEAD_PRIORITY[winner];

export class HeadOverlayRegistry {
  private owners=new Map<number,Set<HeadOverlay>>();
  private revision=0;
  snapshot():HeadSnapshot{return {revision:this.revision,winner:headWinner([...this.owners.values()].flatMap(s=>[...s]))};}
  report(owner:number,kind:HeadOverlay,active:boolean):boolean {
    const set=this.owners.get(owner)??new Set<HeadOverlay>();
    if(set.has(kind)===active)return false;
    if(active)set.add(kind);else set.delete(kind);
    if(set.size)this.owners.set(owner,set);else this.owners.delete(owner);
    this.revision++;return true;
  }
  release(owner:number):boolean {if(!this.owners.delete(owner))return false;this.revision++;return true;}
}
