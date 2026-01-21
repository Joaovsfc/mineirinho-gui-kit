const express = require('express');
const db = require('../database/db.cjs');

const router = express.Router();

// GET /api/reports/sales
// Retorna relatório detalhado de vendas no período
router.get('/sales', (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let query = `
      SELECT 
        s.*,
        c.name as client_name,
        u.username as user_name
      FROM sales s
      LEFT JOIN clients c ON s.client_id = c.id
      LEFT JOIN users u ON s.user_id = u.id
      WHERE 1=1
    `;
    const params = [];
    
    if (startDate) {
      query += ' AND s.date >= ?';
      params.push(startDate);
    }
    
    if (endDate) {
      query += ' AND s.date <= ?';
      params.push(endDate + ' 23:59:59');
    }
    
    query += ' ORDER BY s.date DESC';
    
    const sales = db.prepare(query).all(...params);
    
    // Buscar itens de cada venda
    const salesWithItems = sales.map(sale => {
      const items = db.prepare(`
        SELECT 
          si.*,
          p.name as product_name,
          p.unit
        FROM sale_items si
        INNER JOIN products p ON si.product_id = p.id
        WHERE si.sale_id = ?
      `).all(sale.id);
      
      return {
        ...sale,
        items: items
      };
    });
    
    // Calcular totais
    const totalSales = sales.reduce((sum, sale) => sum + parseFloat(sale.total || 0), 0);
    const totalItems = salesWithItems.reduce((sum, sale) => {
      return sum + sale.items.reduce((itemSum, item) => itemSum + parseFloat(item.quantity || 0), 0);
    }, 0);
    
    res.json({
      sales: salesWithItems,
      summary: {
        total: totalSales,
        count: sales.length,
        totalItems: totalItems,
        startDate: startDate || null,
        endDate: endDate || null
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/reports/sales-paid
// Retorna relatório detalhado de vendas pagas (concretizadas) no período
router.get('/sales-paid', (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let query = `
      SELECT 
        s.*,
        c.name as client_name,
        u.username as user_name
      FROM sales s
      LEFT JOIN clients c ON s.client_id = c.id
      LEFT JOIN users u ON s.user_id = u.id
      WHERE s.status = 'Pago'
    `;
    const params = [];
    
    if (startDate) {
      query += ' AND s.date >= ?';
      params.push(startDate);
    }
    
    if (endDate) {
      query += ' AND s.date <= ?';
      params.push(endDate + ' 23:59:59');
    }
    
    query += ' ORDER BY s.date DESC';
    
    const sales = db.prepare(query).all(...params);
    
    // Buscar itens de cada venda
    const salesWithItems = sales.map(sale => {
      const items = db.prepare(`
        SELECT 
          si.*,
          p.name as product_name,
          p.unit
        FROM sale_items si
        INNER JOIN products p ON si.product_id = p.id
        WHERE si.sale_id = ?
      `).all(sale.id);
      
      return {
        ...sale,
        items: items
      };
    });
    
    // Calcular totais
    const totalSales = sales.reduce((sum, sale) => sum + parseFloat(sale.total || 0), 0);
    const totalItems = salesWithItems.reduce((sum, sale) => {
      return sum + sale.items.reduce((itemSum, item) => itemSum + parseFloat(item.quantity || 0), 0);
    }, 0);
    
    res.json({
      sales: salesWithItems,
      summary: {
        total: totalSales,
        count: sales.length,
        totalItems: totalItems,
        startDate: startDate || null,
        endDate: endDate || null
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/reports/sales-period
// Retorna vendas no período especificado
router.get('/sales-period', (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let query = 'SELECT * FROM sales WHERE 1=1';
    const params = [];
    
    if (startDate) {
      query += ' AND date >= ?';
      params.push(startDate);
    }
    
    if (endDate) {
      query += ' AND date <= ?';
      params.push(endDate + ' 23:59:59'); // Incluir o dia inteiro
    }
    
    query += ' ORDER BY date DESC';
    
    const sales = db.prepare(query).all(...params);
    
    // Calcular total de vendas
    const totalSales = sales.reduce((sum, sale) => sum + parseFloat(sale.total || 0), 0);
    
    res.json({
      total: totalSales,
      count: sales.length,
      sales: sales
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/reports/products-sold
// Retorna quantidade de produtos vendidos no período
router.get('/products-sold', (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let query = `
      SELECT 
        si.product_id,
        p.name as product_name,
        p.unit,
        SUM(si.quantity) as total_quantity
      FROM sale_items si
      INNER JOIN sales s ON si.sale_id = s.id
      INNER JOIN products p ON si.product_id = p.id
      WHERE 1=1
    `;
    const params = [];
    
    if (startDate) {
      query += ' AND s.date >= ?';
      params.push(startDate);
    }
    
    if (endDate) {
      query += ' AND s.date <= ?';
      params.push(endDate + ' 23:59:59');
    }
    
    query += ' GROUP BY si.product_id, p.name, p.unit ORDER BY total_quantity DESC';
    
    const productsSold = db.prepare(query).all(...params);
    
    // Calcular total geral
    const totalQuantity = productsSold.reduce((sum, item) => sum + parseFloat(item.total_quantity || 0), 0);
    
    res.json({
      total: totalQuantity,
      products: productsSold
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/reports/average-ticket
// Retorna ticket médio (valor médio por venda) no período
router.get('/average-ticket', (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let query = 'SELECT total FROM sales WHERE 1=1';
    const params = [];
    
    if (startDate) {
      query += ' AND date >= ?';
      params.push(startDate);
    }
    
    if (endDate) {
      query += ' AND date <= ?';
      params.push(endDate + ' 23:59:59');
    }
    
    const sales = db.prepare(query).all(...params);
    
    if (sales.length === 0) {
      return res.json({
        average: 0,
        count: 0,
        total: 0
      });
    }
    
    const total = sales.reduce((sum, sale) => sum + parseFloat(sale.total || 0), 0);
    const average = total / sales.length;
    
    res.json({
      average: average,
      count: sales.length,
      total: total
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/reports/inventory
// Retorna relatório de estoque (todos os produtos com estoque atual)
router.get('/inventory', (req, res) => {
  try {
    const { calculateCurrentStock } = require('../utils/stock.cjs');
    
    // Verificar se a coluna active existe
    const columns = db.prepare('PRAGMA table_info(products)').all();
    const hasActive = columns.some(col => col.name === 'active');
    
    // Buscar todos os produtos ativos
    let query = 'SELECT * FROM products';
    if (hasActive) {
      query += ' WHERE active = 1';
    }
    query += ' ORDER BY name ASC';
    
    const products = db.prepare(query).all();
    
    // Calcular estoque atual para cada produto e adicionar informações
    const productsWithStock = products.map(product => {
      const currentStock = calculateCurrentStock(product.id);
      
      // Buscar última movimentação
      let lastMovement = null;
      try {
        const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='stock_movements'").get();
        if (tables) {
          lastMovement = db.prepare(`
            SELECT type, quantity, created_at, notes
            FROM stock_movements
            WHERE product_id = ?
            ORDER BY created_at DESC
            LIMIT 1
          `).get(product.id);
        }
      } catch (error) {
        // Ignorar erro
      }
      
      // Calcular valor total do estoque
      const stockValue = currentStock * parseFloat(product.price || 0);
      
      return {
        ...product,
        stock: currentStock,
        calculated_stock: currentStock,
        stock_value: stockValue,
        last_movement: lastMovement
      };
    });
    
    // Calcular totais
    const totalProducts = productsWithStock.length;
    const totalStockValue = productsWithStock.reduce((sum, product) => sum + product.stock_value, 0);
    const totalStockQuantity = productsWithStock.reduce((sum, product) => sum + product.calculated_stock, 0);
    const lowStockProducts = productsWithStock.filter(p => p.calculated_stock <= 0).length;
    
    res.json({
      products: productsWithStock,
      summary: {
        totalProducts: totalProducts,
        totalStockValue: totalStockValue,
        totalStockQuantity: totalStockQuantity,
        lowStockProducts: lowStockProducts
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/reports/financial
// Retorna relatório financeiro (contas a pagar e receber) no período
router.get('/financial', (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Buscar contas a pagar
    let payableQuery = `
      SELECT 
        ap.*
      FROM accounts_payable ap
      WHERE 1=1
    `;
    const payableParams = [];
    
    if (startDate) {
      payableQuery += ' AND (ap.due_date >= ? OR ap.paid_date >= ?)';
      payableParams.push(startDate, startDate);
    }
    
    if (endDate) {
      payableQuery += ' AND (ap.due_date <= ? OR ap.paid_date <= ?)';
      payableParams.push(endDate + ' 23:59:59', endDate + ' 23:59:59');
    }
    
    payableQuery += ' ORDER BY ap.due_date ASC';
    
    const accountsPayable = db.prepare(payableQuery).all(...payableParams);
    
    // Buscar contas a receber
    let receivableQuery = `
      SELECT 
        ar.*,
        c.name as client_name
      FROM accounts_receivable ar
      LEFT JOIN clients c ON ar.client_id = c.id
      WHERE 1=1
    `;
    const receivableParams = [];
    
    if (startDate) {
      receivableQuery += ' AND (ar.due_date >= ? OR ar.received_date >= ?)';
      receivableParams.push(startDate, startDate);
    }
    
    if (endDate) {
      receivableQuery += ' AND (ar.due_date <= ? OR ar.received_date <= ?)';
      receivableParams.push(endDate + ' 23:59:59', endDate + ' 23:59:59');
    }
    
    receivableQuery += ' ORDER BY ar.due_date ASC';
    
    const accountsReceivable = db.prepare(receivableQuery).all(...receivableParams);
    
    // Calcular totais
    const totalPayable = accountsPayable.reduce((sum, acc) => sum + parseFloat(acc.value || 0), 0);
    const totalReceivable = accountsReceivable.reduce((sum, acc) => sum + parseFloat(acc.value || 0), 0);
    
    // Separar por status
    const payablePending = accountsPayable.filter(acc => acc.status === 'Pendente' || !acc.status);
    const payablePaid = accountsPayable.filter(acc => acc.status === 'Pago');
    const receivablePending = accountsReceivable.filter(acc => acc.status === 'Pendente' || !acc.status);
    const receivableReceived = accountsReceivable.filter(acc => acc.status === 'Recebido');
    
    // Calcular totais por status
    const totalPayablePending = payablePending.reduce((sum, acc) => sum + parseFloat(acc.value || 0), 0);
    const totalPayablePaid = payablePaid.reduce((sum, acc) => sum + parseFloat(acc.value || 0), 0);
    const totalReceivablePending = receivablePending.reduce((sum, acc) => sum + parseFloat(acc.value || 0), 0);
    const totalReceivableReceived = receivableReceived.reduce((sum, acc) => sum + parseFloat(acc.value || 0), 0);
    
    // Calcular saldo
    const balance = totalReceivableReceived - totalPayablePaid;
    const projectedBalance = totalReceivable - totalPayable;
    
    res.json({
      accountsPayable: accountsPayable,
      accountsReceivable: accountsReceivable,
      summary: {
        totalPayable: totalPayable,
        totalReceivable: totalReceivable,
        totalPayablePending: totalPayablePending,
        totalPayablePaid: totalPayablePaid,
        totalReceivablePending: totalReceivablePending,
        totalReceivableReceived: totalReceivableReceived,
        balance: balance,
        projectedBalance: projectedBalance,
        payableCount: accountsPayable.length,
        receivableCount: accountsReceivable.length,
        startDate: startDate || null,
        endDate: endDate || null
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/reports/consignment
// Retorna relatório detalhado de consignações no período
router.get('/consignment', (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let query = `
      SELECT 
        c.*,
        cl.name as client_name,
        u.username as user_name
      FROM consignments c
      LEFT JOIN clients cl ON c.client_id = cl.id
      LEFT JOIN users u ON c.user_id = u.id
      WHERE 1=1
    `;
    const params = [];
    
    if (startDate) {
      query += ' AND c.date >= ?';
      params.push(startDate);
    }
    
    if (endDate) {
      query += ' AND c.date <= ?';
      params.push(endDate + ' 23:59:59');
    }
    
    query += ' ORDER BY c.date DESC';
    
    const consignments = db.prepare(query).all(...params);
    
    // Verificar se a tabela consignment_items existe
    let hasItemsTable = false;
    try {
      const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='consignment_items'").get();
      hasItemsTable = !!tables;
    } catch (error) {
      // Tabela não existe ainda
    }
    
    // Buscar itens de cada consignação
    const consignmentsWithItems = consignments.map(consignment => {
      let items = [];
      
      if (hasItemsTable) {
        items = db.prepare(`
          SELECT 
            ci.*,
            p.name as product_name,
            p.unit as product_unit
          FROM consignment_items ci
          LEFT JOIN products p ON ci.product_id = p.id
          WHERE ci.consignment_id = ?
        `).all(consignment.id);
      } else {
        // Compatibilidade: se não tem tabela de itens, criar item único
        if (consignment.product_id) {
          const product = db.prepare('SELECT name, unit FROM products WHERE id = ?').get(consignment.product_id);
          items = [{
            product_id: consignment.product_id,
            quantity: consignment.quantity,
            price: 0,
            subtotal: 0,
            product_name: product ? product.name : `Produto #${consignment.product_id}`,
            product_unit: product ? product.unit : 'un'
          }];
        }
      }
      
      return {
        ...consignment,
        items: items
      };
    });
    
    // Calcular totais
    const totalConsignments = consignmentsWithItems.length;
    const activeConsignments = consignmentsWithItems.filter(c => c.status === 'Ativo' || !c.status || c.status === 'Em Aberto').length;
    const closedConsignments = consignmentsWithItems.filter(c => c.status === 'Encerrado').length;
    const totalItems = consignmentsWithItems.reduce((sum, consignment) => {
      return sum + consignment.items.reduce((itemSum, item) => itemSum + parseFloat(item.quantity || 0), 0);
    }, 0);
    const totalClosedValue = consignmentsWithItems
      .filter(c => c.closed_total)
      .reduce((sum, c) => sum + parseFloat(c.closed_total || 0), 0);
    
    res.json({
      consignments: consignmentsWithItems,
      summary: {
        totalConsignments: totalConsignments,
        activeConsignments: activeConsignments,
        closedConsignments: closedConsignments,
        totalItems: totalItems,
        totalClosedValue: totalClosedValue,
        startDate: startDate || null,
        endDate: endDate || null
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/reports/dashboard-stats
// Retorna estatísticas gerais para o dashboard
router.get('/dashboard-stats', (req, res) => {
  try {
    // Vendas do último mês
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const lastMonthStr = lastMonth.toISOString().split('T')[0];
    
    const salesLastMonth = db.prepare(`
      SELECT SUM(total) as total, COUNT(*) as count 
      FROM sales 
      WHERE date >= ?
    `).get(lastMonthStr);
    
    // Produtos vendidos no último mês
    const productsSoldLastMonth = db.prepare(`
      SELECT SUM(si.quantity) as total
      FROM sale_items si
      INNER JOIN sales s ON si.sale_id = s.id
      WHERE s.date >= ?
    `).get(lastMonthStr);
    
    // Ticket médio
    const allSales = db.prepare('SELECT total FROM sales').all();
    const ticketAverage = allSales.length > 0
      ? allSales.reduce((sum, sale) => sum + parseFloat(sale.total || 0), 0) / allSales.length
      : 0;
    
    res.json({
      salesPeriod: {
        total: parseFloat(salesLastMonth?.total || 0),
        count: salesLastMonth?.count || 0
      },
      productsSold: {
        total: parseFloat(productsSoldLastMonth?.total || 0)
      },
      averageTicket: ticketAverage
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

