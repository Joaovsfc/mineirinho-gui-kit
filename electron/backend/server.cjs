const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const db = require('./database/db.cjs');

const app = express();
const PORT = 3001;

// Middlewares
app.use(cors());
app.use(express.json());

// Middleware de logging (apenas em desenvolvimento)
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// Health check
app.get('/api/health', (req, res) => {
  try {
    // Testar conexão com o banco
    db.prepare('SELECT 1').get();
    res.json({ 
      status: 'ok', 
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error', 
      database: 'disconnected',
      error: error.message 
    });
  }
});

// Rotas de autenticação
const authRoutes = require('./routes/auth.cjs');
app.use('/api/auth', authRoutes);

// Rotas de produtos
const productsRoutes = require('./routes/products.cjs');
app.use('/api/products', productsRoutes);

// Rotas de clientes
const clientsRoutes = require('./routes/clients.cjs');
app.use('/api/clients', clientsRoutes);

// Rotas de vendas
const salesRoutes = require('./routes/sales.cjs');
app.use('/api/sales', salesRoutes);

// Rotas de contas (a pagar e receber)
const accountsRoutes = require('./routes/accounts.cjs');
app.use('/api/accounts', accountsRoutes);

// Rotas de consignação
const consignmentsRoutes = require('./routes/consignments.cjs');
app.use('/api/consignments', consignmentsRoutes);

// Rotas de relatórios
const reportsRoutes = require('./routes/reports.cjs');
app.use('/api/reports', reportsRoutes);

// Rotas de banco de dados (export/import)
try {
  const databaseRoutes = require('./routes/database.cjs');
  app.use('/api/database', databaseRoutes);
  console.log('✅ Rotas de banco de dados registradas: /api/database');
} catch (error) {
  console.error('❌ Erro ao carregar rotas de banco de dados:', error.message);
}

// Criar usuário admin padrão se não existir
async function createDefaultAdmin() {
  try {
    // Verificar se já existe algum usuário
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
    
    if (userCount.count === 0) {
      // Criar usuário admin padrão
      const defaultUsername = 'admin';
      const defaultPassword = 'admin123';
      const defaultEmail = 'admin@mineirinho.com';
      
      // Hash da senha
      const passwordHash = await bcrypt.hash(defaultPassword, 10);
      
      // Verificar se a coluna is_admin existe (pode não existir se migrations ainda não rodaram)
      const hasIsAdminColumn = columnExists('users', 'is_admin');
      
      // Inserir usuário admin
      if (hasIsAdminColumn) {
        db.prepare(`
          INSERT INTO users (username, email, password_hash, is_admin)
          VALUES (?, ?, ?, 1)
        `).run(defaultUsername, defaultEmail, passwordHash);
      } else {
        db.prepare(`
          INSERT INTO users (username, email, password_hash)
          VALUES (?, ?, ?)
        `).run(defaultUsername, defaultEmail, passwordHash);
      }
      
      console.log('👤 Usuário admin padrão criado:');
      console.log(`   Username: ${defaultUsername}`);
      console.log(`   Senha: ${defaultPassword}`);
      console.log(`   ⚠️  IMPORTANTE: Altere a senha após o primeiro login!`);
    }
  } catch (error) {
    console.error('❌ Erro ao criar usuário admin padrão:', error);
    // Não interromper a inicialização se falhar
  }
}

// Função auxiliar para verificar se uma coluna existe
function columnExists(tableName, columnName) {
  try {
    const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
    return columns.some(col => col.name === columnName);
  } catch (error) {
    return false;
  }
}

// Função auxiliar para adicionar coluna se não existir
function addColumnIfNotExists(tableName, columnName, columnDefinition) {
  if (!columnExists(tableName, columnName)) {
    try {
      db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition}`);
      return true;
    } catch (error) {
      // Ignorar erro se coluna já existir (pode acontecer em race conditions)
      if (!error.message.includes('duplicate column')) {
        throw error;
      }
    }
  }
  return false;
}

// Inicializar banco de dados (executar migrations)
async function initializeDatabase() {
  try {
    const migrationsDir = path.join(__dirname, 'database', 'migrations');
    
    // Listar todos os arquivos de migração ordenados
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    // Executar cada migração
    for (const file of migrationFiles) {
      const migrationPath = path.join(migrationsDir, file);
      const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
      
      // Para a migration 003, tratar ALTER TABLE de forma especial
      if (file === '003_clients_additional_fields.sql') {
        // Adicionar colunas apenas se não existirem
        addColumnIfNotExists('clients', 'cnpj_cpf', 'TEXT');
        addColumnIfNotExists('clients', 'state_registration', 'TEXT');
        addColumnIfNotExists('clients', 'buyer_name', 'TEXT');
        
        // Executar o resto da migration (CREATE TABLE, etc.)
        // Remover os comandos ALTER TABLE do SQL antes de executar
        const sqlWithoutAlter = migrationSQL
          .split('\n')
          .filter(line => !line.trim().startsWith('ALTER TABLE clients ADD COLUMN'))
          .join('\n');
        
        if (sqlWithoutAlter.trim()) {
          db.exec(sqlWithoutAlter);
        }
        
        // Migrar telefones existentes para a nova tabela (apenas uma vez)
        try {
          const existingPhones = db.prepare(`
            SELECT COUNT(*) as count FROM client_phones
          `).get();
          
          // Se não há telefones na nova tabela, migrar da tabela antiga
          if (existingPhones.count === 0) {
            const clientsWithPhone = db.prepare(`
              SELECT id, phone FROM clients 
              WHERE phone IS NOT NULL AND phone != ''
            `).all();
            
            if (clientsWithPhone.length > 0) {
              const insertPhone = db.prepare(`
                INSERT INTO client_phones (client_id, phone, phone_type)
                VALUES (?, ?, 'Principal')
              `);
              
              for (const client of clientsWithPhone) {
                insertPhone.run(client.id, client.phone);
              }
              console.log(`📞 Migrados ${clientsWithPhone.length} telefone(s) para a nova tabela`);
            }
          }
        } catch (error) {
          // Ignorar erro se a tabela client_phones ainda não existir
          if (!error.message.includes('no such table')) {
            console.warn('⚠️  Aviso ao migrar telefones:', error.message);
          }
        }
      } else if (file === '005_add_sale_id_to_accounts_receivable.sql') {
        // Adicionar campo sale_id na tabela accounts_receivable
        const added = addColumnIfNotExists('accounts_receivable', 'sale_id', 'INTEGER');
        if (added) {
          console.log('✅ Coluna sale_id adicionada à tabela accounts_receivable');
        } else {
          console.log('ℹ️  Coluna sale_id já existe na tabela accounts_receivable');
        }
        // Adicionar foreign key se não existir (via índice)
        try {
          db.exec(`
            CREATE INDEX IF NOT EXISTS idx_accounts_receivable_sale_id 
            ON accounts_receivable(sale_id)
          `);
        } catch (error) {
          // Ignorar se já existir
        }
      } else if (file === '006_add_payment_method.sql') {
        // Adicionar campo payment_method nas tabelas
        const addedPayable = addColumnIfNotExists('accounts_payable', 'payment_method', 'TEXT');
        const addedReceivable = addColumnIfNotExists('accounts_receivable', 'payment_method', 'TEXT');
        if (addedPayable || addedReceivable) {
          console.log('✅ Coluna payment_method adicionada às tabelas de contas');
        } else {
          console.log('ℹ️  Coluna payment_method já existe nas tabelas de contas');
        }
      } else if (file === '007_add_payment_method_to_sales.sql') {
        // Adicionar campo payment_method na tabela sales
        const added = addColumnIfNotExists('sales', 'payment_method', 'TEXT');
        if (added) {
          console.log('✅ Coluna payment_method adicionada à tabela sales');
        } else {
          console.log('ℹ️  Coluna payment_method já existe na tabela sales');
        }
      } else if (file === '010_add_consignment_sale_fields.sql') {
        // Adicionar campos de encerramento na tabela consignments
        const addedSaleId = addColumnIfNotExists('consignments', 'sale_id', 'INTEGER');
        const addedClosedQty = addColumnIfNotExists('consignments', 'closed_quantity', 'REAL');
        const addedClosedTotal = addColumnIfNotExists('consignments', 'closed_total', 'REAL');
        
        if (addedSaleId || addedClosedQty || addedClosedTotal) {
          console.log('✅ Campos de encerramento adicionados à tabela consignments');
        } else {
          console.log('ℹ️  Campos de encerramento já existem na tabela consignments');
        }
        
        // Criar índice para sale_id
        try {
          db.exec(`
            CREATE INDEX IF NOT EXISTS idx_consignments_sale_id 
            ON consignments(sale_id)
          `);
        } catch (error) {
          // Ignorar se já existir
        }
      } else if (file === '012_add_user_id_to_sales_and_consignments.sql') {
        // Adicionar campo user_id nas tabelas sales e consignments
        const addedSalesUserId = addColumnIfNotExists('sales', 'user_id', 'INTEGER');
        const addedConsignmentsUserId = addColumnIfNotExists('consignments', 'user_id', 'INTEGER');
        
        if (addedSalesUserId || addedConsignmentsUserId) {
          console.log('✅ Campo user_id adicionado às tabelas sales e consignments');
        } else {
          console.log('ℹ️  Campo user_id já existe nas tabelas sales e consignments');
        }
        
        // Criar índices
        try {
          db.exec(`
            CREATE INDEX IF NOT EXISTS idx_sales_user_id ON sales(user_id);
            CREATE INDEX IF NOT EXISTS idx_consignments_user_id ON consignments(user_id);
          `);
        } catch (error) {
          // Ignorar se já existir
        }
      } else if (file === '013_add_active_to_products.sql') {
        // Adicionar campo active na tabela products
        const addedActive = addColumnIfNotExists('products', 'active', 'INTEGER');
        
        if (addedActive) {
          console.log('✅ Campo active adicionado à tabela products');
          // Definir todos os produtos existentes como ativos
          db.prepare('UPDATE products SET active = 1 WHERE active IS NULL').run();
        } else {
          console.log('ℹ️  Campo active já existe na tabela products');
        }
        
        // Criar índice
        try {
          db.exec(`
            CREATE INDEX IF NOT EXISTS idx_products_active ON products(active);
          `);
        } catch (error) {
          // Ignorar se já existir
        }
      } else if (file === '014_add_is_admin_to_users.sql') {
        // Adicionar campo is_admin na tabela users
        const addedIsAdmin = addColumnIfNotExists('users', 'is_admin', 'INTEGER DEFAULT 0 NOT NULL');
        
        if (addedIsAdmin) {
          console.log('✅ Campo is_admin adicionado à tabela users');
          // Tornar o primeiro usuário (geralmente o admin padrão) como administrador
          try {
            const firstUser = db.prepare('SELECT id FROM users ORDER BY id LIMIT 1').get();
            if (firstUser) {
              db.prepare('UPDATE users SET is_admin = 1 WHERE id = ?').run(firstUser.id);
              console.log(`✅ Primeiro usuário (ID: ${firstUser.id}) definido como administrador`);
            }
          } catch (error) {
            console.warn('⚠️  Aviso ao definir primeiro usuário como admin:', error.message);
          }
        } else {
          console.log('ℹ️  Campo is_admin já existe na tabela users');
        }
        
        // Criar índice
        try {
          db.exec(`
            CREATE INDEX IF NOT EXISTS idx_users_is_admin ON users(is_admin);
          `);
        } catch (error) {
          // Ignorar se já existir
        }
      } else if (file === '015_add_active_to_users.sql') {
        // Adicionar campo active na tabela users
        const addedActive = addColumnIfNotExists('users', 'active', 'INTEGER DEFAULT 1 NOT NULL');
        
        if (addedActive) {
          console.log('✅ Campo active adicionado à tabela users');
          // Definir todos os usuários existentes como ativos
          db.prepare('UPDATE users SET active = 1 WHERE active IS NULL').run();
        } else {
          console.log('ℹ️  Campo active já existe na tabela users');
        }
        
        // Criar índice
        try {
          db.exec(`
            CREATE INDEX IF NOT EXISTS idx_users_active ON users(active);
          `);
        } catch (error) {
          // Ignorar se já existir
        }
      } else if (file === '011_make_consignment_fields_nullable.sql') {
        // SQLite não suporta MODIFY COLUMN diretamente
        // Vamos recriar a tabela sem as constraints NOT NULL em product_id e quantity
        // para permitir múltiplos itens via consignment_items
        
        try {
          // Verificar se a tabela consignment_items existe
          const itemsTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='consignment_items'").get();
          if (!itemsTable) {
            console.log('⚠️  Tabela consignment_items não existe ainda, pulando migration 011');
          } else {
            // Verificar se já foi aplicada (verificar se product_id pode ser NULL)
            const columns = db.prepare('PRAGMA table_info(consignments)').all();
            const productIdColumn = columns.find(col => col.name === 'product_id');
            
            // Se product_id ainda é NOT NULL, precisamos recriar a tabela
            if (productIdColumn && productIdColumn.notnull === 1) {
              console.log('🔄 Recriando tabela consignments para permitir NULL em product_id e quantity...');
              
              // Verificar quais colunas existem antes de criar a nova tabela
              const existingColumns = db.prepare('PRAGMA table_info(consignments)').all();
              const hasSaleId = existingColumns.some(col => col.name === 'sale_id');
              const hasClosedQty = existingColumns.some(col => col.name === 'closed_quantity');
              const hasClosedTotal = existingColumns.some(col => col.name === 'closed_total');
              const hasUserId = existingColumns.some(col => col.name === 'user_id');
              
              // Criar tabela temporária com nova estrutura
              let createTableSQL = `
                CREATE TABLE consignments_new (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  client_id INTEGER NOT NULL,
                  product_id INTEGER,
                  quantity REAL,
                  date DATETIME DEFAULT CURRENT_TIMESTAMP,
                  status TEXT DEFAULT 'Ativo',
                  notes TEXT
              `;
              
              if (hasSaleId) createTableSQL += ',\n                  sale_id INTEGER';
              if (hasClosedQty) createTableSQL += ',\n                  closed_quantity REAL';
              if (hasClosedTotal) createTableSQL += ',\n                  closed_total REAL';
              if (hasUserId) createTableSQL += ',\n                  user_id INTEGER';
              
              createTableSQL += `,
                  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE RESTRICT,
                  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
                )
              `;
              
              db.exec(createTableSQL);
              
              // Copiar dados existentes
              const selectColumns = ['id', 'client_id', 'product_id', 'quantity', 'date', 'status', 'notes'];
              if (hasSaleId) selectColumns.push('sale_id');
              else selectColumns.push('NULL as sale_id');
              if (hasClosedQty) selectColumns.push('closed_quantity');
              else selectColumns.push('NULL as closed_quantity');
              if (hasClosedTotal) selectColumns.push('closed_total');
              else selectColumns.push('NULL as closed_total');
              if (hasUserId) selectColumns.push('user_id');
              else selectColumns.push('NULL as user_id');
              
              db.exec(`
                INSERT INTO consignments_new 
                SELECT ${selectColumns.join(', ')}
                FROM consignments
              `);
              
              // Deletar tabela antiga
              db.exec('DROP TABLE consignments');
              
              // Renomear tabela nova
              db.exec('ALTER TABLE consignments_new RENAME TO consignments');
              
              // Recriar índices
              let indexSQL = `
                CREATE INDEX IF NOT EXISTS idx_consignments_client_id ON consignments(client_id);
                CREATE INDEX IF NOT EXISTS idx_consignments_product_id ON consignments(product_id);
                CREATE INDEX IF NOT EXISTS idx_consignments_status ON consignments(status);
              `;
              
              if (hasSaleId) {
                indexSQL += `CREATE INDEX IF NOT EXISTS idx_consignments_sale_id ON consignments(sale_id);\n`;
              }
              if (hasUserId) {
                indexSQL += `CREATE INDEX IF NOT EXISTS idx_consignments_user_id ON consignments(user_id);\n`;
              }
              
              db.exec(indexSQL);
              
              console.log('✅ Tabela consignments recriada - product_id e quantity agora são opcionais');
            } else {
              console.log('ℹ️  Campos product_id e quantity já são opcionais na tabela consignments');
            }
          }
        } catch (error) {
          // Se der erro, pode ser que a tabela já tenha sido modificada
          if (error.message.includes('no such table') || error.message.includes('already exists')) {
            console.log('⚠️  Migration 011 já foi aplicada ou tabela não existe');
          } else {
            console.error('❌ Erro na migration 011:', error.message);
            // Não interromper a inicialização
          }
        }
      } else {
        // Para outras migrations, executar normalmente
        try {
          db.exec(migrationSQL);
        } catch (error) {
          // Ignorar erros de coluna duplicada ou tabela já existente
          if (error.message.includes('duplicate column') || 
              error.message.includes('already exists')) {
            console.log(`⚠️  Migration ${file} já foi executada (ignorando erro)`);
          } else {
            throw error;
          }
        }
      }
      
      console.log(`✅ Migration executed: ${file}`);
    }
    
    console.log('✅ Database initialized successfully');
    
    // Criar usuário admin padrão se não existir
    await createDefaultAdmin();
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    throw error;
  }
}

// Função para iniciar o servidor
async function startServer() {
  try {
    // Inicializar banco de dados primeiro
    await initializeDatabase();
    
    // Iniciar servidor HTTP
    app.listen(PORT, () => {
      console.log(`🚀 Backend server running on http://localhost:${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Exportar app e função de inicialização
module.exports = { startServer, app };

// Se executado diretamente (não via Electron), iniciar servidor
if (require.main === module) {
  startServer();
}

