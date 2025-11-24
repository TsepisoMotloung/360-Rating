const CHANNEL_NAME = '360-rating-sync';

type SyncEvent = 'assignments-updated' | 'responses-updated' | 'admins-updated' | string;

let bc: BroadcastChannel | null = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    bc = new BroadcastChannel(CHANNEL_NAME);
  }
} catch (e) {
  bc = null;
}

const listeners: Array<(ev: SyncEvent) => void> = [];

export function publish(event: SyncEvent) {
  try {
    if (bc) {
      bc.postMessage(event);
    }
    // localStorage fallback to trigger "storage" events across tabs
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(`__sync_${CHANNEL_NAME}`, `${event}_${Date.now()}`);
      } catch (e) {
        // ignore
      }
    }
  } catch (err) {
    // ignore
  }
}

export function subscribe(cb: (ev: SyncEvent) => void) {
  listeners.push(cb);

  const onMessage = (e: MessageEvent) => {
    try {
      const ev = e.data as SyncEvent;
      cb(ev);
    } catch (err) {
      // ignore
    }
  };

  const onStorage = (e: StorageEvent) => {
    if (!e.key) return;
    if (e.key.indexOf(`__sync_${CHANNEL_NAME}`) === 0) {
      const v = e.newValue || '';
      const ev = v.split('_')[0] as SyncEvent;
      cb(ev);
    }
  };

  if (bc) bc.addEventListener('message', onMessage as EventListener);
  if (typeof window !== 'undefined') window.addEventListener('storage', onStorage);

  return () => {
    // unsubscribe
    const idx = listeners.indexOf(cb);
    if (idx >= 0) listeners.splice(idx, 1);
    if (bc) bc.removeEventListener('message', onMessage as EventListener);
    if (typeof window !== 'undefined') window.removeEventListener('storage', onStorage);
  };
}

export default { publish, subscribe };
