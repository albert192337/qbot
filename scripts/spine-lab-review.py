"""Build large visual review sheets; these are evidence, not automatic approval."""
from pathlib import Path
from PIL import Image, ImageDraw
import sys

root=Path(__file__).resolve().parents[1]/'output/spine-lab'
folder=root/sys.argv[1]
actions=['idle','walk','run','happy','sleep','tea','together']
sheet=Image.new('RGB',(1600,2800),'#f0f0df')
d=ImageDraw.Draw(sheet)
for row,name in enumerate(actions):
    for col,t in enumerate(['0','0.25','0.5','0.75']):
        frame=Image.open(folder/(name+'-'+t+'.png'))
        sheet.paste(frame.crop((625,50,1075,470)).resize((400,373)),(col*400,row*400))
        d.text((col*400+8,row*400+380),name+' '+t,fill='black')
sheet.save(folder/'review-poses.jpg')
# Large head/shoulder/wrist crops in actual rendered poses, not sprite thumbnails.
details=Image.new('RGB',(1500,900),'#f0f0df')
d=ImageDraw.Draw(details)
for i,name in enumerate(['idle','walk','run','happy','tea','together']):
    frame=Image.open(folder/(name+'-0.5.png'))
    details.paste(frame.crop((695,125,975,390)).resize((500,420)),((i%3)*500,(i//3)*450))
    d.text(((i%3)*500+8,(i//3)*450+428),name,fill='black')
details.save(folder/'review-details.jpg')
print(folder/'review-details.jpg')
