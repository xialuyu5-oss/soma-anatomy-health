"""Bundle the recovered original adult/child surface recipes without altering originals."""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import hashlib, json
from restore_anatomy_assets import retrieve
ROOT=Path(__file__).resolve().parent
REVISION='a8bc2d54ff0ac92e78ff71431b1023eda42bf482'
BASE=f'https://raw.githubusercontent.com/makehumancommunity/makehuman/{REVISION}/makehuman/data/'
files=json.loads((ROOT/'validation/legacy-surface-files.json').read_text())
sources={r['url']:r for r in json.loads((ROOT/'assets/manifest.json').read_text())}
jobs=[]
for name in files:
    url=BASE+name
    path='assets/makehuman/'+name
    target=ROOT/path
    if not target.exists() and url in sources:
        row=sources[url];data=(ROOT/row['file']).read_bytes()
        assert hashlib.sha256(data).hexdigest()==row['sha256']
        target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(data)
    jobs.append((path,url,'CC0-1.0'))
with ThreadPoolExecutor(max_workers=3) as pool:
    records=list(pool.map(retrieve,jobs))
(ROOT/'assets/makehuman/manifest.json').write_text(json.dumps({'revision':REVISION,'records':records},indent=2),encoding='utf-8')
