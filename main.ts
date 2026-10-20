import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import { autoUpdater, UpdateInfo, ProgressInfo } from 'electron-updater';
import path from 'path';
import http from 'http';
import fs from 'fs';

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
};

interface UpdaterConfig {
  feedUrl?: string;
  githubOwner?: string;
  githubRepo?: string;
  autoRestartOnDownload?: boolean;
}

interface UpdateState {
  status: 'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error';
  version: string;
  latestVersion: string | null;
  progress: number;
  bytesPerSecond: number;
  transferred: number;
  total: number;
  releaseNotes: string | null;
  error: string | null;
  feedUrl: string | null;
}

let localServer: http.Server | null = null;
let mainWindowRef: BrowserWindow | null = null;
let updateCheckInterval: ReturnType<typeof setInterval> | null = null;
let hasTriggeredInitialLaunchCheck = false;

let currentUpdateState: UpdateState = {
  status: 'idle',
  version: app.getVersion(),
  latestVersion: null,
  progress: 0,
  bytesPerSecond: 0,
  transferred: 0,
  total: 0,
  releaseNotes: null,
  error: null,
  feedUrl: null,
};

function getUpdaterConfigPath(): string {
  try {
    return path.join(app.getPath('userData'), 'updater-config.json');
  } catch {
    return path.join(__dirname, 'updater-config.json');
  }
}

function loadUpdaterConfig(): UpdaterConfig {
  try {
    const configPath = getUpdaterConfigPath();
    if (fs.existsSync(configPath)) {
      const raw = fs.readFileSync(configPath, 'utf-8');
      return JSON.parse(raw) as UpdaterConfig;
    }
  } catch (err) {
    console.warn('[AutoUpdater] Failed to read updater-config.json:', err);
  }
  return {};
}

function saveUpdaterConfig(newConfig: UpdaterConfig): UpdaterConfig {
  try {
    const configPath = getUpdaterConfigPath();
    const merged: UpdaterConfig = { ...loadUpdaterConfig(), ...newConfig };
    fs.writeFileSync(configPath, JSON.stringify(merged, null, 2), 'utf-8');
    return merged;
  } catch (err) {
    console.warn('[AutoUpdater] Failed to write updater-config.json:', err);
    return newConfig;
  }
}

function broadcastUpdateStatus(patch: Partial<UpdateState>): void {
  currentUpdateState = {
    ...currentUpdateState,
    ...patch,
    version: app.getVersion(),
  };
  if (mainWindowRef && !mainWindowRef.isDestroyed()) {
    mainWindowRef.webContents.send('updater:status', currentUpdateState);
  }
}

function configureAutoUpdater(): void {
  // Automatically download updates from GitHub Release in the background and install on quit
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.allowDowngrade = false;
  autoUpdater.allowPrerelease = false;

  const savedConfig = loadUpdaterConfig();
  const customFeedUrl = process.env.ELECTRON_UPDATE_URL || savedConfig.feedUrl;
  const customGithubOwner = process.env.GITHUB_OWNER || savedConfig.githubOwner;
  const customGithubRepo = process.env.GITHUB_REPO || savedConfig.githubRepo;

  try {
    if (customFeedUrl && /^https?:\/\//i.test(customFeedUrl.trim())) {
      const cleanUrl = customFeedUrl.trim().replace(/\/+$/, '');
      autoUpdater.setFeedURL({
        provider: 'generic',
        url: cleanUrl,
      });
      currentUpdateState.feedUrl = cleanUrl;
      console.info('[AutoUpdater] Configured generic static update server:', cleanUrl);
    } else if (
      customGithubOwner &&
      customGithubRepo &&
      customGithubOwner !== 'your-github-username' &&
      customGithubRepo !== 'your-github-repo-name'
    ) {
      autoUpdater.setFeedURL({
        provider: 'github',
        owner: customGithubOwner.trim(),
        repo: customGithubRepo.trim(),
      });
      currentUpdateState.feedUrl = `github:${customGithubOwner.trim()}/${customGithubRepo.trim()}`;
      console.info('[AutoUpdater] Configured GitHub Release update feed:', currentUpdateState.feedUrl);
    } else {
      // Uses the default GitHub repository configured in electron-builder.yml (app-update.yml)
      currentUpdateState.feedUrl = 'github:default (electron-builder.yml)';
    }
  } catch (err: any) {
    console.warn('[AutoUpdater] setFeedURL warning:', err?.message || err);
  }

  autoUpdater.on('checking-for-update', () => {
    console.info('[AutoUpdater] Checking GitHub Release for update...');
    broadcastUpdateStatus({ status: 'checking', error: null });
  });

  autoUpdater.on('update-available', (info: UpdateInfo) => {
    console.info('[AutoUpdater] New version available on GitHub Release:', info?.version);
    broadcastUpdateStatus({
      status: 'available',
      latestVersion: info?.version || null,
      releaseNotes: typeof info?.releaseNotes === 'string' ? info.releaseNotes : null,
      error: null,
    });
  });

  autoUpdater.on('update-not-available', (info: UpdateInfo) => {
    console.info('[AutoUpdater] App is up to date:', info?.version);
    broadcastUpdateStatus({
      status: 'not-available',
      latestVersion: info?.version || app.getVersion(),
      error: null,
    });
  });

  autoUpdater.on('download-progress', (progressObj: ProgressInfo) => {
    const percent = Math.round(progressObj.percent || 0);
    console.info(`[AutoUpdater] Downloading update from GitHub Release: ${percent}%`);
    broadcastUpdateStatus({
      status: 'downloading',
      progress: percent,
      bytesPerSecond: progressObj.bytesPerSecond || 0,
      transferred: progressObj.transferred || 0,
      total: progressObj.total || 0,
    });
  });

  autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
    console.info('[AutoUpdater] Update downloaded and ready to install:', info?.version);
    broadcastUpdateStatus({
      status: 'downloaded',
      latestVersion: info?.version || currentUpdateState.latestVersion,
      progress: 100,
      error: null,
    });

    const saved = loadUpdaterConfig();
    if (saved.autoRestartOnDownload) {
      setTimeout(() => {
        autoUpdater.quitAndInstall(true, true);
      }, 3000);
    } else if (mainWindowRef && !mainWindowRef.isDestroyed()) {
      dialog
        .showMessageBox(mainWindowRef, {
          type: 'info',
          title: '업데이트 준비 완료',
          message: `새로운 버전(v${info?.version || ''}) 다운로드가 완료되었습니다.\n지금 앱을 재시작하여 최신 버전을 적용하시겠습니까?`,
          buttons: ['지금 재시작 및 설치', '나중에 (종료 시 자동 설치)'],
          defaultId: 0,
          cancelId: 1,
        })
        .then(({ response }) => {
          if (response === 0) {
            setImmediate(() => {
              autoUpdater.quitAndInstall(true, true);
            });
          }
        })
        .catch(() => {});
    }
  });

  autoUpdater.on('error', (err: Error) => {
    const message = err ? err.message || String(err) : 'Unknown update error';
    console.warn('[AutoUpdater] Update check error:', message);
    broadcastUpdateStatus({
      status: 'error',
      error: message,
    });
  });
}

async function triggerUpdateCheck() {
  if (!app.isPackaged && !process.env.FORCE_DEV_UPDATE_CHECK) {
    console.info('[AutoUpdater] Skipping network update check in unpackaged dev mode.');
    broadcastUpdateStatus({
      status: 'not-available',
      latestVersion: app.getVersion(),
      error: null,
    });
    return { ok: true, devMode: true, state: currentUpdateState };
  }

  try {
    broadcastUpdateStatus({ status: 'checking', error: null });
    const result = await autoUpdater.checkForUpdatesAndNotify();
    return { ok: true, version: result?.updateInfo?.version || null, state: currentUpdateState };
  } catch (err: any) {
    const message = err ? err.message || String(err) : 'Update check failed';
    broadcastUpdateStatus({ status: 'error', error: message });
    return { ok: false, error: message, state: currentUpdateState };
  }
}

function registerUpdaterIpcHandlers(): void {
  ipcMain.handle('updater:get-status', () => {
    return {
      ...currentUpdateState,
      isPackaged: app.isPackaged,
      config: loadUpdaterConfig(),
    };
  });

  ipcMain.handle('updater:check', async () => {
    return await triggerUpdateCheck();
  });

  ipcMain.handle('updater:install-now', () => {
    if (currentUpdateState.status === 'downloaded') {
      setImmediate(() => {
        autoUpdater.quitAndInstall(true, true);
      });
      return { ok: true };
    }
    return { ok: false, error: 'Update not downloaded yet' };
  });

  ipcMain.handle('updater:set-config', async (_event, configPayload: UpdaterConfig) => {
    const updated = saveUpdaterConfig(configPayload || {});
    try {
      if (updated.feedUrl && /^https?:\/\//i.test(updated.feedUrl.trim())) {
        const cleanUrl = updated.feedUrl.trim().replace(/\/+$/, '');
        autoUpdater.setFeedURL({ provider: 'generic', url: cleanUrl });
        broadcastUpdateStatus({ feedUrl: cleanUrl });
      } else if (updated.githubOwner && updated.githubRepo) {
        autoUpdater.setFeedURL({
          provider: 'github',
          owner: updated.githubOwner.trim(),
          repo: updated.githubRepo.trim(),
        });
        broadcastUpdateStatus({
          feedUrl: `github:${updated.githubOwner.trim()}/${updated.githubRepo.trim()}`,
        });
      }
    } catch (err: any) {
      return { ok: false, error: err?.message || String(err) };
    }
    return await triggerUpdateCheck();
  });
}

function startLocalServer(
  distDir: string,
  callback: (err: Error | null, port: number | null, server: http.Server | null) => void
): void {
  try {
    const server = http.createServer((req, res) => {
      try {
        let reqUrl = decodeURI((req.url || '/').split('?')[0]);
        if (reqUrl === '/' || !reqUrl) reqUrl = '/index.html';

        const filePath = path.join(distDir, reqUrl);
        const resolvedPath = path.resolve(filePath);
        const resolvedDist = path.resolve(distDir);

        if (!resolvedPath.startsWith(resolvedDist)) {
          res.writeHead(403);
          res.end('Forbidden');
          return;
        }

        fs.stat(resolvedPath, (err, stats) => {
          let finalPath = resolvedPath;
          if (err || !stats.isFile()) {
            finalPath = path.join(distDir, 'index.html');
          }

          const ext = path.extname(finalPath).toLowerCase();
          const contentType = MIME_TYPES[ext] || 'application/octet-stream';

          fs.readFile(finalPath, (readErr, content) => {
            if (readErr) {
              res.writeHead(404);
              res.end('Not Found');
            } else {
              res.writeHead(200, {
                'Content-Type': contentType,
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Access-Control-Allow-Origin': '*',
              });
              res.end(content);
            }
          });
        });
      } catch {
        res.writeHead(500);
        res.end('Internal Server Error');
      }
    });

    const PREFERRED_PORTS = [45780, 45781, 45782, 0];
    let portIndex = 0;

    const tryListen = () => {
      const targetPort = PREFERRED_PORTS[portIndex] ?? 0;
      server.listen(targetPort, '127.0.0.1', () => {
        const addr = server.address();
        const port = typeof addr === 'object' && addr ? addr.port : targetPort;
        callback(null, port, server);
      });
    };

    server.on('error', (err: NodeJS.ErrnoException) => {
      if (err && err.code === 'EADDRINUSE' && portIndex < PREFERRED_PORTS.length - 1) {
        portIndex++;
        tryListen();
      } else {
        callback(err, null, null);
      }
    });

    tryListen();
  } catch (err: any) {
    callback(err, null, null);
  }
}

function createWindow(targetUrl: string | null): void {
  const mainWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    fullscreen: true,
    frame: false,
    autoHideMenuBar: true,
    backgroundColor: '#0f172a',
    webPreferences: {
      preload: path.join(__dirname, 'electron-preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
      sandbox: false,
    },
  });

  mainWindowRef = mainWindow;

  if (targetUrl) {
    mainWindow.loadURL(targetUrl);
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }

  // Trigger GitHub Release update check once the main window finishes launching & loading UI
  mainWindow.webContents.on('did-finish-load', () => {
    broadcastUpdateStatus({});
    if (!hasTriggeredInitialLaunchCheck) {
      hasTriggeredInitialLaunchCheck = true;
      triggerUpdateCheck();
    }
  });

  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F12' && input.type === 'keyDown') {
      mainWindow.webContents.toggleDevTools();
      event.preventDefault();
    }
  });

  ipcMain.on('app-exit', () => {
    app.quit();
  });
}

app.whenReady().then(() => {
  const distPath = path.join(__dirname, 'dist');

  configureAutoUpdater();
  registerUpdaterIpcHandlers();

  startLocalServer(distPath, (err, port, server) => {
    if (!err && port) {
      localServer = server;
      createWindow(`http://127.0.0.1:${port}`);
    } else {
      console.warn('Local HTTP server failed, falling back to loadFile:', err);
      createWindow(null);
    }

    // Re-check every 2 hours while the blackboard app stays running
    if (updateCheckInterval) clearInterval(updateCheckInterval);
    updateCheckInterval = setInterval(() => {
      triggerUpdateCheck();
    }, 2 * 60 * 60 * 1000);
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      const dist = path.join(__dirname, 'dist');
      startLocalServer(dist, (err, port, server) => {
        if (!err && port) {
          localServer = server;
          createWindow(`http://127.0.0.1:${port}`);
        } else {
          createWindow(null);
        }
      });
    }
  });
});

app.on('before-quit', () => {
  if (updateCheckInterval) {
    clearInterval(updateCheckInterval);
    updateCheckInterval = null;
  }
  if (localServer) {
    try {
      localServer.close();
    } catch {}
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
