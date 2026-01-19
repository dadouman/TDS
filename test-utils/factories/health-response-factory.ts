/**
 * Health Response Factory
 * 
 * Factory function for creating health endpoint responses with configurable overrides.
 * Supports testing both success and error states.
 * 
 * @see test-quality.md - Data factories pattern
 * @see data-factories.md - Factory overrides pattern
 */

export type HealthResponse = {
  status: string;
  timestamp: string;
};

/**
 * Create a health endpoint response with optional overrides
 * 
 * @param overrides - Partial object to override default values
 * @returns Complete HealthResponse object
 * 
 * @example
 * // Default successful response
 * const response = createHealthResponse();
 * // { status: 'ok', timestamp: '2026-01-17T...' }
 * 
 * @example
 * // Override status for error scenario
 * const errorResponse = createHealthResponse({ status: 'degraded' });
 * // { status: 'degraded', timestamp: '2026-01-17T...' }
 */
export const createHealthResponse = (overrides: Partial<HealthResponse> = {}): HealthResponse => ({
  status: 'ok',
  timestamp: new Date().toISOString(),
  ...overrides,
});

/**
 * Validate ISO 8601 timestamp format
 * 
 * @param timestamp - Timestamp string to validate
 * @returns true if valid ISO 8601, false otherwise
 * 
 * @example
 * isValidISO8601('2026-01-17T14:30:00.000Z'); // true
 * isValidISO8601('2026-01-17'); // false
 */
export const isValidISO8601 = (timestamp: string): boolean => {
  const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
  return iso8601Regex.test(timestamp);
};
