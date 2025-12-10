const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken, isAdmin } = require('../middleware/auth');

const initGatewaysTables = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS payment_gateways (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        name_ar VARCHAR(100) NOT NULL,
        slug VARCHAR(100) UNIQUE NOT NULL,
        logo_url VARCHAR(500),
        description TEXT,
        description_ar TEXT,
        requirements TEXT,
        requirements_ar TEXT,
        supported_countries TEXT DEFAULT 'SA,AE,KW,BH,QA,OM,EG',
        commission_rate DECIMAL(5,2) DEFAULT 2.5,
        fixed_fee DECIMAL(10,2) DEFAULT 0,
        is_our_gateway BOOLEAN DEFAULT false,
        instant_activation BOOLEAN DEFAULT false,
        integration_url VARCHAR(500),
        docs_url VARCHAR(500),
        is_active BOOLEAN DEFAULT true,
        display_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_gateways (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        gateway_id UUID REFERENCES payment_gateways(id) ON DELETE CASCADE,
        status VARCHAR(50) DEFAULT 'pending',
        api_key VARCHAR(500),
        api_secret VARCHAR(500),
        merchant_id VARCHAR(255),
        additional_config JSONB DEFAULT '{}',
        is_active BOOLEAN DEFAULT false,
        activated_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, gateway_id)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS gateway_applications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        gateway_id UUID REFERENCES payment_gateways(id) ON DELETE CASCADE,
        business_name VARCHAR(255),
        business_type VARCHAR(100),
        commercial_register VARCHAR(100),
        website_url VARCHAR(500),
        monthly_volume VARCHAR(100),
        notes TEXT,
        status VARCHAR(50) DEFAULT 'pending',
        admin_notes TEXT,
        reviewed_by UUID REFERENCES users(id),
        reviewed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const gatewaysExist = await pool.query('SELECT id FROM payment_gateways LIMIT 1');
    if (gatewaysExist.rows.length === 0) {
      await pool.query(`
        INSERT INTO payment_gateways (name, name_ar, slug, logo_url, description_ar, requirements_ar, supported_countries, commission_rate, is_our_gateway, instant_activation, display_order) VALUES
        ('Alameri Pay', 'العامري باي', 'alameri-pay', '/images/alameri-pay.png', 'بوابة الدفع الخاصة بنا - تفعيل فوري ومباشر', 'لا يوجد متطلبات - خطة Enterprise', 'SA,AE,KW,BH,QA,OM,EG,JO,LB,PS', 2.0, true, true, 0),
        ('PayTabs', 'باي تابس', 'paytabs', '/images/paytabs.png', 'بوابة دفع سعودية موثوقة', 'سجل تجاري، هوية المالك، عقد إيجار', 'SA,AE,EG,JO,OM,KW,BH,QA', 2.75, false, false, 1),
        ('Tap Payments', 'تاب للمدفوعات', 'tap-payments', '/images/tap.png', 'بوابة دفع خليجية رائدة', 'سجل تجاري، حساب بنكي تجاري', 'SA,AE,KW,BH,QA,OM', 2.9, false, false, 2),
        ('HyperPay', 'هايبر باي', 'hyperpay', '/images/hyperpay.png', 'بوابة دفع متكاملة', 'سجل تجاري، عقد عمل', 'SA,AE,EG,JO', 2.5, false, false, 3),
        ('Moyasar', 'مُيسر', 'moyasar', '/images/moyasar.png', 'حلول دفع سعودية', 'سجل تجاري، حساب بنكي', 'SA', 2.75, false, false, 4),
        ('Paylink', 'بيلينك', 'paylink', '/images/paylink.png', 'روابط دفع سهلة', 'سجل تجاري أو عمل حر', 'SA', 2.5, false, false, 5),
        ('MyFatoorah', 'ماي فاتورة', 'myfatoorah', '/images/myfatoorah.png', 'فواتير ودفع إلكتروني', 'سجل تجاري، هوية', 'SA,AE,KW,BH,QA,OM,EG,JO', 2.75, false, false, 6),
        ('Paymob', 'بايموب', 'paymob', '/images/paymob.png', 'بوابة دفع مصرية', 'سجل تجاري، بطاقة ضريبية', 'EG,SA,AE,PK', 2.5, false, false, 7),
        ('Tabby', 'تابي', 'tabby', '/images/tabby.png', 'ادفع لاحقاً - تقسيط', 'سجل تجاري، موقع إلكتروني', 'SA,AE,KW', 4.0, false, false, 8),
        ('Tamara', 'تمارا', 'tamara', '/images/tamara.png', 'التقسيط بدون فوائد', 'سجل تجاري، حجم مبيعات', 'SA,AE,KW', 4.5, false, false, 9),
        ('PayPal', 'باي بال', 'paypal', '/images/paypal.png', 'دفع عالمي', 'حساب PayPal Business', 'عالمي', 3.9, false, false, 10),
        ('Noon Payments', 'نون للمدفوعات', 'noon-payments', '/images/noon.png', 'بوابة دفع نون', 'سجل تجاري، حساب بائع نون', 'SA,AE,EG', 2.5, false, false, 11),
        ('Tazapay', 'تازاباي', 'tazapay', '/images/tazapay.png', 'مدفوعات عابرة للحدود', 'سجل تجاري، KYC', 'عالمي', 2.9, false, false, 12),
        ('Konnect', 'كونكت', 'konnect', '/images/konnect.png', 'مدفوعات تونسية', 'سجل تجاري تونسي', 'TN', 2.5, false, false, 13),
        ('Slick Pay', 'سليك باي', 'slick-pay', '/images/slickpay.png', 'مدفوعات جزائرية', 'سجل تجاري جزائري', 'DZ', 2.5, false, false, 14)
      `);
    }

    console.log('Payment gateways tables initialized');
  } catch (error) {
    console.error('Error initializing gateways tables:', error);
  }
};

initGatewaysTables();

router.get('/list', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM payment_gateways 
      WHERE is_active = true 
      ORDER BY is_our_gateway DESC, display_order ASC
    `);
    res.json({ success: true, gateways: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'خطأ في جلب البوابات' });
  }
});

router.get('/my-gateways', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT ug.*, pg.name, pg.name_ar, pg.slug, pg.logo_url, pg.commission_rate, pg.is_our_gateway
      FROM user_gateways ug
      JOIN payment_gateways pg ON ug.gateway_id = pg.id
      WHERE ug.user_id = $1
      ORDER BY ug.created_at DESC
    `, [req.user.id]);
    res.json({ success: true, gateways: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'خطأ في جلب البوابات' });
  }
});

router.post('/activate', authenticateToken, async (req, res) => {
  const { gateway_id } = req.body;

  try {
    const gateway = await pool.query('SELECT * FROM payment_gateways WHERE id = $1', [gateway_id]);
    if (gateway.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'البوابة غير موجودة' });
    }

    const gw = gateway.rows[0];

    if (!gw.instant_activation) {
      return res.status(400).json({ success: false, message: 'هذه البوابة تتطلب تقديم طلب' });
    }

    const existing = await pool.query(
      'SELECT id FROM user_gateways WHERE user_id = $1 AND gateway_id = $2',
      [req.user.id, gateway_id]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'البوابة مفعلة مسبقاً' });
    }

    const { v4: uuidv4 } = require('uuid');
    const apiKey = `ap_${uuidv4().replace(/-/g, '')}`;
    const apiSecret = `as_${uuidv4().replace(/-/g, '')}`;

    await pool.query(`
      INSERT INTO user_gateways (user_id, gateway_id, status, api_key, api_secret, is_active, activated_at)
      VALUES ($1, $2, 'active', $3, $4, true, NOW())
    `, [req.user.id, gateway_id, apiKey, apiSecret]);

    res.json({ 
      success: true, 
      message: 'تم تفعيل البوابة بنجاح',
      api_key: apiKey,
      api_secret: apiSecret
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'خطأ في التفعيل' });
  }
});

router.post('/apply', authenticateToken, async (req, res) => {
  const { gateway_id, business_name, business_type, commercial_register, website_url, monthly_volume, notes } = req.body;

  try {
    const gateway = await pool.query('SELECT * FROM payment_gateways WHERE id = $1', [gateway_id]);
    if (gateway.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'البوابة غير موجودة' });
    }

    const existing = await pool.query(
      'SELECT id FROM gateway_applications WHERE user_id = $1 AND gateway_id = $2 AND status = $3',
      [req.user.id, gateway_id, 'pending']
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'لديك طلب قيد المراجعة' });
    }

    await pool.query(`
      INSERT INTO gateway_applications (user_id, gateway_id, business_name, business_type, commercial_register, website_url, monthly_volume, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [req.user.id, gateway_id, business_name, business_type, commercial_register, website_url, monthly_volume, notes]);

    res.json({ success: true, message: 'تم إرسال الطلب بنجاح' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'خطأ في إرسال الطلب' });
  }
});

router.get('/my-applications', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT ga.*, pg.name, pg.name_ar, pg.slug, pg.logo_url
      FROM gateway_applications ga
      JOIN payment_gateways pg ON ga.gateway_id = pg.id
      WHERE ga.user_id = $1
      ORDER BY ga.created_at DESC
    `, [req.user.id]);
    res.json({ success: true, applications: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'خطأ في جلب الطلبات' });
  }
});

router.get('/admin/all', authenticateToken, isAdmin, async (req, res) => {
  try {
    const gateways = await pool.query('SELECT * FROM payment_gateways ORDER BY display_order ASC');
    const applications = await pool.query(`
      SELECT ga.*, u.name as user_name, u.email, pg.name as gateway_name, pg.name_ar as gateway_name_ar
      FROM gateway_applications ga
      JOIN users u ON ga.user_id = u.id
      JOIN payment_gateways pg ON ga.gateway_id = pg.id
      ORDER BY ga.created_at DESC
    `);
    const userGateways = await pool.query(`
      SELECT ug.*, u.name as user_name, u.email, pg.name as gateway_name, pg.name_ar as gateway_name_ar
      FROM user_gateways ug
      JOIN users u ON ug.user_id = u.id
      JOIN payment_gateways pg ON ug.gateway_id = pg.id
      ORDER BY ug.created_at DESC
    `);

    res.json({ 
      success: true, 
      gateways: gateways.rows,
      applications: applications.rows,
      user_gateways: userGateways.rows
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'خطأ في جلب البيانات' });
  }
});

router.put('/admin/gateway/:id', authenticateToken, isAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, name_ar, description_ar, requirements_ar, commission_rate, is_active, display_order, instant_activation } = req.body;

  try {
    await pool.query(`
      UPDATE payment_gateways 
      SET name = COALESCE($1, name),
          name_ar = COALESCE($2, name_ar),
          description_ar = COALESCE($3, description_ar),
          requirements_ar = COALESCE($4, requirements_ar),
          commission_rate = COALESCE($5, commission_rate),
          is_active = COALESCE($6, is_active),
          display_order = COALESCE($7, display_order),
          instant_activation = COALESCE($8, instant_activation),
          updated_at = NOW()
      WHERE id = $9
    `, [name, name_ar, description_ar, requirements_ar, commission_rate, is_active, display_order, instant_activation, id]);

    res.json({ success: true, message: 'تم التحديث بنجاح' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'خطأ في التحديث' });
  }
});

router.post('/admin/gateway', authenticateToken, isAdmin, async (req, res) => {
  const { name, name_ar, slug, description_ar, requirements_ar, commission_rate, supported_countries, instant_activation } = req.body;

  try {
    const result = await pool.query(`
      INSERT INTO payment_gateways (name, name_ar, slug, description_ar, requirements_ar, commission_rate, supported_countries, instant_activation)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [name, name_ar, slug, description_ar, requirements_ar, commission_rate || 2.5, supported_countries || 'SA,AE', instant_activation || false]);

    res.json({ success: true, gateway: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'خطأ في الإضافة' });
  }
});

router.put('/admin/application/:id', authenticateToken, isAdmin, async (req, res) => {
  const { id } = req.params;
  const { status, admin_notes } = req.body;

  try {
    const app = await pool.query('SELECT * FROM gateway_applications WHERE id = $1', [id]);
    if (app.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'الطلب غير موجود' });
    }

    await pool.query(`
      UPDATE gateway_applications 
      SET status = $1, admin_notes = $2, reviewed_by = $3, reviewed_at = NOW(), updated_at = NOW()
      WHERE id = $4
    `, [status, admin_notes, req.user.id, id]);

    if (status === 'approved') {
      const { v4: uuidv4 } = require('uuid');
      const apiKey = `gw_${uuidv4().replace(/-/g, '')}`;
      const apiSecret = `gs_${uuidv4().replace(/-/g, '')}`;

      await pool.query(`
        INSERT INTO user_gateways (user_id, gateway_id, status, api_key, api_secret, is_active, activated_at)
        VALUES ($1, $2, 'active', $3, $4, true, NOW())
        ON CONFLICT (user_id, gateway_id) 
        DO UPDATE SET status = 'active', is_active = true, activated_at = NOW()
      `, [app.rows[0].user_id, app.rows[0].gateway_id, apiKey, apiSecret]);
    }

    res.json({ success: true, message: 'تم تحديث الطلب' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'خطأ في التحديث' });
  }
});

module.exports = router;
