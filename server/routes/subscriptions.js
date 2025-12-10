const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken, isAdmin } = require('../middleware/auth');

router.get('/plans', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM subscription_plans WHERE is_active = true ORDER BY sort_order'
    );
    res.json({ success: true, plans: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/my-subscription', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT us.*, sp.name as plan_name, sp.name_ar as plan_name_ar, 
             sp.max_stores, sp.max_products, sp.features
      FROM user_subscriptions us
      JOIN subscription_plans sp ON us.plan_id = sp.id
      WHERE us.user_id = $1 AND us.status = 'active'
      ORDER BY us.created_at DESC
      LIMIT 1
    `, [req.user.userId]);

    if (result.rows.length === 0) {
      const freePlan = await pool.query(
        'SELECT * FROM subscription_plans WHERE name = $1', ['Free']
      );
      return res.json({
        success: true,
        subscription: null,
        plan: freePlan.rows[0] || { name: 'Free', name_ar: 'مجاني', max_stores: 1, max_products: 10 }
      });
    }

    res.json({ success: true, subscription: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/subscribe', authenticateToken, async (req, res) => {
  try {
    const { plan_id, billing_cycle } = req.body;
    const userId = req.user.userId;

    const plan = await pool.query('SELECT * FROM subscription_plans WHERE id = $1', [plan_id]);
    if (plan.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'الخطة غير موجودة' });
    }

    const planData = plan.rows[0];
    let price = 0;
    let months = 1;

    switch (billing_cycle) {
      case 'monthly': price = planData.price_monthly; months = 1; break;
      case 'quarterly': price = planData.price_quarterly; months = 3; break;
      case 'semi_annual': price = planData.price_semi_annual; months = 6; break;
      case 'annual': price = planData.price_annual; months = 12; break;
      case 'biennial': price = planData.price_biennial; months = 24; break;
      default: price = planData.price_monthly; months = 1;
    }

    if (price > 0) {
      const wallet = await pool.query('SELECT balance FROM wallets WHERE user_id = $1', [userId]);
      const balance = wallet.rows[0]?.balance || 0;
      
      if (parseFloat(balance) < price) {
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
        VALUES ($1, 'subscription', $2, $3, 'completed')
      `, [userId, -price, `اشتراك ${planData.name_ar} - ${billing_cycle}`]);
    }

    await pool.query(
      'UPDATE user_subscriptions SET status = $1 WHERE user_id = $2 AND status = $3',
      ['cancelled', userId, 'active']
    );

    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + months);

    const result = await pool.query(`
      INSERT INTO user_subscriptions (user_id, plan_id, billing_cycle, status, expires_at)
      VALUES ($1, $2, $3, 'active', $4)
      RETURNING *
    `, [userId, plan_id, billing_cycle, expiresAt]);

    res.json({ 
      success: true, 
      message: 'تم الاشتراك بنجاح',
      subscription: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/admin/all', authenticateToken, isAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT us.*, u.name as user_name, u.email, sp.name_ar as plan_name
      FROM user_subscriptions us
      JOIN users u ON us.user_id = u.id
      JOIN subscription_plans sp ON us.plan_id = sp.id
      ORDER BY us.created_at DESC
    `);
    res.json({ success: true, subscriptions: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/admin/plans/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name_ar, description, price_monthly, price_quarterly, price_semi_annual, 
            price_annual, price_biennial, max_stores, max_products, features, is_active } = req.body;

    await pool.query(`
      UPDATE subscription_plans 
      SET name_ar = COALESCE($1, name_ar), description = COALESCE($2, description),
          price_monthly = COALESCE($3, price_monthly), price_quarterly = COALESCE($4, price_quarterly),
          price_semi_annual = COALESCE($5, price_semi_annual), price_annual = COALESCE($6, price_annual),
          price_biennial = COALESCE($7, price_biennial), max_stores = COALESCE($8, max_stores),
          max_products = COALESCE($9, max_products), features = COALESCE($10, features),
          is_active = COALESCE($11, is_active)
      WHERE id = $12
    `, [name_ar, description, price_monthly, price_quarterly, price_semi_annual,
        price_annual, price_biennial, max_stores, max_products, 
        features ? JSON.stringify(features) : null, is_active, id]);

    res.json({ success: true, message: 'تم تحديث الخطة' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
