// API Constants
export const DEFAULT_PORT = 3000;
export const DEFAULT_CORS_ORIGIN = ['http://localhost:3000', 'http://localhost:3001'];

// Database
export const SOFT_DELETE_COLUMN = 'is_deleted';

// User Roles
export const USER_ROLE = {
  ADMIN: 'admin',
  FREIGHTER: 'freighter',
  CARRIER: 'carrier',
  WAREHOUSE: 'warehouse',
  STORE: 'store',
  USER: 'user',
} as const;

// Location Types
export const LOCATION_TYPE = {
  SUPPLIER: 'supplier',
  HUB: 'hub',
  STORE: 'store',
} as const;

// Transport Plan Status
export const TRANSPORT_PLAN_STATUS = {
  CREATED: 'created',
  IN_TRANSIT: 'in_transit',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
} as const;

// API Error Codes
export const ERROR_CODES = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;
