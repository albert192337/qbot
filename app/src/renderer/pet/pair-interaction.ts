import type { CharacterMeta } from '../../shared/ipc-types';
import { choosePairAction, pairBeats, pairFlip, type PairAction, type PairKind } from '../../shared/pair-interaction';
import './pair-interaction.css';
import {pairHeadroom} from '../../shared/pair-layout';

// Replaceable temporary art; swap for the room's final side-view table when ready.
const pairTableUrl = new URL('./assets/pair-side-table-placeholder.png', import.meta.url).href;

interface PairCallbacks {
  start(guest: CharacterMeta, partner?:string): void | Promise<void>;
  play(host: string, guest: string): void;
  replay(who: 'host' | 'guest', action: string): void;
  rest(who: 'host' | 'guest', action: string): void;
  end(outcome?: 'completed' | 'cancelled' | 'failed'): void | Promise<void>;
}
/** Local rehearsal director. Intent selection is independent of the two rendering slots. */
export class PairInteraction {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private root: HTMLElement | null = null;
  private host: CharacterMeta | null = null;
  private guest: CharacterMeta | null = null;
  private current: { host: PairAction; guest: PairAction } | null = null;
  private swapped = false;
  private overrides = new Map<string, boolean>();
  private completed = new Set<'host' | 'guest'>();
  private advance: (() => void) | null = null;
  private earliestEnd = 0;
  private ending = false;
  private transitionVersion = 0;
  private captionResize: ResizeObserver | null = null;
  private positionCaptions: (()=>void) | null = null;
  private deadline: ReturnType<typeof setTimeout> | null = null;
  private photoTimer:ReturnType<typeof setTimeout>|null=null;
  private playbackTimedOut=false;
  constructor(private callbacks: PairCallbacks) {}
  isActive(): boolean { return this.root !== null; }
  start(host: CharacterMeta, guest: CharacterMeta, kind: PairKind, live=false, recipient=false, partner?:string, lines?:string[], icons:string[]=[]): void {
    this.cancel();
    this.playbackTimedOut=false;
    this.host = host; this.guest = guest; this.swapped = false; this.overrides.clear();
    this.root = document.createElement('div'); this.root.id = 'pair-interaction';
    this.root.dataset.kind = kind;
    this.root.dataset.recipient = String(recipient);
    const captions = { host: document.createElement('div'), guest: document.createElement('div') };
    for (const who of ['host', 'guest'] as const) {
      captions[who].className = 'pair-caption'; captions[who].dataset.speaker = who;
      captions[who].setAttribute('role', 'status');
      const text = document.createElement('div'); text.className = 'pair-caption-text';
      captions[who].append(text);
    }
    const effects = document.createElement('div'); effects.className = 'pair-effects'; effects.setAttribute('aria-hidden', 'true');
    const toolbar = document.createElement('div'); toolbar.className = 'pair-toolbar';
    const names = document.createElement('span'); names.className = 'pair-names';
    names.textContent = `${host.manifest.name} · ${guest.manifest.name}`;
    names.title = live?'双方同意的互动；缺少朝向信息时可手动转向。':'本地双人试演；缺少朝向信息时可手动转向。回应按角色人设生成，模型不可用时使用备用台词。';
    toolbar.append(names);
    const button = (label: string, click: () => void) => {
      const b = document.createElement('button'); b.textContent = label; b.onclick = click; toolbar.append(b);
    };
    button('我转向', () => this.turn('host'));
    button('对方转向', () => this.turn('guest'));
    button('换边', () => { this.swapped = !this.swapped; this.applyFacing(); });
    button('结束', () => this.finish('cancelled'));
    this.root.append(captions.host, captions.guest, effects);if(!live)this.root.append(toolbar);document.body.append(this.root);
    // Reserve real space above BOTH complete actor rectangles, not transparent art margins.
    const positionCaptions = () => {
      if (!this.root) return;
      const height = this.root.clientHeight, width = this.root.clientWidth;
      const headroom = pairHeadroom(height), actorTop = headroom + (height-headroom)*.1;
      document.body.style.setProperty('--pair-headroom', `${headroom}px`);
      let captionTop = actorTop-8;
      for (const caption of Object.values(captions)) {
        if (caption.hidden) continue;
        caption.style.bottom = `${height-actorTop+8}px`;
        const leftSpeaker = (caption.dataset.speaker==='host')!==this.swapped;
        const center = width*(leftSpeaker ? .33 : .67), half=caption.offsetWidth/2;
        caption.style.left = `${Math.max(half+8,Math.min(center,width-half-8))}px`;
        captionTop = Math.min(captionTop,actorTop-8-caption.offsetHeight);
      }
      toolbar.style.bottom = `${height-captionTop+8}px`;
    };
    if(typeof ResizeObserver!=='undefined'){
      this.captionResize = new ResizeObserver(positionCaptions);
      this.captionResize.observe(this.root);
      Object.values(captions).forEach(caption => this.captionResize!.observe(caption));
      this.captionResize.observe(toolbar);
    }
    this.positionCaptions=positionCaptions;
    positionCaptions();
    document.body.classList.add('pair-mode');
    const scene=this.root;
    const relationshipSession = crypto.randomUUID();
    let ready:void|Promise<void>;
    try{ready=this.callbacks.start(guest,partner);}catch{this.cancel();return;}
    this.deadline=setTimeout(()=>{if(this.root===scene)this.finish('failed');},45_000);
    const beats = pairBeats(kind).map((beat,i)=>({...beat,caption:lines?.[i]??beat.caption})).map(beat=>recipient?{...beat,host:beat.guest,guest:beat.host,speaker:beat.speaker==='host'?'guest' as const:'host' as const,effect:beat.effect==='host-talk'?'guest-talk' as const:beat.effect==='guest-talk'?'host-talk' as const:beat.effect}:beat);
    const advance = (index: number) => {
      if (this.root !== scene || this.ending) return;
      if(this.timer)clearTimeout(this.timer);this.timer=null;
      const beat = beats[index];
      if (!beat) { this.finish(); return; }
      const hostAction = choosePairAction(host.manifest, beat.host);
      const guestAction = choosePairAction(guest.manifest, beat.guest);
      if (!hostAction || !guestAction) { this.cancel(); return; }
      this.current = { host: hostAction, guest: guestAction };
      this.completed.clear(); this.earliestEnd = Date.now() + 4500;
      this.advance = () => advance(index + 1);
      this.root.dataset.hostAction = hostAction.id; this.root.dataset.guestAction = guestAction.id;
      this.root.dataset.beat = String(index);
      this.applyFacing();
      for (const who of ['host', 'guest'] as const) {
        captions[who].hidden = (live && !lines?.length) || who !== beat.speaker;
        captions[who].firstElementChild!.textContent = who === beat.speaker ? beat.caption : '';
        captions[who].title = who === 'host' ? host.manifest.name : guest.manifest.name;
      }
      positionCaptions();
      effects.replaceChildren(); effects.dataset.effect = beat.effect;
      if(beat.effect==='icon-throw'){
        effects.dataset.thrower=recipient?(beat.speaker==='host'?'guest':'host'):beat.speaker;
        for(let i=0;i<3;i++){
          const src=icons[i%Math.max(1,icons.length)];
          const prop=document.createElement(src?'img':'span');prop.className='pair-icon-copy';
          if(src)(prop as HTMLImageElement).src=src;else prop.textContent='📄';
          prop.style.animationDelay=`${i*.7}s`;effects.append(prop);
        }
      }
      if(['flower','photo','celebrate'].includes(beat.effect)){const prop=document.createElement('span');prop.className='pair-shared-prop';prop.textContent=beat.effect==='flower'?'🌷':beat.effect==='photo'?'📷 ✨':'🎉 ✨ 🎊';effects.append(prop);}
      if (beat.effect === 'heart') {
        for (let i = 0; i < 3; i++) {
          const heart = document.createElement('span'); heart.className = 'pair-heart'; heart.textContent = '♥';
          heart.style.animationDelay = `${i * .55}s`; effects.append(heart);
        }
      } else if (beat.effect === 'tea') {
        const table = document.createElement('img');
        table.className = 'pair-tea'; table.src = pairTableUrl;
        table.alt = ''; table.draggable = false; table.dataset.artStatus = 'replaceable-placeholder';
        effects.append(table);
      } else if (beat.effect === 'wave') {
        const bubble = document.createElement('span'); bubble.className = 'pair-talk';
        bubble.textContent = beat.effect === 'wave' ? '✦' : '•••'; effects.append(bubble);
      }
      this.callbacks.play(hostAction.id, guestAction.id);
      if(kind==='photo'&&index===beats.length-1&&window.qbot.autonomy?.photo){
        this.photoTimer=setTimeout(()=>{
          this.photoTimer=null;if(this.root!==scene)return;
          scene.classList.add('pair-capturing');
          const capture=new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));
          void capture.then(()=>{if(this.root!==scene)return;return window.qbot.autonomy.photo();}).then(()=>{
            if(this.root===scene){captions[beat.speaker].firstElementChild!.textContent='合影已保存在本机相册';positionCaptions();}
          },()=>{if(this.root===scene)captions[beat.speaker].firstElementChild!.textContent='合影保存失败，可以再试一次';}).finally(()=>scene.classList.remove('pair-capturing'));
        },1200);
      }
      if (index === 0 && !live) void window.qbot.relationships?.recordLocal(host.dirId,guest.dirId,kind,relationshipSession)
        .catch(error => console.error('关系手账保存失败', error));
      // Actual ended events advance normal clips; this only recovers broken media.
      this.timer = setTimeout(() => {this.playbackTimedOut=true;advance(index + 1);}, Math.min(12_000,Math.max(6000, hostAction.durationMs, guestAction.durationMs)+1500));
    };
    void Promise.resolve(ready).then(()=>{if(this.root===scene&&!this.ending)advance(0);}).catch(()=>{if(this.root===scene)this.cancel();});
  }
  ended(who: 'host' | 'guest'): void {
    if (!this.root || this.ending || !this.advance || !this.current || this.completed.has(who)) return;
    if (Date.now() < this.earliestEnd) {
      this.callbacks.replay(who, this.current[who].id);
      return;
    }
    this.completed.add(who);
    if (this.completed.size !== 2) {
      // Keep breathing/listening while the other actor finishes its complete clip.
      const character = this[who];
      const idle = character && choosePairAction(character.manifest, 'listen');
      if (idle) {
        this.current[who] = idle;
        this.root.dataset[who === 'host' ? 'hostAction' : 'guestAction'] = idle.id;
        this.applyFacing();
      }
      this.callbacks.rest(who, idle?.id ?? this.current[who].id);
      return;
    }
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.advance();
  }
  private key(who: 'host' | 'guest'): string { return `${this[who]?.dirId}:${this.current?.[who].id}`; }
  private flipped(who: 'host' | 'guest'): boolean {
    const override = this.overrides.get(this.key(who));
    return override !== undefined ? override !== this.swapped : pairFlip(this.current?.[who].facing,
      (who === 'host') !== this.swapped ? 'left' : 'right');
  }
  private turn(who: 'host' | 'guest'): void {
    this.overrides.set(this.key(who), (!this.flipped(who)) !== this.swapped); this.applyFacing();
  }
  private applyFacing(): void {
    document.body.classList.toggle('pair-swapped', this.swapped);
    document.body.classList.toggle('flip-host', this.flipped('host'));
    document.body.classList.toggle('flip-visitor', this.flipped('guest'));
    this.positionCaptions?.();
  }
  /** Fade the old layout out; do not reveal the solo layout until native resize acknowledges. */
  finish(outcome:'completed'|'cancelled'|'failed'='completed'): void {
    if (!this.root || this.ending) return;
    this.ending = true;
    const version = ++this.transitionVersion;
    if (this.timer) clearTimeout(this.timer);
    document.body.classList.add('pair-leaving');
    this.timer = setTimeout(() => {
      this.timer = null;
      document.body.classList.add('pair-returning');
      document.body.classList.remove('pair-leaving');
      const resized = this.clearScene(outcome==='completed'&&this.playbackTimedOut?'failed':outcome);
      const reveal = () => {
        if (version !== this.transitionVersion) return;
        this.timer = setTimeout(() => {
          document.body.classList.add('pair-arriving');
          document.body.classList.remove('pair-returning');
          this.ending = false;
          this.timer = setTimeout(() => { document.body.classList.remove('pair-arriving'); this.timer = null; }, 420);
        }, 80);
      };
      void Promise.resolve(resized).then(reveal, reveal);
    }, 240);
  }
  cancel(): void {
    this.transitionVersion++; this.ending = false;
    if (this.timer) clearTimeout(this.timer); this.timer = null;
    document.body.classList.remove('pair-leaving', 'pair-returning', 'pair-arriving');
    void this.clearScene();
  }
  private clearScene(outcome:'completed'|'cancelled'|'failed'='cancelled'): void | Promise<void> {
    if(this.deadline)clearTimeout(this.deadline);this.deadline=null;
    if(this.photoTimer)clearTimeout(this.photoTimer);this.photoTimer=null;
    this.captionResize?.disconnect(); this.captionResize = null;
    this.positionCaptions = null;
    if (!this.root) return;
    this.root.remove(); this.root = null; this.current = null; this.advance = null; this.completed.clear();
    document.body.classList.remove('pair-mode', 'pair-swapped', 'flip-host', 'flip-visitor');
    this.host = this.guest = null;
    return this.callbacks.end(outcome);
  }
}
