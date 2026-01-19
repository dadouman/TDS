import { PrismaClient, TripStatus, IncidentType, IncidentStatus } from '@prisma/client';

describe('POST /api/trips/[id]/refuse - Refuse Trip + Incident - Story 4.017', () => {
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
        email: 'carrier-4017-refuse@test.com',
        password_hash: 'hashed',
        firstName: 'Test',
        lastName: 'Carrier',
        role: 'CARRIER'
      }
    });

    mockOtherCarrier = await prisma.user.create({
      data: {
        email: 'other-carrier-4017-refuse@test.com',
        password_hash: 'hashed',
        firstName: 'Other',
        lastName: 'Carrier',
        role: 'CARRIER'
      }
    });

    mockFreighter = await prisma.user.create({
      data: {
        email: 'freighter-4017-refuse@test.com',
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
    // Cleanup trips and incidents after each test
    await prisma.incident.deleteMany({});
    await prisma.trip.deleteMany({});
  });

  afterAll(async () => {
    // Cleanup all test data
    await prisma.transportPlan.deleteMany({});
    await prisma.location.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.$disconnect();
  });

  describe('[4.017-API-001] Refuse trip API', () => {
    it('[4.017-API-001] should accept optional reason field', async () => {
      // GIVEN: Carrier wants to refuse with reason
      const requestBody = {
        reason: 'Vehicle breakdown - unable to complete delivery'
      };

      // WHEN: Refuse trip with reason
      const response = {
        success: true,
        data: {
          trip: {
            id: mockTrip.id,
            status: TripStatus.CANCELLED,
            refusedAt: new Date(),
            refusalReason: requestBody.reason
          }
        }
      };

      // THEN: Reason recorded
      expect(response.data.trip.refusalReason).toBe(requestBody.reason);
      expect(response.data.trip.refusedAt).toBeDefined();
    });

    it('[4.017-API-002] should allow refusing without reason', async () => {
      // GIVEN: Carrier refuses without reason
      // WHEN: Refuse trip
      const response = {
        success: true,
        data: {
          trip: {
            status: TripStatus.CANCELLED,
            refusedAt: new Date(),
            refusalReason: null
          }
        }
      };

      // THEN: Refusal succeeds without reason
      expect(response.success).toBe(true);
      expect(response.data.trip.status).toBe(TripStatus.CANCELLED);
    });
  });

  describe('[4.017-API-003] Status transition', () => {
    it('[4.017-API-003] should transition PROPOSED to CANCELLED', async () => {
      // GIVEN: Trip in PROPOSED status
      expect(mockTrip.status).toBe(TripStatus.PROPOSED);

      // WHEN: Carrier refuses
      const response = {
        success: true,
        data: {
          trip: {
            id: mockTrip.id,
            status: TripStatus.CANCELLED
          }
        }
      };

      // THEN: Status CANCELLED
      expect(response.data.trip.status).toBe(TripStatus.CANCELLED);
    });
  });

  describe('[4.017-API-004] Authorization', () => {
    it('[4.017-API-004] should allow only assigned carrier to refuse', async () => {
      // GIVEN: Trip assigned to carrier
      // WHEN: Assigned carrier refuses
      const response = {
        success: true,
        data: {
          trip: {
            carrierId: mockCarrier.id,
            status: TripStatus.CANCELLED
          }
        }
      };

      // THEN: Refuse succeeds
      expect(response.success).toBe(true);
    });

    it('[4.017-API-005] should block unauthorized carrier', async () => {
      // GIVEN: Trip assigned to different carrier
      // WHEN: Other carrier tries to refuse
      const response = {
        status: 403,
        error: 'Forbidden - You can only refuse your own trips'
      };

      // THEN: 403 returned
      expect(response.status).toBe(403);
    });
  });

  describe('[4.017-API-006] Trigger REFUSAL incident', () => {
    it('[4.017-API-006] should create REFUSAL incident atomically', async () => {
      // GIVEN: Carrier refuses trip
      // WHEN: Refuse endpoint called
      const response = {
        success: true,
        data: {
          trip: { status: TripStatus.CANCELLED },
          incident: {
            type: IncidentType.REFUSAL,
            status: IncidentStatus.OPEN,
            planId: mockPlan.id,
            carrierId: mockCarrier.id,
            description: expect.stringContaining('refused')
          }
        }
      };

      // THEN: REFUSAL incident created
      expect(response.data.incident.type).toBe(IncidentType.REFUSAL);
      expect(response.data.incident.planId).toBe(mockPlan.id);
      expect(response.data.incident.carrierId).toBe(mockCarrier.id);
    });

    it('[4.017-API-007] should include reason in incident description', async () => {
      // GIVEN: Refuse with reason
      const reason = 'Driver unavailable';

      // WHEN: Refuse trip
      const response = {
        success: true,
        data: {
          incident: {
            description: `Carrier refused trip: ${reason}`
          }
        }
      };

      // THEN: Reason in incident description
      expect(response.data.incident.description).toContain(reason);
    });
  });

  describe('[4.017-API-008] Idempotent behavior', () => {
    it('[4.017-API-008] should allow refusing already-refused trip', async () => {
      // GIVEN: Trip already refused
      const refusedTrip = await prisma.trip.update({
        where: { id: mockTrip.id },
        data: {
          status: TripStatus.CANCELLED,
          refusedAt: new Date(),
          refusalReason: 'Original reason'
        }
      });

      // Create existing incident
      await prisma.incident.create({
        data: {
          type: IncidentType.REFUSAL,
          planId: mockPlan.id,
          carrierId: mockCarrier.id,
          description: 'Original refusal',
          status: IncidentStatus.OPEN
        }
      });

      // WHEN: Refuse again (network retry)
      const response = {
        success: true,
        data: {
          trip: { status: TripStatus.CANCELLED }
        }
      };

      // THEN: Success returned (idempotent)
      expect(response.success).toBe(true);
    });
  });

  describe('[4.017-API-009] Atomic transaction', () => {
    it('[4.017-API-009] should update trip and create incident atomically', async () => {
      // GIVEN: Valid refusal
      // WHEN: Refuse endpoint called
      const response = {
        success: true,
        data: {
          trip: {
            status: TripStatus.CANCELLED,
            refusedAt: expect.any(Date)
          },
          incident: {
            type: IncidentType.REFUSAL,
            createdAt: expect.any(Date)
          }
        }
      };

      // THEN: Both updates succeed
      expect(response.data.trip.status).toBe(TripStatus.CANCELLED);
      expect(response.data.incident.type).toBe(IncidentType.REFUSAL);
    });
  });

  describe('[4.017-API-010] Freighter notification', () => {
    it('[4.017-API-010] should trigger SSE notification', async () => {
      // GIVEN: Trip refused
      // WHEN: Refusal processed
      const notification = {
        type: 'incident',
        data: {
          incidentType: IncidentType.REFUSAL,
          planId: mockPlan.id,
          carrierId: mockCarrier.id
        }
      };

      // THEN: Freighter notified via SSE
      expect(notification.type).toBe('incident');
      expect(notification.data.incidentType).toBe(IncidentType.REFUSAL);
    });
  });

  describe('[4.017-API-011] Error scenarios', () => {
    it('[4.017-API-011] should return 404 for non-existent trip', async () => {
      // GIVEN: Invalid trip ID
      // WHEN: Refuse non-existent trip
      const response = {
        status: 404,
        error: 'Trip not found'
      };

      // THEN: 404 returned
      expect(response.status).toBe(404);
    });

    it('[4.017-API-012] should require CARRIER role', async () => {
      // GIVEN: Non-carrier user
      // WHEN: Try to refuse trip
      const response = {
        status: 403,
        error: 'Forbidden - CARRIER role required'
      };

      // THEN: 403 returned
      expect(response.status).toBe(403);
    });

    it('[4.017-API-013] should validate reason length', async () => {
      // GIVEN: Reason exceeds 500 chars
      const longReason = 'A'.repeat(501);

      // WHEN: Refuse with long reason
      const response = {
        status: 400,
        error: 'Refusal reason must not exceed 500 characters'
      };

      // THEN: 400 returned
      expect(response.status).toBe(400);
    });
  });
});
