"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";

interface PlanDetails {
  id: string;
  status: string;
  supplier: { id: string; name: string; address: string };
  destination: { id: string; name: string; address: string };
  hub: { id: string; name: string; address: string } | null;
  journey: {
    plannedLoadingTime: string | null;
    estimatedHubTime: string | null;
    estimatedDeliveryTime: string | null;
  };
  shipment: { unitCount: number; notes: string | null };
  costs: { total: number; perUnit: number; breakdown: any[] };
  version: number;
  createdAt: string;
  updatedAt: string;
}

export default function PlanDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<PlanDetails | null>(null);

  const planId = params?.id as string;

  useEffect(() => {
    const load = async () => {
      if (authLoading) return;
      if (!user) {
        setLoading(false);
        return;
      }
      if (!planId) {
        setError("ID du plan manquant");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/plans/${planId}`, {
          credentials: "include",
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Impossible de charger le plan");
        }
        const data = await res.json();
        setPlan(data.data);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Erreur inconnue";
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [authLoading, user, planId]);

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
          <p className="text-gray-600 mb-6">Connecte-toi pour voir les détails du plan.</p>
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

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-xl shadow-sm text-center border border-red-200">
          <h1 className="text-2xl font-bold text-red-900 mb-2">Erreur</h1>
          <p className="text-red-700 mb-6">{error}</p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition"
          >
            ← Retour
          </button>
        </div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-600">Plan introuvable</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={() => router.back()}
              className="text-indigo-600 hover:text-indigo-800 font-medium text-sm flex items-center gap-1"
            >
              ← Retour
            </button>
            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold ${
                plan.status === "COMPLETED"
                  ? "bg-green-50 text-green-700"
                  : plan.status === "IN_TRANSIT"
                  ? "bg-blue-50 text-blue-700"
                  : plan.status === "ACCEPTED"
                  ? "bg-indigo-50 text-indigo-700"
                  : "bg-gray-100 text-gray-700"
              }`}
            >
              {plan.status}
            </span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Plan de Transport</h1>
          <p className="text-gray-600 mt-1">ID: {plan.id}</p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10 space-y-6">
        {/* Supplier → Destination */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 mb-4">🚚 Itinéraire</h2>
          <div className="space-y-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Fournisseur</p>
              <p className="font-semibold text-gray-900">{plan.supplier.name}</p>
              <p className="text-sm text-gray-600">{plan.supplier.address}</p>
            </div>
            {plan.hub && (
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Hub</p>
                <p className="font-semibold text-gray-900">{plan.hub.name}</p>
                <p className="text-sm text-gray-600">{plan.hub.address}</p>
              </div>
            )}
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Destination</p>
              <p className="font-semibold text-gray-900">{plan.destination.name}</p>
              <p className="text-sm text-gray-600">{plan.destination.address}</p>
            </div>
          </div>
        </div>

        {/* Shipment Info */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 mb-4">📦 Expédition</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Unités</span>
              <span className="font-semibold text-gray-900">{plan.shipment.unitCount}</span>
            </div>
            {plan.shipment.notes && (
              <div>
                <p className="text-gray-500 mb-1">Notes</p>
                <p className="text-gray-900">{plan.shipment.notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Journey Timeline */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 mb-4">⏱️ Planning</h2>
          <div className="space-y-2 text-sm">
            {plan.journey.plannedLoadingTime && (
              <div className="flex justify-between">
                <span className="text-gray-500">Chargement prévu</span>
                <span className="font-semibold text-gray-900">
                  {new Date(plan.journey.plannedLoadingTime).toLocaleString()}
                </span>
              </div>
            )}
            {plan.journey.estimatedHubTime && (
              <div className="flex justify-between">
                <span className="text-gray-500">Arrivée hub estimée</span>
                <span className="font-semibold text-gray-900">
                  {new Date(plan.journey.estimatedHubTime).toLocaleString()}
                </span>
              </div>
            )}
            {plan.journey.estimatedDeliveryTime && (
              <div className="flex justify-between">
                <span className="text-gray-500">Livraison estimée</span>
                <span className="font-semibold text-gray-900">
                  {new Date(plan.journey.estimatedDeliveryTime).toLocaleString()}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Costs */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 mb-4">💰 Coûts</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Total estimé</span>
              <span className="font-semibold text-gray-900">{plan.costs.total} €</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Par unité</span>
              <span className="font-semibold text-gray-900">{plan.costs.perUnit} €</span>
            </div>
          </div>
        </div>

        {/* Metadata */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 mb-4">ℹ️ Informations</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Version</span>
              <span className="font-semibold text-gray-900">{plan.version}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Créé le</span>
              <span className="font-semibold text-gray-900">
                {new Date(plan.createdAt).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Mis à jour le</span>
              <span className="font-semibold text-gray-900">
                {new Date(plan.updatedAt).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
