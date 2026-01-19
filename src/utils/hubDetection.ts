export function detectHubFromRoute(supplierId: string, destinationId: string): string | null {
  // Simplified: hardcoded routes for MVP
  const routeMap: Record<string, string | null> = {
    'supplier-1::store-1': 'hub-1',
    'supplier-1::store-2': 'hub-1',
    'supplier-2::store-1': 'hub-2',
  };

  const key = `${supplierId}::${destinationId}`;
  return routeMap[key] || null; // null = direct delivery
}
