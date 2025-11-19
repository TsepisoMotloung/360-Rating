"use client";

import React, { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { extractAuthParams, buildAuthToken } from '@/lib/params';

export default function AdminImportClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { uid, email } = extractAuthParams(searchParams as any);
  const auth = uid && email ? buildAuthToken(uid, email) : null;

  const [items, setItems] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!uid || !email) router.push('/error-invalid-request');
  }, [uid, email, router]);

  const handleJsonFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const json = JSON.parse(String(r.result || ''));
        if (!Array.isArray(json)) throw new Error('JSON must be an array');
        const parsed = json
          .filter((it: any) => it && it.raterEmail && it.rateeEmail)
          .map((it: any) => ({ raterEmail: it.raterEmail, rateeEmail: it.rateeEmail, relationship: it.relationship }));
        setItems(parsed);
      } catch (err: any) {
        setError(err?.message || 'Invalid JSON');
        setItems([]);
      }
    };
    r.readAsText(f);
  };

  const uploadJson = async () => {
    if (!auth) return router.push('/error-invalid-request');
    if (items.length === 0) return setError('No items');
    setLoading(true);
    try {
      const res = await fetch('/api/admin/assignments/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auth, assignments: items }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || 'Import failed');
      else setError(null);
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const uploadCsv = async () => {
    if (!auth) return router.push('/error-invalid-request');
    if (!csvFile) return setError('No CSV selected');
    setLoading(true);
    const fd = new FormData();
    fd.append('file', csvFile);
    fd.append('auth', auth);
    try {
      const res = await fetch('/api/admin/assignments/import/csv', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) setError(data.error || 'Upload failed');
      else setError(null);
    } catch (err) {
      setError('Network error during upload');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-2xl font-bold mb-2">Import Assignments</h1>
          <p className="text-sm text-gray-600 mb-4">Upload JSON or CSV assignments. Emails are not exposed — an `auth` token is used.</p>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">JSON File</label>
            <input type="file" accept="application/json" onChange={handleJsonFile} />
            <button onClick={uploadJson} disabled={loading} className="ml-3 px-3 py-1 bg-green-600 text-white rounded">Upload JSON</button>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">CSV File</label>
            <input ref={fileInputRef} type="file" accept="text/csv" onChange={(e) => setCsvFile(e.target.files?.[0] ?? null)} />
            <button onClick={uploadCsv} disabled={loading} className="ml-3 px-3 py-1 bg-green-600 text-white rounded">Upload CSV</button>
          </div>

          {error && <div className="text-red-600 mb-3">{error}</div>}

        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-2">Preview</h2>
          {items.length === 0 ? (
            <p className="text-sm text-gray-500">No preview available</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-2 pr-4">#</th>
                    <th className="py-2 pr-4">Rater</th>
                    <th className="py-2 pr-4">Ratee</th>
                    <th className="py-2 pr-4">Relationship</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, idx) => (
                    <tr key={idx} className="border-b">
                      <td className="py-2 pr-4">{idx + 1}</td>
                      <td className="py-2 pr-4">{it.raterEmail}</td>
                      <td className="py-2 pr-4">{it.rateeEmail}</td>
                      <td className="py-2 pr-4">{String(it.relationship ?? '')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
