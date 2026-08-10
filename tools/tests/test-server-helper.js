const { spawn } = require('child_process');
const { join } = require('path');
const http = require('http');

const root = join(__dirname, '..', '..');

let server;
let serverReady = false;

function isServerAvailable(port) {
  return new Promise((resolve) => {
    const request = http.get({ hostname: 'localhost', port, path: '/api/health', timeout: 1200 }, (response) => {
      response.resume();
      resolve(response.statusCode < 500);
    });
    request.on('timeout', () => {
      request.destroy();
      resolve(false);
    });
    request.on('error', () => resolve(false));
  });
}

async function startServer(port = process.env.PORT || '8080') {
  if (await isServerAvailable(port)) {
    console.log(`[test-server] Reusing existing server on http://localhost:${port}`);
    return;
  }

  return new Promise((resolve, reject) => {
    if (server) { resolve(); return; }
    serverReady = false;
    server = spawn('node', ['server.js'], { cwd: root, env: { ...process.env, PORT: String(port) } });
    server.stdout.on('data', (data) => {
      const text = data.toString();
      process.stdout.write(text);
      if (!serverReady && text.includes(`http://localhost:${port}`)) {
        serverReady = true;
        resolve();
      }
    });
    server.stderr.on('data', (data) => process.stderr.write(data.toString()));
    server.on('error', reject);
    setTimeout(() => {
      if (!serverReady) {
        serverReady = true;
        resolve();
      }
    }, 5000);
  });
}

function stopServer() {
  return new Promise((resolve) => {
    if (!server) { resolve(); return; }
    server.on('close', resolve);
    server.kill('SIGTERM');
    setTimeout(() => {
      try { server.kill('SIGKILL'); } catch {}
      resolve();
    }, 3000);
  });
}

module.exports = { startServer, stopServer };
