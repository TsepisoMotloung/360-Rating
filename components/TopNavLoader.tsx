"use client";

import { useEffect, useState } from 'react';

export default function TopNavLoader() {
  const [pending, setPending] = useState(0);

  useEffect(() => {
    if (typeof globalThis === 'undefined' || !globalThis.fetch) return;

    const originalFetch = globalThis.fetch.bind(globalThis);

    // Wrap fetch to detect in-flight requests
    (globalThis as any).fetch = async (...args: any[]) => {
      setPending((p) => p + 1);
      try {
        const res = await originalFetch.apply(globalThis, args as any);
        return res;
      } finally {
        setPending((p) => Math.max(0, p - 1));
      }
    };

    return () => {
      // restore original
      (globalThis as any).fetch = originalFetch;
    };
  }, []);

  const isLoading = pending > 0;

  return (
    <div aria-hidden className={`fixed left-0 top-0 right-0 z-50 h-1 pointer-events-none`}>
      <div
        style={{ width: isLoading ? '100%' : '0%', transition: 'width 220ms linear' }}
        className={`h-1 bg-primary-600`} />
    </div>
  );
}
