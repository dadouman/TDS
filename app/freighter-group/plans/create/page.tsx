/**
 * Create Plan Page
 * Form to create a new transport plan
 */

'use client';

import { FormEvent, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { usePlans } from '@/hooks/usePlans';
import { FreighterLayout } from '@/components/FreighterLayout';

interface Location {
  id: string;
  name: string;
  type: string;
}

export default function CreatePlanPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { createPlan, error: planError } = usePlans();
  
  const [locations, setLocations] = useState<Location[]>([]);
  const [locLoading, setLocLoading] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    supplierId: '',
    destinationId: '',
    unitCount: 1,
    plannedLoadingTime: ''
  });

  // Fetch locations on mount
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const res = await fetch('/api/locations', {
          credentials: 'include'
        });
        if (res.ok) {
          const data = await res.json();
          setLocations(data.locations || []);
        }
      } catch (err) {
        console.error('Failed to fetch locations:', err);
      } finally {
        setLocLoading(false);
      }
    };

    fetchLocations();
  }, []);

  if (authLoading || locLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <Link href="/login" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  const suppliers = locations.filter(l => l.type === 'SUPPLIER');
  const destinations = locations.filter(l => l.type === 'STORE' || l.type === 'HUB');

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      // Validation
      if (!formData.supplierId) {
        throw new Error('Supplier location is required');
      }
      if (!formData.destinationId) {
        throw new Error('Destination location is required');
      }
      if (formData.unitCount < 1) {
        throw new Error('Unit count must be at least 1');
      }
      if (!formData.plannedLoadingTime) {
        throw new Error('Planned loading time is required');
      }

      await createPlan({
        supplierId: formData.supplierId,
        destinationId: formData.destinationId,
        unitCount: formData.unitCount,
        plannedLoadingTime: new Date(formData.plannedLoadingTime).toISOString()
      });

      // Success - redirect to plans list
      router.push('/freighter-group/plans');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create plan';
      setFormError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'unitCount' ? parseInt(value) : value
    }));
  };

  return (
    <FreighterLayout title="Create New Plan">
      <div className="p-6 max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Supplier Selection */}
          <div>
            <label htmlFor="supplierId" className="block text-sm font-medium text-gray-700 mb-2">
              Supplier Location *
            </label>
            <select
              id="supplierId"
              name="supplierId"
              value={formData.supplierId}
              onChange={handleChange}
              disabled={isSubmitting || suppliers.length === 0}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              required
            >
              <option value="">Select a supplier...</option>
              {suppliers.map(supplier => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>
            {suppliers.length === 0 && (
              <p className="text-sm text-red-600 mt-1">No suppliers available</p>
            )}
          </div>

          {/* Destination Selection */}
          <div>
            <label htmlFor="destinationId" className="block text-sm font-medium text-gray-700 mb-2">
              Destination Location *
            </label>
            <select
              id="destinationId"
              name="destinationId"
              value={formData.destinationId}
              onChange={handleChange}
              disabled={isSubmitting || destinations.length === 0}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              required
            >
              <option value="">Select a destination...</option>
              {destinations.map(destination => (
                <option key={destination.id} value={destination.id}>
                  {destination.name}
                </option>
              ))}
            </select>
            {destinations.length === 0 && (
              <p className="text-sm text-red-600 mt-1">No destinations available</p>
            )}
          </div>

          {/* Unit Count */}
          <div>
            <label htmlFor="unitCount" className="block text-sm font-medium text-gray-700 mb-2">
              Number of Units *
            </label>
            <input
              id="unitCount"
              type="number"
              name="unitCount"
              min="1"
              value={formData.unitCount}
              onChange={handleChange}
              disabled={isSubmitting}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              required
            />
          </div>

          {/* Planned Loading Time */}
          <div>
            <label htmlFor="plannedLoadingTime" className="block text-sm font-medium text-gray-700 mb-2">
              Planned Loading Time *
            </label>
            <input
              id="plannedLoadingTime"
              type="datetime-local"
              name="plannedLoadingTime"
              value={formData.plannedLoadingTime}
              onChange={handleChange}
              disabled={isSubmitting}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              required
            />
          </div>

          {/* Error Messages */}
          {(formError || planError) && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {formError || planError}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-4 pt-6 border-t border-gray-200">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {isSubmitting ? 'Creating...' : 'Create Plan'}
            </button>
            <Link
              href="/freighter-group/plans"
              className="flex-1 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 transition text-center font-medium"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </FreighterLayout>
  );
}
