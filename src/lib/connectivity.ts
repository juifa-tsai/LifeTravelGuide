import { useSyncExternalStore } from 'react';
function subscribe(update: () => void) {
  window.addEventListener('online', update);
  window.addEventListener('offline', update);
  return () => {
    window.removeEventListener('online', update);
    window.removeEventListener('offline', update);
  };
}
// A shared browser snapshot keeps the banner, map and links consistent during reconnects.
export function useOnline() {
  return useSyncExternalStore(subscribe, () => navigator.onLine);
}
