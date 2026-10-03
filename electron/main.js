// The desktop app: runs the Liner Notes server inside Electron and shows it in a window.
// The database lives in the app's data folder, e.g. ~/Library/Application Support/Liner Notes/.
import { app, BrowserWindow, dialog, shell } from 'electron';
import path from 'node:path';
import { startServer } from '../server/server.js';

const WINDOW_OPTIONS = {
  width: 1280,
  height: 860,
  minWidth: 900,
  minHeight: 600,
  show: false, // Shown once the page is ready, so it doesn't flash white.
  title: 'Liner Notes'
};

let server = null; // { url, close }
let mainWindow = null;

/** `DB_PATH` is only meant for testing; normally the database sits in the app's data folder. */
const databasePath = () => process.env.DB_PATH || path.join(app.getPath('userData'), 'linernotes.db');

/** Links that leave the app open in the default browser instead of the app window. */
function openOutsideLinksInBrowser(window) {
  const isAppPage = url => url.startsWith(`${server.url}/`) || url === server.url;
  const openExternal = url => {
    if (/^https?:\/\//.test(url)) shell.openExternal(url);
  };

  window.webContents.setWindowOpenHandler(({ url }) => {
    openExternal(url);
    return { action: 'deny' };
  });
  window.webContents.on('will-navigate', (event, url) => {
    if (isAppPage(url)) return;
    event.preventDefault();
    openExternal(url);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow(WINDOW_OPTIONS);
  openOutsideLinksInBrowser(mainWindow);
  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
  mainWindow.loadURL(server.url);
}

function focusWindow() {
  if (!mainWindow) return createWindow();
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.focus();
}

// Only one copy of the app may run, since both would write to the same database.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', focusWindow);

  app.whenReady().then(async () => {
    try {
      server = await startServer({ dbPath: databasePath(), host: '127.0.0.1', port: 0 });
    } catch (error) {
      dialog.showErrorBox('Liner Notes could not start', String(error?.message || error));
      app.quit();
      return;
    }
    console.log(`Liner Notes is running at ${server.url}`);
    console.log(`Database: ${databasePath()}`);
    createWindow();
  });

  // macOS apps stay open without windows; clicking the Dock icon opens a new one.
  app.on('activate', () => {
    if (server && !mainWindow) createWindow();
  });
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
  app.on('will-quit', () => server?.close());
}
