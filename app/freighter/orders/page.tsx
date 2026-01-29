"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";

interface Location {
  id: string;
  name: string;
}

interface Order {
  id: string;
  departure_location_id: string;
  arrival_location_id: string;
  loading_date: string;
  unit_count: number;
  status: string;
  departure_location: Location;
  arrival_location: Location;
  trip?: { id: string; status: string };
}

export default function FreighterOrdersPage() {
  const { user, loading: authLoading, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);

  // Form state
  const [departure, setDeparture] = useState("");
  const [arrival, setArrival] = useState("");
  const [loadingDate, setLoadingDate] = useState("");
  const [unitCount, setUnitCount] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (authLoading) return;
      if (!user || user.role !== "FREIGHTER") {
        setLoading(false);
        return;
      }

      try {
        // Fetch locations
        const locRes = await fetch("/api/locations", {
          credentials: "include",
        });
        if (locRes.ok) {
          const locs = await locRes.json();
          setLocations(locs);
        }

        // Fetch orders
        const ordersRes = await fetch("/api/protected/freighter/orders", {
          credentials: "include",
        });
        if (ordersRes.ok) {
          const data = await ordersRes.json();
          setOrders(data);
        } else {
          setError("Failed to load orders");
        }
      } catch (err) {
        console.error(err);
        setError("Error loading data");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [authLoading, user]);

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!departure || !arrival || !loadingDate || !unitCount) {
      setError("All fields are required");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/protected/freighter/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          departure_location_id: departure,
          arrival_location_id: arrival,
          loading_date: loadingDate,
          unit_count: parseInt(unitCount),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to create order");
        return;
      }

      const newOrder = await res.json();
      setOrders([newOrder, ...orders]);

      // Reset form
      setDeparture("");
      setArrival("");
      setLoadingDate("");
      setUnitCount("");
      setError(null);
    } catch (err) {
      console.error(err);
      setError("Error creating order");
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || loading) return <div className="p-4">Loading...</div>;
  if (!user || user.role !== "FREIGHTER") {
    return (
      <div className="p-4 text-red-600">
        Access denied. FREIGHTER role required.
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Orders Management</h1>
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

      {/* CREATE ORDER SECTION */}
      <section className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-2xl font-bold mb-4">Create New Order</h2>
        <form onSubmit={handleCreateOrder} className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Departure Location
            </label>
            <select
              value={departure}
              onChange={(e) => setDeparture(e.target.value)}
              className="w-full border rounded px-3 py-2"
              required
            >
              <option value="">Select...</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Arrival Location
            </label>
            <select
              value={arrival}
              onChange={(e) => setArrival(e.target.value)}
              className="w-full border rounded px-3 py-2"
              required
            >
              <option value="">Select...</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Loading Date & Time
            </label>
            <input
              type="datetime-local"
              value={loadingDate}
              onChange={(e) => setLoadingDate(e.target.value)}
              className="w-full border rounded px-3 py-2"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Unit Count (UT)
            </label>
            <input
              type="number"
              min="1"
              value={unitCount}
              onChange={(e) => setUnitCount(e.target.value)}
              className="w-full border rounded px-3 py-2"
              required
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="col-span-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
          >
            {submitting ? "Creating..." : "Create Order"}
          </button>
        </form>
      </section>

      {/* ORDERS LIST SECTION */}
      <section className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold mb-4">
          My Orders ({orders.length})
        </h2>

        {orders.length === 0 ? (
          <p className="text-gray-500">No orders yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="text-left p-3 font-medium">From</th>
                  <th className="text-left p-3 font-medium">To</th>
                  <th className="text-left p-3 font-medium">Loading Date</th>
                  <th className="text-left p-3 font-medium">UT</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-left p-3 font-medium">Trip</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-b hover:bg-gray-50">
                    <td className="p-3">
                      {order.departure_location.name}
                    </td>
                    <td className="p-3">
                      {order.arrival_location.name}
                    </td>
                    <td className="p-3">
                      {new Date(order.loading_date).toLocaleString()}
                    </td>
                    <td className="p-3 text-center">{order.unit_count}</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          order.status === "DRAFT"
                            ? "bg-yellow-100 text-yellow-800"
                            : order.status === "GROUPED"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-green-100 text-green-800"
                        }`}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td className="p-3">
                      {order.trip ? (
                        <span className="text-blue-600">
                          Trip: {order.trip.id.slice(0, 8)}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
