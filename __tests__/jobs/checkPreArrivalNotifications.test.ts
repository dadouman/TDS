/**
 * Tests for Pre-Arrival Notification Job - Story 5.021
 * 
 * Tests the polling logic that sends notifications when delivery is 30 min away
 */

import { PrismaClient } from '@prisma/client';
import { checkPreArrivalNotifications, resetPreArrivalNotifications } from '@/jobs/checkPreArrivalNotifications';
import { sseManager } from '@/utils/sseManager';

const prisma = new PrismaClient();

/**
 * Test suite for pre-arrival notification job
 */
describe('Pre-Arrival Notification Job - Story 5.021', () => {
  let supplierLocationId: string;
  let storeLocationId: string;
  let storeManagerUserId: string;
  // Use both Date.now() and random for better uniqueness
  const testSuffix = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`; // Highly unique suffix

  beforeAll(async () => {
    // Create test locations
    const supplier = await prisma.location.create({
      data: {
        name: `Test Supplier ${testSuffix}`,
        type: 'SUPPLIER',
        address: '123 Supplier Ave'
      }
    });
    supplierLocationId = supplier.id;

    const store = await prisma.location.create({
      data: {
        name: `Test Store ${testSuffix}`,
        type: 'STORE',
        address: '456 Store Ave'
      }
    });
    storeLocationId = store.id;

    // Create store manager
    const storeManagerId = `store-manager-${testSuffix}`;
    await prisma.user.create({
      data: {
        id: storeManagerId,
        email: `manager-${testSuffix}@store.com`,
        password_hash: 'hashed',
        firstName: 'John',
        lastName: 'Manager',
        role: 'STORE',
        storeLocationId: storeLocationId
      }
    });
    storeManagerUserId = storeManagerId;

    // Create freighter for creating plans
    const freighterId = `freighter-${testSuffix}`;
    await prisma.user.create({
      data: {
        id: freighterId,
        email: `freighter-${testSuffix}@example.com`,
        password_hash: 'hashed',
        firstName: 'Jane',
        lastName: 'Freighter',
        role: 'FREIGHTER'
      }
    });
  });

  afterAll(async () => {
    // Clean up in order of foreign keys
    await prisma.incident.deleteMany({});
    await prisma.trip.deleteMany({});
    await prisma.transportPlan.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.location.deleteMany({});
    await prisma.$disconnect();
  });

  describe('[5.021-PreArrival-001] Notification Timing', () => {
    it('[5.021-PreArrival-001] should notify when delivery is 30 minutes away (±5 min window)', async () => {
      // GIVEN: Plan with IN_TRANSIT status and ETA in ~30 minutes
      const now = new Date();
      const eta30minFromNow = new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes

      const plan = await prisma.transportPlan.create({
        data: {
          supplierId: supplierLocationId,
          destinationId: storeLocationId,
          unitCount: 50,
          plannedLoadingTime: new Date(now.getTime() - 2 * 60 * 60 * 1000), // 2 hours ago
          estimatedDeliveryTime: eta30minFromNow,
          createdBy: `freighter-${testSuffix}`,
          status: 'IN_TRANSIT',
          preArrivalNotified: false
        }
      });

      // WHEN: Pre-arrival check job runs
      await checkPreArrivalNotifications();

      // THEN: Plan should be marked as notified
      const updatedPlan = await prisma.transportPlan.findUnique({
        where: { id: plan.id }
      });

      expect(updatedPlan?.preArrivalNotified).toBe(true);

      // Clean up
      await prisma.transportPlan.delete({ where: { id: plan.id } });
    });

    it('[5.021-PreArrival-002] should NOT notify if ETA is beyond 35 minute window', async () => {
      // GIVEN: Plan with ETA 40 minutes away (outside notification window)
      const now = new Date();
      const eta40minFromNow = new Date(now.getTime() + 40 * 60 * 1000);

      const plan = await prisma.transportPlan.create({
        data: {
          supplierId: supplierLocationId,
          destinationId: storeLocationId,
          unitCount: 50,
          plannedLoadingTime: new Date(now.getTime() - 2 * 60 * 60 * 1000),
          estimatedDeliveryTime: eta40minFromNow,
          createdBy: `freighter-${testSuffix}`,
          status: 'IN_TRANSIT',
          preArrivalNotified: false
        }
      });

      // WHEN: Pre-arrival check job runs
      await checkPreArrivalNotifications();

      // THEN: Plan should NOT be marked as notified
      const updatedPlan = await prisma.transportPlan.findUnique({
        where: { id: plan.id }
      });

      expect(updatedPlan?.preArrivalNotified).toBe(false);

      // Clean up
      await prisma.transportPlan.delete({ where: { id: plan.id } });
    });

    it('[5.021-PreArrival-003] should NOT notify if ETA is less than 25 minutes away', async () => {
      // GIVEN: Plan with ETA 20 minutes away (inside window but too soon)
      const now = new Date();
      const eta20minFromNow = new Date(now.getTime() + 20 * 60 * 1000);

      const plan = await prisma.transportPlan.create({
        data: {
          supplierId: supplierLocationId,
          destinationId: storeLocationId,
          unitCount: 50,
          plannedLoadingTime: new Date(now.getTime() - 2 * 60 * 60 * 1000),
          estimatedDeliveryTime: eta20minFromNow,
          createdBy: `freighter-${testSuffix}`,
          status: 'IN_TRANSIT',
          preArrivalNotified: false
        }
      });

      // WHEN: Pre-arrival check job runs
      await checkPreArrivalNotifications();

      // THEN: Plan should NOT be marked as notified
      const updatedPlan = await prisma.transportPlan.findUnique({
        where: { id: plan.id }
      });

      expect(updatedPlan?.preArrivalNotified).toBe(false);

      // Clean up
      await prisma.transportPlan.delete({ where: { id: plan.id } });
    });
  });

  describe('[5.021-PreArrival-004] Deduplication', () => {
    it('[5.021-PreArrival-004] should NOT send duplicate notifications', async () => {
      // GIVEN: Plan already marked as notified
      const now = new Date();
      const eta30minFromNow = new Date(now.getTime() + 30 * 60 * 1000);

      const plan = await prisma.transportPlan.create({
        data: {
          supplierId: supplierLocationId,
          destinationId: storeLocationId,
          unitCount: 50,
          plannedLoadingTime: new Date(now.getTime() - 2 * 60 * 60 * 1000),
          estimatedDeliveryTime: eta30minFromNow,
          createdBy: `freighter-${testSuffix}`,
          status: 'IN_TRANSIT',
          preArrivalNotified: true // Already notified
        }
      });

      // WHEN: Pre-arrival check job runs
      await checkPreArrivalNotifications();

      // THEN: Plan should still be marked as notified (not re-processed)
      const updatedPlan = await prisma.transportPlan.findUnique({
        where: { id: plan.id }
      });

      expect(updatedPlan?.preArrivalNotified).toBe(true);

      // Clean up
      await prisma.transportPlan.delete({ where: { id: plan.id } });
    });
  });

  describe('[5.021-PreArrival-005] Store Notification', () => {
    it('[5.021-PreArrival-005] should send event only to store managers at destination', async () => {
      // GIVEN: Plan approaching with store manager at destination
      const now = new Date();
      const eta30minFromNow = new Date(now.getTime() + 30 * 60 * 1000);

      const plan = await prisma.transportPlan.create({
        data: {
          supplierId: supplierLocationId,
          destinationId: storeLocationId,
          unitCount: 75,
          plannedLoadingTime: new Date(now.getTime() - 2 * 60 * 60 * 1000),
          estimatedDeliveryTime: eta30minFromNow,
          createdBy: `freighter-${testSuffix}`,
          status: 'IN_TRANSIT',
          preArrivalNotified: false
        }
      });

      // Spy on sseManager to verify broadcast call
      const broadcastSpy = jest.spyOn(sseManager, 'broadcastEvent');

      // WHEN: Pre-arrival check job runs
      await checkPreArrivalNotifications();

      // THEN: SSE event should be broadcasted to store managers
      expect(broadcastSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          planId: plan.id,
          eventType: 'DELIVERY_STATUS',
          status: 'IN_TRANSIT'
        }),
        'pre-arrival',
        expect.arrayContaining([storeManagerUserId])
      );

      broadcastSpy.mockRestore();

      // Clean up
      await prisma.transportPlan.delete({ where: { id: plan.id } });
    });
  });

  describe('[5.021-PreArrival-006] Status Filtering', () => {
    it('[5.021-PreArrival-006] should only process IN_TRANSIT plans', async () => {
      // GIVEN: Plan with PROPOSED status (not yet in transit)
      const now = new Date();
      const eta30minFromNow = new Date(now.getTime() + 30 * 60 * 1000);

      const plan = await prisma.transportPlan.create({
        data: {
          supplierId: supplierLocationId,
          destinationId: storeLocationId,
          unitCount: 50,
          plannedLoadingTime: new Date(now.getTime() - 2 * 60 * 60 * 1000),
          estimatedDeliveryTime: eta30minFromNow,
          createdBy: `freighter-${testSuffix}`,
          status: 'PROPOSED', // Not IN_TRANSIT
          preArrivalNotified: false
        }
      });

      // WHEN: Pre-arrival check job runs
      await checkPreArrivalNotifications();

      // THEN: Plan should NOT be processed
      const updatedPlan = await prisma.transportPlan.findUnique({
        where: { id: plan.id }
      });

      expect(updatedPlan?.preArrivalNotified).toBe(false);

      // Clean up
      await prisma.transportPlan.delete({ where: { id: plan.id } });
    });

    it('[5.021-PreArrival-007] should only process plans within 30-minute window', async () => {
      // GIVEN: Multiple plans with different ETAs
      const now = new Date();

      // Plan 1: Too far (40 min away)
      const plan1 = await prisma.transportPlan.create({
        data: {
          supplierId: supplierLocationId,
          destinationId: storeLocationId,
          unitCount: 50,
          plannedLoadingTime: new Date(now.getTime() - 2 * 60 * 60 * 1000),
          estimatedDeliveryTime: new Date(now.getTime() + 40 * 60 * 1000),
          createdBy: `freighter-${testSuffix}`,
          status: 'IN_TRANSIT',
          preArrivalNotified: false
        }
      });

      // Plan 2: Perfect (30 min away)
      const plan2 = await prisma.transportPlan.create({
        data: {
          supplierId: supplierLocationId,
          destinationId: storeLocationId,
          unitCount: 50,
          plannedLoadingTime: new Date(now.getTime() - 2 * 60 * 60 * 1000),
          estimatedDeliveryTime: new Date(now.getTime() + 30 * 60 * 1000),
          createdBy: `freighter-${testSuffix}`,
          status: 'IN_TRANSIT',
          preArrivalNotified: false
        }
      });

      // Plan 3: Too close (15 min away)
      const plan3 = await prisma.transportPlan.create({
        data: {
          supplierId: supplierLocationId,
          destinationId: storeLocationId,
          unitCount: 50,
          plannedLoadingTime: new Date(now.getTime() - 2 * 60 * 60 * 1000),
          estimatedDeliveryTime: new Date(now.getTime() + 15 * 60 * 1000),
          createdBy: `freighter-${testSuffix}`,
          status: 'IN_TRANSIT',
          preArrivalNotified: false
        }
      });

      // WHEN: Pre-arrival check job runs
      await checkPreArrivalNotifications();

      // THEN: Only plan 2 should be notified
      const updated1 = await prisma.transportPlan.findUnique({ where: { id: plan1.id } });
      const updated2 = await prisma.transportPlan.findUnique({ where: { id: plan2.id } });
      const updated3 = await prisma.transportPlan.findUnique({ where: { id: plan3.id } });

      expect(updated1?.preArrivalNotified).toBe(false);
      expect(updated2?.preArrivalNotified).toBe(true);
      expect(updated3?.preArrivalNotified).toBe(false);

      // Clean up
      await prisma.transportPlan.deleteMany({
        where: { id: { in: [plan1.id, plan2.id, plan3.id] } }
      });
    });
  });

  describe('[5.021-PreArrival-008] Event Format', () => {
    it('[5.021-PreArrival-008] should send event with correct format', async () => {
      // GIVEN: Plan approaching delivery
      const now = new Date();
      const eta30minFromNow = new Date(now.getTime() + 30 * 60 * 1000);

      const plan = await prisma.transportPlan.create({
        data: {
          supplierId: supplierLocationId,
          destinationId: storeLocationId,
          unitCount: 100,
          plannedLoadingTime: new Date(now.getTime() - 2 * 60 * 60 * 1000),
          estimatedDeliveryTime: eta30minFromNow,
          createdBy: `freighter-${testSuffix}`,
          status: 'IN_TRANSIT',
          preArrivalNotified: false
        }
      });

      // Spy on sseManager to capture event
      const broadcastSpy = jest.spyOn(sseManager, 'broadcastEvent');

      // WHEN: Pre-arrival check job runs
      await checkPreArrivalNotifications();

      // THEN: Event should have required fields
      const capturedEvent = broadcastSpy.mock.calls[0][0];
      expect(capturedEvent).toMatchObject({
        id: expect.stringContaining('pre-arrival-'),
        eventType: 'DELIVERY_STATUS',
        planId: plan.id,
        status: 'IN_TRANSIT',
        eta: expect.any(String),
        timestamp: expect.any(String)
      });

      broadcastSpy.mockRestore();

      // Clean up
      await prisma.transportPlan.delete({ where: { id: plan.id } });
    });
  });
});
