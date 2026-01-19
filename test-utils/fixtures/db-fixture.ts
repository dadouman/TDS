/**
 * Database Test Fixtures
 * 
 * Reusable test fixtures for database setup and cleanup.
 * Provides seedPlan, seedUser, seedLocation helpers with automatic cleanup.
 * 
 * @see test-quality.md - Fixture patterns
 * @see epic-2-test-review.md - Issue 4: No Fixture Setup for Reusable Test Data
 * 
 * @example
 * import { test } from '@/test-utils/fixtures/db-fixture';
 * 
 * test('should create plan', async ({ seedPlan, prisma }) => {
 *   const plan = await seedPlan({ unitCount: 100 });
 *   // plan is auto-cleaned up after test
 * });
 */

import { test as base } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { 
  createUser, 
  createLocation, 
  createPlan,
  type User,
  type Location,
  type TransportPlan
} from '../factories';

type DbFixtures = {
  prisma: PrismaClient;
  seedUser: (overrides?: Partial<User>) => Promise<User>;
  seedLocation: (overrides?: Partial<Location>) => Promise<Location>;
  seedPlan: (overrides?: Partial<TransportPlan>) => Promise<TransportPlan>;
  cleanupPlans: () => Promise<void>;
  cleanupUsers: () => Promise<void>;
  cleanupLocations: () => Promise<void>;
};

/**
 * Extended test with database fixtures
 * Automatically manages Prisma client and test data cleanup
 */
export const test = base.extend<DbFixtures>({
  /**
   * Prisma client fixture
   * Auto-connects and disconnects for each test
   */
  prisma: async ({}, use) => {
    const prisma = new PrismaClient();
    await use(prisma);
    await prisma.$disconnect();
  },

  /**
   * Seed user fixture
   * Creates user in database with automatic cleanup
   */
  seedUser: async ({ prisma }, use) => {
    const createdUserIds: string[] = [];

    const seed = async (overrides: Partial<User> = {}) => {
      const userData = createUser(overrides);
      
      const user = await prisma.user.create({
        data: {
          id: userData.id,
          email: userData.email,
          password_hash: userData.password_hash,
          firstName: userData.firstName,
          lastName: userData.lastName,
          role: userData.role,
          isDeleted: userData.isDeleted,
        }
      });

      createdUserIds.push(user.id);
      return user;
    };

    await use(seed);

    // Auto-cleanup all created users
    for (const userId of createdUserIds) {
      await prisma.user.delete({ where: { id: userId } }).catch(() => {});
    }
  },

  /**
   * Seed location fixture
   * Creates location in database with automatic cleanup
   */
  seedLocation: async ({ prisma }, use) => {
    const createdLocationIds: string[] = [];

    const seed = async (overrides: Partial<Location> = {}) => {
      const locationData = createLocation(overrides);
      
      const location = await prisma.location.create({
        data: {
          id: locationData.id,
          name: locationData.name,
          type: locationData.type,
          address: locationData.address,
          latitude: locationData.latitude,
          longitude: locationData.longitude,
          isDeleted: locationData.isDeleted,
        }
      });

      createdLocationIds.push(location.id);
      return location;
    };

    await use(seed);

    // Auto-cleanup all created locations
    for (const locationId of createdLocationIds) {
      await prisma.location.delete({ where: { id: locationId } }).catch(() => {});
    }
  },

  /**
   * Seed plan fixture
   * Creates transport plan in database with automatic cleanup
   * Requires user and locations to exist (use seedUser/seedLocation first)
   */
  seedPlan: async ({ prisma }, use) => {
    const createdPlanIds: string[] = [];

    const seed = async (overrides: Partial<TransportPlan> = {}) => {
      const planData = createPlan(overrides);
      
      const plan = await prisma.transportPlan.create({
        data: {
          id: planData.id,
          supplierId: planData.supplierId,
          destinationId: planData.destinationId,
          unitCount: planData.unitCount,
          plannedLoadingTime: planData.plannedLoadingTime,
          status: planData.status,
          notes: planData.notes,
          createdBy: planData.createdBy,
          version: planData.version,
          isDeleted: planData.isDeleted,
        }
      });

      createdPlanIds.push(plan.id);
      return plan;
    };

    await use(seed);

    // Auto-cleanup all created plans
    for (const planId of createdPlanIds) {
      await prisma.transportPlan.delete({ where: { id: planId } }).catch(() => {});
    }
  },

  /**
   * Cleanup plans fixture
   * Manually cleanup all transport plans
   */
  cleanupPlans: async ({ prisma }, use) => {
    const cleanup = async () => {
      await prisma.transportPlan.deleteMany({});
    };

    await use(cleanup);
  },

  /**
   * Cleanup users fixture
   * Manually cleanup all users
   */
  cleanupUsers: async ({ prisma }, use) => {
    const cleanup = async () => {
      await prisma.user.deleteMany({});
    };

    await use(cleanup);
  },

  /**
   * Cleanup locations fixture
   * Manually cleanup all locations
   */
  cleanupLocations: async ({ prisma }, use) => {
    const cleanup = async () => {
      await prisma.location.deleteMany({});
    };

    await use(cleanup);
  },
});

export { expect } from '@playwright/test';
