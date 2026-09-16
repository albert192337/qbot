import { WEATHER_FADE_MS, isWeatherKind, type WeatherKind } from '../../shared/weather';
import './style.css';

const root = document.querySelector<HTMLElement>('#sky')!;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let sequence = 0;
type Scene = { element: HTMLElement; dispose(): void };
let scenes: Scene[] = [];

function createScene(kind: WeatherKind): Scene {
  const element = document.createElement('section');
  element.className = `scene ${kind}`;
  element.innerHTML = '<div class="haze"></div><div class="moon"></div>' +
    (kind === 'aurora' ? '<div class="curtain"></div><div class="curtain second"></div>' : '') +
    '<canvas></canvas><div class="mountains"></div><div class="mountains front"></div>';
  root.append(element);
  const canvas = element.querySelector('canvas')!;
  const ctx = canvas.getContext('2d')!;
  let width = innerWidth, height = innerHeight;
  const resize = () => {
    width = innerWidth; height = innerHeight;
    const scale = Math.min(devicePixelRatio, 1.5);
    canvas.width = Math.round(width * scale); canvas.height = Math.round(height * scale);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
  };
  resize(); window.addEventListener('resize', resize);
  // Stable star positions avoid a new random sky on every frame.
  let seed = 73421;
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const stars = Array.from({ length: 235 }, () => ({ x: random(), y: random() * .83, r: .35 + random() * 1.05, phase: random() * Math.PI * 2 }));
  const started = performance.now();
  let frame = 0, previous = 0;
  const render = (now: number) => {
    frame = requestAnimationFrame(render);
    if (now - previous < (reducedMotion.matches ? 1000 : 32)) return;
    previous = now;
    const t = (now - started) / 1000;
    ctx.clearRect(0, 0, width, height);
    for (const star of stars) {
      const alpha = reducedMotion.matches ? .65 : .48 + .22 * Math.sin(t * .7 + star.phase);
      ctx.fillStyle = `rgba(220,234,255,${alpha})`;
      ctx.beginPath(); ctx.arc(star.x * width, star.y * height, star.r, 0, Math.PI * 2); ctx.fill();
    }
    if (kind === 'meteor' && !reducedMotion.matches) {
      for (let i = 0; i < 3; i++) {
        const age = (t - 2.8 - i * 2.2) % 12;
        if (t < 2.8 + i * 2.2 || age < 0 || age > 1.7) continue;
        const progress = age / 1.7;
        const x = width * (.78 - i * .19 - progress * .30);
        const y = height * (.12 + i * .08 + progress * .28);
        const length = width * .12;
        ctx.globalAlpha = Math.sin(progress * Math.PI) * .9;
        const gradient = ctx.createLinearGradient(x, y, x + length, y - length * .48);
        gradient.addColorStop(0, '#f4f6ff'); gradient.addColorStop(.16, '#b4d9ffb0'); gradient.addColorStop(1, '#adcfff00');
        ctx.strokeStyle = gradient; ctx.lineWidth = 1.8;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + length, y - length * .48); ctx.stroke();
        ctx.fillStyle = '#fff8e8'; ctx.shadowColor = '#b0daff'; ctx.shadowBlur = 12;
        ctx.beginPath(); ctx.arc(x, y, 1.9, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
      }
      ctx.globalAlpha = 1;
    }
  };
  frame = requestAnimationFrame(render);
  return { element, dispose() { cancelAnimationFrame(frame); window.removeEventListener('resize', resize); element.remove(); } };
}

async function transition(kind: WeatherKind | null): Promise<void> {
  if (kind !== null && !isWeatherKind(kind)) throw new Error('Unknown weather');
  const version = ++sequence;
  const old = [...scenes];
  const next = kind ? createScene(kind) : null;
  if (next) scenes.push(next);
  // New scene fades over a fully opaque old scene: no dark/transparent dip halfway.
  const targets = next ? [next] : old;
  const animations = targets.map(scene => scene.element.animate(
    [{ opacity: next ? 0 : Number(getComputedStyle(scene.element).opacity) }, { opacity: next ? 1 : 0 }],
    { duration: WEATHER_FADE_MS, easing: 'cubic-bezier(.22,.61,.36,1)', fill: 'forwards' },
  ));
  await Promise.all(animations.map(animation => animation.finished.catch(() => {})));
  if (version !== sequence) return;
  if (next) next.element.style.opacity = '1';
  animations.forEach(animation => animation.cancel());
  old.forEach(scene => scene.dispose());
  scenes = next ? [next] : [];
  document.documentElement.dataset.weather = kind ?? 'original';
}

async function snapshot(kind: WeatherKind): Promise<void> {
  if(!isWeatherKind(kind))throw new Error('Unknown weather');
  sequence++; scenes.forEach(scene=>scene.dispose());
  const scene=createScene(kind); scene.element.style.opacity='1';scenes=[scene];
  await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));
}

/** Foreground is canvas-only: no opaque background, no interactive elements. */
async function burst(kind: WeatherKind): Promise<void> {
  if(!isWeatherKind(kind))throw new Error('Unknown weather');
  sequence++;scenes.forEach(scene=>scene.dispose());scenes=[];root.replaceChildren();
  const canvas=document.createElement('canvas');root.append(canvas);
  const ctx=canvas.getContext('2d')!;
  const width=innerWidth,height=innerHeight,scale=Math.min(devicePixelRatio,1.5);
  canvas.width=Math.round(width*scale);canvas.height=Math.round(height*scale);ctx.scale(scale,scale);
  const version=sequence,started=performance.now();
  await new Promise<void>(resolve=>{
    const draw=(now:number)=>{
      const t=(now-started)/1000;
      ctx.clearRect(0,0,width,height);
      if(version!==sequence||t>8||reducedMotion.matches){canvas.remove();resolve();return;}
      if(kind==='meteor') {
        for(let i=0;i<7;i++) {
          const p=(t-.35-i*.88)/1.5;
          if(p<0||p>1)continue;
          const x=width*(.9-(i%3)*.2-p*.38),y=height*(.07+(i%4)*.08+p*.33);
          const length=width*(i===6?.22:.12);
          ctx.globalAlpha=Math.sin(p*Math.PI);
          const trail=ctx.createLinearGradient(x,y,x+length,y-length*.55);
          trail.addColorStop(0,'#fff8df');trail.addColorStop(.12,'#4f9fefff');trail.addColorStop(.55,'#859df08a');trail.addColorStop(1,'#859df000');
          ctx.strokeStyle=trail;ctx.lineWidth=i===6?4:2.8;
          ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+length,y-length*.55);ctx.stroke();
          ctx.fillStyle='#fff7d7';ctx.shadowColor='#c4e9ff';ctx.shadowBlur=16;
          ctx.beginPath();ctx.arc(x,y,i===6?3.4:2.1,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
          for(let j=0;j<12;j++){
            const a=j*2.4+t*1.4,d=(j%4+1)*8;
            ctx.globalAlpha=Math.sin(p*Math.PI)*.4;
            ctx.fillRect(x+Math.cos(a)*d,y+Math.sin(a)*d,1.6,1.6);
          }
        }
      } else {
        ctx.globalAlpha=Math.sin(t/8*Math.PI)*.28;
        for(let i=0;i<3;i++){
          ctx.beginPath();
          for(let x=0;x<=width;x+=12){const y=height*(.1+i*.035)+Math.sin(x/width*7+t*.5+i)*height*.035;if(x===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}
          ctx.strokeStyle=['#8effd1','#81dfea','#bbc0ff'][i];ctx.lineWidth=8;ctx.shadowBlur=22;ctx.shadowColor=ctx.strokeStyle;ctx.stroke();
        }
        ctx.shadowBlur=0;
      }
      ctx.globalAlpha=1;requestAnimationFrame(draw);
    };
    requestAnimationFrame(draw);
  });
}

declare global { interface Window { qbotWeather: { transition: typeof transition; snapshot: typeof snapshot; burst: typeof burst; }; } }
window.qbotWeather = { transition, snapshot, burst };
