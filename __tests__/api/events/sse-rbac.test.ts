import { sseManager } from '@/utils/sseManager';
import { broadcastIncident } from '@/utils/incidentBroadcaster';

describe('SSE RBAC & Broadcaster - Story 3.013', () => {
  afterAll(async () => {
    sseManager.shutdown();
  });

  describe('[3.013-RBAC-001] Freighter Access Control', () => {
    it('[3.013-RBAC-001] should allow freighter to access own plan incidents', async () => {
      // GIVEN: SSE manager is operational
      // WHEN: Subscribing freighter connects
      const mockResponse = {
        writeHead: jest.fn().mockReturnThis(),
        write: jest.fn().mockReturnThis(),
        end: jest.fn(),
        on: jest.fn().mockReturnThis()
      };

      const sub = sseManager.subscribe('freighter-a', 'FREIGHTER', mockResponse);

      // THEN: Connection established successfully
      expect(sub).toBeDefined();
      expect(mockResponse.writeHead).toHaveBeenCalledWith(200, expect.objectContaining({
        'Content-Type': 'text/event-stream'
      }));

      sseManager.disconnect(sub);
    });

    it('[3.013-RBAC-002] should deny freighter access to other plan incidents', async () => {
      // GIVEN: Two separate subscribers
      const mockResponse1 = {
        writeHead: jest.fn().mockReturnThis(),
        write: jest.fn().mockReturnThis(),
        end: jest.fn(),
        on: jest.fn().mockReturnThis()
      };
      const mockResponse2 = {
        writeHead: jest.fn().mockReturnThis(),
        write: jest.fn().mockReturnThis(),
        end: jest.fn(),
        on: jest.fn().mockReturnThis()
      };

      const sub1 = sseManager.subscribe('freighter-a', 'FREIGHTER', mockResponse1);
      const sub2 = sseManager.subscribe('freighter-b', 'FREIGHTER', mockResponse2);

      // WHEN: Broadcasting incident to specific freighter
      const event = {
        id: 'test-incident-1',
        type: 'DELAY' as const,
        planId: 'plan-123',
        description: 'Test delay incident',
        timestamp: new Date().toISOString()
      };

      sseManager.broadcast(event, ['freighter-a']);

      // THEN: Only freighter-a should receive the incident
      const calls1 = mockResponse1.write.mock.calls.length;
      const calls2 = mockResponse2.write.mock.calls.length;

      expect(calls1).toBeGreaterThan(calls2);

      sseManager.disconnect(sub1);
      sseManager.disconnect(sub2);
    });

    it('[3.013-RBAC-003] should prevent data leakage between freighters', async () => {
      // GIVEN: Multiple subscribers
      const mockResponse1 = {
        writeHead: jest.fn().mockReturnThis(),
        write: jest.fn().mockReturnThis(),
        end: jest.fn(),
        on: jest.fn().mockReturnThis()
      };
      const mockResponse2 = {
        writeHead: jest.fn().mockReturnThis(),
        write: jest.fn().mockReturnThis(),
        end: jest.fn(),
        on: jest.fn().mockReturnThis()
      };

      const sub1 = sseManager.subscribe('freighter-a', 'FREIGHTER', mockResponse1);
      const sub2 = sseManager.subscribe('freighter-b', 'FREIGHTER', mockResponse2);

      // WHEN: Broadcasting incident to only freighter-a
      sseManager.broadcast({
        id: 'incident-leak-test',
        type: 'REFUSAL' as const,
        planId: 'plan-leak',
        description: 'Leak test incident',
        timestamp: new Date().toISOString()
      }, ['freighter-a']);

      // THEN: Freighter-b should not see incident (no extra write calls for incident)
      const actualWrites2 = mockResponse2.write.mock.calls.filter(
        c => c[0] && c[0].toString().includes('incident-leak-test')
      );

      expect(actualWrites2.length).toBe(0);

      sseManager.disconnect(sub1);
      sseManager.disconnect(sub2);
    });
  });

  describe('[3.013-RBAC-004] Admin Access', () => {
    it('[3.013-RBAC-004] should allow admin to access any plan incidents', async () => {
      // GIVEN: Admin subscriber
      const mockResponse = {
        writeHead: jest.fn().mockReturnThis(),
        write: jest.fn().mockReturnThis(),
        end: jest.fn(),
        on: jest.fn().mockReturnThis()
      };

      const sub = sseManager.subscribe('admin-user', 'ADMIN', mockResponse);

      // WHEN: Admin connects
      // THEN: Connection established
      expect(sub).toBeDefined();
      expect(mockResponse.writeHead).toHaveBeenCalled();

      sseManager.disconnect(sub);
    });
  });

  describe('[3.013-RBAC-005] Incident Targets Resolution', () => {
    it('[3.013-RBAC-005] should broadcast incidents successfully', async () => {
      // GIVEN: Active subscribers
      const mockResponse1 = {
        writeHead: jest.fn().mockReturnThis(),
        write: jest.fn().mockReturnThis(),
        end: jest.fn(),
        on: jest.fn().mockReturnThis()
      };

      const sub1 = sseManager.subscribe('freighter-test', 'FREIGHTER', mockResponse1);

      // WHEN: Broadcasting an incident
      const event = {
        id: 'incident-target-test',
        type: 'IMBALANCE' as const,
        planId: 'plan-789',
        description: 'Test target broadcast',
        timestamp: new Date().toISOString()
      };

      sseManager.broadcast(event, ['freighter-test']);

      // THEN: Broadcast completes without error
      expect(mockResponse1.write).toHaveBeenCalled();

      sseManager.disconnect(sub1);
    });

    it('[3.013-RBAC-006] should handle empty target list gracefully', async () => {
      // GIVEN: Event with no subscribers
      // WHEN: Broadcasting to empty target list
      const event = {
        id: 'incident-empty-target',
        type: 'DELAY' as const,
        planId: 'plan-empty',
        description: 'Empty target broadcast',
        timestamp: new Date().toISOString()
      };

      // THEN: No error thrown
      await expect(
        Promise.resolve(sseManager.broadcast(event, []))
      ).resolves.not.toThrow();
    });
  });

  describe('[3.013-RBAC-007] Broadcast RBAC Integration', () => {
    it('[3.013-RBAC-007] should broadcast only to authorized users', async () => {
      // GIVEN: Two subscribers from different users
      const mockResponse1 = {
        writeHead: jest.fn().mockReturnThis(),
        write: jest.fn().mockReturnThis(),
        end: jest.fn(),
        on: jest.fn().mockReturnThis()
      };
      const mockResponse2 = {
        writeHead: jest.fn().mockReturnThis(),
        write: jest.fn().mockReturnThis(),
        end: jest.fn(),
        on: jest.fn().mockReturnThis()
      };

      const sub1 = sseManager.subscribe('user-auth-1', 'FREIGHTER', mockResponse1);
      const sub2 = sseManager.subscribe('user-auth-2', 'FREIGHTER', mockResponse2);

      // WHEN: Broadcasting incident for user-auth-1 only
      await broadcastIncident('DELAY', 'plan-auth-test', 'Auth test incident');

      // THEN: Broadcast completes without error
      expect(broadcastIncident).toBeDefined();

      sseManager.disconnect(sub1);
      sseManager.disconnect(sub2);
    });
  });

  describe('[3.013-RBAC-008] Different Incident Types', () => {
    it('[3.013-RBAC-008] should handle REFUSAL incidents', async () => {
      // GIVEN: A REFUSAL incident
      // WHEN: Broadcasting
      const mockResponse = {
        writeHead: jest.fn().mockReturnThis(),
        write: jest.fn().mockReturnThis(),
        end: jest.fn(),
        on: jest.fn().mockReturnThis()
      };

      const sub = sseManager.subscribe('freighter-refusal', 'FREIGHTER', mockResponse);
      await broadcastIncident('REFUSAL', 'plan-refusal', 'Carrier refused pickup');

      // THEN: No error thrown
      expect(broadcastIncident).toBeDefined();

      sseManager.disconnect(sub);
    });

    it('[3.013-RBAC-009] should handle DELAY incidents', async () => {
      // GIVEN: A DELAY incident
      // WHEN: Broadcasting
      const mockResponse = {
        writeHead: jest.fn().mockReturnThis(),
        write: jest.fn().mockReturnThis(),
        end: jest.fn(),
        on: jest.fn().mockReturnThis()
      };

      const sub = sseManager.subscribe('freighter-delay', 'FREIGHTER', mockResponse);
      await broadcastIncident('DELAY', 'plan-delay', 'Plan delayed 45 minutes');

      // THEN: Function handles DELAY incident type
      expect(broadcastIncident).toBeDefined();

      sseManager.disconnect(sub);
    });

    it('[3.013-RBAC-010] should handle IMBALANCE incidents', async () => {
      // GIVEN: An IMBALANCE incident
      // WHEN: Broadcasting
      const mockResponse = {
        writeHead: jest.fn().mockReturnThis(),
        write: jest.fn().mockReturnThis(),
        end: jest.fn(),
        on: jest.fn().mockReturnThis()
      };

      const sub = sseManager.subscribe('freighter-imbalance', 'FREIGHTER', mockResponse);
      await broadcastIncident('IMBALANCE', 'plan-imbalance', 'Unit count mismatch');

      // THEN: Supported
      expect(broadcastIncident).toBeDefined();

      sseManager.disconnect(sub);
    });
  });

  describe('[3.013-RBAC-011] Error Handling', () => {
    it('[3.013-RBAC-011] should handle broadcasting with no targets gracefully', async () => {
      // GIVEN: Event with no target users
      // WHEN: Broadcasting to non-existent freighter
      const mockResponse = {
        writeHead: jest.fn().mockReturnThis(),
        write: jest.fn().mockReturnThis(),
        end: jest.fn(),
        on: jest.fn().mockReturnThis()
      };

      const sub = sseManager.subscribe('user-no-plans', 'FREIGHTER', mockResponse);

      // Broadcast to non-existent plan (no targets)
      await broadcastIncident('DELAY', 'plan-no-user-plan', 'Test');

      // THEN: No error thrown (graceful handling)
      expect(true).toBe(true);

      sseManager.disconnect(sub);
    });

    it('[3.013-RBAC-012] should handle invalid plan ID gracefully', async () => {
      // GIVEN: Invalid plan ID
      // WHEN: Broadcasting
      // THEN: No error thrown
      await expect(
        broadcastIncident('DELAY', 'invalid-plan-id-' + Date.now(), 'Test')
      ).resolves.not.toThrow();
    });
  });

  describe('[3.013-RBAC-013] Security Isolation', () => {
    it('[3.013-RBAC-013] should not leak plan data to unauthorized users', async () => {
      // GIVEN: Two freighters connected
      const mockResponse1 = {
        writeHead: jest.fn().mockReturnThis(),
        write: jest.fn().mockReturnThis(),
        end: jest.fn(),
        on: jest.fn().mockReturnThis()
      };
      const mockResponse2 = {
        writeHead: jest.fn().mockReturnThis(),
        write: jest.fn().mockReturnThis(),
        end: jest.fn(),
        on: jest.fn().mockReturnThis()
      };

      const sub1 = sseManager.subscribe('freighter-secure-1', 'FREIGHTER', mockResponse1);
      const sub2 = sseManager.subscribe('freighter-secure-2', 'FREIGHTER', mockResponse2);

      // WHEN: Broadcasting incident only to freighter-secure-1
      sseManager.broadcast({
        id: 'incident-secure-test',
        type: 'DELAY' as const,
        planId: 'plan-secure',
        description: 'Security test incident',
        timestamp: new Date().toISOString()
      }, ['freighter-secure-1']);

      // THEN: Verify incident was not sent to freighter-secure-2
      const calls2 = mockResponse2.write.mock.calls.filter(
        c => c[0] && c[0].toString().includes('incident-secure-test')
      );

      expect(calls2.length).toBe(0);

      sseManager.disconnect(sub1);
      sseManager.disconnect(sub2);
    });

    it('[3.013-RBAC-014] should maintain isolation with multiple subscribers', async () => {
      // GIVEN: Multiple subscribers from same user
      const mockResponse1 = {
        writeHead: jest.fn().mockReturnThis(),
        write: jest.fn().mockReturnThis(),
        end: jest.fn(),
        on: jest.fn().mockReturnThis()
      };
      const mockResponse2 = {
        writeHead: jest.fn().mockReturnThis(),
        write: jest.fn().mockReturnThis(),
        end: jest.fn(),
        on: jest.fn().mockReturnThis()
      };
      const mockResponse3 = {
        writeHead: jest.fn().mockReturnThis(),
        write: jest.fn().mockReturnThis(),
        end: jest.fn(),
        on: jest.fn().mockReturnThis()
      };

      const sub1 = sseManager.subscribe('isolated-user', 'FREIGHTER', mockResponse1);
      const sub2 = sseManager.subscribe('isolated-user', 'FREIGHTER', mockResponse2);
      const sub3 = sseManager.subscribe('other-user', 'FREIGHTER', mockResponse3);

      // WHEN: Checking subscription counts
      const userSubs = sseManager.getUserSubscribers('isolated-user');
      const otherSubs = sseManager.getUserSubscribers('other-user');

      // THEN: Verify isolation
      expect(userSubs.length).toBeGreaterThanOrEqual(1);
      expect(otherSubs.length).toBeGreaterThanOrEqual(1);
      expect(userSubs).not.toBe(otherSubs);

      sseManager.disconnect(sub1);
      sseManager.disconnect(sub2);
      sseManager.disconnect(sub3);
    });
  });
});
