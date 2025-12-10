const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../config/database');
const { authenticateToken, isAdmin } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const upload = multer({ 
  dest: '/tmp/uploads/',
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.xlsx', '.xls', '.csv'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('نوع ملف غير مدعوم. استخدم xlsx أو xls أو csv'));
    }
  }
});

const router = express.Router();

router.get('/dashboard', authenticateToken, isAdmin, async (req, res) => {
  try {
    const stats = await Promise.all([
      pool.query('SELECT COUNT(*) as total FROM users WHERE role != $1', ['admin']),
      pool.query('SELECT COUNT(*) as total FROM users WHERE role = $1', ['distributor']),
      pool.query('SELECT COUNT(*) as total FROM orders'),
      pool.query('SELECT COALESCE(SUM(total_price), 0) as total FROM orders WHERE status = $1', ['completed']),
      pool.query('SELECT COUNT(*) as total FROM products WHERE is_active = true'),
      pool.query('SELECT COUNT(*) as total FROM card_codes WHERE is_sold = false')
    ]);

    res.json({
      success: true,
      data: {
        total_users: parseInt(stats[0].rows[0].total),
        total_distributors: parseInt(stats[1].rows[0].total),
        total_orders: parseInt(stats[2].rows[0].total),
        total_revenue: parseFloat(stats[3].rows[0].total),
        total_products: parseInt(stats[4].rows[0].total),
        available_codes: parseInt(stats[5].rows[0].total)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

router.get('/users', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { role, search, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT u.id, u.email, u.name, u.phone, u.role, u.is_active, u.created_at, u.referral_code,
             COALESCE(w.balance, 0) as balance
      FROM users u
      LEFT JOIN wallets w ON u.id = w.user_id
      WHERE u.role != 'admin'
    `;
    const params = [];

    if (role) {
      params.push(role);
      query += ` AND u.role = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (u.name ILIKE $${params.length} OR u.email ILIKE $${params.length})`;
    }

    query += ` ORDER BY u.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

router.get('/users/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.*, COALESCE(w.balance, 0) as balance
       FROM users u
       LEFT JOIN wallets w ON u.id = w.user_id
       WHERE u.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
    }

    const user = result.rows[0];
    delete user.password;

    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

router.put('/users/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { name, phone, role, is_active } = req.body;

    const result = await pool.query(
      `UPDATE users SET 
        name = COALESCE($1, name),
        phone = COALESCE($2, phone),
        role = COALESCE($3, role),
        is_active = COALESCE($4, is_active),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $5 RETURNING id, email, name, role, is_active`,
      [name, phone, role, is_active, req.params.id]
    );

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

router.delete('/users/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    await pool.query('UPDATE users SET is_active = false WHERE id = $1', [req.params.id]);
    res.json({ success: true, message: 'تم تعطيل المستخدم بنجاح' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

router.post('/users/create', authenticateToken, isAdmin, async (req, res) => {
  const client = await pool.connect();
  try {
    const { name, email, phone, password, role = 'seller', initial_balance = 0 } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'الاسم والبريد وكلمة المرور مطلوبة' });
    }

    const existingUser = await client.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'البريد الإلكتروني مسجل مسبقاً' });
    }

    await client.query('BEGIN');

    const hashedPassword = await bcrypt.hash(password, 10);
    const apiKey = `dk_${uuidv4().replace(/-/g, '')}`;
    const apiSecret = `ds_${uuidv4().replace(/-/g, '')}`;
    const referralCode = Math.random().toString(36).substring(2, 10).toUpperCase();

    const userResult = await client.query(
      `INSERT INTO users (email, password, name, phone, role, api_key, api_secret, referral_code) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, email, name, role, referral_code`,
      [email, hashedPassword, name, phone, role, apiKey, apiSecret, referralCode]
    );

    const user = userResult.rows[0];

    await client.query(
      'INSERT INTO wallets (user_id, balance) VALUES ($1, $2)',
      [user.id, initial_balance || 0]
    );

    if (initial_balance > 0) {
      const walletResult = await client.query('SELECT id FROM wallets WHERE user_id = $1', [user.id]);
      await client.query(
        `INSERT INTO transactions (wallet_id, user_id, type, amount, balance_before, balance_after, description)
         VALUES ($1, $2, 'deposit', $3, 0, $4, 'رصيد ابتدائي من المشرف')`,
        [walletResult.rows[0].id, user.id, initial_balance, initial_balance]
      );
    }

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'تم إنشاء المستخدم بنجاح',
      data: { ...user, balance: initial_balance }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating user:', error);
    res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  } finally {
    client.release();
  }
});

router.get('/orders', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, user_id, status } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT o.*, p.name as product_name, u.name as user_name, u.email as user_email
      FROM orders o
      LEFT JOIN products p ON o.product_id = p.id
      LEFT JOIN users u ON o.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (user_id) {
      params.push(user_id);
      query += ` AND o.user_id = $${params.length}`;
    }

    if (status) {
      params.push(status);
      query += ` AND o.status = $${params.length}`;
    }

    query += ` ORDER BY o.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

router.get('/api-logs', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 50, user_id } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT al.*, u.name as user_name, u.email as user_email
      FROM api_logs al
      LEFT JOIN users u ON al.user_id = u.id
    `;
    const params = [];

    if (user_id) {
      params.push(user_id);
      query += ` WHERE al.user_id = $${params.length}`;
    }

    query += ` ORDER BY al.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

router.get('/wallets', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = `
      SELECT u.id, u.email, u.name, u.phone, u.role, u.is_active, u.created_at,
             w.id as wallet_id, COALESCE(w.balance::numeric, 0) as balance, COALESCE(w.currency, 'SAR') as currency,
             COALESCE((SELECT COUNT(*) FROM transactions t WHERE t.wallet_id = w.id), 0) as total_transactions
      FROM users u
      LEFT JOIN wallets w ON u.id = w.user_id
      WHERE u.role != 'admin'
    `;
    const params = [];

    if (search && search.trim()) {
      params.push(`%${search.trim()}%`);
      query += ` AND (u.name ILIKE $${params.length} OR u.email ILIKE $${params.length})`;
    }

    query += ` ORDER BY COALESCE(w.balance::numeric, 0) DESC, u.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit), offset);

    const result = await pool.query(query, params);

    let countQuery = `SELECT COUNT(*) as total FROM users u WHERE u.role != 'admin'`;
    const countParams = [];
    
    if (search && search.trim()) {
      countParams.push(`%${search.trim()}%`);
      countQuery += ` AND (u.name ILIKE $1 OR u.email ILIKE $1)`;
    }
    
    const countResult = await pool.query(countQuery, countParams);

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        total: parseInt(countResult.rows[0].total),
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching wallets:', error);
    res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

router.get('/wallets/:userId/transactions', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const userId = req.params.userId;

    const userResult = await pool.query(
      `SELECT u.id, u.name, u.email, COALESCE(w.balance, 0) as balance, w.id as wallet_id
       FROM users u
       LEFT JOIN wallets w ON u.id = w.user_id
       WHERE u.id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
    }

    const user = userResult.rows[0];

    if (!user.wallet_id) {
      return res.json({
        success: true,
        data: {
          user: { id: user.id, name: user.name, email: user.email, balance: 0 },
          transactions: [],
          pagination: { total: 0, page: 1, limit: 20 }
        }
      });
    }

    const transResult = await pool.query(
      `SELECT t.* FROM transactions t
       WHERE t.wallet_id = $1
       ORDER BY t.created_at DESC
       LIMIT $2 OFFSET $3`,
      [user.wallet_id, limit, offset]
    );

    const countResult = await pool.query(
      'SELECT COUNT(*) as total FROM transactions WHERE wallet_id = $1',
      [user.wallet_id]
    );

    res.json({
      success: true,
      data: {
        user: { id: user.id, name: user.name, email: user.email, balance: parseFloat(user.balance) },
        transactions: transResult.rows,
        pagination: {
          total: parseInt(countResult.rows[0].total),
          page: parseInt(page),
          limit: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching user transactions:', error);
    res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

router.post('/wallets/:userId/create', authenticateToken, isAdmin, async (req, res) => {
  const client = await pool.connect();
  try {
    const userId = req.params.userId;

    await client.query('BEGIN');

    const userResult = await client.query('SELECT id, name FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
    }

    const existingWallet = await client.query('SELECT id, balance FROM wallets WHERE user_id = $1 FOR UPDATE', [userId]);
    if (existingWallet.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.json({ 
        success: true, 
        message: 'المحفظة موجودة بالفعل',
        data: existingWallet.rows[0]
      });
    }

    const result = await client.query(
      `INSERT INTO wallets (user_id, balance, currency) VALUES ($1, 0, 'SAR') RETURNING *`,
      [userId]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'تم إنشاء المحفظة بنجاح',
      data: result.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating wallet:', error);
    res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  } finally {
    client.release();
  }
});

router.post('/products/import-excel', authenticateToken, isAdmin, upload.single('file'), async (req, res) => {
  const client = await pool.connect();
  try {
    let excelPath;
    
    if (req.file) {
      excelPath = req.file.path;
    } else {
      excelPath = path.join(__dirname, '../../attached_assets/نسخة_من_Products_-_الاسعار_قابلة_للتغيير_في_اي_لحظة_نرجو_المت_1765307582519.xlsx');
    }
    
    if (!fs.existsSync(excelPath)) {
      return res.status(404).json({ success: false, message: 'ملف Excel غير موجود' });
    }

    const workbook = XLSX.readFile(excelPath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet);

    await client.query('BEGIN');

    let categoriesCache = {};
    const catResult = await client.query('SELECT id, LOWER(name) as name_lower, name FROM categories');
    catResult.rows.forEach(c => categoriesCache[c.name_lower] = c.id);

    let inserted = 0;
    let updated = 0;
    let skipped = 0;
    let errors = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      try {
        const category = (row['   Category']?.trim() || row['Category']?.trim() || 'General').toLowerCase();
        const brand = row['Brand']?.trim() || '';
        const denomination = row['Denomination']?.trim() || '';
        const wallet = row['Wallet']?.trim() || 'USD';
        const usdPrice = parseFloat(row['USD']) || 0;

        if (!brand || !denomination) {
          skipped++;
          continue;
        }

        if (usdPrice <= 0) {
          errors.push(`سطر ${i + 2}: سعر غير صالح (${usdPrice})`);
          skipped++;
          continue;
        }

        let categoryId = categoriesCache[category];
        if (!categoryId) {
          const catName = row['   Category']?.trim() || row['Category']?.trim() || 'General';
          const newCat = await client.query(
            `INSERT INTO categories (id, name, name_ar, is_active) VALUES ($1, $2, $3, true) RETURNING id`,
            [uuidv4(), catName, catName]
          );
          categoryId = newCat.rows[0].id;
          categoriesCache[category] = categoryId;
        }

        const productName = `${brand} - ${denomination}`;
        const existing = await client.query(
          'SELECT id FROM products WHERE name = $1 AND brand_name = $2',
          [productName, brand]
        );

        if (existing.rows.length > 0) {
          await client.query(
            `UPDATE products SET base_price = $1, selling_price = $2, distributor_price = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4`,
            [usdPrice, usdPrice * 1.05, usdPrice * 1.02, existing.rows[0].id]
          );
          updated++;
        } else {
          const denomValue = parseFloat(denomination.replace(/[^\d.]/g, '')) || 0;
          await client.query(
            `INSERT INTO products (id, category_id, name, name_ar, brand_name, base_price, selling_price, distributor_price, 
             denomination_value, denomination_currency, is_active, stock_quantity, source)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true, 999, 'excel_import')`,
            [uuidv4(), categoryId, productName, productName, brand, usdPrice, usdPrice * 1.05, usdPrice * 1.02,
             denomValue, wallet]
          );
          inserted++;
        }
      } catch (rowError) {
        errors.push(`سطر ${i + 2}: ${rowError.message}`);
        skipped++;
      }
    }

    await client.query('COMMIT');

    if (req.file) {
      fs.unlinkSync(req.file.path);
    }

    res.json({
      success: true,
      message: `تم استيراد ${inserted} منتج جديد وتحديث ${updated} منتج`,
      data: { inserted, updated, skipped, total: data.length, errors: errors.slice(0, 10) }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error importing products:', error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ success: false, message: 'خطأ في استيراد المنتجات: ' + error.message });
  } finally {
    client.release();
  }
});

router.get('/products/prices', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { search, category_id, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT p.id, p.name, p.name_ar, p.brand_name, p.base_price, p.selling_price, 
             p.distributor_price, p.denomination_value, p.denomination_currency,
             p.is_active, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (p.name ILIKE $${params.length} OR p.brand_name ILIKE $${params.length})`;
    }

    if (category_id) {
      params.push(category_id);
      query += ` AND p.category_id = $${params.length}`;
    }

    const countQuery = query.replace(/SELECT .* FROM/, 'SELECT COUNT(*) FROM');
    const countResult = await pool.query(countQuery, params);

    params.push(limit, offset);
    query += ` ORDER BY p.brand_name, p.denomination_value LIMIT $${params.length - 1} OFFSET $${params.length}`;

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        total: parseInt(countResult.rows[0].count),
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching prices:', error);
    res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

router.put('/products/prices/bulk', authenticateToken, isAdmin, async (req, res) => {
  const client = await pool.connect();
  try {
    const { updates } = req.body;

    if (!updates || !Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ success: false, message: 'لا توجد تحديثات' });
    }

    await client.query('BEGIN');

    let updated = 0;
    let errors = [];
    
    for (const item of updates) {
      if (!item.id) continue;

      const basePrice = item.base_price !== undefined && item.base_price !== null && item.base_price !== '' 
        ? parseFloat(item.base_price) : null;
      const sellingPrice = item.selling_price !== undefined && item.selling_price !== null && item.selling_price !== ''
        ? parseFloat(item.selling_price) : null;
      const distributorPrice = item.distributor_price !== undefined && item.distributor_price !== null && item.distributor_price !== ''
        ? parseFloat(item.distributor_price) : null;

      if (basePrice !== null && basePrice <= 0) {
        errors.push(`سعر التكلفة يجب أن يكون أكبر من صفر`);
        continue;
      }
      if (sellingPrice !== null && sellingPrice <= 0) {
        errors.push(`سعر البيع يجب أن يكون أكبر من صفر`);
        continue;
      }
      if (distributorPrice !== null && distributorPrice <= 0) {
        errors.push(`سعر الموزع يجب أن يكون أكبر من صفر`);
        continue;
      }

      const updateFields = [];
      const params = [];
      let paramCount = 0;

      if (basePrice !== null) {
        paramCount++;
        updateFields.push(`base_price = $${paramCount}`);
        params.push(basePrice);
      }
      if (sellingPrice !== null) {
        paramCount++;
        updateFields.push(`selling_price = $${paramCount}`);
        params.push(sellingPrice);
      }
      if (distributorPrice !== null) {
        paramCount++;
        updateFields.push(`distributor_price = $${paramCount}`);
        params.push(distributorPrice);
      }

      if (updateFields.length === 0) continue;

      paramCount++;
      params.push(item.id);

      await client.query(
        `UPDATE products SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramCount}`,
        params
      );
      updated++;
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      message: `تم تحديث ${updated} منتج`,
      data: { updated, errors: errors.slice(0, 5) }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating prices:', error);
    res.status(500).json({ success: false, message: 'خطأ في تحديث الأسعار' });
  } finally {
    client.release();
  }
});

router.put('/products/prices/adjust', authenticateToken, isAdmin, async (req, res) => {
  const client = await pool.connect();
  try {
    const { adjustment_type, adjustment_value, category_id, brand_name, apply_to } = req.body;

    if (!adjustment_type || adjustment_value === undefined || adjustment_value === null || adjustment_value === '') {
      return res.status(400).json({ success: false, message: 'نوع التعديل والقيمة مطلوبان' });
    }

    const value = parseFloat(adjustment_value);
    if (isNaN(value)) {
      return res.status(400).json({ success: false, message: 'قيمة التعديل غير صالحة' });
    }

    if (adjustment_type === 'percentage' && value < -90) {
      return res.status(400).json({ success: false, message: 'لا يمكن خفض السعر بأكثر من 90%' });
    }

    await client.query('BEGIN');

    const priceField = ['selling_price', 'base_price', 'distributor_price'].includes(apply_to) 
      ? apply_to : 'selling_price';
    
    let query = 'UPDATE products SET ';
    
    if (adjustment_type === 'percentage') {
      query += `${priceField} = GREATEST(0.01, ${priceField} * (1 + $1 / 100))`;
    } else if (adjustment_type === 'fixed') {
      query += `${priceField} = GREATEST(0.01, ${priceField} + $1)`;
    } else {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'نوع تعديل غير صالح' });
    }

    query += ', updated_at = CURRENT_TIMESTAMP WHERE 1=1';
    const params = [value];

    if (category_id) {
      params.push(category_id);
      query += ` AND category_id = $${params.length}`;
    }

    if (brand_name) {
      params.push(brand_name);
      query += ` AND brand_name = $${params.length}`;
    }

    const result = await client.query(query, params);
    await client.query('COMMIT');

    res.json({
      success: true,
      message: `تم تعديل أسعار ${result.rowCount} منتج`,
      data: { updated: result.rowCount }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error adjusting prices:', error);
    res.status(500).json({ success: false, message: 'خطأ في تعديل الأسعار' });
  } finally {
    client.release();
  }
});

router.get('/products/brands', authenticateToken, isAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT brand_name, COUNT(*) as count 
       FROM products 
       WHERE brand_name IS NOT NULL AND brand_name != ''
       GROUP BY brand_name 
       ORDER BY brand_name`
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching brands:', error);
    res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

router.post('/users/create', authenticateToken, isAdmin, async (req, res) => {
  const client = await pool.connect();
  try {
    const { email, password, name, phone, role = 'seller', initial_balance = 0 } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ success: false, message: 'البريد الإلكتروني وكلمة المرور والاسم مطلوبين' });
    }

    await client.query('BEGIN');

    const existingUser = await client.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'البريد الإلكتروني مسجل مسبقاً' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const apiKey = `dk_${uuidv4().replace(/-/g, '')}`;
    const apiSecret = `ds_${uuidv4().replace(/-/g, '')}`;
    const referralCode = Math.random().toString(36).substring(2, 10).toUpperCase();

    const userResult = await client.query(
      `INSERT INTO users (email, password, name, phone, role, api_key, api_secret, referral_code, is_active) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true) RETURNING id, email, name, role`,
      [email, hashedPassword, name, phone, role, apiKey, apiSecret, referralCode]
    );

    const user = userResult.rows[0];

    await client.query(
      'INSERT INTO wallets (user_id, balance) VALUES ($1, $2)',
      [user.id, initial_balance || 0]
    );

    if (initial_balance > 0) {
      const walletResult = await client.query('SELECT id FROM wallets WHERE user_id = $1', [user.id]);
      await client.query(
        `INSERT INTO transactions (wallet_id, user_id, type, amount, balance_before, balance_after, description)
         VALUES ($1, $2, 'admin_deposit', $3, 0, $3, 'رصيد أولي من المشرف')`,
        [walletResult.rows[0].id, user.id, initial_balance]
      );
    }

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'تم إنشاء المستخدم بنجاح',
      data: { ...user, initial_balance }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating user:', error);
    res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  } finally {
    client.release();
  }
});

router.post('/wallets/:userId/adjust', authenticateToken, isAdmin, async (req, res) => {
  const client = await pool.connect();
  try {
    const { amount, type, description } = req.body;
    const userId = req.params.userId;

    if (!amount || isNaN(amount)) {
      return res.status(400).json({ success: false, message: 'المبلغ غير صالح' });
    }

    await client.query('BEGIN');

    const walletResult = await client.query(
      'SELECT * FROM wallets WHERE user_id = $1 FOR UPDATE',
      [userId]
    );

    if (walletResult.rows.length === 0) {
      const newWallet = await client.query(
        `INSERT INTO wallets (user_id, balance) VALUES ($1, 0) RETURNING *`,
        [userId]
      );
      walletResult.rows = newWallet.rows;
    }

    const wallet = walletResult.rows[0];
    const adjustAmount = parseFloat(amount);
    const newBalance = parseFloat(wallet.balance) + adjustAmount;

    if (newBalance < 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'الرصيد لا يمكن أن يكون سالباً' });
    }

    await client.query(
      'UPDATE wallets SET balance = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [newBalance, wallet.id]
    );

    await client.query(
      `INSERT INTO transactions (wallet_id, user_id, type, amount, balance_before, balance_after, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [wallet.id, userId, type || (adjustAmount > 0 ? 'admin_deposit' : 'admin_withdrawal'), 
       Math.abs(adjustAmount), wallet.balance, newBalance, description || 'تعديل من المشرف']
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: adjustAmount > 0 ? `تم إضافة ${adjustAmount} ريال` : `تم خصم ${Math.abs(adjustAmount)} ريال`,
      data: { balance: newBalance }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error adjusting wallet:', error);
    res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  } finally {
    client.release();
  }
});

module.exports = router;
