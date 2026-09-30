import { Filter, GlProgram } from 'pixi.js';
const vertex=`in vec2 aPosition;out vec2 vTextureCoord;out vec2 vUV;uniform vec4 uInputSize;uniform vec4 uOutputFrame;uniform vec4 uOutputTexture;
void main(){vec2 p=aPosition*uOutputFrame.zw+uOutputFrame.xy;gl_Position=vec4(p.x*2./uOutputTexture.x-1.,p.y*(2.*uOutputTexture.z/uOutputTexture.y)-uOutputTexture.z,0.,1.);vTextureCoord=aPosition*uOutputFrame.zw*uInputSize.zw;vUV=aPosition;}`;

// Repair only the narrow alpha boundary; opaque interior colours stay untouched.
export function createEdgeFilter(){return new Filter({padding:3,glProgram:GlProgram.from({vertex,fragment:`precision highp float;
in vec2 vTextureCoord;out vec4 finalColor;uniform sampler2D uTexture;uniform vec4 uInputSize;
void main(){vec4 c=texture(uTexture,vTextureCoord);float lo=1.;vec3 inner=vec3(0.);float weights=0.;
for(int y=-2;y<=2;y++)for(int x=-2;x<=2;x++){vec4 n=texture(uTexture,vTextureCoord+vec2(float(x),float(y))*uInputSize.zw);lo=min(lo,n.a);float w=pow(n.a,8.)/(1.+float(x*x+y*y));inner+=n.rgb*w;weights+=n.a*w;}
float rim=1.-smoothstep(.12,.9,lo);vec3 rgb=c.rgb/max(c.a,.001);vec3 inside=inner/max(weights,.001);
float green=max(0.,rgb.g-max(rgb.r,rgb.b));rgb.g-=green*rim*.95;
float bright=max(0.,dot(rgb-inside,vec3(.2126,.7152,.0722)));
rgb=mix(rgb,inside,rim*smoothstep(.07,.35,bright)*.85);
float alpha=c.a*smoothstep(.035,.2,c.a);finalColor=vec4(rgb*alpha,alpha);}`})});}

// Image-driven flame: gently advect the generated 2D texture, preserve its alpha.
export function createFlameFilter(seed:number){return new Filter({glProgram:GlProgram.from({vertex,fragment:`precision highp float;
in vec2 vTextureCoord;in vec2 vUV;out vec4 finalColor;uniform sampler2D uTexture;uniform vec4 uInputSize;uniform vec4 uOutputFrame;uniform float uTime;uniform float uSeed;
void main(){float t=uTime*2.+uSeed;vec2 uv=vTextureCoord;vec2 maxUV=uOutputFrame.zw*uInputSize.zw;float rise=1.-vUV.y;
uv.x+=(sin(vUV.y*13.-t)*.014+sin(vUV.y*23.-t*1.7)*.007)*rise*maxUV.x;
uv.y+=sin(vUV.x*9.+t)*.007*maxUV.y;
vec4 art=texture(uTexture,clamp(uv,vec2(0.),maxUV));float edge=smoothstep(0.,.035,vUV.x)*(1.-smoothstep(.965,1.,vUV.x))*smoothstep(0.,.03,vUV.y)*(1.-smoothstep(.97,1.,vUV.y));
finalColor=art*edge*(.9+.1*sin(t*1.3));}`}),resources:{fire:{uTime:{value:0,type:'f32'},uSeed:{value:seed,type:'f32'}}}});}
