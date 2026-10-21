const { app, BrowserWindow, ipcMain, dialog, screen } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const http = require('http');
const fs = require('fs');

const MIME_TYPES = {
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

let localServer = null;
let mainWindowRef = null;
let updateCheckInterval = null;
let hasTriggeredInitialLaunchCheck = false;
let currentUpdateState = {
  status: 'idle', // 'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error'
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

// Path for persisting custom update server config (GitHub or Generic Static Server URL)
function getUpdaterConfigPath() {
  try {
    return path.join(app.getPath('userData'), 'updater-config.json');
  } catch {
    return path.join(__dirname, 'updater-config.json');
  }
}

function loadUpdaterConfig() {
  try {
    const configPath = getUpdaterConfigPath();
    if (fs.existsSync(configPath)) {
      const raw = fs.readFileSync(configPath, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn('[AutoUpdater] Failed to read updater-config.json:', err);
  }
  return {};
}

function saveUpdaterConfig(newConfig) {
  try {
    const configPath = getUpdaterConfigPath();
    const merged = { ...loadUpdaterConfig(), ...newConfig };
    fs.writeFileSync(configPath, JSON.stringify(merged, null, 2), 'utf-8');
    return merged;
  } catch (err) {
    console.warn('[AutoUpdater] Failed to write updater-config.json:', err);
    return newConfig;
  }
}

function broadcastUpdateStatus(patch) {
  currentUpdateState = {
    ...currentUpdateState,
    ...patch,
    version: app.getVersion(),
  };
  if (mainWindowRef && !mainWindowRef.isDestroyed()) {
    mainWindowRef.webContents.send('updater:status', currentUpdateState);
  }
}

const DEFAULT_GITHUB_OWNER = 'Jovad-T';
const DEFAULT_GITHUB_REPO = 'Exam-timetable';

function configureAutoUpdater() {
  // Automatically download updates from GitHub Release in the background and install on quit
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.allowDowngrade = false;
  autoUpdater.allowPrerelease = false;

  // Apply custom static server or GitHub config if configured via env or userData
  const savedConfig = loadUpdaterConfig();
  const customFeedUrl = process.env.ELECTRON_UPDATE_URL || savedConfig.feedUrl;
  const customGithubOwner = process.env.GITHUB_OWNER || savedConfig.githubOwner || DEFAULT_GITHUB_OWNER;
  const customGithubRepo = process.env.GITHUB_REPO || savedConfig.githubRepo || DEFAULT_GITHUB_REPO;

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
      currentUpdateState.feedUrl = `github:${DEFAULT_GITHUB_OWNER}/${DEFAULT_GITHUB_REPO}`;
    }
  } catch (err) {
    console.warn('[AutoUpdater] setFeedURL warning:', err.message || err);
  }

  autoUpdater.on('checking-for-update', () => {
    console.info('[AutoUpdater] Checking GitHub Release for update...');
    broadcastUpdateStatus({ status: 'checking', error: null });
  });

  autoUpdater.on('update-available', (info) => {
    console.info('[AutoUpdater] New version available on GitHub Release:', info?.version);
    broadcastUpdateStatus({
      status: 'available',
      latestVersion: info?.version || null,
      releaseNotes: info?.releaseNotes || null,
      error: null,
    });
  });

  autoUpdater.on('update-not-available', (info) => {
    console.info('[AutoUpdater] App is up to date:', info?.version);
    broadcastUpdateStatus({
      status: 'not-available',
      latestVersion: info?.version || app.getVersion(),
      error: null,
    });
  });

  autoUpdater.on('download-progress', (progressObj) => {
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

  autoUpdater.on('update-downloaded', (info) => {
    console.info('[AutoUpdater] Update downloaded and ready to install:', info?.version);
    broadcastUpdateStatus({
      status: 'downloaded',
      latestVersion: info?.version || currentUpdateState.latestVersion,
      progress: 100,
      error: null,
    });

    // Prompt or auto-install when update download completes
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

  autoUpdater.on('error', (err) => {
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
  } catch (err) {
    const message = err ? err.message || String(err) : 'Update check failed';
    broadcastUpdateStatus({ status: 'error', error: message });
    return { ok: false, error: message, state: currentUpdateState };
  }
}

function registerUpdaterIpcHandlers() {
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
      // isSilent = true (silent NSIS install for kiosk/blackboard), isForceRunAfter = true (relaunch immediately)
      setImmediate(() => {
        autoUpdater.quitAndInstall(true, true);
      });
      return { ok: true };
    }
    return { ok: false, error: 'Update not downloaded yet' };
  });

  ipcMain.handle('updater:set-config', async (_event, configPayload) => {
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
    } catch (err) {
      return { ok: false, error: err.message || String(err) };
    }
    return await triggerUpdateCheck();
  });
}

function getWindowState() {
  try {
    const displays = screen.getAllDisplays();
    if (!mainWindowRef || mainWindowRef.isDestroyed()) {
      const primary = screen.getPrimaryDisplay();
      const sf = primary?.scaleFactor || 1;
      return {
        isFullscreen: true,
        isMaximized: false,
        displayCount: displays.length,
        currentDisplayIndex: 1,
        width: primary?.bounds?.width || 1920,
        height: primary?.bounds?.height || 1080,
        physicalWidth: Math.round((primary?.bounds?.width || 1920) * sf),
        physicalHeight: Math.round((primary?.bounds?.height || 1080) * sf),
        scaleFactor: sf,
      };
    }

    const winBounds = mainWindowRef.getBounds();
    const currentDisplay = screen.getDisplayMatching(winBounds) || screen.getPrimaryDisplay();
    const currentIdx = Math.max(0, displays.findIndex((d) => d.id === currentDisplay.id));
    const sf = currentDisplay?.scaleFactor || 1;

    return {
      isFullscreen: mainWindowRef.isFullScreen(),
      isMaximized: mainWindowRef.isMaximized(),
      displayCount: displays.length,
      currentDisplayIndex: currentIdx + 1,
      width: currentDisplay.bounds.width,
      height: currentDisplay.bounds.height,
      physicalWidth: Math.round(currentDisplay.bounds.width * sf),
      physicalHeight: Math.round(currentDisplay.bounds.height * sf),
      scaleFactor: sf,
    };
  } catch (err) {
    return {
      isFullscreen: true,
      isMaximized: false,
      displayCount: 1,
      currentDisplayIndex: 1,
      width: 1920,
      height: 1080,
      physicalWidth: 1920,
      physicalHeight: 1080,
      scaleFactor: 1,
    };
  }
}

function broadcastWindowState() {
  if (mainWindowRef && !mainWindowRef.isDestroyed()) {
    mainWindowRef.webContents.send('window:state', getWindowState());
  }
}

function setWindowDraggableMode(mainWindow) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  const currentDisplay = screen.getDisplayMatching(mainWindow.getBounds()) || screen.getPrimaryDisplay();
  const workArea = currentDisplay.workArea || currentDisplay.bounds;
  const targetW = Math.max(1024, Math.round(workArea.width * 0.84));
  const targetH = Math.max(640, Math.round(workArea.height * 0.84));
  const targetX = workArea.x + Math.round((workArea.width - targetW) / 2);
  const targetY = workArea.y + Math.round((workArea.height - targetH) / 2);

  mainWindow.setFullScreen(false);
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
  }
  mainWindow.setResizable(true);
  mainWindow.setMovable(true);
  mainWindow.setBounds({ x: targetX, y: targetY, width: targetW, height: targetH }, true);
}

function registerWindowIpcHandlers() {
  ipcMain.handle('window:get-state', () => {
    return getWindowState();
  });

  ipcMain.handle('window:toggle-fullscreen', () => {
    if (!mainWindowRef || mainWindowRef.isDestroyed()) return getWindowState();
    const currentlyFullscreen = mainWindowRef.isFullScreen();
    if (currentlyFullscreen) {
      setWindowDraggableMode(mainWindowRef);
    } else {
      mainWindowRef.setFullScreen(true);
    }
    setTimeout(broadcastWindowState, 80);
    return getWindowState();
  });

  ipcMain.handle('window:set-fullscreen', (_event, shouldBeFullscreen) => {
    if (!mainWindowRef || mainWindowRef.isDestroyed()) return getWindowState();
    if (shouldBeFullscreen) {
      mainWindowRef.setFullScreen(true);
    } else {
      setWindowDraggableMode(mainWindowRef);
    }
    setTimeout(broadcastWindowState, 80);
    return getWindowState();
  });

  ipcMain.handle('window:move-to-next-display', () => {
    if (!mainWindowRef || mainWindowRef.isDestroyed()) {
      return { ok: false, state: getWindowState() };
    }
    const displays = screen.getAllDisplays();
    if (displays.length <= 1) {
      // 모니터가 1개뿐인 경우 드래그 이동이 가능한 창 모드로 전환
      if (mainWindowRef.isFullScreen()) {
        setWindowDraggableMode(mainWindowRef);
      }
      setTimeout(broadcastWindowState, 80);
      return { ok: true, singleDisplay: true, state: getWindowState() };
    }

    const currentDisplay = screen.getDisplayMatching(mainWindowRef.getBounds()) || screen.getPrimaryDisplay();
    const currentIdx = Math.max(0, displays.findIndex((d) => d.id === currentDisplay.id));
    const nextDisplay = displays[(currentIdx + 1) % displays.length];
    const wasFullscreen = mainWindowRef.isFullScreen();

    if (wasFullscreen) {
      mainWindowRef.setFullScreen(false);
    }
    if (mainWindowRef.isMaximized()) {
      mainWindowRef.unmaximize();
    }

    const workArea = nextDisplay.workArea || nextDisplay.bounds;
    const targetW = Math.max(1024, Math.round(workArea.width * 0.85));
    const targetH = Math.max(640, Math.round(workArea.height * 0.85));
    const targetX = workArea.x + Math.round((workArea.width - targetW) / 2);
    const targetY = workArea.y + Math.round((workArea.height - targetH) / 2);

    mainWindowRef.setBounds({ x: targetX, y: targetY, width: targetW, height: targetH });

    if (wasFullscreen) {
      setTimeout(() => {
        if (mainWindowRef && !mainWindowRef.isDestroyed()) {
          mainWindowRef.setFullScreen(true);
          mainWindowRef.webContents.setZoomFactor(1.0);
          broadcastWindowState();
        }
      }, 120);
    } else {
      setTimeout(() => {
        if (mainWindowRef && !mainWindowRef.isDestroyed()) {
          mainWindowRef.webContents.setZoomFactor(1.0);
          broadcastWindowState();
        }
      }, 80);
    }

    return { ok: true, singleDisplay: false, state: getWindowState() };
  });

  ipcMain.handle('window:minimize', () => {
    if (mainWindowRef && !mainWindowRef.isDestroyed()) {
      mainWindowRef.minimize();
    }
    return { ok: true };
  });
}

function startLocalServer(distDir, callback) {
  try {
    const server = http.createServer((req, res) => {
      try {
        let reqUrl = decodeURI(req.url.split('?')[0]);
        if (reqUrl === '/' || !reqUrl) reqUrl = '/index.html';

        let filePath = path.join(distDir, reqUrl);
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
      } catch (err) {
        res.writeHead(500);
        res.end('Internal Server Error');
      }
    });

    const PREFERRED_PORTS = [45780, 45781, 45782, 0];
    let portIndex = 0;

    const tryListen = () => {
      const targetPort = PREFERRED_PORTS[portIndex] ?? 0;
      server.listen(targetPort, '127.0.0.1', () => {
        const port = server.address().port;
        callback(null, port, server);
      });
    };

    server.on('error', (err) => {
      if (err && err.code === 'EADDRINUSE' && portIndex < PREFERRED_PORTS.length - 1) {
        portIndex++;
        tryListen();
      } else {
        callback(err, null, null);
      }
    });

    tryListen();
  } catch (err) {
    callback(err, null, null);
  }
}

function createWindow(targetUrl) {
  const primaryDisplay = screen.getPrimaryDisplay();
  const workArea = primaryDisplay?.workArea || primaryDisplay?.bounds || { width: 1920, height: 1080, x: 0, y: 0 };

  const mainWindow = new BrowserWindow({
    x: workArea.x,
    y: workArea.y,
    width: workArea.width,
    height: workArea.height,
    minWidth: 960,
    minHeight: 540,
    fullscreen: true,
    frame: false, // Borderless kiosk/blackboard mode with custom draggable header bar in window mode
    resizable: true,
    movable: true,
    autoHideMenuBar: true,
    backgroundColor: '#0f172a',
    webPreferences: {
      preload: path.join(__dirname, 'electron-preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false, // Prevents CORS issues in local environment
      sandbox: false,
    },
  });

  mainWindowRef = mainWindow;

  if (targetUrl) {
    mainWindow.loadURL(targetUrl);
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }

  // Trigger GitHub Release update check & normalize zoom factor once the main window finishes launching
  mainWindow.webContents.on('did-finish-load', () => {
    try {
      mainWindow.webContents.setZoomFactor(1.0);
    } catch {}
    broadcastUpdateStatus({});
    broadcastWindowState();
    if (!hasTriggeredInitialLaunchCheck) {
      hasTriggeredInitialLaunchCheck = true;
      triggerUpdateCheck();
    }
  });

  mainWindow.on('enter-full-screen', () => broadcastWindowState());
  mainWindow.on('leave-full-screen', () => broadcastWindowState());
  mainWindow.on('maximize', () => broadcastWindowState());
  mainWindow.on('unmaximize', () => broadcastWindowState());
  mainWindow.on('resized', () => broadcastWindowState());
  mainWindow.on('moved', () => broadcastWindowState());

  // F11 키로 창 모드(드래그 이동) ↔ 전체화면 토글, F12 키로 개발자 도구 토글
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F11' && input.type === 'keyDown') {
      if (mainWindow.isFullScreen()) {
        setWindowDraggableMode(mainWindow);
      } else {
        mainWindow.setFullScreen(true);
      }
      setTimeout(broadcastWindowState, 80);
      event.preventDefault();
    } else if (input.key === 'F12' && input.type === 'keyDown') {
      mainWindow.webContents.toggleDevTools();
      event.preventDefault();
    }
  });

  // Handle app exit request from renderer
  ipcMain.on('app-exit', () => {
    app.quit();
  });
}

app.whenReady().then(() => {
  const distPath = path.join(__dirname, 'dist');

  configureAutoUpdater();
  registerUpdaterIpcHandlers();
  registerWindowIpcHandlers();

  screen.on('display-added', () => broadcastWindowState());
  screen.on('display-removed', () => broadcastWindowState());
  screen.on('display-metrics-changed', () => broadcastWindowState());

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

