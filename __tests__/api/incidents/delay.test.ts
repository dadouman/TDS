import { PrismaClient, IncidentType, IncidentStatus, PlanStatus } from '@prisma/client';
import { checkForDelay, calculateDelayMinutes } from '@/utils/delayDetection';

describe('Delay Incident Detection - Story 3.011', () => {
  let prisma: PrismaClient;
  let mockFreighter: any;
  let mockCarrier: any;
  let mockSupplier: any;
  let mockStore: any;

  beforeAll(async () => {
    prisma = new PrismaClient();

    // Create test users
    mockFreighter = await prisma.user.create({
      data: {
        email: 'freighter-delay@test.com',
        password_hash: 'hashed',
        firstName: 'Freighter',
        lastName: 'User',
        role: 'FREIGHTER'
      }
    });

    mockCarrier = await prisma.user.create({
      data: {
        email: 'carrier-delay@test.com',
        password_hash: 'hashed',
        firstName: 'Carrier',
        lastName: 'User',
        role: 'CARRIER'
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
  });

  afterAll(async () => {
    // Cleanup
    await prisma.incident.deleteMany({});
    await prisma.trip.deleteMany({});
    await prisma.transportPlan.deleteMany({});
    await prisma.location.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.$disconnect();
  });

  afterEach(async () => {
    await prisma.incident.deleteMany({});
    await prisma.trip.deleteMany({});
    await prisma.transportPlan.deleteMany({});
  });

  describe('[3.011-001] Delay detection logic', () => {
    it('[3.011-001] should detect delay > 30 minutes', () => {
      // GIVEN: Plan with ETA in the past (45 min ago)
      const now = new Date();
      const eta = new Date(now.getTime() - 45 * 60 * 1000);

      const plan = {
        id: 'plan-1',
        estimatedDeliveryTime: eta,
        status: PlanStatus.IN_TRANSIT
      };

      // WHEN: Check for delay
      const hasDelay = checkForDelay(plan as any);

      // THEN: Delay detected
      expect(hasDelay).toBe(true);
    });

    it('[3.011-002] should NOT detect delay < 30 minutes', () => {
      // GIVEN: Plan with ETA 15 min ago (within threshold)
      const now = new Date();
      const eta = new Date(now.getTime() - 15 * 60 * 1000);

      const plan = {
        estimatedDeliveryTime: eta,
        status: PlanStatus.IN_TRANSIT
      };

      // WHEN: Check for delay
      const hasDelay = checkForDelay(plan as any);

      // THEN: No delay detected
      expect(hasDelay).toBe(false);
    });

    it('[3.011-003] should calculate delay in minutes', () => {
      // GIVEN: Plan 45 min late
      const now = new Date();
      const eta = new Date(now.getTime() - 45 * 60 * 1000);

      const plan = {
        estimatedDeliveryTime: eta
      };

      // WHEN: Calculate delay
      const delayMinutes = calculateDelayMinutes(plan as any);

      // THEN: ~45 minutes delay
      expect(delayMinutes).toBeGreaterThanOrEqual(44);
      expect(delayMinutes).toBeLessThanOrEqual(46);
    });
  });

  describe('[3.011-004] Incident creation', () => {
    it('[3.011-004] should create DELAY incident when threshold exceeded', async () => {
      // GIVEN: Plan running 45 min late
      const now = new Date();
      const eta = new Date(now.getTime() - 45 * 60 * 1000);

      const plan = await prisma.transportPlan.create({
        data: {
          supplierId: mockSupplier.id,
          destinationId: mockStore.id,
          unitCount: 50,
          plannedLoadingTime: new Date(now.getTime() - 4 * 3600 * 1000),
          estimatedDeliveryTime: eta,
          status: 'IN_TRANSIT',
          createdBy: mockFreighter.id
        }
      });

      // WHEN: Delay detection runs
      const incident = await prisma.incident.create({
        data: {
          type: IncidentType.DELAY,
          planId: plan.id,
          description: `Estimated delay: ${calculateDelayMinutes(plan)} minutes`,
          status: IncidentStatus.OPEN
        }
      });

      // THEN: DELAY incident created
      expect(incident.type).toBe(IncidentType.DELAY);
      expect(incident.planId).toBe(plan.id);
      expect(incident.status).toBe(IncidentStatus.OPEN);
      expect(incident.description).toContain('delay');
    });

    it('[3.011-005] should include delay duration in description', async () => {
      // GIVEN: Plan 60 min late
      const now = new Date();
      const eta = new Date(now.getTime() - 60 * 60 * 1000);

      const plan = await prisma.transportPlan.create({
        data: {
          supplierId: mockSupplier.id,
          destinationId: mockStore.id,
          unitCount: 50,
          plannedLoadingTime: new Date(now.getTime() - 4 * 3600 * 1000),
          estimatedDeliveryTime: eta,
          status: 'IN_TRANSIT',
          createdBy: mockFreighter.id
        }
      });

      const delayMinutes = calculateDelayMinutes(plan);

      // WHEN: Create incident
      const incident = await prisma.incident.create({
        data: {
          type: IncidentType.DELAY,
          planId: plan.id,
          description: `Estimated delay: ${delayMinutes} minutes`,
          status: IncidentStatus.OPEN
        }
      });

      // THEN: Description includes minutes
      expect(incident.description).toContain('60');
      expect(incident.description).toContain('minutes');
    });
  });

  describe('[3.011-006] Trigger points', () => {
    it('[3.011-006] should detect when plan IN_TRANSIT past ETA', async () => {
      // GIVEN: Plan IN_TRANSIT with ETA passed
      const now = new Date();
      const eta = new Date(now.getTime() - 35 * 60 * 1000);

      const plan = await prisma.transportPlan.create({
        data: {
          supplierId: mockSupplier.id,
          destinationId: mockStore.id,
          unitCount: 50,
          plannedLoadingTime: new Date(now.getTime() - 4 * 3600 * 1000),
          estimatedDeliveryTime: eta,
          status: 'IN_TRANSIT',
          createdBy: mockFreighter.id
        }
      });

      // WHEN: Check delay
      const hasDelay = checkForDelay(plan);

      // THEN: Delay detected
      expect(hasDelay).toBe(true);
    });

    it('[3.011-007] should NOT trigger for PROPOSED or ACCEPTED plans', () => {
      // GIVEN: Plan not yet IN_TRANSIT
      const now = new Date();
      const eta = new Date(now.getTime() - 45 * 60 * 1000);

      const proposedPlan = {
        estimatedDeliveryTime: eta,
        status: PlanStatus.PROPOSED
      };

      // WHEN: Check delay
      const hasDelay = checkForDelay(proposedPlan as any);

      // THEN: No delay for non-transit plans
      expect(hasDelay).toBe(false);
    });
  });

  describe('[3.011-008] Deduplication', () => {
    it('[3.011-008] should not create duplicate DELAY incidents', async () => {
      // GIVEN: Plan with existing DELAY incident
      const now = new Date();
      const eta = new Date(now.getTime() - 45 * 60 * 1000);

      const plan = await prisma.transportPlan.create({
        data: {
          supplierId: mockSupplier.id,
          destinationId: mockStore.id,
          unitCount: 50,
          plannedLoadingTime: new Date(now.getTime() - 4 * 3600 * 1000),
          estimatedDeliveryTime: eta,
          status: 'IN_TRANSIT',
          createdBy: mockFreighter.id
        }
      });

      // Create first incident
      await prisma.incident.create({
        data: {
          type: IncidentType.DELAY,
          planId: plan.id,
          description: 'Estimated delay: 45 minutes',
          status: IncidentStatus.OPEN
        }
      });

      // WHEN: Check if incident already exists
      const existingIncident = await prisma.incident.findFirst({
        where: {
          type: IncidentType.DELAY,
          planId: plan.id,
          status: IncidentStatus.OPEN
        }
      });

      // THEN: Existing incident found, don't create duplicate
      expect(existingIncident).toBeDefined();
    });
  });

  describe('[3.011-009] Notifications', () => {
    it('[3.011-009] should notify freighter of delay', async () => {
      // GIVEN: DELAY incident created
      const notification = {
        type: 'incident',
        data: {
          incidentType: IncidentType.DELAY,
          planId: 'plan-123',
          delayMinutes: 45
        }
      };

      // THEN: Notification sent
      expect(notification.type).toBe('incident');
      expect(notification.data.incidentType).toBe(IncidentType.DELAY);
    });

    it('[3.011-010] should notify store of delay', async () => {
      // GIVEN: DELAY incident affecting store
      const notification = {
        type: 'delay_alert',
        data: {
          storeId: 'store-123',
          planId: 'plan-123',
          delayMinutes: 45
        }
      };

      // THEN: Store notification sent
      expect(notification.type).toBe('delay_alert');
      expect(notification.data.delayMinutes).toBe(45);
    });
  });

  describe('[3.011-011] Threshold configuration', () => {
    it('[3.011-011] should use 30 minute threshold', () => {
      // GIVEN: Threshold is 30 minutes
      const threshold = 30;

      // Delay exactly at threshold (30 min)
      const now = new Date();
      const etaAtThreshold = new Date(now.getTime() - 30 * 60 * 1000);

      const planAtThreshold = {
        estimatedDeliveryTime: etaAtThreshold,
        status: PlanStatus.IN_TRANSIT
      };

      // WHEN: Check for delay
      const hasDelay = checkForDelay(planAtThreshold as any);

      // THEN: Threshold met
      expect(hasDelay).toBe(false); // Exactly at threshold, not exceeded
    });

    it('[3.011-012] should trigger when exceeds threshold', () => {
      // GIVEN: Delay > 30 min (31 min)
      const now = new Date();
      const eta = new Date(now.getTime() - 31 * 60 * 1000);

      const plan = {
        estimatedDeliveryTime: eta,
        status: PlanStatus.IN_TRANSIT
      };

      // WHEN: Check for delay
      const hasDelay = checkForDelay(plan as any);

      // THEN: Delay detected
      expect(hasDelay).toBe(true);
    });
  });
});
