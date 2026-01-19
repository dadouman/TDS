/**
 * Test Factories Index
 * 
 * Central export point for all test data factories.
 * Import from this file to access all factories in one place.
 * 
 * @see test-quality.md - Data factories pattern
 * @see epic-2-test-review.md - Issue 1: No Factory Pattern for Test Data
 * 
 * @example
 * import { createPlan, createUser, createSupplier } from '@/test-utils/factories';
 */

// Plan factories
export {
  createPlan,
  createCarrierProposal,
  createCarrierProposals,
  createPlanWithProposals,
  type TransportPlan,
  type CarrierProposal,
} from './plan-factory';

// User factories
export {
  createUser,
  createFreighter,
  createCarrier,
  createStoreManager,
  createUsers,
  type User,
} from './user-factory';

// Location factories
export {
  createLocation,
  createSupplier,
  createHub,
  createStore,
  createRoute,
  createLocations,
  type Location,
} from './location-factory';

// Health factories (already existing)
export {
  createHealthResponse,
  isValidISO8601,
  type HealthResponse,
} from './health-response-factory';
