'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { User, Home } from 'lucide-react';

interface UserAccess {
  isAdmin?: boolean;
  isManager?: boolean;
  hasRatings?: boolean;
}

interface NavbarProps {
  userEmail?: string | null;
  userRole?: 'admin' | 'manager' | 'rater';
  userAccess?: UserAccess | null;
  auth?: string;
}

export default function Navbar({ userEmail, userRole, userAccess, auth }: NavbarProps) {
  const router = useRouter();

  const handleHome = () => {
    router.push(auth ? `/?auth=${encodeURIComponent(auth)}` : '/');
  };

  const getRoleBadgeColor = (role?: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-600 text-white';
      case 'manager':
        return 'bg-red-500 text-white';
      case 'rater':
        return 'bg-red-400 text-white';
      default:
        return 'bg-gray-600 text-white';
    }
  };

  // derive roles array: prefer explicit userAccess, fallback to single userRole
  const roles: Array<'admin' | 'manager' | 'rater'> = [];
  if (userAccess) {
    if (userAccess.isAdmin) roles.push('admin');
    if (userAccess.isManager) roles.push('manager');
    if (userAccess.hasRatings) roles.push('rater');
  } else if (userRole) {
    roles.push(userRole);
  }

  return (
    <nav className="fixed top-0 left-0 right-0 h-20 bg-gradient-to-r from-red-600 to-red-700 shadow-lg z-30 flex items-center justify-between px-6 lg:px-8">
      <div className="flex items-center gap-4">
        <button
          onClick={handleHome}
          className="w-12 h-12 bg-white rounded-lg flex items-center justify-center shadow-md hover:shadow-lg hover:scale-105 transition-all"
          title="Home"
        >
          <Home size={24} className="text-red-600" />
        </button>
        <h1 className="text-2xl font-bold text-white hidden sm:inline">Rating System</h1>
      </div>

      <div className="flex items-center gap-4">
        {roles.map((r) => (
          <span
            key={r}
            className={`${getRoleBadgeColor(r)} px-3 py-1.5 rounded-full text-xs font-semibold capitalize shadow-md`}
          >
            {r === 'admin' ? 'Admin' : r === 'manager' ? 'Manager' : 'Rater'}
          </span>
        ))}

        {userEmail && (
          <div className="flex items-center gap-2 text-white">
            <User size={18} />
            <span className="hidden md:inline text-sm font-medium">{userEmail}</span>
          </div>
        )}
      </div>
    </nav>
  );
}
