from pathlib import Path
import json,re
ROOT=Path(__file__).parent
SRC=ROOT/'assets/source'
def obj(path,only=None):
    v=[];f=[];uv=[];uvf=[];g=''
    for l in path.read_text().splitlines():
        p=l.split()
        if not p:continue
        if p[0]=='v':v.append([float(x) for x in p[1:4]])
        elif p[0]=='vt':uv.append([float(x) for x in p[1:3]])
        elif p[0]=='g':g=' '.join(p[1:])
        elif p[0]=='f' and (not only or g==only):
            a=[int(x.split('/')[0])-1 for x in p[1:]]
            t=[int(x.split('/')[1])-1 if '/' in x and x.split('/')[1] else 0 for x in p[1:]]
            for i in range(1,len(a)-1):f.extend([a[0],a[i],a[i+1]]);uvf.extend([t[0],t[i],t[i+1]])
    return dict(vertices=v,indices=f,uv=uv,uvIndices=uvf)
body=obj(SRC/'base.obj','body'); print('body',len(body['vertices']),len(body['indices']) )
targets={}
for p in SRC.glob('*.target'):
    targets[p.stem]=[[int(x[0]),*[float(v) for v in x[1:4]]] for l in p.read_text().splitlines() if (x:=l.split()) and not l.startswith('#')]
rig=json.loads((SRC/'default.mhskel').read_text())
weights=json.loads((SRC/'default_weights.mhw').read_text())['weights']
vw=[[] for _ in body['vertices']]
for bone,entries in weights.items():
    for idx,w in entries:vw[idx].append([bone,w])
for i,w in enumerate(vw):
    w.sort(key=lambda x:-x[1]);vw[i]=w[:4];total=sum(x[1] for x in vw[i])
    if total:
        for x in vw[i]:x[1]=round(x[1]/total,6)
def clothes(p):
    lines=p.read_text().splitlines();meta={};maps=[];reading=False
    for line in lines:
        a=line.split()
        if not a or a[0]=='#':continue
        if a[0]=='verts':reading=True;continue
        if reading and a[0].lstrip('-').isdigit():
            if len(a)==1:maps.append([int(a[0])]*3+[1,0,0,0,0,0])
            elif len(a)>=9:maps.append([*[int(v) for v in a[:3]],*[float(v) for v in a[3:9]]])
            else:reading=False
        else:
            if a[0] in ['delete_verts','weights','vertexgroup']:reading=False
            meta[a[0]]=a[1:]
    result=obj(p.parent/meta['obj_file'][0]);result['maps']=maps;result['meta']=meta
    mask=[]
    if 'delete_verts' in lines:
        for line in lines[lines.index('delete_verts')+1:]:
            if not re.match(r'^\s*\d',line):break
            for match in re.finditer(r'(\d+)(?:\s*-\s*(\d+))?',line):
                a=int(match[1]);b=int(match[2] or a);mask.extend(range(a,b+1))
    result['occludedBodyVertices']=mask
    adjacent=[set() for _ in result['vertices']]
    for i in range(0,len(result['indices']),3):
        face=result['indices'][i:i+3]
        for j in face:adjacent[j].update(face)
    seen=set();components=[]
    for i in range(len(adjacent)):
        if i in seen:continue
        stack=[i];group=[];seen.add(i)
        while stack:
            j=stack.pop();group.append(j)
            for k in adjacent[j]:
                if k not in seen:seen.add(k);stack.append(k)
        components.append(group)
    lower=set(min(components,key=lambda ids:min(result['vertices'][j][1] for j in ids)))
    result['lowerIndices']=[k for i in range(0,len(result['indices']),3) if all(j in lower for j in result['indices'][i:i+3]) for k in result['indices'][i:i+3]]
    upper=set(max(components,key=lambda ids:max(result['vertices'][j][1] for j in ids)))
    result['upperIndices']=[k for i in range(0,len(result['indices']),3) if all(j in upper for j in result['indices'][i:i+3]) for k in result['indices'][i:i+3]]
    assert len(maps)==len(result['vertices']),(p,len(maps),len(result['vertices']))
    return result
garments={}
for key,folder in [('male','elvs_crude_t-shirt_male'),('female','joepal_crude_t-shirt_female'),('knit','toigo_fisherman_sweater')]:
    p=ROOT/'assets/clothes/clothes'/folder
    garments[key]=clothes(next(p.glob('*.mhclo')))
for key,folder in [('pants','clothes/male_casualsuit06'),('sport','clothes/female_sportsuit01'),('eyes','eyes/low-poly'),('casual','clothes/female_casualsuit01'),('skirt','clothes/female_elegantsuit01'),('shoes','clothes/shoes05'),('hairMale','hair/short01'),('hairFemale','hair/ponytail01'),('hairBob','hair/bob02'),('brows','eyebrows/eyebrow001')]:
    p=ROOT/'assets/system'/folder
    if p.exists():garments[key]=clothes(next(p.glob('*.mhclo')))
garments['heels']=clothes(ROOT/'assets/wardrobe/clothes/toigo_stiletto_booties/toigo_stiletto_booties.mhclo')
data=dict(body=body,targets=targets,rig=rig,weights=vw,garments=garments)
(ROOT/'assets/human.json').write_text(json.dumps(data,separators=(',',':')))
print('garments',[(k,len(v['vertices']),len(v['indices'])) for k,v in garments.items()]);print('size',(ROOT/'assets/human.json').stat().st_size)
