# 10MG Credit V2 - Multi-Tenant Lending Backend

A simplified, multi-tenant lending backend built with NestJS, Postgres, Redis, and JWT.

## Features

* **Multi-Tenancy:** Single shared database schema with strict isolation.
* **Auth:** JWT authentication with 4 distinct roles.
* **Lending Lifecycle:** Loan products, applications, mock credit checks, disbursement, and repayment.
* **Data Integrity:** Postgres transactions, pessimistic locking, and audit logs.
* **Idempotency:** Postgres-backed with Redis caching to prevent duplicate transactions.
* **Caching:** Redis caching (tenant-specific) for active loan products.

## Requirements & Setup

* Node.js (22+)
* Docker (Postgres and Redis)

```bash
# 1. Install dependencies
npm install

# 2. Set up environment variables
cp .env.example .env 
# (On Windows: Copy-Item .env.example .env)

# 3. Edit .env to set your JWT_SECRET and bootstrap admin credentials

# 4. Start database and cache
docker compose up -d

# 5. Start the API
npm run start:dev