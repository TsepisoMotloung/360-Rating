'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Loader2, Users, CheckCircle, Clock, TrendingUp } from 'lucide-react';
import MainLayout from '@/components/MainLayout';
import useUserAccess from '@/lib/useUserAccess';
import { THEME } from '@/lib/theme';
import { subscribe } from '@/lib/sync';

function ManagerDashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const auth = searchParams.get('auth');

  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [categoryAverages, setCategoryAverages] = useState<any[]>([]);
  const [topRated, setTopRated] = useState<any[]>([]);
  const [bottomRated, setBottomRated] = useState<any[]>([]);
  const [progressOverTime, setProgressOverTime] = useState<any[]>([]);

  useEffect(() => {
    if (!auth) {
      router.push('/');
      return;
    }
    fetchDashboardData();

    const unsub = subscribe((ev) => {
      if (ev === 'assignments-updated' || ev === 'responses-updated') {
        fetchDashboardData();
      }
    });
    return () => unsub();
  }, [auth]);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch(`/api/manager/dashboard?auth=${encodeURIComponent(auth || '')}`);
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

  const { userAccess: access, userEmail: accessEmail } = useUserAccess();

  if (loading) {
    return (
      <MainLayout userEmail={accessEmail} userRole="manager" userAccess={access} auth={auth || ''}>
        <div className="flex items-center justify-center py-12">
          <Loader2 className={`w-8 h-8 animate-spin ${THEME.primary.text}`} />
        </div>
      </MainLayout>
    );
  }

  if (!stats) {
    return (
      <MainLayout userEmail={accessEmail} userRole="manager" userAccess={access} auth={auth || ''}>
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <p className="text-gray-600">No active rating period found.</p>
        </div>
      </MainLayout>
    );
  }

  const completionRate = stats.totalAssignments > 0
    ? ((stats.completedAssignments / stats.totalAssignments) * 100).toFixed(1)
    : 0;

  return (
    <MainLayout userEmail={accessEmail} userRole="manager" userAccess={access} auth={auth || ''}>
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Manager Dashboard</h1>
            {period && (
              <p className="text-gray-600">
                Rating Period: <span className="font-medium">{period.PeriodName}</span>
              </p>
            )}
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
              <p className="text-3xl font-bold text-blue-600">{completionRate}%</p>
            </div>
            <Clock className="w-12 h-12 text-blue-500 opacity-20" />
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
              <XAxis dataKey="CategoryName" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="AverageScore" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Progress Over Time */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Completion Progress</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={progressOverTime}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="CompletionDate"
                tickFormatter={(date) => {
                  if (!date) return '';
                  // Try to format as YYYY-MM-DD
                  const d = new Date(date);
                  if (!isNaN(d.getTime())) {
                    return d.toISOString().slice(0, 10);
                  }
                  // fallback: just show as string
                  return String(date).slice(0, 10);
                }}
              />
              <YAxis />
              <Tooltip labelFormatter={(date) => {
                if (!date) return '';
                const d = new Date(date);
                if (!isNaN(d.getTime())) {
                  return d.toISOString().slice(0, 10);
                }
                return String(date).slice(0, 10);
              }} />
              <Line type="monotone" dataKey="CompletedCount" stroke="#10b981" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top and Bottom Rated */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Rated */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Top Rated Individuals</h2>
          <div className="space-y-3">
            {topRated.length === 0 ? (
              <p className="text-gray-500">No ratings yet</p>
            ) : (
              topRated.map((person, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{person.rateeEmail}</p>
                    <p className="text-xs text-gray-600">{Number(person.RatingCount)} ratings</p>
                  </div>
                  <p className="text-lg font-bold text-green-600">{parseFloat(person.AverageScore).toFixed(2)}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Bottom Rated */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Needs Improvement</h2>
          <div className="space-y-3">
            {bottomRated.length === 0 ? (
              <p className="text-gray-500">No ratings yet</p>
            ) : (
              bottomRated.map((person, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{person.rateeEmail}</p>
                    <p className="text-xs text-gray-600">{Number(person.RatingCount)} ratings</p>
                  </div>
                  <p className="text-lg font-bold text-red-600">{parseFloat(person.AverageScore).toFixed(2)}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

export default function ManagerDashboard() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-white">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      }
    >
      <ManagerDashboardContent />
    </Suspense>
  );
}
