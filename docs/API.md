# TDS API Documentation

## Authentication & User Management

### POST /api/auth/register

Register a new user account on the TDS platform.

**Public Endpoint** - No authentication required (for new user registration)

#### Request

```json
{
  "email": "john.doe@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe",
  "role": "freighter"
}
```

**Fields:**

- `email` (string, required) - User's email address
  - Must be valid email format (RFC 5322 simplified)
  - Stored as lowercase to prevent duplicates
  - Must be unique in database
  
- `password` (string, required) - User's password
  - Minimum 8 characters
  - Maximum 128 characters
  - Must contain: uppercase letter, lowercase letter, digit, special character (!@#$%^&*)
  - Cannot be common password (password, 123456, qwerty, etc.)
  - Hashed with bcryptjs before storage (never stored plaintext)
  
- `firstName` (string, required) - User's first name
  - Whitespace trimmed before storage
  
- `lastName` (string, required) - User's last name
  - Whitespace trimmed before storage
  
- `role` (string, required) - User's role on the TDS platform
  - Must be one of: `freighter`, `carrier`, `warehouse`, `store`
  - Case-insensitive (normalized to lowercase)
  - Controls access permissions via Role-Based Access Control (RBAC)

#### Success Response

**Status Code:** 201 Created

```json
{
  "success": true,
  "userId": "clh4mf8q60000ps2h7q0q0q0q",
  "email": "john.doe@example.com",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": "7d"
}
```

**Response Fields:**

- `success` (boolean) - Always `true` on success
- `userId` (string) - Unique identifier for the created user
- `email` (string) - User's email (normalized to lowercase)
- `token` (string) - JWT authentication token valid for 7 days
  - Automatically sent as secure HttpOnly cookie
  - Can also be used as Bearer token in Authorization header
- `expiresIn` (string) - Token expiration period

#### Error Responses

**400 Bad Request** - Validation failed

```json
{
  "error": "Validation failed",
  "details": [
    "email must be valid format",
    "Password must be at least 8 characters",
    "Password must contain uppercase letter",
    "Password must contain digit",
    "Password must contain special character"
  ]
}
```

**409 Conflict** - Email already registered

```json
{
  "error": "Email already registered"
}
```

**500 Internal Server Error** - Unexpected server error

```json
{
  "error": "Internal server error"
}
```

#### Security Notes

1. **Password Security**
   - Passwords are never logged or returned in responses
   - Hashed with bcryptjs (BCRYPT_ROUNDS rounds from environment)
   - Compared using timing-safe algorithm to prevent timing attacks
   
2. **Email Validation**
   - Email addresses are normalized to lowercase
   - Case-insensitive duplicate check at database level
   - Prevents user enumeration via case variations
   
3. **JWT Token**
   - Token contains: `userId`, `email`, `role`
   - Signed with `JWT_SECRET` from environment
   - Expires after `JWT_EXPIRY` time period (default: 7 days)
   - Set as HttpOnly cookie (prevents XSS access)
   - Secure flag set in production (HTTPS only)
   
4. **Role-Based Access Control**
   - User's role is encoded in JWT token
   - Used for authorization checks on protected endpoints
   - Available roles: `freighter`, `carrier`, `warehouse`, `store`, `admin`
   
5. **Database**
   - Soft delete flag (`is_deleted`) for audit trail
   - Only non-deleted users are returned in queries
   - Timestamps (`createdAt`, `updatedAt`) track account lifecycle
   - Unique index on email column (lowercased)

#### Example Usage

**cURL:**
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "SecurePass123!",
    "firstName": "John",
    "lastName": "Doe",
    "role": "freighter"
  }'
```

**JavaScript (Fetch):**
```javascript
const response = await fetch('/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'john@example.com',
    password: 'SecurePass123!',
    firstName: 'John',
    lastName: 'Doe',
    role: 'freighter'
  }),
  credentials: 'include'  // Include cookies
});

const data = await response.json();
if (data.success) {
  console.log('Registration successful!', data.userId);
} else {
  console.error('Registration failed:', data.details);
}
```

---

### GET /api/user/profile

Retrieve the authenticated user's profile information.

**Protected Endpoint** - Requires valid JWT token

#### Authentication

Token can be provided in two ways:

1. **HttpOnly Cookie** (Preferred for web browsers)
   - Token automatically sent with requests
   - Set after successful registration
   
2. **Authorization Header** (For API clients)
   ```
   Authorization: Bearer <jwt_token>
   ```

#### Success Response

**Status Code:** 200 OK

```json
{
  "userId": "clh4mf8q60000ps2h7q0q0q0q",
  "email": "john@example.com",
  "role": "freighter"
}
```

#### Error Responses

**401 Unauthorized** - Invalid or missing token

```json
{
  "error": "Unauthorized - Invalid or missing token"
}
```

Possible causes:
- No token provided in cookie or Authorization header
- Token has expired
- Token signature is invalid
- Token is malformed

**405 Method Not Allowed** - Request method not supported

```json
{
  "error": "Method not allowed"
}
```

#### Example Usage

**JavaScript (after registration):**
```javascript
// Token automatically sent in cookie
const response = await fetch('/api/user/profile', {
  method: 'GET',
  credentials: 'include'  // Include cookies
});

const profile = await response.json();
if (response.ok) {
  console.log('User profile:', profile);
} else {
  console.error('Failed to fetch profile:', profile.error);
}
```

**Or with Authorization header:**
```javascript
const response = await fetch('/api/user/profile', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

---

## Transport Plan Management

### POST /api/plans

Create a new transport plan with automatic carrier proposals.

**Authorization:** FREIGHTER, ADMIN (requires valid JWT token with appropriate role)

#### Request

```json
{
  "supplierLocationId": "clh4mf8q60000ps2h7q0q0q0q",
  "destinationStoreId": "clh4mf8q60001ps2h7q0q0q0q",
  "unitCount": 15,
  "plannedLoadingTime": "2026-01-20T08:00:00Z",
  "notes": "Standard delivery for Q1 stock"
}
```

**Fields:**

- `supplierLocationId` (string, UUID, required) - Source supplier location
  - Must exist in locations table with type = SUPPLIER
  - Must be active (is_deleted = false)
  - Cannot be same as destination
  
- `destinationStoreId` (string, UUID, required) - Target store location
  - Must exist in locations table with type = STORE
  - Must be active (is_deleted = false)
  - Cannot be same as supplier
  
- `unitCount` (integer, required) - Number of units to transport
  - Must be between 1 and 1000 units
  - Integer value only (no decimals)
  
- `plannedLoadingTime` (ISO 8601 datetime, required) - When loading starts at supplier
  - Must be in future (> current time)
  - Validates delivery window ≤ 40 hours per regulatory requirement
  
- `notes` (string, optional) - Additional instructions or metadata
  - Maximum 500 characters
  - Searchable for filtering and reference

#### Success Response

**Status Code:** 201 Created

```json
{
  "success": true,
  "planId": "clh4mf8q60002ps2h7q0q0q0q",
  "proposedCarriers": [
    {
      "carrierId": "carrier-1",
      "carrierName": "FastExpress",
      "capacity": 20,
      "costPerUnit": 50,
      "totalCost": 750,
      "estimatedETA": "2026-01-20T20:00:00Z"
    },
    {
      "carrierId": "carrier-2",
      "carrierName": "EcoTransport",
      "capacity": 30,
      "costPerUnit": 40,
      "totalCost": 600,
      "estimatedETA": "2026-01-20T22:00:00Z"
    },
    {
      "carrierId": "carrier-3",
      "carrierName": "StandardFreight",
      "capacity": 50,
      "costPerUnit": 35,
      "totalCost": 525,
      "estimatedETA": "2026-01-21T00:00:00Z"
    }
  ],
  "estimatedCost": 525,
  "estimatedETA": "2026-01-21T00:00:00Z"
}
```

**Response Fields:**

- `success` (boolean) - Always `true` on success
- `planId` (string) - Unique identifier for created plan
- `proposedCarriers` (array) - Up to 3 carrier options sorted by cost/availability
  - `carrierId` - Unique carrier identifier
  - `carrierName` - Human-readable carrier name
  - `capacity` - Maximum units carrier can transport
  - `costPerUnit` - Cost per unit for this carrier
  - `totalCost` - Total cost for requested unit count
  - `estimatedETA` - Estimated delivery time to destination store
- `estimatedCost` (number) - Cheapest option cost in currency units
- `estimatedETA` (ISO 8601 string) - Quickest delivery time

#### Error Responses

**400 Bad Request** - Validation failed

```json
{
  "error": "Validation failed",
  "details": [
    "supplierLocationId is required",
    "unitCount must be 1-1000",
    "plannedLoadingTime is required"
  ]
}
```

```json
{
  "error": "Loading time must be in future"
}
```

```json
{
  "error": "Delivery window exceeds 40 hours"
}
```

```json
{
  "error": "Supplier and destination must be different"
}
```

**401 Unauthorized** - Missing or invalid authentication

```json
{
  "error": "Unauthorized: Missing or invalid authentication token"
}
```

**403 Forbidden** - Insufficient permissions

```json
{
  "error": "Forbidden: This action requires FREIGHTER or ADMIN role"
}
```

**404 Not Found** - Location not found

```json
{
  "error": "SUPPLIER location not found"
}
```

```json
{
  "error": "STORE location not found"
}
```

**500 Internal Server Error** - Unexpected server error

```json
{
  "error": "Internal server error"
}
```

#### Plan States

After creation, a plan moves through these states:

- **DRAFT** - Initial state, can be modified before proposal
- **PROPOSED** - Carrier selected and confirmed
- **ACCEPTED** - Carrier accepted the proposal
- **IN_TRANSIT** - Transport in progress
- **DELIVERED** - Successfully delivered to destination
- **CANCELLED** - Plan cancelled, no transport occurred

#### Example Request (JavaScript/Node.js)

```javascript
const token = localStorage.getItem('authToken');

const response = await fetch('/api/plans', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    supplierLocationId: 'supplier-uuid',
    destinationStoreId: 'store-uuid',
    unitCount: 20,
    plannedLoadingTime: '2026-01-22T10:00:00Z',
    notes: 'Fragile items - handle with care'
  })
});

if (response.ok) {
  const { planId, proposedCarriers, estimatedCost } = await response.json();
  console.log(`Plan created: ${planId} - Cheapest option: €${estimatedCost}`);
} else {
  const { error, details } = await response.json();
  console.error(`Error: ${error}`, details);
}
```

---

## GET /api/plans

List all transport plans with filtering and pagination.

**Authorization:** FREIGHTER, ADMIN

#### Query Parameters

- `status` (optional) - Filter: DRAFT, PROPOSED, ACCEPTED, IN_TRANSIT, DELIVERED, CANCELLED
- `sort` (optional, default: "createdAt") - Sort: createdAt, createdAt-asc, status, eta, unitCount
- `page` (optional, default: 1) - Page number
- `limit` (optional, default: 20) - Results per page (max 100)

#### Success Response (200 OK)

```json
{
  "success": true,
  "data": [
    {
      "id": "plan-uuid",
      "supplierId": "supplier-uuid",
      "destinationId": "store-uuid",
      "unitCount": 20,
      "status": "DRAFT",
      "createdAt": "2026-01-17T14:30:00Z",
      "estimatedDeliveryTime": "2026-01-21T00:00:00Z",
      "supplier": { "id": "...", "name": "Supplier A", "type": "SUPPLIER" },
      "destination": { "id": "...", "name": "Store B", "type": "STORE" }
    }
  ],
  "total": 42,
  "page": 1,
  "limit": 20
}
```

#### Error Responses

- **401 Unauthorized** - Invalid token
- **403 Forbidden** - Insufficient role
- **500 Internal Error** - Server error

#### Example

```javascript
const response = await fetch('/api/plans?status=DRAFT&sort=createdAt', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const { data, total } = await response.json();
```

---

## GET /api/plans/{planId}

Get detailed information about a specific transport plan.

**Authorization:** FREIGHTER, ADMIN - FREIGHTER sees only own plans, ADMIN sees all

#### URL Parameters

- `planId` (string, required) - UUID of transport plan

#### Success Response (200 OK)

```json
{
  "success": true,
  "data": {
    "id": "clh4mf8q60002ps2h7q0q0q0q",
    "supplier": {
      "id": "supplier-uuid",
      "name": "Supplier A",
      "type": "SUPPLIER",
      "address": "123 Main St, City",
      "coordinates": {
        "latitude": 48.8566,
        "longitude": 2.3522
      }
    },
    "destination": {
      "id": "store-uuid",
      "name": "Store B",
      "type": "STORE",
      "address": "456 Oak Ave, City",
      "coordinates": {
        "latitude": 48.9566,
        "longitude": 2.4522
      }
    },
    "hub": {
      "id": "hub-uuid",
      "name": "Central Hub",
      "type": "HUB",
      "address": "789 Hub Rd"
    },
    "journey": {
      "plannedLoadingTime": "2026-01-20T08:00:00Z",
      "estimatedHubTime": "2026-01-20T10:00:00Z",
      "estimatedDeliveryTime": "2026-01-21T00:00:00Z",
      "timeline": {
        "stages": [
          {
            "stage": "LOADING",
            "description": "Pickup and loading at supplier",
            "startTime": "2026-01-20T07:00:00Z",
            "endTime": "2026-01-20T09:00:00Z",
            "durationMinutes": 120,
            "status": "upcoming"
          },
          {
            "stage": "HUB_PROCESSING",
            "description": "Processing at hub facility",
            "startTime": "2026-01-20T08:00:00Z",
            "endTime": "2026-01-20T10:00:00Z",
            "durationMinutes": 120,
            "status": "upcoming"
          },
          {
            "stage": "IN_TRANSIT",
            "description": "Transportation to destination store",
            "startTime": "2026-01-20T10:00:00Z",
            "endTime": "2026-01-21T00:00:00Z",
            "durationMinutes": 600,
            "status": "upcoming"
          },
          {
            "stage": "DELIVERY",
            "description": "Unloading at destination store",
            "startTime": "2026-01-20T23:30:00Z",
            "endTime": "2026-01-21T00:30:00Z",
            "durationMinutes": 60,
            "status": "upcoming"
          }
        ],
        "totalDurationMinutes": 900,
        "startTime": "2026-01-20T07:00:00Z",
        "endTime": "2026-01-21T00:30:00Z"
      }
    },
    "shipment": {
      "unitCount": 20,
      "notes": "Fragile goods - handle with care"
    },
    "costs": {
      "baseCarrierCost": 900,
      "hubFee": 500,
      "subtotal": 1400,
      "tax": 280,
      "total": 1680
    },
    "status": "DRAFT",
    "createdBy": {
      "id": "user-uuid",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@company.com"
    },
    "createdAt": "2026-01-17T14:30:00Z",
    "updatedAt": "2026-01-17T14:30:00Z"
  }
}
```

#### Error Responses

**400 Bad Request** - Invalid plan ID

```json
{
  "error": "Invalid plan ID"
}
```

**403 Forbidden** - Unauthorized access

```json
{
  "error": "Unauthorized: Cannot view this plan"
}
```

**404 Not Found** - Plan doesn't exist

```json
{
  "error": "Plan not found"
}
```

**405 Method Not Allowed**

```json
{
  "error": "Method not allowed"
}
```

#### Example Request

```javascript
const planId = 'clh4mf8q60002ps2h7q0q0q0q';

const response = await fetch(`/api/plans/${planId}`, {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const { data } = await response.json();
console.log(`Plan status: ${data.status}`);
console.log(`Total cost: €${data.costs.total}`);
console.log(`Delivery: ${data.journey.estimatedDeliveryTime}`);
```



---

### PATCH /api/plans/{id}

Modify an existing transport plan before acceptance. Implements optimistic locking to prevent concurrent modification conflicts.

**Requires Authentication** - Freighter (owner) or Admin role

#### Request

```json
{
  "unitCount": 75,
  "plannedLoadingTime": "2026-01-20T12:00:00Z",
  "destinationStoreId": "store-uuid-456",
  "notes": "Updated special handling instructions",
  "version": 1
}
```

**Fields:**

- `unitCount` (integer, optional) - Number of units to transport
  - Must be between 1 and 1000 units
  - Triggers carrier re-proposal if changed
  - Cannot be modified in ACCEPTED/IN_TRANSIT/DELIVERED status
  
- `plannedLoadingTime` (ISO 8601 datetime, optional) - Planned loading start time
  - Must be in future
  - Must allow 40-hour delivery window
  - Triggers carrier re-proposal if changed
  - Cannot be modified in ACCEPTED/IN_TRANSIT/DELIVERED status
  
- `destinationStoreId` (string UUID, optional) - New destination store ID
  - Must be valid store location
  - Triggers carrier re-proposal if changed
  - Cannot be modified in ACCEPTED/IN_TRANSIT/DELIVERED status
  
- `notes` (string, optional) - Special handling instructions
  - Maximum 500 characters
  - Can always be modified (no status restrictions)
  
- `version` (integer, required) - Current plan version
  - Used for optimistic locking
  - Must match plan's current version in database
  - Returned as 409 Conflict if mismatch detected
  - Automatically incremented on successful update

**Status Constraints:**

- Can only modify plans in `DRAFT` or `PROPOSED` status
- Terminal statuses prevent modifications: `ACCEPTED`, `IN_TRANSIT`, `DELIVERED`, `CANCELLED`
- Returns 400 Bad Request if attempting to modify terminal status plan

**Re-Proposal Logic:**

When `unitCount`, `plannedLoadingTime`, or `destinationStoreId` are modified:
- System automatically re-proposes carriers with new pricing
- Top 3 carrier proposals returned in response
- Plan status remains `DRAFT` until new carrier selected

#### Success Response

**Status Code:** 200 OK

```json
{
  "success": true,
  "data": {
    "id": "plan-uuid",
    "supplier": {
      "id": "supplier-uuid",
      "name": "Central Warehouse",
      "type": "SUPPLIER",
      "address": "123 Industrial St, Berlin",
      "coordinates": {
        "latitude": 52.52,
        "longitude": 13.405
      }
    },
    "destination": {
      "id": "store-uuid-456",
      "name": "Berlin Store",
      "type": "STORE",
      "address": "456 Main St, Berlin",
      "coordinates": {
        "latitude": 52.50,
        "longitude": 13.40
      }
    },
    "hub": {
      "id": "hub-uuid",
      "name": "Leipzig Distribution Hub",
      "type": "HUB",
      "address": "789 Logistics Pkwy, Leipzig"
    },
    "journey": {
      "plannedLoadingTime": "2026-01-20T12:00:00Z",
      "estimatedHubTime": "2026-01-20T16:00:00Z",
      "estimatedDeliveryTime": "2026-01-21T01:00:00Z",
      "timeline": [
        {
          "stage": "LOADING",
          "location": "Central Warehouse",
          "startTime": "2026-01-20T12:00:00Z",
          "endTime": "2026-01-20T13:00:00Z",
          "durationMinutes": 60,
          "status": "upcoming"
        },
        {
          "stage": "HUB_PROCESSING",
          "location": "Leipzig Distribution Hub",
          "startTime": "2026-01-20T16:00:00Z",
          "endTime": "2026-01-20T18:00:00Z",
          "durationMinutes": 120,
          "status": "upcoming"
        },
        {
          "stage": "IN_TRANSIT",
          "location": "Berlin Store",
          "startTime": "2026-01-20T18:00:00Z",
          "endTime": "2026-01-21T00:00:00Z",
          "durationMinutes": 240,
          "status": "upcoming"
        },
        {
          "stage": "DELIVERY",
          "location": "Berlin Store",
          "startTime": "2026-01-21T00:00:00Z",
          "endTime": "2026-01-21T01:00:00Z",
          "durationMinutes": 60,
          "status": "upcoming"
        }
      ]
    },
    "shipment": {
      "unitCount": 75,
      "notes": "Updated special handling instructions"
    },
    "costs": {
      "baseCarrierCost": 3375,
      "hubFee": 225,
      "subtotal": 3600,
      "tax": 720,
      "total": 4320
    },
    "status": "DRAFT",
    "version": 2,
    "changedFields": ["unitCount", "notes"],
    "proposedCarriers": [
      {
        "carrierId": "carrier-1",
        "name": "FastExpress Logistics",
        "rate": 45
      },
      {
        "carrierId": "carrier-2",
        "name": "EuroTransit",
        "rate": 50
      },
      {
        "carrierId": "carrier-3",
        "name": "Continental Carriers",
        "rate": 55
      }
    ],
    "createdBy": {
      "id": "user-uuid",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@company.com"
    },
    "createdAt": "2026-01-17T14:30:00Z",
    "updatedAt": "2026-01-20T10:15:00Z"
  }
}
```

**Response Fields:**

- `version` (integer) - New plan version (incremented from request)
- `changedFields` (array of strings) - Fields that were modified
- `proposedCarriers` (array, optional) - New carrier proposals if modification triggered re-proposal
  - Only included if `unitCount`, `plannedLoadingTime`, or `destinationStoreId` changed
  - Contains top 3 carrier options by rating

#### Error Responses

**400 Bad Request** - Validation or status error

```json
{
  "error": "Cannot modify plan in ACCEPTED status"
}
```

Or with detailed validation errors:

```json
{
  "error": "Validation failed",
  "details": [
    "unitCount: Exceeds maximum capacity of 1000 units",
    "plannedLoadingTime: Does not allow 40-hour delivery window"
  ]
}
```

**403 Forbidden** - Unauthorized modification

```json
{
  "error": "Unauthorized: Cannot modify this plan"
}
```

*User must be the plan owner (Freighter who created it) or an Admin to modify plans.*

**404 Not Found** - Plan doesn't exist

```json
{
  "error": "Plan not found"
}
```

**409 Conflict** - Version mismatch (concurrent modification)

```json
{
  "error": "Conflict: Plan was modified by another user. Please refresh and try again.",
  "details": ["Version mismatch"]
}
```

*This error indicates the plan was modified by another user while you were editing. Retrieve the latest plan version and retry.*

**405 Method Not Allowed**

```json
{
  "error": "Method not allowed"
}
```

#### Example Usage

**JavaScript (Fetch):**
```javascript
const planId = 'clh4mf8q60002ps2h7q0q0q0q';
const currentVersion = 1;

const response = await fetch(`/api/plans/${planId}`, {
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    unitCount: 75,
    notes: "Updated instructions",
    version: currentVersion
  })
});

if (response.status === 409) {
  console.error('Plan was modified by another user - refresh and retry');
  return;
}

const { data } = await response.json();
console.log(`Plan updated to version ${data.version}`);
console.log(`Changed fields: ${data.changedFields.join(', ')}`);
```

**cURL:**
```bash
curl -X PATCH http://localhost:3000/api/plans/clh4mf8q60002ps2h7q0q0q0q \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "unitCount": 75,
    "notes": "Updated special handling",
    "version": 1
  }'
```

#### Concurrency & Optimistic Locking

This endpoint uses **optimistic locking** to prevent concurrent modification conflicts:

1. **Retrieve Plan** - Get current `version` (returned in GET response)
2. **Make Changes** - Submit modification with current `version`
3. **Database Check** - If `version` matches, update succeeds and version increments
4. **Conflict Detection** - If `version` doesn't match, returns 409 Conflict
5. **Retry Strategy** - Retrieve fresh plan, merge changes, resubmit with new version

This pattern allows high-concurrency without blocking locks, ideal for distributed teams.

---

## Transport Plan Incidents

### GET /api/incidents

List incidents related to transport plans. Incidents include refusals, delays, and imbalances detected during transport execution.

**Requires Authentication** - Freighter (own plans only) or Admin role

#### Request

Query parameters:

- `planId` (string UUID, optional) - Filter incidents for specific plan
  - If omitted and user is Freighter, shows incidents for all own plans
  - If omitted and user is Admin, shows all incidents
  
- `type` (string, optional) - Filter by incident type
  - Valid values: `REFUSAL`, `DELAY`, `IMBALANCE`
  - REFUSAL: Carrier refused to accept transport
  - DELAY: Plan running more than 30 minutes late
  - IMBALANCE: Actual units differ from planned units
  
- `status` (string, optional) - Filter by resolution status
  - Valid values: `OPEN`, `RESOLVED`, `ESCALATED`
  - OPEN: Incident reported, awaiting action
  - RESOLVED: Issue addressed or accepted
  - ESCALATED: Issue requires management escalation
  
- `from` (ISO 8601 datetime, optional) - Start of date range filter
  - Incidents created on or after this timestamp
  
- `to` (ISO 8601 datetime, optional) - End of date range filter
  - Incidents created on or before this timestamp
  
- `page` (integer, optional, default: 1) - Page number for pagination
  - Minimum: 1
  
- `limit` (integer, optional, default: 20) - Results per page
  - Minimum: 1, Maximum: 100

#### Success Response

**Status Code:** 200 OK

```json
{
  "success": true,
  "data": {
    "incidents": [
      {
        "id": "incident-uuid-1",
        "type": "DELAY",
        "status": "OPEN",
        "planId": "plan-uuid",
        "carrierId": "carrier-uuid",
        "warehouseId": null,
        "description": "Plan delayed by 45 minutes. Expected: 2026-01-20T15:00:00Z, Actual: 2026-01-20T15:45:00Z",
        "createdAt": "2026-01-20T15:50:00Z",
        "resolvedAt": null,
        "plan": {
          "id": "plan-uuid",
          "status": "IN_TRANSIT",
          "unitCount": 50,
          "createdBy": {
            "id": "user-uuid",
            "firstName": "John",
            "lastName": "Doe",
            "email": "john@company.com"
          }
        }
      },
      {
        "id": "incident-uuid-2",
        "type": "IMBALANCE",
        "status": "RESOLVED",
        "planId": "plan-uuid-2",
        "carrierId": null,
        "warehouseId": "warehouse-uuid",
        "description": "Unit count mismatch. Planned: 100, Actual: 95, Difference: 5",
        "createdAt": "2026-01-20T12:00:00Z",
        "resolvedAt": "2026-01-20T13:30:00Z",
        "plan": {
          "id": "plan-uuid-2",
          "status": "DELIVERED",
          "unitCount": 100,
          "createdBy": {
            "id": "user-uuid",
            "firstName": "Jane",
            "lastName": "Smith",
            "email": "jane@company.com"
          }
        }
      },
      {
        "id": "incident-uuid-3",
        "type": "REFUSAL",
        "status": "ESCALATED",
        "planId": "plan-uuid-3",
        "carrierId": "carrier-uuid-2",
        "warehouseId": null,
        "description": "Carrier refused transport: Vehicle breakdown",
        "createdAt": "2026-01-20T08:00:00Z",
        "resolvedAt": null,
        "plan": {
          "id": "plan-uuid-3",
          "status": "DRAFT",
          "unitCount": 75,
          "createdBy": {
            "id": "user-uuid",
            "firstName": "John",
            "lastName": "Doe",
            "email": "john@company.com"
          }
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 3,
      "totalPages": 1
    }
  }
}
```

**Response Fields:**

- `incidents` (array) - List of incidents matching filter criteria
  - `id` - Unique incident identifier
  - `type` - IncidentType enum value (REFUSAL, DELAY, IMBALANCE)
  - `status` - IncidentStatus enum value (OPEN, RESOLVED, ESCALATED)
  - `planId` - UUID of related transport plan
  - `carrierId` - UUID of involved carrier (for REFUSAL incidents, null for others)
  - `warehouseId` - UUID of involved warehouse (for IMBALANCE incidents, null for others)
  - `description` - Detailed incident description with context
  - `createdAt` - Timestamp when incident was detected
  - `resolvedAt` - Timestamp when resolved (null if OPEN or ESCALATED)
  - `plan` - Related plan context including status and creator
  
- `pagination` - Pagination metadata
  - `page` - Current page number
  - `limit` - Results per page
  - `total` - Total incidents matching filter
  - `totalPages` - Total pages available

#### Incident Types

**REFUSAL** - Carrier refused to accept/execute transport
- Triggered when carrier declines assigned trip
- Indicates need for alternative carrier proposal
- Context: `carrierId` identifies refusing carrier

**DELAY** - Plan execution running late (>30 minutes threshold)
- Triggered by SSE updates from carrier tracking
- Description includes expected vs actual times
- Context: Duration and timing information in description

**IMBALANCE** - Actual units differ from planned units
- Triggered during CMR form submission at warehouse/store
- Description includes planned, actual, and difference count
- Context: `warehouseId` identifies detection location

#### Error Responses

**400 Bad Request** - Invalid filter parameters

```json
{
  "error": "Invalid incident type",
  "details": ["Must be one of: REFUSAL, DELAY, IMBALANCE"]
}
```

**403 Forbidden** - Unauthorized access

```json
{
  "error": "Unauthorized: Cannot view incidents for this plan"
}
```

*Freighter can only view incidents for own plans. Use ADMIN role for cross-plan access.*

**404 Not Found** - Plan doesn't exist

```json
{
  "error": "Plan not found"
}
```

**405 Method Not Allowed**

```json
{
  "error": "Method not allowed"
}
```

#### Example Usage

**JavaScript (Fetch):**
```javascript
// Get all incidents for a specific plan
const planId = 'clh4mf8q60002ps2h7q0q0q0q';

const response = await fetch(
  `/api/incidents?planId=${planId}&page=1&limit=20`,
  {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  }
);

const { data } = await response.json();
console.log(`Found ${data.incidents.length} incidents`);
data.incidents.forEach(incident => {
  console.log(`[${incident.type}] ${incident.description}`);
});
```

**Get incidents by type:**
```javascript
// Filter to show only delay incidents in the past week
const oneWeekAgo = new Date();
oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

const response = await fetch(
  `/api/incidents?type=DELAY&from=${oneWeekAgo.toISOString()}&limit=50`,
  {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  }
);

const { data } = await response.json();
console.log(`Recent delays: ${data.pagination.total}`);
```

**cURL:**
```bash
# Get all REFUSAL incidents (admin only, or own plans)
curl -X GET "http://localhost:3000/api/incidents?type=REFUSAL&status=OPEN" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Paginate through large result sets
curl -X GET "http://localhost:3000/api/incidents?page=2&limit=50" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

#### Data Isolation & RBAC

- **Freighter Role**: Can only view incidents for transport plans they created
  - Query without `planId` → returns incidents for all own plans
  - Query with `planId` not owned → returns 403 Forbidden
  
- **Admin Role**: Can view all incidents across all plans
  - Query without filters → returns all incidents in system
  - Enables monitoring and escalation workflows

---

## Error Handling Best Practices

All API endpoints follow consistent error handling:

1. **Validation Errors (400)**
   - Include detailed field-level errors in `details` array
   - Each error message explains the specific rule violated
   
2. **Authentication Errors (401)**
   - Returned when token is missing, invalid, or expired
   - Generic message prevents user enumeration
   
3. **Conflict Errors (409)**
   - Returned when unique constraint violated (e.g., duplicate email)
   - No information about existing user (privacy)
   
4. **Server Errors (500)**
   - Generic message - specific error details logged server-side only
   - Safe for production without exposing internals

---

## Rate Limiting & Security Headers

*(To be implemented in future stories)*

- Rate limiting per IP address
- CORS restrictions to trusted domains
- Security headers (CSP, X-Frame-Options, etc.)
- API key support for service-to-service communication

---

## Version History

- **v0.1.0** (2026-01-17)
  - Initial registration and authentication endpoints
  - JWT token-based authentication
  - Role-based access control foundation

---

## Support & Questions

For issues or questions about the API:
1. Check the TEST-DEVELOPMENT-GUIDE.md for testing patterns
2. Review TESTING.md for comprehensive test strategy
3. Consult story files in implementation-artifacts/ for detailed AC requirements
