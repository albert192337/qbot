// Small synthesized mechanical/chime cues. No downloads or background loop.
// [frequency, offset, duration, gain, waveform, endFrequency]
export function cueNotes(type,detail={}){
 const bell=(frequency,offset=0,duration=.22,gain=.12)=>[frequency,offset,duration,gain,'sine'];
 switch(type){
  case 'launch':return [[105,0,.085,.22,'triangle',65],bell(1800,.02,.035,.07),[210,.10,.30,.14,'triangle',840],bell(1568,.31,.16,.085),bell(2093,.37,.2,.06)];
  case 'hit':{const pitch=[784,880,1047,1175,1319][(detail.variant??0)%5];return [bell(pitch,0,.09,.10),bell(pitch*2.37,0,.035,.025),[180,0,.028,.04,'triangle',90]];}
  case 'multi':{const pitch=440*2**(((detail.value??2)-2)/12);return [bell(pitch),bell(pitch*1.5,.06)];}
  case 'split':return [[500,0,.16,.13,'triangle',1400],[750,.05,.15,.09,'sine',2100]];
  case 'star':return [bell(784,0,.26),bell(1175,.07,.32),bell(1568,.15,.38,.085)];
  case 'save':return [[220,0,.18,.13,'triangle',880],bell(1100,.12,.2,.08)];
  case 'bank':{const factor=(detail.value??0)>=500?1.25:1;return [[125,0,.065,.14,'triangle',70],bell(1047*factor,.025,.17,.10),bell(1319*factor,.075,.24,.09),bell(1568*factor,.14,.32,.07)];}
  case 'wheelStart':return [[330,0,.32,.12,'triangle',990],bell(1320,.2,.28,.10)];
  case 'wheelTick':return [bell(1500,0,.026,.075),bell(650,0,.018,.04)];
  case 'jackpot':return [bell(523,0,.38,.20),bell(659,.13,.38,.17),bell(784,.26,.38,.17),bell(1047,.43,.65,.19),bell(1319,.48,.6,.10),bell(1568,.53,.7,.09)];
  default:return [];
 }
}
export function synthesize(context,output,type,detail={},onEnded=()=>{}){
 const start=context.currentTime+.004,voices=[];
 for(const [frequency,offset,duration,level,wave='sine',end=frequency] of cueNotes(type,detail)){
  const oscillator=context.createOscillator(),gain=context.createGain(),at=start+offset;
  oscillator.type=wave;oscillator.frequency.setValueAtTime(frequency,at);oscillator.frequency.exponentialRampToValueAtTime(end,at+duration);
  gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(level,at+.004);gain.gain.exponentialRampToValueAtTime(.0001,at+duration);
  oscillator.connect(gain);gain.connect(output);
  const voice={stop:()=>{try{oscillator.stop();}catch{}oscillator.disconnect();gain.disconnect();}};
  oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();onEnded(voice);};
  oscillator.start(at);oscillator.stop(at+duration+.01);voices.push(voice);
 }
 return voices;
}
export class PinballAudio{
 constructor(enabled=true){this.enabled=enabled;this.voices=new Set();this.last=new Map();this.played=0;this.peakVoices=0;this.duckUntil=0;}
 unlock(){
  if(!this.enabled)return;
  try{
   if(!this.context){this.context=new AudioContext();this.master=this.context.createGain();this.master.gain.value=.22;this.compressor=this.context.createDynamicsCompressor();this.compressor.threshold.value=-16;this.compressor.ratio.value=6;this.master.connect(this.compressor);this.compressor.connect(this.context.destination);}
   if(this.context.state==='suspended')void this.context.resume().catch(()=>{});
  }catch{}
 }
 setEnabled(enabled){this.enabled=enabled;if(!enabled)this.stop();else this.unlock();}
 stop(){for(const voice of this.voices)voice.stop();this.voices.clear();this.last.clear();this.duckUntil=0;}
 play(type,detail={}){
  if(!this.enabled||this.context?.state!=='running')return false;
  const now=this.context.currentTime,delay=({hit:.065,bank:.09,wheelTick:.055,jackpot:.8})[type]??.13;
  if(now-(this.last.get(type)??-100)<delay)return false;
  if(now<this.duckUntil&&['hit','bank','multi'].includes(type))return false;
  const count=cueNotes(type,detail).length;if(!count)return false;
  if(type==='jackpot'){this.stop();this.duckUntil=now+1.4;}
  if(this.voices.size+count>24)return false;
  this.last.set(type,now);
  for(const voice of synthesize(this.context,this.master,type,detail,ended=>this.voices.delete(ended)))this.voices.add(voice);
  this.played++;this.peakVoices=Math.max(this.peakVoices,this.voices.size);return true;
 }
 stats(){return{enabled:this.enabled,played:this.played,voices:this.voices.size,peakVoices:this.peakVoices,state:this.context?.state??'uninitialized'};}
 dispose(){this.stop();void this.context?.close();}
}
// Isolated Electron verification renders the same synthesis offline, without speakers.
export async function auditAudio(){
 const report={};
 for(const type of ['launch','hit','multi','split','star','save','bank','wheelStart','wheelTick','jackpot']){
  const context=new OfflineAudioContext(1,96000,48000),gain=context.createGain();gain.gain.value=.22;gain.connect(context.destination);synthesize(context,gain,type);
  const data=(await context.startRendering()).getChannelData(0);let energy=0,peak=0;
  for(const sample of data){energy+=sample*sample;peak=Math.max(peak,Math.abs(sample));}
  report[type]={peak,rms:Math.sqrt(energy/data.length),duration:cueNotes(type).reduce((n,note)=>Math.max(n,note[1]+note[2]),0)};
 }
 return report;
}
