"""Create a reviewable working copy; never edit the recovered originals."""
from pathlib import Path
import hashlib, re, zipfile

ROOT = Path(__file__).resolve().parent
ORIGINAL = ROOT/'legacy/SOMA-3.4-Refit.html'
assert hashlib.sha256(ORIGINAL.read_bytes()).hexdigest() == 'd83437190d57143c81efdd5b5c564162d0c6d83241e6acb7e5f168d589063345'
backup = ROOT/'validation/before-anatomy-integration-2026-09-19.zip'
if not backup.exists():
    with zipfile.ZipFile(backup, 'x', zipfile.ZIP_DEFLATED) as archive:
        for p in ROOT.iterdir():
            if p.is_file() and p.suffix in {'.html','.js','.css','.py','.md','.bat','.mjs'}:
                archive.write(p, p.name)

body = ROOT/'body-composition.html'
if not body.exists():
    html = (ROOT/'index.html').read_text(encoding='utf-8')
    html = html.replace('<button class="nav" data-page="anatomy">解剖探索</button>', '<a href="./index.html">解剖探索</a>')
    html = html.replace('<button class="nav" data-page="learn">训练学习</button>', '<a href="./index.html#learn">训练学习</a>')
    html = html.replace('原 3.4 工程尚未迁移。导入本地解剖 GLB，可查看真实网格并选择结构。', '七系统解剖与训练已接回主页；此处保留独立模型导入工具。')
    html = html.replace('本版独立重建成年人体型与试衣工作区，支持简体中文、英语和日语。原 3.4 源码尚未恢复；儿童、完整解剖系统、部位图谱和照片校准尚未迁移。', '这是健康科普网站的成年人体型与试衣模块，支持简体中文、英语和日语。解剖、图谱、训练和原版校准工具位于主页。')
    html = html.replace('</head>', '<link rel="stylesheet" href="composition-embed.css"><script defer src="composition-embed.js"></script></head>')
    body.write_text(html, encoding='utf-8')

# Reused localhost ports can retain unrelated common entry names (app.js/style.css).
# Version every body entry resource without clearing any user's browser storage.
body_html=body.read_text(encoding='utf-8')
body_html=re.sub(r'(src|href)="(style\.css|i18n-catalog\.js|i18n\.js|boot\.js|composition-embed\.js|composition-embed\.css)(?:\?[^"]*)?"',
                 r'\1="\2?v=soma-integrated-20260919"', body_html)
body.write_text(body_html,encoding='utf-8')

html = ORIGINAL.read_text(encoding='utf-8')
html = html.replace('<title>SOMA Studio 3.4 · 服装贴合与站姿</title>', '<title>SOMA · 人体解剖与健康</title>')
html = html.replace('</head>', '<link data-soma-integration rel="stylesheet" href="integration.css"><script data-soma-integration defer src="integration.js"></script></head>')
html = html.replace("name:'BodyParts3D → Z-Anatomy', revision:'main'", "name:'BodyParts3D → Z-Anatomy', revision:'37e85dfbbb398e11ba33c8f0e411f06f9bba592f'")
# All seven original models and the exact original engine are now bundled locally.
html, count = re.subn(r"remote:\['https://raw\.githubusercontent\.com/DrMuratAltun/[^\]]+\]", 'remote:[]', html)
assert count == 7
html = html.replace("urls.push(...SurfaceSource.remotes.map(u=>u+file));", '')
html = html.replace("repository:'https://github.com/makehumancommunity/makehuman',revision:'master'", "repository:'https://github.com/makehumancommunity/makehuman',revision:'a8bc2d54ff0ac92e78ff71431b1023eda42bf482'")
html = html.replace("'soma-surface-hm08'", "'soma-surface-hm08-integrated-20260919'")
html = html.replace("'soma-phase1-meshes'", "'soma-phase1-meshes-37e85df'")
# Keep every source structure distinguishable even where editorial translations are incomplete.
html = html.replace("result[lang]=SomaI18n.t('pendingTerm',lang);", 'result[lang]=rawText;')
# A source system also contains bursae/tendons; substring matching must not label them exercise muscles.
html = html.replace("p.system==='muscles'&&ex.terms.some", "p.system==='muscles'&&!p.term.kindKey&&ex.terms.some")
html = html.replace('offlineHTML,locateExercise,getState:', "offlineHTML,locateExercise,relatedExercises:()=>exercises.filter(ex=>matches(ex).some(p=>B.state.selected.has(p.id))).map(ex=>({id:ex.id,title:ex.title})),getState:")
html = html.replace("bootRevision34();splash.remove();", "bootRevision34();window.bootSomaIntegration();splash.remove();")
assert 'window.bootSomaIntegration();' in html
# Standalone original exports keep their embedded engine/models, without the local integration shell.
needle = "const doc=new DOMParser().parseFromString(B.originalHTML,'text/html');"
html = html.replace(needle, needle+"doc.querySelectorAll('[data-soma-integration]').forEach(n=>n.remove());")
needle = "const doc=new DOMParser().parseFromString(originalHTML,'text/html');"
html = html.replace(needle, needle+"doc.querySelectorAll('[data-soma-integration]').forEach(n=>n.remove());")
(ROOT/'integration.html').write_text(html, encoding='utf-8')
print('Prepared integration.html; current index.html and recovered originals preserved.')
