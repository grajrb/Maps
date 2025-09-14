import { spawn } from 'child_process';
import http from 'http';

function waitForServer(url: string, timeout = 10000) {
  const start = Date.now();
  return new Promise<void>((resolve, reject) => {
    const check = () => {
      http.get(url, (res) => { resolve(); }).on('error', () => {
        if (Date.now() - start > timeout) reject(new Error('Timeout waiting for server'));
        else setTimeout(check, 200);
      });
    };
    check();
  });
}

console.log('Running smoke test: build then dev server check...');

// First build
const build = spawn('bun', ['./scripts/build.ts'], { stdio: 'inherit' });
build.on('close', async (code) => {
  if (code !== 0) { console.error('Build failed with code', code); process.exit(code ?? 1); }
  console.log('Build finished successfully, starting dev server...');
  const server = spawn('bun', ['./scripts/dev-server.ts'], { stdio: 'inherit' });
  try {
    await waitForServer('http://localhost:1234');
    console.log('Dev server responded OK on http://localhost:1234');
    server.kill();
    process.exit(0);
  } catch (e) {
    console.error('Dev server did not start:', e);
    server.kill();
    process.exit(2);
  }
});
