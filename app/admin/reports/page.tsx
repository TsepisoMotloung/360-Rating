import { Suspense } from 'react';
import AdminReportsClient from './AdminReportsClient';

export const dynamic = 'force-dynamic';

export default function AdminReportsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <AdminReportsClient />
    </Suspense>
  );
}
