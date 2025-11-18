"use client";

import { useEffect } from 'react';
import { useNavigation } from 'next/navigation';

export default function TopNavLoader() {
  const navigation = useNavigation();

  useEffect(() => {
    // no-op; we just rely on navigation.state below
  }, [navigation.state]);

  const isLoading = navigation.state === 'loading';

  return (
    <div aria-hidden className={`fixed left-0 top-0 right-0 z-50 h-1 transition-all duration-200 ${isLoading ? 'bg-primary-600' : 'bg-transparent'}`}>
      <div style={{ width: isLoading ? '100%' : '0%' }} className={`h-1 bg-primary-600 transition-all duration-300`} />
    </div>
  );
}
