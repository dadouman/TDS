/**
 * Shared Auth Layout
 * Layout component for authentication pages (login, register)
 */

'use client';

import { ReactNode } from 'react';
import Link from 'next/link';

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 to-indigo-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl shadow-2xl p-8">
          {/* Header with Logo */}
          <div className="text-center mb-8">
            <div className="w-12 h-12 bg-indigo-600 rounded-lg flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-bold text-lg">TDS</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">TDS</h1>
            <p className="text-gray-500 text-xs tracking-widest mt-1">TRANSPORT DISTRIBUTION</p>
          </div>

          {/* Divider */}
          <div className="h-px bg-gray-200 mb-8"></div>

          {/* Title & Subtitle */}
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              {title}
            </h2>
            {subtitle && (
              <p className="text-gray-600 text-sm">{subtitle}</p>
            )}
          </div>

          {/* Content */}
          <div className="mb-6">
            {children}
          </div>

          {/* Footer */}
          <div className="text-center text-xs text-gray-600 border-t border-gray-200 pt-6">
            <p>
              By using TDS, you agree to our{' '}
              <Link href="/terms" className="text-indigo-600 hover:text-indigo-700 font-semibold">
                Terms of Service
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
