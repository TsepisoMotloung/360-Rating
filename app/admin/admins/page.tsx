import React, { Suspense } from 'react';
import AdminsClient from './AdminsClient';

export const dynamic = 'force-dynamic';

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <AdminsClient />
    </Suspense>
  );
}
