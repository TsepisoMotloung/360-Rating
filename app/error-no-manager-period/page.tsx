'use client';

import { useRouter } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';

export default function ErrorNoManagerPeriod() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-8">
        <div className="flex justify-center mb-4">
          <AlertTriangle className="w-16 h-16 text-purple-600" />
        </div>

        <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">
          No Active Rating Period
        </h1>

        <p className="text-gray-600 text-center mb-6">
          There is currently no active rating period. Please check back later or contact your administrator.
        </p>

        <button
          onClick={() => router.push('/')}
          className="w-full bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors"
        >
          Go Back
        </button>
      </div>
    </div>
  );
}
