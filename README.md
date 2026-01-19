# TDS - Transport Distribution System

**TDS** is a SaaS collaboration platform designed for efficient transport and distribution management across a network of Freighters, Carriers, Warehouses, and Stores.

## Quick Start

### Prerequisites
- Node.js 18+ LTS
- PostgreSQL 14+
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repo-url>
cd tds
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
```bash
cp .env.local.example .env.local
# Edit .env.local with your PostgreSQL connection string
```

4. Initialize the database:
```bash
npx prisma migrate dev --name init
```

5. Start the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to verify the app is running.

## Project Structure

```
/tds
  /pages
    /api          # API route handlers
      health.ts   # Health check endpoint
  /src
    /middleware   # Request/response pipeline
      cors.ts     # CORS configuration
      errorHandler.ts
      requestLogger.ts
    /utils
      apiHandler.ts
    /types        # TypeScript interfaces
  /prisma
    schema.prisma # Database schema
  /__tests__      # Test files
    /api
      health.test.ts
  /.env.local.example
  /README.md
  /ARCHITECTURE.md
```

## Database Setup

### Local Development Database

1. Create PostgreSQL database:
```bash
createdb tds_dev
```

2. Create `.env.local` with connection string:
```
DATABASE_URL="postgresql://user:password@localhost:5432/tds_dev"
```

3. Run migrations:
```bash
npx prisma migrate dev --name init
```

4. View database schema in Prisma Studio:
```bash
npx prisma studio
```

### Core Entities

- **User**: Account information, roles, audit trail
- **Location**: Warehouses, stores, suppliers (soft-delete enabled)
- **TransportPlan**: Transport logistics and tracking

All entities include `created_at`, `updated_at`, and `is_deleted` for audit trail support.

## API Structure

### Base Endpoint
```
http://localhost:3000/api
```

### Available Routes

- **GET `/api/health`** - Health check endpoint
  - Response: `{ status: "ok", timestamp: "2026-01-17T..." }`

### Response Format
All API responses follow this structure:
```typescript
{
  success: boolean;
  data?: any;
  error?: string;
}
```

## Testing

### Run Tests
```bash
npm test
```

### Watch Mode
```bash
npm run test:watch
```

### Coverage Report
```bash
npm run test:coverage
```

## Building for Production

1. Build the application:
```bash
npm run build
```

2. Start production server:
```bash
npm start
```

## Troubleshooting

### Database Connection Issues
- Verify PostgreSQL is running: `pg_isready`
- Check `.env.local` has correct `DATABASE_URL`
- View current connection: `psql -c "SELECT current_database();"`

### Port Already in Use
Default port is 3000. To use a different port:
```bash
PORT=3001 npm run dev
```

### Prisma Errors
- Ensure database exists: `createdb tds_dev`
- Reset migrations: `npx prisma migrate reset` (dev only, deletes data)

## Contributing

Please follow the [Contributing Guidelines](CONTRIBUTING.md) for code style and testing requirements.

## License

Proprietary - TDS Project
