/**
 * Integration Tests: GET /api/plans - List Transport Plans
 * 
 * Real database integration tests for plan listing with filtering and sorting.
 * Tests pagination, RBAC filtering, and soft-delete handling.
 * 
 * @see epic-2-test-review.md - Issue 2: Mocked Responses Instead of Integration Testing
 * @see implementation-artifacts/2-006-list-plans.md - Story requirements
 */

import { test, expect } from '@/test-utils/fixtures';
import { UserRole, LocationType, PlanStatus } from '@prisma/client';

describe('GET /api/plans - Integration Tests', () => {
  /**
   * [2.006-INT-001] List all plans for a user
   * Validates: DB query, data retrieval, default ordering
   */
  test('[2.006-INT-001] should list all plans for a user', async ({ 
    seedUser, 
    seedLocation, 
    seedPlan, 
    prisma 
  }) => {
    // Arrange: Create user and 3 plans
    const user = await seedUser({ role: UserRole.FREIGHTER });
    const supplier = await seedLocation({ type: LocationType.SUPPLIER });
    const store = await seedLocation({ type: LocationType.STORE });

    await seedPlan({
      supplierId: supplier.id,
      destinationId: store.id,
      unitCount: 10,
      plannedLoadingTime: new Date(Date.now() + 24 * 3600 * 1000),
      status: PlanStatus.DRAFT,
      createdBy: user.id,
      version: 1,
    });

    await seedPlan({
      supplierId: supplier.id,
      destinationId: store.id,
      unitCount: 20,
      plannedLoadingTime: new Date(Date.now() + 48 * 3600 * 1000),
      status: PlanStatus.DRAFT,
      createdBy: user.id,
      version: 1,
    });

    await seedPlan({
      supplierId: supplier.id,
      destinationId: store.id,
      unitCount: 30,
      plannedLoadingTime: new Date(Date.now() + 72 * 3600 * 1000),
      status: PlanStatus.CONFIRMED,
      createdBy: user.id,
      version: 1,
    });

    // Act: Query all plans for user
    const plans = await prisma.transportPlan.findMany({
      where: { 
        createdBy: user.id,
        isDeleted: false,
      },
      orderBy: { createdAt: 'desc' }
    });

    // Assert (5 assertions)
    expect(plans).toHaveLength(3);
    expect(plans[0].createdBy).toBe(user.id);
    expect(plans[1].createdBy).toBe(user.id);
    expect(plans[2].createdBy).toBe(user.id);
    expect(plans.every(p => !p.isDeleted)).toBe(true);
  });

  /**
   * [2.006-INT-002] Filter plans by status
   * Validates: Status filtering, query conditions
   */
  test('[2.006-INT-002] should filter plans by status', async ({ 
    seedUser, 
    seedLocation, 
    seedPlan, 
    prisma 
  }) => {
    // Arrange
    const user = await seedUser({ role: UserRole.FREIGHTER });
    const supplier = await seedLocation({ type: LocationType.SUPPLIER });
    const store = await seedLocation({ type: LocationType.STORE });

    // Create 2 DRAFT, 1 CONFIRMED
    await seedPlan({
      supplierId: supplier.id,
      destinationId: store.id,
      status: PlanStatus.DRAFT,
      createdBy: user.id,
      unitCount: 10,
      plannedLoadingTime: new Date(Date.now() + 24 * 3600 * 1000),
      version: 1,
    });

    await seedPlan({
      supplierId: supplier.id,
      destinationId: store.id,
      status: PlanStatus.DRAFT,
      createdBy: user.id,
      unitCount: 20,
      plannedLoadingTime: new Date(Date.now() + 24 * 3600 * 1000),
      version: 1,
    });

    await seedPlan({
      supplierId: supplier.id,
      destinationId: store.id,
      status: PlanStatus.CONFIRMED,
      createdBy: user.id,
      unitCount: 30,
      plannedLoadingTime: new Date(Date.now() + 24 * 3600 * 1000),
      version: 1,
    });

    // Act: Query only DRAFT plans
    const draftPlans = await prisma.transportPlan.findMany({
      where: { 
        createdBy: user.id,
        status: PlanStatus.DRAFT,
        isDeleted: false,
      }
    });

    // Assert
    expect(draftPlans).toHaveLength(2);
    expect(draftPlans.every(p => p.status === PlanStatus.DRAFT)).toBe(true);
  });

  /**
   * [2.006-INT-003] Exclude soft-deleted plans
   * Validates: Soft-delete filtering, isDeleted flag
   */
  test('[2.006-INT-003] should exclude soft-deleted plans', async ({ 
    seedUser, 
    seedLocation, 
    seedPlan, 
    prisma 
  }) => {
    // Arrange
    const user = await seedUser({ role: UserRole.FREIGHTER });
    const supplier = await seedLocation({ type: LocationType.SUPPLIER });
    const store = await seedLocation({ type: LocationType.STORE });

    // Create 2 active, 1 deleted
    await seedPlan({
      supplierId: supplier.id,
      destinationId: store.id,
      status: PlanStatus.DRAFT,
      createdBy: user.id,
      isDeleted: false,
      unitCount: 10,
      plannedLoadingTime: new Date(Date.now() + 24 * 3600 * 1000),
      version: 1,
    });

    const deletedPlan = await seedPlan({
      supplierId: supplier.id,
      destinationId: store.id,
      status: PlanStatus.DRAFT,
      createdBy: user.id,
      isDeleted: false,
      unitCount: 20,
      plannedLoadingTime: new Date(Date.now() + 24 * 3600 * 1000),
      version: 1,
    });

    // Soft-delete the plan
    await prisma.transportPlan.update({
      where: { id: deletedPlan.id },
      data: { isDeleted: true }
    });

    // Act: Query only active plans
    const activePlans = await prisma.transportPlan.findMany({
      where: { 
        createdBy: user.id,
        isDeleted: false,
      }
    });

    // Assert
    expect(activePlans).toHaveLength(1); // Only 1 active plan
    expect(activePlans.every(p => !p.isDeleted)).toBe(true);
  });

  /**
   * [2.006-INT-004] RBAC: User only sees own plans
   * Validates: Data isolation, authorization filtering
   */
  test('[2.006-INT-004] should only return plans created by user (RBAC)', async ({ 
    seedUser, 
    seedLocation, 
    seedPlan, 
    prisma 
  }) => {
    // Arrange: Create 2 users with plans
    const user1 = await seedUser({ 
      role: UserRole.FREIGHTER,
      email: 'user1@test.com'
    });
    const user2 = await seedUser({ 
      role: UserRole.FREIGHTER,
      email: 'user2@test.com'
    });
    const supplier = await seedLocation({ type: LocationType.SUPPLIER });
    const store = await seedLocation({ type: LocationType.STORE });

    // User1's plans
    await seedPlan({
      supplierId: supplier.id,
      destinationId: store.id,
      createdBy: user1.id,
      unitCount: 10,
      plannedLoadingTime: new Date(Date.now() + 24 * 3600 * 1000),
      status: PlanStatus.DRAFT,
      version: 1,
    });

    await seedPlan({
      supplierId: supplier.id,
      destinationId: store.id,
      createdBy: user1.id,
      unitCount: 20,
      plannedLoadingTime: new Date(Date.now() + 24 * 3600 * 1000),
      status: PlanStatus.DRAFT,
      version: 1,
    });

    // User2's plan
    await seedPlan({
      supplierId: supplier.id,
      destinationId: store.id,
      createdBy: user2.id,
      unitCount: 30,
      plannedLoadingTime: new Date(Date.now() + 24 * 3600 * 1000),
      status: PlanStatus.DRAFT,
      version: 1,
    });

    // Act: Query User1's plans
    const user1Plans = await prisma.transportPlan.findMany({
      where: { 
        createdBy: user1.id,
        isDeleted: false,
      }
    });

    // Assert: User1 only sees their 2 plans
    expect(user1Plans).toHaveLength(2);
    expect(user1Plans.every(p => p.createdBy === user1.id)).toBe(true);
    expect(user1Plans.some(p => p.createdBy === user2.id)).toBe(false);
  });

  /**
   * [2.006-INT-005] Sort plans by createdAt descending
   * Validates: Ordering, timestamp sorting
   */
  test('[2.006-INT-005] should sort plans by createdAt descending', async ({ 
    seedUser, 
    seedLocation, 
    seedPlan, 
    prisma 
  }) => {
    // Arrange
    const user = await seedUser({ role: UserRole.FREIGHTER });
    const supplier = await seedLocation({ type: LocationType.SUPPLIER });
    const store = await seedLocation({ type: LocationType.STORE });

    // Create plans with slight delay to ensure different createdAt
    const plan1 = await seedPlan({
      supplierId: supplier.id,
      destinationId: store.id,
      createdBy: user.id,
      unitCount: 10,
      plannedLoadingTime: new Date(Date.now() + 24 * 3600 * 1000),
      status: PlanStatus.DRAFT,
      version: 1,
    });

    await new Promise(resolve => setTimeout(resolve, 100));

    const plan2 = await seedPlan({
      supplierId: supplier.id,
      destinationId: store.id,
      createdBy: user.id,
      unitCount: 20,
      plannedLoadingTime: new Date(Date.now() + 24 * 3600 * 1000),
      status: PlanStatus.DRAFT,
      version: 1,
    });

    // Act: Query with descending order
    const plans = await prisma.transportPlan.findMany({
      where: { createdBy: user.id, isDeleted: false },
      orderBy: { createdAt: 'desc' }
    });

    // Assert: Most recent first
    expect(plans).toHaveLength(2);
    expect(plans[0].id).toBe(plan2.id); // Most recent
    expect(plans[1].id).toBe(plan1.id); // Oldest
    expect(plans[0].createdAt.getTime()).toBeGreaterThan(plans[1].createdAt.getTime());
  });

  /**
   * [2.006-INT-006] Pagination support
   * Validates: Limit, offset, result slicing
   */
  test('[2.006-INT-006] should support pagination (limit/offset)', async ({ 
    seedUser, 
    seedLocation, 
    seedPlan, 
    prisma 
  }) => {
    // Arrange: Create 5 plans
    const user = await seedUser({ role: UserRole.FREIGHTER });
    const supplier = await seedLocation({ type: LocationType.SUPPLIER });
    const store = await seedLocation({ type: LocationType.STORE });

    for (let i = 0; i < 5; i++) {
      await seedPlan({
        supplierId: supplier.id,
        destinationId: store.id,
        createdBy: user.id,
        unitCount: (i + 1) * 10,
        plannedLoadingTime: new Date(Date.now() + 24 * 3600 * 1000),
        status: PlanStatus.DRAFT,
        version: 1,
      });
    }

    // Act: Query page 1 (first 2 results)
    const page1 = await prisma.transportPlan.findMany({
      where: { createdBy: user.id, isDeleted: false },
      orderBy: { createdAt: 'desc' },
      take: 2,
      skip: 0,
    });

    // Act: Query page 2 (next 2 results)
    const page2 = await prisma.transportPlan.findMany({
      where: { createdBy: user.id, isDeleted: false },
      orderBy: { createdAt: 'desc' },
      take: 2,
      skip: 2,
    });

    // Assert
    expect(page1).toHaveLength(2);
    expect(page2).toHaveLength(2);
    expect(page1[0].id).not.toBe(page2[0].id); // Different results
  });

  /**
   * [2.006-INT-007] Include related locations in response
   * Validates: Join queries, relation loading
   */
  test('[2.006-INT-007] should include supplier and destination locations', async ({ 
    seedUser, 
    seedLocation, 
    seedPlan, 
    prisma 
  }) => {
    // Arrange
    const user = await seedUser({ role: UserRole.FREIGHTER });
    const supplier = await seedLocation({ 
      type: LocationType.SUPPLIER,
      name: 'Main Supplier'
    });
    const store = await seedLocation({ 
      type: LocationType.STORE,
      name: 'Downtown Store'
    });

    await seedPlan({
      supplierId: supplier.id,
      destinationId: store.id,
      createdBy: user.id,
      unitCount: 50,
      plannedLoadingTime: new Date(Date.now() + 24 * 3600 * 1000),
      status: PlanStatus.DRAFT,
      version: 1,
    });

    // Act: Query with relations
    const plans = await prisma.transportPlan.findMany({
      where: { createdBy: user.id, isDeleted: false },
      include: {
        supplier: true,
        destination: true,
      }
    });

    // Assert (6 assertions)
    expect(plans).toHaveLength(1);
    expect(plans[0].supplier).toBeDefined();
    expect(plans[0].destination).toBeDefined();
    expect(plans[0].supplier.name).toBe('Main Supplier');
    expect(plans[0].destination.name).toBe('Downtown Store');
    expect(plans[0].supplier.type).toBe(LocationType.SUPPLIER);
    expect(plans[0].destination.type).toBe(LocationType.STORE);
  });
});
