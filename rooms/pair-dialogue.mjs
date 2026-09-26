import { randomUUID } from 'node:crypto';

/** Account ownership and the speaking character are separate identities. */
export class PairDialogue {
  pending = new Map();
  constructor({ timeoutMs = 9000 } = {}) { this.timeoutMs = timeoutMs; }
  answer(peer, frame) {
    const pending = this.pending.get(frame.request);
    if (!pending || pending.peer !== peer || !pending.valid()) return false;
    const text = typeof frame.line === 'string' ? frame.line.trim() : '';
    pending.finish(text && [...text].length <= (pending.maxLength||60) && !/[\r\n{}]/.test(text) ? text : null);
    return true;
  }
  cancel(peer) {
    for (const pending of this.pending.values()) if (pending.participants.includes(peer)) pending.finish(null);
  }
  async userChat({peer,companion,topic,history,valid}) {
    if(peer.companionChat!==1||!valid())return null;
    return new Promise(resolve=>{
      const request=randomUUID();
      const finish=value=>{clearTimeout(timer);this.pending.delete(request);resolve(value);};
      const timer=setTimeout(()=>finish(null),this.timeoutMs);
      this.pending.set(request,{peer,participants:[peer,companion],valid,finish,maxLength:120});
      try{peer.send(JSON.stringify({t:'companion:user-line',roomId:peer.roomId,request,user:{nickname:companion.nickname,persona:companion.profile.userPersona},topic,history}));}catch{finish(null);}
    });
  }
  async prepare({ host, guest, actor, guestActor, kind, beats, valid }) {
    const lines = [];
    for (const [step, beat] of beats.entries()) {
      if (!valid()) return null;
      const speaker = beat.speaker === 'host' ? host : guest;
      const other = speaker === host ? guest : host;
      const peer = speaker.companion ? other : speaker;
      let line = null;
      if (!peer.companion && peer.pairDialogue === 1) {
        line = await new Promise(resolve => {
          const request = randomUUID();
          const finish = value => { clearTimeout(timer); this.pending.delete(request); resolve(value); };
          const timer = setTimeout(() => finish(null), this.timeoutMs);
          this.pending.set(request, { peer, participants: [host, guest], valid, finish });
          try { peer.send(JSON.stringify({ t: 'garden:pair-line', roomId: host.roomId, request, kind, step,
            actor: peer === host ? actor : guestActor, partner: other.character?.name || '伙伴', partnerPersona: other.character?.persona || '', history: lines,
            intent: beat[beat.speaker],
            ...(speaker.companion ? { companion: { name: speaker.character?.name || '伙伴', persona: speaker.character?.persona || '' } } : {}) })); }
          catch { finish(null); }
        });
      }
      lines.push(line ?? beat.caption);
    }
    return valid() ? lines : null;
  }
}
