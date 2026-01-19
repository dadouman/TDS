/**
 * Plan Card Component
 * Displays a transport plan in card format
 */

import Link from 'next/link';
import { Plan } from '@/hooks/usePlans';

interface PlanCardProps {
  plan: Plan;
}

export function PlanCard({ plan }: PlanCardProps) {
  const statusColors: Record<string, { bg: string; text: string; badge: string }> = {
    DRAFT: { bg: 'bg-gray-50', text: 'text-gray-700', badge: 'bg-gray-200 text-gray-800' },
    PROPOSED: { bg: 'bg-blue-50', text: 'text-blue-700', badge: 'bg-blue-200 text-blue-800' },
    ACCEPTED: { bg: 'bg-emerald-50', text: 'text-emerald-700', badge: 'bg-emerald-200 text-emerald-800' },
    IN_TRANSIT: { bg: 'bg-purple-50', text: 'text-purple-700', badge: 'bg-purple-200 text-purple-800' },
    COMPLETED: { bg: 'bg-green-50', text: 'text-green-700', badge: 'bg-green-200 text-green-800' },
    CANCELLED: { bg: 'bg-red-50', text: 'text-red-700', badge: 'bg-red-200 text-red-800' }
  };

  const statusLabel: Record<string, string> = {
    DRAFT: 'Draft',
    PROPOSED: 'Proposed',
    ACCEPTED: 'Accepted',
    IN_TRANSIT: 'In Transit',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled'
  };

  const statusIcon: Record<string, string> = {
    DRAFT: '📝',
    PROPOSED: '📤',
    ACCEPTED: '✅',
    IN_TRANSIT: '🚚',
    COMPLETED: '🏁',
    CANCELLED: '❌'
  };

  const formattedDate = new Date(plan.plannedLoadingTime).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const colors = statusColors[plan.status];

  return (
    <Link href={`/freighter-group/plans/${plan.id}`}>
      <div className={`${colors.bg} border border-gray-200 rounded-xl p-6 hover:shadow-lg hover:border-indigo-300 transition cursor-pointer group`}>
        {/* Header with Status */}
        <div className="flex justify-between items-start mb-5">
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900 group-hover:text-indigo-600 transition">
              Plan {plan.id.slice(0, 8).toUpperCase()}
            </h3>
            <p className={`text-xs font-medium ${colors.text} mt-2`}>{formattedDate}</p>
          </div>
          <span className={`${colors.badge} px-4 py-2 rounded-full text-sm font-semibold inline-flex items-center gap-2 flex-shrink-0`}>
            {statusIcon[plan.status]}
            {statusLabel[plan.status]}
          </span>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mb-5 pb-5 border-b border-gray-200/50">
          <div>
            <p className="text-xs text-gray-600 font-semibold uppercase tracking-wide mb-1">Units</p>
            <p className="text-2xl font-bold text-gray-900">{plan.unitCount}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600 font-semibold uppercase tracking-wide mb-1">Version</p>
            <p className="text-2xl font-bold text-indigo-600">{plan.version}</p>
          </div>
        </div>

        {/* Action Footer */}
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-gray-600">View Full Details</p>
          <svg className="w-4 h-4 text-indigo-600 group-hover:translate-x-1 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </div>
      </div>
    </Link>
  );
}
