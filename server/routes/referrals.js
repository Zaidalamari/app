const express = require('express');
const pool = require('../config/database');
const { authenticateToken, isAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/my-referrals', authenticateToken, async (req, res) => {
  try {
    const userResult = await pool.query(
      'SELECT referral_code FROM users WHERE id = $1',
      [req.user.id]
    );

    let referralCode = userResult.rows[0]?.referral_code;
    if (!referralCode) {
      referralCode = Math.random().toString(36).substring(2, 10).toUpperCase();
      await pool.query(
        'UPDATE users SET referral_code = $1 WHERE id = $2',
        [referralCode, req.user.id]
      );
    }

    const referralsResult = await pool.query(
      `SELECT u.id, u.name, u.email, u.created_at,
              COALESCE(SUM(rc.commission_amount), 0) as total_commission,
              COUNT(rc.id) as total_orders
       FROM users u
       LEFT JOIN referral_commissions rc ON rc.referred_id = u.id AND rc.referrer_id = $1
       WHERE u.referred_by = $1
       GROUP BY u.id, u.name, u.email, u.created_at
       ORDER BY u.created_at DESC`,
      [req.user.id]
    );

    const statsResult = await pool.query(
      `SELECT 
         COALESCE(SUM(CASE WHEN status = 'completed' THEN commission_amount ELSE 0 END), 0) as total_earned,
         COALESCE(SUM(CASE WHEN status = 'pending' THEN commission_amount ELSE 0 END), 0) as pending_amount,
         COUNT(DISTINCT referred_id) as total_referrals
       FROM referral_commissions
       WHERE referrer_id = $1`,
      [req.user.id]
    );

    const settingsResult = await pool.query(
      'SELECT * FROM referral_settings WHERE is_active = true LIMIT 1'
    );

    res.json({
      success: true,
      data: {
        referral_code: referralCode,
        referral_link: `${process.env.REPLIT_DEV_DOMAIN || req.get('host')}/register?ref=${referralCode}`,
        referrals: referralsResult.rows,
        stats: {
          total_earned: parseFloat(statsResult.rows[0]?.total_earned || 0),
          pending_amount: parseFloat(statsResult.rows[0]?.pending_amount || 0),
          total_referrals: parseInt(statsResult.rows[0]?.total_referrals || 0)
        },
        settings: settingsResult.rows[0] || { commission_type: 'percentage', commission_value: 5 }
      }
    });
  } catch (error) {
    console.error('Error fetching referrals:', error);
    res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

router.get('/commissions', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT rc.*, u.name as referred_name, u.email as referred_email
      FROM referral_commissions rc
      LEFT JOIN users u ON rc.referred_id = u.id
      WHERE rc.referrer_id = $1
    `;
    const params = [req.user.id];

    if (status) {
      params.push(status);
      query += ` AND rc.status = $${params.length}`;
    }

    query += ` ORDER BY rc.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    const countResult = await pool.query(
      'SELECT COUNT(*) FROM referral_commissions WHERE referrer_id = $1',
      [req.user.id]
    );

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
    console.error('Error fetching commissions:', error);
    res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

router.post('/withdraw', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const settingsResult = await client.query(
      'SELECT * FROM referral_settings WHERE is_active = true LIMIT 1'
    );
    const settings = settingsResult.rows[0] || { min_withdrawal: 50 };

    const pendingResult = await client.query(
      `SELECT COALESCE(SUM(commission_amount), 0) as total
       FROM referral_commissions
       WHERE referrer_id = $1 AND status = 'completed'`,
      [req.user.id]
    );
    const availableAmount = parseFloat(pendingResult.rows[0].total);

    if (availableAmount < settings.min_withdrawal) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        success: false, 
        message: `الحد الأدنى للسحب هو ${settings.min_withdrawal} ريال` 
      });
    }

    const walletResult = await client.query(
      'SELECT * FROM wallets WHERE user_id = $1 FOR UPDATE',
      [req.user.id]
    );

    if (walletResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'المحفظة غير موجودة' });
    }

    const wallet = walletResult.rows[0];
    const newBalance = parseFloat(wallet.balance) + availableAmount;

    await client.query(
      'UPDATE wallets SET balance = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [newBalance, wallet.id]
    );

    await client.query(
      `INSERT INTO transactions (wallet_id, user_id, type, amount, balance_before, balance_after, description)
       VALUES ($1, $2, 'referral_bonus', $3, $4, $5, 'سحب أرباح الإحالات')`,
      [wallet.id, req.user.id, availableAmount, wallet.balance, newBalance]
    );

    await client.query(
      `UPDATE referral_commissions SET status = 'withdrawn' WHERE referrer_id = $1 AND status = 'completed'`,
      [req.user.id]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: `تم إضافة ${availableAmount} ريال إلى محفظتك`,
      data: { amount: availableAmount, new_balance: newBalance }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error withdrawing referral earnings:', error);
    res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  } finally {
    client.release();
  }
});

router.get('/settings', authenticateToken, isAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM referral_settings ORDER BY id DESC LIMIT 1');
    res.json({ success: true, data: result.rows[0] || {} });
  } catch (error) {
    res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

router.put('/settings', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { commission_type, commission_value, min_withdrawal, is_active } = req.body;

    const result = await pool.query(
      `UPDATE referral_settings SET
        commission_type = COALESCE($1, commission_type),
        commission_value = COALESCE($2, commission_value),
        min_withdrawal = COALESCE($3, min_withdrawal),
        is_active = COALESCE($4, is_active),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = (SELECT id FROM referral_settings LIMIT 1)
       RETURNING *`,
      [commission_type, commission_value, min_withdrawal, is_active]
    );

    res.json({ success: true, message: 'تم تحديث الإعدادات', data: result.rows[0] });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

router.get('/all', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT rc.*, 
             ur.name as referrer_name, ur.email as referrer_email,
             uf.name as referred_name, uf.email as referred_email
      FROM referral_commissions rc
      LEFT JOIN users ur ON rc.referrer_id = ur.id
      LEFT JOIN users uf ON rc.referred_id = uf.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      params.push(status);
      query += ` AND rc.status = $${params.length}`;
    }

    query += ` ORDER BY rc.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    const countResult = await pool.query('SELECT COUNT(*) FROM referral_commissions');

    const statsResult = await pool.query(`
      SELECT 
        COALESCE(SUM(commission_amount), 0) as total_commissions,
        COUNT(DISTINCT referrer_id) as total_referrers,
        COUNT(DISTINCT referred_id) as total_referred
      FROM referral_commissions
    `);

    res.json({
      success: true,
      data: result.rows,
      stats: statsResult.rows[0],
      pagination: {
        total: parseInt(countResult.rows[0].count),
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching all referrals:', error);
    res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

router.put('/commission/:id/status', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['pending', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({ success: false, message: 'حالة غير صالحة' });
    }

    const result = await pool.query(
      'UPDATE referral_commissions SET status = $1 WHERE id = $2 RETURNING *',
      [status, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'العمولة غير موجودة' });
    }

    res.json({ success: true, message: 'تم تحديث الحالة', data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

module.exports = router;
