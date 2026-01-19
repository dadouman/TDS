/**
 * Freighter Layout
 * Layout component for freighter dashboard pages
 */

'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';

interface FreighterLayoutProps {
  children: ReactNode;
  title: string;
}

export function FreighterLayout({ children, title }: FreighterLayoutProps) {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-indigo-600">TDS</h1>
            </div>

            {/* Navigation Links */}
            <div className="flex items-center space-x-6">
              <Link
                href="/freighter-group/plans"
                className="text-gray-600 hover:text-gray-900 font-medium"
              >
                Plans
              </Link>
              <Link
                href="/freighter-group/incidents"
                className="text-gray-600 hover:text-gray-900 font-medium"
              >
                Incidents
              </Link>
            </div>

            {/* User Menu */}
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                {user?.firstName} {user?.lastName}
              </div>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Page Content */}
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900">{title}</h2>
        </div>

        {/* Page Body */}
        <div className="bg-white rounded-lg shadow">
          {children}
        </div>
      </main>
    </div>
  );
}
