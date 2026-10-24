'use strict';
const { app, protocol, session } = require('electron');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { handleAssetRequest } = require('../desktop/assets.cjs');
const { createWindow, HOME } = require('../desktop/window.cjs');
const E = require('../engine.js');
const [profile, phase] = process.argv.slice(2);
const root = path.resolve(__dirname, '..');
assert.equal(path.dirname(path.resolve(profile)), path.join(root, '.desktop-test'));
assert.ok(['save', 'reopen'].includes(phase));
app.setPath('userData', profile);
protocol.registerSchemesAsPrivileged([{
  scheme: 'three-days', privileges: { standard: true, secure: true, supportFetchAPI: true },
}]);
const failures = [];
const deadline = setTimeout(() => { console.error('Desktop smoke check timed out.'); app.exit(1); }, 45000);

app.whenReady().then(async () => {
  session.defaultSession.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
  // Simulate an offline environment without changing Windows networking.
  session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
    callback({ cancel: !details.url.startsWith('three-days://app/') && !details.url.startsWith('data:') });
  });
  protocol.handle('three-days', request => handleAssetRequest(request, root));
  const window = createWindow({ show: false });
  window.webContents.on('console-message', event => {
    if (event.level === 'error') failures.push(event.message);
  });
  await window.loadURL(HOME);
  const initial = await window.webContents.executeJavaScript(`({
    title: document.title, language: document.documentElement.lang,
    taskCount: document.querySelectorAll('.task-row').length,
    nodeAvailable: typeof require !== 'undefined',
    text: document.body.innerText
  })`);
  assert.match(initial.title, /Three Days/);
  assert.equal(initial.language, 'en');
  assert.equal(initial.nodeAvailable, false);
  assert.equal(/\p{Script=Han}/u.test(initial.text), false);
  assert.ok(initial.text.includes('Saved only on this device.'));

  if (phase === 'save') {
    assert.equal(initial.taskCount, 3);
    await fs.mkdir(path.join(root, 'screenshots'), { recursive: true });
    const preview = await window.webContents.capturePage();
    await fs.writeFile(path.join(root, 'screenshots/desktop-app.png'), preview.toPNG());
    const now = Date.now();
    const state = E.createState();
    state.tasks = [
      E.createTask('A task kept after restart', now - E.HOUR, 'restart-task'),
      { ...E.createTask('A completed task kept after restart', now - 120 * E.HOUR, 'completed-task'), completedAt: now - 119 * E.HOUR },
      E.createTask('An expired task removed on restart', now - 80 * E.HOUR, 'expired-task'),
    ];
    state.stats.completed = 1;
    const saved = { started: true, state };
    await fs.writeFile(path.join(profile, 'expected.json'), JSON.stringify(saved));
    await window.webContents.executeJavaScript(`localStorage.setItem('sanri.app.v1', ${JSON.stringify(JSON.stringify(saved))})`);
  } else {
    const expected = JSON.parse(await fs.readFile(path.join(profile, 'expected.json'), 'utf8'));
    const actual = await window.webContents.executeJavaScript(`JSON.parse(localStorage.getItem('sanri.app.v1'))`);
    assert.equal(actual.started, true);
    assert.equal(actual.state.tasks.length, 2);
    assert.deepEqual(actual.state.tasks, expected.state.tasks.slice(0, 2));
    assert.deepEqual(actual.state.stats, { completed: 1, released: 1 });
    assert.equal(initial.taskCount, 1);
    assert.ok(initial.text.includes('A task kept after restart'));
    assert.ok(!initial.text.includes('An expired task removed on restart'));
  }
  assert.deepEqual(failures, []);
  session.defaultSession.flushStorageData();
  await session.defaultSession.cookies.flushStore();
  window.destroy();
  clearTimeout(deadline);
  console.log(`Desktop ${phase} check passed.`);
  app.quit();
}).catch(error => {
  clearTimeout(deadline);
  console.error(error);
  app.exit(1);
});
