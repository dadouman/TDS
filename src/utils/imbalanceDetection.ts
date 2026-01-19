/**
 * Imbalance Detection Utilities
 * Detects when actual delivered units don't match planned units
 */

export const IMBALANCE_TOLERANCE = 1; // Units tolerance (configurable via env)

/**
 * Detect if there's an imbalance between planned and actual units
 * @param plannedUnits - Number of units in transport plan
 * @param actualUnits - Number of units actually received
 * @param tolerance - Allowed difference (default: 1 unit)
 * @returns true if |actual - planned| > tolerance
 */
export function detectImbalance(
  plannedUnits: number,
  actualUnits: number,
  tolerance: number = IMBALANCE_TOLERANCE
): boolean {
  const difference = Math.abs(actualUnits - plannedUnits);
  return difference > tolerance;
}

/**
 * Calculate the imbalance details
 * @param plannedUnits - Number of units in transport plan
 * @param actualUnits - Number of units actually received
 * @returns Object with difference, percentage, and direction
 */
export function calculateImbalanceDetails(
  plannedUnits: number,
  actualUnits: number
): {
  difference: number;
  percentageDifference: number;
  direction: 'shortage' | 'surplus';
} {
  const difference = actualUnits - plannedUnits;
  const percentageDifference = (difference / plannedUnits) * 100;

  return {
    difference: Math.abs(difference),
    percentageDifference: Math.round(percentageDifference * 100) / 100,
    direction: difference < 0 ? 'shortage' : 'surplus'
  };
}

/**
 * Generate imbalance incident description
 * @param plannedUnits - Number of units in transport plan
 * @param actualUnits - Number of units actually received
 * @returns Human-readable description
 */
export function generateImbalanceDescription(
  plannedUnits: number,
  actualUnits: number
): string {
  const details = calculateImbalanceDetails(plannedUnits, actualUnits);
  const direction = details.direction === 'shortage' ? 'less' : 'more';

  return `Unit count mismatch. Planned: ${plannedUnits}, Actual: ${actualUnits}, Difference: ${details.difference} unit(s) ${direction} (${details.percentageDifference}%)`;
}

/**
 * Validate unit counts (basic sanity checks)
 * @param plannedUnits - Number of units in transport plan
 * @param actualUnits - Number of units actually received
 * @returns Array of validation errors (empty if valid)
 */
export function validateUnitCounts(
  plannedUnits: number,
  actualUnits: number
): string[] {
  const errors: string[] = [];

  if (!Number.isInteger(plannedUnits) || plannedUnits < 0) {
    errors.push('Planned units must be a non-negative integer');
  }

  if (!Number.isInteger(actualUnits) || actualUnits < 0) {
    errors.push('Actual units must be a non-negative integer');
  }

  if (plannedUnits === 0) {
    errors.push('Cannot detect imbalance: planned units is 0');
  }

  return errors;
}

/**
 * Check if incident already exists for a plan to avoid duplicates
 * @param planId - Transport plan ID
 * @param incidents - Array of existing incidents
 * @returns true if IMBALANCE incident already exists for plan
 */
export function imbalanceIncidentExists(
  planId: string,
  incidents: Array<{ type: string; planId: string }>
): boolean {
  return incidents.some(
    incident =>
      incident.type === 'IMBALANCE' && incident.planId === planId
  );
}

/**
 * Determine severity level of imbalance
 * @param percentage - Percentage difference
 * @returns Severity level: 'low', 'medium', 'high'
 */
export function getImbalanceSeverity(percentageDifference: number): 'low' | 'medium' | 'high' {
  const abs = Math.abs(percentageDifference);
  
  if (abs <= 5) {
    return 'low';
  } else if (abs <= 10) {
    return 'medium';
  }
  
  return 'high';
}
