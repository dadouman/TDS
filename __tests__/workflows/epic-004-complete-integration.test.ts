import { PrismaClient } from "@prisma/client";
import { generateTransportPlan } from "@/lib/services/tripGroupingService";

const prisma = new PrismaClient();

describe("EPIC-004: Commandes → Trajets → Plans Transport", () => {
  let testFreighterId: string;
  let testLocationAId: string;
  let testLocationBId: string;
  let testLocationCId: string;

  beforeAll(async () => {
    // Create test freighter user
    const freighter = await prisma.user.create({
      data: {
        email: `freighter-${Date.now()}@test.com`,
        password_hash: "hashed_password",
        firstName: "Test",
        lastName: "Freighter",
        role: "FREIGHTER",
      },
    });
    testFreighterId = freighter.id;

    // Create test locations
    const locA = await prisma.location.create({
      data: {
        name: "Supplier Paris",
        type: "SUPPLIER",
        address: "Paris, France",
      },
    });
    testLocationAId = locA.id;

    const locB = await prisma.location.create({
      data: {
        name: "Store Marseille",
        type: "STORE",
        address: "Marseille, France",
      },
    });
    testLocationBId = locB.id;

    const locC = await prisma.location.create({
      data: {
        name: "Store Lyon",
        type: "STORE",
        address: "Lyon, France",
      },
    });
    testLocationCId = locC.id;
  });

  afterAll(async () => {
    // Cleanup
    await prisma.order.deleteMany({ where: { created_by: testFreighterId } });
    await prisma.trip.deleteMany({});
    await prisma.transportPlan.deleteMany({});
    await prisma.user.delete({ where: { id: testFreighterId } });
    await prisma.location.deleteMany({});
  });

  describe("Scenario 1: Happy Path - Créer 3 Orders, Grouper en 1 Trajet", () => {
    test("Should create 3 DRAFT orders with same departure/arrival", async () => {
      const now = new Date();
      const loadingDate1 = new Date(now.getTime() + 2 * 60 * 60 * 1000); // +2h
      const loadingDate2 = new Date(now.getTime() + 2.5 * 60 * 60 * 1000); // +2.5h
      const loadingDate3 = new Date(now.getTime() + 1.5 * 60 * 60 * 1000); // +1.5h

      // Create orders
      const order1 = await prisma.order.create({
        data: {
          departure_location_id: testLocationAId,
          arrival_location_id: testLocationBId,
          loading_date: loadingDate1,
          unit_count: 10,
          created_by: testFreighterId,
          status: "DRAFT",
        },
      });

      const order2 = await prisma.order.create({
        data: {
          departure_location_id: testLocationAId,
          arrival_location_id: testLocationBId,
          loading_date: loadingDate2,
          unit_count: 15,
          created_by: testFreighterId,
          status: "DRAFT",
        },
      });

      const order3 = await prisma.order.create({
        data: {
          departure_location_id: testLocationAId,
          arrival_location_id: testLocationBId,
          loading_date: loadingDate3,
          unit_count: 5,
          created_by: testFreighterId,
          status: "DRAFT",
        },
      });

      // Verify orders exist
      expect(order1.status).toBe("DRAFT");
      expect(order2.status).toBe("DRAFT");
      expect(order3.status).toBe("DRAFT");

      const orders = await prisma.order.findMany({
        where: { created_by: testFreighterId },
      });
      expect(orders).toHaveLength(3);
      expect(orders.every((o) => o.status === "DRAFT")).toBe(true);
    });

    test("Should group orders into 1 trip automatically", async () => {
      const { plan, trips } = await generateTransportPlan(
        testFreighterId,
        new Date()
      );

      // Verify plan created
      expect(plan.status).toBe("PROPOSED");
      expect(plan.total_trips).toBe(1);
      expect(plan.total_units).toBe(30); // 10+15+5

      // Verify trip created
      expect(trips).toHaveLength(1);
      const trip = trips[0];
      expect(trip.status).toBe("PROPOSED");
      expect(trip.departure_location_id).toBe(testLocationAId);
      expect(trip.arrival_location_id).toBe(testLocationBId);
      expect(trip.orders).toHaveLength(3);

      // Verify times are coherent
      expect(trip.loading_time).toBeLessThanOrEqual(trip.departure_time);
      expect(trip.departure_time).toBeLessThanOrEqual(trip.arrival_time);
    });

    test("Should update orders to GROUPED status", async () => {
      const orders = await prisma.order.findMany({
        where: { created_by: testFreighterId },
      });

      // All orders should be GROUPED now
      expect(orders.every((o) => o.status === "GROUPED")).toBe(true);

      // All orders should have trip_id assigned
      expect(orders.every((o) => o.trip_id)).toBe(true);
    });

    test("Should have coherent dates: loading_date < loading_time < departure_time < arrival_time", async () => {
      const orders = await prisma.order.findMany({
        where: { created_by: testFreighterId },
        include: { trip: true },
      });

      const trip = orders[0].trip!;

      for (const order of orders) {
        const loadingDate = new Date(order.loading_date);
        const loadingTime = new Date(trip.loading_time!);
        const departureTime = new Date(trip.departure_time!);
        const arrivalTime = new Date(trip.arrival_time!);

        // Validate order loading_date is BEFORE trip loading_time
        expect(loadingDate.getTime()).toBeLessThanOrEqual(
          loadingTime.getTime()
        );
        // Validate trip times are coherent
        expect(loadingTime.getTime()).toBeLessThanOrEqual(
          departureTime.getTime()
        );
        expect(departureTime.getTime()).toBeLessThanOrEqual(
          arrivalTime.getTime()
        );
      }
    });
  });

  describe("Scenario 2: Carrier accepts trip → orders become ASSIGNED", () => {
    let carrierId: string;
    let tripId: string;

    beforeAll(async () => {
      // Create carrier user
      const carrier = await prisma.user.create({
        data: {
          email: `carrier-${Date.now()}@test.com`,
          password_hash: "hashed_password",
          firstName: "Test",
          lastName: "Carrier",
          role: "CARRIER",
        },
      });
      carrierId = carrier.id;

      // Get the trip from previous scenario
      const trip = await prisma.trip.findFirst({
        where: { status: "PROPOSED" },
      });
      tripId = trip!.id;
    });

    test("Should accept trip and update carrier", async () => {
      const trip = await prisma.trip.update({
        where: { id: tripId },
        data: {
          carrierId: carrierId,
          status: "ACCEPTED",
          acceptedAt: new Date(),
        },
      });

      expect(trip.status).toBe("ACCEPTED");
      expect(trip.carrierId).toBe(carrierId);
      expect(trip.acceptedAt).toBeTruthy();
    });

    test("Should update all orders in trip to ASSIGNED", async () => {
      const orders = await prisma.order.findMany({
        where: { trip_id: tripId },
      });

      for (const order of orders) {
        await prisma.order.update({
          where: { id: order.id },
          data: { status: "ASSIGNED" },
        });
      }

      const updatedOrders = await prisma.order.findMany({
        where: { trip_id: tripId },
      });

      expect(updatedOrders.every((o) => o.status === "ASSIGNED")).toBe(true);
    });

    test("Should maintain traceability: Order → Trip → Plan", async () => {
      const order = await prisma.order.findFirst({
        where: { trip_id: tripId },
        include: { trip: { include: { plan: true } } },
      });

      expect(order).toBeTruthy();
      expect(order!.trip).toBeTruthy();
      expect(order!.trip!.plan).toBeTruthy();
      expect(order!.trip!.plan!.status).toBe("PROPOSED");
    });
  });

  describe("Scenario 3: Carrier refuses trip → orders revert to GROUPED", () => {
    test("Should refuse trip and reset orders to GROUPED", async () => {
      // Create new orders for refusal scenario
      const now = new Date();
      const order = await prisma.order.create({
        data: {
          departure_location_id: testLocationBId,
          arrival_location_id: testLocationCId,
          loading_date: new Date(now.getTime() + 3 * 60 * 60 * 1000),
          unit_count: 20,
          created_by: testFreighterId,
          status: "DRAFT",
        },
      });

      const { plan, trips } = await generateTransportPlan(
        testFreighterId,
        new Date()
      );

      const trip = trips[trips.length - 1]; // Get newly created trip

      // Refuse trip
      await prisma.trip.update({
        where: { id: trip.id },
        data: {
          status: "CANCELLED",
          refusedAt: new Date(),
          refusalReason: "Carrier capacity exceeded",
        },
      });

      // Reset orders to GROUPED
      await prisma.order.updateMany({
        where: { trip_id: trip.id },
        data: { status: "GROUPED" },
      });

      const updatedOrders = await prisma.order.findMany({
        where: { trip_id: trip.id },
      });

      expect(updatedOrders.every((o) => o.status === "GROUPED")).toBe(true);

      const updatedTrip = await prisma.trip.findUnique({
        where: { id: trip.id },
      });
      expect(updatedTrip!.status).toBe("CANCELLED");
      expect(updatedTrip!.refusalReason).toBe("Carrier capacity exceeded");
    });
  });

  describe("Scenario 4: Plan archival after 2 years", () => {
    test("Should archive old plan to TransportPlanArchive", async () => {
      // Get the plan from scenario 1
      const plan = await prisma.transportPlan.findFirst({
        where: { createdBy: testFreighterId },
      });

      expect(plan).toBeTruthy();

      // Archive it
      const archived = await prisma.transportPlanArchive.create({
        data: {
          original_plan_id: plan!.id,
          warehouse_id: plan!.warehouse_id,
          plan_date: plan!.plan_date,
          status: plan!.status,
          total_trips: plan!.total_trips,
          total_units: plan!.total_units,
          version: plan!.version,
          retention_date: new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000), // 2 years
          original_data: JSON.stringify(plan),
          createdAt: plan!.createdAt,
          is_deleted: false,
        },
      });

      expect(archived).toBeTruthy();
      expect(archived.original_plan_id).toBe(plan!.id);
      expect(archived.retention_date).toBeTruthy();
    });

    test("Should query archive for historical analysis", async () => {
      const archived = await prisma.transportPlanArchive.findMany({
        where: {
          retention_date: {
            gte: new Date(), // Not yet expired
          },
        },
        orderBy: { archived_at: "desc" },
      });

      expect(archived.length).toBeGreaterThan(0);
    });
  });

  describe("Metrics Validation", () => {
    test("Should calculate correct total_units in plan", async () => {
      const plan = await prisma.transportPlan.findFirst({
        where: { createdBy: testFreighterId },
        include: {
          trips: {
            include: {
              orders: true,
            },
          },
        },
      });

      if (plan && plan.trips.length > 0) {
        const calculatedUnits = plan.trips.reduce((sum, trip) => {
          return sum + trip.orders.reduce((s, o) => s + o.unit_count, 0);
        }, 0);

        expect(plan.total_units).toBe(calculatedUnits);
      }
    });

    test("Should match total_trips count", async () => {
      const plan = await prisma.transportPlan.findFirst({
        where: { createdBy: testFreighterId },
        include: { trips: true },
      });

      if (plan) {
        expect(plan.total_trips).toBe(plan.trips.length);
      }
    });
  });

  describe("Error Handling", () => {
    test("Should reject orders with same departure and arrival", async () => {
      expect(async () => {
        await prisma.order.create({
          data: {
            departure_location_id: testLocationAId,
            arrival_location_id: testLocationAId, // Same!
            loading_date: new Date(),
            unit_count: 10,
            created_by: testFreighterId,
            status: "DRAFT",
          },
        });
      }).toThrow();
    });

    test("Should reject orders with unit_count <= 0", async () => {
      expect(async () => {
        await prisma.order.create({
          data: {
            departure_location_id: testLocationAId,
            arrival_location_id: testLocationBId,
            loading_date: new Date(),
            unit_count: -5, // Invalid!
            created_by: testFreighterId,
            status: "DRAFT",
          },
        });
      }).toThrow();
    });
  });
});
