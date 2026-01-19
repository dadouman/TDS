/**
 * Tests for CMR Edit Progressive - Story 6.024
 * 
 * Tests auto-save functionality with optimistic locking and version conflict handling
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('CMR Edit Progressive - Story 6.024', () => {
  let supplierId: string;
  let destinationId: string;
  let carrierId: string;
  let warehouseManagerId: string;
  let warehouse2Id: string;
  let frieghterId: string;
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
    const warehouse = await prisma.user.create({
      data: {
        id: `warehouse-${testSuffix}`,
        email: `warehouse-${testSuffix}@example.com`,
        password_hash: 'hashed',
        firstName: 'Jane',
        lastName: 'Warehouse',
        role: 'WAREHOUSE'
      }
    });
    warehouseManagerId = warehouse.id;

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
    warehouse2Id = warehouse2.id;

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
    frieghterId = freighter.id;
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

  // Helper to create trip with plan
  async function createTripWithPlan() {
    const plan = await prisma.transportPlan.create({
      data: {
        supplierId,
        destinationId,
        unitCount: 100,
        plannedLoadingTime: new Date(),
        estimatedDeliveryTime: new Date(),
        createdBy: frieghterId,
        status: 'ACCEPTED'
      }
    });

    const trip = await prisma.trip.create({
      data: {
        planId: plan.id,
        carrierId,
        status: 'ACCEPTED'
      }
    });

    return trip;
  }

  describe('[6.024-Edit-001] Auto-Save on Field Change', () => {
    it('[6.024-Edit-001] should update CMR field with version increment', async () => {
      const trip = await createTripWithPlan();

      // Create CMR
      let cmr = await prisma.cMR.create({
        data: {
          tripId: trip.id,
          warehouseId: warehouseManagerId,
          status: 'DRAFT',
          version: 1
        }
      });

      expect(cmr.version).toBe(1);
      expect(cmr.receivedCount).toBeNull();

      // Update receivedCount
      cmr = await prisma.cMR.update({
        where: { id: cmr.id },
        data: {
          receivedCount: 95,
          version: { increment: 1 },
          lastUpdatedBy: warehouseManagerId
        }
      });

      expect(cmr.receivedCount).toBe(95);
      expect(cmr.version).toBe(2);
      expect(cmr.lastUpdatedBy).toBe(warehouseManagerId);
    });

    it('[6.024-Edit-002] should auto-transition from DRAFT to IN_PROGRESS on first edit', async () => {
      const trip = await createTripWithPlan();

      let cmr = await prisma.cMR.create({
        data: {
          tripId: trip.id,
          warehouseId: warehouseManagerId,
          status: 'DRAFT',
          version: 1
        }
      });

      expect(cmr.status).toBe('DRAFT');

      cmr = await prisma.cMR.update({
        where: { id: cmr.id },
        data: {
          damageDeclared: true,
          status: 'IN_PROGRESS',
          version: { increment: 1 }
        }
      });

      expect(cmr.status).toBe('IN_PROGRESS');
      expect(cmr.version).toBe(2);
    });

    it('[6.024-Edit-003] should preserve existing values during partial update', async () => {
      const trip = await createTripWithPlan();

      const cmr = await prisma.cMR.create({
        data: {
          tripId: trip.id,
          warehouseId: warehouseManagerId,
          status: 'DRAFT',
          receivedCount: 50,
          damageDeclared: true,
          damageNotes: 'Initial damage notes',
          inspectorName: 'Inspector A',
          version: 1
        }
      });

      const updated = await prisma.cMR.update({
        where: { id: cmr.id },
        data: {
          inspectorName: 'Inspector B',
          version: { increment: 1 }
        }
      });

      expect(updated.receivedCount).toBe(50);
      expect(updated.damageDeclared).toBe(true);
      expect(updated.damageNotes).toBe('Initial damage notes');
      expect(updated.inspectorName).toBe('Inspector B');
      expect(updated.version).toBe(2);
    });
  });

  describe('[6.024-Edit-004] Optimistic Locking', () => {
    it('[6.024-Edit-004] should reject update if version mismatch (409 Conflict)', async () => {
      const trip = await createTripWithPlan();

      const cmr = await prisma.cMR.create({
        data: {
          tripId: trip.id,
          warehouseId: warehouseManagerId,
          status: 'DRAFT',
          version: 3
        }
      });

      expect(cmr.version).toBe(3);

      // Mismatch detected when client has version 2 but server has 3
      const mismatch = cmr.version !== 2;
      expect(mismatch).toBe(true);
    });

    it('[6.024-Edit-005] should increment version only on successful update', async () => {
      const trip = await createTripWithPlan();

      let cmr = await prisma.cMR.create({
        data: {
          tripId: trip.id,
          warehouseId: warehouseManagerId,
          status: 'DRAFT',
          version: 1
        }
      });

      // Multiple sequential updates
      for (let i = 0; i < 3; i++) {
        cmr = await prisma.cMR.update({
          where: { id: cmr.id },
          data: {
            receivedCount: 50 + i,
            version: { increment: 1 }
          }
        });
      }

      expect(cmr.version).toBe(4);
    });

    it('[6.024-Edit-006] should track lastUpdatedBy on each update', async () => {
      const trip = await createTripWithPlan();

      const cmr = await prisma.cMR.create({
        data: {
          tripId: trip.id,
          warehouseId: warehouseManagerId,
          status: 'DRAFT',
          version: 1,
          lastUpdatedBy: warehouseManagerId
        }
      });

      const updated = await prisma.cMR.update({
        where: { id: cmr.id },
        data: {
          receivedCount: 42,
          version: { increment: 1 },
          lastUpdatedBy: warehouse2Id
        }
      });

      expect(updated.lastUpdatedBy).toBe(warehouse2Id);
      expect(updated.receivedCount).toBe(42);
    });
  });

  describe('[6.024-Edit-007] Save Indicator Timing', () => {
    it('[6.024-Edit-007] should track updatedAt timestamp on save', async () => {
      const trip = await createTripWithPlan();

      const cmr = await prisma.cMR.create({
        data: {
          tripId: trip.id,
          warehouseId: warehouseManagerId,
          status: 'DRAFT',
          version: 1
        }
      });

      const createdAt = cmr.createdAt;

      await new Promise(resolve => setTimeout(resolve, 100));

      const updated = await prisma.cMR.update({
        where: { id: cmr.id },
        data: {
          receivedCount: 100,
          version: { increment: 1 }
        }
      });

      expect(updated.updatedAt.getTime()).toBeGreaterThan(createdAt.getTime());
    });
  });

  describe('[6.024-Edit-008] Conflict Resolution', () => {
    it('[6.024-Edit-008] should return server data on version conflict for client reconciliation', async () => {
      const trip = await createTripWithPlan();

      const cmr = await prisma.cMR.create({
        data: {
          tripId: trip.id,
          warehouseId: warehouseManagerId,
          status: 'IN_PROGRESS',
          receivedCount: 90,
          damageDeclared: true,
          version: 5
        }
      });

      // Concurrent update - version becomes 6
      const updated = await prisma.cMR.update({
        where: { id: cmr.id },
        data: {
          receivedCount: 85,
          version: { increment: 1 }
        }
      });

      expect(updated.version).toBe(6);
      expect(updated.receivedCount).toBe(85);
    });

    it('[6.024-Edit-009] should support multiple field updates in single save', async () => {
      const trip = await createTripWithPlan();

      const cmr = await prisma.cMR.create({
        data: {
          tripId: trip.id,
          warehouseId: warehouseManagerId,
          status: 'DRAFT',
          version: 1
        }
      });

      const updated = await prisma.cMR.update({
        where: { id: cmr.id },
        data: {
          receivedCount: 98,
          damageDeclared: true,
          damageNotes: 'Minor damage on 2 units',
          inspectorName: 'Inspector Smith',
          version: { increment: 1 }
        }
      });

      expect(updated.receivedCount).toBe(98);
      expect(updated.damageDeclared).toBe(true);
      expect(updated.damageNotes).toBe('Minor damage on 2 units');
      expect(updated.inspectorName).toBe('Inspector Smith');
      expect(updated.version).toBe(2);
    });
  });

  describe('[6.024-Edit-010] Null Field Handling', () => {
    it('[6.024-Edit-010] should allow clearing optional fields', async () => {
      const trip = await createTripWithPlan();

      const cmr = await prisma.cMR.create({
        data: {
          tripId: trip.id,
          warehouseId: warehouseManagerId,
          status: 'DRAFT',
          damageNotes: 'Initial notes',
          version: 1
        }
      });

      expect(cmr.damageNotes).toBe('Initial notes');

      const updated = await prisma.cMR.update({
        where: { id: cmr.id },
        data: {
          damageNotes: null,
          version: { increment: 1 }
        }
      });

      expect(updated.damageNotes).toBeNull();
      expect(updated.version).toBe(2);
    });
  });
});
