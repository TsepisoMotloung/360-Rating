'use client';

import { ReactNode } from 'react';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import Footer from './Footer';

interface MainLayoutProps {
  children: ReactNode;
  userEmail?: string | null;
  userRole?: 'admin' | 'manager' | 'rater';
  userAccess?: { isAdmin?: boolean; isManager?: boolean; hasRatings?: boolean } | null;
  auth?: string;
}

export default function MainLayout({ children, userEmail, userRole, userAccess, auth }: MainLayoutProps) {
  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Fixed navbar at top with 80px height */}
      <div className="fixed top-0 left-0 right-0 z-30">
        <Navbar userEmail={userEmail} userRole={userRole} userAccess={userAccess} auth={auth} />
      </div>

      {/* Content area with top padding for navbar and sidebar */}
      <div className="flex flex-1 pt-20">
        {/* Sidebar - fixed position on desktop, overlay on mobile */}
        <div className="hidden lg:block">
          <Sidebar userRole={userRole} userAccess={userAccess} auth={auth} />
        </div>

        {/* Main content */}
        <main className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </div>
        </main>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}
