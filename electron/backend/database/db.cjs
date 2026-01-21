const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Função para obter o caminho do banco de dados
function getDbPath() {
  // Tentar usar Electron userData se disponível
  try {
    const { app } = require('electron');
    const isDev = !app.isPackaged;
    
    if (isDev) {
      // Em desenvolvimento, usar pasta local do projeto para facilitar testes
      const dbDir = path.join(__dirname, '../../..');
      // Garantir que o diretório existe
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }
      return path.join(dbDir, 'mineirinho-dev.db'); // Banco separado para dev
    } else {
      // Em produção, usar userData do Electron (pasta do usuário)
      const userDataPath = app.getPath('userData');
      // Garantir que o diretório existe
      if (!fs.existsSync(userDataPath)) {
        fs.mkdirSync(userDataPath, { recursive: true });
      }
      return path.join(userDataPath, 'mineirinho.db'); // Banco de produção
    }
  } catch (error) {
    // Se não estiver no contexto do Electron, usar pasta local do projeto
    const dbDir = path.join(__dirname, '../../..');
    // Garantir que o diretório existe
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    return path.join(dbDir, 'mineirinho.db');
  }
}

// Caminho do banco de dados
const dbPath = getDbPath();

// Criar conexão com o banco de dados
const db = new Database(dbPath);

// Habilitar foreign keys
db.pragma('foreign_keys = ON');

// Configurações de performance
db.pragma('journal_mode = WAL'); // Write-Ahead Logging para melhor performance
db.pragma('synchronous = NORMAL'); // Balance entre segurança e performance

// Log para debug (apenas em desenvolvimento)
if (process.env.NODE_ENV === 'development') {
  console.log(`Database connected at: ${dbPath}`);
}
console.log(`Database connected at: ${dbPath}`);

module.exports = db;

