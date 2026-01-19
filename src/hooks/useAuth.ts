/**
 * useAuth Hook
 * Manages authentication state and provides auth utilities
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

export interface AuthUser {
  id: string;
  email: string;
  role: 'FREIGHTER' | 'CARRIER' | 'WAREHOUSE' | 'STORE' | 'ADMIN';
  firstName?: string;
  lastName?: string;
}

interface UseAuthReturn {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, firstName: string, lastName: string, role: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Check auth status on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me', {
          credentials: 'include'
        });
        
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error('Auth check failed:', err);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include'
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Login failed');
      }

      const data = await res.json();
      // API returns userId, email, role directly (not wrapped in 'user' object)
      setUser({
        id: data.userId,
        email: data.email,
        role: (data.role || 'FREIGHTER').toUpperCase() as 'FREIGHTER' | 'CARRIER' | 'WAREHOUSE' | 'STORE' | 'ADMIN'
      });
      
      // Redirect based on role
      const roleRoutes: Record<string, string> = {
        FREIGHTER: '/freighter-group/plans',
        CARRIER: '/carrier/trips',
        WAREHOUSE: '/warehouse/cmr',
        STORE: '/store/deliveries',
        ADMIN: '/freighter-group/plans'
      };
      
      const userRole = (data.role || 'FREIGHTER').toUpperCase();
      router.push(roleRoutes[userRole] || '/dashboard');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [router]);

  const register = useCallback(async (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    role: string
  ) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, firstName, lastName, role }),
        credentials: 'include'
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Registration failed');
      }

      const data = await res.json();
      setUser(data.user);
      
      // Redirect based on role
      const roleRoutes: Record<string, string> = {
        FREIGHTER: '/freighter-group/plans',
        CARRIER: '/carrier/trips',
        WAREHOUSE: '/warehouse/cmr',
        STORE: '/store/deliveries',
        ADMIN: '/admin/dashboard'
      };
      
      router.push(roleRoutes[role] || '/dashboard');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Registration failed';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [router]);

  const logout = useCallback(async () => {
    setLoading(true);
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
      
      setUser(null);
      router.push('/auth-group/login');
    } catch (err) {
      console.error('Logout failed:', err);
    } finally {
      setLoading(false);
    }
  }, [router]);

  return {
    user,
    loading,
    error,
    login,
    register,
    logout,
    isAuthenticated: !!user
  };
}
