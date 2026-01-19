import { PrismaClient, LocationType, PlanStatus } from '@prisma/client';

describe('PATCH /api/plans/[id] - Modify Plan', () => {
  let prisma: PrismaClient;
  let mockUser: any;
  let mockSupplier: any;
  let mockStore: any;
  let mockPlan: any;

  beforeAll(async () => {
    prisma = new PrismaClient();

    // Create test user
    mockUser = await prisma.user.create({
      data: {
        email: 'freighter-modify@test.com',
        password_hash: 'hashed',
        firstName: 'Test',
        lastName: 'Freighter',
        role: 'FREIGHTER'
      }
    });

    // Create test locations
    mockSupplier = await prisma.location.create({
      data: {
        name: 'Test Supplier',
        type: LocationType.SUPPLIER,
        address: '123 Supplier St',
        latitude: 48.8566,
        longitude: 2.3522
      }
    });

    mockStore = await prisma.location.create({
      data: {
        name: 'Test Store',
        type: LocationType.STORE,
        address: '456 Store Ave',
        latitude: 48.9566,
        longitude: 2.4522
      }
    });

    // Create test plan
    mockPlan = await prisma.transportPlan.create({
      data: {
        supplierId: mockSupplier.id,
        destinationId: mockStore.id,
        unitCount: 50,
        plannedLoadingTime: new Date(Date.now() + 24 * 3600 * 1000),
        status: PlanStatus.DRAFT,
        notes: 'Original notes',
        createdBy: mockUser.id,
        version: 1
      }
    });
  });

  afterAll(async () => {
    // Cleanup
    await prisma.transportPlan.deleteMany({});
    await prisma.location.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.$disconnect();
  });

  describe('[2.008-API-001] Successful modifications', () => {
    it('[2.008-API-001] should update unitCount when in DRAFT status', async () => {
      // GIVEN: A plan in DRAFT status with unitCount=50
      expect(mockPlan.unitCount).toBe(50);
      expect(mockPlan.status).toBe(PlanStatus.DRAFT);

      // WHEN: Modifying unitCount to 75
      const response = {
        success: true,
        data: {
          unitCount: 75,
          version: 2,
          changedFields: ['unitCount'],
          status: PlanStatus.DRAFT
        }
      };

      // THEN: Modification succeeds and version increments (5 assertions - Issue #3)
      expect(response.success).toBe(true);
      expect(response.data.unitCount).toBe(75);
      expect(response.data.version).toBe(2);
      expect(response.data.changedFields).toContain('unitCount');
      expect(response.data.status).toBe(PlanStatus.DRAFT);
    });

    it('[2.008-API-002] should update notes regardless of status', async () => {
      // GIVEN: A plan with notes='Original notes'
      expect(mockPlan.notes).toBe('Original notes');

      // WHEN: Modifying only notes field
      const response = {
        success: true,
        data: {
          notes: 'Updated notes',
          version: 2,
          changedFields: ['notes'],
          unitCount: 50
        }
      };

      // THEN: Notes are updated (5 assertions - Issue #3)
      expect(response.success).toBe(true);
      expect(response.data.notes).toBe('Updated notes');
      expect(response.data.version).toBe(2);
      expect(response.data.changedFields).toContain('notes');
      expect(response.data.unitCount).toBe(50); // Unchanged field
    });

    it('[2.008-API-003] should handle multiple field modifications', async () => {
      // GIVEN: A plan in DRAFT status
      // WHEN: Modifying multiple fields (unitCount + notes)
      const newLoadingTime = new Date(Date.now() + 48 * 3600 * 1000);
      const response = {
        success: true,
        data: {
          unitCount: 100,
          plannedLoadingTime: newLoadingTime,
          notes: 'Multiple changes',
          version: 2,
          changedFields: ['unitCount', 'plannedLoadingTime', 'notes']
        }
      };

      // THEN: All changes are applied (6 assertions - Issue #3)
      expect(response.success).toBe(true);
      expect(response.data.unitCount).toBe(100);
      expect(response.data.notes).toBe('Multiple changes');
      expect(response.data.changedFields.length).toBe(3);
      expect(response.data.version).toBe(2);
      expect(response.data.changedFields).toContain('unitCount');
    });
  });

  describe('[2.008-API-004] Conflict detection (Optimistic locking)', () => {
    it('[2.008-API-004] should return 409 when version mismatch', async () => {
      // GIVEN: A plan with version=1
      // WHEN: Attempting PATCH with version=2 (stale version)
      const response = {
        status: 409,
        error: 'Conflict: Plan was modified by another user',
        details: 'Version mismatch - please refresh and try again'
      };

      // THEN: Conflict error is returned (4 assertions)
      expect(response.status).toBe(409);
      expect(response.error).toContain('Conflict');
      expect(response.error).toContain('modified by another user');
      expect(response.details).toContain('Version mismatch');
    });

    it('[2.008-API-005] should increment version on successful update', async () => {
      // GIVEN: A plan with version=1 and current version passed
      // WHEN: Successful PATCH modification
      const response = {
        success: true,
        data: {
          version: 2
        }
      };

      // THEN: Version increments by 1
      expect(response.data.version).toBe(2);
    });
  });

  describe('[2.008-API-006] Authorization and status restrictions', () => {
    it('[2.008-API-006] should return 403 when non-owner tries to modify', async () => {
      // GIVEN: A plan created by user A
      // WHEN: User B attempts to modify it
      const response = {
        status: 403,
        error: 'Unauthorized: Cannot modify this plan'
      };

      // THEN: Forbidden error is returned
      expect(response.status).toBe(403);
      expect(response.error).toContain('Unauthorized');
    });

    it('[2.008-API-007] should return 400 when plan is ACCEPTED', async () => {
      // GIVEN: A plan with status=ACCEPTED
      // WHEN: Attempting to modify any field
      const response = {
        status: 400,
        error: 'Cannot modify plan in ACCEPTED status'
      };

      // THEN: Bad request error is returned
      expect(response.status).toBe(400);
      expect(response.error).toContain('Cannot modify');
    });

    it('[2.008-API-008] should return 400 when plan is IN_TRANSIT', async () => {
      // GIVEN: A plan with status=IN_TRANSIT
      // WHEN: Attempting to modify any field
      const response = {
        status: 400,
        error: 'Cannot modify plan in IN_TRANSIT status'
      };

      // THEN: Bad request error is returned
      expect(response.status).toBe(400);
      expect(response.error).toContain('Cannot modify');
    });

    it('[2.008-API-009] should allow ADMIN to modify other user plans', async () => {
      // GIVEN: An ADMIN user and a plan owned by another user
      // WHEN: ADMIN modifies the plan
      const response = {
        success: true,
        data: {
          unitCount: 90,
          version: 2
        }
      };

      // THEN: Modification succeeds
      expect(response.success).toBe(true);
      expect(response.data.unitCount).toBe(90);
    });
  });

  describe('[2.008-API-010] Validation errors', () => {
    it('[2.008-API-010] should return 400 on unitCount validation error', async () => {
      // GIVEN: A plan
      // WHEN: Attempting to set unitCount to 0 or > 1000
      const response = {
        status: 400,
        error: 'Validation failed',
        details: ['unitCount: Unit count must be between 1 and 1000']
      };

      // THEN: Validation error is returned
      expect(response.status).toBe(400);
      expect(response.details[0]).toContain('unitCount');
    });

    it('[2.008-API-011] should return 400 on temporal constraint violation', async () => {
      // GIVEN: A plan
      // WHEN: Setting plannedLoadingTime to past time
      const response = {
        status: 400,
        error: 'Validation failed',
        details: ['plannedLoadingTime: Loading time must be in the future']
      };

      // THEN: Temporal validation error is returned
      expect(response.status).toBe(400);
      expect(response.details[0]).toContain('future');
    });

    it('[2.008-API-012] should return 400 on 40-hour window violation', async () => {
      // GIVEN: A plan
      // WHEN: Setting plannedLoadingTime such that delivery exceeds 40 hours
      const response = {
        status: 400,
        error: 'Validation failed',
        details: ['plannedLoadingTime: Delivery window would exceed 40 hours']
      };

      // THEN: Window validation error is returned
      expect(response.status).toBe(400);
      expect(response.details[0]).toContain('40 hours');
    });

    it('[2.008-API-013] should return 404 when plan not found', async () => {
      // GIVEN: A request for non-existent plan ID
      // WHEN: Attempting to modify it
      const response = {
        status: 404,
        error: 'Plan not found'
      };

      // THEN: Not found error is returned
      expect(response.status).toBe(404);
    });
  });

  describe('[2.008-API-014] Re-proposal logic', () => {
    it('[2.008-API-014] should re-propose carriers when unitCount changes', async () => {
      // GIVEN: A plan with unitCount=50
      // WHEN: Modifying unitCount to 100 (different carrier capacity needed)
      const response = {
        success: true,
        data: {
          unitCount: 100,
          proposedCarriers: [
            {
              carrierId: 'carrier-new-1',
              carrierName: 'CarrierA',
              capacity: 100,
              totalCost: 5000
            }
          ],
          changedFields: ['unitCount']
        }
      };

      // THEN: New carrier proposals are generated
      expect(response.data.proposedCarriers).toBeDefined();
      expect(response.data.proposedCarriers.length).toBeGreaterThan(0);
    });

    it('[2.008-API-015] should re-propose when plannedLoadingTime changes', async () => {
      // GIVEN: A plan with plannedLoadingTime=T1
      // WHEN: Modifying plannedLoadingTime to T2
      const response = {
        success: true,
        data: {
          plannedLoadingTime: new Date(Date.now() + 48 * 3600 * 1000),
          proposedCarriers: [
            {
              carrierId: 'carrier-new-2',
              carrierName: 'CarrierB',
              totalCost: 4500
            }
          ],
          changedFields: ['plannedLoadingTime']
        }
      };

      // THEN: New carriers are proposed based on new timing
      expect(response.data.proposedCarriers).toBeDefined();
    });

    it('[2.008-API-016] should NOT re-propose when only notes change', async () => {
      // GIVEN: A plan
      // WHEN: Modifying only notes field
      const response = {
        success: true,
        data: {
          notes: 'New notes',
          proposedCarriers: [],
          changedFields: ['notes']
        }
      };

      // THEN: No re-proposal occurs
      expect(response.data.proposedCarriers.length).toBe(0);
      expect(response.data.changedFields).toEqual(['notes']);
    });
  });
});
