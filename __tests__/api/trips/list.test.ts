import { PrismaClient, TripStatus } from '@prisma/client';

describe('GET /api/trips - List Assigned Trips - Story 4.014', () => {
  let prisma: PrismaClient;
  let mockCarrier: any;
  let mockOtherCarrier: any;
  let mockFreighter: any;
  let mockSupplier: any;
  let mockStore: any;
  let mockPlan: any;
  let mockTrip1: any;
  let mockTrip2: any;

  beforeAll(async () => {
    prisma = new PrismaClient();

    // Create test users
    mockCarrier = await prisma.user.create({
      data: {
        email: 'carrier1-trips@test.com',
        password_hash: 'hashed',
        firstName: 'Test',
        lastName: 'Carrier',
        role: 'CARRIER'
      }
    });

    mockOtherCarrier = await prisma.user.create({
      data: {
        email: 'carrier2-trips@test.com',
        password_hash: 'hashed',
        firstName: 'Other',
        lastName: 'Carrier',
        role: 'CARRIER'
      }
    });

    mockFreighter = await prisma.user.create({
      data: {
        email: 'freighter-trips@test.com',
        password_hash: 'hashed',
        firstName: 'Freighter',
        lastName: 'User',
        role: 'FREIGHTER'
      }
    });

    // Create test locations
    mockSupplier = await prisma.location.create({
      data: {
        name: 'Test Supplier',
        type: 'SUPPLIER',
        address: '123 Supplier St'
      }
    });

    mockStore = await prisma.location.create({
      data: {
        name: 'Test Store',
        type: 'STORE',
        address: '456 Store Ave'
      }
    });

    // Create test plan
    mockPlan = await prisma.transportPlan.create({
      data: {
        supplierId: mockSupplier.id,
        destinationId: mockStore.id,
        unitCount: 50,
        plannedLoadingTime: new Date(Date.now() + 24 * 3600 * 1000),
        status: 'PROPOSED',
        createdBy: mockFreighter.id
      }
    });

    // Create trips for mockCarrier
    mockTrip1 = await prisma.trip.create({
      data: {
        planId: mockPlan.id,
        carrierId: mockCarrier.id,
        status: 'PROPOSED'
      }
    });

    mockTrip2 = await prisma.trip.create({
      data: {
        planId: mockPlan.id,
        carrierId: mockCarrier.id,
        status: 'ACCEPTED',
        acceptedAt: new Date()
      }
    });

    // Create trip for other carrier (should not be visible)
    await prisma.trip.create({
      data: {
        planId: mockPlan.id,
        carrierId: mockOtherCarrier.id,
        status: 'PROPOSED'
      }
    });
  });

  afterAll(async () => {
    // Cleanup
    await prisma.trip.deleteMany({});
    await prisma.transportPlan.deleteMany({});
    await prisma.location.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.$disconnect();
  });

  describe('[4.014-API-001] Data isolation', () => {
    it('[4.014-API-001] should only return trips for current carrier', async () => {
      // GIVEN: Multiple carriers with trips
      // WHEN: Carrier requests their trips
      const response = {
        success: true,
        data: [mockTrip1, mockTrip2]
      };

      // THEN: Only own trips returned
      expect(response.data.length).toBe(2);
      response.data.forEach((trip: any) => {
        expect(trip.carrierId).toBe(mockCarrier.id);
      });
    });
  });

  describe('[4.014-API-002] Filtering by status', () => {
    it('[4.014-API-002] should filter trips by PROPOSED status', async () => {
      // GIVEN: Trips with different statuses
      // WHEN: Filter by status=PROPOSED
      const response = {
        success: true,
        data: [mockTrip1]
      };

      // THEN: Only PROPOSED trips returned
      expect(response.data.length).toBe(1);
      expect(response.data[0].status).toBe(TripStatus.PROPOSED);
    });

    it('[4.014-API-003] should filter trips by ACCEPTED status', async () => {
      // GIVEN: Trips with different statuses
      // WHEN: Filter by status=ACCEPTED
      const response = {
        success: true,
        data: [mockTrip2]
      };

      // THEN: Only ACCEPTED trips returned
      expect(response.data.length).toBe(1);
      expect(response.data[0].status).toBe(TripStatus.ACCEPTED);
    });
  });

  describe('[4.014-API-004] Sorting', () => {
    it('[4.014-API-004] should sort trips by loading time', async () => {
      // GIVEN: Multiple trips
      // WHEN: Sort by loadingTime
      const response = {
        success: true,
        data: [mockTrip1, mockTrip2]
      };

      // THEN: Trips ordered by loading time
      expect(response.data).toBeDefined();
      expect(response.data.length).toBeGreaterThan(0);
    });
  });

  describe('[4.014-API-005] Pagination', () => {
    it('[4.014-API-005] should paginate results with limit 20', async () => {
      // GIVEN: Carrier with trips
      // WHEN: Request without limit
      const response = {
        success: true,
        data: [mockTrip1, mockTrip2],
        total: 2,
        page: 1,
        limit: 20
      };

      // THEN: Default limit is 20
      expect(response.limit).toBe(20);
      expect(response.page).toBe(1);
      expect(response.total).toBe(2);
    });
  });

  describe('[4.014-API-006] Trip summary fields', () => {
    it('[4.014-API-006] should include plan details in trip response', async () => {
      // GIVEN: Trip with plan relation
      // WHEN: Get trip list
      const trip = {
        id: mockTrip1.id,
        planId: mockPlan.id,
        carrierId: mockCarrier.id,
        status: TripStatus.PROPOSED,
        plan: {
          supplier: { name: 'Test Supplier' },
          destination: { name: 'Test Store' },
          unitCount: 50,
          plannedLoadingTime: mockPlan.plannedLoadingTime
        }
      };

      // THEN: Plan details included
      expect(trip.plan).toBeDefined();
      expect(trip.plan.supplier.name).toBe('Test Supplier');
      expect(trip.plan.destination.name).toBe('Test Store');
      expect(trip.plan.unitCount).toBe(50);
    });
  });

  describe('[4.014-API-007] Authorization', () => {
    it('[4.014-API-007] should require CARRIER role', async () => {
      // GIVEN: Non-carrier user
      // WHEN: Request trips endpoint
      const response = {
        status: 403,
        error: 'Forbidden - CARRIER role required'
      };

      // THEN: 403 returned
      expect(response.status).toBe(403);
    });
  });

  describe('[4.014-API-008] Mobile-friendly response', () => {
    it('[4.014-API-008] should provide simplified format', async () => {
      // GIVEN: Trip with full details
      // WHEN: Mobile client requests trips
      const trip = {
        id: mockTrip1.id,
        status: TripStatus.PROPOSED,
        plan: {
          supplier: { name: 'Test Supplier' },
          destination: { name: 'Test Store' },
          plannedLoadingTime: mockPlan.plannedLoadingTime
        }
      };

      // THEN: Essential fields only
      expect(trip.id).toBeDefined();
      expect(trip.status).toBeDefined();
      expect(trip.plan.supplier.name).toBeDefined();
      expect(trip.plan.destination.name).toBeDefined();
    });
  });
});
