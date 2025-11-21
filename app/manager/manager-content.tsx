'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

export default function ManagerPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const auth = searchParams.get('auth');

  useEffect(() => {
    if (auth) {
      router.push(`/manager/dashboard?auth=${encodeURIComponent(auth)}`);
    } else {
      router.push('/');
    }
  }, [auth, router]);

  return null;
}
