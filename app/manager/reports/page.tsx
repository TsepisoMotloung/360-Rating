'use client';

export const dynamic = 'force-dynamic';

import { useSearchParams, useRouter } from 'next/navigation';
import MainLayout from '@/components/MainLayout';
import useUserAccess from '@/lib/useUserAccess';
import { Loader2, Download } from 'lucide-react';
import { useState } from 'react';

export default function ManagerReportsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const auth = searchParams.get('auth');
  const { userAccess: access, userEmail: accessEmail, loading: accessLoading } = useUserAccess();
  const [reportType, setReportType] = useState<'assignments' | 'responses'>('assignments');
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState('');

  if (!auth) {
    router.push('/');
    return null;
  }

  const handleGenerateReport = async () => {
    if (!auth) return;
    
    setGenerating(true);
    setMessage('');
    try {
      const res = await fetch(
        `/api/manager/reports?auth=${encodeURIComponent(auth)}&type=${reportType}`
      );

      if (!res.ok) {
        if (res.status === 401) {
          router.push('/error-access-denied');
          return;
        }
        const txt = await res.text();
        setMessage(txt || 'Failed to generate report');
        setTimeout(() => setMessage(''), 4000);
        return;
      }

      const blob = await res.blob();
      const contentDisposition = res.headers.get('Content-Disposition') || '';
      let filename = '';
      const match = /filename\*?=\"?([^;\"]+)/.exec(contentDisposition);
      if (match) filename = match[1].replace(/\"/g, '');
      if (!filename) filename = `manager-${reportType}-${Date.now()}.csv`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      setMessage('Download started');
      setTimeout(() => setMessage(''), 2000);
    } catch (err) {
      console.error('Error generating report:', err);
      setMessage('Failed to generate report');
      setTimeout(() => setMessage(''), 3000);
    } finally {
      setGenerating(false);
    }
  };

  if (accessLoading) {
    return (
      <MainLayout userEmail={accessEmail} userRole="manager" userAccess={access} auth={auth || ''}>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout userEmail={accessEmail} userRole="manager" userAccess={access} auth={auth || ''}>
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">My Reports</h1>
              <p className="text-sm text-gray-600 mt-2">Export your assignments or rating responses as CSV files.</p>
            </div>
            <button
              onClick={() => router.push(`/manager?auth=${encodeURIComponent(auth || '')}`)}
              className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-100"
            >
              Back
            </button>
          </div>
        </div>

        {message && (
          <div className={`p-4 rounded-lg border ${
            message.includes('started') || message.includes('Download')
              ? 'bg-green-50 border-green-200 text-green-900'
              : 'bg-red-50 border-red-200 text-red-900'
          }`}>
            {message}
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">Report Type</label>
            <div className="flex gap-6">
              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  name="reportType"
                  checked={reportType === 'assignments'}
                  onChange={() => setReportType('assignments')}
                  className="cursor-pointer"
                />
                <span className="text-gray-700">Assignments</span>
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  name="reportType"
                  checked={reportType === 'responses'}
                  onChange={() => setReportType('responses')}
                  className="cursor-pointer"
                />
                <span className="text-gray-700">Ratings (Responses)</span>
              </label>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleGenerateReport}
              disabled={generating}
              className="px-5 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium transition-all"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Generate & Download
                </>
              )}
            </button>
            <button
              onClick={() => router.push(`/manager?auth=${encodeURIComponent(auth || '')}`)}
              className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-100"
            >
              Cancel
            </button>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-2">Export Types</h3>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li><strong>Assignments:</strong> List of all your active rating assignments with rater/ratee details</li>
            <li><strong>Ratings:</strong> Submitted ratings and responses across all your assignments</li>
          </ul>
        </div>
      </div>
    </MainLayout>
  );
}
