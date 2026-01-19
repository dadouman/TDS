/**
 * Story 5.020: Delay Alert Notifications Tests
 * Tests for store delay notification creation and acknowledgment
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { createRequest, createResponse } from 'node-mocks-http';
import { prisma } from '@/utils/prisma';
import { hashPassword } from '@/utils/password';

// Mock withAuth middleware
jest.mock('@/middleware/withAuth', () => ({
  withAuth: (handler: any) => async (req: any, res: any) => {
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

import notificationsHandler from '../../../../pages/api/protected/store/notifications';
import acknowledgeHandler from '../../../../pages/api/protected/store/notifications/[id]/acknowledge';

describe('Store Delay Notifications - Story 5.020', () => {
  let storeUser: any;
  let otherStoreUser: any;
  let storeLocation: any;
  let otherStoreLocation: any;
  let freighterUser: any;
  let delayedPlan: any;

  beforeAll(async () => {
    // Clean database
    await prisma.notification.deleteMany();
    await prisma.incident.deleteMany();
    await prisma.trip.deleteMany();
    await prisma.transportPlan.deleteMany();
    await prisma.location.deleteMany();
    await prisma.user.deleteMany();

    // Create locations
    storeLocation = await prisma.location.create({
      data: {
        name: 'Store A',
        type: 'STORE',
        address: '123 Store St'
      }
    });

    otherStoreLocation = await prisma.location.create({
      data: {
        name: 'Store B',
        type: 'STORE',
        address: '456 Store Ave'
      }
    });

    const supplierLocation = await prisma.location.create({
      data: {
        name: 'Supplier',
        type: 'SUPPLIER',
        address: '789 Supplier Rd'
      }
    });

    // Create users
    storeUser = await prisma.user.create({
      data: {
        email: 'store-notify@test.com',
        password_hash: await hashPassword('password123'),
        role: 'STORE',
        firstName: 'Store',
        lastName: 'Manager',
        storeLocationId: storeLocation.id
      }
    });

    otherStoreUser = await prisma.user.create({
      data: {
        email: 'other-store@test.com',
        password_hash: await hashPassword('password123'),
        role: 'STORE',
        firstName: 'Other',
        lastName: 'Manager',
        storeLocationId: otherStoreLocation.id
      }
    });

    freighterUser = await prisma.user.create({
      data: {
        email: 'freighter-notify@test.com',
        password_hash: await hashPassword('password123'),
        role: 'FREIGHTER',
        firstName: 'Freighter',
        lastName: 'User'
      }
    });

    // Create delayed plan
    delayedPlan = await prisma.transportPlan.create({
      data: {
        supplierId: supplierLocation.id,
        destinationId: storeLocation.id,
        createdBy: freighterUser.id,
        status: 'IN_TRANSIT',
        plannedLoadingTime: new Date(Date.now() - 4 * 60 * 60 * 1000),
        estimatedDeliveryTime: new Date(Date.now() - 1 * 60 * 60 * 1000), // Delayed by 1h
        unitCount: 100
      }
    });

    // Create DELAY incident
    await prisma.incident.create({
      data: {
        type: 'DELAY',
        planId: delayedPlan.id,
        description: 'Delivery delayed by 60 minutes',
        status: 'OPEN'
      }
    });

    // Create notification for store
    await prisma.notification.create({
      data: {
        userId: storeUser.id,
        type: 'DELAY',
        planId: delayedPlan.id,
        message: 'Delivery delayed by 60 minutes. Original ETA was 1 hour ago.',
        acknowledged: false
      }
    });
  });

  afterAll(async () => {
    await prisma.notification.deleteMany();
    await prisma.incident.deleteMany();
    await prisma.trip.deleteMany();
    await prisma.transportPlan.deleteMany();
    await prisma.location.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });

  describe('[5.020-001] Notification Creation', () => {
    it('[5.020-001] should create notification when DELAY incident occurs', async () => {
      const notifications = await prisma.notification.findMany({
        where: {
          userId: storeUser.id,
          type: 'DELAY',
          planId: delayedPlan.id
        }
      });

      expect(notifications.length).toBeGreaterThan(0);
      expect(notifications[0].message).toContain('delayed');
    });
  });

  describe('[5.020-002] List Notifications', () => {
    it('[5.020-002] should return unacknowledged notifications for store', async () => {
      const req = createRequest({
        method: 'GET',
        headers: {
          'x-test-user-id': storeUser.id,
          'x-test-user-role': 'STORE'
        }
      });

      const res = createResponse();

      await notificationsHandler(req as NextApiRequest, res as NextApiResponse);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
      expect(data.data.notifications.length).toBeGreaterThan(0);
      expect(data.data.notifications[0].type).toBe('DELAY');
    });

    it('[5.020-003] should only return own notifications', async () => {
      const req = createRequest({
        method: 'GET',
        headers: {
          'x-test-user-id': otherStoreUser.id,
          'x-test-user-role': 'STORE'
        }
      });

      const res = createResponse();

      await notificationsHandler(req as NextApiRequest, res as NextApiResponse);

      const data = JSON.parse(res._getData());
      expect(data.data.notifications.length).toBe(0);
    });

    it('[5.020-004] should include plan details in notification', async () => {
      const req = createRequest({
        method: 'GET',
        headers: {
          'x-test-user-id': storeUser.id,
          'x-test-user-role': 'STORE'
        }
      });

      const res = createResponse();

      await notificationsHandler(req as NextApiRequest, res as NextApiResponse);

      const data = JSON.parse(res._getData());
      const notification = data.data.notifications[0];
      
      expect(notification.planId).toBe(delayedPlan.id);
      expect(notification.message).toBeDefined();
    });
  });

  describe('[5.020-005] Acknowledge Notification', () => {
    it('[5.020-005] should mark notification as acknowledged', async () => {
      // Get notification
      const notification = await prisma.notification.findFirst({
        where: { userId: storeUser.id, acknowledged: false }
      });

      expect(notification).toBeDefined();

      const req = createRequest({
        method: 'PATCH',
        headers: {
          'x-test-user-id': storeUser.id,
          'x-test-user-role': 'STORE'
        },
        query: {
          id: notification!.id
        }
      });

      const res = createResponse();

      await acknowledgeHandler(req as NextApiRequest, res as NextApiResponse);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);

      // Verify acknowledged
      const updated = await prisma.notification.findUnique({
        where: { id: notification!.id }
      });
      expect(updated?.acknowledged).toBe(true);
    });

    it('[5.020-006] should not acknowledge other user notifications', async () => {
      // Create notification for other store
      const otherNotification = await prisma.notification.create({
        data: {
          userId: otherStoreUser.id,
          type: 'DELAY',
          planId: delayedPlan.id,
          message: 'Test notification',
          acknowledged: false
        }
      });

      const req = createRequest({
        method: 'PATCH',
        headers: {
          'x-test-user-id': storeUser.id,
          'x-test-user-role': 'STORE'
        },
        query: {
          id: otherNotification.id
        }
      });

      const res = createResponse();

      await acknowledgeHandler(req as NextApiRequest, res as NextApiResponse);

      expect(res._getStatusCode()).toBe(404);
    });
  });

  describe('[5.020-007] RBAC Tests', () => {
    it('[5.020-007] should reject non-STORE roles', async () => {
      const req = createRequest({
        method: 'GET',
        headers: {
          'x-test-user-id': freighterUser.id,
          'x-test-user-role': 'FREIGHTER'
        }
      });

      const res = createResponse();

      await notificationsHandler(req as NextApiRequest, res as NextApiResponse);

      expect(res._getStatusCode()).toBe(403);
    });

    it('[5.020-008] should reject unauthenticated requests', async () => {
      const req = createRequest({
        method: 'GET'
      });

      const res = createResponse();

      await notificationsHandler(req as NextApiRequest, res as NextApiResponse);

      expect(res._getStatusCode()).toBe(401);
    });
  });

  describe('[5.020-009] Pagination', () => {
    it('[5.020-009] should support pagination', async () => {
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

      await notificationsHandler(req as NextApiRequest, res as NextApiResponse);

      const data = JSON.parse(res._getData());
      expect(data.data.pagination).toBeDefined();
      expect(data.data.notifications.length).toBeLessThanOrEqual(1);
    });
  });
});
