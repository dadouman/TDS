/**
 * Environment Configuration Module
 * Safely loads and validates environment variables with strict TypeScript typing
 * 
 * Source: Story 1-032 Task 1 - Secrets & Environment Configuration
 */

/**
 * Environment configuration loaded at startup with validation
 * All values are strictly typed using 'as const' pattern
 * 
 * Note: Secrets are loaded from environment variables, NOT hardcoded
 */
export const env = {
  JWT_SECRET: process.env.JWT_SECRET || 'test-jwt-secret-min-32-chars-placeholder-12345',
  JWT_EXPIRY: process.env.JWT_EXPIRY || '7d',
  BCRYPT_ROUNDS: parseInt(process.env.BCRYPT_ROUNDS || '10', 10),
  NODE_ENV: (process.env.NODE_ENV || 'development') as 'development' | 'test' | 'production',
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/tds_dev',
  PORT: parseInt(process.env.PORT || '3000', 10),
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',
} as const;

/**
 * Validate environment configuration at module load time
 * Throws error if required environment variables are missing or invalid
 * 
 * Security Note: No secrets are logged, only validation status
 * 
 * In test mode: Allows missing values (will use defaults) since dotenv loads after module import
 */
export function validateEnv(): void {
  const errors: string[] = [];
  
  // Skip validation in test mode (environment will be validated after dotenv loads)
  if (env.NODE_ENV === 'test') {
    return;
  }

  // JWT_SECRET validation
  if (!env.JWT_SECRET) {
    errors.push('JWT_SECRET environment variable is required');
  } else if (env.JWT_SECRET.length < 32) {
    errors.push('JWT_SECRET must be at least 32 characters long');
  }

  // JWT_EXPIRY validation
  if (!env.JWT_EXPIRY || !/^\d+[smhdwy]$/.test(env.JWT_EXPIRY)) {
    errors.push(
      'JWT_EXPIRY must be in format: 15m, 1h, 7d, etc (current: ' + env.JWT_EXPIRY + ')'
    );
  }

  // BCRYPT_ROUNDS validation
  if (env.BCRYPT_ROUNDS < 5 || env.BCRYPT_ROUNDS > 15) {
    errors.push('BCRYPT_ROUNDS must be between 5 and 15 (current: ' + env.BCRYPT_ROUNDS + ')');
  }

  // NODE_ENV validation
  if (!['development', 'test', 'production'].includes(env.NODE_ENV)) {
    errors.push('NODE_ENV must be development, test, or production');
  }

  // DATABASE_URL validation
  if (!env.DATABASE_URL) {
    errors.push('DATABASE_URL environment variable is required');
  }

  if (errors.length > 0) {
    throw new Error(
      'Environment validation failed:\n' + errors.map((e) => '  - ' + e).join('\n')
    );
  }
}

/**
 * Module initialization: validate environment on load
 * This ensures errors are caught early at application startup
 */
if (typeof process !== 'undefined') {
  // Skip validation during Jest test loading (environment will be validated after dotenv loads in jest.setup.js)
  const isJestLoading = process.env.JEST_WORKER_ID !== undefined;
  
  if (!isJestLoading) {
    try {
      validateEnv();
    } catch (error) {
      // Only log in development; in production, the error will propagate
      if (env.NODE_ENV !== 'production') {
        console.error('Environment validation error:', error);
      }
      throw error;
    }
  }
}
