import { NextApiRequest, NextApiResponse } from 'next';

export function corsMiddleware(req: NextApiRequest, res: NextApiResponse) {
  // Allow all origins for local dev
  res.setHeader('Access-Control-Allow-Origin', '*');

  // Allow multiple HTTP methods
  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, DELETE, PATCH, OPTIONS'
  );

  // Allow headers
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Requested-With'
  );

  // Allow credentials
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
}
