'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Accordion from '@/components/Accordion';
import RatingScale from '@/components/RatingScale';
import MainLayout from '@/components/MainLayout';
import useUserAccess from '@/lib/useUserAccess';
import { Loader2, Send, Plus } from 'lucide-react';

interface Category {
  CategoryID: number;
  CategoryName: string;
  SortOrder: number;
}

interface Rating {
  CategoryID: number;
  RatingValue: number;
  Comment: string;
}

interface Assignment {
  assignmentId: number;
  raterUserId: string;
  raterEmail: string;
  raterFName?: string | null;
  raterSurname?: string | null;
  raterPosition?: string | null;
  rateeUserId: string;
  rateeEmail: string;
  rateeFName?: string | null;
  rateeSurname?: string | null;
  rateePosition?: string | null;
  isCompleted: boolean;
  dateCompleted: string | null;
  ratings: Rating[];
}

interface RatingFormData {
  [assignmentId: number]: {
    ratings: { [categoryId: number]: number };
    comment: string;
  };
}

function ManagerContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const auth = searchParams.get('auth');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [period, setPeriod] = useState<any>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [formData, setFormData] = useState<RatingFormData>({});
  const [message, setMessage] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [importData, setImportData] = useState('');
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    if (!auth) {
      router.push('/');
      return;
    }
    fetchAssignments();
  }, [auth, router]);

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
      setPeriod(data.period);
      setCategories(data.categories);
      setAssignments(data.assignments);

      // Initialize form data with existing ratings
      const initialFormData: RatingFormData = {};
      data.assignments.forEach((assignment: Assignment) => {
        const ratings: { [categoryId: number]: number } = {};
        assignment.ratings.forEach((rating: Rating) => {
          ratings[rating.CategoryID] = rating.RatingValue;
        });
        initialFormData[assignment.assignmentId] = {
          ratings,
          comment: assignment.ratings[0]?.Comment || '',
        };
      });
      setFormData(initialFormData);
    } catch (error) {
      console.error('Error fetching assignments:', error);
      setMessage('Failed to load assignments');
    } finally {
      setLoading(false);
    }
  };

  const handleRatingChange = (assignmentId: number, categoryId: number, value: number) => {
    setFormData(prev => ({
      ...prev,
      [assignmentId]: {
        ...prev[assignmentId],
        ratings: {
          ...(prev[assignmentId]?.ratings || {}),
          [categoryId]: value,
        },
      },
    }));
  };

  const handleCommentChange = (assignmentId: number, comment: string) => {
    setFormData(prev => ({
      ...prev,
      [assignmentId]: {
        ...prev[assignmentId],
        comment,
      },
    }));
  };

  const submitSingleRating = async (assignmentId: number) => {
    const data = formData[assignmentId];
    if (!data || Object.keys(data.ratings).length !== categories.length) {
      setMessage('Please complete all ratings before submitting');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    setSubmitting(true);
    try {
      const ratings = Object.entries(data.ratings).map(([categoryId, value]) => ({
        categoryId: parseInt(categoryId),
        value,
      }));

      const response = await fetch('/api/manager/rating', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auth: auth,
          assignmentId,
          ratings,
          comment: data.comment,
        }),
      });

      if (response.ok) {
        setMessage('Rating submitted successfully!');
        setTimeout(() => setMessage(''), 3000);
        await fetchAssignments();
      } else {
        throw new Error('Failed to submit rating');
      }
    } catch (error) {
      console.error('Error submitting rating:', error);
      setMessage('Failed to submit rating');
      setTimeout(() => setMessage(''), 3000);
    } finally {
      setSubmitting(false);
    }
  };

  const handleImportAssignments = async () => {
    if (!importData.trim()) {
      setMessage('Please enter assignment data');
      return;
    }

    setImporting(true);
    try {
      // Parse JSON input
      const data = JSON.parse(importData);
      const assignmentsArray = Array.isArray(data) ? data : [data];

      // Validate format
      const validAssignments = assignmentsArray.filter(a => 
        a.raterEmail && a.rateeEmail
      );

      if (validAssignments.length === 0) {
        setMessage('No valid assignments found in input');
        setImporting(false);
        return;
      }

      const response = await fetch('/api/manager/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auth, assignments: validAssignments }),
      });

      const result = await response.json();
      
      if (response.ok || response.status === 207) {
        setMessage(result.message || `Successfully imported ${result.created || validAssignments.length} assignments`);
        setImportData('');
        setShowImportModal(false);
        await fetchAssignments();
      } else {
        setMessage(result.error || 'Failed to import assignments');
      }
    } catch (error) {
      console.error('Error importing assignments:', error);
      setMessage('Invalid JSON format or import failed');
    } finally {
      setImporting(false);
      setTimeout(() => setMessage(''), 4000);
    }
  };

  const { userAccess: access, userEmail: accessEmail, loading: accessLoading } = useUserAccess();

  if (loading || accessLoading) {
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
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Manager Portal</h1>
            {period && (
              <p className="text-gray-600">
                Rating Period: <span className="font-medium">{period.name}</span>
              </p>
            )}
          </div>
          <button
            onClick={() => setShowImportModal(true)}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Import Assignments
          </button>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`rounded-lg border p-4 mb-6 ${
          message.includes('success') || message.includes('imported')
            ? 'bg-green-50 border-green-200 text-green-800' 
            : 'bg-blue-50 border-blue-200 text-blue-800'
        }`}>
          <p>{message}</p>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Import Assignments</h2>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                Paste JSON format with raterEmail, rateeEmail, and optional position fields
              </p>
              <textarea
                value={importData}
                onChange={(e) => setImportData(e.target.value)}
                disabled={importing}
                rows={8}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                placeholder={`[
  {
    "raterEmail": "rater@example.com",
    "rateeEmail": "ratee@example.com",
    "raterPosition": "Manager",
    "rateePosition": "Developer"
  }
]`}
              />
            </div>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowImportModal(false)}
                disabled={importing}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleImportAssignments}
                disabled={importing}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {importing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  'Import'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Progress */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">Progress</span>
          <span className="text-sm text-gray-600">
            {assignments.filter(a => a.isCompleted).length} / {assignments.length} completed
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{
              width: `${assignments.length > 0 ? (assignments.filter(a => a.isCompleted).length / assignments.length) * 100 : 0}%`,
            }}
          />
        </div>
      </div>

      {/* Assignments */}
      {assignments.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <p className="text-gray-600 mb-4">No assignments found for the current period.</p>
          <button
            onClick={() => setShowImportModal(true)}
            className="inline-flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Import Assignments
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {assignments.map(assignment => (
            <Accordion
              key={assignment.assignmentId}
              title={`${(assignment.raterFName || '').trim()} ${(assignment.raterSurname || '').trim()} → ${(assignment.rateeFName || '').trim()} ${(assignment.rateeSurname || '').trim()}`}
              subtitle={`${assignment.raterEmail} → ${assignment.rateeEmail}${assignment.raterPosition ? ` (${assignment.raterPosition} → ${assignment.rateePosition || 'N/A'})` : ''}`}
              isCompleted={assignment.isCompleted}
            >
              <div className="space-y-6">
                {categories.map(category => (
                  <div key={category.CategoryID}>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      {category.CategoryName}
                    </label>
                    <RatingScale
                      value={formData[assignment.assignmentId]?.ratings[category.CategoryID] || 0}
                      onChange={(value) =>
                        handleRatingChange(assignment.assignmentId, category.CategoryID, value)
                      }
                      disabled={submitting}
                    />
                  </div>
                ))}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Comments
                  </label>
                  <textarea
                    value={formData[assignment.assignmentId]?.comment || ''}
                    onChange={(e) =>
                      handleCommentChange(assignment.assignmentId, e.target.value)
                    }
                    disabled={submitting}
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Add any additional comments here..."
                  />
                </div>

                <button
                  onClick={() => submitSingleRating(assignment.assignmentId)}
                  disabled={submitting}
                  className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      Submit Rating
                    </>
                  )}
                </button>
              </div>
            </Accordion>
          ))}
        </div>
      )}
    </MainLayout>
  );
}

export default function ManagerPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    }>
      <ManagerContent />
    </Suspense>
  );
}
