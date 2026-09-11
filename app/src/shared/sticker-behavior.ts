import type { Manifest } from '@qbot/pipeline';
import type { StickerLibrary } from './sticker-library';
export type StickerManifest = Manifest & {stickerLibrary?: StickerLibrary};
const MEANINGS: Array<[string, RegExp]> = [
  ['悲伤',/伤心|沮丧|难过|失落|失望|哭|悲伤/],['开心',/开心|高兴|快乐|欢呼|庆祝/],
  ['工作',/工作|打字|忙碌|敲键盘/],['思考',/思考|疑惑|思绪/],['等待',/等待|期待|等你/],
  ['休息',/安静|发呆|惬意|趴|无聊至极/],['睡觉',/睡觉|瞌睡|打哈欠/],
  ['生气',/生气|愤怒|嫌弃|不耐烦/],['花园',/花花|种花|播种|浇水|收获/],
];
export function filenameTags(name: string): string[] {
  return [...new Set([...name.split(/[，,、；;。.]+/).map(s=>s.trim()).filter(Boolean),...MEANINGS.filter(([,rx])=>rx.test(name)).map(([tag])=>tag)])];
}
export function actionDisplayName(m: StickerManifest,id:string): string {
  const lib=m.stickerLibrary;
  const key=lib?.scenes[id]??id;
  return lib?.items.find(i=>i.id===key)?.name || lib?.variants?.[key]?.description || id;
}
/** One-time migration only fills absent defaults; individual user mappings win. */
export function enrichStickerBehavior(m: StickerManifest): boolean {
  const lib=m.stickerLibrary;if(!lib||lib.semanticVersion===2)return false;
  lib.items.forEach(i=>i.tags=[...new Set([...i.tags,...filenameTags(i.name)])]);
  const items=lib.items.filter(i=>!i.error&&i.enabled&&m.customActions?.[i.id]?.status==='done');
  const choose=(patterns:RegExp[])=>patterns.map(rx=>items.find(i=>rx.test(i.name))?.id).find(Boolean);
  const mapping:Record<string,RegExp[]>={
    thinking:[/^思考/,/疑惑/],working:[/^打字、工作/,/工作繁忙|工作/],waiting:[/^期待$/, /等待|期待/],
    error:[/^伤心$/, /沮丧|伤心|难过|哭/],doneAction:[/^干完工作/,/庆祝|开心/],
    musicAction:[/跟着音乐摇晃/,/音乐|跳舞/],meetingAction:[/安静坐/,/思考/],
  };
  m.agentActions??={};
  const values=Object.entries(m.agentActions).filter(([k])=>k!=='doneLoops').map(([,v])=>v);
  const oldBroken=values.length>=4&&values.every(v=>v==='talk_happy');
  for(const [key,patterns]of Object.entries(mapping)){
    const id=choose(patterns);if(id&&(!m.agentActions[key as keyof typeof m.agentActions]||oldBroken)) (m.agentActions as Record<string,unknown>)[key]=id;
  }
  lib.idleCandidates??=items.filter(i=>/安静|发呆|无聊至极|无聊、惬意|趴地上/.test(i.name)).map(i=>i.id).slice(0,8);
  if(lib.scenes.idle&&!lib.idleCandidates.includes(lib.scenes.idle))lib.idleCandidates.unshift(lib.scenes.idle);
  for(const [scene,patterns]of Object.entries({garden_sow:[/播种|种花|浇水/,/^给你花花$/],garden_harvest:[/收获/,/拿着花花.*开心/,/^开心$/]})){
    if(lib.scenes[scene])continue;
    const id=choose(patterns);if(!id)continue;
    lib.scenes[scene]=id;m.actions[scene as keyof typeof m.actions]={...m.customActions![id]};
    if(scene==='garden_sow'&&!/播种|种花|浇水/.test(items.find(i=>i.id===id)!.name)){
      lib.sceneNotes={...lib.sceneNotes,garden_sow:'原库没有播种动作，暂用递花表情；可选帧生成真正播种动作。'};
    }
  }
  lib.semanticVersion=2;return true;
}
export function chooseIdle(pool:string[],previous:string,random:()=>number):string{
  const next=pool.filter(id=>id!==previous);const candidates=next.length?next:pool;
  return candidates[Math.floor(random()*candidates.length)]??'idle';
}
