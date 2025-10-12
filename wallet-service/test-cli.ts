#!/usr/bin/env ts-node
/**
 * Digital Wallet Service Interactive Testing Tool
 * A beautiful CLI application for testing the wallet service end-to-end with Docker container management.
 */

import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import Table from 'cli-table3';
import ora from 'ora';
import axios, { AxiosResponse } from 'axios';
import { Pool } from 'pg';
import { execSync } from 'child_process';
import * as fs from 'fs';

// ============================================================================
// Configuration
// ============================================================================

const WALLET_SERVICE_URL = process.env.WALLET_SERVICE_URL || 'http://localhost:3000';
const POSTGRES_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'wallet_dev',  // Fixed: was wallet_db
  user: process.env.DB_USER || 'wallet_user',
  password: process.env.DB_PASSWORD || 'wallet_pass',  // Fixed: was wallet_password
};

const DOCKER_COMPOSE_FILE = 'docker-compose.yml';
const DOCKER_PROJECT_NAME = 'sample-digital-wallet-platform';
const LOG_FILE = 'logs.txt';

// Required ports for the application
const REQUIRED_PORTS = [
  { port: 3000, service: 'Wallet Service' },
  { port: 5432, service: 'PostgreSQL' },
  { port: 6379, service: 'Redis' },
];

// ============================================================================
// Global State
// ============================================================================

interface TestResult {
  test: string;
  status: 'success' | 'failed' | 'skipped';
  details?: string;
}

interface TestContext {
  walletIds: string[];
  transactionIds: string[];
  results: TestResult[];
  sessionId: string;
  walletUserMap: Map<string, string>; // Maps walletId to userId
}

const ctx: TestContext = {
  walletIds: [],
  transactionIds: [],
  results: [],
  sessionId: `test-session-${Date.now()}`,
  walletUserMap: new Map(),
};

let containersInitialized = false;
let cleanupOnExit = true;

// ============================================================================
// Utility Functions
// ============================================================================

function printHeader(title: string, subtitle?: string): void {
  console.log('\n');
  console.log(chalk.cyan.bold('═'.repeat(80)));
  console.log(chalk.cyan.bold(`  ${title}`));
  if (subtitle) {
    console.log(chalk.dim(`  ${subtitle}`));
  }
  console.log(chalk.cyan.bold('═'.repeat(80)));
  console.log('\n');
}

function printStep(step: string, status: 'info' | 'success' | 'error' | 'warning' = 'info'): void {
  const emoji = {
    info: '🔍',
    success: '✅',
    error: '❌',
    warning: '⚠️',
  }[status];

  const color = {
    info: chalk.cyan,
    success: chalk.green,
    error: chalk.red,
    warning: chalk.yellow,
  }[status];

  console.log(color(`${emoji} ${step}`));
}

function printResult(name: string, value: any, success: boolean = true, indent: number = 1): void {
  const color = success ? chalk.green : chalk.red;
  const prefix = '  '.repeat(indent) + '└─';
  console.log(`${prefix} ${chalk.bold(name)}: ${color(value)}`);
}

// ============================================================================
// Logging Functions
// ============================================================================

function initializeLogFile(): void {
  const timestamp = new Date().toISOString();
  const header = `
${'='.repeat(80)}
Wallet Service Test CLI - Log File
Started: ${timestamp}
${'='.repeat(80)}

`;
  fs.writeFileSync(LOG_FILE, header);
  console.log(chalk.dim(`  📝 Logs will be written to: ${LOG_FILE}`));
}

function writeToLog(message: string): void {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${message}\n`;
  fs.appendFileSync(LOG_FILE, logEntry);
}

function captureContainerLogs(): void {
  try {
    writeToLog('\n' + '='.repeat(80));
    writeToLog('CONTAINER LOGS SNAPSHOT');
    writeToLog('='.repeat(80));
    
    const containers = ['wallet-service', 'wallet-postgres', 'wallet-redis'];
    
    for (const container of containers) {
      writeToLog(`\n--- ${container.toUpperCase()} LOGS ---`);
      try {
        const logs = execSync(`docker logs ${container} --tail 100 2>&1`, { 
          encoding: 'utf-8',
          maxBuffer: 10 * 1024 * 1024 // 10MB buffer
        });
        writeToLog(logs);
      } catch (error: any) {
        writeToLog(`Error capturing logs for ${container}: ${error.message}`);
      }
    }
    
    writeToLog('\n' + '='.repeat(80));
    writeToLog('END OF CONTAINER LOGS');
    writeToLog('='.repeat(80) + '\n');
  } catch (error: any) {
    writeToLog(`Error in captureContainerLogs: ${error.message}`);
  }
}

function logTestResult(testName: string, status: 'success' | 'failed' | 'skipped', details?: string): void {
  const statusEmoji = status === 'success' ? '✅' : status === 'failed' ? '❌' : '⏭️';
  let logMessage = `${statusEmoji} Test: ${testName} - Status: ${status.toUpperCase()}`;
  if (details) {
    logMessage += ` - Details: ${details}`;
  }
  writeToLog(logMessage);
}

async function apiCall<T = any>(
  method: string,
  path: string,
  data?: any,
  expectedStatus?: number,
  userId?: string
): Promise<{ response: AxiosResponse<T>; success: boolean }> {
  try {
    const url = `${WALLET_SERVICE_URL}${path}`;
    
    // Build headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    // Add X-Test-User-Id header for test mode (development environment)
    // This bypasses JWT authentication in development
    if (userId) {
      headers['X-Test-User-Id'] = userId;
    }
    
    // For idempotency-required endpoints (deposit, withdraw, transfer)
    if (path.includes('/deposit') || path.includes('/withdraw') || path.includes('/transfer')) {
      headers['Idempotency-Key'] = `idem-${Date.now()}-${Math.random()}`;
    }
    
    // Log the request
    writeToLog(`\n>>> API Request: ${method} ${path}`);
    if (userId) {
      writeToLog(`    User-Id: ${userId}`);
    }
    if (data) {
      writeToLog(`    Body: ${JSON.stringify(data, null, 2)}`);
    }
    
    const response = await axios({
      method,
      url,
      data,
      headers,
      validateStatus: () => true, // Don't throw on any status
    });

    const success = expectedStatus
      ? response.status === expectedStatus
      : response.status >= 200 && response.status < 300;

    // Log the response
    writeToLog(`<<< API Response: ${response.status} ${response.statusText}`);
    if (response.data) {
      writeToLog(`    Response: ${JSON.stringify(response.data, null, 2)}`);
    }
    if (!success) {
      writeToLog(`    ⚠️ Request failed! Expected: ${expectedStatus || '2xx'}, Got: ${response.status}`);
    }

    return { response, success };
  } catch (error: any) {
    writeToLog(`❌ API Call Error: ${error.message}`);
    throw error;
  }
}

function showResponse(response: AxiosResponse, success: boolean = true): void {
  const statusColor = success ? chalk.green : chalk.red;
  console.log(`  ${chalk.bold('Status Code')}: ${statusColor(response.status)}`);

  if (response.data) {
    const json = JSON.stringify(response.data, null, 2);
    const lines = json.split('\n');
    console.log(chalk.dim('  Response:'));
    lines.forEach((line) => console.log(chalk.dim(`    ${line}`)));
  }
}

function runCommand(command: string, cwd?: string): { code: number; stdout: string; stderr: string } {
  try {
    const result = execSync(command, {
      cwd: cwd || process.cwd(),
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return { code: 0, stdout: result, stderr: '' };
  } catch (error: any) {
    return {
      code: error.status || 1,
      stdout: error.stdout || '',
      stderr: error.stderr || '',
    };
  }
}

// ============================================================================
// Port Management
// ============================================================================

interface PortInfo {
  port: number;
  service: string;
  pid?: string;
  processName?: string;
}

/**
 * Check if a port is in use and get process info
 */
function checkPort(port: number): { inUse: boolean; pid?: string; processName?: string } {
  try {
    // Use lsof to check if port is in use (works on macOS and Linux)
    const result = execSync(`lsof -i :${port} -t`, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
    const pid = result.trim().split('\n')[0]; // Get first PID if multiple
    
    if (pid) {
      // Get process name
      try {
        const psResult = execSync(`ps -p ${pid} -o comm=`, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
        const processName = psResult.trim();
        return { inUse: true, pid, processName };
      } catch {
        return { inUse: true, pid };
      }
    }
    
    return { inUse: false };
  } catch (error) {
    // lsof returns non-zero exit code if port is not in use
    return { inUse: false };
  }
}

/**
 * Kill a process by PID
 */
function killProcess(pid: string): boolean {
  try {
    execSync(`kill -9 ${pid}`, { stdio: 'ignore' });
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Check all required ports and handle conflicts
 */
async function checkAndHandlePortConflicts(): Promise<boolean> {
  const blockedPorts: PortInfo[] = [];

  // Check each required port
  for (const { port, service } of REQUIRED_PORTS) {
    const portCheck = checkPort(port);
    if (portCheck.inUse) {
      blockedPorts.push({
        port,
        service,
        pid: portCheck.pid,
        processName: portCheck.processName,
      });
    }
  }

  // If no ports are blocked, continue
  if (blockedPorts.length === 0) {
    return true;
  }

  // Display blocked ports
  console.log('\n');
  console.log(chalk.yellow.bold('⚠️  Port Conflicts Detected'));
  console.log(chalk.dim('The following ports are already in use:\n'));

  const table = new Table({
    head: ['Port', 'Service', 'PID', 'Process'],
    style: { head: ['yellow'] },
  });

  blockedPorts.forEach((info) => {
    table.push([
      info.port.toString(),
      info.service,
      info.pid || 'Unknown',
      info.processName || 'Unknown',
    ]);
  });

  console.log(table.toString());
  console.log();

  // Prompt user to kill processes
  const { shouldKill } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'shouldKill',
      message: `Kill ${blockedPorts.length} process(es) to free up ports?`,
      default: true,
    },
  ]);

  if (!shouldKill) {
    console.log(chalk.yellow('\n⚠️  Cannot start containers with blocked ports.'));
    console.log(chalk.dim('Please manually stop the processes or choose different ports.\n'));
    return false;
  }

  // Kill processes
  console.log();
  const spinner = ora('Killing processes...').start();
  
  let successCount = 0;
  let failCount = 0;

  for (const info of blockedPorts) {
    if (info.pid) {
      if (killProcess(info.pid)) {
        successCount++;
        spinner.text = `Killed process ${info.pid} on port ${info.port}`;
      } else {
        failCount++;
        spinner.text = `Failed to kill process ${info.pid} on port ${info.port}`;
      }
      // Small delay to let the port be released
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  spinner.stop();

  if (failCount > 0) {
    console.log(chalk.yellow(`\n⚠️  Killed ${successCount}/${blockedPorts.length} processes`));
    console.log(chalk.dim('Some processes could not be killed. You may need to kill them manually.\n'));
    
    // Ask if user wants to continue anyway
    const { continueAnyway } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'continueAnyway',
        message: 'Continue anyway?',
        default: false,
      },
    ]);
    
    return continueAnyway;
  }

  console.log(chalk.green(`\n✅ Successfully killed ${successCount} process(es)`));
  console.log(chalk.dim('Ports are now available.\n'));
  
  // Wait a bit more for ports to be fully released
  await new Promise((resolve) => setTimeout(resolve, 1000));
  
  return true;
}

// ============================================================================
// Docker Management
// ============================================================================

async function startContainers(forceBuild: boolean = false): Promise<void> {
  printHeader('🐳 Starting Docker Containers', 'Launching infrastructure and services');

  printStep('Checking Docker daemon...');
  const dockerCheck = runCommand('docker info');
  if (dockerCheck.code !== 0) {
    printStep('Docker daemon is not running. Please start Docker.', 'error');
    process.exit(1);
  }
  printStep('Docker daemon is running', 'success');

  // Check for port conflicts before starting containers
  printStep('Checking required ports...');
  const canProceed = await checkAndHandlePortConflicts();
  if (!canProceed) {
    printStep('Cannot proceed due to port conflicts', 'error');
    process.exit(1);
  }
  printStep('All required ports are available', 'success');

  printStep('Cleaning up existing containers...');
  runCommand(`docker-compose -f ${DOCKER_COMPOSE_FILE} -p ${DOCKER_PROJECT_NAME} down`);

  printStep('Starting containers with docker-compose...');
  const spinner = ora('Building and starting containers...').start();

  const buildFlag = forceBuild ? '--build' : '';
  const result = runCommand(
    `docker-compose -f ${DOCKER_COMPOSE_FILE} -p ${DOCKER_PROJECT_NAME} up -d ${buildFlag}`
  );

  spinner.stop();

  if (result.code !== 0) {
    printStep(`Failed to start containers: ${result.stderr}`, 'error');
    process.exit(1);
  }

  printStep('Containers started successfully', 'success');
  containersInitialized = true;

  await waitForServices();
}

async function stopContainers(): Promise<void> {
  printHeader('🛑 Stopping Docker Containers');

  printStep('Stopping containers...');
  const result = runCommand(`docker-compose -f ${DOCKER_COMPOSE_FILE} -p ${DOCKER_PROJECT_NAME} down`);

  if (result.code === 0) {
    printStep('Containers stopped successfully', 'success');
  } else {
    printStep(`Failed to stop containers: ${result.stderr}`, 'error');
  }

  containersInitialized = false;
}

async function checkContainersHealth(): Promise<boolean> {
  const result = runCommand(`docker-compose -f ${DOCKER_COMPOSE_FILE} -p ${DOCKER_PROJECT_NAME} ps`);
  return result.code === 0 && result.stdout.includes('Up');
}

async function waitForServices(maxWait: number = 120): Promise<void> {
  const spinner = ora('Waiting for wallet service to be ready...').start();
  const startTime = Date.now();

  while (Date.now() - startTime < maxWait * 1000) {
    try {
      const { response } = await apiCall('GET', '/api/v1/health');
      if (response.status === 200 && response.data?.status === 'ok') {
        spinner.succeed('Wallet service is ready ✓');
        return;
      }
    } catch (error) {
      // Service not ready yet
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  spinner.fail('Service did not become healthy in time');
}

async function ensureContainersStarted(forceBuild: boolean = false): Promise<void> {
  if (forceBuild) {
    printStep('Force rebuild requested. Restarting containers...', 'info');
    await startContainers(true);
    return;
  }

  if (containersInitialized) {
    return;
  }

  if (await checkContainersHealth()) {
    printStep('All required containers are running and healthy', 'success');
    containersInitialized = true;
    return;
  }

  await startContainers(false);
}

// ============================================================================
// Database Cleanup & Reset Functions
// ============================================================================

async function cleanupTestData(): Promise<void> {
  writeToLog('\n🧹 Cleaning up test data...');
  const spinner = ora('Cleaning up test wallets and transactions...').start();
  
  try {
    const pool = new Pool(POSTGRES_CONFIG);
    
    // Delete wallets for common test users
    const testUsers = ['alice@example.com', 'bob@example.com', 'test_user', 'test-user'];
    
    // Also add any users from the current test session
    const sessionUsers = Array.from(ctx.walletUserMap.values());
    const allTestUsers = [...new Set([...testUsers, ...sessionUsers])];
    
    for (const userId of allTestUsers) {
      // Delete transactions first (foreign key constraint)
      await pool.query('DELETE FROM transactions WHERE wallet_id IN (SELECT id FROM wallets WHERE user_id = $1)', [userId]);
      // Delete outbox events
      await pool.query('DELETE FROM outbox_events WHERE aggregate_id IN (SELECT id FROM wallets WHERE user_id = $1)', [userId]);
      // Delete wallets
      const result = await pool.query('DELETE FROM wallets WHERE user_id = $1', [userId]);
      if (result.rowCount && result.rowCount > 0) {
        writeToLog(`  Deleted ${result.rowCount} wallet(s) for user: ${userId}`);
      }
    }
    
    await pool.end();
    spinner.succeed('Test data cleaned up successfully');
    writeToLog('✅ Cleanup completed');
    
    // Reset context
    ctx.walletIds = [];
    ctx.transactionIds = [];
    ctx.walletUserMap.clear();
    
  } catch (error: any) {
    spinner.fail('Failed to clean up test data');
    writeToLog(`❌ Cleanup error: ${error.message}`);
    console.log(chalk.yellow(`\n⚠️  Cleanup warning: ${error.message}\n`));
  }
}

async function getDatabaseStats(): Promise<void> {
  printStep('Fetching database statistics...');
  
  try {
    const pool = new Pool(POSTGRES_CONFIG);
    
    const walletsResult = await pool.query('SELECT COUNT(*) as count FROM wallets');
    const transactionsResult = await pool.query('SELECT COUNT(*) as count FROM transactions');
    const outboxResult = await pool.query('SELECT COUNT(*) as count FROM outbox_events');
    
    await pool.end();
    
    printResult('Total Wallets', walletsResult.rows[0].count, true);
    printResult('Total Transactions', transactionsResult.rows[0].count, true);
    printResult('Total Outbox Events', outboxResult.rows[0].count, true);
    
    writeToLog(`Database Stats - Wallets: ${walletsResult.rows[0].count}, Transactions: ${transactionsResult.rows[0].count}, Events: ${outboxResult.rows[0].count}`);
    
  } catch (error: any) {
    printStep(`Failed to fetch database stats: ${error.message}`, 'error');
    writeToLog(`❌ Database stats error: ${error.message}`);
  }
}

// ============================================================================
// Test Implementations
// ============================================================================

async function testHealth(): Promise<void> {
  printHeader('🏥 Health Check');

  printStep('Checking wallet service health...');
  try {
    const { response } = await apiCall('GET', '/api/v1/health');
    if (response.status === 200) {
      printResult('Status', response.data?.status || 'UNKNOWN', response.data?.status === 'ok');
      printResult('Uptime', response.data?.uptime || 'N/A');
      printResult('Timestamp', response.data?.timestamp || 'N/A');
      ctx.results.push({ test: 'health_check', status: 'success' });
    } else {
      printStep(`Health check failed: ${response.status}`, 'error');
      ctx.results.push({ test: 'health_check', status: 'failed' });
    }
  } catch (error) {
    printStep(`Health check failed: ${error}`, 'error');
    ctx.results.push({ test: 'health_check', status: 'failed' });
  }
}

async function testCreateWallet(userId?: string): Promise<string | null> {
  const actualUserId = userId || `user-${Date.now()}`;
  printStep(`Creating wallet for user: ${actualUserId}...`);

  // Wallet API expects only currency in the request body
  // The userId comes from the X-Test-User-Id header (test mode)
  const walletData = {
    currency: 'USD',
  };

  try {
    const { response, success } = await apiCall('POST', '/api/v1/wallets', walletData, 201, actualUserId);
    showResponse(response, success);

    if (success && response.data?.id) {
      const walletId = response.data.id;
      ctx.walletIds.push(walletId);
      ctx.walletUserMap.set(walletId, actualUserId); // Store wallet-user mapping
      printResult('Wallet ID', walletId, true);
      printResult('User ID', response.data.userId, true);
      printResult('Balance', `$${response.data.balance}`, true);
      printResult('Currency', response.data.currency, true);
      ctx.results.push({ test: 'create_wallet', status: 'success' });
      return walletId;
    } else {
      printStep(`Wallet creation failed: ${response.status}`, 'error');
      ctx.results.push({ test: 'create_wallet', status: 'failed', details: `Status: ${response.status}` });
      return null;
    }
  } catch (error: any) {
    printStep(`Wallet creation error: ${error}`, 'error');
    ctx.results.push({ test: 'create_wallet', status: 'failed', details: error.message });
    return null;
  }
}

async function testGetWallet(walletId: string, userId?: string): Promise<void> {
  printStep(`Retrieving wallet ${walletId}...`);

  try {
    // Use the userId if provided, otherwise lookup from wallet context
    const authUserId = userId || ctx.walletUserMap.get(walletId) || 'test-user';
    const { response, success } = await apiCall('GET', `/api/v1/wallets/${walletId}`, undefined, undefined, authUserId);
    showResponse(response, success);

    if (success) {
      printResult('Wallet ID', response.data?.id);
      printResult('User ID', response.data?.userId);
      printResult('Balance', `$${response.data?.balance}`);
      printResult('Currency', response.data?.currency);
      ctx.results.push({ test: 'get_wallet', status: 'success' });
    } else {
      ctx.results.push({ test: 'get_wallet', status: 'failed', details: `Status: ${response.status}` });
    }
  } catch (error: any) {
    printStep(`Get wallet error: ${error}`, 'error');
    ctx.results.push({ test: 'get_wallet', status: 'failed', details: error.message });
  }
}

async function testCreditWallet(walletId: string, amount?: number): Promise<void> {
  const creditAmount = amount ?? 250.0;
  printStep(`Crediting $${creditAmount} to wallet ${walletId}...`);

  try {
    const authUserId = ctx.walletUserMap.get(walletId) || 'test-user';
    const { response, success } = await apiCall(
      'POST',
      `/api/v1/wallets/${walletId}/deposit`,
      {
        amount: creditAmount,
        description: 'Test credit',
        idempotencyKey: `credit-${Date.now()}`,
      },
      200,
      authUserId
    );
    showResponse(response, success);

    if (success) {
      printResult('New Balance', `$${response.data?.balanceAfter}`, true);
      printResult('Transaction ID', response.data?.transactionId);
      if (response.data?.transactionId) {
        ctx.transactionIds.push(response.data.transactionId);
      }
      ctx.results.push({ test: 'credit_wallet', status: 'success' });
    } else {
      ctx.results.push({ test: 'credit_wallet', status: 'failed', details: `Status: ${response.status}` });
    }
  } catch (error: any) {
    printStep(`Credit error: ${error}`, 'error');
    ctx.results.push({ test: 'credit_wallet', status: 'failed', details: error.message });
  }
}

async function testDebitWallet(walletId: string, amount?: number): Promise<void> {
  const debitAmount = amount ?? 150.0;
  printStep(`Debiting $${debitAmount} from wallet ${walletId}...`);

  try {
    const authUserId = ctx.walletUserMap.get(walletId) || 'test-user';
    const { response, success } = await apiCall(
      'POST',
      `/api/v1/wallets/${walletId}/withdraw`,
      {
        amount: debitAmount,
        description: 'Test debit',
        idempotencyKey: `debit-${Date.now()}`,
      },
      200,
      authUserId
    );
    showResponse(response, success);

    if (success) {
      printResult('New Balance', `$${response.data?.balanceAfter}`, true);
      printResult('Transaction ID', response.data?.transactionId);
      if (response.data?.transactionId) {
        ctx.transactionIds.push(response.data.transactionId);
      }
      ctx.results.push({ test: 'debit_wallet', status: 'success' });
    } else {
      ctx.results.push({ test: 'debit_wallet', status: 'failed', details: `Status: ${response.status}` });
    }
  } catch (error: any) {
    printStep(`Debit error: ${error}`, 'error');
    ctx.results.push({ test: 'debit_wallet', status: 'failed', details: error.message });
  }
}

async function testTransferWallet(fromWalletId: string, toWalletId: string, amount?: number): Promise<void> {
  const transferAmount = amount ?? 100.0;
  printStep(`Transferring $${transferAmount} from ${fromWalletId} to ${toWalletId}...`);

  try {
    const authUserId = ctx.walletUserMap.get(fromWalletId) || 'test-user';
    const { response, success } = await apiCall(
      'POST',
      `/api/v1/wallets/${fromWalletId}/transfer`,
      {
        destinationWalletId: toWalletId,
        amount: transferAmount,
        description: 'Test transfer',
        idempotencyKey: `transfer-${Date.now()}`,
      },
      200,
      authUserId
    );
    showResponse(response, success);

    if (success) {
      printResult('Source Balance', `$${response.data?.sourceTransaction?.balanceAfter}`, true);
      printResult('Destination Balance', `$${response.data?.destinationTransaction?.balanceAfter}`, true);
      printResult('Transfer ID', response.data?.transferId);
      if (response.data?.transferId) {
        ctx.transactionIds.push(response.data.transferId);
      }
      ctx.results.push({ test: 'transfer_wallet', status: 'success' });
    } else {
      ctx.results.push({ test: 'transfer_wallet', status: 'failed', details: `Status: ${response.status}` });
    }
  } catch (error: any) {
    printStep(`Transfer error: ${error}`, 'error');
    ctx.results.push({ test: 'transfer_wallet', status: 'failed', details: error.message });
  }
}

async function testGetTransactions(walletId: string): Promise<void> {
  printStep(`Retrieving transactions for wallet ${walletId}...`);

  try {
    const authUserId = ctx.walletUserMap.get(walletId) || 'test-user';
    const { response, success } = await apiCall('GET', `/api/v1/wallets/${walletId}/transactions`, undefined, undefined, authUserId);

    if (success) {
      const transactions = response.data?.transactions || [];
      printResult('Transaction Count', transactions.length, true);

      if (transactions.length > 0) {
        const table = new Table({
          head: ['ID', 'Type', 'Amount', 'Balance', 'Status', 'Created'],
          style: { head: ['cyan'] },
        });

        transactions.slice(0, 10).forEach((tx: any) => {
          table.push([
            tx.transactionId.substring(0, 8),
            tx.type,
            `$${tx.amount}`,
            `$${tx.balanceAfter}`,
            tx.status,
            new Date(tx.createdAt).toLocaleString(),
          ]);
        });

        console.log('\n' + table.toString() + '\n');
      }

      ctx.results.push({ test: 'get_transactions', status: 'success' });
    } else {
      ctx.results.push({ test: 'get_transactions', status: 'failed', details: `Status: ${response.status}` });
    }
  } catch (error: any) {
    printStep(`Get transactions error: ${error}`, 'error');
    ctx.results.push({ test: 'get_transactions', status: 'failed', details: error.message });
  }
}

async function testErrorScenarios(): Promise<void> {
  printHeader('❌ Error Scenarios', 'Testing validation and error handling');

  console.log(chalk.bold('Testing invalid requests...\n'));

  // Test 1: Insufficient funds
  printStep('Test: Debit with insufficient funds');
  if (ctx.walletIds.length > 0) {
    const { response } = await apiCall(
      'POST',
      `/api/v1/wallets/${ctx.walletIds[0]}/debit`,
      {
        amount: 999999.0,
        description: 'Insufficient funds test',
        idempotencyKey: `error-debit-${Date.now()}`,
      },
      400
    );
    showResponse(response, response.status === 400);
    ctx.results.push({
      test: 'error_insufficient_funds',
      status: response.status === 400 ? 'success' : 'failed',
    });
  }

  // Test 2: Invalid wallet ID
  printStep('Test: Get non-existent wallet');
  const fakeId = '00000000-0000-0000-0000-000000000000';
  const { response: response2 } = await apiCall('GET', `/api/v1/wallets/${fakeId}`, undefined, 404);
  showResponse(response2, response2.status === 404);
  ctx.results.push({
    test: 'error_wallet_not_found',
    status: response2.status === 404 ? 'success' : 'failed',
  });

  // Test 3: Negative amount
  printStep('Test: Credit with negative amount');
  if (ctx.walletIds.length > 0) {
    const { response: response3 } = await apiCall(
      'POST',
      `/api/v1/wallets/${ctx.walletIds[0]}/credit`,
      {
        amount: -100.0,
        description: 'Negative amount test',
        idempotencyKey: `error-negative-${Date.now()}`,
      },
      400
    );
    showResponse(response3, response3.status === 400);
    ctx.results.push({
      test: 'error_negative_amount',
      status: response3.status === 400 ? 'success' : 'failed',
    });
  }

  // Test 4: Missing required fields
  printStep('Test: Create wallet without userId');
  const { response: response4 } = await apiCall(
    'POST',
    '/api/v1/wallets',
    {
      initialBalance: 100,
      // missing userId
    },
    400
  );
  showResponse(response4, response4.status === 400);
  ctx.results.push({
    test: 'error_missing_userid',
    status: response4.status === 400 ? 'success' : 'failed',
  });
}

async function verifyDatabase(): Promise<void> {
  printHeader('🗄️ Database Verification');

  printStep('Checking PostgreSQL database...');

  const pool = new Pool(POSTGRES_CONFIG);

  try {
    // Count wallets
    const walletsResult = await pool.query('SELECT COUNT(*) FROM wallets');
    const walletCount = parseInt(walletsResult.rows[0].count);
    printResult('Wallets', walletCount, walletCount > 0);

    // Count transactions
    const txResult = await pool.query('SELECT COUNT(*) FROM transactions');
    const txCount = parseInt(txResult.rows[0].count);
    printResult('Transactions', txCount, txCount > 0);

    // Count outbox events
    const outboxResult = await pool.query('SELECT COUNT(*) FROM outbox_events');
    const outboxCount = parseInt(outboxResult.rows[0].count);
    printResult('Outbox Events', outboxCount, outboxCount > 0);

    // Get recent wallet details
    if (ctx.walletIds.length > 0) {
      const walletDetail = await pool.query('SELECT * FROM wallets WHERE id = $1', [ctx.walletIds[0]]);
      if (walletDetail.rows.length > 0) {
        const wallet = walletDetail.rows[0];
        console.log('\n' + chalk.cyan('Recent Wallet Details:'));
        printResult('ID', wallet.id.substring(0, 8) + '...');
        printResult('User ID', wallet.user_id);
        printResult('Balance', `$${wallet.balance}`);
        printResult('Currency', wallet.currency);
        printResult('Version', wallet.version);
      }
    }

    // Show recent transactions
    const recentTx = await pool.query(
      'SELECT * FROM transactions ORDER BY created_at DESC LIMIT 5'
    );
    if (recentTx.rows.length > 0) {
      const table = new Table({
        head: ['Type', 'Amount', 'Status', 'Wallet ID'],
        style: { head: ['cyan'] },
      });

      recentTx.rows.forEach((tx: any) => {
        table.push([
          tx.type,
          `$${tx.amount}`,
          tx.status,
          tx.wallet_id.substring(0, 8) + '...',
        ]);
      });

      console.log('\n' + chalk.cyan('Recent Transactions:'));
      console.log(table.toString() + '\n');
    }

    // Show outbox events
    const outboxEvents = await pool.query(
      'SELECT * FROM outbox_events ORDER BY created_at DESC LIMIT 5'
    );
    if (outboxEvents.rows.length > 0) {
      const table = new Table({
        head: ['Event Type', 'Aggregate ID', 'Status', 'Created'],
        style: { head: ['cyan'] },
      });

      outboxEvents.rows.forEach((event: any) => {
        table.push([
          event.event_type,
          event.aggregate_id.substring(0, 8) + '...',
          event.published ? 'Published' : 'Pending',
          new Date(event.created_at).toLocaleString(),
        ]);
      });

      console.log('\n' + chalk.cyan('Recent Outbox Events:'));
      console.log(table.toString() + '\n');
    }

    ctx.results.push({ test: 'database_verification', status: 'success' });
  } catch (error) {
    printStep(`Database verification failed: ${error}`, 'error');
    ctx.results.push({ test: 'database_verification', status: 'failed' });
  } finally {
    await pool.end();
  }
}

async function runHappyPathFlow(): Promise<void> {
  printHeader('✨ Happy Path - Complete Flow', 'Testing the full wallet lifecycle');
  
  writeToLog('\n' + '='.repeat(80));
  writeToLog('STARTING FULL FLOW TEST');
  writeToLog('='.repeat(80));

  ctx.results = [];
  ctx.walletIds = [];
  ctx.transactionIds = [];

  // Step 0: Cleanup old test data
  printStep('Step 0: Cleanup old test data', 'info');
  await cleanupTestData();
  console.log(); // Add spacing

  // Step 1: Health check
  printStep('Step 1: Health check', 'info');
  await testHealth();
  console.log(); // Add spacing

  // Step 2: Create two wallets with unique IDs
  const timestamp = Date.now();
  const user1 = `alice-${timestamp}@test.com`;
  const user2 = `bob-${timestamp}@test.com`;
  
  printStep(`Step 2: Creating test wallets for ${user1} and ${user2}...`, 'info');
  writeToLog(`Creating wallets for users: ${user1}, ${user2}`);
  
  const wallet1 = await testCreateWallet(user1);
  const wallet2 = await testCreateWallet(user2);

  if (!wallet1 || !wallet2) {
    printStep('❌ Failed to create wallets, aborting flow', 'error');
    writeToLog('⚠️ Test flow aborted due to wallet creation failure');
    return;
  }
  console.log(); // Add spacing

  // Step 3: Get wallet details
  printStep('Step 3: Get wallet details', 'info');
  await testGetWallet(wallet1);
  console.log();

  // Step 4: Credit wallet 1
  printStep('Step 4: Credit wallet (+$250)', 'info');
  await testCreditWallet(wallet1, 250.0);
  console.log();

  // Step 5: Debit wallet 1
  printStep('Step 5: Debit wallet (-$150)', 'info');
  await testDebitWallet(wallet1, 150.0);
  console.log();

  // Step 6: Transfer between wallets
  printStep('Step 6: Transfer between wallets ($100)', 'info');
  await testTransferWallet(wallet1, wallet2, 100.0);
  console.log();

  // Step 7: Get transaction history
  printStep('Step 7: Get transaction history', 'info');
  await testGetTransactions(wallet1);
  await testGetTransactions(wallet2);
  console.log();

  // Step 8: Verify database
  printStep('Step 8: Verify database state', 'info');
  await verifyDatabase();
  console.log();

  // Step 9: Database statistics
  printStep('Step 9: Database statistics', 'info');
  await getDatabaseStats();
  console.log();

  // Print summary
  writeToLog('\n' + '='.repeat(80));
  writeToLog('TEST FLOW COMPLETED');
  writeToLog('='.repeat(80));
  printSummary();
}

function printSummary(): void {
  if (ctx.results.length === 0) {
    return;
  }

  printHeader('📊 Test Summary');

  const successCount = ctx.results.filter((r) => r.status === 'success').length;
  const failedCount = ctx.results.filter((r) => r.status === 'failed').length;
  const skippedCount = ctx.results.filter((r) => r.status === 'skipped').length;
  const totalCount = ctx.results.length;

  // Log summary to file
  writeToLog('\n' + '='.repeat(80));
  writeToLog('TEST SUMMARY');
  writeToLog('='.repeat(80));
  writeToLog(`Total Tests: ${totalCount}`);
  writeToLog(`Passed: ${successCount}`);
  writeToLog(`Failed: ${failedCount}`);
  writeToLog(`Skipped: ${skippedCount}`);
  writeToLog('\nDetailed Results:');
  ctx.results.forEach((result) => {
    logTestResult(result.test, result.status, result.details);
  });

  const table = new Table({
    head: ['Test', 'Status'],
    style: { head: ['cyan'] },
  });

  ctx.results.forEach((result) => {
    const statusEmoji = result.status === 'success' ? '✅' : result.status === 'failed' ? '❌' : '⏭️';
    const statusColor =
      result.status === 'success' ? chalk.green : result.status === 'failed' ? chalk.red : chalk.yellow;
    table.push([result.test, statusColor(`${statusEmoji} ${result.status.toUpperCase()}`)]);
  });

  console.log(table.toString() + '\n');

  if (failedCount === 0 && skippedCount === 0) {
    console.log(
      chalk.green.bold(`🎉 ALL TESTS PASSED! (${successCount}/${totalCount})`) + '\n'
    );
  } else {
    console.log(chalk.yellow.bold('⚠️ SOME TESTS FAILED OR SKIPPED'));
    console.log(chalk.white(`Passed: ${successCount}/${totalCount}`));
    console.log(chalk.white(`Failed: ${failedCount}/${totalCount}`));
    console.log(chalk.white(`Skipped: ${skippedCount}/${totalCount}`) + '\n');
    
    // If there are failures, mention the log file
    console.log(chalk.cyan(`📝 Full logs available in: ${LOG_FILE}\n`));
  }
}

// ============================================================================
// Interactive Mode
// ============================================================================

async function showMainMenu(): Promise<void> {
  const choices = [
    { name: '🏥 Health Check - Verify service is running', value: 'health' },
    { name: '💰 Create Wallet - Create a new wallet', value: 'create_wallet' },
    { name: '👁️  Get Wallet - Retrieve wallet details', value: 'get_wallet' },
    { name: '➕ Credit Wallet - Add funds to wallet', value: 'credit' },
    { name: '➖ Debit Wallet - Remove funds from wallet', value: 'debit' },
    { name: '💸 Transfer - Transfer between wallets', value: 'transfer' },
    { name: '📜 Transaction History - View wallet transactions', value: 'transactions' },
    { name: '🗄️  Verify Database - Check database state', value: 'verify_db' },
    { name: '❌ Error Tests - Test error scenarios', value: 'error_tests' },
    { name: '🚀 Full Flow - Run complete test suite', value: 'full_flow' },
    new inquirer.Separator(),
    { name: '👋 Quit', value: 'quit' },
  ];

  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'Choose an action:',
      choices,
      pageSize: 15,
    },
  ]);

  switch (action) {
    case 'health':
      await testHealth();
      break;
    case 'create_wallet':
      await interactiveCreateWallet();
      break;
    case 'get_wallet':
      await interactiveGetWallet();
      break;
    case 'credit':
      await interactiveCreditWallet();
      break;
    case 'debit':
      await interactiveDebitWallet();
      break;
    case 'transfer':
      await interactiveTransfer();
      break;
    case 'transactions':
      await interactiveGetTransactions();
      break;
    case 'verify_db':
      await verifyDatabase();
      break;
    case 'error_tests':
      await testErrorScenarios();
      break;
    case 'full_flow':
      await runHappyPathFlow();
      return; // Don't continue after full flow
    case 'quit':
      console.log(chalk.cyan('\n👋 Goodbye!\n'));
      if (cleanupOnExit) {
        await stopContainers();
      }
      process.exit(0);
  }

  const { continue: shouldContinue } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'continue',
      message: 'Continue?',
      default: true,
    },
  ]);

  if (shouldContinue) {
    await showMainMenu();
  } else {
    console.log(chalk.cyan('\n👋 Goodbye!\n'));
    if (cleanupOnExit) {
      await stopContainers();
    }
    process.exit(0);
  }
}

async function interactiveCreateWallet(): Promise<void> {
  const { userId } = await inquirer.prompt([
    {
      type: 'input',
      name: 'userId',
      message: 'User ID:',
      default: `user-${Date.now()}`,
    },
  ]);

  await testCreateWallet(userId);
}

async function interactiveGetWallet(): Promise<void> {
  if (ctx.walletIds.length === 0) {
    console.log(chalk.yellow('\n⚠️  No wallets created yet. Create one first.\n'));
    return;
  }

  const { walletId } = await inquirer.prompt([
    {
      type: 'list',
      name: 'walletId',
      message: 'Select wallet:',
      choices: ctx.walletIds.map((id) => ({ name: id, value: id })),
    },
  ]);

  await testGetWallet(walletId);
}

async function interactiveCreditWallet(): Promise<void> {
  if (ctx.walletIds.length === 0) {
    console.log(chalk.yellow('\n⚠️  No wallets created yet. Create one first.\n'));
    return;
  }

  const { walletId, amount } = await inquirer.prompt([
    {
      type: 'list',
      name: 'walletId',
      message: 'Select wallet:',
      choices: ctx.walletIds.map((id) => ({ name: id, value: id })),
    },
    {
      type: 'number',
      name: 'amount',
      message: 'Amount to credit:',
      default: 250.0,
    },
  ]);

  await testCreditWallet(walletId, amount);
}

async function interactiveDebitWallet(): Promise<void> {
  if (ctx.walletIds.length === 0) {
    console.log(chalk.yellow('\n⚠️  No wallets created yet. Create one first.\n'));
    return;
  }

  const { walletId, amount } = await inquirer.prompt([
    {
      type: 'list',
      name: 'walletId',
      message: 'Select wallet:',
      choices: ctx.walletIds.map((id) => ({ name: id, value: id })),
    },
    {
      type: 'number',
      name: 'amount',
      message: 'Amount to debit:',
      default: 150.0,
    },
  ]);

  await testDebitWallet(walletId, amount);
}

async function interactiveTransfer(): Promise<void> {
  if (ctx.walletIds.length < 2) {
    console.log(chalk.yellow('\n⚠️  Need at least 2 wallets. Create more first.\n'));
    return;
  }

  const { fromWalletId, toWalletId, amount } = await inquirer.prompt([
    {
      type: 'list',
      name: 'fromWalletId',
      message: 'From wallet:',
      choices: ctx.walletIds.map((id) => ({ name: id, value: id })),
    },
    {
      type: 'list',
      name: 'toWalletId',
      message: 'To wallet:',
      choices: ctx.walletIds.map((id) => ({ name: id, value: id })),
    },
    {
      type: 'number',
      name: 'amount',
      message: 'Amount to transfer:',
      default: 100.0,
    },
  ]);

  if (fromWalletId === toWalletId) {
    console.log(chalk.red('\n❌ Cannot transfer to the same wallet\n'));
    return;
  }

  await testTransferWallet(fromWalletId, toWalletId, amount);
}

async function interactiveGetTransactions(): Promise<void> {
  if (ctx.walletIds.length === 0) {
    console.log(chalk.yellow('\n⚠️  No wallets created yet. Create one first.\n'));
    return;
  }

  const { walletId } = await inquirer.prompt([
    {
      type: 'list',
      name: 'walletId',
      message: 'Select wallet:',
      choices: ctx.walletIds.map((id) => ({ name: id, value: id })),
    },
  ]);

  await testGetTransactions(walletId);
}

async function interactiveMode(): Promise<void> {
  printHeader('🎮 Interactive Testing Mode', 'Digital Wallet Service');

  await ensureContainersStarted();

  await showMainMenu();
}

// ============================================================================
// CLI Commands
// ============================================================================

const program = new Command();

program
  .name('test-cli')
  .description('Digital Wallet Service Interactive Testing Tool')
  .version('1.0.0');

program
  .command('start')
  .description('Start containers and services')
  .option('-b, --build', 'Force rebuild images')
  .option('-k, --keep-alive', 'Keep containers running after tests')
  .action(async (options) => {
    cleanupOnExit = !options.keepAlive;
    await startContainers(options.build);
  });

program
  .command('stop')
  .description('Stop all containers')
  .action(async () => {
    await stopContainers();
  });

program
  .command('interactive')
  .description('Run in interactive mode')
  .option('-b, --build', 'Force rebuild images')
  .action(async (options) => {
    initializeLogFile();
    await ensureContainersStarted(options.build);
    await interactiveMode();
  });

program
  .command('full-flow')
  .description('Run complete end-to-end test flow')
  .option('-b, --build', 'Force rebuild images')
  .action(async (options) => {
    initializeLogFile();
    await ensureContainersStarted(options.build);
    await runHappyPathFlow();
    captureContainerLogs();
  });

program
  .command('health')
  .description('Check service health')
  .action(async () => {
    initializeLogFile();
    await ensureContainersStarted();
    await testHealth();
  });

program
  .command('verify-db')
  .description('Verify database state')
  .action(async () => {
    await ensureContainersStarted();
    await verifyDatabase();
  });

program
  .command('error-tests')
  .description('Run error scenario tests')
  .action(async () => {
    await ensureContainersStarted();
    await testErrorScenarios();
  });

// Default action (no command)
program.action(async () => {
  await ensureContainersStarted();
  await interactiveMode();
});

// ============================================================================
// Main Entry Point
// ============================================================================

// Handle SIGINT (Ctrl+C)
process.on('SIGINT', async () => {
  console.log(chalk.yellow('\n\n⚠️  Interrupted by user'));
  if (cleanupOnExit && containersInitialized) {
    console.log(chalk.cyan('Cleaning up containers...'));
    await stopContainers();
  }
  process.exit(0);
});

program.parse(process.argv);

