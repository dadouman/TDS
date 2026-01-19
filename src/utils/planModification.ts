import { PlanStatus } from '@prisma/client';

export interface ModificationRequest {
  unitCount?: number;
  plannedLoadingTime?: string;
  destinationStoreId?: string;
  notes?: string;
  version?: number;
}

export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Check if a field can be modified given current plan status
 */
export function canModifyField(fieldName: string, currentStatus: PlanStatus): boolean {
  const modifiableInDraft = ['unitCount', 'plannedLoadingTime', 'destinationStoreId', 'notes'];
  const modifiableInProposed = ['notes']; // Only notes can be modified after PROPOSED
  const notModifiableStatuses = ['ACCEPTED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'];

  // Cannot modify in terminal statuses
  if (notModifiableStatuses.includes(currentStatus)) {
    return false;
  }

  // Can modify these in DRAFT
  if (currentStatus === 'DRAFT' && modifiableInDraft.includes(fieldName)) {
    return true;
  }

  // Can modify notes even in PROPOSED
  if (currentStatus === 'PROPOSED' && modifiableInProposed.includes(fieldName)) {
    return true;
  }

  return false;
}

/**
 * Validate modifications against business rules
 */
export function validateModification(
  oldPlan: any,
  newValues: ModificationRequest
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Validate unitCount
  if (newValues.unitCount !== undefined) {
    if (newValues.unitCount <= 0 || newValues.unitCount > 1000) {
      errors.push({
        field: 'unitCount',
        message: 'Unit count must be between 1 and 1000'
      });
    }
  }

  // Validate plannedLoadingTime
  if (newValues.plannedLoadingTime !== undefined) {
    const loadingTime = new Date(newValues.plannedLoadingTime);
    const now = new Date();

    if (loadingTime <= now) {
      errors.push({
        field: 'plannedLoadingTime',
        message: 'Loading time must be in the future'
      });
    }

    // Validate 40-hour window
    const hubDuration = 2 * 3600 * 1000; // 2 hours
    const transitDuration = 4 * 3600 * 1000; // 4 hours
    const estimatedDeliveryTime = new Date(loadingTime.getTime() + hubDuration + transitDuration);
    const totalWindow = estimatedDeliveryTime.getTime() - loadingTime.getTime();
    const maxWindow = 40 * 3600 * 1000;

    if (totalWindow > maxWindow) {
      errors.push({
        field: 'plannedLoadingTime',
        message: 'Delivery window would exceed 40 hours'
      });
    }
  }

  // Validate destinationStoreId (just format check)
  if (newValues.destinationStoreId !== undefined) {
    if (!newValues.destinationStoreId || typeof newValues.destinationStoreId !== 'string') {
      errors.push({
        field: 'destinationStoreId',
        message: 'Destination store ID is required and must be a string'
      });
    }
  }

  return errors;
}

/**
 * Determine which fields have changed
 */
export function getChangedFields(oldPlan: any, newValues: ModificationRequest): string[] {
  const changed: string[] = [];

  if (
    newValues.unitCount !== undefined &&
    newValues.unitCount !== oldPlan.unitCount
  ) {
    changed.push('unitCount');
  }

  if (
    newValues.plannedLoadingTime !== undefined &&
    new Date(newValues.plannedLoadingTime).getTime() !== oldPlan.plannedLoadingTime.getTime()
  ) {
    changed.push('plannedLoadingTime');
  }

  if (
    newValues.destinationStoreId !== undefined &&
    newValues.destinationStoreId !== oldPlan.destinationId
  ) {
    changed.push('destinationStoreId');
  }

  if (newValues.notes !== undefined && newValues.notes !== oldPlan.notes) {
    changed.push('notes');
  }

  return changed;
}

/**
 * Check if modification triggers need for re-proposal
 */
export function needsReProposal(changedFields: string[]): boolean {
  const reProposalTriggers = ['unitCount', 'plannedLoadingTime', 'destinationStoreId'];
  return changedFields.some(field => reProposalTriggers.includes(field));
}
