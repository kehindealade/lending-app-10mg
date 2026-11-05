# 10MG Credit V2 — Multi-Tenant Lending Backend

A simplified multi-tenant lending backend built with NestJS, TypeScript, PostgreSQL, TypeORM, Redis and JWT authentication.

## Features

- Shared database and schema for multiple financial institutions
- JWT authentication with four roles
- Institution registration and white-label branding
- Loan product CRUD with soft deactivation
- Customer loan applications and mock credit assessment
- Mock loan disbursement and full repayment
- Database transactions, row locks and audit logs
- PostgreSQL-backed idempotency with Redis response cache
- Tenant-scoped Redis caching for active loan-product lists
- Swagger documentation and E2E tests

## Requirements

- Node.js 22 or later
- npm
- Docker with Docker Compose (PostgreSQL and Redis)

## Local setup

1. Install dependencies: `npm install`
2. Copy the environment file: `cp .env.example .env`
3. Set a strong `JWT_SECRET` and change the bootstrap admin credentials in `.env`.
4. Start PostgreSQL and Redis: `docker compose up -d`
5. Start API: `npm run start:dev`
6. Open Swagger: `http://localhost:3000/api`

On Windows PowerShell, use `Copy-Item .env.example .env` instead of `cp`.

## Bootstrap super admin

The application provisions a platform tenant and a `SUPER_ADMIN` user when it starts for the first time. Credentials come from `BOOTSTRAP_ADMIN_EMAIL` and `BOOTSTRAP_ADMIN_PASSWORD`. Log in with `POST /auth/login`; then register institutions through `POST /tenants`.

## Roles

| Role | Actions |
| --- | --- |
| SUPER_ADMIN | Register and list institutions |
| TENANT_ADMIN | Configure branding, manage users/products, view institution loans |
| LOAN_OFFICER | View institution loans, assess and disburse |
| CUSTOMER | View products, apply, view own loans, repay own loans |

## Suggested demo flow

1. `POST /auth/login` with the bootstrap credentials.
2. `POST /tenants` using the super admin token to register a new institution and its administrator.
3. `POST /auth/login` with the new tenant admin credentials.
4. `POST /products` with the tenant admin token.
5. `POST /auth/users` to create a customer and a loan officer.
6. Log in as each user to obtain their JWT.
7. `POST /loans/apply` as customer with `productId` and `amount: 5000`.
8. `POST /loans/:id/assess` as loan officer.
9. `POST /loans/:id/disburse` as loan officer.
10. `POST /loans/:id/repay` as customer with the exact `totalDue`.

For meaningful retries, send a distinct `Idempotency-Key` header with each new POST operation.

## Architecture decisions

This project uses a standard modular NestJS monolith. Controllers handle routes and permissions; services implement business logic; TypeORM repositories handle persistence. It deliberately avoids CQRS, microservices and message queues for a 48-hour take-home scope. Redis is used only for completed idempotency response caching and tenant-scoped active loan-product list caching.

### Tenant isolation

A shared PostgreSQL database and schema store all tenants. Tenant-owned tables have `tenantId`. JWT payloads include `sub`, `role`, and `tenantId`. The `TenantScopeService` automatically adds authenticated tenant ID to queries called through it, and all lending transactions use tenant-scoped queries. The tenant identity is never read from client-provided request bodies for resource creation. Customers additionally see only their own loans.

The helper is not a database-wide query interceptor or PostgreSQL Row-Level Security. All future tenant-owned repositories and raw queries must consistently apply equivalent scoping.

### Financial integrity

Loan transitions run in `DataSource.transaction` and use `pessimistic_write` row locks. The loan status update and audit log insertion commit or roll back together. The mock assessment approves applications below 10,000 and rejects all others. Interest is flat interest calculated once on the principal, plus a fixed fee. Repayment is a single full payment.

### Redis usage: idempotency and loan-product lists only

Redis is used for the following expiring data:

| Use | Redis key scope | TTL | Invalidation |
| --- | --- | --- | --- |
| Active product list | Tenant ID | 1 minute | On product create/update/deactivate |
| Completed idempotency response | Tenant ID and hashed key | 24 hours | Automatic TTL; durable copy stays in PostgreSQL |

Product validation during loan applications always queries PostgreSQL, not cached product data. Product list keys include the institution ID so different tenants never share cached lists. Branding reads and authentication use PostgreSQL directly, without Redis.

Redis contains only reconstructible idempotency responses and active loan-product lists. The included Redis container does not enable persistence. Application startup requires Redis to connect, while cache errors during normal operation fall back to PostgreSQL. Login attempt limiting is not implemented in Redis; production deployments should implement an independent rate limit at the API gateway or other appropriate layer.

### PostgreSQL idempotency with a Redis fast path

The PostgreSQL `idempotency_keys` table has a unique `(tenantId, key)` constraint. The interceptor reserves a key and hashes request method, path, body and authenticated user ID. After a successful request, its response is saved durably to PostgreSQL, then cached in Redis. Redis serves completed retries quickly; a cache miss checks PostgreSQL. A matching completed retry returns the original response; reuse with a different request returns `409`. Concurrent in-flight retries also receive `409`.

PostgreSQL is authoritative because a Redis eviction, restart or TTL expiry must not allow a duplicate disbursement. Redis is never used to control lending state transitions. This is assessment-grade idempotency rather than exactly-once payments: the response record and lending transaction are not part of one atomic commit, so interrupted reservations require operational cleanup. Production financial integrations need durable recovery and reconciliation logic.

## ERD description

- `Tenant(id, name, isActive, branding, createdAt)`
- `User(id, tenantId, email, passwordHash, role, isActive, createdAt)`
- `LoanProduct(id, tenantId, name, interestRate, minAmount, maxAmount, fees, repaymentConfig, isActive, createdAt)`
- `LoanApplication(id, tenantId, customerId, productId, amount, totalDue, status, transactionReference, disbursedAt, repaidAt, createdAt)`
- `AuditLog(id, tenantId, action, entityType, entityId, performedBy, timestamp, metaData)`
- `IdempotencyKey(id, tenantId, key, requestHash, response, createdAt)`

One tenant has many users/products/loans/audit logs/idempotency keys. One customer has many loan applications. Each loan belongs to a product and customer. Audit logs reference a changing entity by `entityType` and `entityId`. Idempotency keys are unique within a tenant.

## API documentation

Swagger: `http://localhost:3000/api`

Authenticate with `POST /auth/login`, then use Swagger's **Authorize** button to enter the bearer token.

## Tests

```bash
npm run build
npm run test:e2e
```

The E2E test covers registration, product creation and Redis cache invalidation, user provisioning, application, approval, disbursement, idempotent retry and conflicting key reuse, repayment, tenant isolation, and customer-level isolation. Tests require running PostgreSQL and Redis services with `DB_SYNC=true`. Use a separate test database for real CI.

## Redis checks

Run `docker compose ps` to check both services. To verify Redis is responding, run:

```bash
docker compose exec redis redis-cli ping
```

Expected output: `PONG`.

## Scope limitations

The project deliberately excludes external bank disbursements, real credit bureau integration, partial payments, installment schedules, accruing interest, message queues, and production database migrations. `DB_SYNC=true` is only intended for local evaluation. Before production, add reviewed migrations, secret management, PostgreSQL RLS or additional tenant isolation assurance, concurrency and crash-recovery tests, and external payment reconciliation.
