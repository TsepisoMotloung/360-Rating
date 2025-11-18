'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { extractAuthParams, buildAuthToken } from '@/lib/params';
import Accordion from '@/components/Accordion';
import RatingScale from '@/components/RatingScale';
import { Loader2, Send } from 'lucide-react';

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

function RaterContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { uid, email } = extractAuthParams(searchParams as any);
  const auth = uid && email ? buildAuthToken(uid, email) : null;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [period, setPeriod] = useState<any>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [formData, setFormData] = useState<RatingFormData>({});
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!uid || !email) {
      router.push('/error-invalid-request');
      return;
    }
    fetchAssignments();
  }, [uid, email]);

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

      const response = await fetch('/api/rater/rating', {
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

  const submitAllRatings = async () => {
    const incompleteAssignments = assignments.filter(a => {
      const data = formData[a.assignmentId];
      return !data || Object.keys(data.ratings).length !== categories.length;
    });

    if (incompleteAssignments.length > 0) {
      setMessage(`Please complete all ${incompleteAssignments.length} remaining ratings`);
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    setSubmitting(true);
    try {
      const submissions = assignments.map(assignment => ({
        assignmentId: assignment.assignmentId,
        ratings: Object.entries(formData[assignment.assignmentId].ratings).map(
          ([categoryId, value]) => ({
            categoryId: parseInt(categoryId),
            value,
          })
        ),
        comment: formData[assignment.assignmentId].comment,
      }));

      const response = await fetch('/api/rater/submit-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auth: auth, submissions }),
      });

      if (response.ok) {
        setMessage('All ratings submitted successfully!');
        setTimeout(() => setMessage(''), 3000);
        await fetchAssignments();
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">360° Rating System</h1>
          {period && (
            <p className="text-gray-600">
              Rating Period: <span className="font-medium">{period.name}</span>
            </p>
          )}
          <p className="text-sm text-gray-500 mt-1">Logged in</p>
        </div>

        {/* Message */}
        {message && (
          <div className={`rounded-lg border p-4 mb-6 ${
            message.includes('success') 
              ? 'bg-green-50 border-green-200 text-green-800' 
              : 'bg-blue-50 border-blue-200 text-blue-800'
          }`}>
            <p>{message}</p>
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
              className="bg-primary-600 h-2 rounded-full transition-all duration-300"
              style={{
                width: `${assignments.length > 0 ? (assignments.filter(a => a.isCompleted).length / assignments.length) * 100 : 0}%`,
              }}
            />
          </div>
        </div>

        {/* Assignments */}
        {assignments.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <p className="text-gray-600">No assignments found for the current period.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {assignments.map(assignment => (
              <Accordion
                key={assignment.assignmentId}
                title={`${(assignment.rateeFName || '').trim()} ${(assignment.rateeSurname || '').trim()} (${assignment.rateeEmail})`}
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
                      Comments (Optional)
                    </label>
                    <textarea
                      value={formData[assignment.assignmentId]?.comment || ''}
                      onChange={(e) =>
                        handleCommentChange(assignment.assignmentId, e.target.value)
                      }
                      disabled={submitting}
                      rows={4}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="Add any additional comments here..."
                    />
                  </div>

                  <button
                    onClick={() => submitSingleRating(assignment.assignmentId)}
                    disabled={submitting}
                    className="w-full bg-primary-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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

        {/* Submit All Button */}
        {assignments.length > 0 && (
          <div className="mt-8 bg-white rounded-lg shadow-sm p-6">
            <button
              onClick={submitAllRatings}
              disabled={submitting}
              className="w-full bg-green-600 text-white py-4 px-6 rounded-lg font-medium text-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
      </div>
    </div>
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
