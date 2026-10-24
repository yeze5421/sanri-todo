'use strict';
const { BrowserWindow } = require('electron');
const path = require('node:path');
const { HOME, isAppPage } = require('./assets.cjs');

function createWindow({ show = true } = {}) {
  const window = new BrowserWindow({
    width: 1240,
    height: 920,
    minWidth: 560,
    minHeight: 600,
    title: 'Three Days',
    backgroundColor: '#f6f5ef',
    icon: path.join(__dirname, '../build/icon.ico'),
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      webviewTag: false,
    },
  });
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', (event, url) => {
    if (!isAppPage(url)) event.preventDefault();
  });
  window.webContents.on('will-attach-webview', event => event.preventDefault());
  if (show) window.once('ready-to-show', () => window.show());
  return window;
}

module.exports = { createWindow, HOME };
