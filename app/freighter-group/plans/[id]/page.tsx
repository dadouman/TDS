'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { FreighterLayout } from '@/components/FreighterLayout';
import { Plan } from '@/hooks/usePlans';

export default function PlanDetailPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const planId = (params?.id as string) || '';

  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && user) {
      fetchPlanDetail();
    }
  }, [authLoading, user]);

  const fetchPlanDetail = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/plans/${planId}`, {
        credentials: 'include'
      });

      if (!res.ok) {
        throw new Error('Failed to fetch plan');
      }

      const data = await res.json();
      setPlan(data.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load plan';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      DRAFT: 'bg-gray-100 text-gray-800',
      PROPOSED: 'bg-blue-100 text-blue-800',
      ACCEPTED: 'bg-green-100 text-green-800',
      IN_TRANSIT: 'bg-purple-100 text-purple-800',
      COMPLETED: 'bg-emerald-100 text-emerald-800',
      CANCELLED: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (authLoading || loading) {
    return (
      <FreighterLayout title="Plan Details">
        <div className="p-6 text-center">
          <p className="text-gray-600">Loading plan details...</p>
        </div>
      </FreighterLayout>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <Link href="/auth-group/login" className="px-4 py-2 bg-indigo-600 text-white rounded-lg">
            Login
          </Link>
        </div>
      </div>
    );
  }

  if (error || !plan) {
    return (
      <FreighterLayout title="Plan Details">
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700">{error || 'Plan not found'}</p>
          </div>
          <Link href="/freighter-group/plans" className="mt-4 inline-block px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
            Back to Plans
          </Link>
        </div>
      </FreighterLayout>
    );
  }

  return (
    <FreighterLayout title="Plan Details">
      <div className="p-6">
        {/* Header */}
        <div className="mb-6 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Plan {planId}</h1>
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(plan.status)}`}>
                {plan.status}
              </span>
              <span className="text-gray-600">v{plan.version}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Link
              href={`/freighter-group/plans/${planId}/edit`}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium"
            >
              Edit Plan
            </Link>
            <Link
              href="/freighter-group/plans"
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition font-medium"
            >
              Back
            </Link>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-4">Shipment Information</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-600">Supplier Location</label>
                <p className="text-lg font-medium text-gray-900">{plan.supplierId}</p>
              </div>
              <div>
                <label className="text-sm text-gray-600">Destination Location</label>
                <p className="text-lg font-medium text-gray-900">{plan.destinationId}</p>
              </div>
              <div>
                <label className="text-sm text-gray-600">Unit Count</label>
                <p className="text-lg font-medium text-gray-900">{plan.unitCount} units</p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-4">Timeline</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-600">Planned Loading Time</label>
                <p className="text-lg font-medium text-gray-900">{formatDate(plan.plannedLoadingTime)}</p>
              </div>
              <div>
                <label className="text-sm text-gray-600">Created</label>
                <p className="text-sm text-gray-700">{formatDate(plan.createdAt)}</p>
              </div>
              <div>
                <label className="text-sm text-gray-600">Last Updated</label>
                <p className="text-sm text-gray-700">{formatDate(plan.updatedAt)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Meta Information */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
          <h3 className="text-sm font-semibold text-gray-500 uppercase mb-4">Metadata</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-600">Created By</label>
              <p className="text-gray-900">
                {typeof (plan as any).createdBy === 'string'
                  ? (plan as any).createdBy
                  : (plan as any).createdBy?.email || 'Unknown'}
              </p>
            </div>
            <div>
              <label className="text-sm text-gray-600">Plan ID</label>
              <p className="text-gray-900 font-mono text-sm">{plan.id}</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        {(plan.status === 'DRAFT' || plan.status === 'PROPOSED') && (
          <div className="mt-8 flex gap-3">
            <button
              onClick={() => router.push(`/freighter-group/plans/${planId}/edit`)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium"
            >
              Edit Plan
            </button>
          </div>
        )}
      </div>
    </FreighterLayout>
  );
}
