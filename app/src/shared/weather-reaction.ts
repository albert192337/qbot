import type { Manifest } from '@qbot/pipeline';
import type { WeatherKind } from './weather';
import { pairActions } from './pair-interaction';
import { actionDisplayName, type StickerManifest } from './sticker-behavior';

/** Prefer looking up / wonder, then a happy reaction; never pick a random unrelated clip. */
export function weatherReaction(kind: WeatherKind, manifest: Manifest): {text:string;action:string|null} {
  const clips=pairActions(manifest),m=manifest as StickerManifest;
  const patterns=kind==='meteor'
    ? [/抬头|仰望|看星|许愿|look.?up|stargaz|wish/i,/惊喜|惊讶|哇|惊叹|surpris|amaze/i,/期待|开心|欢呼|庆祝|happy|excited/i]
    : [/抬头|仰望|看天空|欣赏|look.?up|admire/i,/惊喜|惊叹|陶醉|amaze/i,/开心|微笑|惬意|happy|smile/i];
  const label=(id:string)=>{
    const source=m.stickerLibrary?.scenes[id]??id;
    const item=m.stickerLibrary?.items.find(i=>i.id===source);
    return `${id} ${actionDisplayName(m,id)} ${item?.tags.join(' ')??''} ${clips.get(id)?.sourceName??''}`;
  };
  const candidates=[...clips.keys()].filter(id=>!/不开心|不高兴|生气|伤心|哭|害怕|愤怒|angry|sad|cry|scared/i.test(label(id)));
  const action=patterns.map(rx=>candidates.find(id=>rx.test(label(id)))).find(Boolean)
    ?? ['talk_happy','wave','idle'].find(id=>clips.has(id)) ?? null;
  return {text:kind==='meteor'?'哇，流星！快许个愿，我帮你保密。':'快看，极光！天空像在慢慢跳舞呢。',action};
}
