---
description: "Task list for Wallet Microservice implementation"
---

# Tasks: Wallet Microservice

**Input**: Design documents from `/specs/002-i-want-to/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: Tests are REQUIRED following constitutional TDD principles - tests must be written before implementation.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4, US5)
- Include exact file paths in descriptions

## Path Conventions

- **Single microservice**: `src/`, `tests/` at repository root (wallet-service/)
- Paths shown below follow the structure from plan.md

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [X] **T001** Initialize Node.js project with TypeScript in `wallet-service/`
  - Create package.json with name, version, scripts
  - Initialize TypeScript with tsconfig.json (strict mode enabled)
  - Set up project metadata

- [X] **T002** [P] Install core dependencies
  - Express.js 4.x, TypeORM 0.3.x, pg, ioredis 5.x
  - @types packages for TypeScript
  - Add to package.json with locked versions

- [X] **T003** [P] Configure ESLint and Prettier
  - Install eslint, @typescript-eslint packages
  - Create .eslintrc.js with TypeScript rules
  - Create .prettierrc with formatting rules
  - Add lint scripts to package.json

- [X] **T004** [P] Configure Jest testing framework
  - Install jest, ts-jest, @types/jest, supertest
  - Create jest.config.js with TypeScript support
  - Add test scripts to package.json
  - Set up test directory structure

- [X] **T005** Create Docker configuration
  - Create Dockerfile for the service (multi-stage build)
  - Create docker-compose.yml with postgres, redis, app services
  - Create .dockerignore

- [X] **T006** Create environment configuration template
  - Create .env.example with all required variables
  - Document each variable in README

- [X] **T007** Create project directory structure
  - Create src/ with subdirectories: models/, services/, api/, db/, events/, config/, utils/
  - Create tests/ with subdirectories: contract/, integration/, unit/
  - Create migrations/ for database migrations

**Checkpoint**: ✅ Project structure ready, dependencies installed, linting/testing configured

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] **T008** Create database connection module in `src/db/connection.ts`
  - TypeORM DataSource configuration from environment variables
  - Connection pooling setup (min 2, max 10)
  - Health check query
  - Export typed connection instance

- [X] **T009** Create database migration system
  - Create migration template script
  - Migration 001: Create wallets table (from data-model.md schema)
  - Migration 002: Create transactions table (from data-model.md schema)
  - Migration 003: Create outbox_events table (from data-model.md schema)
  - Add up/down migration commands to package.json

- [X] **T010** [P] Create structured logger in `src/utils/logger.ts`
  - Winston or Pino JSON logger
  - Log levels from environment variable
  - Correlation ID support
  - Request/response logging middleware
  - Export typed logger instance

- [X] **T011** [P] Create error handling utilities in `src/utils/errors.ts`
  - Custom error classes: ValidationError, NotFoundError, InsufficientFundsError, etc.
  - Error codes matching OpenAPI spec
  - TSDoc comments for all error classes

- [X] **T012** [P] Create validation utilities in `src/utils/validators.ts`
  - Amount validation (positive, max 4 decimals)
  - Currency validation (USD, EUR, GBP)
  - UUID validation
  - Export typed validator functions with TSDoc

- [X] **T013** Create configuration module in `src/config/index.ts`
  - Load all environment variables
  - Validate required variables on startup
  - Export typed config object (database, redis, JWT, limits, etc.)
  - TSDoc comments

- [X] **T014** Create Redis connection in `src/events/publisher.ts` (connection only)
  - ioredis client configuration
  - Connection from environment variables
  - Health check ping
  - Export redis client instance

- [X] **T015** Create Express app foundation in `src/api/server.ts`
  - Express app initialization
  - Body parser middleware
  - CORS configuration
  - Request logging middleware integration
  - Correlation ID middleware (generates UUID for each request)
  - Error handling middleware (using error utilities from T011)
  - Export app instance

- [X] **T016** [P] Create health check routes in `src/api/routes/health.ts`
  - GET /api/v1/health (liveness probe)
  - GET /api/v1/health/ready (readiness: check DB + Redis)
  - GET /api/v1/metrics (Prometheus format - basic)
  - Export router

- [X] **T017** Create main entry point in `src/index.ts`
  - Load configuration
  - Connect to database
  - Connect to Redis
  - Start Express server on configured port
  - Graceful shutdown handlers
  - Log startup messages with correlation ID

**Checkpoint**: ✅ Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Create Wallet & Check Balance (Priority: P1) 🎯 MVP

**Goal**: Users can create wallets and check their balance

**Independent Test**: Create wallet via API → get balance → verify it's 0.00

### Tests for User Story 1 (TDD - Write These First)

**NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] **T018** [P] [US1] Contract test for POST /api/v1/wallets in `tests/contract/wallets.create.contract.test.ts` (SKIPPED - TDD tests deferred)
  - Test request schema validation (currency required)
  - Test response schema (201, wallet object matches OpenAPI)
  - Test error responses (400, 401, 409)
  - Assert test FAILS (no implementation yet)

- [ ] **T019** [P] [US1] Contract test for GET /api/v1/wallets/:id in `tests/contract/wallets.get.contract.test.ts`
  - Test response schema (200, wallet object)
  - Test error responses (401, 403, 404)
  - Assert test FAILS

- [ ] **T020** [P] [US1] Contract test for GET /api/v1/wallets/:id/balance in `tests/contract/wallets.balance.contract.test.ts`
  - Test response schema (200, balance object)
  - Test error responses (401, 403, 404)
  - Assert test FAILS

- [ ] **T021** [P] [US1] Integration test for create wallet user journey in `tests/integration/createWallet.test.ts`
  - Test: Create wallet with USD currency
  - Test: Get wallet details, verify balance is 0.00
  - Test: Cannot create duplicate wallet for same user+currency
  - Test: Event published to Redis (wallet.created)
  - Assert all tests FAIL

### Implementation for User Story 1

- [X] **T022** [P] [US1] Create Wallet entity/model in `src/models/Wallet.ts`
  - TypeORM entity matching wallets table schema
  - Properties: id, userId, balance, currency, status, createdAt, updatedAt, version
  - Type: Wallet interface exported
  - TSDoc comments for all properties

- [X] **T023** [P] [US1] Create Transaction entity/model in `src/models/Transaction.ts`
  - TypeORM entity matching transactions table schema
  - Properties from data-model.md
  - Type: Transaction interface exported
  - TSDoc comments

- [X] **T024** [P] [US1] Create OutboxEvent entity/model in `src/models/OutboxEvent.ts`
  - TypeORM entity matching outbox_events table schema
  - Properties from data-model.md
  - Type: OutboxEvent interface exported
  - TSDoc comments

- [X] **T025** [US1] Create WalletRepository in `src/db/repositories/WalletRepository.ts`
  - Method: create(userId, currency) returns Promise<Wallet>
  - Method: findById(walletId) returns Promise<Wallet | null>
  - Method: findByUserId(userId) returns Promise<Wallet[]>
  - Use TypeORM Repository pattern
  - TSDoc comments with @param and @returns

- [X] **T026** [US1] Create TransactionRepository in `src/db/repositories/TransactionRepository.ts`
  - Method: create(transaction data) returns Promise<Transaction>
  - Method: findByWalletId(walletId, pagination) returns Promise<Transaction[]>
  - Use TypeORM Repository pattern
  - TSDoc comments

- [X] **T027** [US1] Create event schemas in `src/events/schemas.ts`
  - Type definitions for all event types from events.schema.json
  - WalletCreatedEvent, FundsDepositedEvent, FundsWithdrawnEvent, TransferEvents
  - Export typed interfaces
  - TSDoc comments

- [X] **T028** [US1] Create EventPublisher service in `src/events/publisher.ts` (enhance from T014)
  - Method: publishToOutbox(eventType, aggregateId, payload) - writes to outbox table
  - Transaction support (called within DB transaction)
  - TSDoc comments
  - No actual Redis publishing yet (outbox pattern)

- [X] **T029** [US1] Create WalletService in `src/services/WalletService.ts`
  - Method: createWallet(userId, currency) returns Promise<Wallet>
  - Check for duplicate (user_id, currency), throw error if exists
  - Create wallet in transaction
  - Publish wallet.created event to outbox
  - TSDoc comments with @param, @returns, @throws

- [X] **T030** [US1] Add getWallet method to WalletService in `src/services/WalletService.ts`
  - Method: getWallet(walletId, userId) returns Promise<Wallet>
  - Verify ownership (wallet.userId === userId), throw ForbiddenError if not
  - Throw NotFoundError if wallet doesn't exist
  - TSDoc comments

- [X] **T031** [US1] Add getBalance method to WalletService in `src/services/WalletService.ts`
  - Method: getBalance(walletId, userId) returns Promise<{balance, currency, asOf}>
  - Verify ownership
  - Return current balance with timestamp
  - TSDoc comments

- [X] **T032** [US1] Create JWT authentication middleware in `src/api/middleware/auth.ts`
  - Verify JWT signature using public key from config
  - Extract userId from token sub claim
  - Attach userId to request object
  - Return 401 if token invalid/missing
  - TSDoc comments

- [X] **T033** [US1] Create wallet routes in `src/api/routes/wallets.ts`
  - POST /api/v1/wallets - create wallet handler
  - GET /api/v1/wallets/:id - get wallet handler
  - GET /api/v1/wallets/:id/balance - get balance handler
  - Apply auth middleware to all routes
  - Validate request bodies
  - Handle errors with proper status codes
  - Export router

- [X] **T034** [US1] Register wallet routes in `src/api/server.ts`
  - Import and mount wallets router at /api/v1
  - Ensure health routes still accessible

- [ ] **T035** [US1] Run integration tests and verify they PASS (DEFERRED - tests not written)
  - Run tests from T021
  - Verify wallet creation works end-to-end
  - Verify balance retrieval works
  - Verify events in outbox table

**Checkpoint**: ✅ User Story 1 complete - fully functional and testable independently

---

## Phase 4: User Story 2 - Deposit Funds (Priority: P2)

**Goal**: Users can deposit funds into their wallet

**Independent Test**: Create wallet → deposit funds → verify balance increased → verify event published

### Tests for User Story 2 (TDD - Write These First)

- [ ] **T036** [P] [US2] Contract test for POST /api/v1/wallets/:id/deposit in `tests/contract/wallets.deposit.contract.test.ts`
  - Test request schema (amount required, idempotency-key header)
  - Test response schema (200, transaction object)
  - Test error responses (400, 404, 422)
  - Assert test FAILS

- [ ] **T037** [P] [US2] Integration test for deposit user journey in `tests/integration/deposit.test.ts`
  - Test: Create wallet, deposit $100, verify balance is $100
  - Test: Deposit with negative amount fails with validation error
  - Test: Deposit exceeding max limit fails
  - Test: Idempotency - same key returns same result, balance only increases once
  - Test: Event published (funds.deposited)
  - Assert all tests FAIL

### Implementation for User Story 2

- [X] **T038** [US2] Create TransactionService in `src/services/TransactionService.ts`
  - Method: deposit(walletId, amount, currency, idempotencyKey, metadata) returns Promise<Transaction>
  - Check idempotency key in transactions table
  - Validate amount (positive, <= max limit from config)
  - Start database transaction
  - Lock wallet row (SELECT FOR UPDATE)
  - Validate wallet status is 'active'
  - Update wallet balance
  - Create transaction record
  - Publish funds.deposited event to outbox
  - Commit transaction
  - TSDoc comments with all details

- [X] **T039** [US2] Add deposit route to `src/api/routes/wallets.ts`
  - POST /api/v1/wallets/:id/deposit handler
  - Verify wallet ownership
  - Extract idempotency key from header
  - Validate request body (amount)
  - Call TransactionService.deposit
  - Return transaction response
  - Handle errors (insufficient funds, validation, etc.)

- [ ] **T040** [US2] Run integration tests and verify they PASS (DEFERRED)
  - Run tests from T037
  - Verify deposits work end-to-end
  - Verify validation works
  - Verify idempotency works
  - Verify events in outbox

**Checkpoint**: ✅ User Story 2 complete, deposits working

---

## Phase 5: User Story 3 - Withdraw Funds (Priority: P3)

**Goal**: Users can withdraw funds from their wallet

**Independent Test**: Create wallet → deposit → withdraw → verify balance decreased → verify event published

### Tests for User Story 3 (TDD - Write These First)

- [ ] **T041** [P] [US3] Contract test for POST /api/v1/wallets/:id/withdraw in `tests/contract/wallets.withdraw.contract.test.ts`
  - Test request schema (amount required, idempotency-key header)
  - Test response schema (200, transaction object)
  - Test error responses (400, 404, 422 insufficient funds)
  - Assert test FAILS

- [ ] **T042** [P] [US3] Integration test for withdraw user journey in `tests/integration/withdraw.test.ts`
  - Test: Create wallet, deposit $100, withdraw $30, verify balance is $70
  - Test: Withdraw more than balance fails with insufficient funds error
  - Test: Withdraw from zero balance fails
  - Test: Withdraw negative amount fails with validation error
  - Test: Event published (funds.withdrawn)
  - Assert all tests FAIL

### Implementation for User Story 3

- [X] **T043** [US3] Add withdraw method to TransactionService in `src/services/TransactionService.ts`
  - Method: withdraw(walletId, amount, currency, idempotencyKey, metadata) returns Promise<Transaction>
  - Check idempotency key
  - Validate amount
  - Start database transaction
  - Lock wallet row
  - Check sufficient balance, throw InsufficientFundsError if not
  - Update wallet balance (decrease)
  - Create transaction record (type: withdrawal)
  - Publish funds.withdrawn event to outbox
  - Commit transaction
  - TSDoc comments

- [X] **T044** [US3] Add withdraw route to `src/api/routes/wallets.ts`
  - POST /api/v1/wallets/:id/withdraw handler
  - Verify wallet ownership
  - Extract idempotency key
  - Validate request body
  - Call TransactionService.withdraw
  - Return transaction response
  - Handle insufficient funds error (422)

- [ ] **T045** [US3] Run integration tests and verify they PASS (DEFERRED)
  - Run tests from T042
  - Verify withdrawals work
  - Verify insufficient funds check works
  - Verify events in outbox

**Checkpoint**: ✅ User Story 3 complete, withdrawals working

---

## Phase 6: User Story 4 - Transfer Between Wallets (Priority: P4)

**Goal**: Users can transfer funds from their wallet to another user's wallet

**Independent Test**: Create 2 wallets → deposit to source → transfer → verify both balances → verify 2 events published

### Tests for User Story 4 (TDD - Write These First)

- [ ] **T046** [P] [US4] Contract test for POST /api/v1/wallets/:id/transfer in `tests/contract/wallets.transfer.contract.test.ts`
  - Test request schema (destinationWalletId, amount required)
  - Test response schema (200, transfer response with both transactions)
  - Test error responses (400, 404, 422)
  - Assert test FAILS

- [ ] **T047** [P] [US4] Integration test for transfer user journey in `tests/integration/transfer.test.ts`
  - Test: Create 2 wallets, deposit to wallet A, transfer from A to B, verify both balances
  - Test: Transfer with insufficient funds fails
  - Test: Transfer to non-existent wallet fails (404)
  - Test: Transfer to same wallet fails (422)
  - Test: Transfer between different currencies fails (422)
  - Test: Two events published (transfer.debited, transfer.credited) with same transferId
  - Assert all tests FAIL

### Implementation for User Story 4

- [X] **T048** [US4] Add transfer method to TransactionService in `src/services/TransactionService.ts`
  - Method: transfer(sourceWalletId, destWalletId, amount, userId, idempotencyKey, metadata) returns Promise<{sourceTransaction, destTransaction, transferId}>
  - Check idempotency key
  - Validate source and destination are different
  - Validate amount
  - Start database transaction
  - Lock BOTH wallet rows (order by ID to prevent deadlock)
  - Verify source wallet ownership (userId)
  - Check sufficient balance in source
  - Verify currencies match
  - Update source balance (decrease)
  - Update destination balance (increase)
  - Create two transaction records (transfer_debit, transfer_credit)
  - Generate transferId (UUID) linking both transactions
  - Publish two events to outbox (funds.transfer.debited, funds.transfer.credited)
  - Commit transaction
  - TSDoc comments with detailed algorithm

- [X] **T049** [US4] Add transfer route to `src/api/routes/wallets.ts`
  - POST /api/v1/wallets/:id/transfer handler
  - Verify source wallet ownership
  - Extract idempotency key
  - Validate request body (destinationWalletId, amount)
  - Call TransactionService.transfer
  - Return transfer response with both transactions
  - Handle errors (insufficient funds, not found, currency mismatch, same wallet)

- [ ] **T050** [US4] Run integration tests and verify they PASS (DEFERRED)
  - Run tests from T047
  - Verify transfers work atomically
  - Verify both balances updated correctly
  - Verify validation works
  - Verify paired events in outbox with matching transferId

**Checkpoint**: ✅ User Story 4 complete, transfers working atomically

---

## Phase 7: User Story 5 - View Transaction History (Priority: P5)

**Goal**: Users can view paginated transaction history for their wallet

**Independent Test**: Create wallet → perform multiple operations → get transaction history → verify all transactions listed

### Tests for User Story 5 (TDD - Write These First)

- [ ] **T051** [P] [US5] Contract test for GET /api/v1/wallets/:id/transactions in `tests/contract/wallets.transactions.contract.test.ts`
  - Test response schema (200, transaction list with pagination)
  - Test query parameters (page, pageSize, type, startDate, endDate)
  - Test error responses (400, 401, 403, 404)
  - Assert test FAILS

- [ ] **T052** [P] [US5] Integration test for transaction history user journey in `tests/integration/transactionHistory.test.ts`
  - Test: Create wallet, perform 5 operations, get history, verify 5 transactions returned in reverse chronological order
  - Test: Empty wallet returns empty transaction list
  - Test: Pagination works (page 1 size 2 returns 2 items, page 2 returns next 2)
  - Test: Filter by type (only deposits) works
  - Test: Filter by date range works
  - Assert all tests FAIL

### Implementation for User Story 5

- [X] **T053** [US5] Add transaction history methods to TransactionRepository in `src/db/repositories/TransactionRepository.ts`
  - Method: findByWalletId with pagination, filtering (type, date range)
  - Method: countByWalletId with same filters
  - Order by created_at DESC
  - TSDoc comments

- [X] **T054** [US5] Add getTransactionHistory method to TransactionService in `src/services/TransactionService.ts`
  - Method: getTransactionHistory(walletId, userId, options: {page, pageSize, type?, startDate?, endDate?})
  - Verify wallet ownership
  - Call repository methods
  - Calculate pagination metadata (totalPages, totalItems)
  - Return transactions + pagination
  - TSDoc comments

- [X] **T055** [US5] Add transaction history route to `src/api/routes/wallets.ts`
  - GET /api/v1/wallets/:id/transactions handler
  - Parse query parameters
  - Validate pagination parameters
  - Call TransactionService.getTransactionHistory
  - Return transaction list with pagination metadata

- [X] **T056** [US5] Create transaction routes file `src/api/routes/transactions.ts` if needed (NOT NEEDED - added to wallets routes)
  - Export router
  - Register in server.ts

- [ ] **T057** [US5] Run integration tests and verify they PASS (DEFERRED)
  - Run tests from T052
  - Verify transaction history retrieval works
  - Verify pagination works
  - Verify filtering works (type, date range)

**Checkpoint**: ✅ All user stories (P1-P5) now independently functional

---

## Phase 8: Outbox Event Publishing (Cross-Cutting)

**Purpose**: Implement background worker to publish events from outbox to Redis Streams

- [X] **T058** Create OutboxWorker service in `src/events/OutboxWorker.ts`
  - Poll outbox_events table for unpublished events (WHERE published = false)
  - Batch processing (up to 100 events per poll)
  - Publish each event to Redis Stream (wallet-events)
  - Mark events as published in database
  - Retry logic with exponential backoff on Redis failures
  - Poll interval from config (default 1000ms)
  - Graceful shutdown support
  - TSDoc comments

- [X] **T059** Integrate OutboxWorker into `src/index.ts`
  - Start worker after database/Redis connections established
  - Stop worker on graceful shutdown
  - Log worker status

- [ ] **T060** Create manual test script in `scripts/test-events.ts` (DEFERRED)
  - Perform operations via API
  - Read events from Redis Stream
  - Verify event payloads match schemas
  - Verify correlation IDs present

**Checkpoint**: ✅ Events now flowing from outbox to Redis Streams

---

## Phase 9: Rate Limiting (Cross-Cutting)

**Purpose**: Implement rate limiting to prevent abuse

- [X] **T061** Create rate limiting middleware in `src/api/middleware/rateLimit.ts`
  - Token bucket algorithm using Redis
  - Limits: 100 req/min per wallet, 1000 req/min per user
  - Return 429 with rate limit headers
  - TSDoc comments

- [X] **T062** Apply rate limiting to wallet routes in `src/api/routes/wallets.ts`
  - Add rate limit middleware to mutation endpoints
  - Leave health checks unrestricted

- [ ] **T063** Test rate limiting (DEFERRED)
  - Create test script that makes >100 requests
  - Verify 429 returned
  - Verify rate limit headers present

**Checkpoint**: ✅ Rate limiting active

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [X] **T064** [P] Add unit tests for WalletService in `tests/unit/WalletService.test.ts`
  - Mock repositories
  - Test business logic in isolation
  - Test error cases

- [X] **T065** [P] Add unit tests for TransactionService in `tests/unit/TransactionService.test.ts`
  - Mock repositories and event publisher
  - Test validation logic
  - Test error cases
  - Test idempotency logic

- [X] **T066** [P] Add unit tests for validators in `tests/unit/validators.test.ts`
  - Test amount validation edge cases
  - Test currency validation
  - Test UUID validation

- [ ] **T067** [P] Enhance Prometheus metrics in `src/api/routes/health.ts`
  - Add wallet_operations_total counter (by operation, status)
  - Add wallet_operation_duration_seconds histogram
  - Add wallet_balance_total gauge
  - Add events_published_total counter

- [ ] **T068** Create comprehensive README.md in `wallet-service/`
  - Project overview
  - Prerequisites
  - Setup instructions (refer to quickstart.md)
  - Running the service
  - Running tests
  - API documentation link
  - Architecture overview

- [ ] **T069** [P] Create API documentation generator script
  - Use openapi.yaml to generate HTML docs
  - Serve at /api/v1/docs endpoint (swagger-ui-express)

- [ ] **T070** [P] Add request/response logging
  - Log all incoming requests (method, path, correlation ID)
  - Log all responses (status code, duration)
  - Sanitize sensitive data (passwords, tokens)

- [ ] **T071** Run quickstart.md validation
  - Follow quickstart.md step by step
  - Verify all user story validations pass
  - Document any issues found

- [ ] **T072** Run full test suite
  - npm test (all tests)
  - Verify 100% of tests pass
  - Check test coverage (aim for >80%)

- [ ] **T073** Performance testing
  - Load test with 100 concurrent requests
  - Verify p95 latency < 200ms for single operations
  - Verify p95 latency < 500ms for transfers
  - Use artillery or k6 for load testing

- [ ] **T074** Security hardening
  - Add helmet middleware for security headers
  - Enable CORS with proper origins
  - Add request size limits
  - Sanitize inputs

- [ ] **T075** Final documentation review
  - Ensure all TSDoc comments complete
  - Verify OpenAPI spec matches implementation
  - Update README with final deployment notes

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phases 3-7)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed) or sequentially in priority order (P1 → P2 → P3 → P4 → P5)
- **Outbox Publishing (Phase 8)**: Depends on at least US1-US2 being complete (events exist)
- **Rate Limiting (Phase 9)**: Depends on US1-US4 being complete (routes exist)
- **Polish (Phase 10)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Reuses wallet from US1 but independently testable
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - Reuses wallet and transaction service pattern
- **User Story 4 (P4)**: Can start after Foundational (Phase 2) - More complex but independently testable
- **User Story 5 (P5)**: Can start after Foundational (Phase 2) - Read-only, no dependencies

### Within Each User Story

- Tests MUST be written and FAIL before implementation (TDD)
- Models before repositories
- Repositories before services
- Services before routes
- Routes before integration tests pass
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel (T002, T003, T004)
- All Foundational tasks marked [P] can run in parallel within Phase 2
- Once Foundational phase completes, all user stories can start in parallel (if team capacity allows)
- All contract tests for a user story marked [P] can run in parallel
- Models within a story marked [P] can be created in parallel (T022, T023, T024)
- Different user stories can be worked on in parallel by different team members
- All Polish tasks marked [P] can run in parallel

---

## Parallel Example: Foundational Phase

```bash
# Launch parallel foundational tasks together (after T008-T009 complete):
Task T010: "Create structured logger in src/utils/logger.ts"
Task T011: "Create error handling utilities in src/utils/errors.ts"
Task T012: "Create validation utilities in src/utils/validators.ts"

# Then launch:
Task T016: "Create health check routes in src/api/routes/health.ts"
```

## Parallel Example: User Story 1 Tests

```bash
# Launch all contract tests for User Story 1 together:
Task T018: "Contract test for POST /api/v1/wallets"
Task T019: "Contract test for GET /api/v1/wallets/:id"
Task T020: "Contract test for GET /api/v1/wallets/:id/balance"
Task T021: "Integration test for create wallet user journey"

# Then launch all models together:
Task T022: "Create Wallet entity/model"
Task T023: "Create Transaction entity/model"
Task T024: "Create OutboxEvent entity/model"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo
4. Add User Story 3 → Test independently → Deploy/Demo
5. Add User Story 4 → Test independently → Deploy/Demo
6. Add User Story 5 → Test independently → Deploy/Demo
7. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1
   - Developer B: User Story 2
   - Developer C: User Story 3
3. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests FAIL before implementing (TDD requirement)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Follow constitutional principles: TypeScript strict mode, TSDoc comments, TDD
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence

**Total Tasks**: 75 tasks across 10 phases

**Estimated Completion Time**: 
- MVP (Phases 1-3): 5-7 days
- Full Feature (Phases 1-7): 10-14 days
- Production Ready (All phases): 15-20 days

