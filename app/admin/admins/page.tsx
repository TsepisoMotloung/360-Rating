'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2, UserPlus, Trash2 } from 'lucide-react';
import { extractAuthParams } from '@/lib/params';

interface AdminRow {
  AdministratorID: number;
  Username?: string | null;
  Description?: string | null;
  IsActive?: number | null;
}

export default function AdminsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { uid, email } = extractAuthParams(searchParams as any);

  const [loading, setLoading] = useState(true);
  const [admins, setAdmins] = useState<AdminRow[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!uid || !email) {
      router.push('/error-invalid-request');
      return;
    }
    fetchAdmins();
  }, [uid, email]);

  const fetchAdmins = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/admins?uid=${uid}&email=${email}`);
      if (!res.ok) {
        if (res.status === 401) {
          router.push('/error-access-denied');
          return;
        }
        throw new Error('Failed to load admins');
      }
      const data = await res.json();
      setAdmins(data.admins || []);
    } catch (err) {
      console.error(err);
      setMessage('Failed to load admins');
      setTimeout(() => setMessage(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!newEmail) {
      setMessage('Please enter an email');
      setTimeout(() => setMessage(''), 2500);
      return;
    }

    try {
      const res = await fetch(`/api/admin/admins?uid=${uid}&email=${email}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail, description: newDesc }),
      });
      if (!res.ok) {
        const txt = await res.text();
        setMessage(txt || 'Failed to add admin');
        setTimeout(() => setMessage(''), 3500);
        return;
      }
      setNewEmail('');
      setNewDesc('');
      setMessage('Admin added');
      fetchAdmins();
    } catch (err) {
      console.error(err);
      setMessage('Failed to add admin');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleRemove = async (targetEmail: string) => {
    if (!confirm(`Remove admin ${targetEmail}? This cannot be undone.`)) return;

    try {
      const res = await fetch(`/api/admin/admins?uid=${uid}&email=${email}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail }),
      });
      if (!res.ok) {
        const txt = await res.text();
        setMessage(txt || 'Failed to remove admin');
        setTimeout(() => setMessage(''), 3500);
        return;
      }
      setMessage('Admin removed');
      fetchAdmins();
    } catch (err) {
      console.error(err);
      setMessage('Failed to remove admin');
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
              <h1 className="text-2xl font-bold text-gray-900">Manage Admins</h1>
              <p className="text-sm text-gray-600">Add or remove administrative users for the application.</p>
            </div>
            <div>
              <button
                onClick={() => router.push(`/admin?uid=${uid}&email=${email}`)}
                className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-100"
              >
                Back
              </button>
            </div>
          </div>
        </div>

        {message && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-900">{message}</div>
        )}

        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100 mb-6">
          <div className="grid md:grid-cols-3 gap-3">
            <input
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="admin@example.com"
              className="col-span-2 px-4 py-2 border border-gray-200 rounded-lg"
            />
            <button onClick={handleAdd} className="px-4 py-2 bg-red-600 text-white rounded-lg flex items-center gap-2">
              <UserPlus className="w-4 h-4" /> Add
            </button>
          </div>
          <div className="mt-3">
            <input
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Optional description"
              className="w-full mt-2 px-4 py-2 border border-gray-200 rounded-lg"
            />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
          <h2 className="text-lg font-medium mb-4">Current Admins</h2>
          <div className="space-y-3">
            {admins.length === 0 && <div className="text-sm text-gray-500">No admins found.</div>}
            {admins.map((a) => (
              <div key={a.AdministratorID} className="flex items-center justify-between p-3 border border-gray-50 rounded-lg">
                <div>
                  <div className="font-medium text-gray-900">{a.Username}</div>
                  <div className="text-sm text-gray-500">{a.Description || ''}</div>
                </div>
                <div>
                  <button onClick={() => handleRemove(a.Username || '')} className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 flex items-center gap-2">
                    <Trash2 className="w-4 h-4 text-red-600" /> Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
