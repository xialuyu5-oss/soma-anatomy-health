"""Restore pinned public assets used by the recovered SOMA 3.4, locally only."""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.request import build_opener, ProxyHandler
import hashlib, json, struct

ROOT = Path(__file__).resolve().parent
REVISION = '37e85dfbbb398e11ba33c8f0e411f06f9bba592f'
BASE = f'https://raw.githubusercontent.com/DrMuratAltun/anatomi-simulatoru/{REVISION}/'
SYSTEMS = {'skeleton':'iskelet', 'muscles':'kas', 'nerves':'sinir',
           'vessels':'dolasim', 'organs':'ic-organlar', 'lymph':'lenf', 'joints':'eklem'}

def retrieve(job):
    path, url, license_name = job
    output = ROOT / path
    output.parent.mkdir(parents=True, exist_ok=True)
    if output.exists():
        data = output.read_bytes()
    else:
        # Process-local direct transport; does not alter Windows proxy settings.
        with build_opener(ProxyHandler({})).open(url, timeout=45) as response:
            data = response.read(100 * 1024 * 1024 + 1)
        if len(data) > 100 * 1024 * 1024:
            raise ValueError('Asset exceeds bounded download size')
        if output.suffix == '.glb':
            assert struct.unpack_from('<III', data) == (0x46546c67, 2, len(data))
        output.write_bytes(data)
    result = {'file':path, 'url':url, 'license':license_name,
              'bytes':len(data), 'sha256':hashlib.sha256(data).hexdigest()}
    if output.suffix == '.glb':
        assert struct.unpack_from('<III', data) == (0x46546c67, 2, len(data))
        length, kind = struct.unpack_from('<II', data, 12)
        assert kind == 0x4E4F534A
        gltf = json.loads(data[20:20+length])
        assert not any(b.get('uri') for b in gltf.get('buffers', []))
        result.update(meshes=len(gltf.get('meshes', [])), nodes=len(gltf.get('nodes', [])))
    print(json.dumps({'file':path, 'bytes':len(data)}, ensure_ascii=False), flush=True)
    return result

if __name__ == '__main__':
    jobs = [(f'assets/{local}.glb', BASE+f'systems/{source}.glb', 'CC-BY-SA-4.0')
            for local, source in SYSTEMS.items()]
    jobs += [(f'assets/anatomy/{name}', BASE+name, 'Upstream license notice')
             for name in ['LICENSE-DATA.md', 'ATTRIBUTION.md']]
    jobs += [('vendor/three-r160.min.js',
              'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js', 'MIT'),
             ('vendor/three-r160.LICENSE',
              'https://raw.githubusercontent.com/mrdoob/three.js/r160/LICENSE', 'MIT')]
    with ThreadPoolExecutor(max_workers=3) as pool:
        records = list(pool.map(retrieve, jobs))
    (ROOT/'assets/anatomy/manifest.json').write_text(json.dumps({
        'revision':REVISION, 'geometryModification':'None; original GLB bytes preserved',
        'records':records}, ensure_ascii=False, indent=2), encoding='utf-8')
