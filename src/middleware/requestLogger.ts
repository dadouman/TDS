import { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';

export interface ExtendedRequest extends NextApiRequest {
  requestId?: string;
  startTime?: number;
}

export function requestLogger(req: ExtendedRequest, res: NextApiResponse) {
  // Generate unique request ID
  req.requestId = crypto.randomUUID();
  req.startTime = Date.now();

  // Log incoming request
  const size = JSON.stringify(req.body || {}).length;
  console.log({
    timestamp: new Date().toISOString(),
    requestId: req.requestId,
    method: req.method,
    path: req.url,
    query: req.query,
    size: `${size}B`,
  });

  // Log response on finish
  const originalJson = res.json;
  res.json = function (body: any) {
    const duration = Date.now() - (req.startTime || 0);
    console.log({
      timestamp: new Date().toISOString(),
      requestId: req.requestId,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
    });
    return originalJson.call(this, body);
  };
}
