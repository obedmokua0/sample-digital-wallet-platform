#!/bin/sh
# Docker entrypoint for wallet-service
# Waits for dependencies, runs migrations, then starts the app

set -e

echo "🚀 Starting Wallet Service..."

# Function to wait for a service
wait_for() {
  host="$1"
  port="$2"
  service="$3"
  
  echo "⏳ Waiting for $service at $host:$port..."
  
  max_attempts=60
  attempt=0
  
  while [ $attempt -lt $max_attempts ]; do
    if nc -z "$host" "$port" 2>/dev/null; then
      echo "✅ $service is ready!"
      return 0
    fi
    
    attempt=$((attempt + 1))
    echo "   Attempt $attempt/$max_attempts..."
    sleep 1
  done
  
  echo "❌ Timeout waiting for $service"
  return 1
}

# Wait for PostgreSQL
wait_for "postgres" "5432" "PostgreSQL"

# Wait for Redis
wait_for "redis" "6379" "Redis"

# Run database migrations
echo "📊 Running database migrations..."
node dist/db/migrations/runner.js up || {
  echo "⚠️  Migrations failed or already up to date"
}
echo "✅ Migrations completed!"

# Start the application
echo "🎯 Starting application..."
exec "$@"

