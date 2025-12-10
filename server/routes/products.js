const express = require('express');
const pool = require('../config/database');
const { authenticateToken, isAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/categories', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM categories WHERE is_active = true ORDER BY name'
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

router.get('/', async (req, res) => {
  try {
    const { category_id, search } = req.query;
    let query = `
      SELECT p.*, c.name as category_name, c.name_ar as category_name_ar,
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

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (p.name ILIKE $${params.length} OR p.name_ar ILIKE $${params.length})`;
    }

    query += ' ORDER BY p.created_at DESC';

    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.*, c.name as category_name,
              (SELECT COUNT(*) FROM card_codes WHERE product_id = p.id AND is_sold = false) as available_stock
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'المنتج غير موجود' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

router.post('/', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { category_id, name, name_ar, description, image_url, base_price, selling_price, distributor_price, product_type } = req.body;

    const result = await pool.query(
      `INSERT INTO products (category_id, name, name_ar, description, image_url, base_price, selling_price, distributor_price, product_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [category_id, name, name_ar, description, image_url, base_price, selling_price, distributor_price, product_type || 'digital']
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

router.put('/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { category_id, name, name_ar, description, image_url, base_price, selling_price, distributor_price, is_active, product_type } = req.body;

    const result = await pool.query(
      `UPDATE products SET 
        category_id = COALESCE($1, category_id),
        name = COALESCE($2, name),
        name_ar = COALESCE($3, name_ar),
        description = COALESCE($4, description),
        image_url = COALESCE($5, image_url),
        base_price = COALESCE($6, base_price),
        selling_price = COALESCE($7, selling_price),
        distributor_price = COALESCE($8, distributor_price),
        is_active = COALESCE($9, is_active),
        product_type = COALESCE($10, product_type),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $11 RETURNING *`,
      [category_id, name, name_ar, description, image_url, base_price, selling_price, distributor_price, is_active, product_type, req.params.id]
    );

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

router.post('/categories', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { name, name_ar, description, icon } = req.body;

    const result = await pool.query(
      'INSERT INTO categories (name, name_ar, description, icon) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, name_ar, description, icon]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

router.post('/:id/codes', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { codes } = req.body;
    const productId = req.params.id;

    if (!Array.isArray(codes) || codes.length === 0) {
      return res.status(400).json({ success: false, message: 'يجب توفير أكواد صالحة' });
    }

    const insertPromises = codes.map(code => 
      pool.query(
        'INSERT INTO card_codes (product_id, code, serial_number) VALUES ($1, $2, $3)',
        [productId, code.code, code.serial_number || null]
      )
    );

    await Promise.all(insertPromises);

    await pool.query(
      'UPDATE products SET stock_quantity = (SELECT COUNT(*) FROM card_codes WHERE product_id = $1 AND is_sold = false), updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [productId]
    );

    res.json({ success: true, message: `تم إضافة ${codes.length} كود بنجاح` });
  } catch (error) {
    res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

module.exports = router;
