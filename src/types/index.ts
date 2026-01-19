// API Response type for standard API responses
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp?: string;
}

// Health check response
export interface HealthResponse {
  status: string;
  timestamp: string;
}

// User type from database
export interface User {
  id: string;
  email: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}

// Location type from database
export interface Location {
  id: string;
  name: string;
  type: 'supplier' | 'hub' | 'store';
  createdAt: Date;
  updatedAt: Date;
}

// TransportPlan type from database
export interface TransportPlan {
  id: string;
  supplierLocation: string;
  destinationStore: string;
  unitCount: number;
  plannedLoadingTime: Date;
  status: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}
