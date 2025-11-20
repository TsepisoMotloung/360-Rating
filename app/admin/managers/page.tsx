'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import MainLayout from '@/components/MainLayout';
import useUserAccess from '@/lib/useUserAccess';
import ManagersClient from './ManagersClient';
import { Loader2 } from 'lucide-react';

function ManagersPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const auth = searchParams.get('auth');

  const [loading, setLoading] = useState(!auth);
  const { userAccess: access, userEmail: accessEmail, loading: accessLoading } = useUserAccess();

  useEffect(() => {
    if (!auth) {
      router.push('/');
    } else {
      setLoading(false);
    }
  }, [auth, router]);

  if (loading || accessLoading) {
    return (
      <MainLayout userEmail={accessEmail} userRole="admin" userAccess={access} auth={auth || ''}>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-red-600" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout userEmail={accessEmail} userRole="admin" userAccess={access} auth={auth || ''}>
      {auth && <ManagersClient auth={auth} />}
    </MainLayout>
  );
}

export default function ManagersPageWrapper() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    }>
      <ManagersPage />
    </Suspense>
  );
}
