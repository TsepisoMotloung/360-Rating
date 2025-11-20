'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { validateUser } from '@/lib/auth';
import MainLayout from './MainLayout';
import { Loader2 } from 'lucide-react';

interface ProtectedLayoutProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'manager' | 'rater';
}

export default function ProtectedLayout({
  children,
  requiredRole,
}: ProtectedLayoutProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const auth = searchParams.get('auth');

  const [loading, setLoading] = useState(true);
  const [validation, setValidation] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function checkAuth() {
      if (!auth) {
        setError('Missing authentication');
        router.push('/');
        return;
      }

      try {
        // Decode auth token: base64(uid:email)
        const decoded = Buffer.from(auth, 'base64').toString('utf-8');
        const [uid, email] = decoded.split(':');

        if (!uid || !email) {
          setError('Invalid authentication format');
          router.push('/');
          return;
        }

        const result = await validateUser(uid, email);

        if (!result.isValid) {
          setError('Invalid authentication');
          router.push('/');
          return;
        }

        // Check role access
        if (requiredRole) {
          if (requiredRole === 'admin' && !result.isAdmin) {
            setError('Admin access required');
            router.push('/error-access-denied');
            return;
          }
          if (requiredRole === 'manager' && !result.isManager) {
            setError('Manager access required');
            router.push('/error-access-denied');
            return;
          }
        }

        setValidation(result);
        setLoading(false);
      } catch (err) {
        console.error('Auth validation error:', err);
        setError('Authentication failed');
        router.push('/');
      }
    }

    checkAuth();
  }, [auth, router, requiredRole]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !validation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <p className="text-red-600 font-medium">{error || 'Authentication error'}</p>
        </div>
      </div>
    );
  }

  const userRole = validation.isAdmin ? 'admin' : validation.isManager ? 'manager' : 'rater';

  return (
    <MainLayout userEmail={validation.email} userRole={userRole} auth={auth || ''}>
      {children}
    </MainLayout>
  );
}
