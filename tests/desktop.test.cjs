'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { HOME, handleAssetRequest, isAppPage } = require('../desktop/assets.cjs');
const root = path.join(__dirname, '..');

test('desktop serves the local interface and its scripts with restrictive content rules', async () => {
  const page = await handleAssetRequest({ method: 'GET', url: HOME }, root);
  assert.equal(page.status, 200);
  assert.match(await page.text(), /Three Days/);
  assert.match(page.headers.get('content-security-policy'), /connect-src 'none'/);
  const script = await handleAssetRequest({ method: 'GET', url: 'three-days://app/app.js' }, root);
  assert.equal(script.status, 200);
  assert.match(script.headers.get('content-type'), /javascript/);
  for (const asset of ['themes.css', 'appearance.js']) {
    const response = await handleAssetRequest({ method: 'GET', url: `three-days://app/${asset}` }, root);
    assert.equal(response.status, 200);
  }
  const head = await handleAssetRequest({ method: 'HEAD', url: HOME }, root);
  assert.equal(head.status, 200);
  assert.equal(await head.text(), '');
});

test('desktop asset requests cannot read arbitrary files or use remote origins', async () => {
  for (const url of [
    'three-days://app/.env', 'three-days://app/package.json',
    'three-days://app/desktop/main.cjs', 'three-days://app/%2e%2e%2f.env',
    'three-days://elsewhere/index.html', 'three-days://name@app/index.html',
    'https://app/index.html', 'file:///index.html', 'not a URL',
  ]) {
    const response = await handleAssetRequest({ method: 'GET', url }, root);
    assert.equal(response.status, 404, url);
  }
  const post = await handleAssetRequest({ method: 'POST', url: HOME }, root);
  assert.equal(post.status, 405);
});

test('desktop navigation stays on the application page and allows in-page anchors', () => {
  assert.ok(isAppPage(HOME));
  assert.ok(isAppPage(HOME + '#list-section'));
  assert.ok(isAppPage('three-days://app/#task-input'));
  for (const url of ['https://example.com', 'file:///index.html', 'three-days://app/app.js', 'three-days://other/']) {
    assert.equal(isAppPage(url), false);
  }
});
