.PHONY: help install build test test-cli test-unit test-integration test-contract clean start stop restart logs ps migrate-up migrate-down docker-build docker-clean lint format

# Default target
.DEFAULT_GOAL := help

# Colors for output
BLUE := \033[0;34m
GREEN := \033[0;32m
YELLOW := \033[0;33m
RED := \033[0;31m
NC := \033[0m # No Color

help: ## Show this help message
	@echo "$(BLUE)━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━$(NC)"
	@echo "$(BLUE)  Wallet Service - Available Commands$(NC)"
	@echo "$(BLUE)━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━$(NC)"
	@echo ""
	@echo "$(YELLOW)  Prerequisites: npm (Node LTS) + docker$(NC)"
	@echo "  Run '$(GREEN)make check-prereqs$(NC)' to verify"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(GREEN)%-20s$(NC) %s\n", $$1, $$2}'
	@echo ""

check-prereqs: ## Verify npm and docker are installed
	@./check-prerequisites.sh

install: ## Install dependencies
	@echo "$(BLUE)📦 Installing dependencies...$(NC)"
	npm install
	@echo "$(GREEN)✅ Dependencies installed!$(NC)"

build: ## Build TypeScript
	@echo "$(BLUE)🔨 Building TypeScript...$(NC)"
	npm run build
	@echo "$(GREEN)✅ Build complete!$(NC)"

test: ## Run all tests (starts containers, runs tests, shows coverage)
	@echo "$(BLUE)🧪 Running full test suite...$(NC)"
	@$(MAKE) start
	@sleep 5
	@npm test || (echo "$(RED)❌ Tests failed$(NC)" && exit 1)
	@echo "$(GREEN)✅ All tests passed!$(NC)"

test-cli: ## Run integration test CLI (interactive)
	@echo "$(BLUE)🎮 Starting interactive test CLI...$(NC)"
	@npx ts-node test-cli.ts

test-cli-full: ## Run full integration test flow
	@echo "$(BLUE)🚀 Running complete integration test flow...$(NC)"
	@npx ts-node test-cli.ts full-flow

test-unit: ## Run unit tests only
	@echo "$(BLUE)🧪 Running unit tests...$(NC)"
	@npm run test:unit

test-integration: ## Run integration tests only
	@echo "$(BLUE)🔄 Running integration tests...$(NC)"
	@npm run test:integration

test-contract: ## Run contract tests only
	@echo "$(BLUE)📋 Running contract tests...$(NC)"
	@npm run test:contract

lint: ## Run linter
	@echo "$(BLUE)🔍 Running linter...$(NC)"
	@npm run lint

lint-fix: ## Run linter with auto-fix
	@echo "$(BLUE)🔧 Running linter with auto-fix...$(NC)"
	@npm run lint:fix

format: ## Format code with Prettier
	@echo "$(BLUE)✨ Formatting code...$(NC)"
	@npm run format

start: ## Start all Docker containers
	@echo "$(BLUE)🐳 Starting Docker containers...$(NC)"
	docker-compose up -d
	@echo "$(GREEN)✅ Containers started!$(NC)"
	@echo "$(YELLOW)⏳ Waiting for services to be healthy...$(NC)"
	@sleep 5
	@$(MAKE) ps

stop: ## Stop all Docker containers
	@echo "$(BLUE)🛑 Stopping Docker containers...$(NC)"
	docker-compose down
	@echo "$(GREEN)✅ Containers stopped!$(NC)"

restart: ## Restart all Docker containers
	@echo "$(BLUE)🔄 Restarting Docker containers...$(NC)"
	@$(MAKE) stop
	@$(MAKE) start

logs: ## Show logs from all containers
	@echo "$(BLUE)📋 Container logs:$(NC)"
	docker-compose logs -f

logs-app: ## Show logs from wallet-service only
	@echo "$(BLUE)📋 Wallet service logs:$(NC)"
	docker logs -f wallet-service

ps: ## Show running containers
	@echo "$(BLUE)📊 Running containers:$(NC)"
	@docker-compose ps

migrate-up: ## Run database migrations (requires containers to be running)
	@echo "$(BLUE)📊 Running database migrations...$(NC)"
	@docker exec wallet-service node /app/dist/db/migrations/runner.js up
	@echo "$(GREEN)✅ Migrations complete!$(NC)"

migrate-down: ## Rollback last migration (requires containers to be running)
	@echo "$(YELLOW)⚠️  Rolling back last migration...$(NC)"
	@docker exec wallet-service node /app/dist/db/migrations/runner.js down
	@echo "$(GREEN)✅ Rollback complete!$(NC)"

docker-build: ## Build Docker image
	@echo "$(BLUE)🐳 Building Docker image...$(NC)"
	docker-compose build
	@echo "$(GREEN)✅ Docker image built!$(NC)"

docker-rebuild: ## Rebuild Docker image from scratch (no cache)
	@echo "$(BLUE)🐳 Rebuilding Docker image (no cache)...$(NC)"
	docker-compose build --no-cache
	@echo "$(GREEN)✅ Docker image rebuilt!$(NC)"

docker-clean: ## Remove all containers, volumes, and images
	@echo "$(YELLOW)⚠️  Cleaning up Docker resources...$(NC)"
	docker-compose down -v --rmi all
	@echo "$(GREEN)✅ Docker cleanup complete!$(NC)"

clean: ## Clean build artifacts and dependencies
	@echo "$(BLUE)🧹 Cleaning up...$(NC)"
	rm -rf dist node_modules coverage
	@echo "$(GREEN)✅ Cleanup complete!$(NC)"

dev: ## Start development server with hot reload
	@echo "$(BLUE)🔥 Starting development server...$(NC)"
	npm run dev

health: ## Check service health
	@echo "$(BLUE)🏥 Checking service health...$(NC)"
	@curl -s http://localhost:3000/api/v1/health | json_pp || echo "$(RED)❌ Service not responding$(NC)"

db-shell: ## Open PostgreSQL shell
	@echo "$(BLUE)💻 Opening database shell...$(NC)"
	@docker exec -it wallet-postgres psql -U wallet_user -d wallet_dev

redis-cli: ## Open Redis CLI
	@echo "$(BLUE)💻 Opening Redis CLI...$(NC)"
	@docker exec -it wallet-redis redis-cli

shell: ## Open shell in wallet-service container
	@echo "$(BLUE)💻 Opening container shell...$(NC)"
	@docker exec -it wallet-service sh

coverage: ## Show test coverage report
	@echo "$(BLUE)📊 Generating coverage report...$(NC)"
	@npm test -- --coverage
	@echo "$(GREEN)✅ Coverage report generated!$(NC)"
	@echo "$(BLUE)📁 Open coverage/lcov-report/index.html to view detailed report$(NC)"

setup: ## Initial setup (install + build + start)
	@echo "$(BLUE)🚀 Initial setup...$(NC)"
	@$(MAKE) install
	@$(MAKE) build
	@$(MAKE) docker-build
	@$(MAKE) start
	@sleep 10
	@echo "$(BLUE)📊 Verifying migrations...$(NC)"
	@$(MAKE) migrate-up || echo "$(YELLOW)⚠️  Migrations may have already run$(NC)"
	@echo "$(GREEN)✅ Setup complete! Wallet service is ready.$(NC)"

quick-test: ## Quick test (assumes containers are running)
	@echo "$(BLUE)⚡ Quick test...$(NC)"
	@npm run test:unit
	@echo "$(GREEN)✅ Quick test complete!$(NC)"

full-test: ## Full test suite with fresh containers
	@echo "$(BLUE)🚀 Full test suite...$(NC)"
	@$(MAKE) stop
	@$(MAKE) docker-build
	@$(MAKE) start
	@sleep 10
	@npm test
	@$(MAKE) test-cli-full
	@echo "$(GREEN)✅ Full test suite complete!$(NC)"

verify: ## Verify installation and setup
	@echo "$(BLUE)🔍 Verifying installation...$(NC)"
	@command -v node >/dev/null 2>&1 || (echo "$(RED)❌ Node.js not installed$(NC)" && exit 1)
	@command -v npm >/dev/null 2>&1 || (echo "$(RED)❌ npm not installed$(NC)" && exit 1)
	@command -v docker >/dev/null 2>&1 || (echo "$(RED)❌ Docker not installed$(NC)" && exit 1)
	@command -v docker-compose >/dev/null 2>&1 || (echo "$(RED)❌ docker-compose not installed$(NC)" && exit 1)
	@echo "$(GREEN)✅ All prerequisites installed!$(NC)"
	@node --version
	@npm --version
	@docker --version
	@docker-compose --version

