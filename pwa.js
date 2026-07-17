(() => {
  const mobile = matchMedia('(max-width: 767px)').matches;
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const iPhone = /iphone|ipad|ipod/i.test(navigator.userAgent);
  let deferredInstall;

  function addPrompt(message, actionText, action) {
    if (!mobile || standalone || document.getElementById('f2s-install-prompt')) return;
    document.head.insertAdjacentHTML('beforeend', '<style>#f2s-install-prompt{position:fixed;left:16px;right:16px;bottom:82px;z-index:90;display:flex;align-items:center;gap:12px;padding:13px 14px;border-radius:18px;background:#172033;color:#fff;box-shadow:0 16px 38px #0005;font:600 13px system-ui}#f2s-install-prompt span{flex:1;line-height:1.35}#f2s-install-prompt button{border:0;border-radius:11px;padding:10px 12px;background:#ff6b35;color:#fff;font-weight:800;white-space:nowrap}#f2s-install-prompt .f2s-dismiss{padding:7px;background:transparent;color:#cbd5e1;font-size:18px}</style>');
    document.body.insertAdjacentHTML('beforeend', `<aside id="f2s-install-prompt" role="status"><span>${message}</span><button type="button" id="f2s-install-action">${actionText}</button><button class="f2s-dismiss" type="button" aria-label="Dismiss">×</button></aside>`);
    document.getElementById('f2s-install-action').addEventListener('click', action);
    document.querySelector('#f2s-install-prompt .f2s-dismiss').addEventListener('click', () => document.getElementById('f2s-install-prompt')?.remove());
  }

  function start() {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('push-service-worker.js').catch(() => {});
    if (!mobile || standalone) return;
    if (iPhone) {
      addPrompt('Add Food2Suit to your home screen for the app experience.', 'How to install', () => alert('Tap Share, then choose “Add to Home Screen”.'));
      return;
    }
    window.addEventListener('beforeinstallprompt', event => {
      event.preventDefault();
      deferredInstall = event;
      addPrompt('Install Food2Suit for faster ordering and updates.', 'Install app', async () => {
        if (!deferredInstall) return;
        deferredInstall.prompt();
        await deferredInstall.userChoice;
        deferredInstall = null;
        document.getElementById('f2s-install-prompt')?.remove();
      });
    });
    window.addEventListener('appinstalled', () => document.getElementById('f2s-install-prompt')?.remove());
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
