const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn, spawnSync } = require('child_process');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

const root = path.resolve(__dirname, '..');
const envPath = path.join(root, '.env');
const containerName = 'agrismart-mysql';
const defaultDatabaseName = 'agrismartsl_new';

process.chdir(root);
dotenv.config({ path: envPath });

function updateEnvValue(key, value) {
  const contents = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
  const line = `${key}=${value}`;
  const keyPattern = new RegExp(`^\\s*${key}\\s*=.*$`, 'm');
  const updated = keyPattern.test(contents)
    ? contents.replace(keyPattern, line)
    : `${contents}${contents.endsWith('\n') || !contents ? '' : '\n'}${line}\n`;

  fs.writeFileSync(envPath, updated, { mode: 0o600 });
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: 'inherit',
    ...options,
  });

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`${command} exited with status ${result.status}`);
  }
}

function dockerExists() {
  const result = spawnSync('docker', ['inspect', containerName], { stdio: 'ignore' });
  if (result.error && result.error.code === 'ENOENT') {
    throw new Error('Docker is required to start the local MySQL database.');
  }
  return result.status === 0;
}

function startDatabaseContainer() {
  if (dockerExists()) {
    run('docker', ['start', containerName], { stdio: 'ignore' });
    console.log('Using the existing local MySQL container.');
    return;
  }

  const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'agrismartsl-'));
  const credentialsFile = path.join(temporaryDirectory, 'mysql.env');
  fs.writeFileSync(credentialsFile, `MYSQL_ROOT_PASSWORD=${process.env.DB_PASSWORD}\n`, { mode: 0o600 });

  try {
    run('docker', [
      'run',
      '--detach',
      '--name', containerName,
      '--restart', 'unless-stopped',
      '--publish', '3306:3306',
      '--volume', 'agrismartsl-mysql-data:/var/lib/mysql',
      '--env-file', credentialsFile,
      '--env', `MYSQL_DATABASE=${process.env.DB_NAME}`,
      'mysql:8.0',
    ], { stdio: 'inherit' });
  } finally {
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
  }
}

async function waitForDatabase() {
  const deadline = Date.now() + 120_000;
  let lastError;

  while (Date.now() < deadline) {
    let connection;
    try {
      connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: 3306,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        connectTimeout: 3000,
      });
      console.log('MySQL is ready.');
      return;
    } catch (error) {
      lastError = error;
      if (error.code === 'ER_ACCESS_DENIED_ERROR') {
        throw new Error('MySQL rejected DB_USER/DB_PASSWORD. Check .env against the existing container.');
      }
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } finally {
      if (connection) await connection.end();
    }
  }

  throw new Error(`MySQL did not become ready (${lastError?.code || 'connection timeout'}).`);
}

function runSetupScripts() {
  run(process.execPath, ['db/setup.js']);
  run(process.execPath, ['db/seed.js']);
}

function startApp() {
  const app = spawn(process.execPath, ['app.js'], { cwd: root, stdio: 'inherit' });
  const forwardSignal = (signal) => {
    if (!app.killed) app.kill(signal);
  };
  process.on('SIGINT', forwardSignal);
  process.on('SIGTERM', forwardSignal);
  app.on('exit', (code) => {
    process.exitCode = code || 0;
  });
}

async function main() {
  process.env.DB_HOST ||= '127.0.0.1';
  process.env.DB_USER ||= 'root';
  process.env.DB_NAME ||= defaultDatabaseName;

  const password = process.env.DB_PASSWORD;
  if (!password || password === 'your_db_password') {
    process.env.DB_PASSWORD = crypto.randomBytes(24).toString('hex');
    updateEnvValue('DB_PASSWORD', process.env.DB_PASSWORD);
    console.log('Created a local database password in the ignored .env file.');
  }

  if (process.env.DB_HOST === '127.0.0.1' || process.env.DB_HOST === 'localhost') {
    startDatabaseContainer();
  }

  await waitForDatabase();
  runSetupScripts();
  console.log('Starting AgriSmartSL...');
  startApp();
}

main().catch((error) => {
  console.error(`Unable to start AgriSmartSL: ${error.message}`);
  process.exitCode = 1;
});
