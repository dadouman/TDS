/**
 * Home Page
 * Landing page for unauthenticated users
 */

import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-indigo-600">TDS</h1>
          <div className="space-x-4">
            <Link href="/auth-group/login" className="px-4 py-2 text-gray-900 hover:text-gray-600">
              Sign In
            </Link>
            <Link href="/auth-group/register" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
              Sign Up
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Transport Distribution System
          </h1>
          <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto">
            Streamline your transport operations with real-time incident detection, 
            carrier management, and seamless logistics coordination.
          </p>

          {/* CTA Buttons */}
          <div className="flex gap-4 justify-center mb-16">
            <Link
              href="/auth-group/register"
              className="px-8 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium text-lg transition"
            >
              Get Started
            </Link>
            <Link
              href="/auth-group/login"
              className="px-8 py-3 bg-white text-indigo-600 border-2 border-indigo-600 rounded-lg hover:bg-indigo-50 font-medium text-lg transition"
            >
              Sign In
            </Link>
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-20">
            {/* Feature 1 */}
            <div className="bg-white rounded-lg p-8 shadow-md">
              <div className="text-4xl mb-4">📦</div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Plan Management</h3>
              <p className="text-gray-600">
                Create, modify, and track transport plans with real-time status updates and carrier proposals.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white rounded-lg p-8 shadow-md">
              <div className="text-4xl mb-4">⚠️</div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Incident Detection</h3>
              <p className="text-gray-600">
                Automatic detection of refusals, delays, and imbalances with instant notifications.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white rounded-lg p-8 shadow-md">
              <div className="text-4xl mb-4">📊</div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Real-Time Updates</h3>
              <p className="text-gray-600">
                Live dashboard updates with instant notifications via SSE for all transport events.
              </p>
            </div>
          </div>

          {/* Roles Section */}
          <div className="mt-20">
            <h2 className="text-3xl font-bold text-gray-900 mb-12">For Every Role</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Freighter */}
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <div className="text-3xl mb-3">🚚</div>
                <h4 className="font-bold text-gray-900 mb-2">Freighter</h4>
                <p className="text-sm text-gray-600">
                  Plan transport, track incidents, manage carriers
                </p>
              </div>

              {/* Carrier */}
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <div className="text-3xl mb-3">🚛</div>
                <h4 className="font-bold text-gray-900 mb-2">Carrier</h4>
                <p className="text-sm text-gray-600">
                  Accept trips, manage deliveries, real-time updates
                </p>
              </div>

              {/* Warehouse */}
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <div className="text-3xl mb-3">📦</div>
                <h4 className="font-bold text-gray-900 mb-2">Warehouse</h4>
                <p className="text-sm text-gray-600">
                  Complete CMR forms, manage operations
                </p>
              </div>

              {/* Store */}
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <div className="text-3xl mb-3">🏪</div>
                <h4 className="font-bold text-gray-900 mb-2">Store</h4>
                <p className="text-sm text-gray-600">
                  Track deliveries, receive notifications
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center text-gray-600 text-sm">
          <p>&copy; 2026 Transport Distribution System. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
