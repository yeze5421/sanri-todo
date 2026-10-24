'use strict';
const { app, dialog, Menu, nativeTheme, protocol, session } = require('electron');
const path = require('node:path');
const { handleAssetRequest } = require('./assets.cjs');
const { createWindow, HOME } = require('./window.cjs');

app.setName('Three Days');
// A stable profile keeps data when the portable executable is moved or replaced.
app.setPath('userData', path.join(app.getPath('appData'), 'Three Days'));
app.setAppUserModelId('local.threedays.todo');
protocol.registerSchemesAsPrivileged([{
  scheme: 'three-days',
  privileges: { standard: true, secure: true, supportFetchAPI: true },
}]);

let mainWindow;
const singleInstance = app.requestSingleInstanceLock();
if (!singleInstance) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  });

  app.whenReady().then(async () => {
    Menu.setApplicationMenu(null);
    nativeTheme.themeSource = 'light';
    session.defaultSession.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
    session.defaultSession.setPermissionCheckHandler(() => false);
    // The application has no remote assets, accounts, analytics, or update service.
    session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
      callback({ cancel: !details.url.startsWith('three-days://app/') && !details.url.startsWith('data:') });
    });
    protocol.handle('three-days', request => handleAssetRequest(request, path.join(__dirname, '..')));
    mainWindow = createWindow();
    mainWindow.on('closed', () => { mainWindow = null; });
    await mainWindow.loadURL(HOME);
  }).catch(error => {
    dialog.showErrorBox('Three Days could not start', error.message);
    app.quit();
  });

  app.on('window-all-closed', () => {
    session.defaultSession.flushStorageData();
    app.quit();
  });
}
