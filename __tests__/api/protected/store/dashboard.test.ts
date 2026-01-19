/**
 * Story 5.018: Store Delivery Dashboard Tests
 * Tests for store dashboard showing deliveries to specific store location
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { createRequest, createResponse } from 'node-mocks-http';
import { prisma } from '@/utils/prisma';
import { hashPassword } from '@/utils/password';

// Mock withAuth middleware
jest.mock('@/middleware/withAuth', () => ({
  withAuth: (handler: any) => async (req: any, res: any) => {
    // Attach mock user from request headers
    if (req.headers['x-test-user-id']) {
      req.user = {
        userId: req.headers['x-test-user-id'],
        role: req.headers['x-test-user-role'] || 'STORE',
        email: req.headers['x-test-user-email'] || 'test@test.com'
      };
      return handler(req, res);
    }
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
}));

import handler from '../../../../pages/api/protected/store/dashboard';

describe('Store Delivery Dashboard - Story 5.018', () => {
  let storeUser: any;
  let storeLocation: any;
  let otherStoreLocation: any;
  let freighterUser: any;
  let carrierUser: any;

  beforeAll(async () => {
    // Clean database
    await prisma.incident.deleteMany();
    await prisma.trip.deleteMany();
    await prisma.transportPlan.deleteMany();
    await prisma.location.deleteMany();
    await prisma.user.deleteMany();

    // Create test locations
    storeLocation = await prisma.location.create({
      data: {
        name: 'Store Location A',
        type: 'STORE',
        address: '123 Store St'
      }
    });

    otherStoreLocation = await prisma.location.create({
      data: {
        name: 'Store Location B',
        type: 'STORE',
        address: '456 Store Ave'
      }
    });

    const supplierLocation = await prisma.location.create({
      data: {
        name: 'Supplier A',
        type: 'SUPPLIER',
        address: '789 Supplier Rd'
      }
    });

    // Create store user linked to storeLocation
    storeUser = await prisma.user.create({
      data: {
        email: 'store-dashboard@test.com',
        password_hash: await hashPassword('password123'),
        role: 'STORE',
        firstName: 'Store',
        lastName: 'Manager',
        storeLocationId: storeLocation.id
      }
    });

    // Create freighter user
    freighterUser = await prisma.user.create({
      data: {
        email: 'freighter-dashboard@test.com',
        password_hash: await hashPassword('password123'),
        role: 'FREIGHTER',
        firstName: 'Freighter',
        lastName: 'User'
      }
    });

    // Create carrier user
    carrierUser = await prisma.user.create({
      data: {
        email: 'carrier-dashboard@test.com',
        password_hash: await hashPassword('password123'),
        role: 'CARRIER',
        firstName: 'Carrier',
        lastName: 'User'
      }
    });

    // Create deliveries for storeLocation
    await prisma.transportPlan.create({
      data: {
        supplierId: supplierLocation.id,
        destinationId: storeLocation.id,
        createdBy: freighterUser.id,
        status: 'PROPOSED',
        plannedLoadingTime: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // +1 day
        estimatedDeliveryTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // +2 days
        unitCount: 50
      }
    });

    await prisma.transportPlan.create({
      data: {
        supplierId: supplierLocation.id,
        destinationId: storeLocation.id,
        createdBy: freighterUser.id,
        status: 'IN_TRANSIT',
        plannedLoadingTime: new Date(Date.now()), // now
        estimatedDeliveryTime: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // +1 day
        unitCount: 100
      }
    });

    // Create delivery for otherStoreLocation (should not appear)
    await prisma.transportPlan.create({
      data: {
        supplierId: supplierLocation.id,
        destinationId: otherStoreLocation.id,
        createdBy: freighterUser.id,
        status: 'ACCEPTED',
        plannedLoadingTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // +2 days
        estimatedDeliveryTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // +3 days
        unitCount: 75
      }
    });
  });

  afterAll(async () => {
    await prisma.incident.deleteMany();
    await prisma.trip.deleteMany();
    await prisma.transportPlan.deleteMany();
    await prisma.location.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });

  describe('[5.018-001] Data Isolation', () => {
    it('[5.018-001] should return only deliveries for store location', async () => {
      const req = createRequest({
        method: 'GET',
        headers: {
          'x-test-user-id': storeUser.id,
          'x-test-user-role': 'STORE',
          'x-test-user-email': storeUser.email
        }
      });

      const res = createResponse();

      await handler(req as NextApiRequest, res as NextApiResponse);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
      expect(data.data.deliveries.length).toBe(2); // Only 2 for storeLocation
      expect(data.data.deliveries.every((d: any) => d.destinationId === storeLocation.id)).toBe(true);
    });

    it('[5.018-002] should not return deliveries from other stores', async () => {
      const req = createRequest({
        method: 'GET',
        headers: {
          'x-test-user-id': storeUser.id,
          'x-test-user-role': 'STORE'
        }
      });

      const res = createResponse();

      await handler(req as NextApiRequest, res as NextApiResponse);

      const data = JSON.parse(res._getData());
      const hasOtherStore = data.data.deliveries.some((d: any) => d.destinationId === otherStoreLocation.id);
      expect(hasOtherStore).toBe(false);
    });
  });

  describe('[5.018-003] Status Display', () => {
    it('[5.018-003] should include plan status in response', async () => {
      const req = createRequest({
        method: 'GET',
        headers: {
          'x-test-user-id': storeUser.id,
          'x-test-user-role': 'STORE'
        }
      });

      const res = createResponse();

      await handler(req as NextApiRequest, res as NextApiResponse);

      const data = JSON.parse(res._getData());
      const deliveries = data.data.deliveries;
      
      expect(deliveries.some((d: any) => d.status === 'PROPOSED')).toBe(true);
      expect(deliveries.some((d: any) => d.status === 'IN_TRANSIT')).toBe(true);
    });
  });

  describe('[5.018-004] Incident Flags', () => {
    it('[5.018-004] should show incident count for delayed delivery', async () => {
      // Create a plan with delay incident
      const planWithIncident = await prisma.transportPlan.create({
        data: {
          supplierId: (await prisma.location.findFirst({ where: { type: 'SUPPLIER' } }))!.id,
          destinationId: storeLocation.id,
          createdBy: freighterUser.id,
          status: 'IN_TRANSIT',
          plannedLoadingTime: new Date(Date.now() - 4 * 60 * 60 * 1000), // -4 hours
          estimatedDeliveryTime: new Date(Date.now() - 2 * 60 * 60 * 1000), // -2 hours (delayed)
          unitCount: 25
        }
      });

      await prisma.incident.create({
        data: {
          type: 'DELAY',
          planId: planWithIncident.id,
          description: 'Delivery delayed by 2 hours',
          status: 'OPEN'
        }
      });

      const req = createRequest({
        method: 'GET',
        headers: {
          'x-test-user-id': storeUser.id,
          'x-test-user-role': 'STORE'
        }
      });

      const res = createResponse();

      await handler(req as NextApiRequest, res as NextApiResponse);

      const data = JSON.parse(res._getData());
      const delayedPlan = data.data.deliveries.find((d: any) => d.id === planWithIncident.id);
      
      expect(delayedPlan).toBeDefined();
      expect(delayedPlan.incidentCount).toBeGreaterThan(0);
    });
  });

  describe('[5.018-005] ETA Display', () => {
    it('[5.018-005] should include estimatedDeliveryTime', async () => {
      const req = createRequest({
        method: 'GET',
        headers: {
          'x-test-user-id': storeUser.id,
          'x-test-user-role': 'STORE'
        }
      });

      const res = createResponse();

      await handler(req as NextApiRequest, res as NextApiResponse);

      const data = JSON.parse(res._getData());
      data.data.deliveries.forEach((delivery: any) => {
        expect(delivery.estimatedDeliveryTime).toBeDefined();
      });
    });
  });

  describe('[5.018-006] Sorting by ETA', () => {
    it('[5.018-006] should sort deliveries by ETA (soonest first)', async () => {
      const req = createRequest({
        method: 'GET',
        headers: {
          'x-test-user-id': storeUser.id,
          'x-test-user-role': 'STORE'
        }
      });

      const res = createResponse();

      await handler(req as NextApiRequest, res as NextApiResponse);

      const data = JSON.parse(res._getData());
      const deliveries = data.data.deliveries;
      
      for (let i = 0; i < deliveries.length - 1; i++) {
        const current = new Date(deliveries[i].estimatedDeliveryTime);
        const next = new Date(deliveries[i + 1].estimatedDeliveryTime);
        expect(current.getTime()).toBeLessThanOrEqual(next.getTime());
      }
    });
  });

  describe('[5.018-007] Pagination', () => {
    it('[5.018-007] should support pagination with limit', async () => {
      const req = createRequest({
        method: 'GET',
        query: {
          limit: '1'
        },
        headers: {
          'x-test-user-id': storeUser.id,
          'x-test-user-role': 'STORE'
        }
      });

      const res = createResponse();

      await handler(req as NextApiRequest, res as NextApiResponse);

      const data = JSON.parse(res._getData());
      expect(data.data.deliveries.length).toBeLessThanOrEqual(1);
    });

    it('[5.018-008] should include pagination metadata', async () => {
      const req = createRequest({
        method: 'GET',
        headers: {
          'x-test-user-id': storeUser.id,
          'x-test-user-role': 'STORE'
        }
      });

      const res = createResponse();

      await handler(req as NextApiRequest, res as NextApiResponse);

      const data = JSON.parse(res._getData());
      expect(data.data.pagination).toBeDefined();
      expect(data.data.pagination.total).toBeGreaterThanOrEqual(0);
    });
  });

  describe('[5.018-009] RBAC Tests', () => {
    it('[5.018-009] should reject non-STORE roles', async () => {
      const req = createRequest({
        method: 'GET',
        headers: {
          'x-test-user-id': carrierUser.id,
          'x-test-user-role': 'CARRIER'
        }
      });

      const res = createResponse();

      await handler(req as NextApiRequest, res as NextApiResponse);

      expect(res._getStatusCode()).toBe(403);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(false);
    });

    it('[5.018-010] should reject unauthenticated requests', async () => {
      const req = createRequest({
        method: 'GET'
      });

      const res = createResponse();

      await handler(req as NextApiRequest, res as NextApiResponse);

      expect(res._getStatusCode()).toBe(401);
    });
  });

  describe('[5.018-011] Method Validation', () => {
    it('[5.018-011] should only allow GET method', async () => {
      const req = createRequest({
        method: 'POST',
        headers: {
          'x-test-user-id': storeUser.id,
          'x-test-user-role': 'STORE'
        }
      });

      const res = createResponse();

      await handler(req as NextApiRequest, res as NextApiResponse);

      expect(res._getStatusCode()).toBe(405);
    });
  });
});
