'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2, Plus, Trash2, Search } from 'lucide-react';

interface Assignment {
  AssignmentID: number;
  RaterEmail: string;
  RateeEmail: string;
  IsCompleted: boolean;
  DateCompleted: string | null;
}

function AssignmentsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const uid = searchParams.get('uid');
  const email = searchParams.get('email');

  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [filteredAssignments, setFilteredAssignments] = useState<Assignment[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [message, setMessage] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newRaterEmail, setNewRaterEmail] = useState('');
  const [newRateeEmail, setNewRateeEmail] = useState('');
  const [periodId, setPeriodId] = useState<number | null>(null);

  useEffect(() => {
    if (!uid || !email) {
      router.push('/unauthorized');
      return;
    }
    fetchAssignments();
  }, [uid, email]);

  useEffect(() => {
    if (searchTerm) {
      const filtered = assignments.filter(
        (a) =>
          a.RaterEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
          a.RateeEmail.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredAssignments(filtered);
    } else {
      setFilteredAssignments(assignments);
    }
  }, [searchTerm, assignments]);

  const fetchAssignments = async () => {
    try {
      const response = await fetch(`/api/admin/assignments?uid=${uid}&email=${email}`);
      if (!response.ok) {
        if (response.status === 401) {
          router.push('/unauthorized');
          return;
        }
        throw new Error('Failed to fetch assignments');
      }

      const data = await response.json();
      setAssignments(data.assignments);
      setFilteredAssignments(data.assignments);
      setPeriodId(data.periodId);
    } catch (error) {
      console.error('Error fetching assignments:', error);
      setMessage('Failed to load assignments');
    } finally {
      setLoading(false);
    }
  };

  const handleAddAssignment = async () => {
    if (!newRaterEmail || !newRateeEmail || !periodId) {
      setMessage('Please fill all fields');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    try {
      const response = await fetch('/api/admin/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid,
          email,
          raterEmail: newRaterEmail,
          rateeEmail: newRateeEmail,
          periodId,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('Assignment created successfully!');
        setNewRaterEmail('');
        setNewRateeEmail('');
        setShowAddForm(false);
        await fetchAssignments();
      } else {
        setMessage(data.error || 'Failed to create assignment');
      }
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error creating assignment:', error);
      setMessage('Failed to create assignment');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleDeleteAssignment = async (assignmentId: number) => {
    if (!confirm('Are you sure you want to delete this assignment?')) {
      return;
    }

    try {
      const response = await fetch(
        `/api/admin/assignments?uid=${uid}&email=${email}&assignmentId=${assignmentId}`,
        { method: 'DELETE' }
      );

      if (response.ok) {
        setMessage('Assignment deleted successfully!');
        await fetchAssignments();
      } else {
        throw new Error('Failed to delete');
      }
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error deleting assignment:', error);
      setMessage('Failed to delete assignment');
      setTimeout(() => setMessage(''), 3000);
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
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Manage Assignments</h1>
              <p className="text-sm text-gray-500">Add, edit, or remove rating assignments</p>
            </div>
            <button
              onClick={() => router.push(`/admin?uid=${uid}&email=${email}`)}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              Back to Dashboard
            </button>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div
            className={`rounded-lg border p-4 mb-6 ${
              message.includes('success')
                ? 'bg-green-50 border-green-200 text-green-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            <p>{message}</p>
          </div>
        )}

        {/* Search & Add */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex gap-4 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by rater or ratee email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Add Assignment
            </button>
          </div>

          {/* Add Form */}
          {showAddForm && (
            <div className="border-t pt-4 mt-4">
              <h3 className="font-semibold text-gray-900 mb-4">New Assignment</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rater Email
                  </label>
                  <input
                    type="email"
                    value={newRaterEmail}
                    onChange={(e) => setNewRaterEmail(e.target.value)}
                    placeholder="rater@alliance.co.ls"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ratee Email
                  </label>
                  <input
                    type="email"
                    value={newRateeEmail}
                    onChange={(e) => setNewRateeEmail(e.target.value)}
                    placeholder="ratee@alliance.co.ls"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="flex gap-4 mt-4">
                <button
                  onClick={handleAddAssignment}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Create Assignment
                </button>
                <button
                  onClick={() => {
                    setShowAddForm(false);
                    setNewRaterEmail('');
                    setNewRateeEmail('');
                  }}
                  className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Assignments Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <p className="text-sm text-gray-600">
              Total: {filteredAssignments.length} assignments
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-3 px-6 text-sm font-medium text-gray-700">
                    Rater Email
                  </th>
                  <th className="text-left py-3 px-6 text-sm font-medium text-gray-700">
                    Ratee Email
                  </th>
                  <th className="text-center py-3 px-6 text-sm font-medium text-gray-700">
                    Status
                  </th>
                  <th className="text-center py-3 px-6 text-sm font-medium text-gray-700">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredAssignments.map((assignment) => (
                  <tr key={assignment.AssignmentID} className="border-b border-gray-100">
                    <td className="py-3 px-6 text-sm text-gray-900">{assignment.RaterEmail}</td>
                    <td className="py-3 px-6 text-sm text-gray-900">{assignment.RateeEmail}</td>
                    <td className="py-3 px-6 text-center">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                          assignment.IsCompleted
                            ? 'bg-green-100 text-green-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {assignment.IsCompleted ? 'Completed' : 'Pending'}
                      </span>
                    </td>
                    <td className="py-3 px-6 text-center">
                      <button
                        onClick={() => handleDeleteAssignment(assignment.AssignmentID)}
                        className="text-red-600 hover:text-red-800"
                        title="Delete assignment"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminAssignments() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      }
    >
      <AssignmentsContent />
    </Suspense>
  );
}
