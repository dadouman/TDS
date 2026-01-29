import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface Order {
  id: string;
  departure_location_id: string;
  arrival_location_id: string;
  loading_date: Date;
  unit_count: number;
}

interface GroupedTrip {
  departure_location_id: string;
  arrival_location_id: string;
  loading_time: Date;
  departure_time: Date;
  arrival_time: Date;
  orders: Order[];
}

/**
 * Group orders by departure/arrival location and calculate trip times
 * Simple algorithm: 
 * - Group orders with same departure & arrival
 * - Calculate times: loading_time = max(order.loading_date) + buffer
 *                    departure_time = loading_time + 0.5h
 *                    arrival_time = departure_time + 2h (default)
 */
export async function groupOrders(orders: Order[]): Promise<GroupedTrip[]> {
  // Group by departure + arrival
  const grouped = new Map<string, Order[]>();

  for (const order of orders) {
    const key = `${order.departure_location_id}|${order.arrival_location_id}`;
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(order);
  }

  // Convert to trips with calculated times
  const trips: GroupedTrip[] = [];

  for (const [key, groupedOrders] of grouped.entries()) {
    const [depId, arrId] = key.split("|");

    // Calculate loading_time = max(order.loading_date) + 1h buffer
    const maxLoadingDate = new Date(
      Math.max(...groupedOrders.map((o) => new Date(o.loading_date).getTime()))
    );
    const loadingTime = new Date(maxLoadingDate.getTime() + 60 * 60 * 1000); // +1h

    // departure_time = loading_time + 30min
    const departureTime = new Date(loadingTime.getTime() + 30 * 60 * 1000);

    // arrival_time = departure_time + 2h (default transport time)
    const arrivalTime = new Date(departureTime.getTime() + 2 * 60 * 60 * 1000);

    // Validate coherence
    if (!(loadingTime <= departureTime && departureTime <= arrivalTime)) {
      throw new Error(`Date coherence failed for trip ${depId} -> ${arrId}`);
    }

    trips.push({
      departure_location_id: depId,
      arrival_location_id: arrId,
      loading_time: loadingTime,
      departure_time: departureTime,
      arrival_time: arrivalTime,
      orders: groupedOrders,
    });
  }

  return trips;
}

/**
 * Create transport plan from DRAFT orders
 */
export async function generateTransportPlan(userId: string, planDate: Date, warehouseId?: string) {
  // Get all DRAFT orders for this freighter
  const draftOrders = await prisma.order.findMany({
    where: {
      created_by: userId,
      status: "DRAFT",
      is_deleted: false,
    },
  });

  if (draftOrders.length === 0) {
    throw new Error("No DRAFT orders to group");
  }

  // Group orders into trips
  const groupedTrips = await groupOrders(draftOrders);

  // Create transport plan (NEW SCHEMA: warehouse + plan_date, no supplier/destination)
  const totalUnits = draftOrders.reduce((sum, o) => sum + o.unit_count, 0);
  
  const plan = await prisma.transportPlan.create({
    data: {
      warehouse_id: warehouseId,
      plan_date: planDate,
      status: "PROPOSED",
      total_trips: groupedTrips.length,
      total_units: totalUnits,
      createdBy: userId,
    },
  });

  // Create trips from grouped orders
  const trips = [];
  for (const grouped of groupedTrips) {
    const trip = await prisma.trip.create({
      data: {
        planId: plan.id,
        departure_location_id: grouped.departure_location_id,
        arrival_location_id: grouped.arrival_location_id,
        loading_time: grouped.loading_time,
        departure_time: grouped.departure_time,
        arrival_time: grouped.arrival_time,
        carrierId: "pending", // Will be assigned later
        status: "PROPOSED",
      },
      include: {
        orders: true,
      },
    });

    // Assign orders to trip
    await prisma.order.updateMany({
      where: {
        id: {
          in: grouped.orders.map((o) => o.id),
        },
      },
      data: {
        trip_id: trip.id,
        status: "GROUPED",
      },
    });

    trips.push(trip);
  }

  return { plan, trips };
}
