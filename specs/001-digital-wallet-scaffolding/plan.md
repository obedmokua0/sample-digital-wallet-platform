# Implementation Plan: Wallet Microservice

**Branch**: `002-i-want-to` | **Date**: 2025-10-09 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/Users/Tassio_Abreu/specs/002-i-want-to/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → If not found: ERROR "No feature spec at {path}"
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → Detect Project Type from file system structure or context (web=frontend+backend, mobile=app+api)
   → Set Structure Decision based on project type
3. Fill the Constitution Check section based on the content of the constitution document.
4. Evaluate Constitution Check section below
   → If violations exist: Document in Complexity Tracking
   → If no justification possible: ERROR "Simplify approach first"
   → Update Progress Tracking: Initial Constitution Check
5. Execute Phase 0 → research.md
   → If NEEDS CLARIFICATION remain: ERROR "Resolve unknowns"
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, agent-specific template file
7. Re-evaluate Constitution Check section
   → If new violations: Refactor design, return to Phase 1
   → Update Progress Tracking: Post-Design Constitution Check
8. Plan Phase 2 → Describe task generation approach (DO NOT create tasks.md)
9. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 9. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary

The Wallet Microservice is a financial transaction system that enables users to create digital wallets, manage funds through deposits and withdrawals, transfer money between wallets, and view transaction history. The system follows event-driven architecture patterns and 12-factor app principles, ensuring scalability, reliability, and observability.

**Primary Requirements**:
- Create wallets with balance tracking and currency support
- Deposit, withdraw, and transfer operations with validation
- Event publishing for all state changes (event-driven architecture)
- Transaction history with pagination and filtering
- Idempotency and concurrency control
- 99.9% uptime with <200ms p95 latency for operations

**Technical Approach** (from research):
- TypeScript microservice following constitutional requirements
- PostgreSQL for transactional data with row-level locking
- Redis Streams for event publishing (lightweight, fast)
- Express.js REST API with OpenAPI documentation
- Transactional outbox pattern for reliable event delivery
- Docker containerization for 12-factor compliance

## Technical Context

**Language/Version**: TypeScript 5.3+ with Node.js 20 LTS
**Primary Dependencies**: Express.js 4.x, TypeORM 0.3.x, Redis 7.x client, ioredis 5.x
**Storage**: PostgreSQL 15+ (primary transactional store), Redis 7+ (event streaming)
**Testing**: Jest 29.x with ts-jest, Supertest for API testing
**Target Platform**: Linux containers (Docker), deployed via Kubernetes or similar orchestrator
**Project Type**: Single microservice (backend API)
**Performance Goals**: 
- <200ms p95 latency for single wallet operations
- <500ms p95 for transfer operations
- Support 1000+ concurrent requests
- <10 second startup time
**Constraints**: 
- ACID compliance for financial transactions
- At-least-once event delivery guarantee
- Zero data loss on failures
- Horizontal scalability required
**Scale/Scope**: 
- Expected 10k-100k wallets
- 1M+ transactions per day at peak
- Support for 3-5 currency types initially (USD, EUR, GBP)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. TypeScript-First ✅ PASS
- All code will be implemented in TypeScript 5.3+
- Configuration files will use TypeScript where applicable
- Strict mode enabled in tsconfig.json

### II. Type Safety & Quality ✅ PASS
- TypeScript strict mode: enabled
- ESLint with TypeScript plugin configured
- Prettier for code formatting
- No `any` types without explicit justification
- All public APIs with explicit type annotations
- Return types explicitly declared for all functions

### III. Test-First Development ✅ PASS
- TDD approach: tests written before implementation
- Contract tests for all API endpoints
- Integration tests for all user stories
- Unit tests for business logic
- All tests in TypeScript

### IV. Simplicity & Maintainability ✅ PASS
- YAGNI: implementing only P1-P5 user stories
- Simple REST API over complex protocols
- Direct PostgreSQL access (no ORM abstraction overhead initially)
- Redis Streams chosen for simplicity over Kafka
- Clear separation of concerns: models, services, API

### V. Documentation Standards ✅ PASS
- TSDoc comments for all exported functions, classes, interfaces
- OpenAPI/Swagger spec for REST API
- README with setup and usage instructions
- Inline comments for business logic

### 12-Factor App Compliance ✅ PASS
- **I. Codebase**: Single repo tracked in Git
- **II. Dependencies**: package.json with explicit versions
- **III. Config**: Environment variables for all config
- **IV. Backing services**: PostgreSQL and Redis as attached resources
- **V. Build/Release/Run**: Separate stages via Docker
- **VI. Processes**: Stateless, all state in PostgreSQL
- **VII. Port binding**: Express server exports HTTP service
- **VIII. Concurrency**: Horizontal scaling via multiple instances
- **IX. Disposability**: Fast startup (<10s), graceful shutdown
- **X. Dev/Prod parity**: Docker ensures environment consistency
- **XI. Logs**: Structured JSON logs to stdout
- **XII. Admin processes**: Migration scripts as one-off tasks

**Initial Constitution Check: PASS** - No violations detected

## Project Structure

### Documentation (this feature)

```
specs/002-i-want-to/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
│   ├── openapi.yaml     # OpenAPI 3.0 specification
│   ├── events.schema.json # Event schema definitions
│   └── README.md        # Contract documentation
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)

```
wallet-service/
├── src/
│   ├── models/
│   │   ├── Wallet.ts
│   │   ├── Transaction.ts
│   │   └── index.ts
│   ├── services/
│   │   ├── WalletService.ts
│   │   ├── TransactionService.ts
│   │   ├── EventPublisher.ts
│   │   └── index.ts
│   ├── api/
│   │   ├── routes/
│   │   │   ├── wallets.ts
│   │   │   ├── transactions.ts
│   │   │   └── health.ts
│   │   ├── middleware/
│   │   │   ├── errorHandler.ts
│   │   │   ├── requestLogger.ts
│   │   │   └── validation.ts
│   │   └── server.ts
│   ├── db/
│   │   ├── connection.ts
│   │   ├── migrations/
│   │   └── repositories/
│   │       ├── WalletRepository.ts
│   │       └── TransactionRepository.ts
│   ├── events/
│   │   ├── publisher.ts
│   │   ├── schemas.ts
│   │   └── types.ts
│   ├── config/
│   │   └── index.ts
│   ├── utils/
│   │   ├── logger.ts
│   │   ├── errors.ts
│   │   └── validators.ts
│   └── index.ts
├── tests/
│   ├── contract/
│   │   ├── wallets.contract.test.ts
│   │   └── transactions.contract.test.ts
│   ├── integration/
│   │   ├── createWallet.test.ts
│   │   ├── deposit.test.ts
│   │   ├── withdraw.test.ts
│   │   ├── transfer.test.ts
│   │   └── transactionHistory.test.ts
│   └── unit/
│       ├── WalletService.test.ts
│       ├── TransactionService.test.ts
│       └── validators.test.ts
├── package.json
├── tsconfig.json
├── .eslintrc.js
├── .prettierrc
├── jest.config.js
├── Dockerfile
├── docker-compose.yml
├── .env.example
└── README.md
```

**Structure Decision**: Single microservice structure selected. This is a backend-only API service that will be containerized as a single deployable unit. The structure follows clean architecture principles with clear separation between API layer, service layer, data layer, and event publishing. This aligns with microservice best practices and enables independent deployment and scaling.

## Phase 0: Outline & Research

### Research Tasks Completed

The following technical decisions have been researched and documented in [research.md](./research.md):

1. **Message Broker Selection**: Redis Streams vs Kafka vs RabbitMQ
2. **Database Choice**: PostgreSQL vs MongoDB for financial data
3. **Event Reliability Pattern**: Transactional outbox vs dual writes
4. **Concurrency Control**: Optimistic vs pessimistic locking for wallet operations
5. **Currency Handling**: Storage format and precision for monetary values
6. **Authentication**: JWT vs API Keys for microservice auth
7. **Rate Limiting**: Token bucket vs sliding window algorithms
8. **Transaction Limits**: Industry standards for wallet operations
9. **Idempotency**: Key generation and storage strategies
10. **Monitoring**: Health checks and observability patterns

### Key Decisions Summary

**Database**: PostgreSQL 15+
- Strong ACID guarantees essential for financial transactions
- Row-level locking for concurrency control
- NUMERIC type for precise monetary calculations
- Proven reliability and performance

**Event Broker**: Redis Streams
- Lightweight compared to Kafka (simpler ops, lower resource usage)
- Built-in persistence and replay capabilities
- At-least-once delivery guarantee
- Consumer groups for scalability
- Sufficient for expected scale (1M events/day)

**Event Pattern**: Transactional Outbox
- Events stored in database within same transaction
- Background worker publishes to Redis Streams
- Guarantees event delivery even on failures
- Prevents dual-write problem

**Concurrency**: Pessimistic Locking with SELECT FOR UPDATE
- Prevents race conditions on wallet balance
- Simple and reliable for financial operations
- Performance acceptable for expected load

**Currency**: ISO 4217 codes + NUMERIC(19,4)
- Store amounts as integers (cents/paise) or high-precision decimals
- Support USD, EUR, GBP initially
- No currency conversion in MVP

**Auth**: JWT Bearer Tokens
- Stateless authentication (12-factor compliant)
- Standard claims (sub, exp, iat)
- Future-proof for OAuth integration

**Limits** (configurable via environment):
- Max transaction amount: $10,000 USD equivalent
- Max wallet balance: $100,000 USD equivalent
- Rate limit: 100 requests/minute per wallet

**Output**: See [research.md](./research.md) for detailed analysis

## Phase 1: Design & Contracts

### Data Model

See [data-model.md](./data-model.md) for complete schema with validation rules and relationships.

**Core Entities**:
1. **wallets** table: id, user_id, balance, currency, status, created_at, updated_at, version
2. **transactions** table: id, wallet_id, related_wallet_id, type, amount, currency, status, idempotency_key, metadata, created_at
3. **outbox_events** table: id, event_type, payload, published, created_at

### API Contracts

See [contracts/openapi.yaml](./contracts/openapi.yaml) for complete OpenAPI 3.0 specification.

**Endpoints**:
- `POST /api/v1/wallets` - Create wallet
- `GET /api/v1/wallets/:id` - Get wallet details
- `GET /api/v1/wallets/:id/balance` - Get current balance
- `POST /api/v1/wallets/:id/deposit` - Deposit funds
- `POST /api/v1/wallets/:id/withdraw` - Withdraw funds
- `POST /api/v1/wallets/:id/transfer` - Transfer to another wallet
- `GET /api/v1/wallets/:id/transactions` - Get transaction history (paginated)
- `GET /api/v1/health` - Health check endpoint
- `GET /api/v1/metrics` - Prometheus metrics

**Event Schemas**: See [contracts/events.schema.json](./contracts/events.schema.json)
- `wallet.created`
- `funds.deposited`
- `funds.withdrawn`
- `funds.transfer.debited`
- `funds.transfer.credited`

### Integration Tests

Contract tests generated from OpenAPI spec (tests fail until implementation):
- One test file per endpoint in `tests/contract/`
- Integration tests per user story in `tests/integration/`

### Quickstart Guide

See [quickstart.md](./quickstart.md) for:
- Environment setup with Docker Compose
- Database migrations
- Running the service locally
- Example API calls for each user story
- Verifying event publishing
- Running tests

**Output**: data-model.md, contracts/, failing tests, quickstart.md

## Phase 2: Task Planning Approach

*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
1. Load `.specify/templates/tasks-template.md` as base structure
2. Generate Phase 1 (Setup) tasks:
   - Initialize Node.js/TypeScript project with dependencies
   - Configure ESLint, Prettier, Jest
   - Setup Docker and docker-compose
   - Initialize database schema and migrations
3. Generate Phase 2 (Foundational) tasks:
   - Database connection and repository base classes
   - Logging infrastructure with correlation IDs
   - Error handling middleware
   - Configuration management from environment
   - Health check endpoints
4. Generate tasks per user story (Phases 3-7):
   - **P1 - Create Wallet & Check Balance**:
     - Contract tests for POST /wallets, GET /wallets/:id, GET /wallets/:id/balance
     - Wallet model and repository
     - WalletService.create() and WalletService.getBalance()
     - API routes and validation
   - **P2 - Deposit Funds**:
     - Contract test for POST /wallets/:id/deposit
     - TransactionService.deposit()
     - Event publisher for funds.deposited
     - Outbox pattern implementation
   - **P3 - Withdraw Funds**:
     - Contract test for POST /wallets/:id/withdraw
     - TransactionService.withdraw()
     - Event publisher for funds.withdrawn
   - **P4 - Transfer Between Wallets**:
     - Contract test for POST /wallets/:id/transfer
     - TransactionService.transfer() with two-phase commit
     - Event publisher for transfer events
   - **P5 - Transaction History**:
     - Contract test for GET /wallets/:id/transactions
     - TransactionService.getHistory() with pagination
     - Query optimization and filtering
5. Generate Phase 8 (Polish) tasks:
   - Documentation generation from TSDoc
   - Performance testing
   - Security hardening
   - Quickstart validation

**Ordering Strategy**:
- TDD: Contract tests → Integration tests → Implementation
- Dependencies: Models → Repositories → Services → API routes
- User stories in priority order: P1 → P2 → P3 → P4 → P5
- Mark [P] for parallel tasks (different files, no dependencies)

**Estimated Output**: 40-50 numbered, ordered tasks in tasks.md organized by user story

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation

*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)
**Phase 4**: Implementation (execute tasks.md following TDD and constitutional principles)
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking

*No constitutional violations detected - this section remains empty*

## Progress Tracking

*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning approach documented (/plan command)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved (documented in research.md)
- [x] Complexity deviations documented (none)

---
*Based on Constitution v1.0.0 - See `.specify/memory/constitution.md`*
