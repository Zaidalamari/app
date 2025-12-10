const express = require('express');
const pool = require('../config/database');
const { authenticateToken, isAdmin } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

const router = express.Router();

const generateQRCode = () => {
  const code = `QR_${uuidv4().replace(/-/g, '').substring(0, 16).toUpperCase()}`;
  const secret = crypto.randomBytes(16).toString('hex');
  return { code, secret };
};

router.get('/pending', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT pd.*, o.total_price, o.quantity, p.name as product_name, p.name_ar as product_name_ar,
             u.name as buyer_name, u.email as buyer_email, u.phone as buyer_phone
      FROM physical_deliveries pd
      JOIN orders o ON pd.order_id = o.id
      JOIN products p ON pd.product_id = p.id
      LEFT JOIN users u ON pd.buyer_id = u.id
      WHERE pd.delivery_status = 'pending'
      ORDER BY pd.created_at DESC
    `);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

router.get('/my-deliveries', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT pd.*, o.total_price, o.quantity, p.name as product_name, p.name_ar as product_name_ar,
             p.image_url
      FROM physical_deliveries pd
      JOIN orders o ON pd.order_id = o.id
      JOIN products p ON pd.product_id = p.id
      WHERE pd.buyer_id = $1
      ORDER BY pd.created_at DESC
    `, [req.user.id]);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

router.get('/qr/:orderId', authenticateToken, async (req, res) => {
  try {
    const delivery = await pool.query(`
      SELECT pd.*, p.name as product_name, p.name_ar as product_name_ar
      FROM physical_deliveries pd
      JOIN products p ON pd.product_id = p.id
      WHERE pd.order_id = $1 AND pd.buyer_id = $2
    `, [req.params.orderId, req.user.id]);

    if (delivery.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'لم يتم العثور على طلب التسليم' });
    }

    const d = delivery.rows[0];
    
    if (d.delivery_status === 'delivered') {
      return res.status(400).json({ success: false, message: 'تم تسليم هذا الطلب مسبقاً' });
    }

    res.json({ 
      success: true, 
      data: {
        qr_code: d.qr_code,
        product_name: d.product_name_ar || d.product_name,
        status: d.delivery_status,
        created_at: d.created_at,
        expires_at: d.expires_at
      },
      warning: '⚠️ تحذير أمني: لا تشارك هذا الكود مع أي شخص ولا ترسله عبر أي وسيلة تواصل. اعرضه فقط للمندوب أثناء الاستلام الفعلي.'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

router.post('/verify-scan', authenticateToken, async (req, res) => {
  try {
    const { qr_code, location } = req.body;

    if (!qr_code) {
      return res.status(400).json({ success: false, message: 'كود QR مطلوب' });
    }

    const delivery = await pool.query(`
      SELECT pd.*, p.name as product_name, p.name_ar as product_name_ar,
             u.name as buyer_name, u.phone as buyer_phone
      FROM physical_deliveries pd
      JOIN products p ON pd.product_id = p.id
      LEFT JOIN users u ON pd.buyer_id = u.id
      WHERE pd.qr_code = $1
    `, [qr_code]);

    if (delivery.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'كود QR غير صالح' });
    }

    const d = delivery.rows[0];

    if (d.delivery_status === 'delivered') {
      return res.status(400).json({ 
        success: false, 
        message: 'تم تسليم هذا الطلب مسبقاً',
        delivered_at: d.delivered_at
      });
    }

    if (new Date(d.expires_at) < new Date()) {
      return res.status(400).json({ success: false, message: 'انتهت صلاحية كود التسليم' });
    }

    res.json({
      success: true,
      data: {
        delivery_id: d.id,
        product_name: d.product_name_ar || d.product_name,
        buyer_name: d.buyer_name,
        buyer_phone: d.buyer_phone,
        status: d.delivery_status,
        ready_for_confirmation: true
      },
      message: 'تم التحقق من الكود بنجاح. يرجى تأكيد التسليم بعد تسليم المنتج للعميل.'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

router.post('/confirm-delivery', authenticateToken, async (req, res) => {
  try {
    const { qr_code, qr_secret, location } = req.body;

    if (!qr_code || !qr_secret) {
      return res.status(400).json({ success: false, message: 'كود QR والرمز السري مطلوبان' });
    }

    const delivery = await pool.query(`
      SELECT pd.*, p.name as product_name
      FROM physical_deliveries pd
      JOIN products p ON pd.product_id = p.id
      WHERE pd.qr_code = $1 AND pd.qr_secret = $2
    `, [qr_code, qr_secret]);

    if (delivery.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'كود QR أو الرمز السري غير صحيح' });
    }

    const d = delivery.rows[0];

    if (d.delivery_status === 'delivered') {
      return res.status(400).json({ success: false, message: 'تم تسليم هذا الطلب مسبقاً' });
    }

    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    await pool.query(`
      UPDATE physical_deliveries 
      SET delivery_status = 'delivered',
          delivered_at = CURRENT_TIMESTAMP,
          delivered_by = $1,
          scan_location = $2,
          scan_ip = $3
      WHERE id = $4
    `, [req.user.id, location || null, clientIp, d.id]);

    await pool.query(`
      UPDATE orders SET status = 'delivered', updated_at = CURRENT_TIMESTAMP WHERE id = $1
    `, [d.order_id]);

    res.json({
      success: true,
      message: 'تم تأكيد التسليم بنجاح',
      data: {
        delivery_id: d.id,
        product_name: d.product_name,
        delivered_at: new Date()
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

router.post('/create', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { order_id, product_id, buyer_id, delivery_address, delivery_phone, delivery_notes } = req.body;

    const { code, secret } = generateQRCode();

    const result = await pool.query(`
      INSERT INTO physical_deliveries 
        (order_id, product_id, buyer_id, qr_code, qr_secret, delivery_address, delivery_phone, delivery_notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [order_id, product_id, buyer_id, code, secret, delivery_address, delivery_phone, delivery_notes]);

    res.status(201).json({ 
      success: true, 
      data: result.rows[0],
      message: 'تم إنشاء طلب التسليم بنجاح'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

router.get('/all', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { status } = req.query;
    let query = `
      SELECT pd.*, o.total_price, o.quantity, p.name as product_name, p.name_ar as product_name_ar,
             u.name as buyer_name, u.email as buyer_email, u.phone as buyer_phone,
             d.name as delivered_by_name
      FROM physical_deliveries pd
      JOIN orders o ON pd.order_id = o.id
      JOIN products p ON pd.product_id = p.id
      LEFT JOIN users u ON pd.buyer_id = u.id
      LEFT JOIN users d ON pd.delivered_by = d.id
    `;
    const params = [];

    if (status) {
      params.push(status);
      query += ` WHERE pd.delivery_status = $1`;
    }

    query += ' ORDER BY pd.created_at DESC';

    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

module.exports = router;
