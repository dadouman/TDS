"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";

interface Trip {
  id: string;
  departure_location_id: string;
  arrival_location_id: string;
  loading_time: string;
  departure_time: string;
  arrival_time: string;
  status: string;
  order_count: number;
  total_units: number;
}

interface Plan {
  id: string;
  plan_date: string;
  status: string;
  total_trips: number;
  total_units: number;
  createdAt: string;
}

export default function FreighterTransportPlansPage() {
  const { user, loading: authLoading, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [selectedPlanTrips, setSelectedPlanTrips] = useState<Trip[]>([]);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (authLoading) return;
      if (!user || user.role !== "FREIGHTER") {
        setLoading(false);
        return;
      }

      try {
        const plansRes = await fetch("/api/protected/freighter/transport-plans", {
          credentials: "include",
        });
        if (plansRes.ok) {
          const data = await plansRes.json();
          setPlans(data);
        } else {
          setError("Failed to load plans");
        }
      } catch (err) {
        console.error(err);
        setError("Error loading plans");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [authLoading, user]);

  const handleGeneratePlan = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/protected/freighter/transport-plans/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ plan_date: new Date().toISOString() }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to generate plan");
        return;
      }

      const result = await res.json();
      // Reload plans
      const plansRes = await fetch("/api/protected/freighter/transport-plans", {
        credentials: "include",
      });
      if (plansRes.ok) {
        const data = await plansRes.json();
        setPlans(data);
        setSelectedPlan(result.plan);
        setSelectedPlanTrips(result.trips);
      }
    } catch (err) {
      console.error(err);
      setError("Error generating plan");
    } finally {
      setGenerating(false);
    }
  };

  const handleSelectPlan = async (plan: Plan) => {
    setSelectedPlan(plan);
    try {
      const res = await fetch(`/api/protected/freighter/transport-plans/${plan.id}/trips`, {
        credentials: "include",
      });
      if (res.ok) {
        const trips = await res.json();
        setSelectedPlanTrips(trips);
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (authLoading || loading) return <div className="p-4">Loading...</div>;
  if (!user || user.role !== "FREIGHTER") {
    return <div className="p-4 text-red-600">Access denied</div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Transport Plans</h1>
        <button
          onClick={logout}
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
        >
          Logout
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}

      {/* ACTION BUTTON */}
      <div className="mb-6">
        <button
          onClick={handleGeneratePlan}
          disabled={generating}
          className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 font-medium"
        >
          {generating ? "Generating..." : "Create Today's Plan"}
        </button>
        <Link href="/freighter/orders" className="ml-4 text-blue-600 hover:underline">
          ← Back to Orders
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* PLANS LIST */}
        <div className="col-span-1 bg-white rounded-lg shadow">
          <div className="p-4 border-b">
            <h2 className="font-bold text-lg">Plans ({plans.length})</h2>
          </div>
          <div className="divide-y max-h-96 overflow-y-auto">
            {plans.map((plan) => (
              <div
                key={plan.id}
                onClick={() => handleSelectPlan(plan)}
                className={`p-3 cursor-pointer hover:bg-blue-50 ${
                  selectedPlan?.id === plan.id ? "bg-blue-100" : ""
                }`}
              >
                <div className="text-sm font-medium">
                  {new Date(plan.plan_date).toLocaleDateString()}
                </div>
                <div className="text-xs text-gray-600">
                  {plan.total_trips} trips, {plan.total_units} UT
                </div>
                <div className="text-xs mt-1">
                  <span
                    className={`px-2 py-0.5 rounded ${
                      plan.status === "PROPOSED"
                        ? "bg-yellow-100 text-yellow-800"
                        : plan.status === "ACCEPTED"
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {plan.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* TRIPS DETAILS */}
        <div className="col-span-2 bg-white rounded-lg shadow">
          {selectedPlan ? (
            <>
              <div className="p-4 border-b">
                <h2 className="font-bold text-lg">
                  Plan: {new Date(selectedPlan.plan_date).toLocaleDateString()}
                </h2>
                <p className="text-sm text-gray-600">
                  {selectedPlanTrips.length} trips, {selectedPlan.total_units} UT total
                </p>
              </div>
              <div className="p-4">
                {selectedPlanTrips.length === 0 ? (
                  <p className="text-gray-500">No trips in this plan.</p>
                ) : (
                  <div className="space-y-4">
                    {selectedPlanTrips.map((trip) => (
                      <div
                        key={trip.id}
                        className="border rounded p-4 bg-gray-50"
                      >
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <div className="text-sm text-gray-600">From → To</div>
                            <div className="font-medium">
                              {trip.departure_location_id} → {trip.arrival_location_id}
                            </div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-600">Orders</div>
                            <div className="font-medium">
                              {trip.order_count} orders, {trip.total_units} UT
                            </div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-600">Loading</div>
                            <div className="font-mono text-sm">
                              {new Date(trip.loading_time).toLocaleTimeString()}
                            </div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-600">Departure</div>
                            <div className="font-mono text-sm">
                              {new Date(trip.departure_time).toLocaleTimeString()}
                            </div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-600">Arrival</div>
                            <div className="font-mono text-sm">
                              {new Date(trip.arrival_time).toLocaleTimeString()}
                            </div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-600">Status</div>
                            <span className="px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                              {trip.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="p-4 text-gray-500">
              Select a plan to view trips
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
