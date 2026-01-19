import { Prisma } from '@prisma/client';

export interface PlanFilterOptions {
  status?: string;
  sort?: string;
  page?: number;
  limit?: number;
}

export interface PlanQueryResult {
  where: Prisma.TransportPlanWhereInput;
  orderBy: Prisma.TransportPlanOrderByWithRelationInput;
  skip: number;
  take: number;
}

/**
 * Build Prisma query for listing transport plans with filters and pagination
 * Implements data isolation: FREIGHTER sees only own plans, ADMIN sees all
 */
export function buildPlanQuery(
  userId: string,
  userRole: string,
  filters: PlanFilterOptions
): PlanQueryResult {
  // Base filter: always exclude soft-deleted plans
  const where: Prisma.TransportPlanWhereInput = {
    is_deleted: false
  };

  // Data isolation: FREIGHTER sees only own plans
  if (userRole !== 'ADMIN') {
    where.createdBy = userId;
  }

  // Status filter
  if (filters.status) {
    const validStatuses = ['DRAFT', 'PROPOSED', 'ACCEPTED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'];
    if (validStatuses.includes(filters.status)) {
      where.status = filters.status as any;
    }
  }

  // Sort configuration
  const sortMap: Record<string, Prisma.TransportPlanOrderByWithRelationInput> = {
    'createdAt': { createdAt: 'desc' },
    'createdAt-asc': { createdAt: 'asc' },
    'status': { status: 'asc' },
    'eta': { estimatedDeliveryTime: 'asc' },
    'unitCount': { unitCount: 'desc' }
  };

  const orderBy = sortMap[filters.sort || 'createdAt'] || { createdAt: 'desc' };

  // Pagination
  const page = Math.max(1, filters.page || 1);
  const limit = Math.min(100, Math.max(1, filters.limit || 20));
  const skip = (page - 1) * limit;

  return {
    where,
    orderBy,
    skip,
    take: limit
  };
}
