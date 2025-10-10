#!/bin/bash
# Prerequisites Checker for Digital Wallet Service
# Verifies that npm and docker are installed with correct versions

set -e

echo "🔍 Checking prerequisites..."
echo ""

ERRORS=0

# Check Node.js/npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed"
    echo "   Please install Node.js LTS from: https://nodejs.org/"
    ERRORS=$((ERRORS + 1))
else
    NPM_VERSION=$(npm --version)
    NODE_VERSION=$(node --version)
    echo "✅ npm $NPM_VERSION (Node $NODE_VERSION)"
    
    # Check if it's an LTS version (even major number)
    NODE_MAJOR=$(echo "$NODE_VERSION" | cut -d'.' -f1 | tr -d 'v')
    if [ $((NODE_MAJOR % 2)) -eq 0 ]; then
        echo "   ✓ Node LTS version detected"
    else
        echo "   ⚠️  Warning: Consider using Node LTS (even major version)"
    fi
fi

echo ""

# Check Docker
if ! command -v docker &> /dev/null; then
    echo "❌ docker is not installed"
    echo "   Please install Docker from: https://www.docker.com/get-started"
    ERRORS=$((ERRORS + 1))
else
    DOCKER_VERSION=$(docker --version | cut -d' ' -f3 | tr -d ',')
    echo "✅ Docker $DOCKER_VERSION"
    
    # Check if Docker daemon is running
    if ! docker info &> /dev/null; then
        echo "   ❌ Docker daemon is not running"
        echo "   Please start Docker Desktop or the Docker service"
        ERRORS=$((ERRORS + 1))
    else
        echo "   ✓ Docker daemon is running"
    fi
fi

echo ""

# Check docker-compose (bundled with Docker Desktop)
if ! docker compose version &> /dev/null; then
    echo "⚠️  docker compose (plugin) not found, trying docker-compose..."
    if ! command -v docker-compose &> /dev/null; then
        echo "❌ docker-compose is not available"
        echo "   Modern Docker includes 'docker compose' by default"
        echo "   Please update Docker to the latest version"
        ERRORS=$((ERRORS + 1))
    else
        COMPOSE_VERSION=$(docker-compose --version | cut -d' ' -f4 | tr -d ',')
        echo "✅ docker-compose $COMPOSE_VERSION (standalone)"
    fi
else
    COMPOSE_VERSION=$(docker compose version --short)
    echo "✅ docker compose $COMPOSE_VERSION (plugin)"
fi

echo ""
echo "════════════════════════════════════════════════════════════════"

if [ $ERRORS -eq 0 ]; then
    echo "✅ All prerequisites are installed!"
    echo ""
    echo "📚 Quick Start:"
    echo "   cd wallet-service"
    echo "   make test          # Run all tests"
    echo "   make test-cli      # Interactive testing"
    echo "   make help          # See all commands"
    echo ""
    exit 0
else
    echo "❌ Missing $ERRORS required prerequisite(s)"
    echo ""
    echo "📋 Required:"
    echo "   • npm (Node.js LTS) - https://nodejs.org/"
    echo "   • docker (Latest)   - https://www.docker.com/get-started"
    echo ""
    exit 1
fi

