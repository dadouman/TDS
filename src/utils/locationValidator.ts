import { PrismaClient, LocationType } from '@prisma/client';

const prisma = new PrismaClient();

export interface LocationValidationResult {
  isValid: boolean;
  error?: string;
  location?: any;
}

export async function validateLocation(
  locationId: string,
  expectedType: LocationType
): Promise<LocationValidationResult> {
  if (!locationId) {
    return { isValid: false, error: 'Location ID is required' };
  }

  const location = await prisma.location.findFirst({
    where: {
      id: locationId,
      type: expectedType,
      is_deleted: false
    }
  });

  if (!location) {
    return { isValid: false, error: `${expectedType} location not found` };
  }

  return { isValid: true, location };
}

export async function validateLocationsAreDifferent(
  locationId1: string,
  locationId2: string
): Promise<boolean> {
  return locationId1 !== locationId2;
}
