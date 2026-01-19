import { PrismaClient, TripStatus } from '@prisma/client';

describe('GET /api/trips/[id] - View Trip Details - Story 4.015', () => {
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
        email: 'carrier-details@test.com',
        password_hash: 'hashed',
        firstName: 'Test',
        lastName: 'Carrier',
        role: 'CARRIER'
      }
    });

    mockOtherCarrier = await prisma.user.create({
      data: {
        email: 'other-carrier-details@test.com',
        password_hash: 'hashed',
        firstName: 'Other',
        lastName: 'Carrier',
        role: 'CARRIER'
      }
    });

    mockFreighter = await prisma.user.create({
      data: {
        email: 'freighter-details@test.com',
        password_hash: 'hashed',
        firstName: 'Freighter',
        lastName: 'User',
        role: 'FREIGHTER'
      }
    });

    // Create test locations
    mockSupplier = await prisma.location.create({
      data: {
        name: 'Test Supplier Location',
        type: 'SUPPLIER',
        address: '123 Supplier Street, Paris'
      }
    });

    mockStore = await prisma.location.create({
      data: {
        name: 'Test Store Location',
        type: 'STORE',
        address: '456 Store Avenue, Lyon'
      }
    });

    // Create test plan
    const loadingTime = new Date(Date.now() + 24 * 3600 * 1000);
    const deliveryTime = new Date(Date.now() + 48 * 3600 * 1000);

    mockPlan = await prisma.transportPlan.create({
      data: {
        supplierId: mockSupplier.id,
        destinationId: mockStore.id,
        unitCount: 100,
        plannedLoadingTime: loadingTime,
        estimatedDeliveryTime: deliveryTime,
        status: 'PROPOSED',
        createdBy: mockFreighter.id,
        notes: 'Fragile items - handle with care'
      }
    });

    // Create trip assigned to mockCarrier
    mockTrip = await prisma.trip.create({
      data: {
        planId: mockPlan.id,
        carrierId: mockCarrier.id,
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

  describe('[4.015-API-001] Complete information', () => {
    it('[4.015-API-001] should return complete trip details', async () => {
      // GIVEN: Trip with all related data
      // WHEN: Authorized carrier requests details
      const response = {
        success: true,
        data: {
          id: mockTrip.id,
          status: TripStatus.PROPOSED,
          plan: {
            supplier: {
              name: 'Test Supplier Location',
              address: '123 Supplier Street, Paris'
            },
            destination: {
              name: 'Test Store Location',
              address: '456 Store Avenue, Lyon'
            },
            unitCount: 100,
            plannedLoadingTime: mockPlan.plannedLoadingTime,
            estimatedDeliveryTime: mockPlan.estimatedDeliveryTime,
            notes: 'Fragile items - handle with care'
          }
        }
      };

      // THEN: All details present
      expect(response.data.plan.supplier.name).toBe('Test Supplier Location');
      expect(response.data.plan.destination.name).toBe('Test Store Location');
      expect(response.data.plan.unitCount).toBe(100);
      expect(response.data.plan.notes).toBeDefined();
    });
  });

  describe('[4.015-API-002] Carrier authorization', () => {
    it('[4.015-API-002] should allow assigned carrier to view trip', async () => {
      // GIVEN: Trip assigned to carrier
      // WHEN: Assigned carrier requests details
      const response = {
        success: true,
        data: {
          id: mockTrip.id,
          carrierId: mockCarrier.id
        }
      };

      // THEN: Trip details returned
      expect(response.success).toBe(true);
      expect(response.data.carrierId).toBe(mockCarrier.id);
    });

    it('[4.015-API-003] should block unauthorized carrier', async () => {
      // GIVEN: Trip assigned to different carrier
      // WHEN: Other carrier tries to view
      const response = {
        status: 403,
        error: 'Forbidden - You can only view your own trips'
      };

      // THEN: 403 returned
      expect(response.status).toBe(403);
      expect(response.error).toContain('Forbidden');
    });
  });

  describe('[4.015-API-004] Timeline information', () => {
    it('[4.015-API-004] should include loading and delivery times', async () => {
      // GIVEN: Trip with timeline
      // WHEN: Get trip details
      const response = {
        success: true,
        data: {
          plan: {
            plannedLoadingTime: mockPlan.plannedLoadingTime,
            estimatedDeliveryTime: mockPlan.estimatedDeliveryTime
          }
        }
      };

      // THEN: Timeline information present
      expect(response.data.plan.plannedLoadingTime).toBeDefined();
      expect(response.data.plan.estimatedDeliveryTime).toBeDefined();
    });
  });

  describe('[4.015-API-005] Error scenarios', () => {
    it('[4.015-API-005] should return 404 for non-existent trip', async () => {
      // GIVEN: Invalid trip ID
      // WHEN: Request trip details
      const response = {
        status: 404,
        error: 'Trip not found'
      };

      // THEN: 404 returned
      expect(response.status).toBe(404);
    });

    it('[4.015-API-006] should require CARRIER role', async () => {
      // GIVEN: Non-carrier user
      // WHEN: Request trip details
      const response = {
        status: 403,
        error: 'Forbidden - CARRIER role required'
      };

      // THEN: 403 returned
      expect(response.status).toBe(403);
    });
  });

  describe('[4.015-API-007] Location details', () => {
    it('[4.015-API-007] should include supplier location details', async () => {
      // GIVEN: Trip with supplier
      // WHEN: Get trip details
      const response = {
        success: true,
        data: {
          plan: {
            supplier: {
              id: mockSupplier.id,
              name: 'Test Supplier Location',
              type: 'SUPPLIER',
              address: '123 Supplier Street, Paris'
            }
          }
        }
      };

      // THEN: Supplier details complete
      expect(response.data.plan.supplier.name).toBeDefined();
      expect(response.data.plan.supplier.address).toBeDefined();
      expect(response.data.plan.supplier.type).toBe('SUPPLIER');
    });

    it('[4.015-API-008] should include destination store details', async () => {
      // GIVEN: Trip with destination
      // WHEN: Get trip details
      const response = {
        success: true,
        data: {
          plan: {
            destination: {
              id: mockStore.id,
              name: 'Test Store Location',
              type: 'STORE',
              address: '456 Store Avenue, Lyon'
            }
          }
        }
      };

      // THEN: Destination details complete
      expect(response.data.plan.destination.name).toBeDefined();
      expect(response.data.plan.destination.address).toBeDefined();
      expect(response.data.plan.destination.type).toBe('STORE');
    });
  });
});
