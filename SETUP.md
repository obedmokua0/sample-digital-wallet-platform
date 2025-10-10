# 🚀 Setup Guide

## Prerequisites

**You only need 2 things:**

| Tool | Version | Download |
|------|---------|----------|
| **npm** | Node.js LTS | [nodejs.org](https://nodejs.org/) |
| **docker** | Latest stable | [docker.com/get-started](https://www.docker.com/get-started) |

**That's it!** No other tools, databases, or services needed.

---

## Installation Steps

### 1. Verify Prerequisites

```bash
cd wallet-service
./check-prerequisites.sh
```

**Expected output:**
```
🔍 Checking prerequisites...

✅ npm 11.6.0 (Node v24.9.0)
   ✓ Node LTS version detected

✅ Docker 28.4.0
   ✓ Docker daemon is running

✅ docker compose 2.39.4 (plugin)

════════════════════════════════════════════════════════════════
✅ All prerequisites are installed!
```

### 2. Run Tests

```bash
make test
```

This single command will:
- ✅ Start Docker containers (PostgreSQL + Redis + App)
- ✅ Run database migrations automatically
- ✅ Execute all tests
- ✅ Show coverage report
- ✅ Keep service running for you to use

### 3. Interactive Testing (Optional)

```bash
make test-cli
```

This launches an interactive CLI where you can:
- Create wallets
- Perform transactions
- View history
- Test all endpoints manually

---

## What Gets Installed Automatically

When you run `make test` or `make start`, Docker will automatically:

1. **Pull images** (first time only):
   - `postgres:15-alpine` - Database
   - `redis:7-alpine` - Event streaming

2. **Start containers**:
   - `wallet-postgres` - PostgreSQL database
   - `wallet-redis` - Redis server
   - `wallet-service` - The wallet API

3. **Run migrations**:
   - Creates database schema
   - Sets up tables and indexes

4. **Start the service**:
   - API available at `http://localhost:3000`
   - Health check at `http://localhost:3000/api/v1/health`

**Everything is containerized** - no manual database setup, no local Redis installation, nothing!

---

## Verify Installation

### Check Service Health

```bash
curl http://localhost:3000/api/v1/health
```

**Expected response:**
```json
{
  "status": "ok",
  "timestamp": "2025-10-10T02:00:00.000Z"
}
```

### View Logs

```bash
make logs
```

### Stop Everything

```bash
make stop
```

---

## Troubleshooting

### "npm: command not found"

**Install Node.js:**
- Download from [nodejs.org](https://nodejs.org/)
- Choose the **LTS** version (recommended)
- Verify: `npm --version`

### "docker: command not found"

**Install Docker:**
- Download from [docker.com/get-started](https://www.docker.com/get-started)
- Install Docker Desktop (includes docker compose)
- Start Docker Desktop
- Verify: `docker --version`

### "Docker daemon is not running"

**Start Docker:**
- macOS/Windows: Open Docker Desktop
- Linux: `sudo systemctl start docker`

### Port Already in Use

**The CLI will detect this automatically:**
```
⚠️ Port 3000 is already in use
Would you like to kill the process? (y/n)
```

Type `y` and the CLI will clean up port conflicts for you.

Or manually:
```bash
# Find what's using the port
lsof -i :3000

# Kill the process
kill -9 <PID>
```

### Database Connection Issues

**Reset everything:**
```bash
make stop
docker system prune -f
make start
```

---

## Quick Reference

```bash
# Prerequisites
./check-prerequisites.sh      # Verify npm + docker

# Common Commands
make help                      # Show all commands
make test                      # Run all tests
make start                     # Start services
make stop                      # Stop services
make test-cli                  # Interactive testing
make logs                      # View logs
make health                    # Check service health

# Cleanup
make clean                     # Remove containers and volumes
make docker-clean              # Full Docker cleanup
```

---

## Next Steps

Once setup is complete:

1. **Read the API docs**: See [wallet-service/README.md](./wallet-service/README.md)
2. **Try interactive testing**: Run `make test-cli`
3. **Check test coverage**: See [UNIT_TEST_SUMMARY.md](./UNIT_TEST_SUMMARY.md)
4. **Review architecture**: Check [specs/](./specs/)

---

## Support

If you encounter any issues:

1. **Check logs**: `make logs` or `docker logs wallet-service`
2. **Verify prerequisites**: `./check-prerequisites.sh`
3. **Review logs.txt**: Detailed test execution logs
4. **Check container status**: `docker ps`

---

**Remember:** You only need **npm** and **docker**. Everything else is automated! 🎉

