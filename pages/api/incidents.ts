import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient, IncidentStatus, IncidentType } from '@prisma/client';
import { withAuth } from '@/middleware/withAuth';

const prisma = new PrismaClient();

type IncidentsResponse = {
  success?: boolean;
  data?: any;
  error?: string;
  details?: string[];
};

async function handler(req: NextApiRequest, res: NextApiResponse<IncidentsResponse>) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = (req as any).user;
  const { planId, type, status: statusFilter, from, to, page = '1', limit = '20' } = req.query;

  try {
    // Pagination
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20));
    const skip = (pageNum - 1) * pageSize;

    // Build filter
    const where: any = {
      is_deleted: false
    };

    // Filter by planId if provided
    if (planId) {
      where.planId = planId as string;

      // Verify ownership: Freighter can only see own plans
      if (user.role !== 'ADMIN') {
        const plan = await prisma.transportPlan.findFirst({
          where: { id: planId as string, is_deleted: false }
        });

        if (!plan) {
          return res.status(404).json({ error: 'Plan not found' });
        }

        if (plan.createdBy !== user.userId) {
          return res.status(403).json({ error: 'Unauthorized: Cannot view incidents for this plan' });
        }
      }
    } else if (user.role !== 'ADMIN') {
      // If no planId specified and not ADMIN, only show incidents for own plans
      const userPlans = await prisma.transportPlan.findMany({
        where: {
          createdBy: user.userId,
          is_deleted: false
        },
        select: { id: true }
      });

      if (userPlans.length === 0) {
        return res.status(200).json({
          success: true,
          data: {
            incidents: [],
            pagination: { page: pageNum, limit: pageSize, total: 0, totalPages: 0 }
          }
        });
      }

      where.planId = { in: userPlans.map(p => p.id) };
    }

    // Filter by incident type
    if (type) {
      const validTypes = Object.values(IncidentType);
      if (!validTypes.includes(type as IncidentType)) {
        return res.status(400).json({
          error: 'Invalid incident type',
          details: [`Must be one of: ${validTypes.join(', ')}`]
        });
      }
      where.type = type as IncidentType;
    }

    // Filter by incident status
    if (statusFilter) {
      const validStatuses = Object.values(IncidentStatus);
      if (!validStatuses.includes(statusFilter as IncidentStatus)) {
        return res.status(400).json({
          error: 'Invalid incident status',
          details: [`Must be one of: ${validStatuses.join(', ')}`]
        });
      }
      where.status = statusFilter as IncidentStatus;
    }

    // Filter by date range
    if (from || to) {
      where.createdAt = {};
      if (from) {
        where.createdAt.gte = new Date(from as string);
      }
      if (to) {
        where.createdAt.lte = new Date(to as string);
      }
    }

    // Get total count for pagination
    const total = await prisma.incident.count({ where });

    // Load incidents with plan details
    const incidents = await prisma.incident.findMany({
      where,
      include: {
        plan: {
          select: {
            id: true,
            status: true,
            unitCount: true,
            createdByUser: {
              select: { id: true, firstName: true, lastName: true, email: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize
    });

    // Format response
    const formattedIncidents = incidents.map(incident => ({
      id: incident.id,
      type: incident.type,
      status: incident.status,
      planId: incident.planId,
      carrierId: incident.carrierId,
      warehouseId: incident.warehouseId,
      description: incident.description,
      createdAt: incident.createdAt,
      resolvedAt: incident.resolvedAt,
      plan: {
        id: incident.plan.id,
        status: incident.plan.status,
        unitCount: incident.plan.unitCount,
        createdBy: incident.plan.createdByUser?.email || 'Unknown'
      }
    }));

    console.log('[IncidentsList] Success:', {
      userId: user.userId,
      planId: planId || 'all',
      count: formattedIncidents.length,
      total
    });

    return res.status(200).json({
      success: true,
      data: {
        incidents: formattedIncidents,
        pagination: {
          page: pageNum,
          limit: pageSize,
          total,
          totalPages: Math.ceil(total / pageSize)
        }
      }
    });
  } catch (error) {
    console.error('[IncidentsList] Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    await prisma.$disconnect();
  }
}

export default withAuth(handler, 'freighter');
