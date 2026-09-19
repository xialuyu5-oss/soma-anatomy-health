/* Same-origin workspace bridge; body settings remain inside the existing app. */
(() => {
  const query=new URLSearchParams(location.search);
  if(query.get('embedded')!=='1')return;
  document.documentElement.classList.add('composition-embedded');
  const actions=document.createElement('div');actions.className='embed-actions';
  actions.append(document.getElementById('compareMode'),document.getElementById('save'));
  document.querySelector('.intro').append(actions);
  const setLocale=locale=>{if(['zh-CN','en','ja'].includes(locale))window.SomaI18n?.setLocale(locale);};
  setLocale(query.get('lang'));
  window.addEventListener('message',e=>{if(e.origin===location.origin&&e.source===parent&&e.data?.type==='soma:locale')setLocale(e.data.locale);});
  parent.postMessage({type:'soma:composition-ready'},location.origin);
})();
