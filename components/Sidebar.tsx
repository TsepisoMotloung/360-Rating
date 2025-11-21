'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, BarChart3, Settings, Menu, X, FileText, CheckSquare, ChevronDown } from 'lucide-react';
import { useState } from 'react';

interface UserAccess {
  isAdmin?: boolean;
  isManager?: boolean;
  hasRatings?: boolean;
}

interface SidebarProps {
  userRole?: 'admin' | 'manager' | 'rater';
  userAccess?: UserAccess | null;
  auth?: string;
}

export default function Sidebar({ userRole, userAccess, auth }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();

  const getHref = (path: string) => {
    if (!auth) return path;
    return `${path}?auth=${encodeURIComponent(auth)}`;
  };

  const menuItems = {
    admin: [
      { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
      { label: 'Assignments', href: '/admin/assignments', icon: BarChart3 },
      { label: 'Managers', href: '/admin/managers', icon: Users },
      { label: 'Reports', href: '/admin/reports', icon: BarChart3 },
      { label: 'Import', href: '/admin/import', icon: FileText },
      { label: 'Admins', href: '/admin/admins', icon: Settings },
    ],
    manager: [
      { label: 'Dashboard', href: '/manager', icon: LayoutDashboard },
      { label: 'Assignments', href: '/manager/assignments', icon: CheckSquare },
      { label: 'Reports', href: '/manager/reports', icon: BarChart3 },
    ],
    rater: [
      { label: 'My Ratings', href: '/rater', icon: CheckSquare },
      
    ],
  };

  // Determine items based on an explicitly selected `userRole` (preferred)
  // If no explicit role is provided, fall back to merging available roles from `userAccess`.
  let items: { label: string; href: string; icon: any }[] = [];
  if (userRole) {
    items = menuItems[userRole] || [];
  } else if (userAccess) {
    const toAdd: { label: string; href: string; icon: any }[] = [];
    if (userAccess.isAdmin) toAdd.push(...menuItems.admin);
    if (userAccess.isManager) toAdd.push(...menuItems.manager);
    if (userAccess.hasRatings) toAdd.push(...menuItems.rater);

    // dedupe by href
    const seen = new Set<string>();
    items = toAdd.filter((it) => {
      if (seen.has(it.href)) return false;
      seen.add(it.href);
      return true;
    });
  } else {
    items = [];
  }

  const isActive = (href: string) => {
    const pathWithoutParams = href.split('?')[0];
    // Only exact match or root path for dashboard
    if (pathWithoutParams === '/manager' && pathname === '/manager') return true;
    if (pathWithoutParams === '/admin' && pathname === '/admin') return true;
    return pathname === pathWithoutParams || pathname.startsWith(pathWithoutParams + '/') && pathWithoutParams !== '/manager' && pathWithoutParams !== '/admin';
  };

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed bottom-6 right-6 z-50 bg-red-600 text-white p-3 rounded-full shadow-lg hover:bg-red-700 transition-colors"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar */}
      <aside
        className={`${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 fixed lg:static top-0 left-0 h-screen ${
          isCollapsed ? 'w-20' : 'w-64'
        } bg-gradient-to-b from-gray-50 to-gray-100 border-r-2 border-red-200 transition-all duration-300 ease-in-out z-40 pt-24 lg:pt-0 shadow-lg`}
      >
        {/* Collapse Button - Desktop Only */}
        <div className="hidden lg:flex justify-end p-4 border-b border-red-200">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 hover:bg-red-100 rounded-lg transition-colors text-red-600"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <ChevronDown className={`w-5 h-5 transition-transform ${isCollapsed ? 'rotate-90' : '-rotate-90'}`} />
          </button>
        </div>

        <nav className="p-4 space-y-2">
          {items.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={getHref(item.href)}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                  active
                    ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-md'
                    : 'text-gray-700 hover:bg-red-50 hover:text-red-600'
                } ${isCollapsed ? 'justify-center' : ''}`}
                title={isCollapsed ? item.label : undefined}
              >
                <Icon size={20} className="flex-shrink-0" />
                {!isCollapsed && <span className="font-medium text-sm">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer - Hidden when collapsed */}
        {!isCollapsed && (
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white to-transparent border-t border-red-200">
            <div className="text-xs text-gray-500 text-center">
              <p className="font-semibold text-gray-700 mb-1">360° Rating</p>
              <p>Performance Feedback</p>
            </div>
          </div>
        )}
      </aside>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30 mt-20"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
