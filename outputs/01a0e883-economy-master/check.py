from pathlib import Path
from PIL import Image,ImageOps,ImageDraw
import zipfile,xml.etree.ElementTree as ET,json
p=Path(__file__).parent
files=list((p/'previews').glob('*.png'))
for base in range(0,len(files),6):
    canvas=Image.new('RGB',(1800,1500),'#d5dce1')
    for i,f in enumerate(files[base:base+6]):
        im=Image.open(f).convert('RGB');im.thumbnail((890,470))
        x=(i%2)*900;y=(i//2)*500
        canvas.paste(im,(x,y+25));ImageDraw.Draw(canvas).text((x+8,y+5),f'{base+i+1}',fill='black')
    canvas.save(p/f'contact-{base//6}.png')
ns={'m':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
with zipfile.ZipFile(next(p.glob('*.xlsx'))) as z:
    errors=[];formulas=0
    for f in z.namelist():
        if f.startswith('xl/worksheets/sheet') and f.endswith('.xml'):
            r=ET.fromstring(z.read(f))
            errors += [(f,c.attrib['r'],c.findtext('m:v',namespaces=ns)) for c in r.findall('.//m:c',ns) if c.attrib.get('t')=='e']
            formulas+=len(r.findall('.//m:f',ns))
    assert not errors,errors
    assert formulas>2000,formulas
    print(json.dumps({'sheets':len(files),'formula_cells':formulas,'errors':errors,'preview_order':[f.stem for f in files]},ensure_ascii=False))
