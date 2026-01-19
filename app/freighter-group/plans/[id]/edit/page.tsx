'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { usePlans, Plan } from '@/hooks/usePlans';
import { FreighterLayout } from '@/components/FreighterLayout';

interface Location {
  id: string;
  name: string;
  address: string;
}

export default function EditPlanPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const planId = (params?.id as string) || '';
  const { updatePlan } = usePlans();

  const [plan, setPlan] = useState<Plan | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    supplierId: '',
    destinationId: '',
    unitCount: 0,
    plannedLoadingTime: ''
  });

  useEffect(() => {
    if (!authLoading && user) {
      Promise.all([fetchPlanDetail(), fetchLocations()]);
    }
  }, [authLoading, user]);

  const fetchPlanDetail = async () => {
    try {
      const res = await fetch(`/api/plans/${planId}`, {
        credentials: 'include'
      });

      if (!res.ok) {
        throw new Error('Failed to fetch plan');
      }

      const data = await res.json();
      const plan = data.plan;
      setPlan(plan);
      setFormData({
        supplierId: plan.supplierId,
        destinationId: plan.destinationId,
        unitCount: plan.unitCount,
        plannedLoadingTime: plan.plannedLoadingTime.split('T')[0]
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load plan';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const fetchLocations = async () => {
    try {
      const res = await fetch('/api/locations', {
        credentials: 'include'
      });

      if (!res.ok) {
        throw new Error('Failed to fetch locations');
      }

      const data = await res.json();
      setLocations(data.locations || []);
    } catch (err) {
      console.error('Failed to fetch locations:', err);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'unitCount' ? parseInt(value) || 0 : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!formData.supplierId || !formData.destinationId || formData.unitCount < 1) {
      setError('Please fill in all fields. Unit count must be at least 1.');
      return;
    }

    if (formData.supplierId === formData.destinationId) {
      setError('Supplier and destination must be different locations');
      return;
    }

    try {
      setSaving(true);
      await updatePlan(planId, {
        supplierId: formData.supplierId,
        destinationId: formData.destinationId,
        unitCount: formData.unitCount,
        plannedLoadingTime: new Date(formData.plannedLoadingTime).toISOString()
      });

      setSuccess('Plan updated successfully!');
      setTimeout(() => {
        router.push(`/freighter-group/plans/${planId}`);
      }, 1500);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update plan';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <FreighterLayout title="Edit Plan">
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

  if (!plan) {
    return (
      <FreighterLayout title="Edit Plan">
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700">Plan not found</p>
          </div>
          <Link href="/freighter-group/plans" className="mt-4 inline-block px-4 py-2 bg-indigo-600 text-white rounded-lg">
            Back to Plans
          </Link>
        </div>
      </FreighterLayout>
    );
  }

  return (
    <FreighterLayout title="Edit Plan">
      <div className="p-6 max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Edit Plan {planId}</h1>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-700">{success}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-lg p-8">
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Supplier Location *
            </label>
            <select
              name="supplierId"
              value={formData.supplierId}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            >
              <option value="">Select supplier location</option>
              {locations.map(loc => (
                <option key={loc.id} value={loc.id}>
                  {loc.name} - {loc.address}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Destination Location *
            </label>
            <select
              name="destinationId"
              value={formData.destinationId}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            >
              <option value="">Select destination location</option>
              {locations.map(loc => (
                <option key={loc.id} value={loc.id}>
                  {loc.name} - {loc.address}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Unit Count *
            </label>
            <input
              type="number"
              name="unitCount"
              value={formData.unitCount}
              onChange={handleChange}
              min="1"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Planned Loading Date *
            </label>
            <input
              type="date"
              name="plannedLoadingTime"
              value={formData.plannedLoadingTime}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 transition font-medium"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <Link
              href={`/freighter-group/plans/${planId}`}
              className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition font-medium"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </FreighterLayout>
  );
}
