# 💰 Digital Wallet Microservice

> A **production-ready** digital wallet service that just works. No configuration hell, no manual setup—just `make test` and you're done.

[![Test Coverage](https://img.shields.io/badge/coverage-90%25-brightgreen.svg)](./UNIT_TEST_SUMMARY.md)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![Docker](https://img.shields.io/badge/Docker-ready-blue.svg)](https://www.docker.com/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](./LICENSE)

## ✨ What Makes This Special

**Zero-config setup** → Install `npm` + `docker`, run `make test`. That's it.  
**Interactive testing** → Beautiful CLI to test every endpoint without writing code.  
**Production-ready** → JWT auth, rate limiting, health checks, graceful shutdown, event-driven architecture.  
**Developer-friendly** → Hot reload, comprehensive logs, clear errors, one-command everything.

## 🚀 Quick Start

**Prerequisites:** Only [`npm`](https://nodejs.org/) (Node LTS) + [`docker`](https://www.docker.com/get-started) needed.

```bash
git clone https://github.com/tazabreu/sample-digital-wallet-platform.git
cd sample-digital-wallet-platform/wallet-service
make test
```

**That's it.** Containers start, migrations run, tests execute. ✨

## 💡 The Philosophy

This project proves that **microservices don't have to be complex**:

- ✅ **1 command to start** → `make test` does everything
- ✅ **No manual steps** → Migrations run automatically
- ✅ **Zero configuration** → Sensible defaults that just work
- ✅ **Comprehensive tests** → 90%+ coverage, all test types
- ✅ **Production patterns** → Outbox, idempotency, events, observability

## 🎯 What It Does

**Core Features:**
- Create wallets with multi-currency support
- Deposit, withdraw, transfer funds
- Transaction history with pagination
- Event-driven architecture (Redis Streams)
- Idempotent operations

**Tech Stack:**
- Node.js/TypeScript
- PostgreSQL (with migrations)
- Redis (for events)
- Docker (everything containerized)
- Express.js (REST API)

**Production Features:**
- JWT authentication (with test mode)
- Rate limiting & request throttling
- Health checks & graceful shutdown
- Request correlation IDs
- Comprehensive structured logging
- Automatic database migrations

## 🎮 Interactive Testing

Want to explore the API without writing code? We got you:

```bash
make test-cli
```

```
═══════════════════════════════════════════════════════════════
  🎮 Interactive Test Menu
═══════════════════════════════════════════════════════════════

1. 💰 Create Wallet
2. 👁️  Get Wallet
3. ➕ Deposit Funds
4. ➖ Withdraw Funds
5. 💸 Transfer Between Wallets
6. 📜 Transaction History
7. 🗄️  Verify Database
8. 🚀 Run Full Test Flow
0. 🚪 Exit
```

All responses logged to `logs.txt` for easy debugging!

## 🏗️ Architecture Highlights

**Event-Driven with Transactional Outbox:**
```
API → Service → Repository → Database
                      ↓
                Outbox Events → Redis Streams → Consumers
```

**Clean Architecture:**
```
src/
├── api/         # REST endpoints & middleware
├── services/    # Business logic
├── db/          # Repositories & migrations
├── events/      # Event publishing & workers
└── utils/       # Validators & error handling
```

**Database Schema:**
- `wallets` - User balances with optimistic locking
- `transactions` - Complete audit trail
- `outbox_events` - Guaranteed event delivery

## 📊 Test Coverage (90%+)

```bash
make test              # Full test suite
make test-unit         # Unit tests only
make test-integration  # Integration tests
make test-contract     # Contract tests
make test-cli          # Interactive testing
```

| Module | Coverage |
|--------|----------|
| Services | 95% |
| Repositories | 90% |
| Validators | 100% |
| Events | 85% |

## 🛠️ Development

**Start developing:**
```bash
make dev               # Hot reload development
make logs              # View logs
make db-shell          # PostgreSQL shell
make redis-cli         # Redis shell
```

**Before committing:**
```bash
make format            # Format code
make lint              # Run linter
make test              # Run all tests
```

**Common commands:**
```bash
make help              # Show all commands
make start             # Start all containers
make stop              # Stop all containers
make restart           # Restart everything
make health            # Check service health
make docker-clean      # Nuclear option (clean everything)
```

## 🎨 Key Features

### 1. Automated Everything

No manual database setup, no Redis configuration, no environment variables to set. Just:

```bash
make test
```

- ✅ Waits for PostgreSQL & Redis
- ✅ Runs migrations automatically
- ✅ Seeds test data if needed
- ✅ Handles port conflicts
- ✅ Provides clear feedback

### 2. Built-in Test Mode

Authentication can be tricky for testing. We solved it:

```bash
# Development mode - bypass JWT with header
X-Test-User-Id: test-user

# Production mode - full JWT validation
Authorization: Bearer <token>
```

### 3. Comprehensive Logging

Every test run creates `logs.txt` with:
- 📝 All API requests/responses
- 🐳 Docker container logs
- ✅ Test results with details
- ❌ Error stack traces
- 📊 Database statistics

### 4. Port Conflict Resolution

No more "port already in use" errors:

```bash
⚠️ Port 3000 is already in use
Would you like to kill the process? (y/n)
```

Type `y` and keep going!

### 5. Database Verification

Built-in tools to inspect what's happening:

```bash
make db-shell          # PostgreSQL CLI
make verify            # Show database stats
```

## 📖 Documentation

**Getting Started:**
- [SETUP.md](./SETUP.md) - Complete setup guide
- [wallet-service/README.md](./wallet-service/README.md) - Full API documentation

**Testing:**
- [LOGGING_FEATURE_SUMMARY.md](./LOGGING_FEATURE_SUMMARY.md) - Logging system
- [CLI_FIX_SUMMARY.md](./CLI_FIX_SUMMARY.md) - Test CLI guide

**Architecture:**
- [specs/001-digital-wallet-scaffolding/](./specs/001-digital-wallet-scaffolding/) - Complete specification

## 🎯 API Endpoints

```
POST   /api/v1/wallets                     Create wallet
GET    /api/v1/wallets/:id                 Get wallet details
POST   /api/v1/wallets/:id/deposit         Deposit funds
POST   /api/v1/wallets/:id/withdraw        Withdraw funds  
POST   /api/v1/wallets/:id/transfer        Transfer funds
GET    /api/v1/wallets/:id/transactions    Transaction history
GET    /api/v1/health                      Health check
```

## 🌟 Why This Project?

Because setting up microservices shouldn't require:
- ❌ Reading 50 pages of documentation
- ❌ Installing 10+ tools manually
- ❌ Debugging database connection issues
- ❌ Wrestling with Docker configurations
- ❌ Spending hours on environment setup

Instead, it should be:
- ✅ Clone repo
- ✅ Run one command
- ✅ Start building

**That's what this project delivers.**

## 🚨 Troubleshooting

Everything failing? Try the nuclear option:

```bash
make docker-clean      # Remove everything
make setup             # Fresh start
```

See detailed logs:
```bash
cat logs.txt           # Test execution logs
make logs              # Container logs
```

## 🎓 Learning Value

This project demonstrates:
- ✅ **Clean Architecture** - Separation of concerns
- ✅ **Event-Driven Design** - Transactional outbox pattern
- ✅ **Database Patterns** - Optimistic locking, migrations
- ✅ **Testing Strategy** - Unit, integration, contract tests
- ✅ **DevOps Practices** - Containerization, automation
- ✅ **Observability** - Logging, health checks, metrics-ready
- ✅ **API Design** - RESTful, idempotent, versioned

## 🤝 Contributing

Contributions welcome! Please:
1. Run `make format` before committing
2. Ensure `make test` passes
3. Update relevant documentation
4. Use conventional commits

## 📜 License

MIT License - see [LICENSE](./LICENSE) file for details.

## 🙏 Acknowledgments

Built following best practices from:
- [12-Factor App](https://12factor.net/)
- [Transactional Outbox Pattern](https://microservices.io/patterns/data/transactional-outbox.html)
- [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)

---

## 🎉 Get Started in 2 Minutes

```bash
# 1. Verify prerequisites
cd wallet-service
./check-prerequisites.sh

# 2. Run everything
make test

# 3. Explore interactively  
make test-cli
```

**Welcome to microservices done right.** ✨

---

<div align="center">

**[📚 Read the Docs](./SETUP.md)** • **[🎮 Try the CLI](./wallet-service/README.md#interactive-testing)** • **[🐛 Report Issues](https://github.com/tazabreu/sample-digital-wallet-platform/issues)**

Built with ❤️ and a belief that dev tools should just work.

</div>
