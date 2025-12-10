const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'التوثيق مطلوب' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'digicards_secret_key_2024', (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'رمز غير صالح' });
    }
    req.user = user;
    next();
  });
};

const PAYMENT_GATEWAYS = {
  myfatoorah: {
    name: 'MyFatoorah',
    nameAr: 'ماي فاتورة',
    logo: '💳',
    description: 'بوابة دفع سعودية موثوقة',
    supported: ['mada', 'visa', 'mastercard', 'apple_pay', 'stc_pay'],
    minAmount: 1,
    maxAmount: 50000,
    currency: 'SAR'
  },
  moyasar: {
    name: 'Moyasar',
    nameAr: 'ميسّر',
    logo: '💰',
    description: 'حلول دفع متكاملة للسعودية',
    supported: ['mada', 'visa', 'mastercard', 'apple_pay'],
    minAmount: 1,
    maxAmount: 100000,
    currency: 'SAR'
  },
  hyperpay: {
    name: 'HyperPay',
    nameAr: 'هايبر باي',
    logo: '⚡',
    description: 'دفع سريع وآمن',
    supported: ['mada', 'visa', 'mastercard', 'apple_pay', 'stc_pay'],
    minAmount: 1,
    maxAmount: 100000,
    currency: 'SAR'
  },
  telr: {
    name: 'Telr',
    nameAr: 'تيلر',
    logo: '🔐',
    description: 'بوابة دفع إقليمية',
    supported: ['visa', 'mastercard', 'mada'],
    minAmount: 1,
    maxAmount: 50000,
    currency: 'SAR'
  }
};

const PAYMENT_METHODS = {
  mada: { name: 'مدى', icon: '🏦', description: 'البطاقات البنكية السعودية' },
  visa: { name: 'Visa', icon: '💳', description: 'بطاقات فيزا' },
  mastercard: { name: 'Mastercard', icon: '💳', description: 'بطاقات ماستركارد' },
  apple_pay: { name: 'Apple Pay', icon: '🍎', description: 'الدفع عبر أبل' },
  stc_pay: { name: 'STC Pay', icon: '📱', description: 'محفظة STC' }
};

router.get('/gateways', (req, res) => {
  res.json({
    success: true,
    gateways: Object.entries(PAYMENT_GATEWAYS).map(([id, gateway]) => ({
      id,
      ...gateway
    }))
  });
});

router.get('/methods', (req, res) => {
  res.json({
    success: true,
    methods: Object.entries(PAYMENT_METHODS).map(([id, method]) => ({
      id,
      ...method
    }))
  });
});

router.post('/initiate', authenticateToken, async (req, res) => {
  try {
    const { amount, gateway, paymentMethod, description } = req.body;
    const userId = req.user.id;

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'المبلغ غير صالح' });
    }

    if (!gateway || !PAYMENT_GATEWAYS[gateway]) {
      return res.status(400).json({ success: false, message: 'بوابة الدفع غير صالحة' });
    }

    const selectedGateway = PAYMENT_GATEWAYS[gateway];
    
    if (amount < selectedGateway.minAmount || amount > selectedGateway.maxAmount) {
      return res.status(400).json({ 
        success: false, 
        message: `المبلغ يجب أن يكون بين ${selectedGateway.minAmount} و ${selectedGateway.maxAmount} ريال` 
      });
    }

    const transactionId = `PAY_${Date.now()}_${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    await pool.query(`
      CREATE TABLE IF NOT EXISTS payment_transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        transaction_id VARCHAR(100) UNIQUE NOT NULL,
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        amount DECIMAL(15, 2) NOT NULL,
        gateway VARCHAR(50) NOT NULL,
        payment_method VARCHAR(50),
        status VARCHAR(50) DEFAULT 'pending',
        description TEXT,
        gateway_response TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(
      `INSERT INTO payment_transactions (transaction_id, user_id, amount, gateway, payment_method, description, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending')`,
      [transactionId, userId, amount, gateway, paymentMethod, description || 'شحن المحفظة']
    );

    const paymentUrl = `/payment/process/${transactionId}`;

    res.json({
      success: true,
      transactionId,
      paymentUrl,
      gateway: selectedGateway.nameAr,
      amount,
      currency: 'SAR',
      message: 'تم إنشاء طلب الدفع بنجاح'
    });
  } catch (error) {
    console.error('Payment initiation error:', error);
    res.status(500).json({ success: false, message: 'خطأ في إنشاء طلب الدفع' });
  }
});

router.post('/simulate-success/:transactionId', authenticateToken, async (req, res) => {
  try {
    const { transactionId } = req.params;
    const userId = req.user.id;

    const txResult = await pool.query(
      'SELECT * FROM payment_transactions WHERE transaction_id = $1 AND user_id = $2',
      [transactionId, userId]
    );

    if (txResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'المعاملة غير موجودة' });
    }

    const transaction = txResult.rows[0];

    if (transaction.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'المعاملة تمت معالجتها مسبقاً' });
    }

    let walletResult = await pool.query(
      'SELECT * FROM wallets WHERE user_id = $1',
      [userId]
    );

    let wallet;
    if (walletResult.rows.length === 0) {
      const newWalletResult = await pool.query(
        'INSERT INTO wallets (user_id, balance) VALUES ($1, $2) RETURNING *', 
        [userId, 0]
      );
      wallet = newWalletResult.rows[0];
    } else {
      wallet = walletResult.rows[0];
    }

    const oldBalance = parseFloat(wallet.balance);
    const newBalance = oldBalance + parseFloat(transaction.amount);

    await pool.query(
      'UPDATE wallets SET balance = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2',
      [newBalance, userId]
    );

    await pool.query(
      `INSERT INTO transactions (wallet_id, user_id, type, amount, balance_before, balance_after, description, reference_id)
       VALUES ($1, $2, 'deposit', $3, $4, $5, $6, $7)`,
      [wallet.id, userId, transaction.amount, oldBalance, newBalance, `شحن عبر ${PAYMENT_GATEWAYS[transaction.gateway]?.nameAr || transaction.gateway}`, transaction.id]
    );

    await pool.query(
      `UPDATE payment_transactions SET status = 'completed', gateway_response = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE transaction_id = $2`,
      [JSON.stringify({ success: true, simulated: true }), transactionId]
    );

    res.json({
      success: true,
      message: 'تم شحن المحفظة بنجاح',
      newBalance,
      amount: transaction.amount,
      transactionId
    });
  } catch (error) {
    console.error('Payment simulation error:', error);
    res.status(500).json({ success: false, message: 'خطأ في معالجة الدفع' });
  }
});

router.get('/transactions', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 20, offset = 0 } = req.query;

    const result = await pool.query(
      `SELECT transaction_id, amount, gateway, payment_method, status, description, created_at
       FROM payment_transactions 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2 OFFSET $3`,
      [userId, parseInt(limit), parseInt(offset)]
    );

    const countResult = await pool.query(
      'SELECT COUNT(*) FROM payment_transactions WHERE user_id = $1',
      [userId]
    );

    res.json({
      success: true,
      transactions: result.rows.map(tx => ({
        ...tx,
        gatewayName: PAYMENT_GATEWAYS[tx.gateway]?.nameAr || tx.gateway
      })),
      total: parseInt(countResult.rows[0].count),
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Transactions fetch error:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب المعاملات' });
  }
});

router.get('/transaction/:transactionId', authenticateToken, async (req, res) => {
  try {
    const { transactionId } = req.params;
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT transaction_id, amount, gateway, payment_method, status, description, created_at, updated_at
       FROM payment_transactions 
       WHERE transaction_id = $1 AND user_id = $2`,
      [transactionId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'المعاملة غير موجودة' });
    }

    const tx = result.rows[0];

    res.json({
      success: true,
      transaction: {
        ...tx,
        gatewayName: PAYMENT_GATEWAYS[tx.gateway]?.nameAr || tx.gateway
      }
    });
  } catch (error) {
    console.error('Transaction fetch error:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب المعاملة' });
  }
});

module.exports = router;
