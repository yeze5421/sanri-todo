'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');

const ORIGIN = 'three-days://app';
const HOME = ORIGIN + '/index.html';
const FILES = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/index.html', ['index.html', 'text/html; charset=utf-8']],
  ['/styles.css', ['styles.css', 'text/css; charset=utf-8']],
  ['/themes.css', ['themes.css', 'text/css; charset=utf-8']],
  ['/appearance.js', ['appearance.js', 'text/javascript; charset=utf-8']],
  ['/app.js', ['app.js', 'text/javascript; charset=utf-8']],
  ['/engine.js', ['engine.js', 'text/javascript; charset=utf-8']],
  ['/copy.js', ['copy.js', 'text/javascript; charset=utf-8']],
  ['/favicon.svg', ['favicon.svg', 'image/svg+xml']],
]);
const CSP = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'none'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'";

function localURL(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'three-days:' && url.host === 'app' && !url.username && !url.password ? url : null;
  } catch { return null; }
}

function isAppPage(value) {
  const url = localURL(value);
  return Boolean(url && ['/', '/index.html'].includes(url.pathname));
}

async function handleAssetRequest(request, rootDirectory) {
  if (!['GET', 'HEAD'].includes(request.method)) {
    return new Response('Method not allowed', { status: 405, headers: { Allow: 'GET, HEAD' } });
  }
  const url = localURL(request.url);
  const file = url && FILES.get(url.pathname);
  if (!file) return new Response('Not found', { status: 404 });
  try {
    const bytes = await fs.readFile(path.join(rootDirectory, file[0]));
    return new Response(request.method === 'HEAD' ? null : bytes, {
      headers: {
        'Content-Type': file[1],
        'Content-Security-Policy': CSP,
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'no-cache',
      },
    });
  } catch { return new Response('Unable to load app', { status: 500 }); }
}

module.exports = { ORIGIN, HOME, handleAssetRequest, isAppPage };
