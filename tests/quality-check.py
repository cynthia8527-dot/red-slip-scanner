"""Local synthetic image measurement; not an OCR or real-handwriting acceptance test."""
import json, os
from pathlib import Path
from PIL import Image, ImageDraw
import numpy as np
root=Path(os.environ.get('SCANNER_ARTIFACT_DIR','/tmp/scanner-preflight'))
source=Image.open(root/'quality-source.png').convert('L')
regions={'text12':(35,32,370,55),'text16':(35,73,500,100),'text24':(35,120,700,157),'stroke0.5':(35,187,550,211),'stroke1':(35,217,550,241),'stroke2':(35,247,550,271)}
results={}
for name in ['quality-processed.jpg','quality-scan.jpg','quality-floor84.jpg']:
 img=Image.open(root/name).convert('L');assert img.size==source.size
 entry={}
 for label,box in regions.items():
  a=np.array(source.crop(box));b=np.array(img.crop(box));mask=a<200;new=b<200
  entry[label]={'sourceDarkPixels':int(mask.sum()),'outputDarkPixels':int(new.sum()),'darkPixelRecall':round(float((mask&new).sum()/mask.sum()),4),'MAE':round(float(np.abs(a.astype(float)-b).mean()),4)}
  assert new.sum()>0
 entry['decimalDots']=[]
 for x in [660,700,740,780]:
  roi=np.array(img.crop((x-4,206,x+5,215)))
  entry['decimalDots'].append({'x':x,'darkPixels':int((roi<200).sum()),'minLuminance':int(roi.min())})
  assert (roi<200).sum()>0
 results[name]=entry
# Retain a readable comparison at 2x pixels without inventing detail.
comparison=Image.new('RGB',(1640,2240),'#dddddd');d=ImageDraw.Draw(comparison)
for i,name in enumerate(['quality-source.png','quality-processed.jpg','quality-scan.jpg','quality-floor84.jpg']):
 d.text((10,i*560+8),name,fill='black')
 crop=Image.open(root/name).convert('RGB').crop((20,20,830,285)).resize((1620,530),Image.Resampling.NEAREST)
 comparison.paste(crop,(10,i*560+30))
comparison.save(root/'quality-comparison.png')
(root/'quality-metrics.json').write_text(json.dumps(results,indent=2))
print(json.dumps(results,indent=2))
