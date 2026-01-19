import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface CarrierProposal {
  carrierId: string;
  carrierName: string;
  capacity: number;
  costPerUnit: number;
  totalCost: number;
  estimatedETA: Date;
}

export async function proposeCarriers(
  unitCount: number,
  plannedLoadingTime: Date,
  destinationId: string,
  limit: number = 3
): Promise<CarrierProposal[]> {
  // Query carriers with sufficient capacity
  // Not already assigned at this loading time
  // Sorted by: availability → cost → distance

  // MVP: Mock carriers (will use real queries in extended story)
  const proposals: CarrierProposal[] = [
    {
      carrierId: 'carrier-1',
      carrierName: 'FastExpress',
      capacity: 20,
      costPerUnit: 50,
      totalCost: unitCount * 50,
      estimatedETA: new Date(plannedLoadingTime.getTime() + 12 * 3600 * 1000)
    },
    {
      carrierId: 'carrier-2',
      carrierName: 'EcoTransport',
      capacity: 30,
      costPerUnit: 40,
      totalCost: unitCount * 40,
      estimatedETA: new Date(plannedLoadingTime.getTime() + 14 * 3600 * 1000)
    },
    {
      carrierId: 'carrier-3',
      carrierName: 'StandardFreight',
      capacity: 50,
      costPerUnit: 35,
      totalCost: unitCount * 35,
      estimatedETA: new Date(plannedLoadingTime.getTime() + 16 * 3600 * 1000)
    }
  ];

  return proposals.slice(0, limit);
}
