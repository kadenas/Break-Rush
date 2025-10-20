export const registerServiceWorker = () => {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register(new URL('./pwa/sw.ts', import.meta.url), { type: 'module' })
        .catch((err) => console.warn('SW registration failed', err));
    });
  }
};
