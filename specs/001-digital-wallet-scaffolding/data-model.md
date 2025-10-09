# Data Model: Wallet Microservice

**Feature**: Wallet Microservice
**Date**: 2025-10-09
**Database**: PostgreSQL 15+

## Overview

This document defines the database schema, entities, relationships, validation rules, and state transitions for the Wallet Microservice. All schema definitions follow PostgreSQL syntax and support the functional requirements defined in the specification.

## Entities

### 1. Wallets

Represents a user's digital wallet containing funds in a specific currency.

**Table**: `wallets`

**Columns**:

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique wallet identifier |
| user_id | VARCHAR(255) | NOT NULL, INDEX | User who owns the wallet (from JWT sub) |
| balance | NUMERIC(19,4) | NOT NULL, DEFAULT 0, CHECK (balance >= 0) | Current balance (never negative) |
| currency | VARCHAR(3) | NOT NULL | ISO 4217 currency code (USD, EUR, GBP) |
| status | VARCHAR(20) | NOT NULL, DEFAULT 'active' | Wallet status: active, frozen, closed |
| created_at | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT NOW() | Wallet creation timestamp |
| updated_at | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT NOW() | Last update timestamp |
| version | INTEGER | NOT NULL, DEFAULT 1 | Optimistic lock version (for future use) |

**Indexes**:
- Primary key index on `id`
- Index on `user_id` for user wallet lookups
- Index on `(user_id, currency)` for multi-currency support
- Index on `status` for filtering active wallets

**Constraints**:
- `balance >= 0`: Prevents negative balances (FR-007)
- `currency IN ('USD', 'EUR', 'GBP')`: Only supported currencies
- `status IN ('active', 'frozen', 'closed')`: Valid status values
- Unique constraint on `(user_id, currency)`: One wallet per user per currency

**Validation Rules**:
- `user_id`: Non-empty string, max 255 characters
- `currency`: Exactly 3 uppercase letters, must be in supported list
- `balance`: Non-negative, max 4 decimal places, max value 100,000,000.0000
- `status`: Must be 'active' for any operation except read

**SQL Definition**:

```sql
CREATE TABLE wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    balance NUMERIC(19,4) NOT NULL DEFAULT 0 CHECK (balance >= 0),
    currency VARCHAR(3) NOT NULL CHECK (currency IN ('USD', 'EUR', 'GBP')),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'frozen', 'closed')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    version INTEGER NOT NULL DEFAULT 1,
    UNIQUE(user_id, currency)
);

CREATE INDEX idx_wallets_user_id ON wallets(user_id);
CREATE INDEX idx_wallets_status ON wallets(status);
```

### 2. Transactions

Immutable record of wallet operations (deposits, withdrawals, transfers).

**Table**: `transactions`

**Columns**:

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique transaction identifier |
| wallet_id | UUID | NOT NULL, FOREIGN KEY → wallets(id) | Wallet affected by this transaction |
| related_wallet_id | UUID | NULL, FOREIGN KEY → wallets(id) | Other wallet involved (for transfers) |
| type | VARCHAR(30) | NOT NULL | Transaction type |
| amount | NUMERIC(19,4) | NOT NULL, CHECK (amount > 0) | Transaction amount (always positive) |
| currency | VARCHAR(3) | NOT NULL | Currency of transaction |
| balance_before | NUMERIC(19,4) | NOT NULL | Wallet balance before transaction |
| balance_after | NUMERIC(19,4) | NOT NULL | Wallet balance after transaction |
| status | VARCHAR(20) | NOT NULL, DEFAULT 'completed' | Transaction status |
| idempotency_key | VARCHAR(255) | NULL, UNIQUE | Client-provided deduplication key |
| metadata | JSONB | NULL | Additional transaction metadata |
| created_at | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT NOW() | Transaction timestamp |

**Indexes**:
- Primary key index on `id`
- Index on `wallet_id` for transaction history queries
- Index on `idempotency_key` for deduplication lookups
- Index on `created_at` for time-range queries
- Composite index on `(wallet_id, created_at DESC)` for paginated history

**Constraints**:
- `amount > 0`: All amounts positive (FR-008), sign determined by type
- `type IN ('deposit', 'withdrawal', 'transfer_debit', 'transfer_credit')`: Valid types
- `status IN ('pending', 'completed', 'failed')`: Valid statuses
- `balance_after >= 0`: Consistency check (should match wallet balance)
- If `type = 'transfer_debit' OR type = 'transfer_credit'` THEN `related_wallet_id IS NOT NULL`

**Transaction Types**:
- `deposit`: Add funds to wallet (balance_after > balance_before)
- `withdrawal`: Remove funds from wallet (balance_after < balance_before)
- `transfer_debit`: Send funds to another wallet (balance_after < balance_before)
- `transfer_credit`: Receive funds from another wallet (balance_after > balance_before)

**Validation Rules**:
- `amount`: Positive, non-zero, max 4 decimal places, max $10,000
- `currency`: Must match wallet currency
- `idempotency_key`: If provided, must be unique (duplicate returns cached result)
- `balance_after - balance_before`: Must equal ±amount based on type
- Related wallet must exist for transfers

**SQL Definition**:

```sql
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID NOT NULL REFERENCES wallets(id),
    related_wallet_id UUID NULL REFERENCES wallets(id),
    type VARCHAR(30) NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'transfer_debit', 'transfer_credit')),
    amount NUMERIC(19,4) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) NOT NULL,
    balance_before NUMERIC(19,4) NOT NULL,
    balance_after NUMERIC(19,4) NOT NULL CHECK (balance_after >= 0),
    status VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
    idempotency_key VARCHAR(255) NULL UNIQUE,
    metadata JSONB NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_transactions_wallet_id ON transactions(wallet_id);
CREATE INDEX idx_transactions_idempotency_key ON transactions(idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX idx_transactions_created_at ON transactions(created_at);
CREATE INDEX idx_transactions_wallet_created ON transactions(wallet_id, created_at DESC);
```

### 3. Outbox Events

Transactional outbox table for reliable event publishing.

**Table**: `outbox_events`

**Columns**:

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGSERIAL | PRIMARY KEY | Sequential event identifier |
| event_type | VARCHAR(100) | NOT NULL | Type of event (e.g., wallet.created) |
| aggregate_id | UUID | NOT NULL | ID of affected entity (wallet_id or transaction_id) |
| payload | JSONB | NOT NULL | Full event payload |
| published | BOOLEAN | NOT NULL, DEFAULT false | Whether event has been published |
| published_at | TIMESTAMP WITH TIME ZONE | NULL | When event was published |
| created_at | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT NOW() | When event was created |

**Indexes**:
- Primary key index on `id`
- Index on `(published, created_at)` for worker polling
- Index on `aggregate_id` for querying events by entity

**Constraints**:
- `published = false` initially, set to `true` after successful publish
- Events never deleted (for audit trail), can be archived after TTL

**Event Types**:
- `wallet.created`
- `funds.deposited`
- `funds.withdrawn`
- `funds.transfer.debited`
- `funds.transfer.credited`

**SQL Definition**:

```sql
CREATE TABLE outbox_events (
    id BIGSERIAL PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,
    aggregate_id UUID NOT NULL,
    payload JSONB NOT NULL,
    published BOOLEAN NOT NULL DEFAULT false,
    published_at TIMESTAMP WITH TIME ZONE NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_outbox_unpublished ON outbox_events(published, created_at) WHERE published = false;
CREATE INDEX idx_outbox_aggregate ON outbox_events(aggregate_id);
```

## Relationships

### Entity Relationship Diagram

```
┌─────────────────┐
│     wallets     │
│─────────────────│
│ id (PK)         │───┐
│ user_id         │   │
│ balance         │   │
│ currency        │   │
│ status          │   │
│ ...             │   │
└─────────────────┘   │
                      │
                      │ 1:N
                      │
                  ┌───▼──────────────┐
                  │   transactions   │
                  │──────────────────│
                  │ id (PK)          │
                  │ wallet_id (FK)   │
                  │ related_wallet_id│───┐
                  │ type             │   │ (self-reference
                  │ amount           │   │  for transfers)
                  │ ...              │   │
                  └──────────────────┘   │
                           ▲             │
                           └─────────────┘

┌─────────────────┐
│ outbox_events   │
│─────────────────│
│ id (PK)         │
│ event_type      │
│ aggregate_id    │ (references wallet_id or transaction_id)
│ payload         │
│ published       │
│ ...             │
└─────────────────┘
```

### Relationship Rules

1. **Wallet → Transactions** (One-to-Many):
   - One wallet can have many transactions
   - Each transaction belongs to exactly one primary wallet
   - Cascade: Transactions retained even if wallet deleted (for audit)

2. **Transaction → Related Wallet** (Many-to-One, Optional):
   - Transfer transactions reference related wallet
   - `related_wallet_id` NULL for deposits/withdrawals
   - Both sides of transfer have matching transaction records

3. **Outbox Events → Aggregates** (Reference):
   - Events reference wallet or transaction by `aggregate_id`
   - No foreign key constraint (events outlive entities for audit)
   - Events never deleted

## State Transitions

### Wallet Status State Machine

```
    [Create]
       │
       ▼
   ┌──────────┐
   │  active  │ ◄──── (Default state)
   └──────────┘
       │    ▲
       │    │
  [Freeze] [Unfreeze]
       │    │
       ▼    │
   ┌──────────┐
   │  frozen  │ (Read-only, no transactions)
   └──────────┘
       │
    [Close]
       │
       ▼
   ┌──────────┐
   │  closed  │ (Terminal state, no operations)
   └──────────┘
```

**Valid Operations by Status**:
- `active`: All operations allowed (deposit, withdraw, transfer, read)
- `frozen`: Only read operations (get balance, transaction history)
- `closed`: Only read operations, cannot be reopened

### Transaction Status Flow

```
   ┌──────────┐
   │ (start)  │
   └──────────┘
       │
       ▼
   ┌──────────┐
   │ pending  │ (Created, not yet committed)
   └──────────┘
       │
       ├───────► ┌───────────┐
       │         │ completed │ (Success, immutable)
       │         └───────────┘
       │
       └───────► ┌──────────┐
                 │  failed  │ (Validation/business rule failure)
                 └──────────┘
```

**Note**: In practice, most transactions go directly to `completed` since validation happens before creation. The `pending` state exists for future two-phase operations or async processing.

## Validation Rules Summary

### Wallet Validation
- ✅ Balance never negative (database constraint + application logic)
- ✅ Currency must be supported (USD, EUR, GBP)
- ✅ Status must be 'active' for mutations
- ✅ One wallet per user per currency

### Transaction Validation
- ✅ Amount always positive (sign determined by type)
- ✅ Amount ≤ $10,000 (configurable limit)
- ✅ Currency matches wallet currency
- ✅ Sufficient balance for withdrawals/transfers
- ✅ Related wallet exists for transfers
- ✅ Cannot transfer to same wallet
- ✅ Idempotency key uniqueness

### Cross-Entity Validation
- ✅ Transaction balance_after must match wallet balance
- ✅ Sum of transactions must equal current balance (audit check)
- ✅ Transfer pairs must have matching amounts

## Data Integrity

### Constraints Enforced
1. **Referential Integrity**: Foreign keys ensure valid relationships
2. **Check Constraints**: Balance ≥ 0, amount > 0, valid enums
3. **Unique Constraints**: Idempotency keys, (user_id, currency)
4. **Not Null**: Required fields always populated

### Audit Trail
- All transactions immutable (no updates/deletes)
- Timestamps on all entities
- Balance snapshots in transactions (balance_before, balance_after)
- Events never deleted from outbox

### Concurrency Control
- Pessimistic locking: `SELECT ... FOR UPDATE` on wallet row
- Lock acquired at transaction start, released at commit
- Prevents lost updates and race conditions

## Migrations

Database schema will be managed with migrations (e.g., node-pg-migrate or TypeORM migrations):

**Migration 001**: Create wallets table
**Migration 002**: Create transactions table
**Migration 003**: Create outbox_events table
**Migration 004**: Add indexes for performance

Each migration includes rollback support for safe deployment.

## Performance Considerations

### Indexes
- Primary lookups: By wallet ID (primary key)
- User wallets: By user_id (indexed)
- Transaction history: By (wallet_id, created_at DESC) for pagination
- Idempotency: By idempotency_key (unique index)

### Query Patterns
- **Hot path**: Wallet balance check (single row lookup by PK)
- **Transaction list**: Paginated query with LIMIT/OFFSET
- **Event publishing**: Poll unpublished events (indexed WHERE clause)

### Scalability
- Partitioning: Transactions table can be partitioned by created_at (monthly) for large volumes
- Read replicas: Balance queries can use read replicas
- Connection pooling: PgBouncer for connection efficiency

## Example Data

### Wallet Record

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "user_id": "user-123",
  "balance": "1500.5000",
  "currency": "USD",
  "status": "active",
  "created_at": "2025-10-09T10:00:00Z",
  "updated_at": "2025-10-09T14:30:00Z",
  "version": 1
}
```

### Transaction Record (Deposit)

```json
{
  "id": "txn-001",
  "wallet_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "related_wallet_id": null,
  "type": "deposit",
  "amount": "100.0000",
  "currency": "USD",
  "balance_before": "1400.5000",
  "balance_after": "1500.5000",
  "status": "completed",
  "idempotency_key": "idem-abc-123",
  "metadata": {"source": "bank_transfer", "reference": "REF123"},
  "created_at": "2025-10-09T14:30:00Z"
}
```

### Outbox Event

```json
{
  "id": 1001,
  "event_type": "funds.deposited",
  "aggregate_id": "txn-001",
  "payload": {
    "eventType": "funds.deposited",
    "walletId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "transactionId": "txn-001",
    "amount": "100.00",
    "currency": "USD",
    "newBalance": "1500.50",
    "timestamp": "2025-10-09T14:30:00Z",
    "correlationId": "req-xyz-789"
  },
  "published": false,
  "published_at": null,
  "created_at": "2025-10-09T14:30:00Z"
}
```

## Summary

This data model supports all functional requirements with:
- Strong consistency via PostgreSQL ACID transactions
- Immutable audit trail via transactions table
- Reliable event delivery via transactional outbox
- Concurrency safety via pessimistic locking
- Performance via strategic indexing
- Data integrity via constraints and validation

The schema is normalized, follows PostgreSQL best practices, and aligns with constitutional principles of simplicity and maintainability.

