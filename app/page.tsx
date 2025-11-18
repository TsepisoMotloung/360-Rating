'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { extractAuthParams, encodeAuthToken } from '@/lib/params';

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { uid, email } = extractAuthParams(searchParams as any);

  useEffect(() => {
    async function resolveAndRedirect() {
      if (!uid || !email) {
        router.push('/error-invalid-request');
        return;
      }

      try {
        const auth = encodeAuthToken(uid, email);
        const res = await fetch(`/api/auth/resolve?auth=${encodeURIComponent(auth || '')}`);
        if (!res.ok) {
          router.push('/error-session-expired');
          return;
        }

        const data = await res.json();
        const finalUid = data.canonicalUid ?? uid;
        const finalEmail = data.canonicalEmail ?? email;

        const encoded = encodeAuthToken(String(finalUid), String(finalEmail));
        if ((finalEmail || '').toLowerCase() === 'tmotloung@alliance.co.ls') {
          router.push(`/admin?auth=${encodeURIComponent(encoded || '')}`);
        } else {
          router.push(`/rater?auth=${encodeURIComponent(encoded || '')}`);
        }
      } catch (err) {
        console.error('Redirect error:', err);
        router.push('/error-session-expired');
      }
    }

    resolveAndRedirect();
  }, [uid, email, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Redirecting...</p>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}
