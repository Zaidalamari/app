const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

const uploadsDir = path.join(__dirname, '../../uploads/gateway-docs');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname || mimetype) {
      return cb(null, true);
    }
    cb(new Error('نوع الملف غير مدعوم'));
  }
});

const GATEWAYS = [
  {
    id: 'tap',
    name: 'تاب للمدفوعات',
    name_en: 'Tap Payments',
    countries: ['SA', 'AE', 'KW', 'BH', 'QA', 'OM'],
    fee: '2.90%',
    requirements: [
      { id: 'commercial_register', name: 'السجل التجاري', required: true },
      { id: 'bank_account', name: 'حساب بنكي', required: true },
      { id: 'national_id', name: 'هوية المالك', required: true }
    ]
  },
  {
    id: 'paytabs',
    name: 'باي تابس',
    name_en: 'PayTabs',
    countries: ['SA', 'AE', 'EG', 'JO', 'OM', 'KW', 'BH', 'QA'],
    fee: '2.75%',
    requirements: [
      { id: 'commercial_register', name: 'السجل التجاري', required: true },
      { id: 'national_id', name: 'هوية المالك', required: true },
      { id: 'rental_contract', name: 'عقد إيجار', required: false }
    ]
  },
  {
    id: 'moyasar',
    name: 'ميسر',
    name_en: 'Moyasar',
    countries: ['SA'],
    fee: '2.75%',
    requirements: [
      { id: 'commercial_register', name: 'السجل التجاري', required: true },
      { id: 'bank_account', name: 'حساب بنكي', required: true }
    ]
  },
  {
    id: 'hyperpay',
    name: 'هايبر باي',
    name_en: 'HyperPay',
    countries: ['SA', 'AE', 'EG', 'JO'],
    fee: '2.50%',
    requirements: [
      { id: 'commercial_register', name: 'السجل التجاري', required: true },
      { id: 'work_contract', name: 'عقد عمل', required: true }
    ]
  },
  {
    id: 'myfatoorah',
    name: 'ماي فاتورة',
    name_en: 'MyFatoorah',
    countries: ['SA', 'AE', 'KW', 'BH', 'QA', 'OM', 'EG', 'JO'],
    fee: '2.75%',
    requirements: [
      { id: 'commercial_register', name: 'السجل التجاري', required: true },
      { id: 'national_id', name: 'الهوية', required: true }
    ]
  },
  {
    id: 'paylink',
    name: 'بيلنك',
    name_en: 'Paylink',
    countries: ['SA'],
    fee: '2.50%',
    requirements: [
      { id: 'commercial_register', name: 'السجل التجاري أو عمل حر', required: true }
    ]
  },
  {
    id: 'tabby',
    name: 'تابي',
    name_en: 'Tabby',
    countries: ['SA', 'AE', 'KW'],
    fee: '4.00%',
    requirements: [
      { id: 'commercial_register', name: 'السجل التجاري', required: true },
      { id: 'website', name: 'موقع إلكتروني', required: true }
    ]
  },
  {
    id: 'paymob',
    name: 'بايموب',
    name_en: 'Paymob',
    countries: ['EG', 'SA', 'AE', 'PK'],
    fee: '2.50%',
    requirements: [
      { id: 'commercial_register', name: 'السجل التجاري', required: true },
      { id: 'tax_card', name: 'بطاقة ضريبية', required: true }
    ]
  },
  {
    id: 'noon',
    name: 'نون للمدفوعات',
    name_en: 'Noon Payments',
    countries: ['SA', 'AE', 'EG'],
    fee: '2.50%',
    requirements: [
      { id: 'commercial_register', name: 'السجل التجاري', required: true },
      { id: 'noon_seller', name: 'حساب بائع نون', required: true }
    ]
  },
  {
    id: 'tamara',
    name: 'تمارا',
    name_en: 'Tamara',
    countries: ['SA', 'AE', 'KW'],
    fee: '4.50%',
    requirements: [
      { id: 'commercial_register', name: 'السجل التجاري', required: true },
      { id: 'sales_volume', name: 'حجم مبيعات', required: true }
    ]
  },
  {
    id: 'paypal',
    name: 'باي بال',
    name_en: 'PayPal',
    countries: ['global'],
    fee: '3.90%',
    requirements: [
      { id: 'paypal_business', name: 'حساب PayPal Business', required: true }
    ]
  },
  {
    id: 'tazapay',
    name: 'تازاباي',
    name_en: 'Tazapay',
    countries: ['global'],
    fee: '2.90%',
    requirements: [
      { id: 'commercial_register', name: 'السجل التجاري', required: true },
      { id: 'kyc', name: 'KYC', required: true }
    ]
  }
];

router.get('/available', authenticateToken, async (req, res) => {
  try {
    const applications = await pool.query(
      'SELECT gateway_name, status FROM payment_gateway_applications WHERE user_id = $1',
      [req.user.id]
    );
    
    const appMap = {};
    applications.rows.forEach(app => {
      appMap[app.gateway_name] = app.status;
    });

    const gatewaysWithStatus = GATEWAYS.map(g => ({
      ...g,
      applicationStatus: appMap[g.id] || null
    }));

    res.json({ success: true, gateways: gatewaysWithStatus });
  } catch (error) {
    console.error('Error fetching gateways:', error);
    res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

router.get('/my-applications', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT a.*, 
        (SELECT json_agg(json_build_object('id', d.id, 'type', d.document_type, 'name', d.document_name, 'url', d.file_url))
         FROM gateway_documents d WHERE d.application_id = a.id) as documents
      FROM payment_gateway_applications a
      WHERE a.user_id = $1
      ORDER BY a.created_at DESC
    `, [req.user.id]);

    res.json({ success: true, applications: result.rows });
  } catch (error) {
    console.error('Error fetching applications:', error);
    res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

router.post('/apply/:gatewayId', authenticateToken, upload.array('documents', 10), async (req, res) => {
  try {
    const { gatewayId } = req.params;
    const { documentTypes } = req.body;
    
    const gateway = GATEWAYS.find(g => g.id === gatewayId);
    if (!gateway) {
      return res.status(404).json({ success: false, message: 'بوابة الدفع غير موجودة' });
    }

    const existing = await pool.query(
      'SELECT id FROM payment_gateway_applications WHERE user_id = $1 AND gateway_name = $2',
      [req.user.id, gatewayId]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'لديك طلب سابق لهذه البوابة' });
    }

    const appResult = await pool.query(
      `INSERT INTO payment_gateway_applications (user_id, gateway_name, status)
       VALUES ($1, $2, 'pending') RETURNING *`,
      [req.user.id, gatewayId]
    );

    const application = appResult.rows[0];
    const types = JSON.parse(documentTypes || '[]');

    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      const docType = types[i] || 'document';
      
      await pool.query(
        `INSERT INTO gateway_documents (application_id, document_type, document_name, file_url)
         VALUES ($1, $2, $3, $4)`,
        [application.id, docType, file.originalname, `/uploads/gateway-docs/${file.filename}`]
      );
    }

    res.json({ 
      success: true, 
      message: 'تم إرسال طلبك بنجاح، سيتم مراجعته خلال 24-48 ساعة',
      application 
    });
  } catch (error) {
    console.error('Error submitting application:', error);
    res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

router.get('/admin/applications', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'غير مصرح' });
    }

    const result = await pool.query(`
      SELECT a.*, u.name as user_name, u.email as user_email,
        (SELECT json_agg(json_build_object('id', d.id, 'type', d.document_type, 'name', d.document_name, 'url', d.file_url))
         FROM gateway_documents d WHERE d.application_id = a.id) as documents
      FROM payment_gateway_applications a
      JOIN users u ON a.user_id = u.id
      ORDER BY a.created_at DESC
    `);

    res.json({ success: true, applications: result.rows });
  } catch (error) {
    console.error('Error fetching admin applications:', error);
    res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

router.put('/admin/applications/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'غير مصرح' });
    }

    const { id } = req.params;
    const { status, notes } = req.body;

    const result = await pool.query(
      `UPDATE payment_gateway_applications 
       SET status = $1, notes = $2, reviewed_at = NOW()
       WHERE id = $3 RETURNING *`,
      [status, notes, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'الطلب غير موجود' });
    }

    res.json({ success: true, application: result.rows[0] });
  } catch (error) {
    console.error('Error updating application:', error);
    res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

module.exports = router;
