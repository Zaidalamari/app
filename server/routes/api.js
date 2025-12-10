const express = require('express');
const pool = require('../config/database');
const { authenticateApiKey } = require('../middleware/auth');
const { processOrder } = require('./orders');

const router = express.Router();

router.get('/products', authenticateApiKey, async (req, res) => {
  try {
    const { category_id } = req.query;
    
    let query = `
      SELECT p.id, p.name, p.name_ar, p.description, p.image_url, 
             p.distributor_price as price, p.category_id,
             c.name as category_name,
             (SELECT COUNT(*) FROM card_codes WHERE product_id = p.id AND is_sold = false) as available_stock
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.is_active = true
    `;
    
    const params = [];
    if (category_id) {
      params.push(category_id);
      query += ` AND p.category_id = $${params.length}`;
    }

    query += ' ORDER BY p.name';

    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

router.get('/categories', authenticateApiKey, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, name_ar, icon FROM categories WHERE is_active = true ORDER BY name'
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

router.post('/purchase', authenticateApiKey, async (req, res) => {
  try {
    const { product_id, quantity = 1 } = req.body;

    if (!product_id) {
      return res.status(400).json({ success: false, message: 'معرف المنتج مطلوب' });
    }

    const result = await processOrder(req.user.id, product_id, quantity, true);

    res.json({ success: true, message: 'تم الشراء بنجاح', data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.get('/balance', authenticateApiKey, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT balance, currency FROM wallets WHERE user_id = $1',
      [req.user.id]
    );

    res.json({ 
      success: true, 
      data: result.rows[0] || { balance: 0, currency: 'SAR' }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

router.get('/orders', authenticateApiKey, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const result = await pool.query(
      `SELECT o.id, o.product_id, o.quantity, o.total_price, o.status, o.created_at,
              p.name as product_name,
              (SELECT json_agg(json_build_object('code', cc.code, 'serial_number', cc.serial_number))
               FROM card_codes cc WHERE cc.order_id = o.id) as codes
       FROM orders o
       LEFT JOIN products p ON o.product_id = p.id
       WHERE o.user_id = $1
       ORDER BY o.created_at DESC
       LIMIT $2 OFFSET $3`,
      [req.user.id, limit, offset]
    );

    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

router.get('/order/:id', authenticateApiKey, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT o.id, o.product_id, o.quantity, o.total_price, o.status, o.created_at,
              p.name as product_name,
              (SELECT json_agg(json_build_object('code', cc.code, 'serial_number', cc.serial_number))
               FROM card_codes cc WHERE cc.order_id = o.id) as codes
       FROM orders o
       LEFT JOIN products p ON o.product_id = p.id
       WHERE o.id = $1 AND o.user_id = $2`,
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'الطلب غير موجود' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

module.exports = router;
