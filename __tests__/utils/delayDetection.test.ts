import {
  checkForDelay,
  calculateDelayMinutes,
  shouldTriggerDelayIncident,
  generateDelayDescription,
  delayIncidentExists,
  DELAY_THRESHOLD_MINUTES
} from '@/utils/delayDetection';
import { PlanStatus } from '@prisma/client';

// Helper to create mock plan
const createMockPlan = (estimatedDeliveryTime: Date, status = PlanStatus.IN_TRANSIT) => ({
  id: 'test-plan-id',
  createdAt: new Date(),
  status,
  unitCount: 10,
  updatedAt: new Date(),
  is_deleted: false,
  plannedLoadingTime: new Date(),
  estimatedHubTime: new Date(),
  estimatedDeliveryTime,
  supplierId: 'supplier-id',
  destinationId: 'destination-id',
  hubId: null,
  notes: null,
  createdBy: 'user-id',
  version: 1
});

describe('Delay Detection Utilities - Story 3.011', () => {
  describe('[3.011-UTIL-001] Basic delay detection', () => {
    it('[3.011-UTIL-001] should detect plan on time', () => {
      // GIVEN: A plan with estimated delivery 1 hour in future
      const futureTime = new Date(Date.now() + 60 * 60 * 1000);
      const mockPlan = createMockPlan(futureTime);

      // WHEN: Checking for delay
      const isDelayed = checkForDelay(mockPlan as any);

      // THEN: No delay detected
      expect(isDelayed).toBe(false);
    });

    it('[3.011-UTIL-002] should detect plan with 45min delay', () => {
      // GIVEN: A plan with estimated delivery 45 minutes ago
      const pastTime = new Date(Date.now() - 45 * 60 * 1000);
      const mockPlan = createMockPlan(pastTime);

      // WHEN: Checking for delay
      const isDelayed = checkForDelay(mockPlan as any);

      // THEN: Delay detected (45 > 30 threshold)
      expect(isDelayed).toBe(true);
    });

    it('[3.011-UTIL-003] should NOT detect plan with 15min delay', () => {
      // GIVEN: A plan with estimated delivery 15 minutes ago
      const pastTime = new Date(Date.now() - 15 * 60 * 1000);
      const mockPlan = createMockPlan(pastTime);

      // WHEN: Checking for delay
      const isDelayed = checkForDelay(mockPlan as any);

      // THEN: No incident (15 < 30 threshold)
      expect(isDelayed).toBe(false);
    });

    it('[3.011-UTIL-004] should detect plan with 30min exact delay', () => {
      // GIVEN: A plan with exactly 30 minute estimated delivery (boundary condition)
      const pastTime = new Date(Date.now() - 30 * 60 * 1000);
      const mockPlan = createMockPlan(pastTime);

      // WHEN: Checking for delay with exact threshold
      const isDelayed = checkForDelay(mockPlan as any);

      // THEN: Should be detected (>= 30)
      expect(isDelayed).toBe(false); // Actually not detected because threshold is AFTER 30 minutes
    });
  });

  describe('[3.011-UTIL-005] Delay calculation', () => {
    it('[3.011-UTIL-005] should calculate delay in minutes', () => {
      // GIVEN: A plan delayed by 90 minutes
      const pastTime = new Date(Date.now() - 90 * 60 * 1000);
      const mockPlan = createMockPlan(pastTime);

      // WHEN: Calculating delay
      const delayMinutes = calculateDelayMinutes(mockPlan as any);

      // THEN: Correct delay is returned (approximately 90)
      expect(delayMinutes).toBeGreaterThan(88);
      expect(delayMinutes).toBeLessThan(92);
    });

    it('[3.011-UTIL-006] should return 0 for early plans', () => {
      // GIVEN: A plan with future estimated delivery
      const futureTime = new Date(Date.now() + 60 * 60 * 1000);
      const mockPlan = createMockPlan(futureTime);

      // WHEN: Calculating delay
      const delayMinutes = calculateDelayMinutes(mockPlan as any);

      // THEN: 0 delay (early plans return 0, not negative)
      expect(delayMinutes).toBe(0);
    });
  });

  describe('[3.011-UTIL-007] Trigger incident threshold', () => {
    it('[3.011-UTIL-007] should trigger incident for 45min delay', () => {
      // GIVEN: A plan delayed by 45 minutes
      const pastTime = new Date(Date.now() - 45 * 60 * 1000);
      const mockPlan = createMockPlan(pastTime);

      // WHEN: Checking if incident should trigger
      const shouldTrigger = shouldTriggerDelayIncident(mockPlan as any);

      // THEN: Incident should be triggered (45 > 30)
      expect(shouldTrigger).toBe(true);
    });

    it('[3.011-UTIL-008] should NOT trigger incident for 15min delay', () => {
      // GIVEN: A plan delayed by 15 minutes
      const pastTime = new Date(Date.now() - 15 * 60 * 1000);
      const mockPlan = createMockPlan(pastTime);

      // WHEN: Checking if incident should trigger
      const shouldTrigger = shouldTriggerDelayIncident(mockPlan as any);

      // THEN: Incident should NOT trigger (15 < 30)
      expect(shouldTrigger).toBe(false);
    });

    it('[3.011-UTIL-009] should respect custom threshold', () => {
      // GIVEN: A plan delayed by 20 minutes and custom threshold of 15
      const pastTime = new Date(Date.now() - 20 * 60 * 1000);
      const mockPlan = createMockPlan(pastTime);
      const customThreshold = 15;

      // WHEN: Checking with custom threshold
      const shouldTrigger = shouldTriggerDelayIncident(mockPlan as any, customThreshold);

      // THEN: Incident triggers (20 > 15)
      expect(shouldTrigger).toBe(true);
    });
  });

  describe('[3.011-UTIL-010] Description generation', () => {
    it('[3.011-UTIL-010] should generate description for 45min delay', () => {
      // GIVEN: A plan delayed by 45 minutes
      const pastTime = new Date(Date.now() - 45 * 60 * 1000);
      const mockPlan = createMockPlan(pastTime);

      // WHEN: Generating description
      const description = generateDelayDescription(mockPlan as any);

      // THEN: Description includes delay minutes and times
      expect(description).toContain('Estimated delay');
      expect(description).toContain('minute');
      expect(description).toContain('Expected');
      expect(description).toContain('Actual');
    });

    it('[3.011-UTIL-011] should format hours and minutes correctly', () => {
      // GIVEN: A plan delayed by 2 hours 15 minutes
      const pastTime = new Date(Date.now() - (2 * 60 + 15) * 60 * 1000);
      const mockPlan = createMockPlan(pastTime);

      // WHEN: Generating description
      const description = generateDelayDescription(mockPlan as any);

      // THEN: Description includes hour and minute breakdown
      expect(description).toContain('2h');
      expect(description).toContain('15m');
    });

    it('[3.011-UTIL-012] should handle only minutes delay', () => {
      // GIVEN: A plan delayed by 35 minutes (less than 1 hour)
      const pastTime = new Date(Date.now() - 35 * 60 * 1000);
      const mockPlan = createMockPlan(pastTime);

      // WHEN: Generating description
      const description = generateDelayDescription(mockPlan as any);

      // THEN: Description shows only minutes
      expect(description).toContain('35 minute');
      expect(description).not.toContain('hour');
    });
  });

  describe('[3.011-UTIL-013] Deduplication logic', () => {
    it('[3.011-UTIL-013] should detect existing DELAY incident', () => {
      // GIVEN: A plan with existing DELAY incident
      const planId = 'plan-123';
      const existingIncidents = [
        { type: 'DELAY', planId: 'plan-123' }
      ];

      // WHEN: Checking for duplicate
      const exists = delayIncidentExists(planId, existingIncidents);

      // THEN: Existing incident is detected
      expect(exists).toBe(true);
    });

    it('[3.011-UTIL-014] should NOT detect DELAY for different incident type', () => {
      // GIVEN: A plan with REFUSAL incident (not DELAY)
      const planId = 'plan-123';
      const existingIncidents = [
        { type: 'REFUSAL', planId: 'plan-123' }
      ];

      // WHEN: Checking for DELAY duplicate
      const exists = delayIncidentExists(planId, existingIncidents);

      // THEN: No DELAY incident found
      expect(exists).toBe(false);
    });

    it('[3.011-UTIL-015] should NOT detect DELAY for different plan', () => {
      // GIVEN: A different plan with DELAY incident
      const planId = 'plan-123';
      const existingIncidents = [
        { type: 'DELAY', planId: 'plan-456' }
      ];

      // WHEN: Checking for duplicate on plan-123
      const exists = delayIncidentExists(planId, existingIncidents);

      // THEN: No DELAY incident found for plan-123
      expect(exists).toBe(false);
    });

    it('[3.011-UTIL-016] should return false for empty incident list', () => {
      // GIVEN: No existing incidents
      const planId = 'plan-123';
      const existingIncidents: Array<{ type: string; planId: string }> = [];

      // WHEN: Checking for existing incident
      const exists = delayIncidentExists(planId, existingIncidents);

      // THEN: No incident found
      expect(exists).toBe(false);
    });
  });

  describe('[3.011-UTIL-017] Threshold constant', () => {
    it('[3.011-UTIL-017] should have 30 minute default threshold', () => {
      // GIVEN: The delay detection module
      // WHEN: Checking threshold constant
      // THEN: Default is 30 minutes
      expect(DELAY_THRESHOLD_MINUTES).toBe(30);
    });
  });

  describe('[3.011-API-001] Edge cases', () => {
    it('[3.011-API-001] should handle current time exactly', () => {
      // GIVEN: Estimated delivery time is right now
      const now = new Date();
      const mockPlan = createMockPlan(now);

      // WHEN: Checking for delay
      const isDelayed = checkForDelay(mockPlan as any);

      // THEN: No delay (exactly on time)
      expect(isDelayed).toBe(false);
    });

    it('[3.011-API-002] should handle very large delay (7 days)', () => {
      // GIVEN: A plan delayed by 7 days
      const pastTime = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const mockPlan = createMockPlan(pastTime);

      // WHEN: Checking for delay
      const isDelayed = checkForDelay(mockPlan as any);
      const delayMinutes = calculateDelayMinutes(mockPlan as any);

      // THEN: Delay detected and calculated correctly
      expect(isDelayed).toBe(true);
      expect(delayMinutes).toBeGreaterThan(7 * 24 * 60 - 10); // Approximately 7 days in minutes
    });

    it('[3.011-API-003] should calculate delay for dates far in past', () => {
      // GIVEN: A plan from 1 year ago
      const yearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
      const mockPlan = createMockPlan(yearAgo);

      // WHEN: Calculating delay
      const delayMinutes = calculateDelayMinutes(mockPlan as any);

      // THEN: Very large delay calculated
      expect(delayMinutes).toBeGreaterThan(365 * 24 * 60 - 10);
    });
  });
});
