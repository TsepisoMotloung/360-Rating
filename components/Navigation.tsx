'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { LogOut, Menu, X } from 'lucide-react';
import { useState } from 'react';

interface NavigationProps {
  userEmail?: string | null;
  userRole?: 'admin' | 'manager' | 'rater';
}

export default function Navigation({ userEmail, userRole }: NavigationProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const auth = searchParams.get('auth');

  const handleLogout = () => {
    router.push('/');
  };

  const roleColors = {
    admin: 'bg-red-600',
    manager: 'bg-purple-600',
    rater: 'bg-blue-600',
  };

  const roleLabel = {
    admin: 'Administrator',
    manager: 'Manager',
    rater: 'Rater',
  };

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo/Brand */}
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <h1 className="text-xl font-bold text-gray-900">360° Rating</h1>
            </div>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-6">
            {userRole && (
              <span className={`${roleColors[userRole] || 'bg-gray-600'} text-white px-4 py-1 rounded-full text-sm font-medium`}>
                {roleLabel[userRole]}
              </span>
            )}
            
            <div className="text-sm text-gray-600 truncate max-w-xs">
              {userEmail}
            </div>

            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:bg-gray-100"
            >
              {isMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {userRole && (
              <div className={`${roleColors[userRole] || 'bg-gray-600'} text-white px-3 py-2 rounded-md text-sm font-medium`}>
                {roleLabel[userRole]}
              </div>
            )}
            
            {userEmail && (
              <div className="text-sm text-gray-600 px-3 py-2 truncate">
                {userEmail}
              </div>
            )}

            <button
              onClick={handleLogout}
              className="w-full text-left px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-md text-sm font-medium inline-flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
