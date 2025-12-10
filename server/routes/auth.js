const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const pool = require('../config/database');
const { JWT_SECRET, authenticateToken } = require('../middleware/auth');
const pressableService = require('../services/pressable');

const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { email, password, name, phone, role = 'seller', storeName, subdomain, themeColor, referral_code } = req.body;
    
    console.log('Registration attempt:', { email, name, role, storeName, subdomain });

    if (!email || !password || !name) {
      return res.status(400).json({ success: false, message: 'جميع الحقول مطلوبة' });
    }

    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'البريد الإلكتروني مسجل مسبقاً' });
    }

    if (role === 'distributor' && subdomain) {
      const existingSubdomain = await pool.query('SELECT id FROM distributor_sites WHERE subdomain = $1', [subdomain.toLowerCase()]);
      if (existingSubdomain.rows.length > 0) {
        return res.status(400).json({ success: false, message: 'اسم النطاق الفرعي مستخدم مسبقاً' });
      }
    }

    let referrerId = null;
    if (referral_code) {
      const referrerResult = await pool.query(
        'SELECT id FROM users WHERE referral_code = $1',
        [referral_code.toUpperCase()]
      );
      if (referrerResult.rows.length > 0) {
        referrerId = referrerResult.rows[0].id;
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const apiKey = `dk_${uuidv4().replace(/-/g, '')}`;
    const apiSecret = `ds_${uuidv4().replace(/-/g, '')}`;
    const newReferralCode = Math.random().toString(36).substring(2, 10).toUpperCase();

    const userResult = await pool.query(
      `INSERT INTO users (email, password, name, phone, role, api_key, api_secret, referral_code, referred_by) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id, email, name, role, api_key, referral_code`,
      [email, hashedPassword, name, phone, role === 'distributor' ? 'distributor' : 'seller', apiKey, apiSecret, newReferralCode, referrerId]
    );

    const user = userResult.rows[0];

    await pool.query(
      'INSERT INTO wallets (user_id, balance) VALUES ($1, $2)',
      [user.id, 0]
    );

    let store = null;
    let pressableSite = null;
    if (role === 'distributor' && storeName && subdomain) {
      console.log('Creating store for distributor:', { userId: user.id, storeName, subdomain });
      try {
        // Create site on Pressable
        console.log('Creating Pressable site...');
        pressableSite = await pressableService.createSite(subdomain);
        console.log('Pressable site created:', pressableSite);

        const storeResult = await pool.query(
          `INSERT INTO distributor_sites (user_id, site_name, subdomain, theme_color, pressable_site_id, pressable_url) 
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
          [user.id, storeName, subdomain.toLowerCase(), themeColor || '#3B82F6', 
           pressableSite.siteId, pressableSite.siteUrl]
        );
        store = storeResult.rows[0];
        console.log('Store created successfully:', store);
      } catch (storeError) {
        console.error('Error creating store:', storeError);
        // If Pressable fails, still create local store
        if (!store) {
          const storeResult = await pool.query(
            `INSERT INTO distributor_sites (user_id, site_name, subdomain, theme_color) 
             VALUES ($1, $2, $3, $4) RETURNING *`,
            [user.id, storeName, subdomain.toLowerCase(), themeColor || '#3B82F6']
          );
          store = storeResult.rows[0];
        }
      }
    }

    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      success: true,
      message: 'تم التسجيل بنجاح',
      data: { user, token, store }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'البريد الإلكتروني وكلمة المرور مطلوبان' });
    }

    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'بيانات تسجيل الدخول غير صحيحة' });
    }

    const user = result.rows[0];
    
    if (!user.is_active) {
      return res.status(401).json({ success: false, message: 'الحساب معطل' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ success: false, message: 'بيانات تسجيل الدخول غير صحيحة' });
    }

    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    const walletResult = await pool.query('SELECT balance FROM wallets WHERE user_id = $1', [user.id]);
    const balance = walletResult.rows[0]?.balance || 0;

    res.json({
      success: true,
      message: 'تم تسجيل الدخول بنجاح',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          api_key: user.api_key
        },
        balance,
        token
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const walletResult = await pool.query('SELECT balance FROM wallets WHERE user_id = $1', [req.user.id]);
    const balance = walletResult.rows[0]?.balance || 0;

    res.json({
      success: true,
      data: {
        user: {
          id: req.user.id,
          email: req.user.email,
          name: req.user.name,
          phone: req.user.phone,
          role: req.user.role,
          api_key: req.user.api_key,
          api_secret: req.user.api_secret
        },
        balance
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

router.post('/regenerate-api-keys', authenticateToken, async (req, res) => {
  try {
    const apiKey = `dk_${uuidv4().replace(/-/g, '')}`;
    const apiSecret = `ds_${uuidv4().replace(/-/g, '')}`;

    await pool.query(
      'UPDATE users SET api_key = $1, api_secret = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
      [apiKey, apiSecret, req.user.id]
    );

    res.json({
      success: true,
      message: 'تم تجديد مفاتيح API بنجاح',
      data: { api_key: apiKey, api_secret: apiSecret }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

router.get('/my-store', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM distributor_sites WHERE user_id = $1',
      [req.user.id]
    );
    
    if (result.rows.length === 0) {
      return res.json({ success: true, store: null });
    }
    
    res.json({ success: true, store: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

router.post('/create-store', authenticateToken, async (req, res) => {
  try {
    const { storeName, subdomain, themeColor, logoUrl } = req.body;
    
    if (!storeName || !subdomain) {
      return res.status(400).json({ success: false, message: 'اسم المتجر والنطاق الفرعي مطلوبان' });
    }

    const existingStore = await pool.query(
      'SELECT id FROM distributor_sites WHERE user_id = $1',
      [req.user.id]
    );
    
    if (existingStore.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'لديك متجر مسبقاً' });
    }

    const existingSubdomain = await pool.query(
      'SELECT id FROM distributor_sites WHERE subdomain = $1',
      [subdomain.toLowerCase()]
    );
    
    if (existingSubdomain.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'اسم النطاق الفرعي مستخدم مسبقاً' });
    }

    if (req.user.role === 'seller') {
      await pool.query(
        'UPDATE users SET role = $1 WHERE id = $2',
        ['distributor', req.user.id]
      );
    }

    let pressableSite = null;
    try {
      console.log('Creating Pressable site for existing user...');
      pressableSite = await pressableService.createSite(subdomain);
      console.log('Pressable site created:', pressableSite);
    } catch (pressableError) {
      console.error('Pressable error:', pressableError.message);
    }

    const result = await pool.query(
      `INSERT INTO distributor_sites (user_id, site_name, subdomain, theme_color, logo_url, pressable_site_id, pressable_url) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [req.user.id, storeName, subdomain.toLowerCase(), themeColor || '#3B82F6', logoUrl || null,
       pressableSite?.siteId || null, pressableSite?.siteUrl || null]
    );

    res.status(201).json({
      success: true,
      message: 'تم إنشاء المتجر بنجاح',
      store: result.rows[0],
      pressable: pressableSite
    });
  } catch (error) {
    console.error('Store creation error:', error);
    res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

router.get('/referrer-info/:code', async (req, res) => {
  try {
    const { code } = req.params;
    
    const result = await pool.query(
      'SELECT name FROM users WHERE referral_code = $1',
      [code.toUpperCase()]
    );
    
    if (result.rows.length === 0) {
      return res.json({ success: true, data: null });
    }
    
    res.json({ success: true, data: { name: result.rows[0].name } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

router.put('/update-store', authenticateToken, async (req, res) => {
  try {
    const { storeName, themeColor, logoUrl } = req.body;

    const result = await pool.query(
      `UPDATE distributor_sites SET 
        site_name = COALESCE($1, site_name),
        theme_color = COALESCE($2, theme_color),
        logo_url = COALESCE($3, logo_url),
        updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $4 RETURNING *`,
      [storeName, themeColor, logoUrl, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'المتجر غير موجود' });
    }

    res.json({
      success: true,
      message: 'تم تحديث المتجر بنجاح',
      store: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

module.exports = router;
