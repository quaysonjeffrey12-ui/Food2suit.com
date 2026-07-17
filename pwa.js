(() => {
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('push-service-worker.js').catch(() => {
      // The storefront remains usable if offline support is unavailable.
    });
  });
})();
