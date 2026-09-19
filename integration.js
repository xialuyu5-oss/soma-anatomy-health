/* Thin integration over the recovered 3.4 APIs; anatomy geometry is unchanged. */
'use strict';
window.bootSomaIntegration = function () {
  const P = window.SOMA_P1, Q = window.SOMA_P2, T = window.SOMA_P3;
  if (!P || !Q || !T) throw Error('Original SOMA workspaces did not initialize');
  const B = P.bridge, $ = s => document.querySelector(s);
  const words = {
    title:['人体解剖与健康','人體解剖與健康','Anatomy & health','人体解剖と健康','Анатомия и здоровье','Anatomie & Gesundheit','Anatomie et santé','Anatomía y salud'],
    anatomy:['人体解剖','人體解剖','Anatomy','人体解剖','Анатомия','Anatomie','Anatomie','Anatomía'],
    atlas:['部位图谱','部位圖譜','Parts atlas','部位図譜','Атлас','Strukturatlas','Atlas','Atlas'],
    learn:['训练与健康','訓練與健康','Training & health','運動と健康','Тренировки','Training & Gesundheit','Activité et santé','Ejercicio y salud'],
    bodylab:['体型与穿衣','體型與穿衣','Body & clothing','体型と服装','Телосложение','Körper & Kleidung','Corps et vêtements','Cuerpo y ropa'],
    surface:['体表模型库','體表模型庫','Surface library','体表モデル','Модели тела','Körpermodelle','Modèles corporels','Modelos corporales'],
    intro:['认识身体结构，理解训练，再观察体态与穿衣。','認識身體結構，理解訓練，再觀察體態與穿衣。','Explore anatomy, understand training, then compare body shape and clothing.','体の構造と運動を学び、体型と服装を比較します。','Изучайте анатомию, движения и форму тела.','Anatomie verstehen, Bewegung lernen, Körperform vergleichen.','Comprendre le corps, les mouvements et la silhouette.','Explora la anatomía, el ejercicio y la forma corporal.'],
    legacy:['原版照片校准与导入','原版照片校準與匯入','Original calibration & import','従来の写真補正・読込','Калибровка и импорт','Kalibrierung & Import','Calibrage et import','Calibración e importación'],
    modern:['返回体型与穿衣','返回體型與穿衣','Back to body & clothing','体型と服装へ戻る','Назад к сравнению','Zurück zum Vergleich','Retour à la comparaison','Volver a la comparación'],
    fallback:['此体型模块提供中、英、日文；当前显示英文。','此體型模組提供中、英、日文；目前顯示英文。','This body module supports Chinese, English and Japanese; English is shown here.','体型モジュールは中国語・英語・日本語に対応しています。','Модуль телосложения пока показан на английском.','Dieses Körpermodul wird derzeit auf Englisch angezeigt.','Ce module corporel est actuellement affiché en anglais.','Este módulo corporal se muestra actualmente en inglés.'],
    resources:['健康资料','健康資料','Health resources','健康に関する資料','Материалы о здоровье','Gesundheitsinformationen','Ressources de santé','Recursos de salud'],
    next:['观察体态与穿衣','觀察體態與穿衣','Compare body & clothing','体型と服装を比較','Сравнить телосложение','Körperform vergleichen','Comparer la silhouette','Comparar el cuerpo'],
    source:['来源与模型许可','來源與模型授權','Sources & model licences','出典とモデルライセンス','Источники и лицензии','Quellen & Lizenzen','Sources et licences','Fuentes y licencias'],
    related:['相关训练','相關訓練','Related exercises','関連する運動','Связанные упражнения','Passende Übungen','Exercices associés','Ejercicios relacionados'],
    activity:['WHO · 身体活动','WHO · 身體活動','WHO · Physical activity','WHO · 身体活動','ВОЗ · Физическая активность','WHO · Körperliche Aktivität','OMS · Activité physique','OMS · Actividad física'],
    diet:['WHO · 健康饮食','WHO · 健康飲食','WHO · Healthy diet','WHO · 健康的な食事','ВОЗ · Здоровое питание','WHO · Gesunde Ernährung','OMS · Alimentation saine','OMS · Alimentación saludable']
  };
  const locales=['zh','zh-Hant','en','ja','ru','de','fr','es'];
  const text = key => words[key][Math.max(0, locales.indexOf(B.state.lang))];
  document.body.classList.add('soma-integrated');
  const nav=$('.mode-nav');
  for (const mode of ['anatomy','atlas','learn','bodylab']) {
    const n=nav.querySelector('[data-mode="'+mode+'"]');
    n.classList.remove('rd-secondary-mode');
    ['data-p2','data-lab','data-rd'].forEach(k=>n.removeAttribute(k));
    nav.append(n);
  }
  const surface=nav.querySelector('[data-mode="surface"]');
  surface.classList.add('integration-library-link');
  const shell=document.createElement('section');
  shell.id='composition-workspace';shell.hidden=true;
  shell.innerHTML='<div class="integration-tools"><p id="composition-language-note" hidden></p><button id="original-body-tools"></button><button data-mode="surface" id="integration-surface"></button></div><iframe id="composition-frame" title="Body composition and clothing" hidden></iframe>';
  $('#bodylab-workspace').before(shell);
  const frame=$('#composition-frame');
  const returnButton=document.createElement('button');returnButton.id='return-composition';returnButton.className='integration-return';
  $('#bodylab-workspace').prepend(returnButton);
  let legacy=false;
  const originalMode=T.onMode.bind(T);
  function childLocale(){return B.state.lang==='zh'?'zh-CN':['en','ja'].includes(B.state.lang)?B.state.lang:'en';}
  function syncChild(){if(frame.contentWindow&&frame.hasAttribute('src'))frame.contentWindow.postMessage({type:'soma:locale',locale:childLocale()},location.origin);}
  function mode(next){
    const modern=next==='bodylab'&&!legacy;
    // Keep the existing original calibration workspace reachable, but start the new module by default.
    originalMode(modern?'anatomy':next);
    $('#bodylab-workspace').hidden=next!=='bodylab'||modern;
    shell.hidden=!modern;frame.hidden=!modern;
    if(modern&&!frame.hasAttribute('src'))frame.src='./body-composition.html?embedded=1&lang='+encodeURIComponent(childLocale());
    syncChild();
  }
  T.onMode=mode;
  $('#original-body-tools').onclick=()=>{legacy=true;mode('bodylab');};
  returnButton.onclick=()=>{legacy=false;mode('bodylab');};
  frame.addEventListener('load',syncChild);
  window.addEventListener('message',e=>{if(e.origin===location.origin&&e.source===frame.contentWindow&&e.data?.type==='soma:composition-ready')syncChild();});
  const health=document.createElement('section');health.className='integration-health';
  health.innerHTML='<h2 id="integration-health-title"></h2><div class="integration-health-links"><a href="https://www.who.int/news-room/fact-sheets/detail/physical-activity" target="_blank" rel="noopener noreferrer">WHO · Physical activity</a><a href="https://www.who.int/news-room/fact-sheets/detail/healthy-diet" target="_blank" rel="noopener noreferrer">WHO · Healthy diet</a><button data-mode="bodylab" id="integration-next"></button></div>';
  $('#learn-workspace').append(health);
  const related=document.createElement('section');related.id='integration-related';related.hidden=true;
  $('#selection').append(related);
  function relatedExercises(){
    const items=T.relatedExercises();related.replaceChildren();related.hidden=!items.length;
    if(!items.length)return;
    const heading=document.createElement('h3');heading.textContent=text('related');related.append(heading);
    for(const item of items){
      const button=document.createElement('button');button.textContent=item.title[B.state.lang.startsWith('zh')?0:1];
      button.onclick=()=>{Q.switchMode('learn');const card=$('[data-exercise="'+item.id+'"]').closest('article');card.scrollIntoView({block:'nearest'});card.tabIndex=-1;card.focus({preventScroll:true});};
      related.append(button);
    }
  }
  const originalSelection=T.selectionChanged.bind(T);
  T.selectionChanged=()=>{originalSelection();relatedExercises();};
  const sourceLink=document.createElement('a');sourceLink.href='./INTEGRATION-REVIEW.md';sourceLink.id='integration-sources';sourceLink.target='_blank';sourceLink.rel='noopener';
  $('.rd-footer')?.append(sourceLink);
  function translate(){
    document.title='SOMA · '+text('title');
    for(const key of ['anatomy','atlas','learn','bodylab'])nav.querySelector('[data-mode="'+key+'"]').textContent=text(key);
    $('#original-body-tools').textContent=text('legacy');returnButton.textContent=text('modern');
    $('#integration-surface').textContent=text('surface');
    $('#composition-language-note').textContent=text('fallback');
    $('#composition-language-note').hidden=['zh','en','ja'].includes(B.state.lang);
    $('#integration-health-title').textContent=text('resources');$('#integration-next').textContent=text('next');sourceLink.textContent=text('source');
    health.querySelectorAll('a')[0].textContent=text('activity');health.querySelectorAll('a')[1].textContent=text('diet');relatedExercises();
    syncChild();
  }
  new MutationObserver(translate).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
  translate();mode(Q.mode);
  if(['learn','atlas','bodylab','surface'].includes(location.hash.slice(1)))Q.switchMode(location.hash.slice(1));
  // Sequential parsing shares the skeleton normalization. Never deform anatomy with body sliders.
  (async()=>{for(const system of ['bones','muscles'])await P.loadSystem(system);})().catch(e=>B.toast(e.message));
  window.SOMA_INTEGRATION={version:'3.4-integrated-2026-09-19'};
};
