import { NextApiRequest, NextApiResponse } from 'next';
import { requestLogger, ExtendedRequest } from '../middleware/requestLogger';
import { corsMiddleware } from '../middleware/cors';
import { errorHandler } from '../middleware/errorHandler';

export type ApiHandler = (
  req: ExtendedRequest,
  res: NextApiResponse
) => Promise<void> | void;

/**
 * Wraps an API route handler with middleware chain:
 * 1. Request Logger (adds requestId, startTime)
 * 2. CORS (allows cross-origin requests)
 * 3. Error Handler (catches and handles all errors)
 */
export function withMiddleware(handler: ApiHandler) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const extendedReq = req as ExtendedRequest;

    try {
      // Apply middlewares in sequence
      requestLogger(extendedReq, res);
      corsMiddleware(extendedReq, res);

      // Handle preflight CORS requests
      if (extendedReq.method === 'OPTIONS') {
        return res.status(200).end();
      }

      // Call handler
      return await handler(extendedReq, res);
    } catch (error) {
      // Error handler catches all exceptions
      const err = error instanceof Error ? error : new Error(String(error));
      errorHandler(err, extendedReq, res as any);
    }
  };
}
