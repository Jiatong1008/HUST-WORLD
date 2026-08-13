const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.join(__dirname, '..', '..');
const checks = [];

function pass(message) {
  checks.push({ ok: true, message });
  console.log(`[quality] PASS ${message}`);
}

function fail(message) {
  checks.push({ ok: false, message });
  console.error(`[quality] FAIL ${message}`);
}

function readText(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function walk(dir, result = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(fullPath, result);
    else result.push(fullPath);
  }
  return result;
}

function checkPackageScripts() {
  const pkg = JSON.parse(readText('package.json'));
  const requiredScripts = [
    'smoke:api',
    'cleanup:smoke',
    'check:config',
    'test:map',
    'test:npc',
    'test:quest',
    'test:growth',
    'test:inventory',
    'test:skills',
    'test:linkage',
    'test:dashboard',
    'test:campus-week',
    'test:newcomer-guide',
    'test:four-year',
    'test:panels-ui',
    'test:ui-layout',
    'test:responsive',
    'test:phase9',
    'quality:gate',
    'test:services',
    'test:e2e',
    'test:quick',
    'test:standard',
    'test:full'
  ];
  for (const script of requiredScripts) {
    if (pkg.scripts?.[script]) pass(`package.json includes script ${script}`);
    else fail(`package.json missing script ${script}`);
  }
}

function checkEnvExample() {
  const env = readText('.env.example');
  const requiredKeys = ['PORT', 'SMOKE_API_BASE', 'DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'JWT_SECRET'];
  for (const key of requiredKeys) {
    if (new RegExp(`^${key}=`, 'm').test(env)) pass(`.env.example includes ${key}`);
    else fail(`.env.example missing ${key}`);
  }
}

function checkDocsAndShowcase() {
  const requiredFiles = [
    'README.md',
    'docs/plan/roadmap.md',
    'docs/plan/todo.md',
    'docs/plan/phase-9-ui-ux-design.md',
    'docs/plan/phase-10-quality-deploy.md',
    'docs/quality/test-matrix.md',
    'docs/quality/backend-service-tests.md',
    'docs/quality/frontend-e2e-tests.md',
    'docs/quality/runtime-health.md',
    'docs/quality/deployment-runbook.md',
    'docs/quality/final-delivery-checklist.md',
    'docs/personal/README.md',
    'docs/personal/hust-week-design.md',
    'docs/ASSET_ATTRIBUTION.md',
    'docs/showcase/ui-ux-showcase.md',
    'docs/showcase/reports/phase-9-ui-ux-final-report.json'
  ];
  for (const file of requiredFiles) {
    if (exists(file)) pass(`required document exists: ${file}`);
    else fail(`required document missing: ${file}`);
  }

  const screenshotDir = path.join(root, 'docs', 'showcase', 'screenshots');
  const screenshots = fs.existsSync(screenshotDir)
    ? fs.readdirSync(screenshotDir).filter(name => name.endsWith('.png'))
    : [];
  if (screenshots.length >= 5) pass(`showcase screenshots available (${screenshots.length})`);
  else fail(`expected at least 5 showcase screenshots, found ${screenshots.length}`);
}

function checkCampusWeekFeature() {
  const requiredFiles = [
    'game/js/features/CampusWeekManager.js',
    'game/css/campus-week.css',
    'tools/tests/test-campus-week.html',
    'tools/tests/test-campus-week-main.js',
    'tools/tests/browser-test-campus-week.js',
    'game/assets/hust-week/gate.webp',
    'game/assets/hust-week/library.jpg',
    'game/assets/hust-week/zuiwan-night.jpg',
    'game/assets/hust-week/history-museum.jpg'
  ];
  for (const file of requiredFiles) {
    if (exists(file)) pass(`campus-week artifact exists: ${file}`);
    else fail(`campus-week artifact missing: ${file}`);
  }

  const manager = exists('game/js/features/CampusWeekManager.js') ? readText('game/js/features/CampusWeekManager.js') : '';
  const expected = ['day0', 'day2', 'day5', 'day7', 'campusWeek', '把校园走成自己的地图'];
  if (expected.every(item => manager.includes(item))) pass('campus-week contains four-step closed narrative and persistent progress');
  else fail('campus-week narrative or persistence contract is incomplete');
}

function checkDeploymentArtifacts() {
  const requiredFiles = ['Dockerfile', '.dockerignore', 'docker-compose.yml', '.env.docker.example'];
  for (const file of requiredFiles) {
    if (exists(file)) pass(`deployment artifact exists: ${file}`);
    else fail(`deployment artifact missing: ${file}`);
  }

  if (!exists('docker-compose.yml') || !exists('.env.docker.example')) return;
  const compose = readText('docker-compose.yml');
  const dockerEnv = readText('.env.docker.example');
  const composeReady = compose.includes('condition: service_healthy')
    && compose.includes('DB_HOST: db')
    && compose.includes('hust-world-mysql');
  if (composeReady) pass('docker compose defines database health-gated application startup');
  else fail('docker compose is missing database health-gated application startup settings');

  const dockerEnvReady = ['DB_NAME=', 'DB_USER=', 'DB_PASSWORD=', 'MYSQL_ROOT_PASSWORD=', 'JWT_SECRET=']
    .every(key => dockerEnv.includes(key));
  if (dockerEnvReady) pass('docker environment template includes required secrets and database settings');
  else fail('docker environment template is missing required settings');
}

function checkNoTransientScreenshots() {
  const testDir = path.join(root, 'tools', 'tests');
  const pngs = fs.readdirSync(testDir).filter(name => name.endsWith('.png'));
  if (pngs.length === 0) pass('tools/tests has no transient PNG screenshots');
  else fail(`tools/tests contains transient PNG screenshots: ${pngs.join(', ')}`);
}

function checkJsSyntax() {
  const roots = [
    'config',
    'middlewares',
    'repositories',
    'routes',
    'services',
    'utils',
    'game/js',
    'map/js',
    'tools/tests',
    'server.js'
  ];

  const files = [];
  for (const relative of roots) {
    const fullPath = path.join(root, relative);
    if (!fs.existsSync(fullPath)) continue;
    if (fs.statSync(fullPath).isDirectory()) {
      files.push(...walk(fullPath).filter(file => file.endsWith('.js')));
    } else if (fullPath.endsWith('.js')) {
      files.push(fullPath);
    }
  }

  let failed = 0;
  for (const file of files) {
    const code = fs.readFileSync(file, 'utf8');
    const result = spawnSync(process.execPath, ['--input-type=module', '--check'], {
      input: code,
      encoding: 'utf8'
    });
    if (result.status !== 0) {
      failed += 1;
      const relative = path.relative(root, file);
      fail(`JS syntax check failed: ${relative}\n${result.stderr || result.stdout}`);
    }
  }

  if (failed === 0) pass(`JS syntax check passed (${files.length} files)`);
}

function checkPhaseState() {
  const roadmap = readText('docs/plan/roadmap.md');
  if (roadmap.includes('第十阶段') && roadmap.includes('测试、质量和可部署') && roadmap.includes('10.0')) {
    pass('roadmap points to phase 10');
  }
  else fail('roadmap does not point to phase 10');

  if (roadmap.includes('第九阶段 9.6') && roadmap.includes('已完成')) pass('roadmap records phase 9 completion');
  else fail('roadmap does not clearly record phase 9 completion');
}

function run() {
  console.log('[quality] HUST WORLD quality gate starting...');
  checkPackageScripts();
  checkEnvExample();
  checkDocsAndShowcase();
  checkDeploymentArtifacts();
  checkCampusWeekFeature();
  checkNoTransientScreenshots();
  checkJsSyntax();
  checkPhaseState();

  const failed = checks.filter(check => !check.ok);
  console.log(`[quality] Summary: ${checks.length - failed.length}/${checks.length} checks passed`);
  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

run();
