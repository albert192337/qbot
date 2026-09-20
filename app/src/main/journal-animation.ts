import { getSettings } from './config';
import { getCharacter } from './characters';
import { brainActions } from './brain-actions';
import { isChatting } from './conversation-memory';

export function chooseJournalAction(actions:Array<{id:string;description:string}>,random= Math.random):string|undefined {
  const matches=actions.filter(a=>/写字|写作|写手账|写日记|记日记|记录心情|打字|敲键盘|电脑|手机|笔记本|\b(writing|typing|computer|phone|journal)\b/i.test(a.id+' '+a.description));
  return matches[Math.min(matches.length-1,Math.max(0,Math.floor(random()*matches.length)))]?.id;
}
/** One short, interruptible writing gesture. No new model or asset generation. */
export async function playJournalWriting(actor:string):Promise<void> {
  const settings=await getSettings();
  if(!settings.freeMode||(settings.activeCharacter??'default')!==actor||isChatting(actor))return;
  const character=settings.activeCharacter?await getCharacter(settings.activeCharacter):null;
  const action=chooseJournalAction(brainActions(character?.manifest));
  const latest=await getSettings();
  if(!action||!latest.freeMode||(latest.activeCharacter??'default')!==actor)return;
  const {sendToWindows}=await import('./windows');
  sendToWindows('behavior:action',{action,loops:2,preview:false});
}
