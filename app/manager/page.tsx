'use client';

export const dynamic = 'force-dynamic';

import { Suspense } from 'react';
import ManagerPageContent from './manager-content';

export default function ManagerPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ManagerPageContent />
    </Suspense>
  );
}
