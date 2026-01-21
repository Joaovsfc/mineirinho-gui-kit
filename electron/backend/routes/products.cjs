const express = require('express');
const db = require('../database/db.cjs');
const { calculateCurrentStock } = require('../utils/stock.cjs');

const router = express.Router();

// GET /api/products
router.get('/', (req, res) => {
  try {
    // Verificar se a coluna active existe
    const columns = db.prepare('PRAGMA table_info(products)').all();
    const hasActive = columns.some(col => col.name === 'active');
    
    // Buscar apenas produtos ativos (se a coluna existir)
    let query = 'SELECT * FROM products';
    if (hasActive) {
      query += ' WHERE active = 1';
    }
    query += ' ORDER BY created_at DESC';
    
    const products = db.prepare(query).all();
    // Calcular estoque atual para cada produto
    const productsWithStock = products.map(product => {
      const currentStock = calculateCurrentStock(product.id);
      return {
        ...product,
        stock: currentStock,
        calculated_stock: currentStock
      };
    });
    res.json(productsWithStock);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/products/:id/movements
// Buscar movimentações de estoque de um produto
// IMPORTANTE: Esta rota deve vir ANTES de /:id para não ser capturada por ela
router.get('/:id/movements', (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar se a tabela stock_movements existe
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='stock_movements'").get();
    if (!tables) {
      return res.json([]);
    }
    
    // Buscar movimentações do produto ordenadas por data (mais recente primeiro)
    const movements = db.prepare(`
      SELECT 
        id,
        type,
        quantity,
        reference_type,
        reference_id,
        notes,
        created_at as date
      FROM stock_movements
      WHERE product_id = ?
      ORDER BY created_at DESC
    `).all(id);
    
    res.json(movements);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/products/:id
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    if (!product) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }
    const currentStock = calculateCurrentStock(id);
    res.json({
      ...product,
      stock: currentStock,
      calculated_stock: currentStock
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/products/:id/add-stock
// Adicionar produtos ao estoque (entrada/produção)
router.post('/:id/add-stock', (req, res) => {
  try {
    const { id } = req.params;
    const { quantity, notes } = req.body;
    
    if (!quantity || quantity <= 0) {
      return res.status(400).json({ error: 'Quantidade deve ser maior que zero' });
    }
    
    // Verificar se produto existe
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    if (!product) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }
    
    // Verificar se a tabela stock_movements existe
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='stock_movements'").get();
    if (!tables) {
      // Se não existe, atualizar estoque na tabela products
      const newStock = parseFloat(product.stock || 0) + parseFloat(quantity);
      db.prepare('UPDATE products SET stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newStock, id);
    } else {
      // Criar movimentação de entrada
      const movementStmt = db.prepare(`
        INSERT INTO stock_movements (product_id, type, quantity, reference_type, notes)
        VALUES (?, 'entrada', ?, 'producao', ?)
      `);
      movementStmt.run(id, quantity, notes || 'Adição de estoque');
    }
    
    const updatedProduct = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    const currentStock = calculateCurrentStock(id);
    res.json({
      ...updatedProduct,
      stock: currentStock,
      calculated_stock: currentStock
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/products
router.post('/', (req, res) => {
  try {
    const { name, price, stock, unit } = req.body;
    if (!name || price === undefined || stock === undefined) {
      return res.status(400).json({ error: 'Nome, preço e estoque são obrigatórios' });
    }
    const stmt = db.prepare(`
      INSERT INTO products (name, price, stock, unit)
      VALUES (?, ?, ?, ?)
    `);
    const result = stmt.run(name, price, stock, unit || 'un');
    const productId = result.lastInsertRowid;
    
    // Criar movimentação de entrada inicial
    try {
      const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='stock_movements'").get();
      if (tables) {
        const movementStmt = db.prepare(`
          INSERT INTO stock_movements (product_id, type, quantity, reference_type, notes)
          VALUES (?, 'entrada', ?, 'producao', 'Estoque inicial')
        `);
        movementStmt.run(productId, stock);
      }
    } catch (error) {
      console.warn('⚠️  Erro ao criar movimentação inicial:', error.message);
    }
    
    const newProduct = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
    const currentStock = calculateCurrentStock(productId);
    res.status(201).json({
      ...newProduct,
      stock: currentStock,
      calculated_stock: currentStock
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/products/:id
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, price, stock, unit } = req.body;
    const stmt = db.prepare(`
      UPDATE products 
      SET name = ?, price = ?, stock = ?, unit = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    stmt.run(name, price, stock, unit, id);
    const updatedProduct = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    res.json(updatedProduct);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/products/:id
// Desativa o produto ao invés de deletá-lo (mantém histórico)
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar se a coluna active existe
    const columns = db.prepare('PRAGMA table_info(products)').all();
    const hasActive = columns.some(col => col.name === 'active');
    
    if (hasActive) {
      // Desativar produto ao invés de deletar
      const stmt = db.prepare('UPDATE products SET active = 0 WHERE id = ?');
      stmt.run(id);
      res.json({ success: true, message: 'Produto desativado com sucesso' });
    } else {
      // Fallback: deletar se a coluna não existir (compatibilidade)
      const stmt = db.prepare('DELETE FROM products WHERE id = ?');
      stmt.run(id);
      res.json({ success: true });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

