'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2, Plus, Trash2, Search, ChevronDown, ChevronUp, AlertCircle, CheckCircle } from 'lucide-react';
import MainLayout from '@/components/MainLayout';
import useUserAccess from '@/lib/useUserAccess';
import { subscribe, publish } from '@/lib/sync';

interface Assignment {
  assignmentId: number;
  raterEmail: string;
  raterFName?: string | null;
  raterSurname?: string | null;
  rateeEmail: string;
  rateeFName?: string | null;
  rateeSurname?: string | null;
  raterPosition?: string | null;
  rateePosition?: string | null;
  relationship?: number | null;
  isCompleted: boolean;
  dateCompleted: string | null;
}

interface RateeGroup {
  rateeEmail: string;
  rateeFName?: string | null;
  rateeSurname?: string | null;
  raters: Assignment[];
  completedCount: number;
}

function ManagerAssignmentsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const auth = searchParams.get('auth');

  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [rateeGroups, setRateeGroups] = useState<RateeGroup[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [message, setMessage] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newRaterEmail, setNewRaterEmail] = useState('');
  const [newRateeEmail, setNewRateeEmail] = useState('');
  const [newRelationship, setNewRelationship] = useState<number>(1);
  const [newRaterPosition, setNewRaterPosition] = useState('');
  const [newRateePosition, setNewRateePosition] = useState('');
  const [expandedRatee, setExpandedRatee] = useState<string | null>(null);

  useEffect(() => {
    if (!auth) {
      router.push('/error-invalid-request');
      return;
    }
    fetchAssignments();

    const unsub = subscribe((ev) => {
      if (ev === 'assignments-updated' || ev === 'responses-updated') {
        fetchAssignments();
      }
    });
    return () => unsub();
  }, [auth]);

  useEffect(() => {
    if (searchTerm) {
      const filtered = assignments.filter(
        (a) =>
          a.raterEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
          a.rateeEmail.toLowerCase().includes(searchTerm.toLowerCase())
      );
      groupAssignments(filtered);
    } else {
      groupAssignments(assignments);
    }
  }, [searchTerm, assignments]);

  const groupAssignments = (data: Assignment[]) => {
    const groups: { [key: string]: RateeGroup } = {};

    data.forEach((assignment) => {
      if (!groups[assignment.rateeEmail]) {
        groups[assignment.rateeEmail] = {
          rateeEmail: assignment.rateeEmail,
          rateeFName: assignment.rateeFName || null,
          rateeSurname: assignment.rateeSurname || null,
          raters: [],
          completedCount: 0,
        };
      }
      groups[assignment.rateeEmail].raters.push(assignment);
      if (assignment.isCompleted) {
        groups[assignment.rateeEmail].completedCount++;
      }
    });

    setRateeGroups(
      Object.values(groups).sort((a, b) => a.rateeEmail.localeCompare(b.rateeEmail))
    );
  };

  const fetchAssignments = async () => {
    try {
      const response = await fetch(`/api/manager/assignments?auth=${encodeURIComponent(auth || '')}`);
      if (!response.ok) {
        if (response.status === 401) {
          router.push('/error-access-denied');
          return;
        }
        throw new Error('Failed to fetch assignments');
      }

      const data = await response.json();
      setAssignments(data.assignments || []);
      groupAssignments(data.assignments || []);
    } catch (error) {
      console.error('Error fetching assignments:', error);
      setMessage('Failed to load assignments');
    } finally {
      setLoading(false);
    }
  };

  const handleAddAssignment = async () => {
    if (!newRaterEmail || !newRateeEmail) {
      setMessage('Please fill all required fields');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    try {
      const response = await fetch('/api/manager/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auth: auth,
          assignments: [
            {
              raterEmail: newRaterEmail,
              rateeEmail: newRateeEmail,
              relationship: newRelationship,
              raterPosition: newRaterPosition || null,
              rateePosition: newRateePosition || null,
            },
          ],
        }),
      });

      const data = await response.json();

      if (response.ok || response.status === 207) {
        setMessage('Assignment created successfully!');
        setNewRaterEmail('');
        setNewRateeEmail('');
        setNewRelationship(1);
        setNewRaterPosition('');
        setNewRateePosition('');
        setShowAddForm(false);
        await fetchAssignments();
        try { publish('assignments-updated'); } catch(e) {}
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

  const { userAccess: access, userEmail: accessEmail } = useUserAccess();

  if (loading) {
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
        {/* Header */}
        <div>
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">My Assignments</h1>
              <p className="text-gray-600">Manage rating assignments for your team</p>
            </div>
            <button
              onClick={() => router.push(`/manager?auth=${encodeURIComponent(auth || '')}`)}
              className="px-6 py-3 bg-white text-gray-700 border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 font-medium transition-all"
            >
              ← Back to Dashboard
            </button>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div
            className={`rounded-lg border p-4 mb-6 flex items-center gap-3 ${
              message.includes('success')
                ? 'bg-green-50 border-green-200 text-green-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            {message.includes('success') ? (
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
            )}
            <p className="font-medium">{message}</p>
          </div>
        )}

        {/* Top Action Bar */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6 border border-gray-100">
          <div className="flex gap-4 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2 transition-all shadow-sm hover:shadow-md"
            >
              <Plus className="w-5 h-5" />
              Add Assignment
            </button>
          </div>

          {/* Add Form */}
          {showAddForm && (
            <div className="border-t border-gray-200 pt-6 mt-6">
              <h3 className="font-semibold text-gray-900 mb-4 text-lg">Create New Assignment</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rater Email
                  </label>
                  <input
                    type="email"
                    value={newRaterEmail}
                    onChange={(e) => setNewRaterEmail(e.target.value)}
                    placeholder="rater@example.com"
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                    placeholder="ratee@example.com"
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Relationship</label>
                  <select
                    value={newRelationship}
                    onChange={(e) => setNewRelationship(parseInt(e.target.value, 10))}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value={1}>Peer</option>
                    <option value={2}>Supervisor</option>
                    <option value={3}>Manager</option>
                    <option value={4}>Subordinate</option>
                  </select>
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rater Position (Optional)
                  </label>
                  <input
                    type="text"
                    value={newRaterPosition}
                    onChange={(e) => setNewRaterPosition(e.target.value)}
                    placeholder="e.g., Manager"
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ratee Position (Optional)
                  </label>
                  <input
                    type="text"
                    value={newRateePosition}
                    onChange={(e) => setNewRateePosition(e.target.value)}
                    placeholder="e.g., Developer"
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="flex gap-4 mt-4">
                <button
                  onClick={handleAddAssignment}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-all"
                >
                  Create Assignment
                </button>
                <button
                  onClick={() => {
                    setShowAddForm(false);
                    setNewRaterEmail('');
                    setNewRateeEmail('');
                    setNewRaterPosition('');
                    setNewRateePosition('');
                  }}
                  className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg p-6 border border-gray-100 shadow-sm">
            <p className="text-gray-600 text-sm font-medium mb-2">Total Assignments</p>
            <p className="text-3xl font-bold text-gray-900">{assignments.length}</p>
          </div>
          <div className="bg-white rounded-lg p-6 border border-gray-100 shadow-sm">
            <p className="text-gray-600 text-sm font-medium mb-2">People Being Rated</p>
            <p className="text-3xl font-bold text-gray-900">{rateeGroups.length}</p>
          </div>
          <div className="bg-white rounded-lg p-6 border border-gray-100 shadow-sm">
            <p className="text-gray-600 text-sm font-medium mb-2">Completion Rate</p>
            <p className="text-3xl font-bold text-blue-600">
              {assignments.length > 0
                ? Math.round(
                    (assignments.filter((a) => a.isCompleted).length / assignments.length) * 100
                  )
                : 0}
              %
            </p>
          </div>
        </div>

        {/* Assignments Cards */}
        <div className="space-y-4">
          {rateeGroups.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-16 text-center border border-gray-100">
              <div className="text-gray-400 mb-4 flex justify-center">
                <Search className="w-12 h-12" />
              </div>
              <p className="text-gray-600 font-medium">No assignments found</p>
            </div>
          ) : (
            rateeGroups.map((group) => (
              <div
                key={group.rateeEmail}
                className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-100 hover:shadow-md transition-shadow"
              >
                {/* Card Header */}
                <button
                  onClick={() =>
                    setExpandedRatee(
                      expandedRatee === group.rateeEmail ? null : group.rateeEmail
                    )
                  }
                  className="w-full px-6 py-5 flex items-center justify-between hover:bg-blue-50 transition-colors text-left"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-gray-900 text-lg">{`${(group.rateeFName || '').trim()} ${(group.rateeSurname || '').trim()} (${group.rateeEmail})`}</h3>
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                          Ratee
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        {group.raters.length} rater{group.raters.length !== 1 ? 's' : ''} • {group.completedCount}{' '}
                        completed
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right min-w-max">
                      <div className="inline-block bg-blue-50 px-4 py-2 rounded-lg">
                        <p className="text-2xl font-bold text-blue-600">
                          {Math.round((group.completedCount / group.raters.length) * 100)}%
                        </p>
                        <p className="text-xs text-gray-600 font-medium">complete</p>
                      </div>
                    </div>
                    {expandedRatee === group.rateeEmail ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </button>

                {/* Expanded Content */}
                {expandedRatee === group.rateeEmail && (
                  <div className="border-t border-gray-100 bg-white">
                    <div className="px-6 py-4 space-y-3">
                      {group.raters.map((rater) => (
                        <div
                          key={rater.assignmentId}
                          className="flex items-center justify-between p-4 rounded-lg border border-gray-100 bg-gray-50"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <p className="text-sm font-medium text-gray-900">{`${(rater.raterFName || '').trim()} ${(rater.raterSurname || '').trim()} (${rater.raterEmail})`}</p>
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-gray-100 text-gray-700">
                                Rater
                              </span>
                              {rater.relationship && (
                                <span className="inline-flex items-center ml-2 px-2 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-700">
                                  {['Peer', 'Supervisor', 'Manager', 'Subordinate'][rater.relationship - 1]}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                              <span
                                className={`inline-block px-3 py-1 rounded text-xs font-semibold ${
                                  rater.isCompleted
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-yellow-100 text-yellow-700'
                                }`}
                              >
                                {rater.isCompleted ? '✓ Completed' : '◯ Pending'}
                              </span>
                              {rater.isCompleted && rater.dateCompleted && (
                                <span className="text-xs text-gray-500 font-medium">
                                  {new Date(rater.dateCompleted).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </MainLayout>
  );
}

export default function ManagerAssignments() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-white">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      }
    >
      <ManagerAssignmentsContent />
    </Suspense>
  );
}
