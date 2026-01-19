/**
 * Integration tests for CMR Submit endpoint with Imbalance Detection
 * Story 3.012: Detect Imbalance Incidents
 * Tests the flow: CMR Submit → Imbalance Detection → Incident Creation
 */

import { PrismaClient, IncidentType } from '@prisma/client';
import { detectImbalance, generateImbalanceDescription, validateUnitCounts } from '@/utils/imbalanceDetection';

const prisma = new PrismaClient();

/**
 * Direct unit test for CMR submit logic without Next.js handler
 * Tests the core business logic: detect imbalance and create incident
 */

describe('CMR Submit Logic with Imbalance Detection - Story 3.012', () => {
  let testPlanId: string;
  let testPlanId2: string;

  beforeAll(async () => {
    // Create test locations
    const supplier = await prisma.location.create({
      data: { name: 'Test Supplier', type: 'SUPPLIER', address: '123 Main St' }
    });

    const destination = await prisma.location.create({
      data: { name: 'Test Destination', type: 'STORE', address: '456 Oak Ave' }
    });

    // Create test user
    await prisma.user.create({
      data: {
        id: 'test-freighter-001',
        email: 'freighter@example.com',
        password_hash: 'hashed',
        firstName: 'John',
        lastName: 'Freighter',
        role: 'FREIGHTER'
      }
    });

    // Create test plan 1
    const plan1 = await prisma.transportPlan.create({
      data: {
        supplierId: supplier.id,
        destinationId: destination.id,
        unitCount: 50,
        plannedLoadingTime: new Date('2026-01-20T10:00:00Z'),
        createdBy: 'test-freighter-001',
        status: 'PROPOSED'
      }
    });
    testPlanId = plan1.id;

    // Create test plan 2 for deduplication test
    const plan2 = await prisma.transportPlan.create({
      data: {
        supplierId: supplier.id,
        destinationId: destination.id,
        unitCount: 100,
        plannedLoadingTime: new Date('2026-01-21T10:00:00Z'),
        createdBy: 'test-freighter-001',
        status: 'PROPOSED'
      }
    });
    testPlanId2 = plan2.id;
  });

  afterAll(async () => {
    await prisma.incident.deleteMany({});
    await prisma.transportPlan.deleteMany({});
    await prisma.location.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.$disconnect();
  });

  describe('[3.012-LOGIC-001] Balanced delivery', () => {
    it('[3.012-LOGIC-001] should NOT create incident when units match exactly', async () => {
      // GIVEN: Plan expects 50 units
      const plannedUnits = 50;
      const actualUnits = 50;

      // WHEN: Detecting imbalance
      const hasImbalance = detectImbalance(plannedUnits, actualUnits);

      // THEN: No imbalance detected
      expect(hasImbalance).toBe(false);

      // AND: No incident would be created
      if (hasImbalance) {
        // This block should not execute
        throw new Error('Should not create incident');
      }
    });
  });

  describe('[3.012-LOGIC-002] Within tolerance', () => {
    it('[3.012-LOGIC-002] should NOT create incident when ±1 difference', async () => {
      // Surplus case
      let planned = 50;
      let actual = 51;
      expect(detectImbalance(planned, actual)).toBe(false);

      // Shortage case
      planned = 50;
      actual = 49;
      expect(detectImbalance(planned, actual)).toBe(false);
    });
  });

  describe('[3.012-LOGIC-003] Exceeding tolerance creates incident', () => {
    it('[3.012-LOGIC-003] should create IMBALANCE incident on 2+ unit shortage', async () => {
      // GIVEN: Plan expects 50 units, actual is 48 (2 unit shortage)
      const plannedUnits = 50;
      const actualUnits = 48;

      // WHEN: Detecting imbalance
      const hasImbalance = detectImbalance(plannedUnits, actualUnits);

      // THEN: Imbalance detected
      expect(hasImbalance).toBe(true);

      // AND: Create incident in database
      const incident = await prisma.incident.create({
        data: {
          type: 'IMBALANCE' as IncidentType,
          status: 'OPEN',
          planId: testPlanId,
          description: generateImbalanceDescription(plannedUnits, actualUnits)
        }
      });

      // THEN: Incident has correct details
      expect(incident.type).toBe('IMBALANCE');
      expect(incident.status).toBe('OPEN');
      expect(incident.description).toContain('Planned: 50');
      expect(incident.description).toContain('Actual: 48');
      expect(incident.description).toContain('2');

      // Cleanup
      await prisma.incident.delete({ where: { id: incident.id } });
    });

    it('[3.012-LOGIC-004] should create IMBALANCE incident on 3+ unit surplus', async () => {
      // GIVEN: Plan expects 50, actual is 53 (3 unit surplus)
      const plannedUnits = 50;
      const actualUnits = 53;

      // WHEN: Detecting imbalance
      const hasImbalance = detectImbalance(plannedUnits, actualUnits);
      expect(hasImbalance).toBe(true);

      // THEN: Incident description describes surplus
      const description = generateImbalanceDescription(plannedUnits, actualUnits);
      expect(description).toContain('53');
      expect(description).toContain('more');
    });
  });

  describe('[3.012-LOGIC-005] Incident deduplication', () => {
    it('[3.012-LOGIC-005] should prevent duplicate IMBALANCE incidents for same plan', async () => {
      // GIVEN: Plan already has an IMBALANCE incident
      const incident1 = await prisma.incident.create({
        data: {
          type: 'IMBALANCE' as IncidentType,
          status: 'OPEN',
          planId: testPlanId2,
          description: 'Test imbalance'
        }
      });

      // WHEN: Checking if IMBALANCE incident already exists
      const existingIncident = await prisma.incident.findFirst({
        where: {
          planId: testPlanId2,
          type: 'IMBALANCE',
          is_deleted: false
        }
      });

      // THEN: Existing incident found, should not create new
      expect(existingIncident).not.toBeNull();
      expect(existingIncident?.id).toBe(incident1.id);

      // Cleanup
      await prisma.incident.delete({ where: { id: incident1.id } });
    });

    it('[3.012-LOGIC-006] should allow multiple different incident types for same plan', async () => {
      // GIVEN: Plan with IMBALANCE incident
      const imbalanceIncident = await prisma.incident.create({
        data: {
          type: 'IMBALANCE' as IncidentType,
          status: 'OPEN',
          planId: testPlanId2,
          description: 'Imbalance test'
        }
      });

      // WHEN: Creating DELAY incident for same plan
      const delayIncident = await prisma.incident.create({
        data: {
          type: 'DELAY' as IncidentType,
          status: 'OPEN',
          planId: testPlanId2,
          description: 'Delay test'
        }
      });

      // THEN: Both incidents exist for same plan
      const incidents = await prisma.incident.findMany({
        where: { planId: testPlanId2, is_deleted: false }
      });

      expect(incidents.length).toBe(2);
      expect(incidents.map(i => i.type)).toContain('IMBALANCE');
      expect(incidents.map(i => i.type)).toContain('DELAY');

      // Cleanup
      await prisma.incident.deleteMany({
        where: { planId: testPlanId2, is_deleted: false }
      });
    });
  });

  describe('[3.012-LOGIC-007] Incident details', () => {
    it('[3.012-LOGIC-007] should generate detailed description with units and percentage', async () => {
      // GIVEN: 100 planned, 80 actual (20% shortage)
      const description = generateImbalanceDescription(100, 80);

      // THEN: Description includes:
      // - Planned vs actual units
      // - Difference count
      // - Percentage
      expect(description).toContain('Planned: 100');
      expect(description).toContain('Actual: 80');
      expect(description).toContain('20');
      expect(description).toContain('-20');
    });
  });

  describe('[3.012-LOGIC-008] Validation', () => {
    it('[3.012-LOGIC-008] should validate unit counts', () => {
      // Valid counts
      const valid = validateUnitCounts(50, 48);
      expect(valid.length).toBe(0);

      // Negative planned
      let errors = validateUnitCounts(-5, 50);
      expect(errors.length).toBeGreaterThan(0);

      // Zero planned (cannot calculate percentage)
      errors = validateUnitCounts(0, 50);
      expect(errors.length).toBeGreaterThan(0);
    });
  });
});
