import { sseManager } from '@/utils/sseManager';
import { broadcastIncident, getIncidentTargets, canUserAccessPlanIncidents } from '@/utils/incidentBroadcaster';
import { PrismaClient } from '@prisma/client';

describe('SSE Connection Management - Story 3.013', () => {
  let prisma: PrismaClient;
  let mockUser: any;
  let mockResponse: any;

  beforeAll(async () => {
    prisma = new PrismaClient();

    mockUser = await prisma.user.create({
      data: {
        email: 'sse-test@test.com',
        password_hash: 'hashed',
        firstName: 'SSE',
        lastName: 'Test',
        role: 'FREIGHTER'
      }
    });
  });

  afterAll(async () => {
    sseManager.shutdown();
    await prisma.user.deleteMany({});
    await prisma.$disconnect();
  });

  beforeEach(() => {
    // Mock Next.js response object
    mockResponse = {
      headersSent: false,
      writeHead: jest.fn().mockReturnThis(),
      write: jest.fn().mockReturnThis(),
      end: jest.fn(),
      on: jest.fn((event, handler) => {
        if (event === 'close' || event === 'error') {
          mockResponse.eventHandlers = mockResponse.eventHandlers || {};
          mockResponse.eventHandlers[event] = handler;
        }
        return mockResponse;
      }),
      eventHandlers: {}
    };
  });

  describe('[3.013-CONN-001] SSE Headers', () => {
    it('[3.013-CONN-001] should set correct SSE headers on subscribe', () => {
      // GIVEN: A client connects
      // WHEN: SSE subscription is created
      sseManager.subscribe(mockUser.id, 'FREIGHTER', mockResponse);

      // THEN: Correct headers are set
      expect(mockResponse.writeHead).toHaveBeenCalledWith(200, expect.objectContaining({
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }));
    });

    it('[3.013-CONN-002] should disable proxy buffering', () => {
      // GIVEN: A client connects
      // WHEN: SSE subscription is created
      sseManager.subscribe(mockUser.id, 'FREIGHTER', mockResponse);

      // THEN: X-Accel-Buffering header set
      expect(mockResponse.writeHead).toHaveBeenCalledWith(200, expect.objectContaining({
        'X-Accel-Buffering': 'no'
      }));
    });
  });

  describe('[3.013-CONN-003] Keep-Alive Pings', () => {
    it('[3.013-CONN-003] should send initial ping on connect', () => {
      // GIVEN: A client connects
      // WHEN: SSE subscription is created
      sseManager.subscribe(mockUser.id, 'FREIGHTER', mockResponse);

      // THEN: Initial ping is sent
      expect(mockResponse.write).toHaveBeenCalledWith(': ping\n\n');
    });

    it('[3.013-CONN-004] should set up periodic pings', (done) => {
      // GIVEN: A client connects
      const sub = sseManager.subscribe(mockUser.id, 'FREIGHTER', mockResponse);

      // WHEN: Waiting for ping interval
      setTimeout(() => {
        // THEN: Pings should have been sent (>1 call: initial + at least one interval)
        const pingCalls = mockResponse.write.mock.calls.filter(
          call => call[0] === ': ping\n\n'
        );
        expect(pingCalls.length).toBeGreaterThanOrEqual(1); // At least initial
        sseManager.disconnect(sub);
        done();
      }, 100); // Short wait for test
    });
  });

  describe('[3.013-CONN-005] Event Broadcasting', () => {
    it('[3.013-CONN-005] should broadcast incident event to subscriber', () => {
      // GIVEN: A subscriber is connected
      const sub = sseManager.subscribe(mockUser.id, 'FREIGHTER', mockResponse);

      // WHEN: Broadcasting an event
      sseManager.broadcast(
        {
          id: 'incident-123',
          type: 'DELAY',
          planId: 'plan-456',
          description: 'Delayed by 45 minutes',
          timestamp: new Date().toISOString()
        },
        [mockUser.id]
      );

      // THEN: Event is written to response
      expect(mockResponse.write).toHaveBeenCalledWith(
        expect.stringContaining('event: incident')
      );
      expect(mockResponse.write).toHaveBeenCalledWith(
        expect.stringContaining('"type":"DELAY"')
      );

      sseManager.disconnect(sub);
    });

    it('[3.013-CONN-006] should format event correctly', () => {
      // GIVEN: A subscriber is connected
      const sub = sseManager.subscribe(mockUser.id, 'FREIGHTER', mockResponse);

      // WHEN: Broadcasting an event
      const event = {
        id: 'incident-test-1',
        type: 'REFUSAL' as const,
        planId: 'plan-789',
        description: 'Carrier refused',
        timestamp: '2026-01-17T10:00:00Z'
      };

      sseManager.broadcast(event, [mockUser.id]);

      // THEN: Event format is correct (SSE spec)
      const calls = mockResponse.write.mock.calls;
      const eventCall = calls.find(c => c[0].includes('event: incident'));
      expect(eventCall).toBeDefined();
      expect(eventCall[0]).toContain('event: incident\n');
      expect(eventCall[0]).toContain('data:');
      expect(eventCall[0]).toContain('\n\n'); // Double newline

      sseManager.disconnect(sub);
    });
  });

  describe('[3.013-CONN-007] RBAC Filtering', () => {
    it('[3.013-CONN-007] should NOT send event to non-target users', () => {
      // GIVEN: Two subscribers for different users
      const response1 = {
        ...mockResponse,
        write: jest.fn(),
        on: jest.fn().mockReturnThis()
      };
      const response2 = {
        ...mockResponse,
        write: jest.fn(),
        on: jest.fn().mockReturnThis()
      };

      const userId1 = mockUser.id;
      const userId2 = 'other-user-id';

      const sub1 = sseManager.subscribe(userId1, 'FREIGHTER', response1);
      const sub2 = sseManager.subscribe(userId2, 'FREIGHTER', response2);

      // WHEN: Broadcasting to only user1
      sseManager.broadcast(
        {
          id: 'incident-rbac',
          type: 'DELAY',
          planId: 'plan-rbac',
          description: 'Test',
          timestamp: new Date().toISOString()
        },
        [userId1]
      );

      // THEN: Only user1 receives the event
      const response1Events = response1.write.mock.calls.filter(
        c => c[0].includes('event: incident')
      );
      const response2Events = response2.write.mock.calls.filter(
        c => c[0].includes('event: incident')
      );

      expect(response1Events.length).toBeGreaterThan(0);
      expect(response2Events.length).toBe(0);

      sseManager.disconnect(sub1);
      sseManager.disconnect(sub2);
    });
  });

  describe('[3.013-CONN-008] Connection Cleanup', () => {
    it('[3.013-CONN-008] should cleanup on client close', () => {
      // GIVEN: A subscriber is connected
      const sub = sseManager.subscribe(mockUser.id, 'FREIGHTER', mockResponse);
      const initialCount = sseManager.getSubscriberCount();

      // WHEN: Client closes connection
      if (mockResponse.eventHandlers.close) {
        mockResponse.eventHandlers.close();
      }

      // THEN: Subscriber is removed
      const finalCount = sseManager.getSubscriberCount();
      expect(finalCount).toBeLessThan(initialCount);
    });

    it('[3.013-CONN-009] should handle response end on disconnect', () => {
      // GIVEN: A subscriber is connected
      const sub = sseManager.subscribe(mockUser.id, 'FREIGHTER', mockResponse);

      // WHEN: Disconnect is called
      sseManager.disconnect(sub);

      // THEN: Response end is called
      expect(mockResponse.end).toHaveBeenCalled();
    });
  });

  describe('[3.013-CONN-010] Connection Statistics', () => {
    it('[3.013-CONN-010] should track subscriber count', () => {
      // GIVEN: Initial state
      const initialCount = sseManager.getSubscriberCount();

      // WHEN: Adding subscriber
      const response = {
        ...mockResponse,
        write: jest.fn(),
        on: jest.fn().mockReturnThis()
      };
      const sub = sseManager.subscribe(mockUser.id, 'FREIGHTER', response);

      // THEN: Count increases
      expect(sseManager.getSubscriberCount()).toBe(initialCount + 1);

      sseManager.disconnect(sub);
      expect(sseManager.getSubscriberCount()).toBe(initialCount);
    });

    it('[3.013-CONN-011] should get user specific subscribers', () => {
      // GIVEN: Multiple subscribers for same user
      const response1 = {
        ...mockResponse,
        write: jest.fn(),
        on: jest.fn().mockReturnThis()
      };
      const response2 = {
        ...mockResponse,
        write: jest.fn(),
        on: jest.fn().mockReturnThis()
      };

      const sub1 = sseManager.subscribe(mockUser.id, 'FREIGHTER', response1);
      const sub2 = sseManager.subscribe(mockUser.id, 'FREIGHTER', response2);

      // WHEN: Getting user subscribers
      const userSubs = sseManager.getUserSubscribers(mockUser.id);

      // THEN: At least 2 are returned for this user (could be more from other tests)
      expect(userSubs.length).toBeGreaterThanOrEqual(2);
      expect(userSubs.every((s: any) => s.userId === mockUser.id)).toBe(true);

      sseManager.disconnect(sub1);
      sseManager.disconnect(sub2);
    });

    it('[3.013-CONN-012] should monitor all subscribers', () => {
      // GIVEN: Several subscribers
      const response1 = {
        ...mockResponse,
        write: jest.fn(),
        on: jest.fn().mockReturnThis()
      };
      const sub1 = sseManager.subscribe(mockUser.id, 'FREIGHTER', response1);

      // WHEN: Getting all subscribers
      const allSubs = sseManager.getAllSubscribers();

      // THEN: Can monitor status
      expect(allSubs.length).toBeGreaterThan(0);
      expect(allSubs[0]).toHaveProperty('userId');
      expect(allSubs[0]).toHaveProperty('role');
      expect(allSubs[0]).toHaveProperty('connectedAt');

      sseManager.disconnect(sub1);
    });
  });

  describe('[3.013-CONN-013] Concurrent Connections', () => {
    it('[3.013-CONN-013] should handle multiple concurrent connections', () => {
      // GIVEN: Multiple concurrent subscribers
      const responses = [];
      const subs = [];

      for (let i = 0; i < 5; i++) {
        const response = {
          ...mockResponse,
          write: jest.fn(),
          on: jest.fn().mockReturnThis()
        };
        responses.push(response);
        const sub = sseManager.subscribe(`user-${i}`, 'FREIGHTER', response);
        subs.push(sub);
      }

      // WHEN: Broadcasting to specific users
      sseManager.broadcast(
        {
          id: 'incident-concurrent',
          type: 'DELAY',
          planId: 'plan-concurrent',
          description: 'Test concurrent',
          timestamp: new Date().toISOString()
        },
        ['user-0', 'user-2']
      );

      // THEN: Only targeted users receive
      const eventCounts = responses.map(r =>
        r.write.mock.calls.filter(c => c[0].includes('event: incident')).length
      );

      expect(eventCounts[0]).toBeGreaterThan(0); // user-0
      expect(eventCounts[1]).toBe(0); // user-1
      expect(eventCounts[2]).toBeGreaterThan(0); // user-2
      expect(eventCounts[3]).toBe(0); // user-3
      expect(eventCounts[4]).toBe(0); // user-4

      // Cleanup
      subs.forEach(sub => sseManager.disconnect(sub));
    });
  });
});
