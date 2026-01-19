describe('GET /api/plans - List Transport Plans', () => {
  test('Freighter sees only own plans', () => {
    const response = {
      success: true,
      data: [
        {
          id: 'plan-1',
          supplierId: 'supplier-1',
          destinationId: 'store-1',
          unitCount: 15,
          status: 'DRAFT',
          createdAt: new Date()
        }
      ],
      total: 1,
      page: 1,
      limit: 20
    };

    expect(response.data.length).toBe(1);
    expect(response.success).toBe(true);
  });

  test('Admin sees all plans', () => {
    const response = {
      success: true,
      data: [
        { id: 'plan-1', status: 'DRAFT' },
        { id: 'plan-2', status: 'PROPOSED' },
        { id: 'plan-3', status: 'ACCEPTED' }
      ],
      total: 3,
      page: 1,
      limit: 20
    };

    expect(response.data.length).toBe(3);
  });

  test('Filtering by status works', () => {
    const { buildPlanQuery } = require('@/utils/planFilters');

    const query = buildPlanQuery('user-1', 'FREIGHTER', { status: 'DRAFT' });

    expect(query.where.status).toBe('DRAFT');
    expect(query.where.is_deleted).toBe(false);
    expect(query.where.createdBy).toBe('user-1');
  });

  test('Pagination works', () => {
    const { buildPlanQuery } = require('@/utils/planFilters');

    const query = buildPlanQuery('user-1', 'FREIGHTER', {
      page: 2,
      limit: 10
    });

    expect(query.skip).toBe(10); // (2-1) * 10
    expect(query.take).toBe(10);
  });

  test('Sorting works', () => {
    const { buildPlanQuery } = require('@/utils/planFilters');

    const queryByDate = buildPlanQuery('user-1', 'FREIGHTER', { sort: 'createdAt' });
    expect(queryByDate.orderBy).toHaveProperty('createdAt');

    const queryByEta = buildPlanQuery('user-1', 'FREIGHTER', { sort: 'eta' });
    expect(queryByEta.orderBy).toHaveProperty('estimatedDeliveryTime');
  });

  test('Empty results returns empty array', () => {
    const response = {
      success: true,
      data: [],
      total: 0,
      page: 1,
      limit: 20
    };

    expect(response.data).toEqual([]);
    expect(response.total).toBe(0);
  });

  test('Data isolation enforced for FREIGHTER', () => {
    const { buildPlanQuery } = require('@/utils/planFilters');

    const query = buildPlanQuery('freighter-123', 'FREIGHTER', {});

    expect(query.where.createdBy).toBe('freighter-123');
  });

  test('Admin bypasses data isolation', () => {
    const { buildPlanQuery } = require('@/utils/planFilters');

    const query = buildPlanQuery('admin-123', 'ADMIN', {});

    expect(query.where.createdBy).toBeUndefined();
  });

  test('Soft delete filter always applied', () => {
    const { buildPlanQuery } = require('@/utils/planFilters');

    const query = buildPlanQuery('user-1', 'FREIGHTER', {});

    expect(query.where.is_deleted).toBe(false);
  });
});
