const { app, BrowserWindow, Menu, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    title: 'Cellular Playground',
    backgroundColor: '#1a1a2e',
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile('index.html');
  buildMenu();
}

function buildMenu() {
  const template = [
    {
      label: 'Cellular Playground',
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        {
          label: 'Preferences...',
          accelerator: 'Cmd+,',
          click: () => mainWindow.webContents.send('menu:preferences'),
        },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'File',
      submenu: [
        {
          label: 'New Project',
          accelerator: 'Cmd+N',
          click: () => mainWindow.webContents.send('menu:new'),
        },
        {
          label: 'Open Project...',
          accelerator: 'Cmd+O',
          click: async () => {
            const result = await dialog.showOpenDialog(mainWindow, {
              filters: [
                { name: 'Cellular Playground', extensions: ['cp'] },
                { name: 'All Files', extensions: ['*'] },
              ],
              properties: ['openFile'],
            });
            if (!result.canceled && result.filePaths.length > 0) {
              const data = fs.readFileSync(result.filePaths[0], 'utf-8');
              mainWindow.webContents.send('file:load', data);
            }
          },
        },
        {
          label: 'Save Project',
          accelerator: 'Cmd+S',
          click: () => mainWindow.webContents.send('file:save'),
        },
        {
          label: 'Save Project As...',
          accelerator: 'Cmd+Shift+S',
          click: () => mainWindow.webContents.send('file:save-as'),
        },
        { type: 'separator' },
        {
          label: 'Export as PNG...',
          accelerator: 'Cmd+E',
          click: () => mainWindow.webContents.send('file:export-png'),
        },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        {
          label: 'Undo',
          accelerator: 'Cmd+Z',
          click: () => mainWindow.webContents.send('edit:undo'),
        },
        {
          label: 'Redo',
          accelerator: 'Cmd+Shift+Z',
          click: () => mainWindow.webContents.send('edit:redo'),
        },
        { type: 'separator' },
        {
          label: 'Clear Grid',
          accelerator: 'Cmd+Backspace',
          click: () => mainWindow.webContents.send('edit:clear'),
        },
        {
          label: 'Random Seed',
          accelerator: 'Cmd+R',
          click: () => mainWindow.webContents.send('edit:random'),
        },
      ],
    },
    {
      label: 'Simulation',
      submenu: [
        {
          label: 'Play / Pause',
          accelerator: 'Space',
          click: () => mainWindow.webContents.send('sim:toggle'),
        },
        {
          label: 'Step Forward',
          accelerator: 'Right',
          click: () => mainWindow.webContents.send('sim:step'),
        },
        {
          label: 'Reset',
          accelerator: 'Cmd+Shift+R',
          click: () => mainWindow.webContents.send('sim:reset'),
        },
        { type: 'separator' },
        {
          label: 'Toggle Wrap (Torus)',
          accelerator: 'Cmd+W',
          click: () => mainWindow.webContents.send('sim:toggle-wrap'),
        },
      ],
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Reset Zoom',
          accelerator: 'Cmd+0',
          click: () => mainWindow.webContents.send('view:reset-zoom'),
        },
        {
          label: 'Zoom In',
          accelerator: 'Cmd+=',
          click: () => mainWindow.webContents.send('view:zoom-in'),
        },
        {
          label: 'Zoom Out',
          accelerator: 'Cmd+-',
          click: () => mainWindow.webContents.send('view:zoom-out'),
        },
        { type: 'separator' },
        { role: 'togglefullscreen' },
        { role: 'toggleDevTools' },
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About Cellular Playground',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About Cellular Playground',
              message: 'Cellular Playground v1.0',
              detail:
                'A fully featured cellular automata playground inspired by CellPond.\n\n' +
                'Keyboard Shortcuts:\n' +
                '  Space - Play/Pause\n' +
                '  Click - Draw cells\n' +
                '  Right-click - Pick color\n' +
                '  Scroll - Zoom\n' +
                '  Middle-click drag - Pan\n' +
                '  1-6 - Set brush size\n' +
                '  Cmd+S - Save\n' +
                '  Cmd+O - Open\n' +
                '  Cmd+Z - Undo\n' +
                '  Cmd+R - Random seed',
            });
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// Handle save dialog requests from renderer
ipcMain.handle('dialog:save', async (event, defaultName) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: defaultName || 'untitled.cp',
    filters: [
      { name: 'Cellular Playground', extensions: ['cp'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  });
  return result;
});

ipcMain.handle('dialog:save-png', async () => {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: 'pattern.png',
    filters: [
      { name: 'PNG Image', extensions: ['png'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  });
  return result;
});

ipcMain.handle('file:write', async (event, filePath, data) => {
  fs.writeFileSync(filePath, data, 'utf-8');
  return true;
});

ipcMain.handle('file:write-buffer', async (event, filePath, buffer) => {
  fs.writeFileSync(filePath, Buffer.from(buffer));
  return true;
});

app.whenReady().then(() => {
  // Set macOS dock icon
  if (process.platform === 'darwin') {
    const iconPath = path.join(__dirname, 'icon.png');
    try {
      const nativeImage = require('electron').nativeImage;
      app.dock.setIcon(nativeImage.createFromPath(iconPath));
    } catch (e) {
      // Dock icon is cosmetic — silently fail
    }
  }
  createWindow();
});

app.on('window-all-closed', () => {
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
