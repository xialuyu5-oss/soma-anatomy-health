// Classic script: report startup failures even if ES modules cannot load.
(() => {
  const loading = document.getElementById('loading');
  const controls = [...document.querySelectorAll('#studio button,#studio input,#studio select,#save')];
  const disabled = controls.map(control => control.disabled);
  controls.forEach(control => control.disabled = true);
  let timer;
  const fail = error => {
    console.error('SOMA body workspace startup failed', error);
    clearTimeout(timer);
    controls.forEach(control => control.disabled = true);
    loading.hidden = false;
    const title = document.createElement('strong');
    title.textContent = '工作室未能启动';
    const detail = document.createElement('span');
    detail.textContent = error instanceof Error ? error.message : String(error);
    const retry = document.createElement('button');
    retry.textContent = '重新载入';
    retry.onclick = () => location.reload();
    loading.replaceChildren(title, detail, retry);
    document.getElementById('status').textContent = detail.textContent;
  };
  window.somaStartup = {
    fail,
    // app.js has loaded and owns its own timeouts (resource fetch, textures, worker); stop the module-load watchdog.
    loaded() {
      clearTimeout(timer);
    },
    complete() {
      clearTimeout(timer);
      controls.forEach((control, i) => control.disabled = disabled[i]);
      loading.hidden = true;
    }
  };
  if (location.protocol === 'file:') {
    fail('请先双击 START-SOMA.bat，再访问启动窗口显示的本地地址（默认 http://127.0.0.1:8765/）。不能直接打开 index.html。');
    return;
  }
  timer = setTimeout(() => fail('45 秒内没有载入应用脚本。请确认 START-SOMA.bat 已启动本地服务，并使用它显示的地址，然后重新载入。'), 45000);
  import('./app.js?v=soma-integrated-20260919').catch(fail);
})();
