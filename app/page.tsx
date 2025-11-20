'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
// Use server-side API route for validation to avoid Server Actions header restrictions
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { CheckCircle, Users, BarChart3, ArrowRight } from 'lucide-react';

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const auth = searchParams.get('auth');

  const [userAccess, setUserAccess] = useState<{ isAdmin: boolean; isManager: boolean; hasRatings: boolean } | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<'admin' | 'manager' | 'rater' | null>(null);
  const [userId, setUserId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      if (!auth) {
        setLoading(false);
        return;
      }

      try {
        // Decode auth token: base64(uid:email)
        const decoded = Buffer.from(auth, 'base64').toString('utf-8');
        const [uid, email] = decoded.split(':');

        if (!uid || !email) {
          setLoading(false);
          return;
        }

        setUserId(parseInt(uid, 10));

        // Validate user and check their role via server API route
        let validation: any = { isValid: false };
        try {
          const res = await fetch(`/api/auth/validate?auth=${encodeURIComponent(auth)}`);
          if (res.ok) validation = await res.json();
          else console.warn('Auth validation API responded with', res.status);
        } catch (err) {
          console.error('Failed to call auth validation API', err);
        }

        if (!validation || !validation.isValid) {
          setLoading(false);
          return;
        }

        setUserEmail(email);

        const isAdmin = validation.isAdmin || false;
        const isManager = validation.isManager || false;

        // Check if user has rater assignments
        const hasRatings = !isAdmin && !isManager; // Show rater button if not admin or manager

        const access = {
          isAdmin,
          isManager,
          hasRatings,
        };

        setUserAccess(access);
        // Default to first available role, but let user select
        setSelectedRole(isAdmin ? 'admin' : isManager ? 'manager' : hasRatings ? 'rater' : null);
      } catch (err) {
        console.error('Auth error:', err);
      } finally {
        setLoading(false);
      }
    }

    checkAuth();
  }, [auth]);

  const getAuthUrl = (path: string) => {
    return auth ? `${path}?auth=${encodeURIComponent(auth)}` : path;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Navbar userEmail={userEmail} userRole={selectedRole || undefined} auth={auth || ''} />
      <div className="flex-1 pt-20">
        <div className="min-h-screen bg-gradient-to-br from-white via-red-50 to-white">
          {/* Hero Section */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
            <div className="text-center mb-16">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-red-500 to-red-600 rounded-xl mb-6 shadow-lg">
                <span className="text-white font-bold text-4xl">360</span>
              </div>
              <h1 className="text-5xl md:text-6xl font-black text-gray-900 mb-4 bg-gradient-to-r from-red-600 to-red-700 bg-clip-text text-transparent">
                360-Degree Rating System
              </h1>
              <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
                Comprehensive employee feedback and performance evaluation platform for data-driven organizational decisions.
              </p>

              {/* Role Selection */}
              {userEmail && userAccess && (
                <div className="flex flex-col gap-8 mb-12">
                  {/* Role Pills - Select which role to use */}
                  <div className="flex flex-wrap justify-center gap-3">
                    {userAccess.isAdmin && (
                      <button
                        onClick={() => setSelectedRole('admin')}
                        className={`px-6 py-3 rounded-full font-semibold transition-all ${
                          selectedRole === 'admin'
                            ? 'bg-red-600 text-white shadow-lg shadow-red-200'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        Admin
                      </button>
                    )}
                    {userAccess.isManager && (
                      <button
                        onClick={() => setSelectedRole('manager')}
                        className={`px-6 py-3 rounded-full font-semibold transition-all ${
                          selectedRole === 'manager'
                            ? 'bg-red-600 text-white shadow-lg shadow-red-200'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        Manager
                      </button>
                    )}
                    {userAccess.hasRatings && (
                      <button
                        onClick={() => setSelectedRole('rater')}
                        className={`px-6 py-3 rounded-full font-semibold transition-all ${
                          selectedRole === 'rater'
                            ? 'bg-red-600 text-white shadow-lg shadow-red-200'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        Rater
                      </button>
                    )}
                  </div>

                  {/* Action Buttons based on selected role */}
                  {selectedRole && (
                    <button
                      onClick={() =>
                        router.push(getAuthUrl(`/${selectedRole === 'admin' ? 'admin' : selectedRole === 'manager' ? 'manager' : 'rater'}`))
                      }
                      className="mx-auto flex items-center justify-center space-x-2 px-8 py-4 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl hover:shadow-lg hover:shadow-red-200 transition-all font-bold text-lg shadow-md"
                    >
                      <span>
                        {selectedRole === 'admin'
                          ? 'Go to Admin Dashboard'
                          : selectedRole === 'manager'
                          ? 'Go to Manager Portal'
                          : 'Start Rating'}
                      </span>
                      <ArrowRight size={24} />
                    </button>
                  )}
                </div>
              )}

              {!userEmail && (
                <div className="text-center text-gray-600 mb-8 bg-blue-50 border-2 border-blue-200 rounded-xl p-6 inline-block">
                  <p className="text-lg font-semibold">Please log in to access the rating system</p>
                </div>
              )}
            </div>

            {/* Features Section */}
            <div className="grid md:grid-cols-3 gap-8 mb-16">
              <div className="bg-white p-8 rounded-xl shadow-md hover:shadow-2xl transition-all border-t-4 border-red-500">
                <div className="flex items-center justify-center w-14 h-14 bg-red-100 rounded-lg mb-4 shadow-sm">
                  <Users className="text-red-600" size={28} />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Multi-Role System</h3>
                <p className="text-gray-600">
                  Support for administrators, managers, and raters with role-specific permissions and workflows.
                </p>
              </div>

              <div className="bg-white p-8 rounded-xl shadow-md hover:shadow-2xl transition-all border-t-4 border-red-500">
                <div className="flex items-center justify-center w-14 h-14 bg-red-100 rounded-lg mb-4 shadow-sm">
                  <CheckCircle className="text-red-600" size={28} />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Easy Assignments</h3>
                <p className="text-gray-600">
                  Managers can quickly create and manage rating assignments with position tracking and CSV import.
                </p>
              </div>

              <div className="bg-white p-8 rounded-xl shadow-md hover:shadow-2xl transition-all border-t-4 border-red-500">
                <div className="flex items-center justify-center w-14 h-14 bg-red-100 rounded-lg mb-4 shadow-sm">
                  <BarChart3 className="text-red-600" size={28} />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Detailed Reports</h3>
                <p className="text-gray-600">
                  Comprehensive analytics and visualizations to track feedback and identify trends.
                </p>
              </div>
            </div>

            {/* Info Section */}
            {userEmail && (
              <div className="bg-gradient-to-r from-red-50 to-white border-2 border-red-200 rounded-xl p-8 text-center shadow-md">
                <p className="text-gray-700 font-semibold text-lg">
                  <span className="text-red-600">Welcome back!</span> Logged in as: <span className="text-red-600 font-bold">{userEmail}</span>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}
