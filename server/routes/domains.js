const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken, isAdmin } = require('../middleware/auth');

router.get('/pricing', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM domain_pricing WHERE is_active = true ORDER BY cycle_months'
    );
    res.json({ success: true, pricing: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/my-domains', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT cd.*, us.name as store_name
      FROM custom_domains cd
      JOIN user_stores us ON cd.store_id = us.id
      WHERE us.user_id = $1
      ORDER BY cd.created_at DESC
    `, [req.user.userId]);

    res.json({ success: true, domains: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/link', authenticateToken, async (req, res) => {
  try {
    const { store_id, domain, billing_cycle } = req.body;
    const userId = req.user.userId;

    const store = await pool.query(
      'SELECT * FROM user_stores WHERE id = $1 AND user_id = $2',
      [store_id, userId]
    );

    if (store.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'المتجر غير موجود' });
    }

    const existingDomain = await pool.query(
      'SELECT * FROM custom_domains WHERE domain = $1',
      [domain.toLowerCase()]
    );

    if (existingDomain.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'هذا النطاق مستخدم بالفعل' });
    }

    const pricing = await pool.query(
      'SELECT * FROM domain_pricing WHERE name = $1',
      [billing_cycle || 'monthly']
    );

    if (pricing.rows.length === 0) {
      return res.status(400).json({ success: false, message: 'خطة الدفع غير صالحة' });
    }

    const priceData = pricing.rows[0];
    const price = parseFloat(priceData.price);

    const wallet = await pool.query('SELECT balance FROM wallets WHERE user_id = $1', [userId]);
    const balance = parseFloat(wallet.rows[0]?.balance || 0);

    if (balance < price) {
      return res.status(400).json({
        success: false,
        message: 'رصيد غير كافي',
        required: price,
        available: balance
      });
    }

    await pool.query('UPDATE wallets SET balance = balance - $1 WHERE user_id = $2', [price, userId]);

    await pool.query(`
      INSERT INTO transactions (user_id, type, amount, description, status)
      VALUES ($1, 'domain', $2, $3, 'completed')
    `, [userId, -price, `ربط نطاق ${domain} - ${priceData.name_ar}`]);

    const nextBilling = new Date();
    nextBilling.setMonth(nextBilling.getMonth() + priceData.cycle_months);

    const result = await pool.query(`
      INSERT INTO custom_domains (store_id, domain, billing_cycle, price_per_cycle, next_billing_date, expires_at)
      VALUES ($1, $2, $3, $4, $5, $5)
      RETURNING *
    `, [store_id, domain.toLowerCase(), billing_cycle, price, nextBilling]);

    res.json({
      success: true,
      message: 'تم ربط النطاق بنجاح. يرجى تحديث إعدادات DNS.',
      domain: result.rows[0],
      dns_instructions: {
        type: 'CNAME',
        name: domain,
        value: 'stores.digicards.com',
        note: 'قم بإضافة سجل CNAME في إعدادات النطاق الخاص بك'
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/verify/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const domain = await pool.query(`
      SELECT cd.* FROM custom_domains cd
      JOIN user_stores us ON cd.store_id = us.id
      WHERE cd.id = $1 AND us.user_id = $2
    `, [id, userId]);

    if (domain.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'النطاق غير موجود' });
    }

    await pool.query(`
      UPDATE custom_domains 
      SET dns_verified = true, status = 'active', ssl_status = 'active', updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [id]);

    res.json({ success: true, message: 'تم التحقق من النطاق بنجاح' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/renew/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { billing_cycle } = req.body;
    const userId = req.user.userId;

    const domain = await pool.query(`
      SELECT cd.* FROM custom_domains cd
      JOIN user_stores us ON cd.store_id = us.id
      WHERE cd.id = $1 AND us.user_id = $2
    `, [id, userId]);

    if (domain.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'النطاق غير موجود' });
    }

    const pricing = await pool.query(
      'SELECT * FROM domain_pricing WHERE name = $1',
      [billing_cycle || domain.rows[0].billing_cycle]
    );

    const priceData = pricing.rows[0];
    const price = parseFloat(priceData.price);

    const wallet = await pool.query('SELECT balance FROM wallets WHERE user_id = $1', [userId]);
    const balance = parseFloat(wallet.rows[0]?.balance || 0);

    if (balance < price) {
      return res.status(400).json({
        success: false,
        message: 'رصيد غير كافي',
        required: price,
        available: balance
      });
    }

    await pool.query('UPDATE wallets SET balance = balance - $1 WHERE user_id = $2', [price, userId]);

    await pool.query(`
      INSERT INTO transactions (user_id, type, amount, description, status)
      VALUES ($1, 'domain_renewal', $2, $3, 'completed')
    `, [userId, -price, `تجديد نطاق ${domain.rows[0].domain} - ${priceData.name_ar}`]);

    const nextBilling = new Date(domain.rows[0].expires_at);
    nextBilling.setMonth(nextBilling.getMonth() + priceData.cycle_months);

    await pool.query(`
      UPDATE custom_domains 
      SET billing_cycle = $1, price_per_cycle = $2, next_billing_date = $3, 
          expires_at = $3, status = 'active', updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
    `, [billing_cycle, price, nextBilling, id]);

    res.json({ success: true, message: 'تم تجديد النطاق بنجاح' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const result = await pool.query(`
      DELETE FROM custom_domains cd
      USING user_stores us
      WHERE cd.store_id = us.id AND cd.id = $1 AND us.user_id = $2
      RETURNING cd.*
    `, [id, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'النطاق غير موجود' });
    }

    res.json({ success: true, message: 'تم إلغاء ربط النطاق' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/admin/all', authenticateToken, isAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT cd.*, us.name as store_name, u.name as user_name, u.email
      FROM custom_domains cd
      JOIN user_stores us ON cd.store_id = us.id
      JOIN users u ON us.user_id = u.id
      ORDER BY cd.created_at DESC
    `);
    res.json({ success: true, domains: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/admin/pricing/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { price, discount_percentage, is_active } = req.body;

    await pool.query(`
      UPDATE domain_pricing 
      SET price = COALESCE($1, price), 
          discount_percentage = COALESCE($2, discount_percentage),
          is_active = COALESCE($3, is_active)
      WHERE id = $4
    `, [price, discount_percentage, is_active, id]);

    res.json({ success: true, message: 'تم تحديث السعر' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
