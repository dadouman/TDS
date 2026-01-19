/**
 * User Factory
 * 
 * Factory functions for creating user test data with configurable overrides.
 * Supports all user roles: FREIGHTER, CARRIER, STORE_MANAGER.
 * 
 * @see test-quality.md - Data factories pattern
 * @see data-factories.md - Factory overrides pattern
 * @see epic-2-test-review.md - Issue 1: No Factory Pattern for Test Data
 */

import { faker } from '@faker-js/faker';
import { UserRole } from '@prisma/client';

export type User = {
  id: string;
  email: string;
  password_hash: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Create a user with optional overrides
 * 
 * @param overrides - Partial object to override default values
 * @returns Complete User object
 * 
 * @example
 * // Default FREIGHTER user
 * const user = createUser();
 * 
 * @example
 * // Create CARRIER user
 * const carrier = createUser({ role: 'CARRIER' });
 */
export const createUser = (overrides: Partial<User> = {}): User => ({
  id: faker.string.uuid(),
  email: faker.internet.email(),
  password_hash: '$2b$10$hash.placeholder', // Bcrypt hash placeholder
  firstName: faker.person.firstName(),
  lastName: faker.person.lastName(),
  role: UserRole.FREIGHTER,
  isDeleted: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

/**
 * Create a FREIGHTER user
 * 
 * @param overrides - Partial object to override default values
 * @returns User with FREIGHTER role
 * 
 * @example
 * const freighter = createFreighter({ email: 'specific@test.com' });
 */
export const createFreighter = (overrides: Partial<User> = {}): User => {
  return createUser({ role: UserRole.FREIGHTER, ...overrides });
};

/**
 * Create a CARRIER user
 * 
 * @param overrides - Partial object to override default values
 * @returns User with CARRIER role
 * 
 * @example
 * const carrier = createCarrier();
 */
export const createCarrier = (overrides: Partial<User> = {}): User => {
  return createUser({ role: UserRole.CARRIER, ...overrides });
};

/**
 * Create a STORE_MANAGER user
 * 
 * @param overrides - Partial object to override default values
 * @returns User with STORE_MANAGER role
 * 
 * @example
 * const storeManager = createStoreManager();
 */
export const createStoreManager = (overrides: Partial<User> = {}): User => {
  return createUser({ role: UserRole.STORE_MANAGER, ...overrides });
};

/**
 * Create multiple users with different roles
 * 
 * @param count - Number of users to create
 * @param role - Role for all users (optional)
 * @returns Array of User objects
 * 
 * @example
 * const users = createUsers(5, 'FREIGHTER');
 */
export const createUsers = (count: number, role?: UserRole): User[] => {
  return Array.from({ length: count }, () => createUser(role ? { role } : {}));
};
