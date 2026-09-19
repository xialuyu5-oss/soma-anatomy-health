/* Local gettext-style catalog adapter. Only known UI strings are translated.
 * Retains text-node identity: inputs, focus, WebGL, listeners and application state survive switches.
 * Classic scripts also localize the boot failure view when ES modules cannot start.
 */
(() => {
  const locales = {'zh-CN':'简体中文', en:'English', ja:'日本語'};
  const rows = globalThis.SOMA_MESSAGES || [];
  const messages = new Map(rows.map(row => [row[0], row]));
  const escape = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const patterns = rows.filter(r => /\{\w+\}/.test(r[0])).map(row => {
    const names = [...row[0].matchAll(/\{(\w+)\}/g)].map(m => m[1]);
    const expression = row[0].split(/\{\w+\}/).map(escape).join('(.+?)');
    return {row, names, regex:new RegExp('^'+expression+'$')};
  });
  let locale = 'zh-CN';
  const column = () => locale === 'en' ? 1 : locale === 'ja' ? 2 : 0;
  function message(key, values = {}) {
    return (messages.get(key)?.[column()] ?? key).replace(/\{(\w+)\}/g, (all,k) => values[k] ?? all);
  }
  const prefixes = rows.filter(r => r[0].endsWith('：')).map(r => r[0]).sort((a,b)=>b.length-a.length);
  function text(source) {
    if (locale === 'zh-CN' || !source) return source;
    const key = source.trim();
    let translated;
    if (messages.has(key)) translated = message(key);
    else {
      for (const p of patterns) {
        const match = key.match(p.regex);
        if (match) {translated = message(p.row[0], Object.fromEntries(p.names.map((n,i)=>[n,match[i+1]]))); break;}
      }
      // Concatenated composition notice consists of two independently catalogued sentences.
      const base = '肌肉量指骨骼肌质量；数值驱动近似外形，不是身体测量或训练效果预测。';
      if (translated === undefined && key.startsWith(base+' ')) translated = message(base)+' '+text(key.slice(base.length+1));
      // Imported structure names are user data: translate surrounding UI, never the name.
      const selected = '已选择来源结构：', suffix = '。来源术语未翻译；未据此生成医学结论。';
      if (translated === undefined && key.startsWith(selected) && key.endsWith(suffix)) translated = message(selected)+key.slice(selected.length,-suffix.length)+message(suffix);
      if (translated === undefined) for (const prefix of prefixes) if(key.startsWith(prefix)) {translated=message(prefix)+text(key.slice(prefix.length));break;}
    }
    return translated === undefined ? source : source.slice(0,source.indexOf(key))+translated+source.slice(source.indexOf(key)+key.length);
  }
  const api = globalThis.SomaI18n = {locales, message, text, get locale(){return locale;}, setLocale};
  if (typeof document === 'undefined') return;
  try {const saved=localStorage.getItem('soma.locale'); if(locales[saved])locale=saved;} catch {/* Storage may be unavailable; switching still works. */}
  const originals = new WeakMap();
  const attributes = new WeakMap();
  const excluded = 'script,style,[translate="no"]';
  function updateText(node) {
    if(node.parentElement?.closest(excluded))return;
    let saved=originals.get(node);
    if(!saved || node.data !== saved.rendered) saved={source:node.data};
    saved.rendered=text(saved.source);
    if(node.data!==saved.rendered)node.data=saved.rendered;
    originals.set(node,saved);
  }
  function updateAttributes(element) {
    if(element.closest(excluded))return;
    const saved=attributes.get(element)||{};
    for(const attr of ['aria-label','placeholder','title','content']) {
      if(attr==='content' && !element.matches('meta[name="description"]'))continue;
      if(!element.hasAttribute(attr))continue;
      const value=element.getAttribute(attr);
      let entry=saved[attr];
      if(!entry || value!==entry.rendered)entry={source:value};
      entry.rendered=text(entry.source);
      if(value!==entry.rendered)element.setAttribute(attr,entry.rendered);
      saved[attr]=entry;
    }
    attributes.set(element,saved);
  }
  function apply(root=document.documentElement) {
    observer?.disconnect();
    try {
      const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT|NodeFilter.SHOW_ELEMENT);
      if(root.nodeType===1)updateAttributes(root);
      let node;while((node=walker.nextNode()))node.nodeType===3?updateText(node):updateAttributes(node);
    } finally {
      observer?.observe(document.documentElement,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['aria-label','placeholder','title','content']});
    }
  }
  const observer = new MutationObserver(()=>apply());
  function setLocale(next) {
    locale=Object.hasOwn(locales,next)?next:'zh-CN';
    if(typeof document==='undefined')return locale;
    try {localStorage.setItem('soma.locale',locale);}catch{}
    document.documentElement.lang=locale;
    document.getElementById('language').value=locale;
    apply();
    return locale;
  }
  document.getElementById('language').addEventListener('change',e=>setLocale(e.target.value));
  document.documentElement.lang=locale;
  document.getElementById('language').value=locale;
  apply();
})();
