'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import {
  CheckCircle,
  Users,
  BarChart3,
  ArrowRight,
  LogIn,
  Shield,
  Zap,
  Target,
  Award
} from 'lucide-react';

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
        const decoded = Buffer.from(auth, 'base64').toString('utf-8');
        const [uid, email] = decoded.split(':');

        if (!uid || !email) {
          setLoading(false);
          return;
        }

        setUserId(parseInt(uid, 10));

        let validation: any = { isValid: false };
        try {
          const res = await fetch(`/api/auth/validate?auth=${encodeURIComponent(auth)}`);
          if (res.ok) validation = await res.json();
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
        const hasRatings = true;

        setUserAccess({ isAdmin, isManager, hasRatings });
        setSelectedRole(isAdmin ? 'admin' : isManager ? 'manager' : 'rater');
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
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-14 w-14 border-4 border-gray-200 border-t-red-600 mx-auto"></div>
          <p className="text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Navbar userEmail={userEmail} userRole={selectedRole || undefined} auth={auth || ''} />

      <div className="pt-20">
        <div className="min-h-screen bg-white">
          <div className="max-w-6xl mx-auto px-4 py-16">

            {/* HERO */}
            <div className="text-center mb-16">
              <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 leading-tight mb-4">
                <span className="text-red-600">360-Degree</span> Rating System
              </h1>

              <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto">
                A powerful employee performance evaluation platform designed for modern organizations.
              </p>
            </div>

            {/* AUTH AREA */}
            {userEmail && userAccess ? (
              <div className="max-w-xl mx-auto bg-gray-50 border border-gray-200 rounded-xl p-8 shadow-sm">
                
                {/* TOP TEXT */}
                <h3 className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto text-center">
                  Choose how you want to continue
                </h3>

                <div className="h-8" />
                {/* ROLE BUTTONS */}
                <div className="flex flex-wrap gap-4 justify-center mb-10">

                  {userAccess.isAdmin && (
                    <button
                      onClick={() => setSelectedRole('admin')}
                      className={`px-6 py-3 rounded-xl border text-lg font-medium flex items-center gap-2
                        ${selectedRole === 'admin'
                        ? 'bg-red-600 text-white border-red-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-red-600'}
                      `}
                    >
                      <Shield size={22} />
                      Admin
                    </button>
                  )}

                  {userAccess.isManager && (
                    <button
                      onClick={() => setSelectedRole('manager')}
                      className={`px-6 py-3 rounded-xl border text-lg font-medium flex items-center gap-2
                        ${selectedRole === 'manager'
                        ? 'bg-red-600 text-white border-red-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-red-600'}
                      `}
                    >
                      <Target size={22} />
                      Manager
                    </button>
                  )}

                  {userAccess.hasRatings && (
                    <button
                      onClick={() => setSelectedRole('rater')}
                      className={`px-6 py-3 rounded-xl border text-lg font-medium flex items-center gap-2
                        ${selectedRole === 'rater'
                        ? 'bg-red-600 text-white border-red-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-red-600'}
                      `}
                    >
                      <CheckCircle size={22} />
                      Rater
                    </button>
                  )}
                </div>

                {/* ENTER BUTTON */}
                <button
                  onClick={() =>
                    router.push(
                      getAuthUrl(
                        selectedRole === 'admin'
                          ? '/admin'
                          : selectedRole === 'manager'
                          ? '/manager'
                          : '/rater'
                      )
                    )
                  }
                  className="w-full py-4 bg-red-600 hover:bg-red-700 text-white text-lg rounded-xl shadow-md inline-flex items-center justify-center gap-3 transition"
                >
                  {selectedRole === 'admin' && (
                    <>
                      <Shield size={22} />
                      Enter Admin Dashboard
                    </>
                  )}

                  {selectedRole === 'manager' && (
                    <>
                      <Target size={22} />
                      Enter Manager Portal
                    </>
                  )}

                  {selectedRole === 'rater' && (
                    <>
                      <CheckCircle size={22} />
                      Start Your Ratings
                    </>
                  )}

                  <ArrowRight size={22} />
                </button>
              </div>
            ) : (
              /* LOGIN CTA */
              <div className="max-w-md mx-auto bg-white shadow-lg border border-gray-200 p-8 rounded-xl text-center">
                <div className="mx-auto w-14 h-14 rounded-xl bg-red-600 flex items-center justify-center mb-4">
                  <LogIn size={30} className="text-white" />
                </div>

                <h3 className="text-2xl font-bold text-gray-900 mb-2">Sign In</h3>
                <p className="text-gray-600 mb-6">
                  Access your dashboard to begin your evaluations.
                </p>

                <button
                  onClick={() => router.push('/login')}
                  className="w-full py-4 bg-red-600 hover:bg-red-700 text-white rounded-xl text-lg font-medium inline-flex items-center justify-center gap-3 shadow-md"
                >
                  <LogIn size={22} />
                  Continue
                </button>
              </div>
            )}

            {/* FEATURES */}
            <div className="grid md:grid-cols-3 gap-8 mt-20">
              <div className="p-8 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition">
                <Users size={36} className="text-red-600 mb-4" />
                <h3 className="text-xl font-bold mb-2 text-gray-900">Multi-Role System</h3>
                <p className="text-gray-600">
                  Manage administrators, managers, and raters with structured permission control.
                </p>
              </div>

              <div className="p-8 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition">
                <Zap size={36} className="text-red-600 mb-4" />
                <h3 className="text-xl font-bold mb-2 text-gray-900">Smart Assignments</h3>
                <p className="text-gray-600">
                  Create, track, and automate rating assignments effortlessly.
                </p>
              </div>

              <div className="p-8 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition">
                <BarChart3 size={36} className="text-red-600 mb-4" />
                <h3 className="text-xl font-bold mb-2 text-gray-900">Analytics & Insights</h3>
                <p className="text-gray-600">
                  Visual dashboards with real-time evaluation insights.
                </p>
              </div>
            </div>

          </div>
        </div>
      </div>

      <Footer />
    </>
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200 border-t-red-600" />
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}
