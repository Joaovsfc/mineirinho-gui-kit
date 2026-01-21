const { app, BrowserWindow } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');
const fs = require('fs');
//const isDev = require('electron-is-dev');

const isDev = !app.isPackaged;

let mainWindow;

// URL base da aplicação
const getStartUrl = () => {
  if (isDev) {
    return 'http://localhost:8080';
  }
  
  // Em produção, usar app.getAppPath() para obter o caminho correto
  const appPath = app.getAppPath();
  const htmlPath = path.join(appPath, 'dist', 'index.html');
  
  // Debug: verificar se o arquivo existe
  console.log('App Path:', appPath);
  console.log('HTML Path:', htmlPath);
  console.log('File exists:', fs.existsSync(htmlPath));
  
  // Usar pathToFileURL para garantir formato correto do file:// URL
  const fileUrl = pathToFileURL(htmlPath).href;
  console.log('File URL:', fileUrl);
  
  return fileUrl;
};

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
    icon: path.join(__dirname, '../public/favicon.ico'),
  });

  // Carregar aplicação
  const startUrl = getStartUrl();
  mainWindow.loadURL(startUrl);

  // Abrir DevTools em desenvolvimento ou para debug
  // Temporariamente sempre abrir para debug do backend
  mainWindow.webContents.openDevTools();

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Limpar sessão quando a janela for fechada (garantir logout ao fechar)
  mainWindow.on('close', () => {
    // Limpar sessionStorage e localStorage antes de fechar
    mainWindow.webContents.executeJavaScript(`
      sessionStorage.clear();
      localStorage.removeItem('user');
      localStorage.removeItem('token');
    `).catch(err => {
      console.error('Erro ao limpar sessão:', err);
    });
  });
}

// Segurança: Prevenir navegação para URLs externas
app.on('web-contents-created', (_, contents) => {
  contents.on('will-navigate', (event, navigationUrl) => {
    const startUrl = getStartUrl();
    const parsedUrl = new URL(navigationUrl);
    const allowedOrigin = isDev ? 'http://localhost:8080' : 'file://';

    if (!navigationUrl.startsWith(allowedOrigin) && !navigationUrl.startsWith('file://')) {
      event.preventDefault();
    }
  });
});

// Quando o app estiver pronto
app.whenReady().then(async () => {
  // Iniciar servidor backend
  try {
    let backendPath;
    let nodeModulesPath;
    
    if (isDev) {
      // Em desenvolvimento, usar caminho relativo
      backendPath = path.join(__dirname, 'backend', 'server.cjs');
      nodeModulesPath = path.join(__dirname, '..', 'node_modules');
    } else {
      // Em produção, o backend está em Contents/backend/ (fora do app.asar)
      // process.resourcesPath aponta para Contents/Resources/
      // O backend está em Contents/backend/, então precisamos subir um nível
      backendPath = path.join(process.resourcesPath, '..', 'backend', 'server.cjs');
      // node_modules estão em app.asar.unpacked/node_modules
      nodeModulesPath = path.join(process.resourcesPath, 'app.asar.unpacked', 'node_modules');
    }
    
    console.log('Backend path:', backendPath);
    console.log('Backend path exists:', fs.existsSync(backendPath));
    console.log('Node modules path:', nodeModulesPath);
    console.log('Node modules exists:', fs.existsSync(nodeModulesPath));
    console.log('Resources path:', process.resourcesPath);
    console.log('App path:', app.getAppPath());
    
    // Adicionar node_modules ao caminho de resolução de módulos
    if (!isDev) {
      const Module = require('module');
      
      // Caminhos possíveis para node_modules
      const possibleNodeModulesPaths = [
        nodeModulesPath, // app.asar.unpacked/node_modules
        path.join(process.resourcesPath, 'app.asar', 'node_modules'), // Dentro do asar
        path.join(app.getAppPath(), 'node_modules'), // No app path
      ];
      
      // Adicionar caminhos que existem
      const existingPaths = possibleNodeModulesPaths.filter(p => fs.existsSync(p));
      console.log('Existing node_modules paths:', existingPaths);
      
      // Adicionar ao NODE_PATH
      if (existingPaths.length > 0) {
        const nodePath = existingPaths.join(process.platform === 'win32' ? ';' : ':');
        if (!process.env.NODE_PATH) {
          process.env.NODE_PATH = nodePath;
        } else {
          process.env.NODE_PATH = `${nodePath}:${process.env.NODE_PATH}`;
        }
        console.log('NODE_PATH set to:', process.env.NODE_PATH);
      }
      
      // Sobrescrever _nodeModulePaths para incluir nossos caminhos
      const originalPaths = Module._nodeModulePaths;
      Module._nodeModulePaths = function(from) {
        const paths = originalPaths.call(this, from);
        // Adicionar nossos caminhos no início
        existingPaths.forEach(p => {
          if (!paths.includes(p)) {
            paths.unshift(p);
          }
        });
        return paths;
      };
    }
    
    const { startServer } = require(backendPath);
    console.log('Backend module loaded successfully');
    await startServer();
    console.log('Backend server started');
  } catch (error) {
    console.error('Failed to start backend server:', error);
    console.error('Error details:', error.stack);
  }

  createWindow();

  app.on('activate', () => {
    // No macOS, recriar janela quando clicar no ícone do dock
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Fechar quando todas as janelas forem fechadas (exceto no macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Fechar conexão do banco de dados ao sair
app.on('before-quit', () => {
  try {
    const db = require('./backend/database/db.cjs');
    db.close();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Error closing database:', error);
  }
});

