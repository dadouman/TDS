# TDS Architecture Overview

**Full Architecture Documentation:** See [../planning-artifacts/architecture.md](../planning-artifacts/architecture.md)

## Technology Stack

### Frontend & Full-Stack
- **Framework:** Next.js 14+ (TypeScript)
  - SSR capability for SEO-critical pages
  - API routes for serverless functions
  - Hot reloading for development

### Backend Runtime
- **Runtime:** Node.js 18+ LTS
  - Mature ecosystem
  - Excellent TypeScript support
  - Native Fetch API and Stream API

### Database
- **Primary:** PostgreSQL 14+
  - Production-grade reliability
  - JSONB support for flexible schemas
  - Full-text search capabilities
  - Transactional support

### ORM & Schema Management
- **ORM:** Prisma 4+
  - Type-safe database queries
  - Auto-migrations
  - Prisma Studio for visual database management
  - Excellent TypeScript DX

## API Pattern

All API handlers follow this structure:

```typescript
import { withMiddleware, ApiHandler } from '@/utils/apiHandler';

const handler: ApiHandler = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  return res.status(200).json({ success: true, data: {} });
};

export default withMiddleware(handler);
```

## Middleware Chain

Request flow:
1. **Request Logger** - Adds `requestId`, logs method/path/query
2. **CORS Handler** - Allows cross-origin requests (permissive in dev)
3. **Error Handler** - Catches all errors, returns structured responses
4. **Handler Logic** - Route-specific business logic

## File Structure Conventions

- `/pages/api/` - Next.js API route handlers
- `/src/middleware/` - Request/response pipeline
- `/src/utils/` - Pure functions, helpers, constants
- `/src/types/` - TypeScript interfaces and type definitions
- `/__tests__/` - Test files (mirror source structure)

## Naming Conventions

- **Files:** kebab-case (e.g., `request-logger.ts`)
- **Functions:** camelCase (e.g., `withMiddleware()`)
- **Constants:** UPPER_SNAKE_CASE (e.g., `DEFAULT_PORT`)
- **Types/Interfaces:** PascalCase (e.g., `ApiHandler`)

## Security Baseline

- Environment variables from `.env.local` (never hardcoded)
- Passwords hashed with bcryptjs (implemented in future stories)
- JWT tokens for authentication (implemented in future stories)
- CORS permissive for local dev (tightened for production)
- No secrets in git history

## Database Schema

See `prisma/schema.prisma` for complete schema.

### Core Entities

- **User** - Authentication and authorization
- **Location** - Spatial reference (suppliers, hubs, stores)
- **TransportPlan** - Logistics and tracking

All entities support soft-delete via `is_deleted` flag for audit trails.

## Key Features by Epic

1. **E1 - Authentication** - User registration, login, JWT tokens
2. **E2 - Transport Plans** - CRUD operations for logistics plans
3. **E3 - Incident Detection** - Real-time notifications via SSE
4. **E4 - Carrier Trips** - Trip acceptance/refusal workflow
5. **E5 - Store Delivery** - Dashboard and real-time tracking
6. **E6 - CMR Management** - Warehouse form completion and PDF generation

---

For detailed architecture decisions, see [../planning-artifacts/architecture.md](../planning-artifacts/architecture.md)
