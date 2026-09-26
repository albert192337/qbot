"""Mechanically slice generated nine-part sheet and preserve source UV layouts."""
from pathlib import Path
from PIL import Image
import json,re,sys
import numpy as np
root=Path(__file__).resolve().parents[1]/'output/spine-lab'
skin=sys.argv[2] if len(sys.argv)>2 else 'hood'
calibration_path=root/(skin+'-calibration.json')
calibration=json.loads(calibration_path.read_text(encoding='utf8')) if calibration_path.exists() else {}
if skin not in ('hood','traveler') and not calibration:
    raise ValueError('New characters require their own reviewed calibration file')
calibration_path=root/(skin+'-calibration.json')
calibration=json.loads(calibration_path.read_text(encoding='utf8')) if calibration_path.exists() else {}
source=root/'source/smalltown_spine_player'
sheet=Image.open(sys.argv[1]).convert('RGBA')
if sheet.getchannel('A').getextrema()[0]==255:raise ValueError('Real transparency required')
atlas=Image.open(source/'smalltown_spine_player.png').convert('RGBA')
text=(source/'smalltown_spine_player.atlas.txt').read_text(encoding='utf8')
regions={m[1]:list(map(int,m[2].split(','))) for m in re.finditer(r'^([^\n:]+)\nbounds:([0-9,]+)',text,re.M)}
# Image generation may not honor an exact square cell grid. Detect transparent
# gutters instead of cutting by requested dimensions (which can clip a chin).
mask=np.array(sheet.getchannel('A'))>96
def groups(values):
    occupied=np.where(values>3)[0]
    return [(int(g[0]),int(g[-1]+1)) for g in np.split(occupied,np.where(np.diff(occupied)>1)[0]+1) if len(g)]
rows=groups(mask.sum(axis=1));cols=groups(mask.sum(axis=0))
if len(rows)!=3 or len(cols)!=3:raise ValueError('Expected three separated rows and columns; inspect generated layout')
def cell(i):
    x1,x2=cols[i%3];y1,y2=rows[i//3]
    part=sheet.crop((max(0,x1-2),max(0,y1-2),min(sheet.width,x2+2),min(sheet.height,y2+2)))
    box=part.getchannel('A').point(lambda v:255 if v>80 else 0).getbbox()
    if not box:raise ValueError('Missing cell '+str(i))
    return part.crop(box)
def put(name,part,box):
    x,y,w,h=regions[name];a,b,c,d=box
    if not (0<=a<c<=w and 0<=b<d<=h):raise ValueError('Out-of-region placement: '+name)
    page=Image.new('RGBA',(w,h));page.alpha_composite(part.resize((c-a,d-b),Image.Resampling.LANCZOS),(a,b));atlas.paste(page,(x,y))
for item in json.loads((root/'parts-map.json').read_text(encoding='utf8')):
    part=cell(item['cell']);box=item['bbox']
    if item['name']=='中发面部':
        turned=root/(skin+'-head-left.png')
        if turned.exists():
            part=Image.open(turned).convert('RGBA')
            if part.getchannel('A').getextrema()[0]==255:raise ValueError('Turned head requires transparency')
            part=part.crop(part.getchannel('A').point(lambda v:255 if v>80 else 0).getbbox())
        # Keep the generated hood's aspect ratio; stretching it to the old
        # cat-hat rectangle made the new face noticeably too wide.
        a,b,c,d=box;w=round((d-b)*part.width/part.height);mid=(a+c)/2
        box=(round(mid-w/2),b,round(mid-w/2)+w,d)
    if item['name']=='躯干上部':
        torso=root/(skin+'-torso.png')
        if torso.exists():
            part=Image.open(torso).convert('RGBA')
            if part.getchannel('A').getextrema()[0]==255:raise ValueError('Torso requires transparency')
            part=part.crop(part.getchannel('A').point(lambda v:255 if v>80 else 0).getbbox())
        torso=root/(skin+'-torso.png')
        if torso.exists():
            part=Image.open(torso).convert('RGBA')
            if part.getchannel('A').getextrema()[0]==255:raise ValueError('Torso requires transparency')
            part=part.crop(part.getchannel('A').point(lambda v:255 if v>80 else 0).getbbox())
        # The new chin has a shallower silhouette than the source face. Carry
        # the existing neck/collar farther under it; keep the waist anchored.
        a,b,c,d=box
        box=(a,b-4,c,d)
    box=calibration.get('body',{}).get(item['name'],box)
    box=calibration.get('body',{}).get(item['name'],box)
    put(item['name'],part,box)
face_file=root/'hood-face-parts.png'
if not face_file.exists():raise ValueError('Calibrated face sprite sheet hood-face-parts.png is required')
face=Image.open(face_file).convert('RGBA')
face_mask=np.array(face.getchannel('A'))>96
face_cols=groups(face_mask.sum(axis=0))
if len(face_cols)!=3:raise ValueError('Expected three separated facial marks')
def facial(i):
    a,b=face_cols[i];part=face.crop((max(0,a-2),0,min(face.width,b+2),face.height))
    return part.crop(part.getchannel('A').point(lambda v:255 if v>80 else 0).getbbox())
own_face_file=root/(skin+'-face-parts.png')
own_face=None
if skin!='hood' and own_face_file.exists():
    own_face=Image.open(own_face_file).convert('RGBA')
    own_cols=groups((np.array(own_face.getchannel('A'))>96).sum(axis=0))
    if len(own_cols)!=3:raise ValueError('Expected three character facial marks')
def own_facial(i):
    a,b=own_cols[i];part=own_face.crop((a,0,b,own_face.height))
    return part.crop(part.getchannel('A').point(lambda v:255 if v>80 else 0).getbbox())
# Reference-aligned face: the previous inherited face center was ~9 texture px
# left of the hood face. Narrow, shorter eyes; mouth raised by 4 texture px.
# L/R are the character's sides, opposite the viewer's sheet ordering.
turned_head=skin=='wuxie' or (root/(skin+'-head-left.png')).exists()
face_boxes=[(2,'eye_L_default',(70,56,80,73)),(0,'eye_R_default',(31,57,39,73)),(1,'mouth_0',(50,80,57,81))] if turned_head else [(2,'eye_L_default',(77,56,87,73)),(0,'eye_R_default',(34,57,44,74)),(1,'mouth_0',(57,80,64,81))]
for i,name,box in face_boxes:
    box=calibration.get('face',{}).get(name,box)
    box=calibration.get('face',{}).get(name,box)
    piece=cell({'eye_L_default':7,'eye_R_default':6,'mouth_0':8}[name]) if skin=='wuxie' else facial(i)
    if own_face is not None:piece=own_facial({'eye_L_default':1,'eye_R_default':0,'mouth_0':2}[name])
    put(name,piece,box)
# Extra closed-eye regions use the model's mouth stroke, only resized and packed.
closed_boxes=[('hood_eye_L_closed',(1000,0),(71,64,80,66)),('hood_eye_R_closed',(1130,0),(31,65,39,67))] if turned_head else [('hood_eye_L_closed',(1000,0),(78,64,87,66)),('hood_eye_R_closed',(1130,0),(35,65,44,67))]
for name,origin,box in closed_boxes:
    box=calibration.get('face',{}).get(name,box)
    box=calibration.get('face',{}).get(name,box)
    x,y=origin;regions[name]=[x,y,129,129];put(name,facial(1),box)
    text=text.rstrip()+'\n'+name+'\nbounds:'+','.join(map(str,regions[name]))+'\n'
atlas.save(root/(skin+'-atlas.png'))
(root/(skin+'.atlas')).write_text(text.replace('smalltown_spine_player.png',skin+'-atlas.png'),encoding='utf8')
raw=json.loads((source/'smalltown_spine_player.json').read_text(encoding='utf8'))
for slot,original,name in [('eye_LA0','eye_L_default','hood_eye_L_closed'),('eye_RA0','eye_R_default','hood_eye_R_closed')]:
    att=json.loads(json.dumps(raw['skins'][0]['attachments'][slot][original]));att['path']=name
    raw['skins'][0]['attachments'][slot][name]=att
(root/(skin+'.json')).write_text(json.dumps(raw,ensure_ascii=False),encoding='utf8')
print('Packed hood character, two bean eyes, short mouth and closed-eye attachments.')
