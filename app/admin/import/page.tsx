"use client";

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { extractAuthParams, encodeAuthToken } from '@/lib/params';

export default function AdminImportPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { uid, email } = extractAuthParams(searchParams as any);

  const [fileContent, setFileContent] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [previewCount, setPreviewCount] = useState(0);
  const [periodId, setPeriodId] = useState<number | null>(null);
  const [periodName, setPeriodName] = useState<string | null>(null);

  useEffect(() => {
    if (!uid || !email) {
      router.push('/error-invalid-request');
      return;
    }

    // Fetch active period for display
    (async () => {
      try {
        const auth = encodeAuthToken(uid, email);
        const res = await fetch(`/api/admin/periods?auth=${encodeURIComponent(auth || '')}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data && data.period) {
          setPeriodId(data.period.id);
          setPeriodName(data.period.periodName || data.period.PeriodName || null);
        }
      } catch (err) {
        console.error('Failed to fetch period', err);
      }
    })();
  }, [uid, email, router]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    setResult(null);
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result || '');
        const parsed = JSON.parse(text);
        if (!Array.isArray(parsed)) {
          setError('JSON must be an array of assignments');
          setFileContent([]);
          setPreviewCount(0);
          return;
        }
        // Basic validation
        const items = parsed
          .filter((it: any) => it && it.raterEmail && it.rateeEmail)
          .map((it: any) => ({ raterEmail: it.raterEmail, rateeEmail: it.rateeEmail }));
        setFileContent(items);
        setPreviewCount(items.length);
      } catch (err: any) {
        setError('Invalid JSON file');
        setFileContent([]);
        setPreviewCount(0);
      }
    };
    reader.readAsText(file);
  }

  async function handleUpload() {
    setError(null);
    setResult(null);
    if (!uid || !email) return router.push('/error-invalid-request');
    if (!fileContent || fileContent.length === 0) return setError('No assignments to upload');

    setLoading(true);
    try {
      const res = await fetch('/api/admin/assignments/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auth: encodeAuthToken(uid, email), assignments: fileContent, periodId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Import failed');
      } else {
        setResult(data);
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-2xl font-bold mb-2">Import Assignments (JSON)</h1>
          <p className="text-sm text-gray-600 mb-4">
            Upload the JSON file of assignments to create rating assignments. The JSON should be an array of objects with <code>raterEmail</code> and <code>rateeEmail</code>.
          </p>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">File</label>
            <input type="file" accept="application/json" onChange={handleFileChange} />
          </div>

          <div className="mb-4">
            <p className="text-sm">Selected assignments: <strong>{previewCount}</strong></p>
            <p className="text-sm">Target period: <strong>{periodName ?? 'Auto (active period)'}</strong></p>
          </div>

          {error && <div className="mb-4 text-red-700">{error}</div>}

          <div className="flex gap-2">
            <button onClick={handleUpload} disabled={loading} className="px-4 py-2 bg-primary-600 text-white rounded-lg">
              {loading ? 'Uploading...' : 'Upload and Import'}
            </button>
            <button onClick={() => { setFileContent([]); setPreviewCount(0); setResult(null); setError(null); }} className="px-4 py-2 bg-gray-100 rounded-lg">Clear</button>
          </div>

          {result && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded">
              <p className="font-medium">Import result:</p>
              <pre className="text-sm mt-2">{JSON.stringify(result, null, 2)}</pre>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-2">Preview (first 10)</h2>
          <ul className="text-sm list-disc ml-6">
            {fileContent.slice(0, 10).map((it, idx) => {
              const mask = (s: string) => {
                if (!s) return '—';
                const parts = s.split('@');
                return parts[0].slice(0, 3) + '…@' + (parts[1] || '…');
              };
              return (
                <li key={idx}>{mask(it.raterEmail)} → {mask(it.rateeEmail)}</li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}