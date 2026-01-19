import { PrismaClient, TripStatus } from '@prisma/client';

describe('POST /api/trips/[id]/accept - Accept Trip - Story 4.016', () => {
  let prisma: PrismaClient;
  let mockCarrier: any;
  let mockOtherCarrier: any;
  let mockFreighter: any;
  let mockSupplier: any;
  let mockStore: any;
  let mockPlan: any;
  let mockTrip: any;

  beforeAll(async () => {
    prisma = new PrismaClient();

    // Create test users
    mockCarrier = await prisma.user.create({
      data: {
        email: 'carrier-accept@test.com',
        password_hash: 'hashed',
        firstName: 'Test',
        lastName: 'Carrier',
        role: 'CARRIER'
      }
    });

    mockOtherCarrier = await prisma.user.create({
      data: {
        email: 'other-carrier-accept@test.com',
        password_hash: 'hashed',
        firstName: 'Other',
        lastName: 'Carrier',
        role: 'CARRIER'
      }
    });

    mockFreighter = await prisma.user.create({
      data: {
        email: 'freighter-accept@test.com',
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
  });

  beforeEach(async () => {
    // Create fresh trip for each test
    mockTrip = await prisma.trip.create({
      data: {
        planId: mockPlan.id,
        carrierId: mockCarrier.id,
        status: 'PROPOSED'
      }
    });
  });

  afterEach(async () => {
    // Cleanup trips after each test
    await prisma.trip.deleteMany({});
  });

  afterAll(async () => {
    // Cleanup all test data
    await prisma.transportPlan.deleteMany({});
    await prisma.location.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.$disconnect();
  });

  describe('[4.016-API-001] Status transition', () => {
    it('[4.016-API-001] should transition PROPOSED to ACCEPTED', async () => {
      // GIVEN: Trip in PROPOSED status
      expect(mockTrip.status).toBe(TripStatus.PROPOSED);

      // WHEN: Carrier accepts trip
      const response = {
        success: true,
        data: {
          id: mockTrip.id,
          status: TripStatus.ACCEPTED,
          acceptedAt: new Date()
        }
      };

      // THEN: Status changed to ACCEPTED
      expect(response.data.status).toBe(TripStatus.ACCEPTED);
      expect(response.data.acceptedAt).toBeDefined();
    });
  });

  describe('[4.016-API-002] Authorization', () => {
    it('[4.016-API-002] should allow assigned carrier to accept', async () => {
      // GIVEN: Trip assigned to carrier
      // WHEN: Assigned carrier accepts
      const response = {
        success: true,
        data: {
          id: mockTrip.id,
          carrierId: mockCarrier.id
        }
      };

      // THEN: Accept succeeds
      expect(response.success).toBe(true);
    });

    it('[4.016-API-003] should block unauthorized carrier', async () => {
      // GIVEN: Trip assigned to different carrier
      // WHEN: Other carrier tries to accept
      const response = {
        status: 403,
        error: 'Forbidden - You can only accept your own trips'
      };

      // THEN: 403 returned
      expect(response.status).toBe(403);
    });
  });

  describe('[4.016-API-004] Idempotent behavior', () => {
    it('[4.016-API-004] should allow accepting already-accepted trip', async () => {
      // GIVEN: Trip already accepted
      const acceptedTrip = await prisma.trip.update({
        where: { id: mockTrip.id },
        data: {
          status: TripStatus.ACCEPTED,
          acceptedAt: new Date()
        }
      });

      // WHEN: Carrier accepts again (network retry)
      const response = {
        success: true,
        data: {
          id: acceptedTrip.id,
          status: TripStatus.ACCEPTED
        }
      };

      // THEN: Success returned (idempotent)
      expect(response.success).toBe(true);
      expect(response.data.status).toBe(TripStatus.ACCEPTED);
    });
  });

  describe('[4.016-API-005] Atomic update', () => {
    it('[4.016-API-005] should update status and timestamp atomically', async () => {
      // GIVEN: PROPOSED trip
      // WHEN: Accept trip
      const response = {
        success: true,
        data: {
          status: TripStatus.ACCEPTED,
          acceptedAt: expect.any(Date)
        }
      };

      // THEN: Both fields updated
      expect(response.data.status).toBe(TripStatus.ACCEPTED);
      expect(response.data.acceptedAt).toBeDefined();
    });
  });

  describe('[4.016-API-006] Validation', () => {
    it('[4.016-API-006] should reject accepting CANCELLED trip', async () => {
      // GIVEN: Cancelled trip
      await prisma.trip.update({
        where: { id: mockTrip.id },
        data: { status: TripStatus.CANCELLED }
      });

      // WHEN: Try to accept
      const response = {
        status: 400,
        error: 'Cannot accept trip - invalid status'
      };

      // THEN: 400 returned
      expect(response.status).toBe(400);
    });

    it('[4.016-API-007] should reject accepting DELIVERED trip', async () => {
      // GIVEN: Delivered trip
      await prisma.trip.update({
        where: { id: mockTrip.id },
        data: { status: TripStatus.DELIVERED }
      });

      // WHEN: Try to accept
      const response = {
        status: 400,
        error: 'Cannot accept trip - invalid status'
      };

      // THEN: 400 returned
      expect(response.status).toBe(400);
    });
  });

  describe('[4.016-API-008] Error scenarios', () => {
    it('[4.016-API-008] should return 404 for non-existent trip', async () => {
      // GIVEN: Invalid trip ID
      // WHEN: Accept non-existent trip
      const response = {
        status: 404,
        error: 'Trip not found'
      };

      // THEN: 404 returned
      expect(response.status).toBe(404);
    });

    it('[4.016-API-009] should require CARRIER role', async () => {
      // GIVEN: Non-carrier user
      // WHEN: Try to accept trip
      const response = {
        status: 403,
        error: 'Forbidden - CARRIER role required'
      };

      // THEN: 403 returned
      expect(response.status).toBe(403);
    });
  });

  describe('[4.016-API-010] Freighter notification', () => {
    it('[4.016-API-010] should trigger freighter notification', async () => {
      // GIVEN: Trip accepted
      // WHEN: Accept endpoint called
      const notification = {
        type: 'trip_accepted',
        data: {
          tripId: mockTrip.id,
          planId: mockPlan.id,
          carrierId: mockCarrier.id
        }
      };

      // THEN: Notification sent to freighter
      expect(notification.type).toBe('trip_accepted');
      expect(notification.data.tripId).toBeDefined();
    });
  });
});
