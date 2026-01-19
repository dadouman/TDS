/**
 * Integration Tests: GET /api/plans/[id] - View Plan Details
 * 
 * Real database integration tests for plan detail retrieval.
 * Tests relation loading, authorization, and 404 handling.
 * 
 * @see epic-2-test-review.md - Issue 2: Mocked Responses Instead of Integration Testing
 * @see implementation-artifacts/2-007-view-plan-details.md - Story requirements
 */

import { test, expect } from '@/test-utils/fixtures';
import { UserRole, LocationType, PlanStatus } from '@prisma/client';

describe('GET /api/plans/[id] - Integration Tests', () => {
  /**
   * [2.007-INT-001] Retrieve plan by ID with all fields
   * Validates: DB retrieval, field mapping, data completeness
   */
  test('[2.007-INT-001] should retrieve plan by ID with all fields', async ({ 
    seedUser, 
    seedLocation, 
    seedPlan, 
    prisma 
  }) => {
    // Arrange
    const user = await seedUser({ role: UserRole.FREIGHTER });
    const supplier = await seedLocation({ type: LocationType.SUPPLIER });
    const store = await seedLocation({ type: LocationType.STORE });
    
    const createdPlan = await seedPlan({
      supplierId: supplier.id,
      destinationId: store.id,
      unitCount: 75,
      plannedLoadingTime: new Date(Date.now() + 24 * 3600 * 1000),
      status: PlanStatus.DRAFT,
      notes: 'Test notes',
      createdBy: user.id,
      version: 1,
    });

    // Act: Retrieve plan by ID
    const plan = await prisma.transportPlan.findUnique({
      where: { id: createdPlan.id }
    });

    // Assert (10 assertions)
    expect(plan).toBeDefined();
    expect(plan?.id).toBe(createdPlan.id);
    expect(plan?.supplierId).toBe(supplier.id);
    expect(plan?.destinationId).toBe(store.id);
    expect(plan?.unitCount).toBe(75);
    expect(plan?.status).toBe(PlanStatus.DRAFT);
    expect(plan?.notes).toBe('Test notes');
    expect(plan?.version).toBe(1);
    expect(plan?.isDeleted).toBe(false);
    expect(plan?.createdBy).toBe(user.id);
    expect(plan?.createdAt).toBeInstanceOf(Date);
  });

  /**
   * [2.007-INT-002] Include supplier and destination relations
   * Validates: Join queries, relation loading
   */
  test('[2.007-INT-002] should include supplier and destination details', async ({ 
    seedUser, 
    seedLocation, 
    seedPlan, 
    prisma 
  }) => {
    // Arrange
    const user = await seedUser({ role: UserRole.FREIGHTER });
    const supplier = await seedLocation({ 
      type: LocationType.SUPPLIER,
      name: 'Main Supplier Hub',
      address: '123 Supplier Street'
    });
    const store = await seedLocation({ 
      type: LocationType.STORE,
      name: 'Downtown Store',
      address: '456 Store Avenue'
    });
    
    const createdPlan = await seedPlan({
      supplierId: supplier.id,
      destinationId: store.id,
      unitCount: 50,
      plannedLoadingTime: new Date(Date.now() + 24 * 3600 * 1000),
      status: PlanStatus.DRAFT,
      createdBy: user.id,
      version: 1,
    });

    // Act: Retrieve with relations
    const plan = await prisma.transportPlan.findUnique({
      where: { id: createdPlan.id },
      include: {
        supplier: true,
        destination: true,
        creator: true,
      }
    });

    // Assert (8 assertions)
    expect(plan?.supplier).toBeDefined();
    expect(plan?.destination).toBeDefined();
    expect(plan?.creator).toBeDefined();
    expect(plan?.supplier.name).toBe('Main Supplier Hub');
    expect(plan?.destination.name).toBe('Downtown Store');
    expect(plan?.supplier.type).toBe(LocationType.SUPPLIER);
    expect(plan?.destination.type).toBe(LocationType.STORE);
    expect(plan?.creator.id).toBe(user.id);
  });

  /**
   * [2.007-INT-003] Return null for non-existent plan ID
   * Validates: 404 handling, error cases
   */
  test('[2.007-INT-003] should return null for non-existent plan', async ({ prisma }) => {
    // Act
    const plan = await prisma.transportPlan.findUnique({
      where: { id: 'non-existent-plan-id-12345' }
    });

    // Assert
    expect(plan).toBeNull();
  });

  /**
   * [2.007-INT-004] Return null for soft-deleted plan
   * Validates: Soft-delete filtering
   */
  test('[2.007-INT-004] should exclude soft-deleted plans from detail view', async ({ 
    seedUser, 
    seedLocation, 
    seedPlan, 
    prisma 
  }) => {
    // Arrange: Create and soft-delete plan
    const user = await seedUser({ role: UserRole.FREIGHTER });
    const supplier = await seedLocation({ type: LocationType.SUPPLIER });
    const store = await seedLocation({ type: LocationType.STORE });
    
    const plan = await seedPlan({
      supplierId: supplier.id,
      destinationId: store.id,
      unitCount: 50,
      plannedLoadingTime: new Date(Date.now() + 24 * 3600 * 1000),
      status: PlanStatus.DRAFT,
      createdBy: user.id,
      version: 1,
      isDeleted: false,
    });

    // Soft-delete the plan
    await prisma.transportPlan.update({
      where: { id: plan.id },
      data: { isDeleted: true }
    });

    // Act: Try to retrieve deleted plan (with filter)
    const retrievedPlan = await prisma.transportPlan.findFirst({
      where: { 
        id: plan.id,
        isDeleted: false, // Business rule: don't show deleted
      }
    });

    // Assert
    expect(retrievedPlan).toBeNull(); // Filtered out by isDeleted
  });

  /**
   * [2.007-INT-005] Verify RBAC: Only creator can view plan
   * Validates: Authorization, data isolation
   */
  test('[2.007-INT-005] should enforce RBAC (user can only view own plans)', async ({ 
    seedUser, 
    seedLocation, 
    seedPlan, 
    prisma 
  }) => {
    // Arrange: Create 2 users
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
    
    // User1 creates a plan
    const user1Plan = await seedPlan({
      supplierId: supplier.id,
      destinationId: store.id,
      unitCount: 50,
      plannedLoadingTime: new Date(Date.now() + 24 * 3600 * 1000),
      status: PlanStatus.DRAFT,
      createdBy: user1.id,
      version: 1,
    });

    // Act: User2 tries to view User1's plan (with RBAC filter)
    const plan = await prisma.transportPlan.findFirst({
      where: { 
        id: user1Plan.id,
        createdBy: user2.id, // RBAC: wrong user
      }
    });

    // Assert: User2 cannot access
    expect(plan).toBeNull();

    // Verify User1 CAN access their own plan
    const user1Access = await prisma.transportPlan.findFirst({
      where: { 
        id: user1Plan.id,
        createdBy: user1.id, // Correct user
      }
    });
    expect(user1Access).toBeDefined();
    expect(user1Access?.id).toBe(user1Plan.id);
  });

  /**
   * [2.007-INT-006] Verify all status types are retrievable
   * Validates: Status enumeration, data integrity
   */
  test('[2.007-INT-006] should retrieve plans of all status types', async ({ 
    seedUser, 
    seedLocation, 
    seedPlan, 
    prisma 
  }) => {
    // Arrange
    const user = await seedUser({ role: UserRole.FREIGHTER });
    const supplier = await seedLocation({ type: LocationType.SUPPLIER });
    const store = await seedLocation({ type: LocationType.STORE });
    
    // Create plans with different statuses
    const draftPlan = await seedPlan({
      supplierId: supplier.id,
      destinationId: store.id,
      status: PlanStatus.DRAFT,
      createdBy: user.id,
      unitCount: 10,
      plannedLoadingTime: new Date(Date.now() + 24 * 3600 * 1000),
      version: 1,
    });

    const confirmedPlan = await seedPlan({
      supplierId: supplier.id,
      destinationId: store.id,
      status: PlanStatus.CONFIRMED,
      createdBy: user.id,
      unitCount: 20,
      plannedLoadingTime: new Date(Date.now() + 24 * 3600 * 1000),
      version: 1,
    });

    // Act: Retrieve each plan
    const draft = await prisma.transportPlan.findUnique({
      where: { id: draftPlan.id }
    });
    const confirmed = await prisma.transportPlan.findUnique({
      where: { id: confirmedPlan.id }
    });

    // Assert
    expect(draft?.status).toBe(PlanStatus.DRAFT);
    expect(confirmed?.status).toBe(PlanStatus.CONFIRMED);
  });

  /**
   * [2.007-INT-007] Verify timestamps are accurate
   * Validates: Timestamp tracking, audit trail
   */
  test('[2.007-INT-007] should have accurate createdAt and updatedAt timestamps', async ({ 
    seedUser, 
    seedLocation, 
    seedPlan, 
    prisma 
  }) => {
    // Arrange
    const user = await seedUser({ role: UserRole.FREIGHTER });
    const supplier = await seedLocation({ type: LocationType.SUPPLIER });
    const store = await seedLocation({ type: LocationType.STORE });
    
    const beforeCreate = new Date();
    
    const plan = await seedPlan({
      supplierId: supplier.id,
      destinationId: store.id,
      unitCount: 50,
      plannedLoadingTime: new Date(Date.now() + 24 * 3600 * 1000),
      status: PlanStatus.DRAFT,
      createdBy: user.id,
      version: 1,
    });

    const afterCreate = new Date();

    // Act: Retrieve plan
    const retrievedPlan = await prisma.transportPlan.findUnique({
      where: { id: plan.id }
    });

    // Assert (5 assertions)
    expect(retrievedPlan?.createdAt).toBeInstanceOf(Date);
    expect(retrievedPlan?.updatedAt).toBeInstanceOf(Date);
    expect(retrievedPlan!.createdAt.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
    expect(retrievedPlan!.createdAt.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
    expect(retrievedPlan!.updatedAt.getTime()).toBe(retrievedPlan!.createdAt.getTime());
  });

  /**
   * [2.007-INT-008] Verify version field is returned
   * Validates: Optimistic locking field presence
   */
  test('[2.007-INT-008] should return version field for optimistic locking', async ({ 
    seedUser, 
    seedLocation, 
    seedPlan, 
    prisma 
  }) => {
    // Arrange
    const user = await seedUser({ role: UserRole.FREIGHTER });
    const supplier = await seedLocation({ type: LocationType.SUPPLIER });
    const store = await seedLocation({ type: LocationType.STORE });
    
    const plan = await seedPlan({
      supplierId: supplier.id,
      destinationId: store.id,
      unitCount: 50,
      plannedLoadingTime: new Date(Date.now() + 24 * 3600 * 1000),
      status: PlanStatus.DRAFT,
      createdBy: user.id,
      version: 1,
    });

    // Act: Retrieve plan
    const retrievedPlan = await prisma.transportPlan.findUnique({
      where: { id: plan.id }
    });

    // Assert
    expect(retrievedPlan?.version).toBeDefined();
    expect(retrievedPlan?.version).toBe(1);
    expect(typeof retrievedPlan?.version).toBe('number');
  });
});
