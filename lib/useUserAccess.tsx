'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

export interface UserAccess {
  isAdmin?: boolean;
  isManager?: boolean;
  hasRatings?: boolean;
}

export default function useUserAccess() {
  const searchParams = useSearchParams();
  const auth = searchParams.get('auth');

  const [userAccess, setUserAccess] = useState<UserAccess | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    let mounted = true;

    async function fetchAccess() {
      try {
        const res = await fetch(`/api/auth/validate?auth=${encodeURIComponent(auth ?? '')}`);
        if (!res.ok) {
          setUserAccess(null);
          return;
        }
        const validation = await res.json();
        if (!mounted) return;
        setUserEmail(validation.email || null);

        // Check rater assignments (may return 401 if not rater)
        let hasRatings = false;
        try {
          const r = await fetch(`/api/rater/assignments?auth=${encodeURIComponent(auth ?? '')}`);
          if (r.ok) {
            const d = await r.json();
            hasRatings = Array.isArray(d.assignments) && d.assignments.length > 0;
          }
        } catch (err) {
          // ignore
        }

        setUserAccess({
          isAdmin: validation.isAdmin || false,
          isManager: validation.isManager || false,
          hasRatings,
        });
      } catch (err) {
        console.error('useUserAccess error:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchAccess();

    return () => {
      mounted = false;
    };
  }, [auth]);

  return { auth, userAccess, userEmail, loading } as const;
}
