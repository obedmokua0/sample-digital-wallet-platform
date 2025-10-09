# Quickstart Guide: Wallet Microservice

**Feature**: Wallet Microservice
**Date**: 2025-10-09
**Prerequisites**: Docker, Docker Compose, Node.js 20 LTS, npm/pnpm

## Overview

This guide walks you through setting up and running the Wallet Microservice locally, executing all user stories, and verifying event publishing. Follow these steps to validate the complete system.

## Setup

### 1. Clone and Install Dependencies

```bash
# Navigate to project directory
cd wallet-service

# Install dependencies
npm install

# or with pnpm
pnpm install
```

### 2. Start Infrastructure with Docker Compose

```bash
# Start PostgreSQL and Redis
docker-compose up -d

# Verify services are running
docker-compose ps

# Expected output:
# NAME                STATUS
# wallet-postgres     Up
# wallet-redis        Up
```

**docker-compose.yml**:
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: wallet-postgres
    environment:
      POSTGRES_DB: wallet_dev
      POSTGRES_USER: wallet_user
      POSTGRES_PASSWORD: wallet_pass
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U wallet_user"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: wallet-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5

volumes:
  postgres_data:
  redis_data:
```

### 3. Configure Environment Variables

```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your values (defaults work for local development)
```

**.env**:
```bash
# Server Configuration
NODE_ENV=development
PORT=3000
LOG_LEVEL=debug

# Database Configuration
DATABASE_URL=postgresql://wallet_user:wallet_pass@localhost:5432/wallet_dev
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10

# Redis Configuration
REDIS_URL=redis://localhost:6379
REDIS_STREAM_NAME=wallet-events

# JWT Configuration (for local development)
JWT_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...\n-----END PUBLIC KEY-----"

# Transaction Limits
MAX_TRANSACTION_AMOUNT_USD=10000
MAX_TRANSACTION_AMOUNT_EUR=9000
MAX_TRANSACTION_AMOUNT_GBP=8000
MAX_WALLET_BALANCE_USD=100000
MAX_WALLET_BALANCE_EUR=90000
MAX_WALLET_BALANCE_GBP=80000

# Rate Limiting
RATE_LIMIT_WALLET_PER_MINUTE=100
RATE_LIMIT_USER_PER_MINUTE=1000
RATE_LIMIT_GLOBAL_PER_MINUTE=10000

# Outbox Worker
OUTBOX_POLL_INTERVAL_MS=1000
OUTBOX_BATCH_SIZE=100
```

### 4. Run Database Migrations

```bash
# Run migrations to create tables
npm run migrate:up

# Expected output:
# ✓ Migration 001_create_wallets_table.ts applied
# ✓ Migration 002_create_transactions_table.ts applied
# ✓ Migration 003_create_outbox_events_table.ts applied
```

### 5. Build and Start the Service

```bash
# Build TypeScript
npm run build

# Start the service
npm start

# Or for development with auto-reload
npm run dev

# Expected output:
# [2025-10-09T10:00:00.000Z] INFO: Server starting...
# [2025-10-09T10:00:00.100Z] INFO: Database connected
# [2025-10-09T10:00:00.150Z] INFO: Redis connected
# [2025-10-09T10:00:00.200Z] INFO: Outbox worker started
# [2025-10-09T10:00:00.250Z] INFO: Server listening on port 3000
```

### 6. Verify Service Health

```bash
# Check liveness
curl http://localhost:3000/api/v1/health

# Expected: {"status":"ok","timestamp":"2025-10-09T10:00:00Z"}

# Check readiness
curl http://localhost:3000/api/v1/health/ready

# Expected: {
#   "status":"ready",
#   "checks":{"database":"ok","redis":"ok"}
# }
```

## User Story Validation

### Prerequisites: Generate JWT Token

For local testing, generate a test JWT token:

```bash
# Using a JWT generation script (create this helper)
npm run generate-token -- --user-id user-123

# Or use jwt.io to manually create a token with:
# {
#   "sub": "user-123",
#   "iat": <current_timestamp>,
#   "exp": <current_timestamp + 3600>
# }
```

Set the token for following commands:

```bash
export JWT_TOKEN="eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### User Story 1: Create Wallet and Check Balance

**Test: Create a new USD wallet**

```bash
curl -X POST http://localhost:3000/api/v1/wallets \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"currency": "USD"}'
```

**Expected Response (201)**:
```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "userId": "user-123",
  "balance": "0.00",
  "currency": "USD",
  "status": "active",
  "createdAt": "2025-10-09T10:00:00Z",
  "updatedAt": "2025-10-09T10:00:00Z"
}
```

**Save the wallet ID**:
```bash
export WALLET_ID="a1b2c3d4-e5f6-7890-abcd-ef1234567890"
```

**Test: Get wallet details**

```bash
curl http://localhost:3000/api/v1/wallets/$WALLET_ID \
  -H "Authorization: Bearer $JWT_TOKEN"
```

**Expected Response (200)**: Same as create response

**Test: Check balance**

```bash
curl http://localhost:3000/api/v1/wallets/$WALLET_ID/balance \
  -H "Authorization: Bearer $JWT_TOKEN"
```

**Expected Response (200)**:
```json
{
  "walletId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "balance": "0.00",
  "currency": "USD",
  "asOf": "2025-10-09T10:00:05Z"
}
```

**Verify Event Published**:

```bash
# Read from Redis Stream
redis-cli XREAD STREAMS wallet-events 0

# Expected event:
# {
#   "eventType": "wallet.created",
#   "walletId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
#   "userId": "user-123",
#   "currency": "USD",
#   "initialBalance": "0.00",
#   ...
# }
```

✅ **User Story 1 Complete**: Wallet created with $0.00 balance, balance retrievable, event published

---

### User Story 2: Deposit Funds

**Test: Deposit $100 into wallet**

```bash
curl -X POST http://localhost:3000/api/v1/wallets/$WALLET_ID/deposit \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $(uuidgen)" \
  -d '{"amount": "100.00"}'
```

**Expected Response (200)**:
```json
{
  "transactionId": "txn-001",
  "walletId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "type": "deposit",
  "amount": "100.00",
  "currency": "USD",
  "balanceBefore": "0.00",
  "balanceAfter": "100.00",
  "status": "completed",
  "createdAt": "2025-10-09T10:05:00Z"
}
```

**Test: Verify balance updated**

```bash
curl http://localhost:3000/api/v1/wallets/$WALLET_ID/balance \
  -H "Authorization: Bearer $JWT_TOKEN"

# Expected: {"balance": "100.00", ...}
```

**Test: Deposit with invalid amount (negative)**

```bash
curl -X POST http://localhost:3000/api/v1/wallets/$WALLET_ID/deposit \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amount": "-50.00"}'
```

**Expected Response (400)**:
```json
{
  "error": "VALIDATION_ERROR",
  "message": "Invalid request parameters",
  "details": {
    "amount": "must be a positive number"
  }
}
```

**Test: Idempotency - replay same request**

```bash
IDEM_KEY=$(uuidgen)

# First request
curl -X POST http://localhost:3000/api/v1/wallets/$WALLET_ID/deposit \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Idempotency-Key: $IDEM_KEY" \
  -H "Content-Type: application/json" \
  -d '{"amount": "25.00"}'

# Second request with same key (should return same result, not create duplicate)
curl -X POST http://localhost:3000/api/v1/wallets/$WALLET_ID/deposit \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Idempotency-Key: $IDEM_KEY" \
  -H "Content-Type: application/json" \
  -d '{"amount": "25.00"}'

# Balance should only increase by $25, not $50
curl http://localhost:3000/api/v1/wallets/$WALLET_ID/balance \
  -H "Authorization: Bearer $JWT_TOKEN"

# Expected: {"balance": "125.00", ...}
```

**Verify Event Published**:

```bash
redis-cli XREAD COUNT 10 STREAMS wallet-events 0 | grep "funds.deposited"

# Should show funds.deposited events
```

✅ **User Story 2 Complete**: Deposits work, validation prevents invalid amounts, idempotency prevents duplicates, events published

---

### User Story 3: Withdraw Funds

**Test: Withdraw $25 from wallet**

```bash
curl -X POST http://localhost:3000/api/v1/wallets/$WALLET_ID/withdraw \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $(uuidgen)" \
  -d '{"amount": "25.00"}'
```

**Expected Response (200)**:
```json
{
  "transactionId": "txn-002",
  "walletId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "type": "withdrawal",
  "amount": "25.00",
  "currency": "USD",
  "balanceBefore": "125.00",
  "balanceAfter": "100.00",
  "status": "completed",
  "createdAt": "2025-10-09T10:10:00Z"
}
```

**Test: Withdraw more than balance (insufficient funds)**

```bash
curl -X POST http://localhost:3000/api/v1/wallets/$WALLET_ID/withdraw \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amount": "200.00"}'
```

**Expected Response (422)**:
```json
{
  "error": "INSUFFICIENT_FUNDS",
  "message": "Wallet balance insufficient for withdrawal",
  "details": {
    "requested": "200.00",
    "available": "100.00"
  }
}
```

**Verify balance unchanged**:

```bash
curl http://localhost:3000/api/v1/wallets/$WALLET_ID/balance \
  -H "Authorization: Bearer $JWT_TOKEN"

# Expected: {"balance": "100.00", ...}
```

✅ **User Story 3 Complete**: Withdrawals work, insufficient funds prevented, balance protected, events published

---

### User Story 4: Transfer Between Wallets

**Setup: Create second wallet**

```bash
# Create second wallet for another user
export JWT_TOKEN_USER2="<generate token for user-456>"

curl -X POST http://localhost:3000/api/v1/wallets \
  -H "Authorization: Bearer $JWT_TOKEN_USER2" \
  -H "Content-Type: application/json" \
  -d '{"currency": "USD"}'

# Save second wallet ID
export WALLET_ID_2="b2c3d4e5-f6a7-8901-bcde-f12345678901"

# Deposit some funds to second wallet
curl -X POST http://localhost:3000/api/v1/wallets/$WALLET_ID_2/deposit \
  -H "Authorization: Bearer $JWT_TOKEN_USER2" \
  -H "Idempotency-Key: $(uuidgen)" \
  -H "Content-Type: application/json" \
  -d '{"amount": "50.00"}'
```

**Test: Transfer $30 from wallet 1 to wallet 2**

```bash
curl -X POST http://localhost:3000/api/v1/wallets/$WALLET_ID/transfer \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $(uuidgen)" \
  -d '{
    "destinationWalletId": "'$WALLET_ID_2'",
    "amount": "30.00"
  }'
```

**Expected Response (200)**:
```json
{
  "sourceTransaction": {
    "transactionId": "txn-003",
    "walletId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "type": "transfer_debit",
    "amount": "30.00",
    "balanceBefore": "100.00",
    "balanceAfter": "70.00",
    ...
  },
  "destinationTransaction": {
    "transactionId": "txn-004",
    "walletId": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
    "type": "transfer_credit",
    "amount": "30.00",
    "balanceBefore": "50.00",
    "balanceAfter": "80.00",
    ...
  },
  "transferId": "transfer-123"
}
```

**Verify both balances updated**:

```bash
# Check source wallet
curl http://localhost:3000/api/v1/wallets/$WALLET_ID/balance \
  -H "Authorization: Bearer $JWT_TOKEN"
# Expected: {"balance": "70.00", ...}

# Check destination wallet
curl http://localhost:3000/api/v1/wallets/$WALLET_ID_2/balance \
  -H "Authorization: Bearer $JWT_TOKEN_USER2"
# Expected: {"balance": "80.00", ...}
```

**Test: Transfer to same wallet (should fail)**

```bash
curl -X POST http://localhost:3000/api/v1/wallets/$WALLET_ID/transfer \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "destinationWalletId": "'$WALLET_ID'",
    "amount": "10.00"
  }'
```

**Expected Response (422)**:
```json
{
  "error": "INVALID_TRANSFER",
  "message": "Cannot transfer to the same wallet"
}
```

**Verify Events Published** (2 events: debit and credit):

```bash
redis-cli XREAD COUNT 20 STREAMS wallet-events 0 | grep -E "transfer\.(debited|credited)"

# Should show both funds.transfer.debited and funds.transfer.credited events
# with matching transferId
```

✅ **User Story 4 Complete**: Transfers work atomically, both balances updated, invalid transfers prevented, paired events published

---

### User Story 5: View Transaction History

**Test: Get transaction history for wallet 1**

```bash
curl "http://localhost:3000/api/v1/wallets/$WALLET_ID/transactions?page=1&pageSize=10" \
  -H "Authorization: Bearer $JWT_TOKEN"
```

**Expected Response (200)**:
```json
{
  "transactions": [
    {
      "transactionId": "txn-003",
      "type": "transfer_debit",
      "amount": "30.00",
      "balanceAfter": "70.00",
      "createdAt": "2025-10-09T10:15:00Z"
    },
    {
      "transactionId": "txn-002",
      "type": "withdrawal",
      "amount": "25.00",
      "balanceAfter": "100.00",
      "createdAt": "2025-10-09T10:10:00Z"
    },
    {
      "transactionId": "txn-001",
      "type": "deposit",
      "amount": "100.00",
      "balanceAfter": "100.00",
      "createdAt": "2025-10-09T10:05:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 10,
    "totalItems": 3,
    "totalPages": 1
  }
}
```

**Test: Filter by transaction type**

```bash
curl "http://localhost:3000/api/v1/wallets/$WALLET_ID/transactions?type=deposit" \
  -H "Authorization: Bearer $JWT_TOKEN"

# Expected: Only deposit transactions
```

**Test: Filter by date range**

```bash
curl "http://localhost:3000/api/v1/wallets/$WALLET_ID/transactions?startDate=2025-10-09T10:00:00Z&endDate=2025-10-09T10:07:00Z" \
  -H "Authorization: Bearer $JWT_TOKEN"

# Expected: Only transactions in that time range
```

✅ **User Story 5 Complete**: Transaction history available, pagination works, filtering by type and date works

---

## Validation Checklist

- [x] Service starts successfully with all dependencies
- [x] Health checks return healthy status
- [x] User Story 1: Create wallet and check balance
- [x] User Story 2: Deposit funds with validation
- [x] User Story 3: Withdraw funds with insufficient funds check
- [x] User Story 4: Transfer between wallets atomically
- [x] User Story 5: View transaction history with pagination
- [x] Events published to Redis for all operations
- [x] Idempotency prevents duplicate transactions
- [x] Balance calculations accurate (sum of transactions = current balance)
- [x] Error responses follow standard format
- [x] Correlation IDs present in logs for tracing

## Monitoring

### View Logs

```bash
# View application logs (structured JSON)
docker-compose logs -f wallet-service

# Grep for specific operations
docker-compose logs wallet-service | grep "deposit"

# View correlation ID traces
docker-compose logs wallet-service | grep "correlationId\":\"req-abc-123"
```

### View Metrics

```bash
# Prometheus metrics
curl http://localhost:3000/api/v1/metrics

# Example output:
# wallet_operations_total{operation="deposit",status="success"} 5
# wallet_operations_total{operation="withdrawal",status="success"} 2
# wallet_operation_duration_seconds_bucket{operation="deposit",le="0.1"} 5
# ...
```

### Monitor Events

```bash
# Monitor Redis Stream in real-time
redis-cli XREAD BLOCK 0 STREAMS wallet-events $

# Count events by type
redis-cli XLEN wallet-events
```

## Cleanup

```bash
# Stop services
docker-compose down

# Remove volumes (clears data)
docker-compose down -v

# Stop Node.js service
# Press Ctrl+C in terminal running npm start
```

## Troubleshooting

### Service won't start

```bash
# Check Docker services
docker-compose ps

# View logs
docker-compose logs

# Restart services
docker-compose restart
```

### Database connection errors

```bash
# Verify PostgreSQL is running
docker-compose ps postgres

# Check connection
psql postgresql://wallet_user:wallet_pass@localhost:5432/wallet_dev

# Re-run migrations
npm run migrate:up
```

### Redis connection errors

```bash
# Verify Redis is running
docker-compose ps redis

# Test connection
redis-cli ping
# Expected: PONG
```

### Events not publishing

```bash
# Check outbox worker logs
docker-compose logs wallet-service | grep "outbox"

# Check unpublished events in database
psql postgresql://... -c "SELECT COUNT(*) FROM outbox_events WHERE published = false;"

# Manually check Redis stream
redis-cli XLEN wallet-events
```

## Next Steps

After validating the quickstart:

1. Run full test suite: `npm test`
2. Run contract tests: `npm run test:contract`
3. Run integration tests: `npm run test:integration`
4. Review API documentation: Open `contracts/openapi.yaml` in Swagger UI
5. Review event schemas: `contracts/events.schema.json`
6. Proceed to production deployment configuration

## References

- [API Contracts](./contracts/README.md)
- [Data Model](./data-model.md)
- [Research Decisions](./research.md)
- [Implementation Plan](./plan.md)

