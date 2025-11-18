'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2, Download, FileText } from 'lucide-react';
import { extractAuthParams, encodeAuthToken } from '@/lib/params';

interface Period {
  RatingPeriodID: number;
  PeriodName: string;
  StartDate: string;
  EndDate: string;
  IsActive: boolean;
}

export default function AdminReportsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { uid, email } = extractAuthParams(searchParams as any);

  const [loading, setLoading] = useState(true);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<number | null>(null);
  const [reportType, setReportType] = useState<'assignments' | 'responses'>('assignments');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!uid || !email) {
      router.push('/error-invalid-request');
      return;
    }
    fetchPeriods();
  }, [uid, email]);

  const fetchPeriods = async () => {
    try {
      const auth = encodeAuthToken(uid, email);
      const res = await fetch(`/api/admin/periods?auth=${encodeURIComponent(auth || '')}`);
      if (!res.ok) {
        if (res.status === 401) {
          router.push('/error-access-denied');
          return;
        }
        throw new Error('Failed to load periods');
      }
      const data = await res.json();
      setPeriods(data.periods || []);
      if (data.periods && data.periods.length > 0) {
        const active = data.periods.find((p: Period) => p.IsActive) || data.periods[0];
        setSelectedPeriod(active.RatingPeriodID);
      }
    } catch (err) {
      console.error(err);
      setMessage('Failed to load periods');
      setTimeout(() => setMessage(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!selectedPeriod) {
      setMessage('Please select a rating period');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    try {
      setMessage('Generating report...');
      const auth = encodeAuthToken(uid, email);
      const res = await fetch(
        `/api/admin/reports?auth=${encodeURIComponent(auth || '')}&type=${reportType}&periodId=${selectedPeriod}`
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
      if (!filename) filename = `${reportType}-${selectedPeriod}.csv`;

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
      console.error(err);
      setMessage('Failed to generate report');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-red-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6 border border-gray-100">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Generate Reports</h1>
              <p className="text-sm text-gray-600">Export assignments or ratings as CSV files.</p>
            </div>
            <div>
              <button
                onClick={() => router.push(`/admin?auth=${encodeURIComponent(encodeAuthToken(uid, email) || '')}`)}
                className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-100"
              >
                Back
              </button>
            </div>
          </div>
        </div>

        {message && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-900">
            {message}
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Rating Period</label>
              <select
                value={selectedPeriod ?? ''}
                onChange={(e) => setSelectedPeriod(parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg"
              >
                {periods.map((p) => (
                  <option key={p.RatingPeriodID} value={p.RatingPeriodID}>
                    {p.PeriodName} ({new Date(p.StartDate).toLocaleDateString()} - {new Date(p.EndDate).toLocaleDateString()})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Report Type</label>
              <div className="flex gap-4">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="radio"
                    name="reportType"
                    checked={reportType === 'assignments'}
                    onChange={() => setReportType('assignments')}
                    className="cursor-pointer"
                  />
                  Assignments
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="radio"
                    name="reportType"
                    checked={reportType === 'responses'}
                    onChange={() => setReportType('responses')}
                    className="cursor-pointer"
                  />
                  Ratings (Responses)
                </label>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleGenerate}
              className="px-5 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Generate & Download
            </button>
            <button
              onClick={() => router.push(`/admin?auth=${encodeURIComponent(encodeAuthToken(uid, email) || '')}`)}
              className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-100"
            >
              Cancel
            </button>
            <div className="text-sm text-gray-500 ml-auto flex items-center gap-2">
              <FileText className="w-4 h-4 text-gray-400" /> Last exports are logged for auditing.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
