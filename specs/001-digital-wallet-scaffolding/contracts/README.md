# API Contracts: Wallet Microservice

**Feature**: Wallet Microservice
**Date**: 2025-10-09

## Overview

This directory contains the formal API contracts for the Wallet Microservice:

- **openapi.yaml**: REST API specification (OpenAPI 3.0)
- **events.schema.json**: Event schemas for published events (JSON Schema)

## Files

### openapi.yaml

Complete OpenAPI 3.0 specification for the REST API including:

- **Endpoints**: All wallet and transaction operations
- **Request/Response schemas**: Typed schemas for all payloads
- **Authentication**: JWT Bearer token requirements
- **Error responses**: Standard error codes and formats
- **Examples**: Sample requests and responses for each endpoint

**Usage**:
- Generate TypeScript types: `openapi-typescript openapi.yaml -o types.ts`
- API documentation: Import into Swagger UI or Redoc
- Client generation: Use OpenAPI Generator for client libraries
- Contract testing: Validate requests/responses against schemas

**Base URL**: `/api/v1`

**Authentication**: All endpoints except `/health/*` and `/metrics` require `Authorization: Bearer <JWT>` header

### events.schema.json

JSON Schema definitions for all events published to Redis Streams:

1. **wallet.created**: Published when a new wallet is created
2. **funds.deposited**: Published when funds are deposited
3. **funds.withdrawn**: Published when funds are withdrawn
4. **funds.transfer.debited**: Published when funds are debited in a transfer
5. **funds.transfer.credited**: Published when funds are credited in a transfer

**Usage**:
- Validate event payloads before publishing
- Generate TypeScript interfaces from schemas
- Consumer documentation for downstream services
- Schema evolution tracking

## Validation

### API Contracts

Validation happens at multiple layers:

1. **Request validation**: Express middleware validates requests against OpenAPI schemas
2. **Response validation**: In tests, validate responses match OpenAPI schemas
3. **Contract tests**: See `tests/contract/` for automated contract tests

### Event Schemas

1. **Pre-publish validation**: Event publisher validates against JSON schemas before sending to Redis
2. **Consumer validation**: Downstream services should validate received events
3. **Schema registry**: Consider implementing schema versioning for evolution

## Versioning

**API Version**: v1 (included in base path `/api/v1`)

**Versioning Strategy**:
- Breaking changes: New API version (v2, v3, etc.)
- Non-breaking changes: Same version, backwards compatible
- Deprecation: Mark as deprecated in OpenAPI spec, sunset after 6 months

**Event Schema Versioning**:
- Add `schemaVersion` field to event payload if breaking changes needed
- Consumers must handle multiple schema versions during transition

## Examples

### Creating a Wallet

```bash
curl -X POST http://localhost:3000/api/v1/wallets \
  -H "Authorization: Bearer <JWT>" \
  -H "Content-Type: application/json" \
  -d '{"currency": "USD"}'
```

**Response (201)**:
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

### Depositing Funds

```bash
curl -X POST http://localhost:3000/api/v1/wallets/{walletId}/deposit \
  -H "Authorization: Bearer <JWT>" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000" \
  -d '{"amount": "100.50"}'
```

**Response (200)**:
```json
{
  "transactionId": "txn-001",
  "walletId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "type": "deposit",
  "amount": "100.50",
  "currency": "USD",
  "balanceBefore": "0.00",
  "balanceAfter": "100.50",
  "status": "completed",
  "createdAt": "2025-10-09T10:05:00Z"
}
```

**Published Event** (to Redis Stream):
```json
{
  "eventType": "funds.deposited",
  "walletId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "transactionId": "txn-001",
  "amount": "100.50",
  "currency": "USD",
  "previousBalance": "0.00",
  "newBalance": "100.50",
  "timestamp": "2025-10-09T10:05:00Z",
  "correlationId": "req-abc-123"
}
```

### Transferring Funds

```bash
curl -X POST http://localhost:3000/api/v1/wallets/{sourceWalletId}/transfer \
  -H "Authorization: Bearer <JWT>" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: 660e8400-e29b-41d4-a716-446655440001" \
  -d '{
    "destinationWalletId": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
    "amount": "50.00"
  }'
```

**Response (200)**:
```json
{
  "sourceTransaction": {
    "transactionId": "txn-003",
    "walletId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "type": "transfer_debit",
    "amount": "50.00",
    "currency": "USD",
    "balanceBefore": "100.50",
    "balanceAfter": "50.50",
    "status": "completed",
    "createdAt": "2025-10-09T10:10:00Z"
  },
  "destinationTransaction": {
    "transactionId": "txn-004",
    "walletId": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
    "type": "transfer_credit",
    "amount": "50.00",
    "currency": "USD",
    "balanceBefore": "200.00",
    "balanceAfter": "250.00",
    "status": "completed",
    "createdAt": "2025-10-09T10:10:00Z"
  },
  "transferId": "transfer-123"
}
```

**Published Events** (to Redis Stream):
```json
// Event 1: Debit from source
{
  "eventType": "funds.transfer.debited",
  "sourceWalletId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "destinationWalletId": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
  "transferId": "transfer-123",
  "transactionId": "txn-003",
  "amount": "50.00",
  "currency": "USD",
  "previousBalance": "100.50",
  "newBalance": "50.50",
  "timestamp": "2025-10-09T10:10:00Z",
  "correlationId": "req-def-456"
}

// Event 2: Credit to destination
{
  "eventType": "funds.transfer.credited",
  "sourceWalletId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "destinationWalletId": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
  "transferId": "transfer-123",
  "transactionId": "txn-004",
  "amount": "50.00",
  "currency": "USD",
  "previousBalance": "200.00",
  "newBalance": "250.00",
  "timestamp": "2025-10-09T10:10:00Z",
  "correlationId": "req-def-456"
}
```

## Error Handling

### Standard Error Format

All errors follow this format:

```json
{
  "error": "ERROR_CODE",
  "message": "Human-readable error message",
  "details": {
    "field": "additional context"
  },
  "correlationId": "req-xyz-789"
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `UNAUTHORIZED` | 401 | Missing or invalid authentication |
| `FORBIDDEN` | 403 | Authenticated but not authorized |
| `NOT_FOUND` | 404 | Resource not found |
| `INSUFFICIENT_FUNDS` | 422 | Wallet balance too low |
| `CURRENCY_MISMATCH` | 422 | Wallet currencies don't match |
| `AMOUNT_EXCEEDS_LIMIT` | 422 | Transaction amount exceeds max limit |
| `BALANCE_EXCEEDS_LIMIT` | 422 | Resulting balance exceeds max limit |
| `INVALID_TRANSFER` | 422 | Transfer violates business rules |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

## Rate Limiting

All API endpoints (except health checks) are rate limited:

**Headers**:
- `X-RateLimit-Limit`: Maximum requests per window
- `X-RateLimit-Remaining`: Remaining requests in current window
- `X-RateLimit-Reset`: Unix timestamp when window resets

**Limits** (configurable):
- 100 requests per minute per wallet
- 1000 requests per minute per user
- 429 Too Many Requests when exceeded

## Idempotency

Mutation endpoints (POST/PUT/DELETE) support idempotency via `Idempotency-Key` header:

- Client provides UUID in header
- Duplicate requests with same key return cached result
- Keys valid for 24 hours
- Recommended: Use UUID v4 for uniqueness

**Example**:
```bash
curl -X POST ... \
  -H "Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000"
```

## Testing

### Contract Tests

Contract tests in `tests/contract/` validate:
- Request/response schemas match OpenAPI spec
- All documented endpoints exist
- Status codes match documentation
- Error responses follow standard format

### Integration Tests

Integration tests in `tests/integration/` validate:
- End-to-end user stories
- Business logic correctness
- Event publishing
- Database state consistency

Run tests:
```bash
npm test                     # All tests
npm run test:contract        # Contract tests only
npm run test:integration     # Integration tests only
```

## Tools

### Recommended Tools

- **Swagger UI**: Interactive API documentation
- **Redoc**: Alternative API documentation
- **Postman/Insomnia**: API testing and exploration
- **openapi-typescript**: Generate TypeScript types from OpenAPI
- **ajv**: JSON schema validation in TypeScript
- **jest-openapi**: OpenAPI validation in Jest tests

### Code Generation

```bash
# Generate TypeScript types from OpenAPI
npx openapi-typescript openapi.yaml -o src/types/api.ts

# Generate TypeScript interfaces from event schemas
npx json-schema-to-typescript events.schema.json -o src/types/events.ts
```

## References

- OpenAPI 3.0 Specification: https://swagger.io/specification/
- JSON Schema: https://json-schema.org/
- REST API Best Practices: https://restfulapi.net/
- Event-Driven Architecture Patterns: https://microservices.io/patterns/data/event-driven-architecture.html

