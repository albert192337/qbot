import { Filter, GlProgram } from 'pixi.js';

// Original procedural material: narrow accretion bands, broken orbit light, dark core.
// No third-party shader or licensed effect asset is embedded here.
const vertex = `
in vec2 aPosition;
out vec2 vUV;
uniform vec4 uOutputFrame;
uniform vec4 uOutputTexture;
void main(){
  vec2 p=aPosition*uOutputFrame.zw+uOutputFrame.xy;
  gl_Position=vec4(p.x*2.0/uOutputTexture.x-1.0,p.y*(2.0*uOutputTexture.z/uOutputTexture.y)-uOutputTexture.z,0.,1.);
  vUV=aPosition;
}`;
const fragment = `
precision highp float;
in vec2 vUV;
out vec4 finalColor;
uniform float uTime;
uniform float uOpen;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
float fbm(vec2 p){return noise(p)*.55+noise(p*2.07)*.27+noise(p*4.13)*.12+noise(p*8.23)*.06;}
void main(){
  vec2 p=(vUV-.5)*2.;
  float r=length(p),a=atan(p.y,p.x);
  float warp=fbm(vec2(cos(a)*3.+uTime*.19,sin(a)*3.-uTime*.11));
  float radius=.63+(warp-.5)*.035;
  float edge=r-radius;
  float detail=fbm(vec2(a*5.+uTime*.7,r*52.-uTime*.45));
  float filament=pow(.5+.5*sin(edge*510.+detail*8.+a*4.-uTime*2.2),9.);
  float band=exp(-abs(edge)*40.)*(.08+filament*.48);
  float rim=exp(-abs(edge)*240.);
  float hot=pow(.5+.5*sin(a*2.2-uTime*.55),5.);
  float halo=exp(-abs(edge)*14.)*.11;
  float outside=smoothstep(radius-.025,radius+.014,r);
  vec3 silver=mix(vec3(.30,.23,.47),vec3(.94,.84,.70),hot);
  vec3 light=silver*(band+rim*(.25+.8*hot)+halo);
  light+=vec3(.32,.24,.48)*exp(-abs(edge-.045)*23.)*detail*.18;
  float core=(1.-smoothstep(radius-.02,radius+.01,r))*.96;
  float lightAlpha=clamp(max(light.r,max(light.g,light.b)),0.,1.);
  float alpha=max(core,lightAlpha)*(1.-smoothstep(.86,1.,r))*uOpen;
  vec3 col=mix(vec3(.014,.010,.025),light/max(lightAlpha,.001),outside);
  col+=vec3(.05,.025,.09)*noise(p*6.+uTime*.04)*(1.-outside);
  finalColor=vec4(col*alpha,alpha);
}`;

export function createPortalFilter(): Filter {
  return new Filter({glProgram:GlProgram.from({vertex,fragment}),resources:{portal:{uTime:{value:0,type:'f32'},uOpen:{value:0,type:'f32'}}}});
}
