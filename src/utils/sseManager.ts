/**
 * SSE Manager - Server-Sent Events Connection Management
 * Handles subscription, broadcasting, and connection lifecycle for real-time incident notifications
 */

import type { NextApiResponse } from 'next';

export type IncidentEvent = {
  id: string;
  type: 'REFUSAL' | 'DELAY' | 'IMBALANCE';
  planId: string;
  description: string;
  timestamp: string;
};

export type DeliveryStatusEvent = {
  id: string;
  eventType: 'DELIVERY_STATUS';
  planId: string;
  status: 'ACCEPTED' | 'IN_TRANSIT' | 'DELAYED' | 'DELIVERED' | 'CANCELLED';
  eta?: string; // ISO 8601 timestamp
  delayReason?: string;
  timestamp: string;
};

export type SSEEvent = IncidentEvent | DeliveryStatusEvent;

export type IncidentSubscriber = {
  userId: string;
  role: string;
  res: NextApiResponse;
  connectedAt: Date;
};

/**
 * Manages SSE subscriptions and broadcasts incidents to connected clients
 */
class SSEManager {
  private subscribers: Map<string, IncidentSubscriber> = new Map();
  private pingInterval: NodeJS.Timeout | null = null;
  private readonly PING_INTERVAL_MS = 30 * 1000; // 30 seconds
  private readonly MAX_CONNECTIONS_PER_USER = 100;

  /**
   * Subscribe a new client to the SSE stream
   * @param userId - User ID
   * @param role - User role (for RBAC)
   * @param res - NextApiResponse stream
   * @returns Subscriber ID for later unsubscribe
   */
  subscribe(userId: string, role: string, res: NextApiResponse): string {
    const subscriberId = `${userId}-${Date.now()}-${Math.random()}`;

    // Check connection limits per user
    const userConnections = Array.from(this.subscribers.values()).filter(
      sub => sub.userId === userId
    );
    if (userConnections.length >= this.MAX_CONNECTIONS_PER_USER) {
      res.writeHead(429, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Too many connections for this user' }));
      return '';
    }

    // Store subscriber
    this.subscribers.set(subscriberId, {
      userId,
      role,
      res,
      connectedAt: new Date()
    });

    // Send SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no' // Disable proxy buffering
    });

    // Send initial keep-alive ping
    res.write(': ping\n\n');

    // Set up periodic keep-alive pings
    const pingInterval = setInterval(() => {
      try {
        res.write(': ping\n\n');
      } catch (error) {
        // Connection may have closed, will be cleaned up in on('close')
      }
    }, this.PING_INTERVAL_MS);

    // Cleanup on client disconnect
    res.on('close', () => {
      clearInterval(pingInterval);
      this.subscribers.delete(subscriberId);
      console.log('[SSE] Client disconnected:', { userId, subscriberId });
    });

    res.on('error', (error) => {
      console.error('[SSE] Response error:', { userId, error: error.message });
      clearInterval(pingInterval);
      this.subscribers.delete(subscriberId);
      try {
        res.end();
      } catch {
        // Already closed
      }
    });

    console.log('[SSE] Client connected:', {
      userId,
      role,
      subscriberId,
      totalSubscribers: this.subscribers.size
    });

    return subscriberId;
  }

  /**
   * Broadcast an incident event to target users
   * @param event - Incident event data
   * @param targetUserIds - User IDs who should receive this incident
   */
  broadcast(event: IncidentEvent, targetUserIds: string[]): void {
    if (targetUserIds.length === 0) {
      console.warn('[SSE] No target users for incident broadcast');
      return;
    }

    const eventMessage = `event: incident\ndata: ${JSON.stringify(event)}\n\n`;
    let successCount = 0;
    let failureCount = 0;

    for (const [subscriberId, subscriber] of this.subscribers.entries()) {
      // RBAC: Only send to subscribers in target list
      if (!targetUserIds.includes(subscriber.userId)) {
        continue;
      }

      try {
        subscriber.res.write(eventMessage);
        successCount++;
      } catch (error) {
        console.error('[SSE] Failed to send event:', {
          subscriberId,
          userId: subscriber.userId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        failureCount++;
        // Remove dead connection
        this.subscribers.delete(subscriberId);
      }
    }

    console.log('[SSE] Broadcast complete:', {
      eventType: event.type,
      planId: event.planId,
      targetUsers: targetUserIds.length,
      successCount,
      failureCount
    });
  }

  /**
   * Broadcast a generic SSE event to target users
   * Supports both incident and delivery status events
   * @param event - Event data (IncidentEvent or DeliveryStatusEvent)
   * @param eventType - Event type name for SSE (e.g., 'incident', 'delivery-status')
   * @param targetUserIds - User IDs who should receive this event
   */
  broadcastEvent(event: SSEEvent, eventType: string, targetUserIds: string[]): void {
    if (targetUserIds.length === 0) {
      console.warn('[SSE] No target users for event broadcast:', { eventType });
      return;
    }

    const eventMessage = `event: ${eventType}\ndata: ${JSON.stringify(event)}\n\n`;
    let successCount = 0;
    let failureCount = 0;

    for (const [subscriberId, subscriber] of this.subscribers.entries()) {
      // RBAC: Only send to subscribers in target list
      if (!targetUserIds.includes(subscriber.userId)) {
        continue;
      }

      try {
        subscriber.res.write(eventMessage);
        successCount++;
      } catch (error) {
        console.error('[SSE] Failed to send event:', {
          subscriberId,
          userId: subscriber.userId,
          eventType,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        failureCount++;
        // Remove dead connection
        this.subscribers.delete(subscriberId);
      }
    }

    console.log('[SSE] Event broadcast complete:', {
      eventType,
      planId: 'planId' in event ? event.planId : 'unknown',
      targetUsers: targetUserIds.length,
      successCount,
      failureCount
    });
  }

  /**
   * Disconnect a specific subscriber
   * @param subscriberId - Subscriber ID from subscribe()
   */
  disconnect(subscriberId: string): void {
    const subscriber = this.subscribers.get(subscriberId);
    if (subscriber) {
      try {
        subscriber.res.end();
      } catch {
        // Already closed
      }
      this.subscribers.delete(subscriberId);
      console.log('[SSE] Client disconnected:', { subscriberId });
    }
  }

  /**
   * Get total number of active subscribers
   */
  getSubscriberCount(): number {
    return this.subscribers.size;
  }

  /**
   * Get subscribers for a specific user
   * @param userId - User ID
   */
  getUserSubscribers(userId: string): IncidentSubscriber[] {
    return Array.from(this.subscribers.values()).filter(
      sub => sub.userId === userId
    );
  }

  /**
   * Get all subscribers for monitoring/debugging
   */
  getAllSubscribers(): Array<Omit<IncidentSubscriber, 'res'>> {
    return Array.from(this.subscribers.values()).map(sub => ({
      userId: sub.userId,
      role: sub.role,
      connectedAt: sub.connectedAt
    }));
  }

  /**
   * Graceful shutdown - close all connections
   */
  shutdown(): void {
    console.log('[SSE] Shutting down SSE manager...');
    for (const [subscriberId, subscriber] of this.subscribers.entries()) {
      try {
        subscriber.res.write(': server shutting down\n\n');
        subscriber.res.end();
      } catch {
        // Already closed
      }
      this.subscribers.delete(subscriberId);
    }
    console.log('[SSE] Shutdown complete');
  }
}

// Singleton instance
export const sseManager = new SSEManager();
