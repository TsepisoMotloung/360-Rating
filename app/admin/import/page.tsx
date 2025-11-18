"use client";

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { extractAuthParams } from '@/lib/params';
import { useRef } from 'react';

export default function AdminImportPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { uid, email } = extractAuthParams(searchParams as any);

  const [fileContent, setFileContent] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [failedRows, setFailedRows] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [bulkRelationship, setBulkRelationship] = useState<number>(1);
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
        const res = await fetch(`/api/admin/periods?uid=${encodeURIComponent(uid)}&email=${encodeURIComponent(email)}`);
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
          .map((it: any) => ({ raterEmail: it.raterEmail, rateeEmail: it.rateeEmail, relationship: it.relationship }));
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

    // Validate relationships present
    const missing = fileContent.map((it, i) => ({ idx: i, it })).filter(x => typeof x.it.relationship !== 'number' || x.it.relationship < 1 || x.it.relationship > 4);
    if (missing.length > 0) {
      setError('Some rows are missing a valid relationship (1-4). Use the preview to assign relationships (per-row or bulk assign) before uploading.');
      return;
    }

    setLoading(true);
    setProgress(3);
    const iv = setInterval(() => setProgress((p) => Math.min(97, p + Math.ceil(Math.random() * 7))), 250);
    try {
      const res = await fetch('/api/admin/assignments/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid, email, assignments: fileContent, periodId }),
      });
      const data = await res.json();
      clearInterval(iv);
      setProgress(100);
      if (!res.ok) {
        setError(data.error || 'Import failed');
      } else {
        setResult(data);
        // Process errors to show rows
        const errs = data?.results?.errors || [];
        const failed = errs.map((e: any) => ({ index: e.index, reason: e.reason, row: fileContent[e.index] }));
        setFailedRows(failed);
      }
    } catch (err) {
      clearInterval(iv);
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }

  const toggleRow = (index: number) => {
    const s = new Set(selectedRows);
    if (s.has(index)) s.delete(index);
    else s.add(index);
    setSelectedRows(s);
  };

  const toggleSelectAll = () => {
    if (selectedRows.size === fileContent.length) {
      setSelectedRows(new Set());
      return;
    }
    const all = new Set<number>();
    fileContent.forEach((_, i) => all.add(i));
    setSelectedRows(all);
  };

  const applyBulkToSelected = () => {
    if (selectedRows.size === 0) return setError('No rows selected for bulk assign');
    const copy = [...fileContent];
    selectedRows.forEach((i) => {
      copy[i] = { ...copy[i], relationship: bulkRelationship };
    });
    setFileContent(copy);
    setError(null);
  };

  const applyBulkToAll = () => {
    if (fileContent.length === 0) return setError('No rows to assign');
    const copy = fileContent.map((it) => ({ ...it, relationship: bulkRelationship }));
    setFileContent(copy);
    setError(null);
  };

  const updateRowRelationship = (index: number, rel: number) => {
    const copy = [...fileContent];
    copy[index] = { ...copy[index], relationship: rel };
    setFileContent(copy);
  };

  // CSV parsing (simple) and conversion to assignments
  async function handleCSVFile(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    setResult(null);
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setCsvFile(file);
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter(Boolean);
    if (lines.length === 0) return setError('Empty CSV');
    const header = lines[0].split(',').map(h => h.trim().toLowerCase());
    const raterIdx = header.indexOf('rateremail');
    const rateeIdx = header.indexOf('rateeemail');
    const relIdx = header.indexOf('relationship');
    if (raterIdx === -1 || rateeIdx === -1) return setError('CSV must have headers: raterEmail, rateeEmail (optional relationship)');
    const items: any[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map(c => c.trim());
      if (!cols[raterIdx] || !cols[rateeIdx]) continue;
      const it: any = { raterEmail: cols[raterIdx], rateeEmail: cols[rateeIdx] };
      if (relIdx !== -1 && cols[relIdx]) it.relationship = parseInt(cols[relIdx], 10);
      items.push(it);
    }
    setFileContent(items);
    setPreviewCount(items.length);
    // clear file input value so same file can be reselected if needed
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  // Upload CSV file as multipart/form-data to server-side CSV import endpoint
  function handleServerCSVUpload() {
    setError(null);
    setResult(null);
    setFailedRows([]);
    if (!uid || !email) return router.push('/error-invalid-request');
    if (!csvFile) return setError('No CSV selected for upload');

    setLoading(true);
    setProgress(3);

    const fd = new FormData();
    fd.append('file', csvFile);
    fd.append('uid', uid);
    fd.append('email', email);
    if (periodId) fd.append('periodId', String(periodId));

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/admin/assignments/import/csv');
    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable) {
        const p = Math.round((ev.loaded / ev.total) * 90);
        setProgress(Math.min(95, Math.max(3, p)));
      }
    };
    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText);
        setProgress(100);
        if (xhr.status >= 400) {
          setError(data.error || 'Upload failed');
        } else {
          setResult(data);
          const failed = data?.failedRows || [];
          setFailedRows(failed.map((f: any) => ({ index: f.index, reason: f.reason, row: f.row })));
        }
      } catch (err) {
        setError('Unexpected server response');
      } finally {
        setLoading(false);
        setTimeout(() => setProgress(0), 400);
      }
    };
    xhr.onerror = () => {
      setError('Network error during upload');
      setLoading(false);
      setProgress(0);
    };
    xhr.send(fd);
  }

  function downloadFailedRows() {
    if (!failedRows || failedRows.length === 0) return;
    const lines = ['raterEmail,rateeEmail,relationship,reason'];
    failedRows.forEach((f) => {
      const r = f.row || {};
      lines.push(`${r.raterEmail || ''},${r.rateeEmail || ''},${r.relationship ?? ''},"${(f.reason||'').replace(/"/g,'""')}"`);
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'failed-assignments.csv';
    a.click();
    URL.revokeObjectURL(url);
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
            <div className="flex items-center gap-4">
              <input type="file" accept="application/json" onChange={handleFileChange} />
              <div className="text-sm">
                <a className="text-blue-600 hover:underline" href="/assignments-example.json" download>Download JSON example</a>
                <div>
                  <input ref={fileInputRef} type="file" accept="text/csv" onChange={handleCSVFile} />
                  <a className="text-blue-600 hover:underline ml-3" href="/assignments-example.csv" download>Download CSV example</a>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-4">
            <p className="text-sm">Selected assignments: <strong>{previewCount}</strong></p>
            <p className="text-sm">Target period: <strong>{periodName ?? 'Auto (active period)'}</strong></p>
            {progress > 0 && (
              <div className="w-full bg-gray-100 rounded mt-2 h-3 overflow-hidden">
                <div className="bg-red-600 h-3" style={{ width: `${progress}%`, transition: 'width 200ms' }} />
              </div>
            )}
          </div>

          {error && <div className="mb-4 text-red-700">{error}</div>}

          <div className="flex gap-2">
            <button onClick={handleUpload} disabled={loading} className="px-4 py-2 bg-primary-600 text-white rounded-lg">
              {loading ? `Uploading... ${progress}%` : 'Upload and Import'}
            </button>
            <button onClick={() => { setFileContent([]); setPreviewCount(0); setResult(null); setError(null); }} className="px-4 py-2 bg-gray-100 rounded-lg">Clear</button>
            {failedRows.length > 0 && (
              <button onClick={downloadFailedRows} className="px-4 py-2 bg-yellow-100 rounded-lg ml-2">Download Failed Rows</button>
            )}
          </div>

          {result && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded">
              <p className="font-medium">Import result:</p>
              <pre className="text-sm mt-2">{JSON.stringify(result, null, 2)}</pre>
            </div>
          )}
          {failedRows.length > 0 && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
              <p className="font-medium">Failed Rows ({failedRows.length}):</p>
              <ul className="text-sm mt-2 list-disc ml-6">
                {failedRows.map((f, i) => (
                  <li key={i}>{`Row ${f.index}: ${f.row?.raterEmail || ''} -> ${f.row?.rateeEmail || ''} — ${f.reason}`}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-2">Preview</h2>
          {fileContent.length === 0 ? (
            <p className="text-sm text-gray-500">No preview available</p>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <label className="inline-flex items-center gap-2">
                    <input type="checkbox" checked={selectedRows.size === fileContent.length} onChange={toggleSelectAll} />
                    <span className="text-sm">Select all</span>
                  </label>
                  <div className="inline-flex items-center gap-2">
                    <select value={bulkRelationship} onChange={(e) => setBulkRelationship(parseInt(e.target.value, 10))} className="px-2 py-1 border rounded">
                      <option value={1}>Peer</option>
                      <option value={2}>Supervisor</option>
                      <option value={3}>Manager</option>
                      <option value={4}>Subordinate</option>
                    </select>
                    <button onClick={applyBulkToSelected} className="px-3 py-1 bg-blue-600 text-white rounded">Apply to selected</button>
                    <button onClick={applyBulkToAll} className="px-3 py-1 bg-gray-100 rounded">Apply to all</button>
                  </div>
                </div>
                <div className="text-sm text-gray-500">Showing {fileContent.length} rows</div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="text-left border-b">
                      <th className="py-2 pr-4">#</th>
                      <th className="py-2 pr-4">Select</th>
                      <th className="py-2 pr-4">Rater Email</th>
                      <th className="py-2 pr-4">Ratee Email</th>
                      <th className="py-2 pr-4">Relationship</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fileContent.map((it, idx) => (
                      <tr key={idx} className="border-b">
                        <td className="py-2 pr-4 align-top">{idx + 1}</td>
                        <td className="py-2 pr-4 align-top">
                          <input type="checkbox" checked={selectedRows.has(idx)} onChange={() => toggleRow(idx)} />
                        </td>
                        <td className="py-2 pr-4 align-top">{it.raterEmail}</td>
                        <td className="py-2 pr-4 align-top">{it.rateeEmail}</td>
                        <td className="py-2 pr-4 align-top">
                          <select value={it.relationship ?? ''} onChange={(e) => updateRowRelationship(idx, parseInt(e.target.value, 10))} className="px-2 py-1 border rounded">
                            <option value={''}>--</option>
                            <option value={1}>Peer</option>
                            <option value={2}>Supervisor</option>
                            <option value={3}>Manager</option>
                            <option value={4}>Subordinate</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}