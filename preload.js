const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Menu events
  onMenuNew: (cb) => ipcRenderer.on('menu:new', cb),
  onMenuPreferences: (cb) => ipcRenderer.on('menu:preferences', cb),

  // File events
  onFileSave: (cb) => ipcRenderer.on('file:save', cb),
  onFileSaveAs: (cb) => ipcRenderer.on('file:save-as', cb),
  onFileLoad: (cb) => ipcRenderer.on('file:load', (_, data) => cb(data)),
  onFileExportPng: (cb) => ipcRenderer.on('file:export-png', cb),

  // Edit events
  onEditUndo: (cb) => ipcRenderer.on('edit:undo', cb),
  onEditRedo: (cb) => ipcRenderer.on('edit:redo', cb),
  onEditClear: (cb) => ipcRenderer.on('edit:clear', cb),
  onEditRandom: (cb) => ipcRenderer.on('edit:random', cb),

  // Simulation events
  onSimToggle: (cb) => ipcRenderer.on('sim:toggle', cb),
  onSimStep: (cb) => ipcRenderer.on('sim:step', cb),
  onSimReset: (cb) => ipcRenderer.on('sim:reset', cb),
  onSimToggleWrap: (cb) => ipcRenderer.on('sim:toggle-wrap', cb),

  // View events
  onViewResetZoom: (cb) => ipcRenderer.on('view:reset-zoom', cb),
  onViewZoomIn: (cb) => ipcRenderer.on('view:zoom-in', cb),
  onViewZoomOut: (cb) => ipcRenderer.on('view:zoom-out', cb),

  // Dialogs
  showSaveDialog: () => ipcRenderer.invoke('dialog:save', 'untitled.cp'),
  showSavePngDialog: () => ipcRenderer.invoke('dialog:save-png'),
  writeFile: (filePath, data) => ipcRenderer.invoke('file:write', filePath, data),
  writeFileBuffer: (filePath, buffer) =>
    ipcRenderer.invoke('file:write-buffer', filePath, buffer),
});
