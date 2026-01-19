export interface TemporalValidationResult {
  isValid: boolean;
  error?: string;
  estimatedHubTime?: Date;
  estimatedDeliveryTime?: Date;
}

// Route times (configurable, stored in env or database)
const ROUTE_TIMES: Record<string, { hubDuration: number; transitDuration: number }> = {
  'default': { hubDuration: 2 * 3600 * 1000, transitDuration: 4 * 3600 * 1000 } // 2h hub, 4h transit
};

export function validateTemporalConstraints(
  plannedLoadingTime: Date,
  hubId?: string
): TemporalValidationResult {
  const now = new Date();

  // Check loading time is in future
  if (plannedLoadingTime <= now) {
    return { isValid: false, error: 'Loading time must be in future' };
  }

  // Get route times (simplified: use default)
  const routeTimes = ROUTE_TIMES['default'];
  const hubDuration = routeTimes.hubDuration;
  const transitDuration = routeTimes.transitDuration;

  const estimatedHubTime = new Date(plannedLoadingTime.getTime() + hubDuration);
  const estimatedDeliveryTime = new Date(estimatedHubTime.getTime() + transitDuration);

  // Verify delivery window ≤ 40 hours
  const totalTime = estimatedDeliveryTime.getTime() - plannedLoadingTime.getTime();
  const maxWindowMs = 40 * 3600 * 1000; // 40 hours in milliseconds

  if (totalTime > maxWindowMs) {
    return {
      isValid: false,
      error: 'Delivery window exceeds 40 hours'
    };
  }

  return {
    isValid: true,
    estimatedHubTime,
    estimatedDeliveryTime
  };
}
