export interface JourneyStage {
  stage: string;
  description: string;
  startTime: Date;
  endTime: Date;
  durationMinutes: number;
  status?: string;
}

export interface JourneyTimeline {
  stages: JourneyStage[];
  totalDurationMinutes: number;
  startTime: Date;
  endTime: Date;
}

/**
 * Build journey timeline from transport plan
 * Calculates: Loading → Hub Processing → Transit → Delivery
 */
export function buildJourneyTimeline(plan: any): JourneyTimeline {
  const stages: JourneyStage[] = [];

  // Stage 1: Loading Window (±1 hour)
  const plannedLoading = new Date(plan.plannedLoadingTime);
  const loadingStart = new Date(plannedLoading.getTime() - 60 * 60 * 1000);
  const loadingEnd = new Date(plannedLoading.getTime() + 60 * 60 * 1000);

  stages.push({
    stage: 'LOADING',
    description: 'Pickup and loading at supplier location',
    startTime: loadingStart,
    endTime: loadingEnd,
    durationMinutes: 120,
    status: 'upcoming'
  });

  // Stage 2: Hub Processing (2 hours) - optional
  if (plan.estimatedHubTime) {
    const hubStart = plannedLoading;
    const hubEnd = new Date(plan.estimatedHubTime);
    const hubDurationMs = hubEnd.getTime() - hubStart.getTime();

    stages.push({
      stage: 'HUB_PROCESSING',
      description: 'Processing at hub facility',
      startTime: hubStart,
      endTime: hubEnd,
      durationMinutes: Math.round(hubDurationMs / (1000 * 60)),
      status: 'upcoming'
    });
  }

  // Stage 3: Transit to Destination (variable) - optional
  if (plan.estimatedHubTime && plan.estimatedDeliveryTime) {
    const transitStart = new Date(plan.estimatedHubTime);
    const transitEnd = new Date(plan.estimatedDeliveryTime);
    const transitDurationMs = transitEnd.getTime() - transitStart.getTime();

    stages.push({
      stage: 'IN_TRANSIT',
      description: 'Transportation to destination store',
      startTime: transitStart,
      endTime: transitEnd,
      durationMinutes: Math.round(transitDurationMs / (1000 * 60)),
      status: 'upcoming'
    });
  }

  // Stage 4: Delivery Window (±30 mins) - optional
  if (plan.estimatedDeliveryTime) {
    const deliveryTime = new Date(plan.estimatedDeliveryTime);
    const deliveryStart = new Date(deliveryTime.getTime() - 30 * 60 * 1000);
    const deliveryEnd = new Date(deliveryTime.getTime() + 30 * 60 * 1000);

    stages.push({
      stage: 'DELIVERY',
      description: 'Unloading at destination store',
      startTime: deliveryStart,
      endTime: deliveryEnd,
      durationMinutes: 60,
      status: 'upcoming'
    });
  }

  // Calculate total duration
  const lastStage = stages[stages.length - 1];
  const totalMs = lastStage.endTime.getTime() - loadingStart.getTime();
  const totalMinutes = Math.round(totalMs / (1000 * 60));

  return {
    stages,
    totalDurationMinutes: totalMinutes,
    startTime: loadingStart,
    endTime: lastStage.endTime
  };
}

/**
 * Calculate cost breakdown
 */
export function calculateCostBreakdown(plan: any, carrierCostPerUnit: number) {
  const baseCost = carrierCostPerUnit * plan.unitCount;
  const hubFee = 500; // Fixed fee in lowest currency unit
  const taxPercentage = 0.20; // 20% tax
  const subtotal = baseCost + hubFee;
  const tax = Math.round(subtotal * taxPercentage);
  const total = subtotal + tax;

  return {
    baseCarrierCost: baseCost,
    hubFee: hubFee,
    subtotal: subtotal,
    tax: tax,
    total: total
  };
}
