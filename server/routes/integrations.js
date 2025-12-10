const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken, isAdmin } = require('../middleware/auth');

const initIntegrationsTables = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS merchant_integrations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        gateway_type VARCHAR(50) NOT NULL,
        gateway_name VARCHAR(100) NOT NULL,
        api_key VARCHAR(500),
        api_secret VARCHAR(500),
        merchant_id VARCHAR(255),
        is_live BOOLEAN DEFAULT false,
        is_active BOOLEAN DEFAULT true,
        settings JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, gateway_type)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS platform_commissions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        commission_type VARCHAR(20) DEFAULT 'percentage',
        commission_value DECIMAL(10,2) DEFAULT 2.5,
        min_amount DECIMAL(10,2) DEFAULT 0,
        max_amount DECIMAL(10,2) DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS commission_transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        order_id UUID,
        order_amount DECIMAL(15,2),
        commission_amount DECIMAL(15,2),
        commission_type VARCHAR(50),
        gateway_type VARCHAR(50),
        status VARCHAR(20) DEFAULT 'completed',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const commExists = await pool.query('SELECT id FROM platform_commissions LIMIT 1');
    if (commExists.rows.length === 0) {
      await pool.query(`
        INSERT INTO platform_commissions (name, commission_type, commission_value) VALUES
        ('عمولة المبيعات الافتراضية', 'percentage', 2.5),
        ('عمولة بوابات الدفع', 'percentage', 1.0),
        ('عمولة المنتجات الرقمية', 'percentage', 3.0)
      `);
    }

    console.log('Integrations tables initialized');
  } catch (error) {
    console.error('Error initializing integrations tables:', error);
  }
};

initIntegrationsTables();

const SUPPORTED_GATEWAYS = [
  { type: 'paytabs', name: 'PayTabs', name_ar: 'باي تابس', fields: ['profile_id', 'server_key', 'client_key'] },
  { type: 'tap', name: 'Tap Payments', name_ar: 'تاب', fields: ['secret_key', 'publishable_key'] },
  { type: 'hyperpay', name: 'HyperPay', name_ar: 'هايبر باي', fields: ['entity_id', 'access_token'] },
  { type: 'moyasar', name: 'Moyasar', name_ar: 'مُيسر', fields: ['secret_key', 'publishable_key'] },
  { type: 'paylink', name: 'Paylink', name_ar: 'بيلينك', fields: ['api_id', 'secret_key'] },
  { type: 'myfatoorah', name: 'MyFatoorah', name_ar: 'ماي فاتورة', fields: ['api_key', 'callback_url'] },
  { type: 'stripe', name: 'Stripe', name_ar: 'سترايب', fields: ['secret_key', 'publishable_key', 'webhook_secret'] },
  { type: 'paypal', name: 'PayPal', name_ar: 'باي بال', fields: ['client_id', 'client_secret'] }
];

router.get('/gateways', authenticateToken, (req, res) => {
  res.json({ success: true, gateways: SUPPORTED_GATEWAYS });
});

router.get('/my-integrations', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM merchant_integrations WHERE user_id = $1 ORDER BY created_at DESC
    `, [req.user.id]);
    
    const integrations = result.rows.map(i => ({
      ...i,
      api_key: i.api_key ? '••••••••' + i.api_key.slice(-4) : null,
      api_secret: i.api_secret ? '••••••••' + i.api_secret.slice(-4) : null
    }));
    
    res.json({ success: true, integrations });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'خطأ في جلب التكاملات' });
  }
});

router.post('/connect', authenticateToken, async (req, res) => {
  const { gateway_type, api_key, api_secret, merchant_id, is_live, settings } = req.body;

  const gateway = SUPPORTED_GATEWAYS.find(g => g.type === gateway_type);
  if (!gateway) {
    return res.status(400).json({ success: false, message: 'بوابة غير مدعومة' });
  }

  try {
    const existing = await pool.query(
      'SELECT id FROM merchant_integrations WHERE user_id = $1 AND gateway_type = $2',
      [req.user.id, gateway_type]
    );

    if (existing.rows.length > 0) {
      await pool.query(`
        UPDATE merchant_integrations 
        SET api_key = $1, api_secret = $2, merchant_id = $3, is_live = $4, settings = $5, updated_at = NOW()
        WHERE user_id = $6 AND gateway_type = $7
      `, [api_key, api_secret, merchant_id, is_live || false, JSON.stringify(settings || {}), req.user.id, gateway_type]);
    } else {
      await pool.query(`
        INSERT INTO merchant_integrations (user_id, gateway_type, gateway_name, api_key, api_secret, merchant_id, is_live, settings)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [req.user.id, gateway_type, gateway.name, api_key, api_secret, merchant_id, is_live || false, JSON.stringify(settings || {})]);
    }

    res.json({ success: true, message: 'تم ربط البوابة بنجاح' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'خطأ في ربط البوابة' });
  }
});

router.delete('/disconnect/:gateway_type', authenticateToken, async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM merchant_integrations WHERE user_id = $1 AND gateway_type = $2',
      [req.user.id, req.params.gateway_type]
    );
    res.json({ success: true, message: 'تم فصل البوابة' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'خطأ في فصل البوابة' });
  }
});

router.post('/toggle/:gateway_type', authenticateToken, async (req, res) => {
  const { is_active } = req.body;
  try {
    await pool.query(
      'UPDATE merchant_integrations SET is_active = $1, updated_at = NOW() WHERE user_id = $2 AND gateway_type = $3',
      [is_active, req.user.id, req.params.gateway_type]
    );
    res.json({ success: true, message: is_active ? 'تم تفعيل البوابة' : 'تم تعطيل البوابة' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'خطأ في تحديث الحالة' });
  }
});

router.get('/commissions', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT ct.*, u.name as user_name
      FROM commission_transactions ct
      LEFT JOIN users u ON ct.user_id = u.id
      WHERE ct.user_id = $1
      ORDER BY ct.created_at DESC
      LIMIT 50
    `, [req.user.id]);
    
    const stats = await pool.query(`
      SELECT 
        SUM(commission_amount) as total_commission,
        COUNT(*) as total_transactions
      FROM commission_transactions
      WHERE user_id = $1
    `, [req.user.id]);

    res.json({ 
      success: true, 
      transactions: result.rows,
      stats: stats.rows[0]
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'خطأ في جلب العمولات' });
  }
});

router.get('/admin/all', authenticateToken, isAdmin, async (req, res) => {
  try {
    const integrations = await pool.query(`
      SELECT mi.*, u.name as user_name, u.email
      FROM merchant_integrations mi
      JOIN users u ON mi.user_id = u.id
      ORDER BY mi.created_at DESC
    `);

    const commissions = await pool.query(`
      SELECT ct.*, u.name as user_name
      FROM commission_transactions ct
      LEFT JOIN users u ON ct.user_id = u.id
      ORDER BY ct.created_at DESC
      LIMIT 100
    `);

    const settings = await pool.query('SELECT * FROM platform_commissions ORDER BY id');

    const stats = await pool.query(`
      SELECT 
        SUM(commission_amount) as total_platform_earnings,
        COUNT(*) as total_transactions,
        SUM(order_amount) as total_processed_volume
      FROM commission_transactions
    `);

    res.json({ 
      success: true, 
      integrations: integrations.rows,
      commissions: commissions.rows,
      settings: settings.rows,
      stats: stats.rows[0]
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'خطأ في جلب البيانات' });
  }
});

router.put('/admin/commission/:id', authenticateToken, isAdmin, async (req, res) => {
  const { commission_value, is_active } = req.body;
  try {
    await pool.query(`
      UPDATE platform_commissions 
      SET commission_value = COALESCE($1, commission_value), 
          is_active = COALESCE($2, is_active)
      WHERE id = $3
    `, [commission_value, is_active, req.params.id]);
    res.json({ success: true, message: 'تم تحديث العمولة' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'خطأ في التحديث' });
  }
});

const calculateCommission = async (orderAmount, commissionType = 'عمولة المبيعات الافتراضية') => {
  try {
    const result = await pool.query(
      'SELECT * FROM platform_commissions WHERE name = $1 AND is_active = true',
      [commissionType]
    );
    
    if (result.rows.length === 0) {
      const defaultComm = await pool.query(
        'SELECT * FROM platform_commissions WHERE is_active = true LIMIT 1'
      );
      if (defaultComm.rows.length === 0) return 0;
      const comm = defaultComm.rows[0];
      return comm.commission_type === 'percentage' 
        ? (orderAmount * comm.commission_value / 100)
        : comm.commission_value;
    }
    
    const comm = result.rows[0];
    return comm.commission_type === 'percentage' 
      ? (orderAmount * comm.commission_value / 100)
      : comm.commission_value;
  } catch (error) {
    console.error('Error calculating commission:', error);
    return 0;
  }
};

const recordCommission = async (userId, orderId, orderAmount, commissionAmount, commissionType, gatewayType) => {
  try {
    await pool.query(`
      INSERT INTO commission_transactions (user_id, order_id, order_amount, commission_amount, commission_type, gateway_type)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [userId, orderId, orderAmount, commissionAmount, commissionType, gatewayType]);
  } catch (error) {
    console.error('Error recording commission:', error);
  }
};

module.exports = router;
module.exports.calculateCommission = calculateCommission;
module.exports.recordCommission = recordCommission;
