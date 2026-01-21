const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const Database = require('better-sqlite3');

// Importar o banco de forma que possamos recriá-lo
let db = require('../database/db.cjs');

const router = express.Router();

// Middleware para verificar se o usuário é administrador
function requireAdmin(req, res, next) {
  try {
    // Obter userId do body ou query (em produção, deve vir do token JWT)
    const userId = req.body.userId || req.query.userId;
    
    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    // Verificar se o usuário é admin
    const user = db.prepare('SELECT is_admin FROM users WHERE id = ?').get(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const isAdmin = user.is_admin === 1 || user.is_admin === true;
    
    if (!isAdmin) {
      return res.status(403).json({ error: 'Acesso negado. Apenas administradores podem acessar esta funcionalidade.' });
    }

    next();
  } catch (error) {
    console.error('Erro ao verificar permissões de admin:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
}

// Configurar multer para upload de arquivos em memória
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB max
});

// Função para obter o caminho do banco de dados (mesma lógica do db.cjs)
function getDbPath() {
  try {
    const { app } = require('electron');
    const isDev = !app.isPackaged;
    
    if (isDev) {
      // Em desenvolvimento, usar pasta local do projeto
      const dbDir = path.join(__dirname, '../../..');
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }
      return path.join(dbDir, 'mineirinho-dev.db'); // Banco separado para dev
    } else {
      // Em produção, usar userData do Electron (pasta do usuário)
      const userDataPath = app.getPath('userData');
      if (!fs.existsSync(userDataPath)) {
        fs.mkdirSync(userDataPath, { recursive: true });
      }
      return path.join(userDataPath, 'mineirinho.db'); // Banco de produção
    }
  } catch (error) {
    // Se não estiver no contexto do Electron, usar pasta local do projeto
    const dbDir = path.join(__dirname, '../../..');
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    return path.join(dbDir, 'mineirinho.db');
  }
}

// Função para recriar a conexão do banco
function recreateDatabaseConnection() {
  const dbPath = getDbPath();
  try {
    // Se o banco atual estiver aberto, fechar
    if (db && typeof db.close === 'function') {
      try {
        db.close();
      } catch (e) {
        // Ignorar erro se já estiver fechado
      }
    }
    
    // Criar nova conexão
    const newDb = new Database(dbPath);
    newDb.pragma('foreign_keys = ON');
    newDb.pragma('journal_mode = WAL');
    newDb.pragma('synchronous = NORMAL');
    
    // Substituir a referência no módulo
    const dbModule = require.cache[require.resolve('../database/db.cjs')];
    if (dbModule) {
      dbModule.exports = newDb;
    }
    
    db = newDb;
    console.log('🔄 Conexão do banco de dados recriada');
    return newDb;
  } catch (error) {
    console.error('❌ Erro ao recriar conexão do banco:', error);
    throw error;
  }
}

// Exportar banco de dados (apenas admins)
router.get('/export', requireAdmin, (req, res) => {
  try {
    const dbPath = getDbPath();
    
    if (!fs.existsSync(dbPath)) {
      return res.status(404).json({ error: 'Banco de dados não encontrado' });
    }

    // Fazer checkpoint do WAL para garantir que todas as mudanças sejam escritas no arquivo principal
    try {
      db.pragma('wal_checkpoint(FULL)');
      console.log('✅ Checkpoint WAL executado antes da exportação');
    } catch (walError) {
      console.warn('⚠️  Aviso ao fazer checkpoint WAL:', walError.message);
      // Continuar mesmo se o checkpoint falhar
    }

    // Aguardar um pouco para garantir que o sistema de arquivos sincronize
    // (não necessário, mas ajuda em alguns casos)
    
    // Ler o arquivo do banco
    const dbBuffer = fs.readFileSync(dbPath);
    
    // Verificar se o arquivo foi lido corretamente
    if (!dbBuffer || dbBuffer.length === 0) {
      throw new Error('Arquivo do banco de dados está vazio ou não pôde ser lido');
    }
    
    // Validar se é um arquivo SQLite válido
    const sqliteHeader = dbBuffer.slice(0, 16).toString('ascii');
    if (!sqliteHeader.startsWith('SQLite format')) {
      throw new Error('Arquivo do banco de dados não é um SQLite válido');
    }
    
    // Gerar nome do arquivo com timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const filename = `mineirinho-backup-${timestamp}.db`;
    
    // Configurar headers para download
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', dbBuffer.length);
    
    // Enviar o arquivo
    res.send(dbBuffer);
    
    console.log(`✅ Banco de dados exportado: ${filename}`);
    console.log(`   Tamanho: ${formatBytes(dbBuffer.length)}`);
  } catch (error) {
    console.error('❌ Erro ao exportar banco de dados:', error);
    res.status(500).json({ error: error.message });
  }
});

// Importar banco de dados (apenas admins)
router.post('/import', requireAdmin, upload.single('file'), (req, res) => {
  try {
    // Verificar se há arquivo no request (multipart) ou dados (JSON)
    let dbBuffer;
    
    if (req.file) {
      // Arquivo enviado via multipart/form-data
      dbBuffer = req.file.buffer;
    } else if (req.body && req.body.data) {
      // Dados enviados via JSON (base64)
      if (typeof req.body.data === 'string') {
        if (req.body.data.startsWith('data:')) {
          const base64Data = req.body.data.split(',')[1];
          dbBuffer = Buffer.from(base64Data, 'base64');
        } else {
          dbBuffer = Buffer.from(req.body.data, 'base64');
        }
      } else {
        dbBuffer = Buffer.from(req.body.data);
      }
    } else {
      return res.status(400).json({ error: 'Arquivo não fornecido' });
    }

    const dbPath = getDbPath();
    const backupPath = dbPath + '.backup';
    
    // Criar backup do banco atual antes de importar
    if (fs.existsSync(dbPath)) {
      fs.copyFileSync(dbPath, backupPath);
      console.log(`📦 Backup criado: ${backupPath}`);
    }

    // Validar se é um arquivo SQLite válido
    const sqliteHeader = dbBuffer.slice(0, 16).toString('ascii');
    if (!sqliteHeader.startsWith('SQLite format')) {
      // Se houver backup, restaurar
      if (fs.existsSync(backupPath)) {
        fs.copyFileSync(backupPath, dbPath);
        fs.unlinkSync(backupPath);
      }
      return res.status(400).json({ error: 'Arquivo inválido. Não é um banco SQLite válido.' });
    }

    // Fechar a conexão do banco antes de sobrescrever o arquivo
    try {
      // Fazer checkpoint do WAL para garantir que todas as mudanças sejam escritas
      db.pragma('wal_checkpoint(FULL)');
      // Fechar a conexão
      db.close();
      console.log('🔒 Conexão do banco de dados fechada');
    } catch (closeError) {
      console.warn('⚠️  Aviso ao fechar banco:', closeError.message);
      // Tentar fechar mesmo assim
      try {
        if (db && typeof db.close === 'function') {
          db.close();
        }
      } catch (e) {
        // Ignorar erro se já estiver fechado
      }
    }
    
    // Remover arquivos WAL e SHM se existirem (criados pelo modo WAL)
    const walPath = dbPath + '-wal';
    const shmPath = dbPath + '-shm';
    try {
      if (fs.existsSync(walPath)) {
        fs.unlinkSync(walPath);
        console.log('🗑️  Arquivo WAL removido');
      }
      if (fs.existsSync(shmPath)) {
        fs.unlinkSync(shmPath);
        console.log('🗑️  Arquivo SHM removido');
      }
    } catch (walError) {
      console.warn('⚠️  Aviso ao remover arquivos WAL/SHM:', walError.message);
    }
    
    // Escrever o novo arquivo
    fs.writeFileSync(dbPath, dbBuffer);
    console.log(`💾 Arquivo do banco de dados escrito: ${dbPath}`);
    
    // Verificar se o arquivo foi escrito corretamente
    const writtenStats = fs.statSync(dbPath);
    if (writtenStats.size !== dbBuffer.length) {
      // Tentar restaurar backup
      if (fs.existsSync(backupPath)) {
        fs.copyFileSync(backupPath, dbPath);
        fs.unlinkSync(backupPath);
      }
      throw new Error(`Tamanho do arquivo escrito (${writtenStats.size}) não corresponde ao esperado (${dbBuffer.length})`);
    }
    
    // Recriar a conexão do banco com o novo arquivo
    try {
      recreateDatabaseConnection();
    } catch (recreateError) {
      console.error('❌ Erro ao recriar conexão do banco:', recreateError);
      // Tentar restaurar backup
      if (fs.existsSync(backupPath)) {
        try {
          fs.copyFileSync(backupPath, dbPath);
          fs.unlinkSync(backupPath);
          recreateDatabaseConnection();
          console.log('📦 Backup restaurado devido ao erro na recriação da conexão');
        } catch (restoreError) {
          console.error('❌ Erro ao restaurar backup:', restoreError);
        }
      }
      throw new Error('Erro ao recriar conexão do banco após importação. Reinicie o aplicativo.');
    }
    
    res.json({ 
      success: true, 
      message: 'Banco de dados importado com sucesso! Os dados já estão disponíveis.',
      backupPath: backupPath,
      fileSize: writtenStats.size
    });
    
    console.log(`✅ Banco de dados importado com sucesso`);
    console.log(`   Tamanho: ${formatBytes(writtenStats.size)}`);
    console.log(`   Conexão recriada - dados disponíveis imediatamente`);
  } catch (error) {
    console.error('❌ Erro ao importar banco de dados:', error);
    
    // Tentar restaurar backup se existir
    const dbPath = getDbPath();
    const backupPath = dbPath + '.backup';
    if (fs.existsSync(backupPath)) {
      try {
        fs.copyFileSync(backupPath, dbPath);
        fs.unlinkSync(backupPath);
        console.log('📦 Backup restaurado devido ao erro');
      } catch (restoreError) {
        console.error('❌ Erro ao restaurar backup:', restoreError);
      }
    }
    
    res.status(500).json({ error: error.message });
  }
});

// Obter informações do banco de dados (apenas admins)
router.get('/info', requireAdmin, (req, res) => {
  try {
    const dbPath = getDbPath();
    
    if (!fs.existsSync(dbPath)) {
      return res.status(404).json({ error: 'Banco de dados não encontrado' });
    }

    const stats = fs.statSync(dbPath);
    const dbSize = stats.size;
    
    // Obter informações do banco
    const tables = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `).all();
    
    const tableCounts = {};
    for (const table of tables) {
      try {
        const count = db.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get();
        tableCounts[table.name] = count.count;
      } catch (error) {
        tableCounts[table.name] = 0;
      }
    }

    res.json({
      path: dbPath,
      size: dbSize,
      sizeFormatted: formatBytes(dbSize),
      tables: tables.map(t => t.name),
      tableCounts: tableCounts,
      lastModified: stats.mtime
    });
  } catch (error) {
    console.error('❌ Erro ao obter informações do banco:', error);
    res.status(500).json({ error: error.message });
  }
});

// Função auxiliar para formatar bytes
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

module.exports = router;

