'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Loader2, Users, CheckCircle, Clock, TrendingUp } from 'lucide-react';
import { extractAuthParams, buildAuthToken } from '@/lib/params';

function AdminContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { uid, email } = extractAuthParams(searchParams as any);
  const auth = uid && email ? buildAuthToken(uid, email) : null;

  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [categoryAverages, setCategoryAverages] = useState<any[]>([]);
  const [topRated, setTopRated] = useState<any[]>([]);
  const [bottomRated, setBottomRated] = useState<any[]>([]);
  const [progressOverTime, setProgressOverTime] = useState<any[]>([]);

  useEffect(() => {
    if (!uid || !email) {
      router.push('/error-invalid-request');
      return;
    }
    fetchDashboardData();
  }, [uid, email]);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch(`/api/admin/dashboard?auth=${encodeURIComponent(auth || '')}`);
      if (!response.ok) {
        if (response.status === 401) {
          router.push('/error-access-denied');
          return;
        }
        throw new Error('Failed to fetch dashboard data');
      }

      const data = await response.json();
      setPeriod(data.period);
      setStats(data.stats);
      setCategoryAverages(data.categoryAverages);
      setTopRated(data.topRated);
      setBottomRated(data.bottomRated);
      setProgressOverTime(data.progressOverTime);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <p className="text-gray-600">No active rating period found.</p>
          </div>
        </div>
      </div>
    );
  }

  const completionRate = stats.totalAssignments > 0
    ? ((stats.completedAssignments / stats.totalAssignments) * 100).toFixed(1)
    : 0;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
              {period && (
                <p className="text-gray-600">
                  Rating Period: <span className="font-medium">{period.PeriodName}</span>
                </p>
              )}
              <p className="text-sm text-gray-500 mt-1">Logged in</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => router.push(`/admin/assignments?auth=${encodeURIComponent(auth || '')}`)}
                className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                Manage Assignments
              </button>
              <button
                onClick={() => router.push(`/admin/import?auth=${encodeURIComponent(auth || '')}`)}
                className="px-6 py-2 bg-red-100 text-black rounded-lg hover:bg-secondary-700 transition-colors"
              >
                Import Assignments
              </button>
              <button
                onClick={() => router.push(`/admin/reports?auth=${encodeURIComponent(auth || '')}`)}
                className="px-6 py-2 bg-white text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
              >
                Generate Reports
              </button>
              <button
                onClick={() => router.push(`/admin/admins?auth=${encodeURIComponent(auth || '')}`)}
                className="px-6 py-2 bg-white text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Manage Admins
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Raters</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalRaters}</p>
              </div>
              <Users className="w-12 h-12 text-blue-500 opacity-20" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Assignments</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalAssignments}</p>
              </div>
              <TrendingUp className="w-12 h-12 text-purple-500 opacity-20" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Completed</p>
                <p className="text-3xl font-bold text-green-600">{stats.completedAssignments}</p>
              </div>
              <CheckCircle className="w-12 h-12 text-green-500 opacity-20" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Completion Rate</p>
                <p className="text-3xl font-bold text-primary-600">{completionRate}%</p>
              </div>
              <Clock className="w-12 h-12 text-primary-500 opacity-20" />
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Category Averages */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Average Scores by Category</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={categoryAverages}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="CategoryName" angle={-45} textAnchor="end" height={80} />
                <YAxis domain={[0, 5]} />
                <Tooltip />
                <Bar dataKey="AverageScore" fill="#dc2626" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Progress Over Time */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Completion Progress</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={progressOverTime}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="CompletionDate" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="CompletedCount" stroke="#dc2626" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tables Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Rated */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Top Rated Employees</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Email</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">Avg Score</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">Ratings</th>
                  </tr>
                </thead>
                <tbody>
                  {topRated.map((item, idx) => (
                    <tr key={idx} className="border-b border-gray-100">
                      <td className="py-3 px-4 text-sm text-gray-900">{item.RateeEmail}</td>
                      <td className="py-3 px-4 text-sm text-right font-medium text-green-600">
                        {/* {item.AverageScore.toFixed(2)} */}
                        {Number(item?.AverageScore ?? 0).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-sm text-right text-gray-600">{item.RatingCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bottom Rated */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Needs Improvement</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Email</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">Avg Score</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">Ratings</th>
                  </tr>
                </thead>
                <tbody>
                  {bottomRated.map((item, idx) => (
                    <tr key={idx} className="border-b border-gray-100">
                      <td className="py-3 px-4 text-sm text-gray-900">{item.RateeEmail}</td>
                      <td className="py-3 px-4 text-sm text-right font-medium text-amber-600">
                        {/* {item.AverageScore.toFixed(2)} */}
                        {Number(item?.AverageScore ?? 0).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-sm text-right text-gray-600">{item.RatingCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    }>
      <AdminContent />
    </Suspense>
  );
}
