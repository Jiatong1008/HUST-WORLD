const fs = require('fs');
const http = require('http');
const path = require('path');
const { spawn, spawnSync } = require('child_process');

const root = path.join(__dirname, '..', '..');
const reportsDir = path.join(root, 'docs', 'quality', 'reports');
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const nodeCommand = process.execPath;

const TIERS = {
  quick: {
    description: 'Fast local confidence check for everyday edits.',
    scripts: ['quality:gate', 'test:campus-week', 'test:newcomer-guide', 'test:dashboard', 'test:ui-layout', 'test:responsive']
  },
  standard: {
    description: 'Recommended regression before committing feature work.',
    scripts: [
      'quality:gate',
      'check:config',
      'smoke:api',
      'cleanup:smoke',
      'smoke:api',
      'test:services',
      'test:campus-week',
      'test:dashboard',
      'test:panels-ui',
      'test:ui-layout',
      'test:responsive',
      'test:e2e',
      'test:npc',
      'test:quest',
      'cleanup:smoke'
    ]
  },
  full: {
    description: 'Broad regression before releases or major demos.',
    scripts: [
      'quality:gate',
      'check:config',
      'smoke:api',
      'cleanup:smoke',
      'smoke:api',
      'test:services',
      'test:four-year',
      'test:map',
      'test:npc',
      'test:quest',
      'test:growth',
      'test:inventory',
      'test:skills',
      'test:linkage',
      'test:campus-week',
      'test:dashboard',
      'test:panels-ui',
      'test:ui-layout',
      'test:responsive',
      'test:e2e',
      'cleanup:smoke'
    ]
  }
};

function ensureReportsDir() {
  fs.mkdirSync(reportsDir, { recursive: true });
}

function cleanupTransientScreenshots() {
  const testDir = path.join(root, 'tools', 'tests');
  const removed = [];
  for (const entry of fs.readdirSync(testDir)) {
    if (!entry.endsWith('.png')) continue;
    const filePath = path.join(testDir, entry);
    fs.rmSync(filePath, { force: true });
    removed.push(entry);
  }
  return removed;
}

function getPort() {
  return process.env.PORT || '4000';
}

function getBaseUrl() {
  return process.env.BROWSER_TEST_BASE
    || process.env.SMOKE_API_BASE
    || `http://localhost:${getPort()}`;
}

function getMatrixEnv() {
  const port = getPort();
  const baseUrl = getBaseUrl();
  return {
    ...process.env,
    PORT: port,
    SMOKE_API_BASE: process.env.SMOKE_API_BASE || baseUrl,
    BROWSER_TEST_BASE: process.env.BROWSER_TEST_BASE || baseUrl
  };
}

function requestHealth(baseUrl) {
  return new Promise((resolve) => {
    const req = http.get(`${baseUrl.replace(/\/$/, '')}/api/health`, (res) => {
      res.resume();
      resolve(res.statusCode >= 200 && res.statusCode < 500);
    });
    req.setTimeout(1500, () => {
      req.destroy();
      resolve(false);
    });
    req.on('error', () => resolve(false));
  });
}

function startServerForSmoke() {
  return new Promise((resolve, reject) => {
    const env = getMatrixEnv();
    const port = env.PORT;
    const server = spawn(nodeCommand, ['server.js'], {
      cwd: root,
      env,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    let settled = false;
    let output = '';

    const finish = () => {
      if (settled) return;
      settled = true;
      resolve(server);
    };

    server.stdout.on('data', (data) => {
      const text = data.toString();
      output += text;
      process.stdout.write(text);
      if (text.includes(`http://localhost:${port}`) || text.includes('Server running')) {
        finish();
      }
    });
    server.stderr.on('data', (data) => {
      const text = data.toString();
      output += text;
      process.stderr.write(text);
    });
    server.on('error', reject);
    server.on('exit', (code) => {
      if (!settled) {
        reject(new Error(`server.js exited before smoke tests could start (code ${code}). Output: ${output}`));
      }
    });
    setTimeout(finish, 6000);
  });
}

function stopServer(server) {
  return new Promise((resolve) => {
    if (!server || server.killed) {
      resolve();
      return;
    }
    server.once('close', resolve);
    server.kill('SIGTERM');
    setTimeout(() => {
      try {
        server.kill('SIGKILL');
      } catch {}
      resolve();
    }, 3000);
  });
}

async function withSmokeServer(scriptName, runner) {
  if (scriptName !== 'smoke:api') {
    return runner();
  }

  const baseUrl = getMatrixEnv().SMOKE_API_BASE;
  if (await requestHealth(baseUrl)) {
    console.log(`[matrix] Reusing existing API server: ${baseUrl}`);
    return runner();
  }

  console.log(`[matrix] Starting API server for smoke tests: ${baseUrl}`);
  const server = await startServerForSmoke();
  try {
    return runner();
  } finally {
    await stopServer(server);
  }
}

async function runScript(scriptName) {
  const startedAt = Date.now();
  console.log(`\n[matrix] >>> npm run ${scriptName}`);
  const result = await withSmokeServer(scriptName, () => {
    return spawnSync(npmCommand, ['run', scriptName], {
      cwd: root,
      stdio: 'inherit',
      env: getMatrixEnv(),
      shell: process.platform === 'win32'
    });
  });
  const durationMs = Date.now() - startedAt;
  return {
    script: scriptName,
    status: result.status,
    durationMs,
    ok: result.status === 0
  };
}

function writeReport(tierName, tier, results, removedScreenshots, startedAt) {
  ensureReportsDir();
  const report = {
    title: 'HUST WORLD Test Matrix Report',
    tier: tierName,
    description: tier.description,
    startedAt,
    finishedAt: new Date().toISOString(),
    port: getPort(),
    baseUrl: getBaseUrl(),
    results,
    removedTransientScreenshots: removedScreenshots,
    passed: results.every(result => result.ok)
  };
  const reportPath = path.join(reportsDir, `test-matrix-${tierName}.json`);
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(`[matrix] Report written: ${reportPath}`);
}

function printUsage() {
  console.log('Usage: node tools/tests/test-matrix.js <quick|standard|full>');
  console.log('');
  for (const [name, tier] of Object.entries(TIERS)) {
    console.log(`  ${name.padEnd(8)} ${tier.description}`);
    console.log(`           ${tier.scripts.join(' -> ')}`);
  }
}

async function run() {
  const tierName = process.argv[2] || 'quick';
  const tier = TIERS[tierName];
  if (!tier) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  const startedAt = new Date().toISOString();
  console.log(`[matrix] Running ${tierName} matrix: ${tier.description}`);
  // 浏览器验收可在上一次独立执行时留下截图；先清理，避免首个 quality:gate
  // 因历史生成物而误报失败。
  const removedBefore = cleanupTransientScreenshots();
  if (removedBefore.length > 0) {
    console.log(`[matrix] Removed pre-run transient screenshots: ${removedBefore.join(', ')}`);
  }
  const results = [];
  for (const script of tier.scripts) {
    const result = await runScript(script);
    results.push(result);
    if (!result.ok) {
      console.error(`[matrix] Stopping after failed script: ${script}`);
      break;
    }
  }

  const removedAfter = cleanupTransientScreenshots();
  if (removedAfter.length > 0) {
    console.log(`[matrix] Removed post-run transient screenshots: ${removedAfter.join(', ')}`);
  }
  const removedScreenshots = [...new Set([...removedBefore, ...removedAfter])];

  writeReport(tierName, tier, results, removedScreenshots, startedAt);
  const failed = results.filter(result => !result.ok);
  console.log(`[matrix] Summary: ${results.length - failed.length}/${results.length} scripts passed`);
  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

run().catch((error) => {
  console.error('[matrix] Test matrix failed:', error.message);
  process.exitCode = 1;
});
