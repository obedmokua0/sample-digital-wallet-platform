# Wallet Microservice

Digital wallet microservice with event-driven architecture, built following 12-factor app principles.

## Features

- Create and manage digital wallets with balance tracking
- Deposit and withdraw funds with validation
- Transfer funds between wallets atomically
- Transaction history with pagination and filtering
- Event-driven architecture with Redis Streams
- Idempotency support for safe retries
- JWT authentication
- Rate limiting
- Prometheus metrics

## Prerequisites

- Node.js 20 LTS
- Docker & Docker Compose
- PostgreSQL 15+
- Redis 7+

## Quick Start

See [quickstart.md](../specs/002-i-want-to/quickstart.md) for detailed setup instructions.

### 1. Install Dependencies

```bash
npm install
```

### 2. Start Infrastructure

```bash
docker-compose up -d postgres redis
```

### 3. Configure Environment

```bash
cp .env.example .env
# Edit .env with your configuration
```

### 4. Run Migrations

```bash
npm run migrate:up
```

### 5. Start Development Server

```bash
npm run dev
```

The service will be available at `http://localhost:3000`

## Development

### Build

```bash
npm run build
```

### Run Tests

```bash
# All tests
npm test

# Contract tests
npm run test:contract

# Integration tests
npm run test:integration

# Unit tests
npm run test:unit

# Watch mode
npm run test:watch
```

### Linting & Formatting

```bash
# Lint
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format
```

## API Documentation

See [contracts/openapi.yaml](../specs/002-i-want-to/contracts/openapi.yaml) for complete API specification.

Base URL: `/api/v1`

### Endpoints

- `POST /wallets` - Create wallet
- `GET /wallets/:id` - Get wallet details
- `GET /wallets/:id/balance` - Get balance
- `POST /wallets/:id/deposit` - Deposit funds
- `POST /wallets/:id/withdraw` - Withdraw funds
- `POST /wallets/:id/transfer` - Transfer funds
- `GET /wallets/:id/transactions` - Get transaction history
- `GET /health` - Health check
- `GET /health/ready` - Readiness check
- `GET /metrics` - Prometheus metrics

## Architecture

### Tech Stack

- **Runtime**: Node.js 20 LTS
- **Language**: TypeScript 5.3+
- **Framework**: Express.js 4.x
- **Database**: PostgreSQL 15+ with TypeORM
- **Events**: Redis Streams 7+
- **Logging**: Winston (structured JSON)
- **Testing**: Jest with Supertest

### Project Structure

```
src/
├── models/          # TypeORM entities
├── services/        # Business logic
├── api/             # REST API layer
│   ├── routes/      # Route handlers
│   └── middleware/  # Express middleware
├── db/              # Database layer
│   ├── migrations/  # Database migrations
│   └── repositories/ # Data access
├── events/          # Event publishing
├── config/          # Configuration
└── utils/           # Utilities

tests/
├── contract/        # API contract tests
├── integration/     # Integration tests
└── unit/            # Unit tests
```

## Event Schema

See [contracts/events.schema.json](../specs/002-i-want-to/contracts/events.schema.json) for event definitions.

Events published to Redis Stream:
- `wallet.created`
- `funds.deposited`
- `funds.withdrawn`
- `funds.transfer.debited`
- `funds.transfer.credited`

## Configuration

All configuration via environment variables (12-factor compliant).

See `.env.example` for all available variables.

## Deployment

### Docker

```bash
# Build image
docker build -t wallet-service .

# Run with docker-compose
docker-compose up
```

### Kubernetes

Dockerfile follows best practices for Kubernetes deployment:
- Multi-stage build for small image size
- Non-root user
- Proper signal handling (dumb-init)
- Health check probes

## Monitoring

### Health Checks

- Liveness: `GET /api/v1/health`
- Readiness: `GET /api/v1/health/ready` (checks DB + Redis)

### Metrics

Prometheus metrics available at `GET /api/v1/metrics`

## License

MIT

