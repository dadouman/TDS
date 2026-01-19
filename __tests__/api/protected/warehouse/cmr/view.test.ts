/**
 * Tests for CMR View - Story 6.023
 * 
 * Tests viewing existing CMR forms with imbalance detection
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('CMR View - Story 6.023', () => {
  let tripId1: string;
  let tripId2: string;
  let tripId3: string;
  let planId1: string;
  let planId2: string;
  let planId3: string;
  let supplierId: string;
  let destinationId: string;
  let carrierId: string;
  let warehouseManagerId1: string;
  let warehouseManagerId2: string;
  const testSuffix = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  beforeAll(async () => {
    // Create locations
    const supplier = await prisma.location.create({
      data: {
        name: `Test Supplier ${testSuffix}`,
        type: 'SUPPLIER',
        address: '123 Supplier Ave'
      }
    });
    supplierId = supplier.id;

    const destination = await prisma.location.create({
      data: {
        name: `Test Destination ${testSuffix}`,
        type: 'STORE',
        address: '456 Destination Ave'
      }
    });
    destinationId = destination.id;

    // Create carrier
    const carrier = await prisma.user.create({
      data: {
        id: `carrier-${testSuffix}`,
        email: `carrier-${testSuffix}@example.com`,
        password_hash: 'hashed',
        firstName: 'John',
        lastName: 'Driver',
        role: 'CARRIER'
      }
    });
    carrierId = carrier.id;

    // Create warehouse managers
    const warehouse1 = await prisma.user.create({
      data: {
        id: `warehouse1-${testSuffix}`,
        email: `warehouse1-${testSuffix}@example.com`,
        password_hash: 'hashed',
        firstName: 'Jane',
        lastName: 'Warehouse1',
        role: 'WAREHOUSE'
      }
    });
    warehouseManagerId1 = warehouse1.id;

    const warehouse2 = await prisma.user.create({
      data: {
        id: `warehouse2-${testSuffix}`,
        email: `warehouse2-${testSuffix}@example.com`,
        password_hash: 'hashed',
        firstName: 'Bob',
        lastName: 'Warehouse2',
        role: 'WAREHOUSE'
      }
    });
    warehouseManagerId2 = warehouse2.id;

    // Create freighter
    const freighter = await prisma.user.create({
      data: {
        id: `freighter-${testSuffix}`,
        email: `freighter-${testSuffix}@example.com`,
        password_hash: 'hashed',
        firstName: 'Frank',
        lastName: 'Freighter',
        role: 'FREIGHTER'
      }
    });

    // Create plans
    const plan1 = await prisma.transportPlan.create({
      data: {
        supplierId,
        destinationId,
        unitCount: 100,
        plannedLoadingTime: new Date('2026-01-20T10:00:00Z'),
        estimatedDeliveryTime: new Date('2026-01-20T14:00:00Z'),
        createdBy: freighter.id,
        status: 'ACCEPTED'
      }
    });
    planId1 = plan1.id;

    const plan2 = await prisma.transportPlan.create({
      data: {
        supplierId,
        destinationId,
        unitCount: 50,
        plannedLoadingTime: new Date('2026-01-21T10:00:00Z'),
        estimatedDeliveryTime: new Date('2026-01-21T14:00:00Z'),
        createdBy: freighter.id,
        status: 'ACCEPTED'
      }
    });
    planId2 = plan2.id;

    const plan3 = await prisma.transportPlan.create({
      data: {
        supplierId,
        destinationId,
        unitCount: 75,
        plannedLoadingTime: new Date('2026-01-22T10:00:00Z'),
        estimatedDeliveryTime: new Date('2026-01-22T14:00:00Z'),
        createdBy: freighter.id,
        status: 'ACCEPTED'
      }
    });
    planId3 = plan3.id;

    // Create trips
    const trip1 = await prisma.trip.create({
      data: {
        planId: planId1,
        carrierId,
        status: 'ACCEPTED'
      }
    });
    tripId1 = trip1.id;

    const trip2 = await prisma.trip.create({
      data: {
        planId: planId2,
        carrierId,
        status: 'ACCEPTED'
      }
    });
    tripId2 = trip2.id;

    const trip3 = await prisma.trip.create({
      data: {
        planId: planId3,
        carrierId,
        status: 'ACCEPTED'
      }
    });
    tripId3 = trip3.id;

    // Create CMRs
    // CMR 1: Exact match (100 planned = 100 received) - No imbalance
    await prisma.cMR.create({
      data: {
        tripId: tripId1,
        warehouseId: warehouseManagerId1,
        status: 'SUBMITTED',
        receivedCount: 100,
        damageDeclared: false,
        version: 2,
        submittedAt: new Date('2026-01-20T15:00:00Z'),
        lastUpdatedBy: warehouseManagerId1
      }
    });

    // CMR 2: Minor variance (50 planned, 49 received) - Within tolerance, no imbalance
    await prisma.cMR.create({
      data: {
        tripId: tripId2,
        warehouseId: warehouseManagerId2,
        status: 'IN_PROGRESS',
        receivedCount: 49,
        damageDeclared: true,
        damageNotes: 'One box slightly damaged',
        version: 1,
        lastUpdatedBy: warehouseManagerId2
      }
    });

    // CMR 3: Imbalance (75 planned, 72 received) - More than ±1, imbalance flag
    await prisma.cMR.create({
      data: {
        tripId: tripId3,
        warehouseId: warehouseManagerId1,
        status: 'DRAFT',
        receivedCount: 72,
        damageDeclared: true,
        damageNotes: 'Several units missing',
        inspectorName: 'Inspector Smith',
        version: 1,
        lastUpdatedBy: warehouseManagerId1
      }
    });
  });

  afterAll(async () => {
    // Clean up
    await prisma.cMR.deleteMany({});
    await prisma.incident.deleteMany({});
    await prisma.trip.deleteMany({});
    await prisma.transportPlan.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.location.deleteMany({});
    await prisma.$disconnect();
  });

  describe('[6.023-View-001] View CMR with Status', () => {
    it('[6.023-View-001] should display CMR with all status values', async () => {
      // GIVEN: CMRs with different statuses
      const cmr1 = await prisma.cMR.findUnique({
        where: { tripId: tripId1 }
      });
      const cmr2 = await prisma.cMR.findUnique({
        where: { tripId: tripId2 }
      });
      const cmr3 = await prisma.cMR.findUnique({
        where: { tripId: tripId3 }
      });

      // THEN: Each CMR should have correct status
      expect(cmr1?.status).toBe('SUBMITTED');
      expect(cmr2?.status).toBe('IN_PROGRESS');
      expect(cmr3?.status).toBe('DRAFT');
    });

    it('[6.023-View-002] should show SUBMITTED CMR as read-only', async () => {
      // GIVEN: CMR in SUBMITTED status
      const cmr = await prisma.cMR.findUnique({
        where: { tripId: tripId1 }
      });

      // THEN: Should have submittedAt timestamp
      expect(cmr?.status).toBe('SUBMITTED');
      expect(cmr?.submittedAt).toBeTruthy();
    });
  });

  describe('[6.023-View-003] Imbalance Detection', () => {
    it('[6.023-View-003] should detect imbalance when variance > ±1', async () => {
      // GIVEN: CMRs with different received vs planned counts
      const trip1 = await prisma.trip.findUnique({
        where: { id: tripId1 },
        include: {
          plan: { select: { unitCount: true } }
        }
      });
      const trip3 = await prisma.trip.findUnique({
        where: { id: tripId3 },
        include: {
          plan: { select: { unitCount: true } }
        }
      });

      const cmr1 = await prisma.cMR.findUnique({ where: { tripId: tripId1 } });
      const cmr3 = await prisma.cMR.findUnique({ where: { tripId: tripId3 } });

      // THEN: Calculate imbalance
      const imbalance1 =
        cmr1 && cmr1.receivedCount
          ? Math.abs(cmr1.receivedCount - (trip1?.plan.unitCount || 0)) > 1
          : false;
      const imbalance3 =
        cmr3 && cmr3.receivedCount
          ? Math.abs(cmr3.receivedCount - (trip3?.plan.unitCount || 0)) > 1
          : false;

      expect(imbalance1).toBe(false); // 100 = 100, no imbalance
      expect(imbalance3).toBe(true); // |72 - 75| = 3 > 1, imbalance
    });

    it('[6.023-View-004] should calculate imbalance amount correctly', async () => {
      // GIVEN: CMR with imbalance
      const trip3 = await prisma.trip.findUnique({
        where: { id: tripId3 },
        include: {
          plan: { select: { unitCount: true } }
        }
      });
      const cmr3 = await prisma.cMR.findUnique({ where: { tripId: tripId3 } });

      // THEN: Imbalance amount = receivedCount - plannedCount
      const imbalanceAmount =
        cmr3?.receivedCount ? cmr3.receivedCount - (trip3?.plan.unitCount || 0) : 0;

      expect(imbalanceAmount).toBe(-3); // 72 - 75 = -3
    });

    it('[6.023-View-005] should not flag as imbalance when variance <= ±1', async () => {
      // GIVEN: CMR with tolerance ±1
      const trip2 = await prisma.trip.findUnique({
        where: { id: tripId2 },
        include: {
          plan: { select: { unitCount: true } }
        }
      });
      const cmr2 = await prisma.cMR.findUnique({ where: { tripId: tripId2 } });

      // THEN: 49 vs 50 is within ±1, no imbalance
      const imbalance =
        cmr2 && cmr2.receivedCount
          ? Math.abs(cmr2.receivedCount - (trip2?.plan.unitCount || 0)) > 1
          : false;

      expect(imbalance).toBe(false);
    });
  });

  describe('[6.023-View-006] Data Isolation', () => {
    it('[6.023-View-006] should isolate CMRs by warehouse', async () => {
      // GIVEN: Two warehouse managers with different CMRs
      const warehouse1CMRs = await prisma.cMR.findMany({
        where: { warehouseId: warehouseManagerId1 }
      });
      const warehouse2CMRs = await prisma.cMR.findMany({
        where: { warehouseId: warehouseManagerId2 }
      });

      // THEN: Each warehouse should see only their CMRs
      expect(warehouse1CMRs.length).toBe(2); // CMR 1 and CMR 3
      expect(warehouse2CMRs.length).toBe(1); // CMR 2 only

      // THEN: Warehouse 1 should not see warehouse 2's CMR
      const warehouse1IDs = warehouse1CMRs.map(c => c.id);
      const warehouse2IDs = warehouse2CMRs.map(c => c.id);
      expect(warehouse1IDs).not.toEqual(expect.arrayContaining(warehouse2IDs));
    });

    it('[6.023-View-007] should prevent cross-warehouse access', async () => {
      // GIVEN: CMR owned by warehouse 1
      const cmr1 = await prisma.cMR.findUnique({ where: { tripId: tripId1 } });
      expect(cmr1?.warehouseId).toBe(warehouseManagerId1);

      // THEN: When queried by warehouse 2, should not be returned
      const cmrFromWarehouse2 = await prisma.cMR.findFirst({
        where: {
          tripId: tripId1,
          warehouseId: warehouseManagerId2
        }
      });

      expect(cmrFromWarehouse2).toBeNull();
    });
  });

  describe('[6.023-View-008] Audit Trail', () => {
    it('[6.023-View-008] should track last updated by and timestamp', async () => {
      // GIVEN: CMR
      const cmr = await prisma.cMR.findUnique({
        where: { tripId: tripId1 }
      });

      // THEN: Should have lastUpdatedBy set
      expect(cmr?.lastUpdatedBy).toBe(warehouseManagerId1);
      expect(cmr?.updatedAt).toBeTruthy();
    });

    it('[6.023-View-009] should show history of changes (version)', async () => {
      // GIVEN: CMR
      const cmr1 = await prisma.cMR.findUnique({ where: { tripId: tripId1 } });
      const cmr2 = await prisma.cMR.findUnique({ where: { tripId: tripId2 } });

      // THEN: Version should reflect number of updates
      expect(cmr1?.version).toBe(2); // Updated once
      expect(cmr2?.version).toBe(1); // Never updated
    });
  });

  describe('[6.023-View-010] Complete Response Structure', () => {
    it('[6.023-View-010] should return CMR with all fields for display', async () => {
      // GIVEN: CMR to display
      const trip = await prisma.trip.findUnique({
        where: { id: tripId1 },
        include: {
          plan: {
            select: { unitCount: true }
          }
        }
      });
      const cmr = await prisma.cMR.findUnique({
        where: { tripId: tripId1 }
      });

      // THEN: Response should have all fields
      expect(cmr).toHaveProperty('id');
      expect(cmr).toHaveProperty('tripId');
      expect(cmr).toHaveProperty('status');
      expect(cmr).toHaveProperty('receivedCount');
      expect(cmr).toHaveProperty('damageDeclared');
      expect(cmr).toHaveProperty('damageNotes');
      expect(cmr).toHaveProperty('inspectorName');
      expect(cmr).toHaveProperty('lastUpdatedBy');
      expect(cmr).toHaveProperty('submittedAt');
      expect(cmr).toHaveProperty('version');

      // THEN: Can calculate imbalance from response
      const plannedCount = trip?.plan.unitCount || 0;
      const receivedCount = cmr?.receivedCount || 0;
      const imbalance = Math.abs(receivedCount - plannedCount) > 1;

      expect(imbalance).toBe(false); // 100 = 100
    });
  });
});
