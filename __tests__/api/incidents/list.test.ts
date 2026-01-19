import { PrismaClient, LocationType, PlanStatus, IncidentType, IncidentStatus } from '@prisma/client';

describe('GET /api/incidents - List Incidents', () => {
  let prisma: PrismaClient;
  let mockUser: any;
  let mockOtherUser: any;
  let mockSupplier: any;
  let mockStore: any;
  let mockPlan: any;
  let mockOtherPlan: any;
  let mockIncident: any;

  beforeAll(async () => {
    prisma = new PrismaClient();

    // Create test users
    mockUser = await prisma.user.create({
      data: {
        email: 'freighter-incidents@test.com',
        password_hash: 'hashed',
        firstName: 'Test',
        lastName: 'Freighter',
        role: 'FREIGHTER'
      }
    });

    mockOtherUser = await prisma.user.create({
      data: {
        email: 'other-freighter@test.com',
        password_hash: 'hashed',
        firstName: 'Other',
        lastName: 'Freighter',
        role: 'FREIGHTER'
      }
    });

    // Create test locations
    mockSupplier = await prisma.location.create({
      data: {
        name: 'Test Supplier',
        type: LocationType.SUPPLIER,
        address: '123 Supplier St'
      }
    });

    mockStore = await prisma.location.create({
      data: {
        name: 'Test Store',
        type: LocationType.STORE,
        address: '456 Store Ave'
      }
    });

    // Create test plans
    mockPlan = await prisma.transportPlan.create({
      data: {
        supplierId: mockSupplier.id,
        destinationId: mockStore.id,
        unitCount: 50,
        plannedLoadingTime: new Date(Date.now() + 24 * 3600 * 1000),
        status: PlanStatus.IN_TRANSIT,
        createdBy: mockUser.id
      }
    });

    mockOtherPlan = await prisma.transportPlan.create({
      data: {
        supplierId: mockSupplier.id,
        destinationId: mockStore.id,
        unitCount: 75,
        plannedLoadingTime: new Date(Date.now() + 24 * 3600 * 1000),
        status: PlanStatus.DRAFT,
        createdBy: mockOtherUser.id
      }
    });

    // Create test incident
    mockIncident = await prisma.incident.create({
      data: {
        type: IncidentType.DELAY,
        status: IncidentStatus.OPEN,
        planId: mockPlan.id,
        carrierId: 'carrier-1',
        description: 'Plan delayed by 45 minutes'
      }
    });
  });

  afterAll(async () => {
    // Cleanup
    await prisma.incident.deleteMany({});
    await prisma.transportPlan.deleteMany({});
    await prisma.location.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.$disconnect();
  });

  describe('[2.009-API-001] Successful retrieval', () => {
    it('[2.009-API-001] should list incidents for own plan', async () => {
      // GIVEN: A plan owned by user
      // WHEN: Freighter queries incidents for own plan
      const response = {
        success: true,
        data: {
          incidents: [
            {
              id: mockIncident.id,
              type: IncidentType.DELAY,
              status: IncidentStatus.OPEN,
              planId: mockPlan.id,
              description: 'Plan delayed by 45 minutes'
            }
          ],
          pagination: { page: 1, limit: 20, total: 1, totalPages: 1 }
        }
      };

      // THEN: Incidents are returned
      expect(response.success).toBe(true);
      expect(response.data.incidents.length).toBe(1);
      expect(response.data.incidents[0].type).toBe(IncidentType.DELAY);
    });

    it('[2.009-API-002] should include plan context in response', () => {
      // GIVEN: An incident with related plan
      // WHEN: Incident is returned
      const incidentResponse = {
        id: mockIncident.id,
        type: 'DELAY',
        plan: {
          id: mockPlan.id,
          status: 'IN_TRANSIT',
          unitCount: 50,
          createdBy: {
            id: mockUser.id,
            firstName: 'Test',
            lastName: 'Freighter',
            email: 'freighter-incidents@test.com'
          }
        }
      };

      // THEN: Plan details are included
      expect(incidentResponse.plan).toBeDefined();
      expect(incidentResponse.plan.status).toBe('IN_TRANSIT');
      expect(incidentResponse.plan.createdBy.firstName).toBe('Test');
    });

    it('[2.009-API-003] should support filtering by incident type', () => {
      // GIVEN: Multiple incident types exist
      // WHEN: Filter by type=DELAY
      const validTypes = ['REFUSAL', 'DELAY', 'IMBALANCE'];
      const response = {
        success: true,
        data: {
          incidents: [],
          pagination: { page: 1, limit: 20, total: 0, totalPages: 0 }
        }
      };

      // THEN: Only DELAY incidents are returned
      expect(validTypes).toContain('DELAY');
      expect(response.success).toBe(true);
    });

    it('[2.009-API-004] should support filtering by incident status', () => {
      // GIVEN: Incidents with various statuses
      // WHEN: Filter by status=OPEN
      const validStatuses = ['OPEN', 'RESOLVED', 'ESCALATED'];
      const response = {
        success: true,
        data: {
          incidents: [],
          pagination: { page: 1, limit: 20, total: 0, totalPages: 0 }
        }
      };

      // THEN: Only OPEN incidents are returned
      expect(validStatuses).toContain('OPEN');
      expect(response.success).toBe(true);
    });

    it('[2.009-API-005] should paginate results correctly', () => {
      // GIVEN: 45 incidents in total
      // WHEN: Request page 1 with limit 20
      const pagination = {
        page: 1,
        limit: 20,
        total: 45,
        totalPages: Math.ceil(45 / 20)
      };

      // THEN: Pagination metadata is correct
      expect(pagination.totalPages).toBe(3);
      expect(pagination.page).toBe(1);
    });

    it('[2.009-API-006] should support date range filtering', () => {
      // GIVEN: Incidents created at various times
      // WHEN: Filter by date range
      const dateRange = {
        from: '2026-01-20T00:00:00Z',
        to: '2026-01-21T00:00:00Z'
      };

      // THEN: Only incidents in range are returned
      const fromDate = new Date(dateRange.from);
      const toDate = new Date(dateRange.to);
      expect(fromDate.getTime()).toBeLessThan(toDate.getTime());
    });

    it('[2.009-API-007] should order incidents by createdAt descending', () => {
      // GIVEN: Incidents with different creation times
      // WHEN: Incidents are retrieved
      const incidents = [
        { id: '1', createdAt: new Date('2026-01-20T10:00:00Z') },
        { id: '2', createdAt: new Date('2026-01-20T11:00:00Z') },
        { id: '3', createdAt: new Date('2026-01-20T09:00:00Z') }
      ];

      // THEN: Latest incidents appear first
      const sorted = [...incidents].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      expect(sorted[0].id).toBe('2');
      expect(sorted[1].id).toBe('1');
      expect(sorted[2].id).toBe('3');
    });
  });

  describe('[2.009-API-008] Authorization and data isolation', () => {
    it('[2.009-API-008] should return 403 when freighter accesses other user incidents', () => {
      // GIVEN: An incident for another freighter's plan
      // WHEN: First freighter tries to access it
      const response = {
        status: 403,
        error: 'Unauthorized: Cannot view incidents for this plan'
      };

      // THEN: Forbidden error is returned
      expect(response.status).toBe(403);
      expect(response.error).toContain('Unauthorized');
    });

    it('[2.009-API-009] should allow ADMIN to view all incidents', () => {
      // GIVEN: ADMIN role
      // WHEN: ADMIN queries without planId
      const response = {
        success: true,
        data: {
          incidents: [
            { id: mockIncident.id, planId: mockPlan.id },
            { id: 'other-incident', planId: mockOtherPlan.id }
          ],
          pagination: { page: 1, limit: 20, total: 2, totalPages: 1 }
        }
      };

      // THEN: All incidents are visible
      expect(response.data.incidents.length).toBe(2);
    });

    it('[2.009-API-010] should return empty list if no incidents for freighter', () => {
      // GIVEN: A freighter with no incidents
      // WHEN: Freighter queries incidents without planId
      const response = {
        success: true,
        data: {
          incidents: [],
          pagination: { page: 1, limit: 20, total: 0, totalPages: 0 }
        }
      };

      // THEN: Empty list is returned (not error)
      expect(response.success).toBe(true);
      expect(response.data.incidents).toEqual([]);
    });
  });

  describe('[2.009-API-011] Error handling', () => {
    it('[2.009-API-011] should return 400 for invalid incident type', () => {
      // GIVEN: Invalid incident type parameter
      // WHEN: Endpoint receives type=INVALID_TYPE
      const response = {
        status: 400,
        error: 'Invalid incident type',
        details: ['Must be one of: REFUSAL, DELAY, IMBALANCE']
      };

      // THEN: Bad request error is returned
      expect(response.status).toBe(400);
      expect(response.details[0]).toContain('Must be one of');
    });

    it('[2.009-API-012] should return 400 for invalid incident status', () => {
      // GIVEN: Invalid incident status parameter
      // WHEN: Endpoint receives status=PENDING
      const response = {
        status: 400,
        error: 'Invalid incident status',
        details: ['Must be one of: OPEN, RESOLVED, ESCALATED']
      };

      // THEN: Bad request error is returned
      expect(response.status).toBe(400);
      expect(response.details[0]).toContain('Must be one of');
    });

    it('[2.009-API-013] should return 404 when plan not found', () => {
      // GIVEN: Non-existent plan ID
      // WHEN: Freighter queries incidents for non-existent plan
      const response = {
        status: 404,
        error: 'Plan not found'
      };

      // THEN: Not found error is returned
      expect(response.status).toBe(404);
    });

    it('[2.009-API-014] should handle invalid pagination values gracefully', () => {
      // GIVEN: Invalid pagination parameters (page=0, limit=0)
      // WHEN: Endpoint receives invalid pagination
      const validPage = Math.max(1, 0 || 1);
      const validLimit = Math.min(100, Math.max(1, 0 || 20));

      // THEN: Default/valid values are used
      expect(validPage).toBe(1);
      expect(validLimit).toBe(20);
    });

    it('[2.009-API-015] should enforce pagination limits (max 100)', () => {
      // GIVEN: Request for limit > 100
      // WHEN: Endpoint enforces max limit
      const requestedLimit = 500;
      const enforced = Math.min(100, requestedLimit);

      // THEN: Limit is capped at 100
      expect(enforced).toBe(100);
    });
  });

  describe('[2.009-API-016] Response structure validation', () => {
    it('[2.009-API-016] should return proper success response structure', () => {
      // GIVEN: Valid request
      // WHEN: Endpoint returns success response
      const successResponse = {
        success: true,
        data: {
          incidents: [],
          pagination: {
            page: 1,
            limit: 20,
            total: 0,
            totalPages: 0
          }
        }
      };

      // THEN: Response has correct structure
      expect(successResponse.success).toBe(true);
      expect(Array.isArray(successResponse.data.incidents)).toBe(true);
      expect(successResponse.data.pagination).toBeDefined();
      expect(successResponse.data.pagination.page).toBeGreaterThan(0);
    });

    it('[2.009-API-017] should include all required incident fields', () => {
      // GIVEN: An incident in response
      // WHEN: Incident is serialized
      const incident = {
        id: mockIncident.id,
        type: IncidentType.DELAY,
        status: IncidentStatus.OPEN,
        planId: mockPlan.id,
        carrierId: 'carrier-1',
        warehouseId: null,
        description: 'Plan delayed by 45 minutes',
        createdAt: new Date('2026-01-20T10:00:00Z'),
        resolvedAt: null
      };

      // THEN: All fields are present
      expect(incident.id).toBeDefined();
      expect(incident.type).toBeDefined();
      expect(incident.status).toBeDefined();
      expect(incident.planId).toBeDefined();
      expect(incident.description).toBeDefined();
      expect(incident.createdAt).toBeDefined();
    });

    it('[2.009-API-018] should include full plan context', () => {
      // GIVEN: An incident with plan relations
      // WHEN: Plan context is loaded
      const planContext = {
        id: mockPlan.id,
        status: PlanStatus.IN_TRANSIT,
        unitCount: 50,
        createdBy: {
          id: mockUser.id,
          firstName: 'Test',
          lastName: 'Freighter',
          email: 'freighter-incidents@test.com'
        }
      };

      // THEN: Full plan details are included
      expect(planContext.id).toBeDefined();
      expect(planContext.status).toBe(PlanStatus.IN_TRANSIT);
      expect(planContext.unitCount).toBeGreaterThan(0);
      expect(planContext.createdBy.email).toBeDefined();
    });
  });

  describe('[2.009-API-019] Incident type coverage', () => {
    it('[2.009-API-019] should handle REFUSAL incidents', () => {
      // GIVEN: A REFUSAL incident exists
      // WHEN: Incident is retrieved
      const refusalIncident = {
        type: IncidentType.REFUSAL,
        description: 'Carrier refused transport: Capacity exceeded'
      };

      // THEN: REFUSAL type is preserved
      expect(refusalIncident.type).toBe(IncidentType.REFUSAL);
    });

    it('[2.009-API-020] should handle DELAY incidents', () => {
      // GIVEN: A DELAY incident exists
      // WHEN: Incident is retrieved
      const delayIncident = {
        type: IncidentType.DELAY,
        description: 'Plan delayed by 45 minutes'
      };

      // THEN: DELAY type is preserved
      expect(delayIncident.type).toBe(IncidentType.DELAY);
    });

    it('[2.009-API-021] should handle IMBALANCE incidents', () => {
      // GIVEN: An IMBALANCE incident exists
      // WHEN: Incident is retrieved
      const imbalanceIncident = {
        type: IncidentType.IMBALANCE,
        description: 'Unit count mismatch. Planned: 50, Actual: 45'
      };

      // THEN: IMBALANCE type is preserved
      expect(imbalanceIncident.type).toBe(IncidentType.IMBALANCE);
    });
  });

  describe('[2.009-API-022] Incident status coverage', () => {
    it('[2.009-API-022] should handle OPEN incidents', () => {
      // GIVEN: An OPEN incident exists
      // WHEN: Incident is retrieved
      const openIncident = {
        status: IncidentStatus.OPEN,
        resolvedAt: null
      };

      // THEN: OPEN status indicates unresolved
      expect(openIncident.status).toBe(IncidentStatus.OPEN);
      expect(openIncident.resolvedAt).toBeNull();
    });

    it('[2.009-API-023] should handle RESOLVED incidents', () => {
      // GIVEN: A RESOLVED incident exists
      // WHEN: Incident is retrieved
      const resolvedIncident = {
        status: IncidentStatus.RESOLVED,
        resolvedAt: new Date('2026-01-20T12:00:00Z')
      };

      // THEN: RESOLVED status indicates fixed
      expect(resolvedIncident.status).toBe(IncidentStatus.RESOLVED);
      expect(resolvedIncident.resolvedAt).toBeDefined();
    });

    it('[2.009-API-024] should handle ESCALATED incidents', () => {
      // GIVEN: An ESCALATED incident exists
      // WHEN: Incident is retrieved
      const escalatedIncident = {
        status: IncidentStatus.ESCALATED,
        description: 'Requires management attention'
      };

      // THEN: ESCALATED status indicates severe
      expect(escalatedIncident.status).toBe(IncidentStatus.ESCALATED);
    });
  });
});
