"""Extract reference parts and mechanically repack generated parts; no painting."""
from pathlib import Path
from PIL import Image
import json, re, sys
ROOT=Path(__file__).resolve().parents[1]/'output/spine-lab'
SOURCE=ROOT/'source/smalltown_spine_player'
names=['中发面部','躯干上部','右手_1无袖','左手_1无袖','右腿','左腿']
atlas=Image.open(SOURCE/'smalltown_spine_player.png').convert('RGBA')
text=(SOURCE/'smalltown_spine_player.atlas.txt').read_text(encoding='utf-8')
regions={m[1]:list(map(int,m[2].split(','))) for m in re.finditer(r'^([^\n:]+)\nbounds:([0-9,]+)',text,re.M)}
if len(sys.argv)==1:
    sheet=Image.new('RGBA',(1536,1024))
    manifest=[]
    for i,name in enumerate(names):
        x,y,w,h=regions[name]
        part=atlas.crop((x,y,x+w,y+h))
        bbox=part.getchannel('A').point(lambda v:255 if v>96 else 0).getbbox()
        cropped=part.crop(bbox)
        cropped.thumbnail((350,400),Image.Resampling.LANCZOS)
        # Upscale for a clear model reference while preserving aspect ratio.
        factor=min(350/cropped.width,400/cropped.height)
        cropped=cropped.resize((round(cropped.width*factor),round(cropped.height*factor)),Image.Resampling.LANCZOS)
        ox=(i%3)*512+(512-cropped.width)//2;oy=(i//3)*512+(512-cropped.height)//2
        sheet.alpha_composite(cropped,(ox,oy))
        manifest.append(dict(name=name,region=regions[name],bbox=bbox,cell=i))
    sheet.save(ROOT/'parts-reference.png')
    (ROOT/'parts-map.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
else:
    generated=Image.open(sys.argv[1]).convert('RGBA')
    if generated.getchannel('A').getextrema()[0]==255:raise ValueError('Generated sheet must have real transparency')
    for item in json.loads((ROOT/'parts-map.json').read_text(encoding='utf-8')):
        i=item['cell'];cw=generated.width//3;ch=generated.height//2
        cell=generated.crop(((i%3)*cw,(i//3)*ch,(i%3+1)*cw,(i//3+1)*ch))
        bbox=cell.getchannel('A').point(lambda v:255 if v>48 else 0).getbbox()
        if not bbox:raise ValueError('Empty cell '+str(i))
        x,y,w,h=item['region'];a,b,c,d=item['bbox']
        part=Image.new('RGBA',(w,h))
        part.alpha_composite(cell.crop(bbox).resize((c-a,d-b),Image.Resampling.LANCZOS),(a,b))
        atlas.paste(part,(x,y))
    atlas.save(ROOT/'traveler-atlas.png')
    print('Packed six generated parts into the original UV rectangles.')
