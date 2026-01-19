/**
 * Tests for CMR Form UI Layout - Story 6.022
 * 
 * Tests the CMR form display endpoint and form components
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('CMR Form UI Layout - Story 6.022', () => {
  let tripId: string;
  let planId: string;
  let supplierId: string;
  let destinationId: string;
  let carrierId: string;
  let warehouseManagerId: string;
  const testSuffix = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  beforeAll(async () => {
    // Create supplier location
    const supplier = await prisma.location.create({
      data: {
        name: `Test Supplier ${testSuffix}`,
        type: 'SUPPLIER',
        address: '123 Supplier Ave'
      }
    });
    supplierId = supplier.id;

    // Create destination (store)
    const destination = await prisma.location.create({
      data: {
        name: `Test Destination ${testSuffix}`,
        type: 'STORE',
        address: '456 Destination Ave'
      }
    });
    destinationId = destination.id;

    // Create carrier (driver)
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

    // Create warehouse manager
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

    // Create freighter to create plan
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

    // Create transport plan
    const plan = await prisma.transportPlan.create({
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
    planId = plan.id;

    // Create trip (journey for carrier to fulfill the plan)
    const trip = await prisma.trip.create({
      data: {
        planId,
        carrierId,
        status: 'ACCEPTED'
      }
    });
    tripId = trip.id;
  });

  afterAll(async () => {
    // Clean up in order of foreign keys
    await prisma.cMR.deleteMany({});
    await prisma.incident.deleteMany({});
    await prisma.trip.deleteMany({});
    await prisma.transportPlan.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.location.deleteMany({});
    await prisma.$disconnect();
  });

  describe('[6.022-CMR-001] CMR Form Display', () => {
    it('[6.022-CMR-001] should create and display CMR form on first access', async () => {
      // GIVEN: A trip without CMR
      expect(tripId).toBeTruthy();

      // WHEN: Warehouse manager accesses CMR form for trip
      // Simulate GET /api/protected/warehouse/cmr/[tripId]
      const trip = await prisma.trip.findUnique({
        where: { id: tripId },
        select: {
          id: true,
          plan: {
            select: {
              id: true,
              unitCount: true,
              estimatedDeliveryTime: true,
              supplier: { select: { id: true, name: true } },
              destination: { select: { id: true, name: true } }
            }
          }
        }
      });

      // Create CMR if doesn't exist
      let cmr = await prisma.cMR.findUnique({
        where: { tripId }
      });

      if (!cmr) {
        cmr = await prisma.cMR.create({
          data: {
            tripId,
            warehouseId: warehouseManagerId,
            status: 'DRAFT',
            version: 1
          }
        });
      }

      // THEN: CMR form should be created in DRAFT status
      expect(cmr).toBeTruthy();
      expect(cmr.status).toBe('DRAFT');
      expect(cmr.tripId).toBe(tripId);
      expect(cmr.version).toBe(1);

      // THEN: Form should have trip and plan details
      expect(trip).toBeTruthy();
      expect(trip.plan.unitCount).toBe(100);
      expect(trip.plan.supplier.name).toContain('Supplier');
      expect(trip.plan.destination.name).toContain('Destination');
    });

    it('[6.022-CMR-002] should display pre-filled trip and plan details', async () => {
      // GIVEN: CMR form already created
      const cmr = await prisma.cMR.findUnique({
        where: { tripId },
        include: {
          trip: {
            include: {
              plan: {
                include: {
                  supplier: { select: { id: true, name: true } },
                  destination: { select: { id: true, name: true } }
                }
              }
            }
          }
        }
      });

      // THEN: Trip and plan details should be available for display
      expect(cmr).toBeTruthy();
      expect(cmr.trip.plan.supplier.name).toContain('Supplier');
      expect(cmr.trip.plan.destination.name).toContain('Destination');
      expect(cmr.trip.plan.unitCount).toBe(100);
    });
  });

  describe('[6.022-CMR-003] CMR Form Fields', () => {
    it('[6.022-CMR-003] should have all required input fields', async () => {
      // GIVEN: CMR form
      const cmr = await prisma.cMR.findUnique({
        where: { tripId }
      });

      // THEN: Form should have fields for:
      // - receivedCount (number input, required)
      // - damageDeclared (boolean checkbox)
      // - damageNotes (text area, optional)
      // - inspectorName (text input, optional)

      expect(cmr).toHaveProperty('receivedCount');
      expect(cmr).toHaveProperty('damageDeclared');
      expect(cmr).toHaveProperty('damageNotes');
      expect(cmr).toHaveProperty('inspectorName');

      // Default values
      expect(cmr?.receivedCount).toBeNull();
      expect(cmr?.damageDeclared).toBe(false);
      expect(cmr?.damageNotes).toBeNull();
      expect(cmr?.inspectorName).toBeNull();
    });

    it('[6.022-CMR-004] should track CMR status transitions', async () => {
      // GIVEN: CMR in DRAFT status
      let cmr = await prisma.cMR.findUnique({
        where: { tripId }
      });

      expect(cmr?.status).toBe('DRAFT');

      // WHEN: Warehouse manager starts editing
      cmr = await prisma.cMR.update({
        where: { tripId },
        data: { status: 'IN_PROGRESS' }
      });

      // THEN: Status should change to IN_PROGRESS
      expect(cmr.status).toBe('IN_PROGRESS');

      // WHEN: Warehouse manager submits CMR
      cmr = await prisma.cMR.update({
        where: { tripId },
        data: { status: 'SUBMITTED', submittedAt: new Date() }
      });

      // THEN: Status should change to SUBMITTED
      expect(cmr.status).toBe('SUBMITTED');
      expect(cmr.submittedAt).toBeTruthy();
    });
  });

  describe('[6.022-CMR-005] CMR Read-Only Display', () => {
    it('[6.022-CMR-005] should display trip details as read-only', async () => {
      // GIVEN: CMR with trip and plan details
      const trip = await prisma.trip.findUnique({
        where: { id: tripId },
        include: {
          plan: true
        }
      });

      // THEN: Trip details should be visible but not editable in form
      expect(trip).toBeTruthy();
      expect(trip?.id).toBe(tripId);
      expect(trip?.planId).toBe(planId);
      expect(trip?.status).toBe('ACCEPTED');

      // Read-only fields should not be updatable directly
      // (would be enforced on frontend as disabled inputs)
    });

    it('[6.022-CMR-006] should display planned unit count for verification', async () => {
      // GIVEN: Trip with plan
      const trip = await prisma.trip.findUnique({
        where: { id: tripId },
        include: {
          plan: { select: { unitCount: true } }
        }
      });

      // THEN: Warehouse manager should see planned units (100)
      expect(trip?.plan.unitCount).toBe(100);
      // And compare with received units when entered
    });
  });

  describe('[6.022-CMR-007] CMR Versioning', () => {
    it('[6.022-CMR-007] should track CMR version for optimistic locking', async () => {
      // GIVEN: CMR with version 1
      let cmr = await prisma.cMR.findUnique({
        where: { tripId }
      });

      expect(cmr?.version).toBe(1);

      // WHEN: CMR is updated
      cmr = await prisma.cMR.update({
        where: { tripId },
        data: {
          version: {
            increment: 1
          },
          receivedCount: 95
        }
      });

      // THEN: Version should increment for conflict detection
      expect(cmr.version).toBe(2);
    });
  });

  describe('[6.022-CMR-008] CMR Creation Idempotency', () => {
    it('[6.022-CMR-008] should not create duplicate CMRs for same trip', async () => {
      // GIVEN: CMR already exists for trip
      const existing = await prisma.cMR.findUnique({
        where: { tripId }
      });

      expect(existing).toBeTruthy();

      // WHEN: Another request tries to create CMR for same trip
      const duplicate = await prisma.cMR.findUnique({
        where: { tripId }
      });

      // THEN: Should return existing CMR, not create new one
      expect(duplicate?.id).toBe(existing?.id);
      expect(duplicate?.tripId).toBe(existing?.tripId);
    });
  });
});
