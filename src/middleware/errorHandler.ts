import { NextApiRequest, NextApiResponse } from 'next';

type ErrorResponse = {
  error: string;
  statusCode: number;
  timestamp: string;
  requestId?: string;
};

export interface ExtendedResponse extends NextApiResponse {
  errorHandler?: (error: Error) => void;
}

export function errorHandler(
  error: Error,
  req: NextApiRequest,
  res: ExtendedResponse
) {
  const requestId = (req as any).requestId || 'unknown';

  // Log error with stack trace
  console.error({
    timestamp: new Date().toISOString(),
    requestId,
    error: error.message,
    stack: error.stack,
  });

  // Default to 500 Internal Server Error
  const statusCode = (error as any).statusCode || 500;
  const message = error.message || 'Internal Server Error';

  return res.status(statusCode).json({
    error: message,
    statusCode,
    timestamp: new Date().toISOString(),
    requestId,
  });
}
