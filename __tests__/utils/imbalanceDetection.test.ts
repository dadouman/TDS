import {
  detectImbalance,
  calculateImbalanceDetails,
  generateImbalanceDescription,
  validateUnitCounts,
  imbalanceIncidentExists,
  getImbalanceSeverity,
  IMBALANCE_TOLERANCE
} from '@/utils/imbalanceDetection';

describe('Imbalance Detection Utilities - Story 3.012', () => {
  describe('[3.012-UTIL-001] Basic imbalance detection', () => {
    it('[3.012-UTIL-001] should NOT detect imbalance within tolerance', () => {
      // GIVEN: Plan expects 50 units, receives 50 units
      const plannedUnits = 50;
      const actualUnits = 50;

      // WHEN: Detecting imbalance
      const hasImbalance = detectImbalance(plannedUnits, actualUnits);

      // THEN: No imbalance (exact match)
      expect(hasImbalance).toBe(false);
    });

    it('[3.012-UTIL-002] should NOT detect ±1 unit difference', () => {
      // GIVEN: Plan expects 50 units
      // WHEN: Receives 49 or 51 units (within tolerance of 1)
      expect(detectImbalance(50, 49)).toBe(false);
      expect(detectImbalance(50, 51)).toBe(false);

      // THEN: No imbalance detected
    });

    it('[3.012-UTIL-003] should detect 2 unit shortage', () => {
      // GIVEN: Plan expects 50 units, receives 48 units
      const plannedUnits = 50;
      const actualUnits = 48;

      // WHEN: Detecting imbalance
      const hasImbalance = detectImbalance(plannedUnits, actualUnits);

      // THEN: Imbalance detected (2 > tolerance of 1)
      expect(hasImbalance).toBe(true);
    });

    it('[3.012-UTIL-004] should detect 3 unit surplus', () => {
      // GIVEN: Plan expects 50 units, receives 53 units
      const plannedUnits = 50;
      const actualUnits = 53;

      // WHEN: Detecting imbalance
      const hasImbalance = detectImbalance(plannedUnits, actualUnits);

      // THEN: Imbalance detected (3 > tolerance of 1)
      expect(hasImbalance).toBe(true);
    });

    it('[3.012-UTIL-005] should respect custom tolerance', () => {
      // GIVEN: Plan expects 100 units, receives 105 units, tolerance = 10
      const plannedUnits = 100;
      const actualUnits = 105;
      const customTolerance = 10;

      // WHEN: Detecting with custom tolerance
      const hasImbalance = detectImbalance(plannedUnits, actualUnits, customTolerance);

      // THEN: No imbalance (5 < 10)
      expect(hasImbalance).toBe(false);
    });
  });

  describe('[3.012-UTIL-006] Imbalance calculations', () => {
    it('[3.012-UTIL-006] should calculate shortage correctly', () => {
      // GIVEN: Plan expects 100 units, receives 80 units
      const plannedUnits = 100;
      const actualUnits = 80;

      // WHEN: Calculating details
      const details = calculateImbalanceDetails(plannedUnits, actualUnits);

      // THEN: Shortage of 20 units = 20% difference
      expect(details.difference).toBe(20);
      expect(details.percentageDifference).toBe(-20);
      expect(details.direction).toBe('shortage');
    });

    it('[3.012-UTIL-007] should calculate surplus correctly', () => {
      // GIVEN: Plan expects 50 units, receives 60 units
      const plannedUnits = 50;
      const actualUnits = 60;

      // WHEN: Calculating details
      const details = calculateImbalanceDetails(plannedUnits, actualUnits);

      // THEN: Surplus of 10 units = 20% difference
      expect(details.difference).toBe(10);
      expect(details.percentageDifference).toBe(20);
      expect(details.direction).toBe('surplus');
    });

    it('[3.012-UTIL-008] should calculate fractional percentage', () => {
      // GIVEN: Plan expects 33 units, receives 35 units
      const plannedUnits = 33;
      const actualUnits = 35;

      // WHEN: Calculating details
      const details = calculateImbalanceDetails(plannedUnits, actualUnits);

      // THEN: Percentage is 6.06% (rounded)
      expect(details.percentageDifference).toBeGreaterThan(6);
      expect(details.percentageDifference).toBeLessThan(6.1);
    });
  });

  describe('[3.012-UTIL-009] Description generation', () => {
    it('[3.012-UTIL-009] should generate description for shortage', () => {
      // GIVEN: Plan expects 50 units, receives 48 units
      const plannedUnits = 50;
      const actualUnits = 48;

      // WHEN: Generating description
      const description = generateImbalanceDescription(plannedUnits, actualUnits);

      // THEN: Description includes shortage details
      expect(description).toContain('Unit count mismatch');
      expect(description).toContain('Planned: 50');
      expect(description).toContain('Actual: 48');
      expect(description).toContain('Difference: 2');
      expect(description).toContain('less');
    });

    it('[3.012-UTIL-010] should generate description for surplus', () => {
      // GIVEN: Plan expects 100 units, receives 105 units
      const plannedUnits = 100;
      const actualUnits = 105;

      // WHEN: Generating description
      const description = generateImbalanceDescription(plannedUnits, actualUnits);

      // THEN: Description includes surplus details
      expect(description).toContain('Unit count mismatch');
      expect(description).toContain('Planned: 100');
      expect(description).toContain('Actual: 105');
      expect(description).toContain('Difference: 5');
      expect(description).toContain('more');
    });
  });

  describe('[3.012-UTIL-011] Unit count validation', () => {
    it('[3.012-UTIL-011] should validate valid unit counts', () => {
      // GIVEN: Valid unit counts
      // WHEN: Validating
      const errors = validateUnitCounts(50, 48);

      // THEN: No errors
      expect(errors).toHaveLength(0);
    });

    it('[3.012-UTIL-012] should reject negative planned units', () => {
      // GIVEN: Negative planned units
      // WHEN: Validating
      const errors = validateUnitCounts(-5, 50);

      // THEN: Error returned
      expect(errors).toContain('Planned units must be a non-negative integer');
    });

    it('[3.012-UTIL-013] should reject negative actual units', () => {
      // GIVEN: Negative actual units
      // WHEN: Validating
      const errors = validateUnitCounts(50, -10);

      // THEN: Error returned
      expect(errors).toContain('Actual units must be a non-negative integer');
    });

    it('[3.012-UTIL-014] should reject non-integer units', () => {
      // GIVEN: Float unit counts
      // WHEN: Validating
      const errors = validateUnitCounts(50.5, 48.2);

      // THEN: Error returned
      expect(errors.length).toBeGreaterThan(0);
    });

    it('[3.012-UTIL-015] should reject zero planned units', () => {
      // GIVEN: Plan with 0 units
      // WHEN: Validating
      const errors = validateUnitCounts(0, 5);

      // THEN: Error returned (cannot detect imbalance)
      expect(errors).toContain('Cannot detect imbalance: planned units is 0');
    });
  });

  describe('[3.012-UTIL-016] Deduplication logic', () => {
    it('[3.012-UTIL-016] should detect existing IMBALANCE incident', () => {
      // GIVEN: A plan with existing IMBALANCE incident
      const planId = 'plan-123';
      const existingIncidents = [
        { type: 'IMBALANCE', planId: 'plan-123' }
      ];

      // WHEN: Checking for duplicate
      const exists = imbalanceIncidentExists(planId, existingIncidents);

      // THEN: Existing incident is detected
      expect(exists).toBe(true);
    });

    it('[3.012-UTIL-017] should NOT detect IMBALANCE for different type', () => {
      // GIVEN: A plan with DELAY incident (not IMBALANCE)
      const planId = 'plan-123';
      const existingIncidents = [
        { type: 'DELAY', planId: 'plan-123' }
      ];

      // WHEN: Checking for IMBALANCE
      const exists = imbalanceIncidentExists(planId, existingIncidents);

      // THEN: No IMBALANCE incident found
      expect(exists).toBe(false);
    });

    it('[3.012-UTIL-018] should return false for empty list', () => {
      // GIVEN: No incidents
      const planId = 'plan-123';
      const existingIncidents: Array<{ type: string; planId: string }> = [];

      // WHEN: Checking for incident
      const exists = imbalanceIncidentExists(planId, existingIncidents);

      // THEN: No incident found
      expect(exists).toBe(false);
    });
  });

  describe('[3.012-UTIL-019] Severity levels', () => {
    it('[3.012-UTIL-019] should classify ±5% as low severity', () => {
      // GIVEN: 5% imbalance
      const severity = getImbalanceSeverity(5);

      // THEN: Low severity
      expect(severity).toBe('low');
    });

    it('[3.012-UTIL-020] should classify ±7% as medium severity', () => {
      // GIVEN: 7% imbalance
      const severity = getImbalanceSeverity(7);

      // THEN: Medium severity
      expect(severity).toBe('medium');
    });

    it('[3.012-UTIL-021] should classify ±15% as high severity', () => {
      // GIVEN: 15% imbalance
      const severity = getImbalanceSeverity(15);

      // THEN: High severity
      expect(severity).toBe('high');
    });

    it('[3.012-UTIL-022] should classify -10% as medium severity', () => {
      // GIVEN: -10% imbalance (negative)
      const severity = getImbalanceSeverity(-10);

      // THEN: Medium severity (uses absolute value)
      expect(severity).toBe('medium');
    });
  });

  describe('[3.012-UTIL-023] Edge cases', () => {
    it('[3.012-UTIL-023] should handle very large unit counts', () => {
      // GIVEN: Plan with 1,000,000 units
      const plannedUnits = 1000000;
      const actualUnits = 999998;

      // WHEN: Detecting imbalance (difference is 2, which exceeds tolerance of 1)
      const hasImbalance = detectImbalance(plannedUnits, actualUnits);

      // THEN: Imbalance detected (2 > tolerance of 1)
      expect(hasImbalance).toBe(true);
    });

    it('[3.012-UTIL-024] should handle zero actual units', () => {
      // GIVEN: Plan expects 50 units, receives 0 (total loss)
      const plannedUnits = 50;
      const actualUnits = 0;

      // WHEN: Detecting imbalance
      const hasImbalance = detectImbalance(plannedUnits, actualUnits);
      const details = calculateImbalanceDetails(plannedUnits, actualUnits);

      // THEN: Severe imbalance detected
      expect(hasImbalance).toBe(true);
      expect(details.difference).toBe(50);
      expect(details.percentageDifference).toBe(-100);
    });
  });

  describe('[3.012-UTIL-025] Tolerance constant', () => {
    it('[3.012-UTIL-025] should have 1 unit default tolerance', () => {
      // GIVEN: The imbalance detection module
      // THEN: Default tolerance is 1 unit
      expect(IMBALANCE_TOLERANCE).toBe(1);
    });
  });
});
