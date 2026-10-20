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

