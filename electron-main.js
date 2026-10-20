const { app, BrowserWindow, ipcMain } = require('electron');
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

    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      callback(null, port, server);
    });

    server.on('error', (err) => {
      callback(err, null, null);
    });
  } catch (err) {
    callback(err, null, null);
  }
}

function createWindow(targetUrl) {
  const mainWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    fullscreen: true,
    frame: false, // Borderless kiosk mode for electronic blackboard
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

  if (targetUrl) {
    mainWindow.loadURL(targetUrl);
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }

  // F12 키로 개발자 도구 토글 (디버깅 지원)
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F12' && input.type === 'keyDown') {
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

  // Check for updates automatically (e.g. from GitHub Releases)
  autoUpdater.checkForUpdatesAndNotify().catch((err) => {
    console.log('Auto update check failed:', err);
  });

  startLocalServer(distPath, (err, port, server) => {
    if (!err && port) {
      localServer = server;
      createWindow(`http://127.0.0.1:${port}`);
    } else {
      console.warn('Local HTTP server failed, falling back to loadFile:', err);
      createWindow(null);
    }
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
  if (localServer) {
    try {
      localServer.close();
    } catch {}
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
