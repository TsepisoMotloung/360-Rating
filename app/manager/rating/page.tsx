"use client";

export const dynamic = 'force-dynamic';

import { Suspense } from 'react';
import ManagerRatingPageContent from './manager-rating-content';

export default function ManagerRatingPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ManagerRatingPageContent />
    </Suspense>
  );
}