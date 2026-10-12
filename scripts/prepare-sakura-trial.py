"""Local assembly of the visually reviewed GPT trial sheet; no image API calls."""
from pathlib import Path
from PIL import Image
import numpy as np
from scipy import ndimage
import json

root = Path(__file__).resolve().parents[1] / 'output/spine-lab'
out = root / 'sakura-trial'
im = Image.open(out / 'parts-v1.png').convert('RGBA')
a = np.array(im)
labels, _ = ndimage.label(a[:, :, 3] > 128)
parts = []
for n, sl in enumerate(ndimage.find_objects(labels), 1):
    if sl is None or np.sum(labels[sl] == n) < 100:
        continue
    y, x = sl
    # Keep softened alpha edges around the isolated component.
    box = (max(0, x.start-2), max(0, y.start-2), min(im.width, x.stop+2), min(im.height, y.stop+2))
    parts.append((box, im.crop(box)))
parts.sort(key=lambda p: (int((p[0][1]+p[0][3])/2 / (im.height/3)), p[0][0]))
if len(parts) != 9:
    raise ValueError(f'Expected nine complete connected assets, got {len(parts)}; inspect sheet')
sheet = Image.new('RGBA', (1800, 1800))
face = Image.new('RGBA', (900, 320))
for i, (box, p) in enumerate(parts):
    p.thumbnail((510, 510), Image.Resampling.LANCZOS)
    sheet.alpha_composite(p, ((i%3)*600+(600-p.width)//2, (i//3)*600+(600-p.height)//2))
    p.save(out / f'selected-{i}.png')
    if i >= 6:
        face.alpha_composite(p, ((i-6)*300+(300-p.width)//2, (320-p.height)//2))
sheet.save(root / 'sakura-parts.png')
face.save(root / 'sakura-face-parts.png')
cal = {
    'body': {'躯干上部': [96,155,140,210], '右手_1无袖': [81,163,105,209], '左手_1无袖': [126,163,148,209]},
    'face': {'eye_L_default': [61,54,70,69], 'eye_R_default': [28,55,36,69], 'mouth_0': [43,82,52,84],
             'hood_eye_L_closed': [61,68,70,70], 'hood_eye_R_closed': [28,69,36,71]}
}
cal_path = root / 'sakura-calibration.json'
if not cal_path.exists():
    cal_path.write_text(json.dumps(cal, ensure_ascii=False, indent=2), encoding='utf8')
(out / 'assembly-selection.json').write_text(json.dumps({
    'source': 'parts-v1.png', 'boxes': [p[0] for p in parts], 'mirroredParts': [],
    'manual': ['prompt and visual review', 'template placement and calibration'],
    'background': 'native alpha; connected-component extraction'
}, indent=2), encoding='utf8')
print('Selected nine original parts, no cross-version selection or mirroring.')
