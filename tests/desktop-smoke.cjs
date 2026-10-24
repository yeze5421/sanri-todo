'use strict';
// Run the actual Electron renderer twice with a disposable profile, never the user's profile.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.join(__dirname, '..');
const base = path.resolve(root, '.desktop-test');
fs.mkdirSync(base, { recursive: true });
const profile = fs.mkdtempSync(path.join(base, 'profile-'));
const electron = require('electron');
const environment = { ...process.env };
delete environment.ELECTRON_RUN_AS_NODE;
try {
  for (const phase of ['save', 'reopen', 'cleared']) {
    const result = spawnSync(electron, [path.join(__dirname, 'desktop-smoke-runner.cjs'), profile, phase], {
      cwd: root, env: environment, stdio: 'inherit', windowsHide: true, timeout: 60000,
    });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(`Desktop ${phase} check failed (${result.status}).`);
  }
  console.log('Desktop startup, six themes, restart persistence, sample isolation, offline expiry, and confirmed data reset passed.');
} finally {
  // Only remove the exact temporary child directory allocated above.
  if (path.dirname(path.resolve(profile)) !== base) throw new Error('Unexpected test profile path.');
  fs.rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}
