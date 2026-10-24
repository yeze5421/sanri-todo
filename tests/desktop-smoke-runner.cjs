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
assert.ok(['save', 'reopen', 'cleared'].includes(phase));
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
  window.webContents.setBackgroundThrottling(false);
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
    assert.equal(initial.taskCount, 0);
    assert.equal(await window.webContents.executeJavaScript(`localStorage.getItem('sanri.app.v1')`), null);
    assert.equal(await window.webContents.executeJavaScript(`document.getElementById('demo-banner').hidden`), true);
    await fs.mkdir(path.join(root, 'screenshots'), { recursive: true });
    window.setContentSize(1240, 1220);
    for (const theme of ['sage', 'linen', 'rosewater', 'tide', 'midnight', 'graphite']) {
      const result = await window.webContents.executeJavaScript(`{
        document.getElementById('appearance-button').click();
        document.querySelector('[data-theme-choice="${theme}"]').click();
        document.getElementById('done-appearance').click();
        ({ theme: document.documentElement.dataset.theme, stored: localStorage.getItem('three-days.theme.v1'), selected: document.querySelectorAll('[data-theme-choice][aria-pressed="true"]').length, tasks: localStorage.getItem('sanri.app.v1'), overflow: document.documentElement.scrollWidth > innerWidth });
      }`);
      assert.equal(result.theme, theme);
      assert.equal(result.stored, theme);
      assert.equal(result.selected, 1);
      assert.equal(result.tasks, null);
      assert.equal(result.overflow, false);
      await window.webContents.capturePage();
      await new Promise(resolve => setTimeout(resolve, 120));
      const screenshot = await window.webContents.capturePage();
      await fs.writeFile(path.join(root, `screenshots/theme-${theme}.png`), screenshot.toPNG());
    }
    await window.webContents.executeJavaScript(`document.getElementById('appearance-button').click()`);
    await window.webContents.capturePage();
    await new Promise(resolve => setTimeout(resolve, 150));
    await fs.writeFile(path.join(root, 'screenshots/theme-picker.png'), (await window.webContents.capturePage()).toPNG());
    // Exercise the actual controls without ever writing sample tasks to storage.
    const sample = await window.webContents.executeJavaScript(`{
      document.querySelector('[data-theme-choice="midnight"]').click();
      document.getElementById('done-appearance').click();
      document.getElementById('enter-demo').click();
      const count = document.querySelectorAll('.task-row').length;
      const slider = document.getElementById('time-slider');
      slider.value = '72'; slider.dispatchEvent(new Event('input'));
      const expired = document.querySelectorAll('.task-row').length;
      document.getElementById('exit-demo').click();
      ({ count, expired, state: JSON.parse(localStorage.getItem('sanri.app.v1')) });
    }`);
    assert.equal(sample.count, 3);
    assert.equal(sample.expired, 0);
    assert.deepEqual(sample.state.state.tasks, []);
    await window.reload();
    await new Promise(resolve => window.webContents.once('did-finish-load', resolve));
    assert.equal(await window.webContents.executeJavaScript(`document.documentElement.dataset.theme`), 'midnight');
    window.setContentSize(560, 800);
    await window.webContents.executeJavaScript(`document.getElementById('appearance-button').click()`);
    const layout = await window.webContents.executeJavaScript(`({ overflow: document.documentElement.scrollWidth > innerWidth, dialogFits: document.getElementById('appearance-dialog').getBoundingClientRect().width <= innerWidth })`);
    assert.equal(layout.overflow, false);
    assert.equal(layout.dialogFits, true);
    await window.webContents.capturePage();
    await new Promise(resolve => setTimeout(resolve, 150));
    await fs.writeFile(path.join(root, 'screenshots/theme-picker-narrow.png'), (await window.webContents.capturePage()).toPNG());
    await window.webContents.executeJavaScript(`document.getElementById('close-appearance').click()`);
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
  } else if (phase === 'reopen') {
    const expected = JSON.parse(await fs.readFile(path.join(profile, 'expected.json'), 'utf8'));
    const actual = await window.webContents.executeJavaScript(`JSON.parse(localStorage.getItem('sanri.app.v1'))`);
    assert.equal(actual.started, true);
    assert.equal(actual.state.tasks.length, 2);
    assert.deepEqual(actual.state.tasks, expected.state.tasks.slice(0, 2));
    assert.deepEqual(actual.state.stats, { completed: 1, released: 1 });
    assert.equal(initial.taskCount, 1);
    assert.ok(initial.text.includes('A task kept after restart'));
    assert.ok(!initial.text.includes('An expired task removed on restart'));
    assert.equal(await window.webContents.executeJavaScript(`document.documentElement.dataset.theme`), 'midnight');
    // Cancelling preserves all records. Confirming clears both state and undo history.
    const cancelled = await window.webContents.executeJavaScript(`{
      document.getElementById('appearance-button').click();
      document.getElementById('clear-data-button').click();
      document.getElementById('cancel-reset').click();
      JSON.parse(localStorage.getItem('sanri.app.v1'));
    }`);
    assert.deepEqual(cancelled, actual);
    const cleared = await window.webContents.executeJavaScript(`{
      document.querySelector('.task-check').click();
      document.getElementById('appearance-button').click();
      document.getElementById('clear-data-button').click();
      document.getElementById('confirm-reset').click();
      document.getElementById('undo-button').click();
      ({ tasks: localStorage.getItem('sanri.app.v1'), theme: localStorage.getItem('three-days.theme.v1'), active: document.getElementById('active-count').textContent, done: document.getElementById('completed-count').textContent, completed: document.getElementById('stat-completed').textContent, released: document.getElementById('stat-released').textContent, palette: document.documentElement.dataset.theme, demo: !document.getElementById('demo-banner').hidden });
    }`);
    assert.deepEqual(cleared, { tasks: null, theme: null, active: '0', done: '0', completed: '0', released: '0', palette: 'sage', demo: false });
  } else {
    assert.equal(initial.taskCount, 0);
    assert.equal(await window.webContents.executeJavaScript(`localStorage.getItem('sanri.app.v1')`), null);
    assert.equal(await window.webContents.executeJavaScript(`document.documentElement.dataset.theme`), 'sage');
    assert.ok(!initial.text.includes('A task kept after restart'));
    assert.equal(await window.webContents.executeJavaScript(`document.getElementById('demo-banner').hidden`), true);
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
