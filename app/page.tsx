'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const uid = searchParams.get('uid');
  const email = searchParams.get('email');

  useEffect(() => {
    if (uid && email) {
      if (email.toLowerCase() === 'tmotloung@alliance.co.ls') {
        router.push(`/admin?uid=${uid}&email=${email}`);
      } else {
        router.push(`/rater?uid=${uid}&email=${email}`);
      }
    } else {
      router.push('/unauthorized');
    }
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
