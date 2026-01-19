/**
 * usePlans Hook
 * Manages transport plans state and API calls
 */

import { useState, useCallback, useEffect } from 'react';

export interface Plan {
  id: string;
  supplierId: string;
  destinationId: string;
  unitCount: number;
  plannedLoadingTime: string;
  status: 'DRAFT' | 'PROPOSED' | 'ACCEPTED' | 'IN_TRANSIT' | 'COMPLETED' | 'CANCELLED';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  version: number;
}

interface UsePlansReturn {
  plans: Plan[];
  loading: boolean;
  error: string | null;
  fetchPlans: (filters?: Record<string, any>) => Promise<void>;
  createPlan: (data: Partial<Plan>) => Promise<Plan>;
  updatePlan: (id: string, data: Partial<Plan>) => Promise<Plan>;
  deletePlan: (id: string) => Promise<void>;
}

export function usePlans(): UsePlansReturn {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPlans = useCallback(async (filters?: Record<string, any>) => {
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== null && value !== undefined) {
            query.append(key, String(value));
          }
        });
      }

      const res = await fetch(`/api/plans?${query}`, {
        credentials: 'include'
      });

      if (!res.ok) {
        throw new Error('Failed to fetch plans');
      }

      const response = await res.json();
      setPlans(response.data || response.plans || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch plans';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const createPlan = useCallback(async (data: Partial<Plan>): Promise<Plan> => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include'
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create plan');
      }

      const createdPlan = await res.json();
      setPlans(prev => [createdPlan, ...prev]);
      return createdPlan;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create plan';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updatePlan = useCallback(async (id: string, data: Partial<Plan>): Promise<Plan> => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/plans/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include'
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to update plan');
      }

      const updatedPlan = await res.json();
      setPlans(prev => prev.map(p => p.id === id ? updatedPlan : p));
      return updatedPlan;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update plan';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deletePlan = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/plans/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!res.ok) {
        throw new Error('Failed to delete plan');
      }

      setPlans(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete plan';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    plans,
    loading,
    error,
    fetchPlans,
    createPlan,
    updatePlan,
    deletePlan
  };
}
