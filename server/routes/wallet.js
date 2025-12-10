const express = require('express');
const pool = require('../config/database');
const { authenticateToken, isAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/balance', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT balance, currency FROM wallets WHERE user_id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.json({ success: true, data: { balance: 0, currency: 'SAR' } });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

router.get('/transactions', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const result = await pool.query(
      `SELECT t.* FROM transactions t
       JOIN wallets w ON t.wallet_id = w.id
       WHERE w.user_id = $1
       ORDER BY t.created_at DESC
       LIMIT $2 OFFSET $3`,
      [req.user.id, limit, offset]
    );

    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

router.post('/add-balance', authenticateToken, isAdmin, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { user_id, amount, description } = req.body;

    if (!user_id || !amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'معرف المستخدم والمبلغ مطلوبان' });
    }

    await client.query('BEGIN');

    const walletResult = await client.query(
      'SELECT * FROM wallets WHERE user_id = $1 FOR UPDATE',
      [user_id]
    );

    if (walletResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'المحفظة غير موجودة' });
    }

    const wallet = walletResult.rows[0];
    const newBalance = parseFloat(wallet.balance) + parseFloat(amount);

    await client.query(
      'UPDATE wallets SET balance = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [newBalance, wallet.id]
    );

    await client.query(
      `INSERT INTO transactions (wallet_id, user_id, type, amount, balance_before, balance_after, description)
       VALUES ($1, $2, 'deposit', $3, $4, $5, $6)`,
      [wallet.id, user_id, amount, wallet.balance, newBalance, description || 'إيداع رصيد']
    );

    await client.query('COMMIT');

    res.json({ 
      success: true, 
      message: 'تم إضافة الرصيد بنجاح',
      data: { new_balance: newBalance }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  } finally {
    client.release();
  }
});

router.post('/deduct-balance', authenticateToken, isAdmin, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { user_id, amount, description } = req.body;

    if (!user_id || !amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'معرف المستخدم والمبلغ مطلوبان' });
    }

    await client.query('BEGIN');

    const walletResult = await client.query(
      'SELECT * FROM wallets WHERE user_id = $1 FOR UPDATE',
      [user_id]
    );

    if (walletResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'المحفظة غير موجودة' });
    }

    const wallet = walletResult.rows[0];
    
    if (wallet.balance < amount) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'الرصيد غير كافٍ' });
    }

    const newBalance = parseFloat(wallet.balance) - parseFloat(amount);

    await client.query(
      'UPDATE wallets SET balance = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [newBalance, wallet.id]
    );

    await client.query(
      `INSERT INTO transactions (wallet_id, user_id, type, amount, balance_before, balance_after, description)
       VALUES ($1, $2, 'withdrawal', $3, $4, $5, $6)`,
      [wallet.id, user_id, amount, wallet.balance, newBalance, description || 'خصم رصيد']
    );

    await client.query('COMMIT');

    res.json({ 
      success: true, 
      message: 'تم خصم الرصيد بنجاح',
      data: { new_balance: newBalance }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  } finally {
    client.release();
  }
});

module.exports = router;
