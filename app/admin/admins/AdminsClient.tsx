'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2, UserPlus, Trash2 } from 'lucide-react';
import MainLayout from '@/components/MainLayout';
import useUserAccess from '@/lib/useUserAccess';
import { THEME, alertClasses } from '@/lib/theme';
import { publish } from '@/lib/sync';

interface AdminRow {
  AdministratorID: number;
  Username?: string | null;
  Description?: string | null;
  IsActive?: number | null;
}

export default function AdminsClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const auth = searchParams.get('auth');

  const [loading, setLoading] = useState(true);
  const [admins, setAdmins] = useState<AdminRow[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [message, setMessage] = useState('');
  const { userAccess: access, userEmail: accessEmail, loading: accessLoading } = useUserAccess();

  useEffect(() => {
    if (!auth) {
      router.push('/');
      return;
    }
    fetchAdmins();
  }, [auth, router]);

  const fetchAdmins = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/admins?auth=${encodeURIComponent(auth || '')}`);
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
      const res = await fetch(`/api/admin/admins?auth=${encodeURIComponent(auth || '')}`, {
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
      await fetchAdmins();
      try { publish('admins-updated'); } catch(e) {}
    } catch (err) {
      console.error(err);
      setMessage('Failed to add admin');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleRemove = async (targetEmail: string) => {
    if (!confirm(`Remove admin ${targetEmail}? This cannot be undone.`)) return;

    try {
      const res = await fetch(`/api/admin/admins?auth=${encodeURIComponent(auth || '')}`, {
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
      await fetchAdmins();
      try { publish('admins-updated'); } catch(e) {}
    } catch (err) {
      console.error(err);
      setMessage('Failed to remove admin');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  if (loading || accessLoading) {
    return (
      <MainLayout userEmail={accessEmail} userRole="admin" userAccess={access} auth={auth || ''}>
        <div className="flex items-center justify-center py-12">
          <Loader2 className={`w-8 h-8 animate-spin ${THEME.primary.text}`} />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout userEmail={accessEmail} userRole="admin" userAccess={access} auth={auth || ''}>
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Manage Admins</h1>
              <p className="text-sm text-gray-600">Add or remove administrative users for the application.</p>
            </div>
            <div>
              <button
                onClick={() => router.push(`/admin?auth=${encodeURIComponent(auth || '')}`)}
                className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-100"
              >
                Back
              </button>
            </div>
          </div>
        </div>

        {message && (
          <div className={`p-4 border rounded-lg ${message.includes('removed') || message.includes('Failed') ? alertClasses.error : alertClasses.success}`}>{message}</div>
        )}

        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
          <div className="grid md:grid-cols-3 gap-3">
            <input
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="admin@example.com"
              className="col-span-2 px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
            <button onClick={handleAdd} className={`px-4 py-2 ${THEME.primary.bg} ${THEME.primary.bgHover} text-white rounded-lg flex items-center gap-2`}>
              <UserPlus className="w-4 h-4" /> Add
            </button>
          </div>
          <div className="mt-3">
            <input
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Optional description"
              className="w-full mt-2 px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
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
                  <button onClick={() => handleRemove(a.Username || '')} className={`px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 flex items-center gap-2`}>
                    <Trash2 className={`w-4 h-4 ${THEME.error.text}`} /> Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
