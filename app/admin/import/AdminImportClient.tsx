"use client";

import React, { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import MainLayout from '@/components/MainLayout';
import useUserAccess from '@/lib/useUserAccess';

export default function AdminImportClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const auth = searchParams.get('auth');

  const [items, setItems] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const xhrRef = useRef<XMLHttpRequest | null>(null);
  const [failedRows, setFailedRows] = useState<any[]>([]);
  const [result, setResult] = useState<any | null>(null);
  const { userAccess: access, userEmail: accessEmail, loading: accessLoading } = useUserAccess();

  useEffect(() => {
    if (!auth) router.push('/error-invalid-request');
  }, [auth, router]);

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
    setProgress(0);
    setFailedRows([]);
    setResult(null);

    // Use XHR to get upload progress and cancellation
    const xhr = new XMLHttpRequest();
    xhrRef.current = xhr;
    xhr.open('POST', '/api/admin/assignments/import');
    xhr.setRequestHeader('Content-Type', 'application/json');

    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable) {
        const pct = Math.round((ev.loaded / ev.total) * 100);
        setProgress(pct);
      }
    };

    xhr.onload = () => {
      setLoading(false);
      setProgress(100);
      try {
        const data = JSON.parse(xhr.responseText || '{}');
        setResult(data);
        const failed = data?.failedRows || [];
        setFailedRows(failed);
        if (xhr.status >= 200 && xhr.status < 300) {
          setError(null);
        } else {
          setError(data.error || 'Import failed');
        }
      } catch (err) {
        setError('Invalid server response');
      }
    };

    xhr.onerror = () => {
      setLoading(false);
      setError('Network error');
    };

    xhr.onabort = () => {
      setLoading(false);
      setError('Upload cancelled');
    };

    const payload = JSON.stringify({ auth, assignments: items });
    xhr.send(payload);
  };

  const uploadCsv = async () => {
    if (!auth) return router.push('/error-invalid-request');
    if (!csvFile) return setError('No CSV selected');
    setLoading(true);
    setProgress(0);
    setFailedRows([]);
    setResult(null);

    const fd = new FormData();
    fd.append('file', csvFile);
    fd.append('auth', auth);

    const xhr = new XMLHttpRequest();
    xhrRef.current = xhr;
    xhr.open('POST', '/api/admin/assignments/import/csv');

    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable) {
        const pct = Math.round((ev.loaded / ev.total) * 100);
        setProgress(pct);
      }
    };

    xhr.onload = () => {
      setLoading(false);
      setProgress(100);
      try {
        const data = JSON.parse(xhr.responseText || '{}');
        setResult(data);
        const failed = data?.failedRows || [];
        setFailedRows(failed);
        if (xhr.status >= 200 && xhr.status < 300) {
          setError(null);
        } else {
          setError(data.error || 'Upload failed');
        }
      } catch (err) {
        setError('Invalid server response');
      }
    };

    xhr.onerror = () => {
      setLoading(false);
      setError('Network error during upload');
    };

    xhr.onabort = () => {
      setLoading(false);
      setError('Upload cancelled');
    };

    xhr.send(fd);
  };

  const cancelUpload = () => {
    if (xhrRef.current) {
      xhrRef.current.abort();
    }
  };

  const downloadTemplateJson = () => {
    const template = [
      { raterEmail: 'rater@example.com', rateeEmail: 'ratee@example.com', relationship: 1 },
    ];
    const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'assignments-template.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadTemplateCsv = () => {
    const lines = ['raterEmail,rateeEmail,relationship', 'rater@example.com,ratee@example.com,1'];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'assignments-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadFailedAsJson = () => {
    if (!failedRows || failedRows.length === 0) return;
    const blob = new Blob([JSON.stringify(failedRows, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'failed-assignments.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadFailedAsCsv = () => {
    if (!failedRows || failedRows.length === 0) return;
    const lines = ['raterEmail,rateeEmail,relationship,reason'];
    failedRows.forEach((f) => {
      const r = f.row || f;
      const reason = (f.reason || '').replace(/"/g, '""');
      lines.push(`${r.raterEmail || ''},${r.rateeEmail || ''},${r.relationship ?? ''},"${reason}"`);
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'failed-assignments.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <MainLayout userEmail={accessEmail} userRole="admin" userAccess={access} auth={auth || ''}>
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h1 className="text-2xl font-bold mb-2">Import Assignments</h1>
          <p className="text-sm text-gray-600 mb-4">Upload JSON or CSV assignments. Emails are not exposed — an `auth` token is used.</p>

          <div className="mb-4 flex items-center gap-3">
            <button onClick={downloadTemplateJson} className="px-3 py-1 bg-blue-600 text-white rounded">Download JSON Template</button>
            <button onClick={downloadTemplateCsv} className="px-3 py-1 bg-blue-600 text-white rounded">Download CSV Template</button>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">JSON File</label>
            <input type="file" accept="application/json" onChange={handleJsonFile} />
            <button onClick={uploadJson} disabled={loading} className="ml-3 px-3 py-1 bg-green-600 text-white rounded">{loading ? 'Uploading...' : 'Upload JSON'}</button>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">CSV File</label>
            <input ref={fileInputRef} type="file" accept="text/csv" onChange={(e) => setCsvFile(e.target.files?.[0] ?? null)} />
            <button onClick={uploadCsv} disabled={loading} className="ml-3 px-3 py-1 bg-green-600 text-white rounded">{loading ? 'Uploading...' : 'Upload CSV'}</button>
          </div>

          {loading && (
            <div className="mb-4">
              <div className="w-full bg-gray-200 rounded h-3 overflow-hidden">
                <div className="h-3 bg-red-600" style={{ width: `${progress}%` }} />
              </div>
              <div className="text-sm text-gray-600 mt-2 flex items-center gap-2">
                <span>Progress: {progress}%</span>
                <button onClick={cancelUpload} className="ml-3 px-2 py-1 bg-yellow-500 text-white rounded">Cancel</button>
              </div>
            </div>
          )}

          {error && <div className="text-red-600 mb-3">{error}</div>}
          {result && (
            <div className="mb-3 p-3 bg-gray-50 rounded">
              <div className="text-sm text-gray-700">Result: {JSON.stringify(result)}</div>
            </div>
          )}
          {failedRows.length > 0 && (
            <div className="mb-3 p-3 bg-yellow-50 rounded">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium">Failed Rows ({failedRows.length})</div>
                <div className="flex gap-2">
                  <button onClick={downloadFailedAsJson} className="px-2 py-1 bg-blue-600 text-white rounded text-sm">Download JSON</button>
                  <button onClick={downloadFailedAsCsv} className="px-2 py-1 bg-blue-600 text-white rounded text-sm">Download CSV</button>
                </div>
              </div>
              <div className="text-sm text-gray-700 max-h-48 overflow-auto">
                <pre className="whitespace-pre-wrap">{JSON.stringify(failedRows, null, 2)}</pre>
              </div>
            </div>
          )}

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
    </MainLayout>
  );
}
