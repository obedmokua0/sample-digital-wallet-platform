# Research: Wallet Microservice Technical Decisions

**Feature**: Wallet Microservice
**Date**: 2025-10-09
**Status**: Complete

## Purpose

This document captures research and decisions for technical unknowns identified in the feature specification and Technical Context. Each decision includes rationale, alternatives considered, and references to best practices.

## Decisions

### 1. Message Broker Selection

**Decision**: Redis Streams

**Rationale**:
- Lightweight and simpler to operate than Kafka (aligns with Simplicity principle)
- Built-in persistence with configurable retention
- Consumer groups provide scalability
- At-least-once delivery guarantee meets requirements
- Excellent performance: 100k+ messages/sec throughput
- Lower resource footprint than Kafka (important for microservices)
- Native support in Node.js ecosystem (ioredis library)
- Sufficient for expected scale (1M events/day = ~12 events/sec avg)

**Alternatives Considered**:
- **Apache Kafka**: Rejected - overkill for this scale, complex ops overhead, higher resource usage
- **RabbitMQ**: Rejected - traditional message queue, less suited for event streaming patterns
- **AWS EventBridge/Azure Event Grid**: Rejected - cloud vendor lock-in, prefer self-hosted

**References**:
- Redis Streams documentation: https://redis.io/docs/data-types/streams/
- Performance benchmarks showing Redis Streams handling 100k+ msg/sec
- Event-driven microservices patterns with Redis

### 2. Database Choice

**Decision**: PostgreSQL 15+

**Rationale**:
- ACID compliance essential for financial transactions (FR-010 atomicity requirement)
- Strong consistency guarantees prevent data corruption
- Row-level locking with SELECT FOR UPDATE prevents race conditions (FR-017)
- NUMERIC(19,4) type provides exact decimal arithmetic (no floating-point errors)
- Proven reliability in financial systems
- Excellent JSON support for transaction metadata
- Rich indexing capabilities for transaction history queries
- Active community and mature ecosystem

**Alternatives Considered**:
- **MongoDB**: Rejected - eventual consistency risks, less suitable for financial data
- **MySQL**: Rejected - PostgreSQL has better support for advanced features needed
- **CockroachDB**: Rejected - distributed features unnecessary at this scale

**Data Type for Money**: NUMERIC(19,4)
- Stores up to 999,999,999,999,999.9999 (quadrillion range with 4 decimal places)
- Exact arithmetic, no floating-point precision errors
- Sufficient for all major currencies and crypto decimals

**References**:
- PostgreSQL documentation on NUMERIC types
- Financial systems best practices: never use FLOAT for money
- ACID properties: https://www.postgresql.org/docs/current/tutorial-transactions.html

### 3. Event Reliability Pattern

**Decision**: Transactional Outbox Pattern

**Rationale**:
- Guarantees exactly-once event publishing from database perspective
- Solves dual-write problem: events stored in DB within same transaction
- Background worker polls outbox table and publishes to Redis Streams
- Database transaction ensures atomicity: either both data + event succeed or both fail
- Aligns with EDA-007 (events published after DB commit) and EDA-008 (graceful failure handling)
- Simple to implement and understand (Simplicity principle)

**Implementation Approach**:
1. Insert business data (wallet/transaction) + outbox event in single transaction
2. Commit transaction
3. Background worker queries unpublished events from outbox table
4. Publish to Redis Streams
5. Mark as published in outbox (or delete)
6. Retry on failures with exponential backoff

**Alternatives Considered**:
- **Dual Writes**: Rejected - can cause data inconsistency if one write fails
- **Change Data Capture (CDC)**: Rejected - adds complexity, requires additional infrastructure
- **Transaction Log Tailing**: Rejected - PostgreSQL-specific, less portable

**References**:
- Transactional Outbox pattern: https://microservices.io/patterns/data/transactional-outbox.html
- Implementing reliable event publishing

### 4. Concurrency Control for Wallet Operations

**Decision**: Pessimistic Locking with SELECT FOR UPDATE

**Rationale**:
- Prevents race conditions on wallet balance updates (FR-017 requirement)
- Simple and reliable: locks row until transaction completes
- Acceptable performance for expected load (1000 concurrent requests)
- Prevents phantom reads and lost updates
- Financial correctness over maximum throughput (safety-first principle)
- Works seamlessly with PostgreSQL transactions

**Implementation**:
```sql
BEGIN;
SELECT balance FROM wallets WHERE id = $1 FOR UPDATE;
-- Validate balance, perform operation
UPDATE wallets SET balance = balance + $amount WHERE id = $1;
COMMIT;
```

**Alternatives Considered**:
- **Optimistic Locking (version column)**: Rejected - requires retry logic, more complex error handling, potential user frustration with retries
- **Serializable Isolation**: Rejected - PostgreSQL serializable can cause high abort rates under contention
- **Application-level locking**: Rejected - doesn't work across multiple service instances

**Performance Considerations**:
- Lock contention expected to be low (operations on different wallets don't conflict)
- Average hold time <50ms per transaction
- Can scale horizontally since most operations are on different wallets

**References**:
- PostgreSQL locking: https://www.postgresql.org/docs/current/explicit-locking.html
- Concurrency patterns in financial systems

### 5. Currency Handling and Storage

**Decision**: ISO 4217 Currency Codes + Store as Decimal (NUMERIC)

**Currency Codes**: USD, EUR, GBP (initial support)
- 3-letter ISO 4217 codes stored as VARCHAR(3)
- Validation against whitelist of supported currencies
- No currency conversion in MVP (FR-023 clarification)

**Storage Format**:
- Store amounts as NUMERIC(19,4) in database
- Represents dollars/euros/pounds with 4 decimal places
- Example: $123.45 stored as 123.4500
- Sufficient precision for all fiat currencies and most cryptocurrencies

**API Representation**:
- Accept/return amounts as strings to prevent floating-point issues in JSON
- Example: `{"amount": "123.45", "currency": "USD"}`
- Client libraries must use decimal/BigDecimal types

**Validation**:
- Amounts must be positive, non-zero (FR-008)
- Maximum 4 decimal places
- Currency must match wallet currency (no cross-currency operations initially)

**Alternatives Considered**:
- **Store as integer cents**: Rejected - doesn't work well for currencies with different decimal places (e.g., JPY has 0, BTC has 8)
- **Store as float/double**: Rejected - precision errors unacceptable for financial data
- **Multi-currency wallets**: Rejected - out of scope for MVP, adds complexity

**References**:
- ISO 4217: https://en.wikipedia.org/wiki/ISO_4217
- Handling money in software: Martin Fowler patterns
- Never use floating-point for money

### 6. Authentication and Authorization

**Decision**: JWT Bearer Tokens (RS256)

**Rationale**:
- Stateless authentication (12F-004: service must be stateless)
- Standard OAuth 2.0 / OpenID Connect compatible
- Public key verification enables horizontal scaling
- No session storage required
- Token contains user identity (sub claim) for wallet ownership validation

**Token Structure**:
```json
{
  "sub": "user-123",
  "iat": 1696867200,
  "exp": 1696870800,
  "scope": "wallet:read wallet:write"
}
```

**Implementation**:
- Middleware validates JWT signature using public key
- Extract user_id from `sub` claim
- Verify user owns the wallet before operations
- Public keys loaded from environment variable or JWKS endpoint

**Authorization**:
- Users can only access their own wallets
- Wallet ownership verified: `wallet.user_id === jwt.sub`
- 403 Forbidden if ownership check fails

**Alternatives Considered**:
- **API Keys**: Rejected - requires state storage, harder to rotate, less standard
- **Basic Auth**: Rejected - credentials in every request, not suitable for production
- **OAuth 2.0 Full Flow**: Deferred - JWT is sufficient for MVP, full OAuth later

**References**:
- JWT specification: RFC 7519
- OAuth 2.0 Bearer Token Usage: RFC 6750
- IANA JSON Web Token Claims Registry

### 7. Rate Limiting Strategy

**Decision**: Token Bucket Algorithm with Redis

**Rate Limits** (configurable via environment):
- 100 requests per minute per wallet ID
- 1000 requests per minute per user
- 10,000 requests per minute globally (per service instance)

**Implementation**:
- Redis stores token buckets keyed by `wallet:{walletId}` or `user:{userId}`
- Each request consumes 1 token
- Tokens refill at constant rate (100/min = 1.67/sec)
- Burst capacity: allows up to 100 requests immediately if bucket full
- HTTP 429 Too Many Requests when limit exceeded
- Response headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

**Rationale**:
- Prevents abuse and DoS attacks (NFR-009 requirement)
- Token bucket allows reasonable bursts while limiting sustained load
- Redis provides fast, distributed rate limiting across service instances
- Standard HTTP 429 status for client handling

**Alternatives Considered**:
- **Sliding Window**: Rejected - more complex to implement, token bucket sufficient
- **Fixed Window**: Rejected - boundary reset issues, burst problems
- **Leaky Bucket**: Rejected - less flexible for bursty traffic

**References**:
- Token bucket algorithm: https://en.wikipedia.org/wiki/Token_bucket
- Rate limiting patterns for APIs
- Redis rate limiting implementations

### 8. Transaction Amount and Balance Limits

**Decision**: Configurable limits via environment variables

**Default Limits**:
- Maximum single transaction: $10,000 USD (or equivalent)
- Maximum wallet balance: $100,000 USD (or equivalent)
- Minimum transaction amount: $0.01 USD (or equivalent)

**Rationale**:
- Prevents errors and abuse (large fraudulent transactions)
- Typical limits for consumer wallet services
- Configurable per deployment (staging vs production)
- Limits apply in wallet's currency (no conversion)

**Validation**:
- FR-021: Max transaction amount enforced on deposit, withdraw, transfer
- FR-022: Max balance enforced on deposit and transfer credit
- Error response: 400 Bad Request with clear error message

**Multi-Currency Handling**:
- Limits configured per currency
- Example: `MAX_TRANSACTION_USD=10000`, `MAX_TRANSACTION_EUR=9000`
- No cross-currency comparison in MVP

**Alternatives Considered**:
- **No limits**: Rejected - risk of abuse and errors
- **User-tier limits**: Deferred - all users same limits in MVP
- **Dynamic limits**: Deferred - static limits sufficient initially

**References**:
- Payment industry standards
- Consumer protection regulations

### 9. Idempotency Key Strategy

**Decision**: Client-provided idempotency keys with 24-hour window

**Implementation**:
- Clients send `Idempotency-Key` header with unique UUID for mutations
- Server stores key → transaction_id mapping in database
- TTL: 24 hours (configurable)
- Duplicate requests within window return original result (status + response)
- After TTL, key can be reused

**Storage**:
- `transactions` table has `idempotency_key` column (indexed, unique)
- Natural deduplication: unique constraint prevents duplicate processing
- Query transaction by idempotency key to return cached result

**Behavior**:
- POST /wallets/:id/deposit with same key → returns original deposit result
- Different operation types can share key namespace (client responsibility)
- Non-idempotent operations (GET) ignore idempotency key

**Rationale**:
- Prevents duplicate processing from network retries (FR-014 requirement)
- Client controls key generation (UUID ensures global uniqueness)
- Database constraint provides atomic deduplication
- 24-hour window balances storage vs. safety

**Alternatives Considered**:
- **Server-generated keys**: Rejected - client can't retry with same key
- **Hash of request payload**: Rejected - fails if payload legitimately same
- **Infinite TTL**: Rejected - unbounded storage growth

**References**:
- Stripe idempotency design: https://stripe.com/docs/api/idempotent_requests
- Idempotency patterns in distributed systems

### 10. Monitoring and Observability

**Decision**: Structured JSON logging + Health checks + Metrics endpoint

**Logging** (12F-011 compliant):
- Structured JSON logs to stdout
- Log level: configurable via LOG_LEVEL env var (debug/info/warn/error)
- Every request: correlation ID, user_id, wallet_id, operation, duration
- Example:
  ```json
  {
    "timestamp": "2025-10-09T10:30:00Z",
    "level": "info",
    "correlationId": "abc-123",
    "userId": "user-456",
    "walletId": "wallet-789",
    "operation": "deposit",
    "amount": "50.00",
    "currency": "USD",
    "duration": 45,
    "message": "Deposit completed successfully"
  }
  ```

**Health Checks** (NFR-005 requirement):
- `GET /api/v1/health` - Basic liveness probe
  - Returns 200 OK if service running
- `GET /api/v1/health/ready` - Readiness probe
  - Checks: database connection, Redis connection
  - Returns 200 if all dependencies healthy, 503 otherwise
- Used by Kubernetes liveness/readiness probes

**Metrics** (Prometheus format):
- `GET /api/v1/metrics` - Prometheus-compatible metrics
- Application metrics:
  - `wallet_operations_total` (counter by operation type, status)
  - `wallet_operation_duration_seconds` (histogram)
  - `wallet_balance_total` (gauge, aggregated)
  - `events_published_total` (counter by event type)
- System metrics: Node.js process metrics (memory, CPU, event loop lag)

**Correlation IDs** (NFR-008 requirement):
- Every request generates UUID correlation ID
- Passed through all layers (API → service → repository → events)
- Included in all logs and event payloads
- Enables end-to-end request tracing

**Alternatives Considered**:
- **OpenTelemetry**: Deferred - metrics/logs sufficient for MVP, distributed tracing later
- **Custom metrics aggregation**: Rejected - Prometheus is industry standard
- **ELK/Datadog**: Deferred - stdout logs work with any aggregation tool

**References**:
- 12-factor logs: https://12factor.net/logs
- Prometheus best practices
- Structured logging patterns

## Summary

All technical unknowns from the specification have been resolved with concrete decisions. The chosen stack:

- **TypeScript 5.3+** with Node.js 20 LTS (constitutional requirement)
- **PostgreSQL 15+** for transactional data with ACID guarantees
- **Redis 7+** for event streaming and rate limiting
- **Express.js 4.x** for REST API
- **JWT (RS256)** for authentication
- **Transactional Outbox** for reliable event delivery
- **Pessimistic Locking** for concurrency control
- **Token Bucket** rate limiting
- **Structured JSON logs** with correlation IDs

This architecture balances simplicity, reliability, and scalability while adhering to constitutional principles and 12-factor app methodology.

