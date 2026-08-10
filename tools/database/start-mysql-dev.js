const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const mysqlBaseDir = 'F:\\MySQL\\Install Directory';
const dataDir = path.join(os.homedir(), '.hust-world-mysql', 'data');

const isInitialized = fs.existsSync(path.join(dataDir, 'mysql'));

function runMysql(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit' });
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Exit code ${code}`));
    });
  });
}

async function main() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  if (!isInitialized) {
    console.log('Initializing MySQL data directory at:', dataDir);
    try {
      await runMysql(path.join(mysqlBaseDir, 'bin', 'mysqld.exe'), [
        '--no-defaults',
        '--basedir=' + mysqlBaseDir,
        '--datadir=' + dataDir,
        '--initialize-insecure'
      ]);
      console.log('MySQL data directory initialized.');
    } catch (error) {
      console.error('Failed to initialize MySQL:', error.message);
      process.exit(1);
    }
  }

  console.log('Starting MySQL dev server...');
  const mysqld = spawn(path.join(mysqlBaseDir, 'bin', 'mysqld.exe'), [
    '--no-defaults',
    '--basedir=' + mysqlBaseDir,
    '--datadir=' + dataDir,
    '--port=3306',
    '--character-set-server=utf8mb4',
    '--collation-server=utf8mb4_unicode_ci',
    '--default-storage-engine=INNODB',
    '--log-error=' + path.join(dataDir, 'mysql.err'),
    '--slow_query_log=0',
    '--general_log=0',
    '--max_connections=100',
    '--console'
  ], { stdio: 'inherit' });

  mysqld.on('error', (error) => {
    console.error('Failed to start MySQL:', error.message);
    process.exit(1);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
