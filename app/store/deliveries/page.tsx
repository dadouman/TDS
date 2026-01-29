"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";

interface Delivery {
  id: string;
  status: string;
  tripStatus: string;
  estimatedDeliveryTime: string;
  arrival_time: string;
  departure_location_id: string;
  carrier_id: string;
  unitCount: number;
  incidentCount: number;
}

export default function StoreDeliveriesPage() {
  const { user, loading: authLoading, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);

  const title = useMemo(() => {
    if (!user) return "Store Deliveries";
    return user.email ? `Deliveries for ${user.email}` : "Store Deliveries";
  }, [user]);

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
      if (user.role !== "STORE") {
        setError("Accès réservé au rôle STORE");
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError(null);
        const res = await fetch("/api/protected/store/dashboard", {
          credentials: "include",
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Impossible de charger les livraisons");
        }
        const data = await res.json();
        setDeliveries(data.data?.deliveries || []);
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
          <p className="text-gray-600 mb-6">Connecte-toi avec un compte magasin pour voir les livraisons.</p>
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

  if (user.role !== "STORE") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-xl shadow-sm text-center border border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Accès refusé</h1>
          <p className="text-gray-600">Cette page est réservée aux comptes magasin (STORE).</p>
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
              <p className="text-sm font-semibold text-indigo-600">Magasin</p>
              <h1 className="text-3xl font-bold text-gray-900 mt-2">{title}</h1>
              <p className="text-gray-600 mt-1">Suivez vos livraisons et incidents associés.</p>
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

        {deliveries.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-200 rounded-xl p-10 text-center text-gray-600">
            <div className="text-4xl mb-3">📦</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Aucune livraison assignée</h2>
            <p className="text-gray-600">Les plans de transport à destination de votre magasin apparaîtront ici.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {deliveries.map((d) => {
              const arrivalTime = d.arrival_time ? new Date(d.arrival_time) : null;
              const now = new Date();
              const isDelayed = arrivalTime && arrivalTime < now;
              const isToday = arrivalTime && 
                arrivalTime.toDateString() === now.toDateString();

              return (
                <div 
                  key={d.id} 
                  className={`border rounded-xl p-6 shadow-sm ${
                    isDelayed 
                      ? "bg-red-50 border-red-200" 
                      : isToday 
                      ? "bg-blue-50 border-blue-200"
                      : "bg-white border-gray-200"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-gray-500">Trip</p>
                      <p className="text-lg font-semibold text-gray-900">{d.id.slice(0, 8)}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      isDelayed
                        ? "bg-red-100 text-red-700"
                        : d.tripStatus === "ACCEPTED"
                        ? "bg-green-100 text-green-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}>
                      {d.tripStatus}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                    <div>
                      <p className="text-gray-600">From</p>
                      <p className="font-medium">{d.departure_location_id}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Carrier</p>
                      <p className="font-medium">{d.carrier_id || "Unassigned"}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Units</p>
                      <p className="font-medium">{d.unitCount} UT</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Incidents</p>
                      <p className="font-medium">{d.incidentCount}</p>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <p className="text-xs text-gray-600 mb-1">Estimated Arrival</p>
                    <p className="text-lg font-bold text-gray-900">
                      {arrivalTime 
                        ? arrivalTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : "TBD"
                      }
                    </p>
                    {isDelayed && (
                      <p className="text-xs text-red-700 mt-2 font-semibold">
                        ⚠️ Delayed - was due {Math.floor((now.getTime() - arrivalTime!.getTime()) / 60000)} min ago
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
