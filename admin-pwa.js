(() => {
  let deferredInstall;
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);

  function addInstallButton() {
    if (standalone || document.getElementById('admin-install-app')) return;
    const target = document.querySelector('#admin-alert-toggle');
    if (!target) return;
    const button = document.createElement('button');
    button.id = 'admin-install-app';
    button.type = 'button';
    button.className = 'w-full rounded-xl border border-sky-800/60 bg-sky-950/20 px-3 py-2 text-[10px] font-bold text-sky-300 transition hover:bg-sky-900/40';
    button.textContent = 'Install admin app';
    button.addEventListener('click', async () => {
      if (ios) return alert('On iPhone or iPad, tap Share, then choose “Add to Home Screen”.');
      if (!deferredInstall) return alert('Your browser has not made installation available yet. Open this page in Chrome or Edge, then try again.');
      deferredInstall.prompt();
      await deferredInstall.userChoice;
      deferredInstall = null;
      button.remove();
    });
    target.insertAdjacentElement('afterend', button);
  }

  function start() {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('push-service-worker.js').catch(() => {});
    window.addEventListener('beforeinstallprompt', event => {
      event.preventDefault();
      deferredInstall = event;
      addInstallButton();
    });
    if (ios) addInstallButton();
    window.addEventListener('appinstalled', () => document.getElementById('admin-install-app')?.remove());
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
