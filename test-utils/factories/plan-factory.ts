/**
 * Transport Plan Factory
 * 
 * Factory functions for creating transport plan test data with configurable overrides.
 * Eliminates hardcoded mock objects and supports parallel test execution.
 * 
 * @see test-quality.md - Data factories pattern
 * @see data-factories.md - Factory overrides pattern
 * @see epic-2-test-review.md - Issue 1: No Factory Pattern for Test Data
 */

import { faker } from '@faker-js/faker';
import { PlanStatus } from '@prisma/client';

export type TransportPlan = {
  id: string;
  supplierId: string;
  destinationId: string;
  unitCount: number;
  plannedLoadingTime: Date;
  status: PlanStatus;
  notes?: string;
  createdBy: string;
  version: number;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type CarrierProposal = {
  carrierId: string;
  carrierName: string;
  capacity: number;
  costPerUnit: number;
  totalCost: number;
  estimatedETA: Date;
};

/**
 * Create a transport plan with optional overrides
 * 
 * @param overrides - Partial object to override default values
 * @returns Complete TransportPlan object
 * 
 * @example
 * // Default DRAFT plan 24h in future
 * const plan = createPlan();
 * 
 * @example
 * // Override for specific test scenario
 * const confirmedPlan = createPlan({ 
 *   status: 'CONFIRMED',
 *   unitCount: 100 
 * });
 */
export const createPlan = (overrides: Partial<TransportPlan> = {}): TransportPlan => ({
  id: faker.string.uuid(),
  supplierId: faker.string.uuid(),
  destinationId: faker.string.uuid(),
  unitCount: faker.number.int({ min: 1, max: 1000 }),
  plannedLoadingTime: new Date(Date.now() + 24 * 3600 * 1000), // 24h future
  status: PlanStatus.DRAFT,
  notes: faker.lorem.sentence(),
  createdBy: faker.string.uuid(),
  version: 1,
  isDeleted: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

/**
 * Create a carrier proposal with optional overrides
 * 
 * @param overrides - Partial object to override default values
 * @returns Complete CarrierProposal object
 * 
 * @example
 * const proposal = createCarrierProposal({ costPerUnit: 45 });
 */
export const createCarrierProposal = (overrides: Partial<CarrierProposal> = {}): CarrierProposal => {
  const capacity = faker.number.int({ min: 10, max: 100 });
  const costPerUnit = faker.number.float({ min: 10, max: 100, fractionDigits: 2 });
  const totalCost = capacity * costPerUnit;

  return {
    carrierId: faker.string.uuid(),
    carrierName: faker.company.name(),
    capacity,
    costPerUnit,
    totalCost,
    estimatedETA: new Date(Date.now() + 48 * 3600 * 1000), // 48h future
    ...overrides,
  };
};

/**
 * Create multiple carrier proposals
 * 
 * @param count - Number of proposals to create
 * @param overrides - Partial object applied to all proposals
 * @returns Array of CarrierProposal objects
 * 
 * @example
 * const proposals = createCarrierProposals(3);
 * // Returns 3 unique carrier proposals
 */
export const createCarrierProposals = (
  count: number = 3,
  overrides: Partial<CarrierProposal> = {}
): CarrierProposal[] => {
  return Array.from({ length: count }, () => createCarrierProposal(overrides));
};

/**
 * Create a plan with related carrier proposals
 * 
 * @param planOverrides - Overrides for the plan
 * @param proposalCount - Number of carrier proposals to create
 * @returns Object with plan and proposals
 * 
 * @example
 * const { plan, proposals } = createPlanWithProposals({ status: 'DRAFT' }, 2);
 */
export const createPlanWithProposals = (
  planOverrides: Partial<TransportPlan> = {},
  proposalCount: number = 3
) => {
  const plan = createPlan(planOverrides);
  const proposals = createCarrierProposals(proposalCount);
  
  return { plan, proposals };
};
