from pathlib import Path
from PIL import Image
import numpy as np
from scipy import ndimage
import json
r=Path(__file__).resolve().parents[1]/'output/spine-lab';out=r/'sasuke-seedream'
def components(file):
 im=Image.open(out/file).convert('RGBA');a=np.array(im);rgb=a[:,:,:3].astype(float)
 chroma=np.minimum(rgb[:,:,0],rgb[:,:,2])-rgb[:,:,1]
 mask=chroma>30
 alpha=np.clip((30-chroma)/18,0,1)*255
 a[:,:,3]=alpha.astype('uint8')
 lab,n=ndimage.label(a[:,:,3]>128);objs=ndimage.find_objects(lab);parts=[]
 for idx,sl in enumerate(objs):
  if sl is None or np.sum(lab[sl]==idx+1)<200:continue
  y,x=sl;piece=a[y,x].copy();piece[:,:,3][lab[sl]!=idx+1]=0
  parts.append((x.start,y.start,Image.fromarray(piece)))
 parts.sort(key=lambda p:(int((p[1]+p[2].height/2)/680),p[0]))
 print(file,[(x,y,p.size) for x,y,p in parts])
 return parts
v1=components('parts-v1-response.png');v2=components('parts2-response.png')
assert len(v1)==9 and len(v2)==9
selected=[v1[0][2],v2[1][2],v1[2][2].transpose(Image.Transpose.FLIP_LEFT_RIGHT),v1[2][2],v1[4][2],v1[5][2],v1[6][2],v1[7][2],v1[8][2]]
sheet=Image.new('RGBA',(1800,1800))
for i,p in enumerate(selected):
 p.thumbnail((510,510),Image.Resampling.LANCZOS);sheet.alpha_composite(p,((i%3)*600+(600-p.width)//2,(i//3)*600+(600-p.height)//2));p.save(out/f'selected-{i}.png')
sheet.save(r/'sasuke-parts.png')
face=Image.new('RGBA',(900,320))
for i,p in enumerate(selected[6:]):face.alpha_composite(p,(i*300+(300-p.width)//2,(320-p.height)//2))
face.save(r/'sasuke-face-parts.png')
cal={'body':{'躯干上部':[96,151,140,202],'右手_1无袖':[81,163,113,199],'左手_1无袖':[126,163,153,201]},'face':{'eye_L_default':[61,61,70,76],'eye_R_default':[28,62,36,76],'mouth_0':[43,82,52,84],'hood_eye_L_closed':[61,68,70,70],'hood_eye_R_closed':[28,69,36,71]}}
(r/'sasuke-calibration.json').write_text(json.dumps(cal,ensure_ascii=False,indent=2),encoding='utf8')
(out/'assembly-selection.json').write_text(json.dumps({'manual':True,'head':'v1','torso':'v2','arms':'v1 complete arm, opposite arm mirrored','legs':'v1 single legs','background':'local magenta chroma removal; not native transparency'},indent=2),encoding='utf8')
