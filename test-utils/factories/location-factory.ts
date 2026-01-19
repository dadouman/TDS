/**
 * Location Factory
 * 
 * Factory functions for creating location test data (SUPPLIER, HUB, STORE).
 * Supports realistic geographical coordinates and addresses.
 * 
 * @see test-quality.md - Data factories pattern
 * @see data-factories.md - Factory overrides pattern
 * @see epic-2-test-review.md - Issue 1: No Factory Pattern for Test Data
 */

import { faker } from '@faker-js/faker';
import { LocationType } from '@prisma/client';

export type Location = {
  id: string;
  name: string;
  type: LocationType;
  address: string;
  latitude: number;
  longitude: number;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Create a location with optional overrides
 * 
 * @param overrides - Partial object to override default values
 * @returns Complete Location object
 * 
 * @example
 * // Default SUPPLIER location
 * const location = createLocation();
 * 
 * @example
 * // Create HUB location
 * const hub = createLocation({ type: 'HUB' });
 */
export const createLocation = (overrides: Partial<Location> = {}): Location => ({
  id: faker.string.uuid(),
  name: faker.company.name(),
  type: LocationType.SUPPLIER,
  address: faker.location.streetAddress(),
  latitude: parseFloat(faker.location.latitude()),
  longitude: parseFloat(faker.location.longitude()),
  isDeleted: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

/**
 * Create a SUPPLIER location
 * 
 * @param overrides - Partial object to override default values
 * @returns Location with SUPPLIER type
 * 
 * @example
 * const supplier = createSupplier({ name: 'Main Supplier' });
 */
export const createSupplier = (overrides: Partial<Location> = {}): Location => {
  return createLocation({ 
    type: LocationType.SUPPLIER, 
    name: `${faker.company.name()} Supplier`,
    ...overrides 
  });
};

/**
 * Create a HUB location
 * 
 * @param overrides - Partial object to override default values
 * @returns Location with HUB type
 * 
 * @example
 * const hub = createHub();
 */
export const createHub = (overrides: Partial<Location> = {}): Location => {
  return createLocation({ 
    type: LocationType.HUB, 
    name: `${faker.location.city()} Hub`,
    ...overrides 
  });
};

/**
 * Create a STORE location
 * 
 * @param overrides - Partial object to override default values
 * @returns Location with STORE type
 * 
 * @example
 * const store = createStore({ latitude: 48.8566, longitude: 2.3522 });
 */
export const createStore = (overrides: Partial<Location> = {}): Location => {
  return createLocation({ 
    type: LocationType.STORE, 
    name: `${faker.location.city()} Store`,
    ...overrides 
  });
};

/**
 * Create a complete route: SUPPLIER -> HUB -> STORE
 * 
 * @returns Object with supplier, hub, and store locations
 * 
 * @example
 * const { supplier, hub, store } = createRoute();
 * // Returns 3 locations forming a complete route
 */
export const createRoute = () => {
  return {
    supplier: createSupplier(),
    hub: createHub(),
    store: createStore(),
  };
};

/**
 * Create multiple locations of a specific type
 * 
 * @param count - Number of locations to create
 * @param type - Location type (SUPPLIER, HUB, STORE)
 * @returns Array of Location objects
 * 
 * @example
 * const stores = createLocations(5, 'STORE');
 */
export const createLocations = (count: number, type: LocationType): Location[] => {
  return Array.from({ length: count }, () => createLocation({ type }));
};
