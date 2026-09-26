"""Download the pinned public checkpoint with bounded, verified range requests."""
import concurrent.futures
import hashlib
import json
import time
import urllib.request
import sys
import os
from pathlib import Path

ROOT=Path(os.environ.get('QBOT_LAYA_ROOT','.local/laya-eval'))
REV='e4e9ddf21a7b1903b7acffd8814ad4307bf63a67'
BASE=f'https://huggingface.co/convaiinnovations/laya-multilingual/resolve/{REV}'
SIZE=643835514
TORCH='--torch' in sys.argv
URL=BASE+'/model.safetensors'
if TORCH:
    URL='https://download.pytorch.org/whl/cpu/torch-2.14.0%2Bcpu-cp312-cp312-win_amd64.whl'
    SIZE=123996119
CHUNK=8*1024*1024
PARTS=ROOT/('torch-parts' if TORCH else 'parts')
PARTS.mkdir(parents=True,exist_ok=True)

def fetch(i):
    start=i*CHUNK
    end=min(SIZE,start+CHUNK)-1
    path=PARTS/str(i)
    if path.exists() and path.stat().st_size==end-start+1: return path
    for attempt in range(4):
        try:
            request=urllib.request.Request(URL+f'?chunk={i}',headers={'Range':f'bytes={start}-{end}'})
            with urllib.request.urlopen(request,timeout=45) as r:
                if r.status!=206 or r.headers.get('Content-Range')!=f'bytes {start}-{end}/{SIZE}':
                    raise ValueError('Server did not honor byte range')
                with path.with_suffix('.part').open('wb') as f:
                    while data:=r.read(256*1024): f.write(data)
            if path.with_suffix('.part').stat().st_size!=end-start+1: raise ValueError('Short download')
            path.with_suffix('.part').replace(path)
            print(f'chunk {i+1}/{(SIZE+CHUNK-1)//CHUNK}',flush=True)
            return path
        except Exception:
            if attempt==3: raise
            time.sleep(1+attempt)

with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
    paths=list(pool.map(fetch,range((SIZE+CHUNK-1)//CHUNK)))
target=ROOT/('torch-2.14.0+cpu-cp312-cp312-win_amd64.whl' if TORCH else 'model/model.safetensors')
digest=hashlib.sha256()
with target.with_suffix('.download').open('wb') as dest:
    for p in paths:
        with p.open('rb') as src:
            while data:=src.read(1024*1024):
                digest.update(data)
                dest.write(data)
if TORCH:
    import re
    index=urllib.request.urlopen('https://download.pytorch.org/whl/cpu/torch/',timeout=30).read().decode()
    expected=re.search(r'torch-2\.14\.0%2Bcpu-cp312-cp312-win_amd64\.whl#sha256=([a-f0-9]+)',index).group(1)
else:
    api=f'https://huggingface.co/api/models/convaiinnovations/laya-multilingual/revision/{REV}?blobs=true'
    info=json.load(urllib.request.urlopen(api,timeout=30))
    expected=next(f['lfs']['sha256'] for f in info['siblings'] if f['rfilename']=='model.safetensors')
if digest.hexdigest()!=expected: raise ValueError('Model SHA256 mismatch')
target.with_suffix('.download').replace(target)
(ROOT/('torch-verification.json' if TORCH else 'download-verification.json')).write_text(json.dumps({'revision':REV if not TORCH else '2.14.0+cpu','sha256':expected,'size':SIZE},indent=2))
print('Verified model SHA256: '+expected,flush=True)
