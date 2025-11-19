import React, { Suspense } from 'react';
import AdminImportClient from './AdminImportClient';

export const dynamic = 'force-dynamic';

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <AdminImportClient />
    </Suspense>
  );
}