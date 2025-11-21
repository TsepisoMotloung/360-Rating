'use client';

export const dynamic = 'force-dynamic';

import { Suspense } from 'react';
import ManagerReportsPageContent from './manager-reports-content';

export default function ManagerReportsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ManagerReportsPageContent />
    </Suspense>
  );
}
