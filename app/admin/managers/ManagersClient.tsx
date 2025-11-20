'use client';

import { useState, useEffect } from 'react';
import { Loader2, Plus, Trash2, Edit2, X } from 'lucide-react';

interface Manager {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  createdBy: string;
  dateCreated: string;
}

interface ManagersClientProps {
  auth: string;
}

export default function ManagersClient({ auth }: ManagersClientProps) {
  const [managers, setManagers] = useState<Manager[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
  });

  useEffect(() => {
    fetchManagers();
  }, []);

  const fetchManagers = async () => {
    try {
      const response = await fetch(`/api/admin/managers?auth=${encodeURIComponent(auth)}`);
      if (!response.ok) throw new Error('Failed to fetch managers');
      const data = await response.json();
      setManagers(data);
    } catch (error) {
      console.error('Error fetching managers:', error);
      setMessage('Failed to fetch managers');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch('/api/admin/managers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, auth }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create manager');
      }

      setMessage('Manager added successfully!');
      setFormData({ email: '', firstName: '', lastName: '' });
      await fetchManagers();
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error adding manager:', error);
      setMessage(error instanceof Error ? error.message : 'Failed to add manager');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (id: number, isActive: boolean) => {
    try {
      const response = await fetch('/api/admin/managers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isActive: !isActive, auth }),
      });

      if (!response.ok) throw new Error('Failed to update manager');
      await fetchManagers();
    } catch (error) {
      console.error('Error updating manager:', error);
      setMessage('Failed to update manager');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this manager?')) return;

    try {
      const response = await fetch(`/api/admin/managers?id=${id}&auth=${encodeURIComponent(auth)}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete manager');
      await fetchManagers();
      setMessage('Manager deleted successfully');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error deleting manager:', error);
      setMessage('Failed to delete manager');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Manage Managers</h1>
        <p className="text-gray-600 mt-2">Add and manage rating managers</p>
      </div>

      {/* Message */}
      {message && (
        <div className={`rounded-lg border p-4 mb-6 ${
          message.includes('success') 
            ? 'bg-green-50 border-green-200 text-green-800' 
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <p>{message}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Add Manager Form */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm p-6 sticky top-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Add New Manager
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  disabled={submitting}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="manager@example.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  disabled={submitting}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="First name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  disabled={submitting}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Last name"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-primary-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Add Manager
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Managers List */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              Managers ({managers.length})
            </h2>

            {managers.length === 0 ? (
              <p className="text-gray-600 py-8 text-center">No managers added yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                        Email
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                        Name
                      </th>
                      <th className="text-center py-3 px-4 text-sm font-medium text-gray-700">
                        Status
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {managers.map(manager => (
                      <tr key={manager.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 text-sm text-gray-900 font-medium">
                          {manager.email}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {manager.firstName} {manager.lastName}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                            manager.isActive
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {manager.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleToggleActive(manager.id, manager.isActive)}
                              className="text-blue-600 hover:text-blue-800 transition-colors"
                              title={manager.isActive ? 'Deactivate' : 'Activate'}
                            >
                              {manager.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                            <button
                              onClick={() => handleDelete(manager.id)}
                              className="text-red-600 hover:text-red-800 transition-colors"
                              title="Delete manager"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
