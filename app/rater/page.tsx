'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Accordion from '@/components/Accordion';
import RatingScale from '@/components/RatingScale';
import MainLayout from '@/components/MainLayout';
import useUserAccess from '@/lib/useUserAccess';
import { THEME, alertClasses } from '@/lib/theme';
import { Loader2, Send } from 'lucide-react';
import { publish } from '@/lib/sync';

type TabType = 'admin' | 'manager' | 'archived';

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
  rateeUserId: string;
  rateeEmail: string;
  rateeFName?: string | null;
  rateeSurname?: string | null;
  rateePosition?: string | null;
  isCompleted: boolean;
  source?: string;
  dateCompleted: string | null;
  ratings: Rating[];
}

interface RatingFormData {
  [assignmentId: number]: {
    ratings: { [categoryId: number]: number };
    comment: string;
    source?: string; // 'admin' or 'manager'
  };
}

function RaterContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const auth = searchParams.get('auth');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('admin');
  const [period, setPeriod] = useState<any>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [adminAssignments, setAdminAssignments] = useState<Assignment[]>([]);
  const [managerAssignments, setManagerAssignments] = useState<Assignment[]>([]);
  const [archivedAssignments, setArchivedAssignments] = useState<Assignment[]>([]);
  const [formData, setFormData] = useState<RatingFormData>({});
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!auth) {
      router.push('/');
      return;
    }
    fetchAssignments();
  }, [auth, router]);

  const fetchAssignments = async () => {
    try {
      const response = await fetch(`/api/rater/assignments?auth=${encodeURIComponent(auth || '')}`);
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
      
      // Separate completed from incomplete
      const adminAll = data.adminAssignments || [];
      const managerAll = data.managerAssignments || [];
      
      const adminIncomplete = adminAll.filter((a: Assignment) => !a.isCompleted);
      const managerIncomplete = managerAll.filter((a: Assignment) => !a.isCompleted);
      const archived = [...adminAll, ...managerAll].filter((a: Assignment) => a.isCompleted);
      
      setAdminAssignments(adminIncomplete);
      setManagerAssignments(managerIncomplete);
      setArchivedAssignments(archived);

      // Initialize form data with existing ratings for all assignments
      const all = [...adminAll, ...managerAll];
      const initialFormData: RatingFormData = {};
      all.forEach((assignment: Assignment) => {
        const ratings: { [categoryId: number]: number } = {};
        assignment.ratings.forEach((rating: Rating) => {
          ratings[rating.CategoryID] = rating.RatingValue;
        });
        initialFormData[assignment.assignmentId] = {
          ratings,
          comment: assignment.ratings[0]?.Comment || '',
          source: assignment.source || 'admin', // Track source from backend
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

      const response = await fetch('/api/rater/rating', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auth: auth,
          assignmentId,
          ratings,
          comment: data.comment,
          source: data.source || 'admin',
        }),
      });

      if (response.ok) {
        setMessage('Rating submitted successfully!');
        // Auto-refresh immediately after successful submission
        setTimeout(() => {
          fetchAssignments();
          setMessage('');
          try { publish('responses-updated'); publish('assignments-updated'); } catch(e) {}
        }, 500);
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

  const submitAllRatings = async () => {
    // Only submit incomplete assignments
    const incompleteAssignments = [
      ...adminAssignments,
      ...managerAssignments,
    ];
    const unfinishedAssignments = incompleteAssignments.filter(a => {
      const data = formData[a.assignmentId];
      return !data || Object.keys(data.ratings).length !== categories.length;
    });

    if (unfinishedAssignments.length > 0) {
      setMessage(`Please complete all ${unfinishedAssignments.length} remaining ratings`);
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    setSubmitting(true);
    try {
      const submissions = incompleteAssignments.map(assignment => ({
        assignmentId: assignment.assignmentId,
        ratings: Object.entries(formData[assignment.assignmentId].ratings).map(
          ([categoryId, value]) => ({
            categoryId: parseInt(categoryId),
            value,
          })
        ),
        comment: formData[assignment.assignmentId].comment,
        source: formData[assignment.assignmentId].source || 'admin',
      }));

      const response = await fetch('/api/rater/submit-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auth: auth, submissions }),
      });

      if (response.ok) {
        setMessage('All ratings submitted successfully!');
        // Auto-refresh immediately after successful submission
        setTimeout(() => {
          fetchAssignments();
          setMessage('');
          try { publish('responses-updated'); publish('assignments-updated'); } catch(e) {}
        }, 500);
      } else {
        throw new Error('Failed to submit all ratings');
      }
    } catch (error) {
      console.error('Error submitting all ratings:', error);
      setMessage('Failed to submit all ratings');
      setTimeout(() => setMessage(''), 3000);
    } finally {
      setSubmitting(false);
    }
  };

  const { userAccess: access, userEmail: accessEmail, loading: accessLoading } = useUserAccess();

  if (loading || accessLoading) {
    return (
      <MainLayout userEmail={accessEmail} userRole="rater" userAccess={access} auth={auth || ''}>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </MainLayout>
    );
  }

  // Helper to render a section
  const renderAssignments = (assignments: Assignment[]) => (
    <>
      {assignments.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center text-gray-500">
          No assignments in this section.
        </div>
      ) : (
        <div className="space-y-4">
          {assignments.map(assignment => (
            <Accordion
              key={assignment.assignmentId}
              title={`${(assignment.rateeFName || '').trim()} ${(assignment.rateeSurname || '').trim()} (${assignment.rateeEmail})`}
              subtitle={assignment.rateePosition ? `Position: ${assignment.rateePosition}` : undefined}
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
    </>
  );

  const renderSection = (title: string, assignments: Assignment[]) => (
    <div className="mb-10">
      <h2 className="text-xl font-bold text-gray-800 mb-4">{title}</h2>
      {assignments.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center text-gray-500">
          No assignments in this section.
        </div>
      ) : (
        <div className="space-y-4">
          {assignments.map(assignment => (
            <Accordion
              key={assignment.assignmentId}
              title={`${(assignment.rateeFName || '').trim()} ${(assignment.rateeSurname || '').trim()} (${assignment.rateeEmail})`}
              subtitle={assignment.rateePosition ? `Position: ${assignment.rateePosition}` : undefined}
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
                      disabled={submitting || assignment.isCompleted}
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
                    disabled={submitting || assignment.isCompleted}
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Add any additional comments here..."
                  />
                </div>

                {!assignment.isCompleted && (
                  <button
                    onClick={() => submitSingleRating(assignment.assignmentId)}
                    disabled={submitting}
                    className={`w-full ${THEME.primary.bg} ${THEME.primary.bgHover} text-white py-3 px-6 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
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
                )}
                {assignment.isCompleted && (
                  <div className="text-green-700 font-semibold">Archived (Completed)</div>
                )}
              </div>
            </Accordion>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <MainLayout userEmail={accessEmail} userRole="rater" userAccess={access} auth={auth || ''}>
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">360° Rating System</h1>
        {period && (
          <p className="text-gray-600">
            Rating Period: <span className="font-medium">{period.name}</span>
          </p>
        )}
      </div>

      {/* Message */}
      {message && (
        <div className={`rounded-lg border p-4 mb-6 ${
          message.includes('success') 
            ? alertClasses.success
            : alertClasses.info
        }`}>
          <p>{message}</p>
        </div>
      )}

      {/* Progress */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">Progress</span>
          <span className="text-sm text-gray-600">
            {archivedAssignments.length} / {adminAssignments.length + managerAssignments.length + archivedAssignments.length} completed
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`${THEME.primary.bg} h-2 rounded-full transition-all duration-300`}
            style={{
              width: `${(adminAssignments.length + managerAssignments.length + archivedAssignments.length) > 0 ? (archivedAssignments.length / (adminAssignments.length + managerAssignments.length + archivedAssignments.length)) * 100 : 0}%`,
            }}
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm mb-6">
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('admin')}
            className={`flex-1 px-6 py-3 font-medium transition-colors ${
              activeTab === 'admin'
                ? `border-b-2 ${THEME.primary.border} ${THEME.primary.text}`
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Admin Assigned ({adminAssignments.length})
          </button>
          <button
            onClick={() => setActiveTab('manager')}
            className={`flex-1 px-6 py-3 font-medium transition-colors ${
              activeTab === 'manager'
                ? `border-b-2 ${THEME.primary.border} ${THEME.primary.text}`
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Manager Assigned ({managerAssignments.length})
          </button>
          <button
            onClick={() => setActiveTab('archived')}
            className={`flex-1 px-6 py-3 font-medium transition-colors ${
              activeTab === 'archived'
                ? `border-b-2 ${THEME.primary.border} ${THEME.primary.text}`
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Archived ({archivedAssignments.length})
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'admin' && renderAssignments(adminAssignments)}
          {activeTab === 'manager' && renderAssignments(managerAssignments)}
          {activeTab === 'archived' && renderAssignments(archivedAssignments)}
        </div>
      </div>

      {/* Submit All Button - Only show if there are incomplete assignments */}
      {(adminAssignments.length + managerAssignments.length) > 0 && (
        <div className="mt-8 bg-white rounded-lg shadow-sm p-6">
          <button
            onClick={submitAllRatings}
            disabled={submitting}
            className={`w-full ${THEME.success.bg} ${THEME.success.bgHover} text-white py-4 px-6 rounded-lg font-medium text-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
          >
            {submitting ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                Submitting All...
              </>
            ) : (
              <>
                <Send className="w-6 h-6" />
                Submit All Ratings
              </>
            )}
          </button>
        </div>
      )}
    </MainLayout>
  );
}

export default function RaterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    }>
      <RaterContent />
    </Suspense>
  );
}
