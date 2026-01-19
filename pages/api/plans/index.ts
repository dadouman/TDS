import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { withAuth } from '@/middleware/withAuth';
import { buildPlanQuery, type PlanFilterOptions } from '@/utils/planFilters';

const prisma = new PrismaClient();

type ListPlansResponse = {
  success?: boolean;
  data?: any[];
  total?: number;
  page?: number;
  limit?: number;
  error?: string;
};

type CreatePlanRequest = {
  supplierId: string;
  destinationId: string;
  unitCount: number;
  plannedLoadingTime: string;
  notes?: string;
};

async function handler(req: NextApiRequest, res: NextApiResponse<ListPlansResponse | any>) {
  const user = (req as any).user;

  try {
    // GET: List plans
    if (req.method === 'GET') {
      // Parse query parameters
      const filters: PlanFilterOptions = {
        status: req.query.status as string | undefined,
        sort: req.query.sort as string | undefined,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20
      };

      // Build Prisma query with filters and data isolation
      const queryConfig = buildPlanQuery(user.userId, user.role, filters);

      // Execute parallel queries for total count and paginated results
      const [plans, total] = await Promise.all([
        prisma.transportPlan.findMany({
          where: queryConfig.where,
          orderBy: queryConfig.orderBy,
          skip: queryConfig.skip,
          take: queryConfig.take,
          select: {
            id: true,
            supplierId: true,
            destinationId: true,
            unitCount: true,
            plannedLoadingTime: true,
            estimatedDeliveryTime: true,
            status: true,
            createdAt: true,
            supplier: {
              select: { id: true, name: true, type: true }
            },
            destination: {
              select: { id: true, name: true, type: true }
            }
          }
        }),
        prisma.transportPlan.count({
          where: queryConfig.where
        })
      ]);

      const page = Math.max(1, filters.page || 1);
      const limit = Math.min(100, Math.max(1, filters.limit || 20));

      console.log('[ListPlans] Success:', {
        userId: user.userId,
        planCount: plans.length,
        totalPlans: total,
        page
      });

      return res.status(200).json({
        success: true,
        data: plans,
        total,
        page,
        limit
      });
    }

    // POST: Create plan
    if (req.method === 'POST') {
      const { supplierId, destinationId, unitCount, plannedLoadingTime, notes } = req.body as CreatePlanRequest;

      // Validation
      const errors: string[] = [];
      if (!supplierId) errors.push('supplierId is required');
      if (!destinationId) errors.push('destinationId is required');
      if (!unitCount || unitCount < 1 || unitCount > 1000) errors.push('unitCount must be between 1 and 1000');
      if (!plannedLoadingTime) errors.push('plannedLoadingTime is required');

      if (errors.length > 0) {
        return res.status(400).json({ error: 'Validation failed', details: errors });
      }

      // Verify locations exist
      const [supplier, destination] = await Promise.all([
        prisma.location.findUnique({ where: { id: supplierId } }),
        prisma.location.findUnique({ where: { id: destinationId } })
      ]);

      if (!supplier) {
        return res.status(404).json({ error: 'Supplier location not found' });
      }
      if (!destination) {
        return res.status(404).json({ error: 'Destination location not found' });
      }

      // Create plan
      const plan = await prisma.transportPlan.create({
        data: {
          supplierId,
          destinationId,
          unitCount,
          plannedLoadingTime: new Date(plannedLoadingTime),
          status: 'DRAFT',
          notes,
          createdBy: user.userId,
          version: 1
        },
        include: {
          supplier: true,
          destination: true
        }
      });

      console.log('[CreatePlan] Success:', {
        userId: user.userId,
        planId: plan.id,
        supplierId,
        destinationId
      });

      return res.status(201).json({
        success: true,
        planId: plan.id,
        data: plan
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('[Plans] Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    await prisma.$disconnect();
  }
}

export default withAuth(handler, ['freighter', 'admin']);
