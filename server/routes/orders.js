const express = require('express');
const pool = require('../config/database');
const { authenticateToken, authenticateApiKey } = require('../middleware/auth');

const router = express.Router();

const processOrder = async (userId, productId, quantity, isApiOrder = false) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const productResult = await client.query(
      'SELECT * FROM products WHERE id = $1 AND is_active = true',
      [productId]
    );

    if (productResult.rows.length === 0) {
      throw new Error('المنتج غير موجود');
    }

    const product = productResult.rows[0];

    const userResult = await client.query('SELECT role FROM users WHERE id = $1', [userId]);
    const userRole = userResult.rows[0]?.role;
    const price = userRole === 'distributor' ? (product.distributor_price || product.selling_price) : product.selling_price;
    const totalPrice = price * quantity;

    const walletResult = await client.query(
      'SELECT * FROM wallets WHERE user_id = $1 FOR UPDATE',
      [userId]
    );

    if (walletResult.rows.length === 0 || walletResult.rows[0].balance < totalPrice) {
      throw new Error('رصيد غير كافٍ');
    }

    const wallet = walletResult.rows[0];

    const codesResult = await client.query(
      'SELECT * FROM card_codes WHERE product_id = $1 AND is_sold = false LIMIT $2 FOR UPDATE',
      [productId, quantity]
    );

    if (codesResult.rows.length < quantity) {
      throw new Error('الكمية المطلوبة غير متوفرة');
    }

    const codes = codesResult.rows;

    const orderResult = await client.query(
      `INSERT INTO orders (user_id, product_id, quantity, total_price, status, api_order)
       VALUES ($1, $2, $3, $4, 'completed', $5) RETURNING id`,
      [userId, productId, quantity, totalPrice, isApiOrder]
    );

    const orderId = orderResult.rows[0].id;

    for (const code of codes) {
      await client.query(
        'UPDATE card_codes SET is_sold = true, sold_at = CURRENT_TIMESTAMP, sold_to = $1, order_id = $2 WHERE id = $3',
        [userId, orderId, code.id]
      );
    }

    const newBalance = parseFloat(wallet.balance) - totalPrice;
    await client.query(
      'UPDATE wallets SET balance = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [newBalance, wallet.id]
    );

    await client.query(
      `INSERT INTO transactions (wallet_id, user_id, type, amount, balance_before, balance_after, description, reference_id)
       VALUES ($1, $2, 'purchase', $3, $4, $5, $6, $7)`,
      [wallet.id, userId, totalPrice, wallet.balance, newBalance, `شراء ${quantity} من ${product.name}`, orderId]
    );

    await client.query(
      'UPDATE products SET stock_quantity = (SELECT COUNT(*) FROM card_codes WHERE product_id = $1 AND is_sold = false) WHERE id = $1',
      [productId]
    );

    const referrerResult = await client.query(
      'SELECT referred_by FROM users WHERE id = $1',
      [userId]
    );
    
    if (referrerResult.rows[0]?.referred_by) {
      const settingsResult = await client.query(
        'SELECT * FROM referral_settings WHERE is_active = true LIMIT 1'
      );
      const settings = settingsResult.rows[0] || { commission_type: 'percentage', commission_value: 5 };
      
      let commissionAmount = 0;
      if (settings.commission_type === 'percentage') {
        commissionAmount = (totalPrice * settings.commission_value) / 100;
      } else {
        commissionAmount = settings.commission_value;
      }

      if (commissionAmount > 0) {
        await client.query(
          `INSERT INTO referral_commissions (referrer_id, referred_id, order_id, order_amount, commission_amount, status)
           VALUES ($1, $2, $3, $4, $5, 'completed')`,
          [referrerResult.rows[0].referred_by, userId, orderId, totalPrice, commissionAmount]
        );
      }
    }

    await client.query('COMMIT');

    return {
      order_id: orderId,
      product_name: product.name,
      quantity,
      total_price: totalPrice,
      codes: codes.map(c => ({ code: c.code, serial_number: c.serial_number })),
      new_balance: newBalance
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

router.post('/purchase', authenticateToken, async (req, res) => {
  try {
    const { product_id, quantity = 1 } = req.body;

    if (!product_id) {
      return res.status(400).json({ success: false, message: 'معرف المنتج مطلوب' });
    }

    const result = await processOrder(req.user.id, product_id, quantity, false);

    res.json({ success: true, message: 'تم الشراء بنجاح', data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT o.*, p.name as product_name, p.image_url,
             (SELECT json_agg(json_build_object('code', cc.code, 'serial_number', cc.serial_number))
              FROM card_codes cc WHERE cc.order_id = o.id) as codes
      FROM orders o
      LEFT JOIN products p ON o.product_id = p.id
    `;

    const params = [];
    if (req.user.role !== 'admin') {
      params.push(req.user.id);
      query += ' WHERE o.user_id = $1';
    }

    query += ' ORDER BY o.created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(limit, offset);

    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT o.*, p.name as product_name, p.image_url,
              (SELECT json_agg(json_build_object('code', cc.code, 'serial_number', cc.serial_number))
               FROM card_codes cc WHERE cc.order_id = o.id) as codes
       FROM orders o
       LEFT JOIN products p ON o.product_id = p.id
       WHERE o.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'الطلب غير موجود' });
    }

    const order = result.rows[0];
    if (req.user.role !== 'admin' && order.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'غير مصرح' });
    }

    res.json({ success: true, data: order });
  } catch (error) {
    res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

module.exports = { router, processOrder };
