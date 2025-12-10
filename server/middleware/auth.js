const jwt = require('jsonwebtoken');
const pool = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'digicards-secret-key-2024';

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'غير مصرح - لم يتم توفير رمز الوصول' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const result = await pool.query('SELECT * FROM users WHERE id = $1 AND is_active = true', [decoded.userId]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'المستخدم غير موجود أو غير نشط' });
    }

    req.user = result.rows[0];
    next();
  } catch (error) {
    return res.status(403).json({ success: false, message: 'رمز الوصول غير صالح' });
  }
};

const authenticateApiKey = async (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  const apiSecret = req.headers['x-api-secret'];

  if (!apiKey || !apiSecret) {
    return res.status(401).json({ success: false, message: 'مفتاح API غير صالح' });
  }

  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE api_key = $1 AND api_secret = $2 AND is_active = true',
      [apiKey, apiSecret]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'مفتاح API غير صالح' });
    }

    req.user = result.rows[0];
    
    await pool.query(
      'INSERT INTO api_logs (user_id, endpoint, method, request_body, ip_address) VALUES ($1, $2, $3, $4, $5)',
      [req.user.id, req.originalUrl, req.method, JSON.stringify(req.body), req.ip]
    );

    next();
  } catch (error) {
    return res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
};

const isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'غير مصرح - صلاحيات المشرف مطلوبة' });
  }
  next();
};

const isDistributor = (req, res, next) => {
  if (req.user.role !== 'distributor' && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'غير مصرح - صلاحيات الموزع مطلوبة' });
  }
  next();
};

module.exports = { authenticateToken, authenticateApiKey, isAdmin, isDistributor, JWT_SECRET };
