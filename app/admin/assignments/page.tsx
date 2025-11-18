'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2, Plus, Trash2, Search, ChevronDown, ChevronUp, AlertCircle, CheckCircle } from 'lucide-react';
import { extractAuthParams, buildAuthToken } from '@/lib/params';

interface Assignment {
  AssignmentID: number;
  RaterUserID?: number;
  RaterEmail: string;
  RaterFName?: string | null;
  RaterSurname?: string | null;
  RateeUserID?: number;
  RateeEmail: string;
  RateeFName?: string | null;
  RateeSurname?: string | null;
  Relationship?: number | null;
  IsCompleted: boolean;
  DateCompleted: string | null;
}

interface RateeGroup {
  rateeEmail: string;
  rateeFName?: string | null;
  rateeSurname?: string | null;
  raters: Assignment[];
  completedCount: number;
}

interface ConfirmDialog {
  isOpen: boolean;
  type: 'single' | 'bulk' | null;
  count: number;
  assignmentId?: number;
}

function AssignmentsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { uid, email } = extractAuthParams(searchParams as any);
  const auth = uid && email ? buildAuthToken(uid, email) : null;

  const [loading, setLoading] = useState(true);
  const [pageProgress, setPageProgress] = useState<number>(0);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [rateeGroups, setRateeGroups] = useState<RateeGroup[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [message, setMessage] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newRaterEmail, setNewRaterEmail] = useState('');
  const [newRateeEmail, setNewRateeEmail] = useState('');
  const [newRelationship, setNewRelationship] = useState<number>(1);
  const [periodId, setPeriodId] = useState<number | null>(null);
  const [expandedRatee, setExpandedRatee] = useState<string | null>(null);
  const [selectedAssignments, setSelectedAssignments] = useState<Set<number>>(new Set());
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialog>({
    isOpen: false,
    type: null,
    count: 0,
  });
  const [editingAssignmentId, setEditingAssignmentId] = useState<number | null>(null);
  const [editingRelationship, setEditingRelationship] = useState<number>(1);
  const [operationProgress, setOperationProgress] = useState<number>(0);

  useEffect(() => {
    if (!uid || !email) {
      router.push('/error-invalid-request');
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
      groupAssignments(filtered);
    } else {
      groupAssignments(assignments);
    }
  }, [searchTerm, assignments]);

  const groupAssignments = (data: Assignment[]) => {
    const groups: { [key: string]: RateeGroup } = {};

    data.forEach((assignment) => {
      if (!groups[assignment.RateeEmail]) {
        groups[assignment.RateeEmail] = {
          rateeEmail: assignment.RateeEmail,
          rateeFName: assignment.RateeFName || null,
          rateeSurname: assignment.RateeSurname || null,
          raters: [],
          completedCount: 0,
        };
      }
      // ensure we capture name info if available
      if (!groups[assignment.RateeEmail].rateeFName && assignment.RateeFName) {
        groups[assignment.RateeEmail].rateeFName = assignment.RateeFName;
      }
      if (!groups[assignment.RateeEmail].rateeSurname && assignment.RateeSurname) {
        groups[assignment.RateeEmail].rateeSurname = assignment.RateeSurname;
      }
      groups[assignment.RateeEmail].raters.push(assignment);
      if (assignment.IsCompleted) {
        groups[assignment.RateeEmail].completedCount++;
      }
    });

    setRateeGroups(
      Object.values(groups).sort((a, b) => a.rateeEmail.localeCompare(b.rateeEmail))
    );
  };

  const fetchAssignments = async () => {
    try {
      setPageProgress(3);
      const iv = setInterval(() => setPageProgress((p) => Math.min(97, p + Math.ceil(Math.random() * 6))), 300);
      const response = await fetch(`/api/admin/assignments?auth=${encodeURIComponent(auth || '')}`);
      if (!response.ok) {
        if (response.status === 401) {
          router.push('/error-access-denied');
          return;
        }
        throw new Error('Failed to fetch assignments');
      }

      const data = await response.json();
      setAssignments(data.assignments);
      groupAssignments(data.assignments);
      setPeriodId(data.periodId);
      clearInterval(iv);
      setPageProgress(100);
      setTimeout(() => setPageProgress(0), 400);
    } catch (error) {
      console.error('Error fetching assignments:', error);
      setMessage('Failed to load assignments');
    } finally {
      setLoading(false);
    }
  };

  const handleAddAssignment = async () => {
    if (!newRaterEmail || !newRateeEmail || !periodId || !newRelationship) {
      setMessage('Please fill all fields');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    try {
      const response = await fetch('/api/admin/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auth: auth,
          raterEmail: newRaterEmail,
          rateeEmail: newRateeEmail,
          periodId,
          relationship: newRelationship,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('Assignment created successfully!');
        setNewRaterEmail('');
        setNewRateeEmail('');
        setNewRelationship(1);
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
    setConfirmDialog({
      isOpen: true,
      type: 'single',
      count: 1,
      assignmentId,
    });
  };

  const startProgress = () => {
    setOperationProgress(3);
    const iv = setInterval(() => {
      setOperationProgress((p) => {
        if (p >= 97) {
          clearInterval(iv);
          return p;
        }
        return p + Math.ceil(Math.random() * 6);
      });
    }, 300);
    return iv;
  };

  const finishProgress = () => setOperationProgress(100);

  const handleStartEdit = (assignmentId: number, currentRel?: number | null) => {
    setEditingAssignmentId(assignmentId);
    setEditingRelationship(currentRel ?? 1);
  };

  const handleCancelEdit = () => {
    setEditingAssignmentId(null);
    setEditingRelationship(1);
  };

  const handleSaveRelationship = async (assignmentId: number) => {
    if (!uid || !email) return router.push('/error-invalid-request');
    const iv = startProgress();
    try {
      const res = await fetch('/api/admin/assignments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auth: auth, assignmentId, relationship: editingRelationship }),
      });
      const data = await res.json();
      finishProgress();
      if (!res.ok) {
        setMessage(data.error || 'Failed to update relationship');
      } else {
        setMessage('Relationship updated');
        setEditingAssignmentId(null);
        await fetchAssignments();
      }
    } catch (err) {
      console.error('Failed to save relationship', err);
      setMessage('Failed to update relationship');
    } finally {
      clearInterval(iv);
      setTimeout(() => setMessage(''), 3000);
      setOperationProgress(0);
    }
  };

  const confirmSingleDelete = async () => {
    if (!confirmDialog.assignmentId) return;

    try {
      const response = await fetch(
        `/api/admin/assignments?auth=${encodeURIComponent(auth || '')}&assignmentId=${confirmDialog.assignmentId}`,
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
    } finally {
      setConfirmDialog({ isOpen: false, type: null, count: 0 });
    }
  };

  const toggleAssignmentSelection = (assignmentId: number) => {
    const newSelected = new Set(selectedAssignments);
    if (newSelected.has(assignmentId)) {
      newSelected.delete(assignmentId);
    } else {
      newSelected.add(assignmentId);
    }
    setSelectedAssignments(newSelected);
  };

  const toggleRateeGroupSelection = (group: RateeGroup) => {
    const groupIds = new Set(group.raters.map((r) => r.AssignmentID));
    const newSelected = new Set(selectedAssignments);
    const allGroupSelected = group.raters.every((r) => newSelected.has(r.AssignmentID));

    if (allGroupSelected) {
      groupIds.forEach((id) => newSelected.delete(id));
    } else {
      groupIds.forEach((id) => newSelected.add(id));
    }
    setSelectedAssignments(newSelected);
  };

  const handleBulkDelete = async () => {
    if (selectedAssignments.size === 0) {
      setMessage('No assignments selected');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    setConfirmDialog({
      isOpen: true,
      type: 'bulk',
      count: selectedAssignments.size,
    });
  };

  const confirmBulkDelete = async () => {
    try {
      let deleted = 0;
      let failed = 0;
      const ids = Array.from(selectedAssignments);

      for (let i = 0; i < ids.length; i++) {
        try {
          const response = await fetch(
            `/api/admin/assignments?auth=${encodeURIComponent(auth || '')}&assignmentId=${ids[i]}`,
            { method: 'DELETE' }
          );
          if (response.ok) {
            deleted++;
          } else {
            failed++;
          }
        } catch (error) {
          failed++;
        }
      }

      setSelectedAssignments(new Set());
      setMessage(
        `Deleted ${deleted} assignment${deleted !== 1 ? 's' : ''}${
          failed > 0 ? ` (${failed} failed)` : ''
        }`
      );
      await fetchAssignments();
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error in bulk delete:', error);
      setMessage('Failed to delete assignments');
      setTimeout(() => setMessage(''), 3000);
    } finally {
      setConfirmDialog({ isOpen: false, type: null, count: 0 });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-white">
        <Loader2 className="w-8 h-8 animate-spin text-red-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Manage Assignments</h1>
              <p className="text-gray-600">Organize and manage rating assignments efficiently</p>
            </div>
            <button
              onClick={() => router.push(`/admin?auth=${encodeURIComponent(auth || '')}`)}
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
                className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
              />
            </div>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium flex items-center gap-2 transition-all shadow-sm hover:shadow-md"
            >
              <Plus className="w-5 h-5" />
              Add Assignment
            </button>
          </div>

          {/* Bulk Delete Toolbar */}
          {selectedAssignments.size > 0 && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <span className="font-semibold text-red-900">
                  {selectedAssignments.size} assignment{selectedAssignments.size !== 1 ? 's' : ''} selected
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedAssignments(new Set())}
                  className="px-4 py-2 bg-white text-red-700 border border-red-200 rounded-lg hover:bg-red-50 text-sm font-medium transition-all"
                >
                  Deselect All
                </button>
                <button
                  onClick={handleBulkDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2 text-sm font-medium transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Selected
                </button>
              </div>
            </div>
          )}

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
                    placeholder="rater@alliance.co.ls"
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
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
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Relationship</label>
                  <select
                    value={newRelationship}
                    onChange={(e) => setNewRelationship(parseInt(e.target.value, 10))}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  >
                    <option value={1}>Peer</option>
                    <option value={2}>Supervisor</option>
                    <option value={3}>Manager</option>
                    <option value={4}>Subordinate</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-4 mt-4">
                <button
                  onClick={handleAddAssignment}
                  className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-all"
                >
                  Create Assignment
                </button>
                <button
                  onClick={() => {
                    setShowAddForm(false);
                    setNewRaterEmail('');
                    setNewRateeEmail('');
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
            <p className="text-3xl font-bold text-red-600">
              {assignments.length > 0
                ? Math.round(
                    (assignments.filter((a) => a.IsCompleted).length / assignments.length) * 100
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
                  className="w-full px-6 py-5 flex items-center justify-between hover:bg-red-50 transition-colors text-left"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <input
                      type="checkbox"
                      checked={group.raters.every((r) => selectedAssignments.has(r.AssignmentID))}
                      onChange={() => toggleRateeGroupSelection(group)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-5 h-5 text-red-600 rounded focus:ring-2 focus:ring-red-500 cursor-pointer"
                    />
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-gray-900 text-lg">{`${(group.rateeFName || '').trim()} ${(group.rateeSurname || '').trim()} (${group.rateeEmail})`}</h3>
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
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
                      <div className="inline-block bg-red-50 px-4 py-2 rounded-lg">
                        <p className="text-2xl font-bold text-red-600">
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
                          key={rater.AssignmentID}
                          className={`flex items-center justify-between p-4 rounded-lg border-l-4 transition-all ${
                            selectedAssignments.has(rater.AssignmentID)
                              ? 'border-l-red-600 bg-red-50 border border-red-200'
                              : 'border-l-gray-300 bg-white border border-gray-100'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedAssignments.has(rater.AssignmentID)}
                            onChange={() => toggleAssignmentSelection(rater.AssignmentID)}
                            className="w-4 h-4 text-red-600 rounded focus:ring-2 focus:ring-red-500 cursor-pointer"
                          />
                          <div className="flex-1 ml-4">
                            <div className="flex items-center gap-3">
                              <p className="text-sm font-medium text-gray-900">{`${(rater.RaterFName || '').trim()} ${(rater.RaterSurname || '').trim()} (${rater.RaterEmail})`}</p>
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-gray-100 text-gray-700">
                                Rater
                              </span>
                              {rater.Relationship && (
                                <span className="inline-flex items-center ml-2 px-2 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-700">
                                  {['Peer','Supervisor','Manager','Subordinate'][rater.Relationship - 1]}
                                </span>
                              )}
                            </div>
                            {/* explicit relationship text for clarity */}
                            {rater.Relationship && editingAssignmentId !== rater.AssignmentID && (
                              <div className="text-sm text-gray-600 mt-2">Rater relationship to Ratee: <strong>{['Peer','Supervisor','Manager','Subordinate'][rater.Relationship - 1]}</strong></div>
                            )}
                            <div className="flex items-center gap-2 mt-2">
                              <span
                                className={`inline-block px-3 py-1 rounded text-xs font-semibold ${
                                  rater.IsCompleted
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-yellow-100 text-yellow-700'
                                }`}
                              >
                                {rater.IsCompleted ? '✓ Completed' : '◯ Pending'}
                              </span>
                              {rater.IsCompleted && rater.DateCompleted && (
                                <span className="text-xs text-gray-500 font-medium">
                                  {new Date(rater.DateCompleted).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {editingAssignmentId === rater.AssignmentID ? (
                              <div className="flex items-center gap-2">
                                <select
                                  value={editingRelationship}
                                  onChange={(e) => setEditingRelationship(parseInt(e.target.value, 10))}
                                  className="px-2 py-1 border border-gray-200 rounded"
                                >
                                  <option value={1}>Peer</option>
                                  <option value={2}>Supervisor</option>
                                  <option value={3}>Manager</option>
                                  <option value={4}>Subordinate</option>
                                </select>
                                <button onClick={() => handleSaveRelationship(rater.AssignmentID)} className="px-2 py-1 bg-green-600 text-white rounded">Save</button>
                                <button onClick={handleCancelEdit} className="px-2 py-1 bg-gray-100 rounded">Cancel</button>
                              </div>
                            ) : (
                              <>
                                <button onClick={() => handleStartEdit(rater.AssignmentID, rater.Relationship)} className="px-2 py-1 bg-blue-50 text-blue-700 rounded">Edit</button>
                                <button
                                  onClick={() => handleDeleteAssignment(rater.AssignmentID)}
                                  className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-all hover:scale-110"
                                  title="Delete this assignment"
                                >
                                  <Trash2 className="w-5 h-5" />
                                </button>
                              </>
                            )}
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

      {/* Confirmation Modal */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 transform transition-all">
            <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>

            <h3 className="text-lg font-bold text-gray-900 text-center mb-2">
              {confirmDialog.type === 'single' ? 'Delete Assignment?' : 'Delete Multiple Assignments?'}
            </h3>

            <p className="text-gray-600 text-center mb-6">
              {confirmDialog.type === 'single'
                ? 'This will permanently delete the assignment. This action cannot be undone.'
                : `You are about to delete ${confirmDialog.count} assignment${confirmDialog.count !== 1 ? 's' : ''}. This action cannot be undone.`}
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDialog({ isOpen: false, type: null, count: 0 })}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition-all"
              >
                Cancel
              </button>
              <button
                onClick={confirmDialog.type === 'single' ? confirmSingleDelete : confirmBulkDelete}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-all"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminAssignments() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-white">
          <Loader2 className="w-8 h-8 animate-spin text-red-600" />
        </div>
      }
    >
      <AssignmentsContent />
    </Suspense>
  );
}
