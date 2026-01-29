"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";

interface Trip {
  id: string;
  status: string;
  planId: string;
  carrierName: string;
  acceptedAt: string;
  plan: {
    id: string;
    unitCount: number;
    estimatedDeliveryTime: string;
    supplier: { name: string; address: string };
    destination: { name: string; address: string };
    hub: { name: string; address: string } | null;
  };
  cmr: {
    id: string;
    status: string;
    submittedAt: string | null;
  } | null;
  needsCMR: boolean;
}

export default function WarehouseCMRPage() {
  const { user, loading: authLoading, logout } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);

  const handleLogout = async () => {
    await logout();
  };

  useEffect(() => {
    const load = async () => {
      if (authLoading) return;
      if (!user) {
        setLoading(false);
        return;
      }
      if (user.role !== "WAREHOUSE") {
        setError("Accès réservé au rôle WAREHOUSE");
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError(null);
        const res = await fetch("/api/protected/warehouse/trips", {
          credentials: "include",
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Impossible de charger les trajets");
        }
        const data = await res.json();
        setTrips(data.data?.trips || []);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Erreur inconnue";
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [authLoading, user]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-600">Chargement…</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-xl shadow-sm text-center border border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Connexion requise</h1>
          <p className="text-gray-600 mb-6">Connecte-toi avec un compte entrepôt pour gérer les CMR.</p>
          <Link
            href="/auth-group/login"
            className="inline-flex px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
          >
            Aller à la connexion
          </Link>
        </div>
      </div>
    );
  }

  if (user.role !== "WAREHOUSE") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-xl shadow-sm text-center border border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Accès refusé</h1>
          <p className="text-gray-600">Cette page est réservée aux comptes entrepôt (WAREHOUSE).</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-sm font-semibold text-indigo-600">Entrepôt</p>
              <h1 className="text-3xl font-bold text-gray-900 mt-2">Gestion CMR</h1>
              <p className="text-gray-600 mt-1">
                Complète et soumet les formulaires CMR pour les trajets assignés.
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition font-medium"
            >
              Se déconnecter
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">
        {error && (
          <div className="mb-6 p-4 rounded-lg border border-red-200 bg-red-50 text-red-700 font-medium">
            {error}
          </div>
        )}

        {trips.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-200 rounded-xl p-10 text-center text-gray-600">
            <div className="text-4xl mb-3">📋</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Aucun trajet assigné</h2>
            <p className="text-gray-600">
              Les trajets nécessitant un formulaire CMR apparaîtront ici.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {trips.map((trip) => (
              <div key={trip.id} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500">Trajet</p>
                    <p className="text-lg font-semibold text-gray-900">{trip.id.substring(0, 12)}...</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700">
                      {trip.status}
                    </span>
                    {trip.cmr && (
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        trip.cmr.status === 'SUBMITTED' 
                          ? 'bg-green-50 text-green-700' 
                          : 'bg-yellow-50 text-yellow-700'
                      }`}>
                        CMR: {trip.cmr.status}
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-2 text-sm text-gray-700 mb-4">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Transporteur</span>
                    <span className="font-semibold">{trip.carrierName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Unités</span>
                    <span className="font-semibold">{trip.plan.unitCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Livraison prévue</span>
                    <span className="font-semibold">
                      {new Date(trip.plan.estimatedDeliveryTime).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-3 mb-4 text-xs text-gray-600">
                  <div className="flex items-start gap-2 mb-1">
                    <span className="text-gray-500">De:</span>
                    <span>{trip.plan.supplier.name}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-gray-500">Vers:</span>
                    <span>{trip.plan.destination.name}</span>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  {trip.needsCMR ? (
                    <span className="text-xs text-orange-600 font-semibold">⚠️ CMR requis</span>
                  ) : (
                    <span className="text-xs text-green-600 font-semibold">✅ CMR soumis</span>
                  )}
                  <Link
                    href={`/warehouse/cmr/${trip.id}`}
                    className="text-indigo-600 font-semibold hover:text-indigo-800 text-sm"
                  >
                    {trip.needsCMR ? 'Remplir CMR →' : 'Voir CMR →'}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
