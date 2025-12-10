const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken, isAdmin } = require('../middleware/auth');

const SHARK_BASE_URL = 'https://sharkiptvpro.com';
const SHARK_USERNAME = process.env.SHARK_IPTV_USERNAME;
const SHARK_PASSWORD = process.env.SHARK_IPTV_PASSWORD;

const initSharkTables = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS shark_products (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        shark_id VARCHAR(100),
        name VARCHAR(255) NOT NULL,
        name_ar VARCHAR(255),
        description TEXT,
        duration_months INTEGER DEFAULT 1,
        price DECIMAL(10,2) NOT NULL,
        selling_price DECIMAL(10,2) NOT NULL,
        image_url VARCHAR(500),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS shark_orders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        product_id UUID REFERENCES shark_products(id),
        username VARCHAR(255),
        password VARCHAR(255),
        subscription_code TEXT,
        mac_address VARCHAR(50),
        status VARCHAR(50) DEFAULT 'pending',
        expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const catExists = await pool.query("SELECT id FROM categories WHERE name = 'Shark IPTV'");
    if (catExists.rows.length === 0) {
      await pool.query(`
        INSERT INTO categories (name, name_ar, icon, is_active) 
        VALUES ('Shark IPTV', 'بطاقات شارك IPTV', '📺', true)
      `);
    }

    const productsExist = await pool.query('SELECT id FROM shark_products LIMIT 1');
    if (productsExist.rows.length === 0) {
      await pool.query(`
        INSERT INTO shark_products (name, name_ar, description, duration_months, price, selling_price, image_url) VALUES
        ('Shark IPTV - 1 Month', 'شارك IPTV - شهر واحد', 'اشتراك شارك IPTV لمدة شهر واحد - 16000+ قناة', 1, 25, 35, 'https://i.imgur.com/YkqJ8Ql.png'),
        ('Shark IPTV - 3 Months', 'شارك IPTV - 3 أشهر', 'اشتراك شارك IPTV لمدة 3 أشهر - 16000+ قناة', 3, 60, 85, 'https://i.imgur.com/YkqJ8Ql.png'),
        ('Shark IPTV - 6 Months', 'شارك IPTV - 6 أشهر', 'اشتراك شارك IPTV لمدة 6 أشهر - 16000+ قناة', 6, 100, 150, 'https://i.imgur.com/YkqJ8Ql.png'),
        ('Shark IPTV - 12 Months', 'شارك IPTV - سنة كاملة', 'اشتراك شارك IPTV لمدة سنة كاملة - 16000+ قناة', 12, 180, 250, 'https://i.imgur.com/YkqJ8Ql.png')
      `);
    }

    console.log('Shark IPTV tables initialized');
  } catch (error) {
    console.error('Error initializing Shark IPTV tables:', error);
  }
};

initSharkTables();

router.get('/products', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM shark_products WHERE is_active = true ORDER BY duration_months ASC
    `);
    res.json({ success: true, products: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'خطأ في جلب المنتجات' });
  }
});

router.post('/purchase', authenticateToken, async (req, res) => {
  const { product_id, mac_address } = req.body;

  try {
    const product = await pool.query('SELECT * FROM shark_products WHERE id = $1', [product_id]);
    if (product.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'المنتج غير موجود' });
    }

    const prod = product.rows[0];

    const wallet = await pool.query('SELECT balance FROM wallets WHERE user_id = $1', [req.user.id]);
    if (wallet.rows.length === 0 || parseFloat(wallet.rows[0].balance) < parseFloat(prod.selling_price)) {
      return res.status(400).json({ success: false, message: 'رصيد غير كافي' });
    }

    const { v4: uuidv4 } = require('uuid');
    const subUsername = `shark_${Date.now().toString(36)}`;
    const subPassword = uuidv4().slice(0, 8);
    
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + prod.duration_months);

    await pool.query('BEGIN');

    try {
      await pool.query(
        'UPDATE wallets SET balance = balance - $1, updated_at = NOW() WHERE user_id = $2',
        [prod.selling_price, req.user.id]
      );

      await pool.query(`
        INSERT INTO transactions (wallet_id, type, amount, description, status)
        SELECT id, 'purchase', $1, $2, 'completed'
        FROM wallets WHERE user_id = $3
      `, [prod.selling_price, `شراء ${prod.name_ar}`, req.user.id]);

      const orderResult = await pool.query(`
        INSERT INTO shark_orders (user_id, product_id, username, password, mac_address, status, expires_at)
        VALUES ($1, $2, $3, $4, $5, 'active', $6)
        RETURNING *
      `, [req.user.id, product_id, subUsername, subPassword, mac_address || null, expiresAt]);

      await pool.query('COMMIT');

      res.json({
        success: true,
        message: 'تم الشراء بنجاح!',
        subscription: {
          username: subUsername,
          password: subPassword,
          expires_at: expiresAt,
          product: prod.name_ar,
          instructions: `
            لتفعيل الاشتراك:
            1. افتح تطبيق Shark IPTV Pro
            2. اختر Xtream Codes API
            3. أدخل البيانات التالية:
               - Server: ${SHARK_BASE_URL}
               - Username: ${subUsername}
               - Password: ${subPassword}
            4. استمتع بالمشاهدة!
          `
        }
      });
    } catch (err) {
      await pool.query('ROLLBACK');
      throw err;
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'خطأ في الشراء' });
  }
});

router.get('/my-subscriptions', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT so.*, sp.name, sp.name_ar, sp.image_url, sp.duration_months
      FROM shark_orders so
      JOIN shark_products sp ON so.product_id = sp.id
      WHERE so.user_id = $1
      ORDER BY so.created_at DESC
    `, [req.user.id]);
    res.json({ success: true, subscriptions: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'خطأ في جلب الاشتراكات' });
  }
});

router.get('/admin/products', authenticateToken, isAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM shark_products ORDER BY duration_months ASC');
    res.json({ success: true, products: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'خطأ في جلب المنتجات' });
  }
});

router.post('/admin/product', authenticateToken, isAdmin, async (req, res) => {
  const { name, name_ar, description, duration_months, price, selling_price, image_url } = req.body;

  try {
    const result = await pool.query(`
      INSERT INTO shark_products (name, name_ar, description, duration_months, price, selling_price, image_url)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [name, name_ar, description, duration_months, price, selling_price, image_url]);

    res.json({ success: true, product: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'خطأ في إضافة المنتج' });
  }
});

router.put('/admin/product/:id', authenticateToken, isAdmin, async (req, res) => {
  const { name, name_ar, description, duration_months, price, selling_price, image_url, is_active } = req.body;

  try {
    await pool.query(`
      UPDATE shark_products 
      SET name = COALESCE($1, name),
          name_ar = COALESCE($2, name_ar),
          description = COALESCE($3, description),
          duration_months = COALESCE($4, duration_months),
          price = COALESCE($5, price),
          selling_price = COALESCE($6, selling_price),
          image_url = COALESCE($7, image_url),
          is_active = COALESCE($8, is_active),
          updated_at = NOW()
      WHERE id = $9
    `, [name, name_ar, description, duration_months, price, selling_price, image_url, is_active, req.params.id]);

    res.json({ success: true, message: 'تم التحديث بنجاح' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'خطأ في التحديث' });
  }
});

router.get('/admin/orders', authenticateToken, isAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT so.*, sp.name, sp.name_ar, u.name as user_name, u.email
      FROM shark_orders so
      JOIN shark_products sp ON so.product_id = sp.id
      JOIN users u ON so.user_id = u.id
      ORDER BY so.created_at DESC
    `);
    res.json({ success: true, orders: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'خطأ في جلب الطلبات' });
  }
});

module.exports = router;
