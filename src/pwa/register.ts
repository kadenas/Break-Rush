export function registerServiceWorker(): void {
  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    navigator.serviceWorker
      .register(new URL('./sw.ts', import.meta.url), { type: 'module' })
      .catch((error) => console.error('SW registration failed', error));
  }
}
