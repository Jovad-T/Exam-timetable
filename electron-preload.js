const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronUpdater', {
  isElectron: true,
  getStatus: () => ipcRenderer.invoke('updater:get-status'),
  checkForUpdates: () => ipcRenderer.invoke('updater:check'),
  installNow: () => ipcRenderer.invoke('updater:install-now'),
  setConfig: (config) => ipcRenderer.invoke('updater:set-config', config),
  onStatusChange: (callback) => {
    const listener = (_event, state) => callback(state);
    ipcRenderer.on('updater:status', listener);
    return () => ipcRenderer.removeListener('updater:status', listener);
  },
  exitApp: () => ipcRenderer.send('app-exit'),
  getWindowState: () => ipcRenderer.invoke('window:get-state'),
  toggleFullscreen: () => ipcRenderer.invoke('window:toggle-fullscreen'),
  setFullscreen: (val) => ipcRenderer.invoke('window:set-fullscreen', val),
  moveToNextDisplay: () => ipcRenderer.invoke('window:move-to-next-display'),
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  onWindowStateChange: (callback) => {
    const listener = (_event, state) => callback(state);
    ipcRenderer.on('window:state', listener);
    return () => ipcRenderer.removeListener('window:state', listener);
  },
});

window.addEventListener('DOMContentLoaded', () => {
  const replaceText = (selector, text) => {
    const element = document.getElementById(selector);
    if (element) element.innerText = text;
  };

  for (const dependency of ['chrome', 'node', 'electron']) {
    replaceText(`${dependency}-version`, process.versions[dependency]);
  }
});

