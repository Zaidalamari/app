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

const isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'صلاحيات المشرف مطلوبة' });
  }
  next();
};

const initMarketingTables = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS banners (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        title_ar VARCHAR(255),
        description TEXT,
        image_url VARCHAR(500),
        link_url VARCHAR(500),
        position VARCHAR(50) DEFAULT 'home',
        priority INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        start_date TIMESTAMP,
        end_date TIMESTAMP,
        click_count INTEGER DEFAULT 0,
        view_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS promotions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        code VARCHAR(50) UNIQUE NOT NULL,
        type VARCHAR(50) DEFAULT 'percentage',
        value DECIMAL(10, 2) NOT NULL,
        min_amount DECIMAL(15, 2) DEFAULT 0,
        max_discount DECIMAL(15, 2),
        usage_limit INTEGER,
        usage_count INTEGER DEFAULT 0,
        user_limit INTEGER DEFAULT 1,
        is_active BOOLEAN DEFAULT true,
        start_date TIMESTAMP,
        end_date TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS promotion_usage (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        promotion_id UUID REFERENCES promotions(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        order_id UUID,
        discount_amount DECIMAL(15, 2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        message TEXT,
        type VARCHAR(50) DEFAULT 'info',
        is_read BOOLEAN DEFAULT false,
        link_url VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const bannersExist = await pool.query('SELECT id FROM banners LIMIT 1');
    if (bannersExist.rows.length === 0) {
      await pool.query(`
        INSERT INTO banners (title, title_ar, description, image_url, position, priority, is_active) VALUES 
        ('Welcome Offer', 'عرض الترحيب', 'احصل على خصم 10% على أول عملية شحن', '/images/banner1.jpg', 'home', 1, true),
        ('Gaming Cards', 'بطاقات الألعاب', 'أفضل أسعار بطاقات الألعاب في المملكة', '/images/banner2.jpg', 'home', 2, true),
        ('API Integration', 'ربط API', 'اربط متجرك معنا واحصل على أسعار الجملة', '/images/banner3.jpg', 'home', 3, true)
      `);
    }

    const promotionsExist = await pool.query('SELECT id FROM promotions LIMIT 1');
    if (promotionsExist.rows.length === 0) {
      await pool.query(`
        INSERT INTO promotions (code, type, value, min_amount, max_discount, usage_limit, is_active) VALUES 
        ('WELCOME10', 'percentage', 10, 50, 100, 1000, true),
        ('DIGI50', 'fixed', 50, 500, NULL, 500, true),
        ('VIP20', 'percentage', 20, 200, 200, 100, true)
      `);
    }

    console.log('Marketing tables initialized');
  } catch (error) {
    console.error('Marketing tables init error:', error);
  }
};

initMarketingTables();

router.get('/banners', async (req, res) => {
  try {
    const { position = 'home' } = req.query;
    const now = new Date().toISOString();

    const result = await pool.query(
      `SELECT id, title, title_ar, description, image_url, link_url, position
       FROM banners 
       WHERE is_active = true 
         AND position = $1
         AND (start_date IS NULL OR start_date <= $2)
         AND (end_date IS NULL OR end_date >= $2)
       ORDER BY priority ASC`,
      [position, now]
    );

    res.json({ success: true, banners: result.rows });
  } catch (error) {
    console.error('Banners fetch error:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب الإعلانات' });
  }
});

router.post('/banners/:id/click', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query(
      'UPDATE banners SET click_count = click_count + 1 WHERE id = $1',
      [id]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false });
  }
});

router.post('/promotions/validate', authenticateToken, async (req, res) => {
  try {
    const { code, amount } = req.body;
    const userId = req.user.id;

    if (!code) {
      return res.status(400).json({ success: false, message: 'كود الخصم مطلوب' });
    }

    const result = await pool.query(
      `SELECT * FROM promotions 
       WHERE code = $1 AND is_active = true
         AND (start_date IS NULL OR start_date <= NOW())
         AND (end_date IS NULL OR end_date >= NOW())`,
      [code.toUpperCase()]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'كود الخصم غير صالح أو منتهي' });
    }

    const promo = result.rows[0];

    if (promo.usage_limit && promo.usage_count >= promo.usage_limit) {
      return res.status(400).json({ success: false, message: 'كود الخصم وصل للحد الأقصى من الاستخدام' });
    }

    const userUsage = await pool.query(
      'SELECT COUNT(*) FROM promotion_usage WHERE promotion_id = $1 AND user_id = $2',
      [promo.id, userId]
    );

    if (parseInt(userUsage.rows[0].count) >= promo.user_limit) {
      return res.status(400).json({ success: false, message: 'لقد استخدمت هذا الكود من قبل' });
    }

    if (amount && promo.min_amount && parseFloat(amount) < parseFloat(promo.min_amount)) {
      return res.status(400).json({ 
        success: false, 
        message: `الحد الأدنى للطلب ${promo.min_amount} ريال` 
      });
    }

    let discountAmount = 0;
    if (promo.type === 'percentage') {
      discountAmount = (parseFloat(amount) * parseFloat(promo.value)) / 100;
      if (promo.max_discount && discountAmount > parseFloat(promo.max_discount)) {
        discountAmount = parseFloat(promo.max_discount);
      }
    } else {
      discountAmount = parseFloat(promo.value);
    }

    res.json({
      success: true,
      promotion: {
        id: promo.id,
        code: promo.code,
        type: promo.type,
        value: promo.value,
        discountAmount: discountAmount.toFixed(2),
        finalAmount: (parseFloat(amount) - discountAmount).toFixed(2)
      }
    });
  } catch (error) {
    console.error('Promotion validation error:', error);
    res.status(500).json({ success: false, message: 'خطأ في التحقق من كود الخصم' });
  }
});

router.get('/promotions/active', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT code, type, value, min_amount, max_discount
       FROM promotions 
       WHERE is_active = true
         AND (start_date IS NULL OR start_date <= NOW())
         AND (end_date IS NULL OR end_date >= NOW())
         AND (usage_limit IS NULL OR usage_count < usage_limit)
       ORDER BY value DESC
       LIMIT 5`
    );

    res.json({ success: true, promotions: result.rows });
  } catch (error) {
    console.error('Promotions fetch error:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب العروض' });
  }
});

router.get('/notifications', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 20, unreadOnly = false } = req.query;

    let query = `SELECT id, title, message, type, is_read, link_url, created_at
                 FROM notifications WHERE user_id = $1`;
    const params = [userId];

    if (unreadOnly === 'true') {
      query += ' AND is_read = false';
    }

    query += ' ORDER BY created_at DESC LIMIT $2';
    params.push(parseInt(limit));

    const result = await pool.query(query, params);

    const unreadCount = await pool.query(
      'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = false',
      [userId]
    );

    res.json({
      success: true,
      notifications: result.rows,
      unreadCount: parseInt(unreadCount.rows[0].count)
    });
  } catch (error) {
    console.error('Notifications fetch error:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب الإشعارات' });
  }
});

router.put('/notifications/:id/read', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    await pool.query(
      'UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: 'خطأ في تحديث الإشعار' });
  }
});

router.put('/notifications/read-all', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    await pool.query(
      'UPDATE notifications SET is_read = true WHERE user_id = $1',
      [userId]
    );

    res.json({ success: true, message: 'تم تحديث جميع الإشعارات' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'خطأ في تحديث الإشعارات' });
  }
});

router.get('/admin/banners', authenticateToken, isAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM banners ORDER BY priority ASC, created_at DESC'
    );
    res.json({ success: true, banners: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'خطأ في جلب الإعلانات' });
  }
});

router.post('/admin/banners', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { title, title_ar, description, image_url, link_url, position, priority, start_date, end_date } = req.body;

    const result = await pool.query(
      `INSERT INTO banners (title, title_ar, description, image_url, link_url, position, priority, start_date, end_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [title, title_ar, description, image_url, link_url, position || 'home', priority || 0, start_date, end_date]
    );

    res.json({ success: true, banner: result.rows[0] });
  } catch (error) {
    console.error('Banner creation error:', error);
    res.status(500).json({ success: false, message: 'خطأ في إنشاء الإعلان' });
  }
});

router.put('/admin/banners/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, title_ar, description, image_url, link_url, position, priority, is_active, start_date, end_date } = req.body;

    const result = await pool.query(
      `UPDATE banners SET 
        title = COALESCE($1, title),
        title_ar = COALESCE($2, title_ar),
        description = COALESCE($3, description),
        image_url = COALESCE($4, image_url),
        link_url = COALESCE($5, link_url),
        position = COALESCE($6, position),
        priority = COALESCE($7, priority),
        is_active = COALESCE($8, is_active),
        start_date = $9,
        end_date = $10,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $11 RETURNING *`,
      [title, title_ar, description, image_url, link_url, position, priority, is_active, start_date, end_date, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'الإعلان غير موجود' });
    }

    res.json({ success: true, banner: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'خطأ في تحديث الإعلان' });
  }
});

router.delete('/admin/banners/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM banners WHERE id = $1', [id]);
    res.json({ success: true, message: 'تم حذف الإعلان' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'خطأ في حذف الإعلان' });
  }
});

router.get('/admin/promotions', authenticateToken, isAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM promotions ORDER BY created_at DESC');
    res.json({ success: true, promotions: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'خطأ في جلب العروض' });
  }
});

router.post('/admin/promotions', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { code, type, value, min_amount, max_discount, usage_limit, user_limit, start_date, end_date } = req.body;

    const result = await pool.query(
      `INSERT INTO promotions (code, type, value, min_amount, max_discount, usage_limit, user_limit, start_date, end_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [code.toUpperCase(), type || 'percentage', value, min_amount || 0, max_discount, usage_limit, user_limit || 1, start_date, end_date]
    );

    res.json({ success: true, promotion: result.rows[0] });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ success: false, message: 'كود الخصم موجود مسبقاً' });
    }
    console.error('Promotion creation error:', error);
    res.status(500).json({ success: false, message: 'خطأ في إنشاء العرض' });
  }
});

router.put('/admin/promotions/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { code, type, value, min_amount, max_discount, usage_limit, user_limit, is_active, start_date, end_date } = req.body;

    const result = await pool.query(
      `UPDATE promotions SET 
        code = COALESCE($1, code),
        type = COALESCE($2, type),
        value = COALESCE($3, value),
        min_amount = COALESCE($4, min_amount),
        max_discount = $5,
        usage_limit = $6,
        user_limit = COALESCE($7, user_limit),
        is_active = COALESCE($8, is_active),
        start_date = $9,
        end_date = $10,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $11 RETURNING *`,
      [code?.toUpperCase(), type, value, min_amount, max_discount, usage_limit, user_limit, is_active, start_date, end_date, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'العرض غير موجود' });
    }

    res.json({ success: true, promotion: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'خطأ في تحديث العرض' });
  }
});

router.delete('/admin/promotions/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM promotions WHERE id = $1', [id]);
    res.json({ success: true, message: 'تم حذف العرض' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'خطأ في حذف العرض' });
  }
});

// ==================== AD CAMPAIGNS SYSTEM ====================

// Initialize ad campaigns tables
const initAdCampaignsTables = async () => {
  try {
    // Ad Accounts - Connected social media accounts
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ad_accounts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        platform VARCHAR(50) NOT NULL,
        account_id VARCHAR(255),
        account_name VARCHAR(255),
        access_token TEXT,
        refresh_token TEXT,
        token_expires_at TIMESTAMP,
        ad_account_id VARCHAR(255),
        currency VARCHAR(10) DEFAULT 'SAR',
        timezone VARCHAR(50) DEFAULT 'Asia/Riyadh',
        is_active BOOLEAN DEFAULT true,
        status VARCHAR(50) DEFAULT 'connected',
        last_sync_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Ad Campaigns
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ad_campaigns (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        ad_account_id UUID REFERENCES ad_accounts(id) ON DELETE SET NULL,
        product_id UUID REFERENCES products(id) ON DELETE SET NULL,
        platform VARCHAR(50) NOT NULL,
        external_campaign_id VARCHAR(255),
        name VARCHAR(255) NOT NULL,
        objective VARCHAR(100) DEFAULT 'CONVERSIONS',
        status VARCHAR(50) DEFAULT 'draft',
        budget_type VARCHAR(50) DEFAULT 'daily',
        budget_amount DECIMAL(15, 2) DEFAULT 0,
        spent_amount DECIMAL(15, 2) DEFAULT 0,
        start_date TIMESTAMP,
        end_date TIMESTAMP,
        target_audience JSONB,
        creative_data JSONB,
        metrics JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Ad Campaign Analytics
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ad_analytics (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        campaign_id UUID REFERENCES ad_campaigns(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        impressions INTEGER DEFAULT 0,
        clicks INTEGER DEFAULT 0,
        reach INTEGER DEFAULT 0,
        conversions INTEGER DEFAULT 0,
        spend DECIMAL(15, 2) DEFAULT 0,
        cpm DECIMAL(10, 4) DEFAULT 0,
        cpc DECIMAL(10, 4) DEFAULT 0,
        ctr DECIMAL(10, 4) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(campaign_id, date)
      )
    `);

    // Marketing Wallet for Ad Spending
    await pool.query(`
      CREATE TABLE IF NOT EXISTS marketing_wallets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
        balance DECIMAL(15, 2) DEFAULT 0,
        total_spent DECIMAL(15, 2) DEFAULT 0,
        currency VARCHAR(10) DEFAULT 'SAR',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Marketing Transactions
    await pool.query(`
      CREATE TABLE IF NOT EXISTS marketing_transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        wallet_id UUID REFERENCES marketing_wallets(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        campaign_id UUID REFERENCES ad_campaigns(id) ON DELETE SET NULL,
        type VARCHAR(50) NOT NULL,
        amount DECIMAL(15, 2) NOT NULL,
        balance_before DECIMAL(15, 2),
        balance_after DECIMAL(15, 2),
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('Ad campaigns tables initialized');
  } catch (error) {
    console.error('Ad campaigns tables init error:', error);
  }
};

initAdCampaignsTables();

// Get user's marketing wallet
router.get('/wallet', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    let wallet = await pool.query(
      'SELECT * FROM marketing_wallets WHERE user_id = $1',
      [userId]
    );

    if (wallet.rows.length === 0) {
      wallet = await pool.query(
        'INSERT INTO marketing_wallets (user_id) VALUES ($1) RETURNING *',
        [userId]
      );
    }

    const transactions = await pool.query(
      `SELECT mt.*, ac.name as campaign_name 
       FROM marketing_transactions mt
       LEFT JOIN ad_campaigns ac ON mt.campaign_id = ac.id
       WHERE mt.user_id = $1
       ORDER BY mt.created_at DESC
       LIMIT 20`,
      [userId]
    );

    res.json({
      success: true,
      wallet: wallet.rows[0],
      transactions: transactions.rows
    });
  } catch (error) {
    console.error('Marketing wallet error:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب محفظة التسويق' });
  }
});

// Top up marketing wallet from main wallet
router.post('/wallet/topup', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'المبلغ غير صالح' });
    }

    // Check main wallet balance
    const mainWallet = await pool.query(
      'SELECT * FROM wallets WHERE user_id = $1',
      [userId]
    );

    if (mainWallet.rows.length === 0 || parseFloat(mainWallet.rows[0].balance) < amount) {
      return res.status(400).json({ success: false, message: 'رصيد غير كافي في المحفظة الرئيسية' });
    }

    // Get or create marketing wallet
    let marketingWallet = await pool.query(
      'SELECT * FROM marketing_wallets WHERE user_id = $1',
      [userId]
    );

    if (marketingWallet.rows.length === 0) {
      marketingWallet = await pool.query(
        'INSERT INTO marketing_wallets (user_id) VALUES ($1) RETURNING *',
        [userId]
      );
    }

    const mWallet = marketingWallet.rows[0];
    const balanceBefore = parseFloat(mWallet.balance);
    const balanceAfter = balanceBefore + parseFloat(amount);

    // Deduct from main wallet
    await pool.query(
      'UPDATE wallets SET balance = balance - $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2',
      [amount, userId]
    );

    // Add to marketing wallet
    await pool.query(
      'UPDATE marketing_wallets SET balance = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2',
      [balanceAfter, userId]
    );

    // Record transaction
    await pool.query(
      `INSERT INTO marketing_transactions (wallet_id, user_id, type, amount, balance_before, balance_after, description)
       VALUES ($1, $2, 'topup', $3, $4, $5, 'تحويل من المحفظة الرئيسية')`,
      [mWallet.id, userId, amount, balanceBefore, balanceAfter]
    );

    // Record in main transactions
    await pool.query(
      `INSERT INTO transactions (wallet_id, user_id, type, amount, description)
       VALUES ($1, $2, 'marketing_transfer', $3, 'تحويل لمحفظة التسويق')`,
      [mainWallet.rows[0].id, userId, -amount]
    );

    res.json({
      success: true,
      message: 'تم شحن محفظة التسويق بنجاح',
      balance: balanceAfter
    });
  } catch (error) {
    console.error('Marketing wallet topup error:', error);
    res.status(500).json({ success: false, message: 'خطأ في شحن المحفظة' });
  }
});

// Get connected ad accounts
router.get('/accounts', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const accounts = await pool.query(
      `SELECT id, platform, account_id, account_name, ad_account_id, currency, 
              timezone, is_active, status, last_sync_at, created_at
       FROM ad_accounts WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    res.json({ success: true, accounts: accounts.rows });
  } catch (error) {
    console.error('Ad accounts error:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب الحسابات' });
  }
});

// Connect ad account
router.post('/accounts/connect', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { platform, access_token, ad_account_id, account_name, account_id } = req.body;

    if (!platform) {
      return res.status(400).json({ success: false, message: 'المنصة مطلوبة' });
    }

    let accountInfo = { 
      account_name: account_name || `حساب ${platform}`, 
      ad_account_id: ad_account_id || account_id,
      account_id: account_id,
      currency: 'SAR'
    };

    let apiVerified = false;
    let apiError = null;

    // If Meta platform with access token, verify with API
    if (platform === 'meta' && access_token) {
      try {
        const bizSdk = require('facebook-nodejs-business-sdk');
        const api = bizSdk.FacebookAdsApi.init(access_token);
        
        const User = bizSdk.User;
        const me = await new User('me').read(['id', 'name']);
        accountInfo.account_id = me.id;
        accountInfo.account_name = me.name || account_name;
        apiVerified = true;

        if (ad_account_id) {
          const AdAccount = bizSdk.AdAccount;
          const adAccount = await new AdAccount(`act_${ad_account_id}`).read(['name', 'currency', 'timezone_name']);
          accountInfo.account_name = adAccount.name || accountInfo.account_name;
          accountInfo.currency = adAccount.currency || 'SAR';
        }
      } catch (fbError) {
        console.error('Meta API error:', fbError);
        apiError = fbError.message || 'خطأ في التحقق من الرمز';
      }
    }

    // Check if account already exists
    const existing = await pool.query(
      'SELECT id FROM ad_accounts WHERE user_id = $1 AND platform = $2 AND (ad_account_id = $3 OR account_id = $3)',
      [userId, platform, accountInfo.ad_account_id || accountInfo.account_id]
    );

    const accountStatus = apiVerified ? 'verified' : (access_token ? 'unverified' : 'manual');

    if (existing.rows.length > 0) {
      await pool.query(
        `UPDATE ad_accounts SET 
          access_token = $1, account_name = $2, is_active = true, 
          status = $3, updated_at = CURRENT_TIMESTAMP
         WHERE id = $4`,
        [access_token, accountInfo.account_name, accountStatus, existing.rows[0].id]
      );
    } else {
      await pool.query(
        `INSERT INTO ad_accounts (user_id, platform, account_id, account_name, access_token, ad_account_id, currency, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [userId, platform, accountInfo.account_id, accountInfo.account_name, access_token || null, accountInfo.ad_account_id, accountInfo.currency, accountStatus]
      );
    }

    let message = 'تم ربط الحساب بنجاح';
    if (apiVerified) {
      message = 'تم ربط الحساب والتحقق منه بنجاح';
    } else if (apiError) {
      message = `تم حفظ الحساب ولكن التحقق فشل: ${apiError}`;
    } else if (!access_token) {
      message = 'تم حفظ الحساب. أضف رمز الوصول للاتصال الكامل.';
    }

    res.json({ success: true, message, verified: apiVerified });
  } catch (error) {
    console.error('Connect ad account error:', error);
    res.status(500).json({ success: false, message: 'خطأ في ربط الحساب' });
  }
});

// Fetch Meta ad accounts for user
router.get('/meta/ad-accounts', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { access_token } = req.query;

    if (!access_token) {
      return res.status(400).json({ success: false, message: 'رمز الوصول مطلوب' });
    }

    try {
      const bizSdk = require('facebook-nodejs-business-sdk');
      const api = bizSdk.FacebookAdsApi.init(access_token);
      
      const User = bizSdk.User;
      const me = new User('me');
      const adAccounts = await me.getAdAccounts(['id', 'name', 'currency', 'account_status', 'amount_spent']);
      
      const accounts = adAccounts.map(acc => ({
        id: acc.id.replace('act_', ''),
        name: acc.name,
        currency: acc.currency,
        status: acc.account_status === 1 ? 'active' : 'inactive',
        amount_spent: acc.amount_spent
      }));

      res.json({ success: true, accounts });
    } catch (fbError) {
      console.error('Meta API error:', fbError);
      res.status(400).json({ success: false, message: 'خطأ في الاتصال بـ Meta API' });
    }
  } catch (error) {
    console.error('Fetch Meta accounts error:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب الحسابات' });
  }
});

// Sync campaign analytics from Meta
router.post('/campaigns/:id/sync-analytics', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const campaign = await pool.query(
      `SELECT c.*, a.access_token, a.ad_account_id as external_ad_account
       FROM ad_campaigns c
       LEFT JOIN ad_accounts a ON c.ad_account_id = a.id
       WHERE c.id = $1 AND c.user_id = $2`,
      [id, userId]
    );

    if (campaign.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'الحملة غير موجودة' });
    }

    const camp = campaign.rows[0];

    if (camp.platform === 'meta' && camp.access_token && camp.external_campaign_id) {
      try {
        const bizSdk = require('facebook-nodejs-business-sdk');
        const api = bizSdk.FacebookAdsApi.init(camp.access_token);
        
        const Campaign = bizSdk.Campaign;
        const fbCampaign = new Campaign(camp.external_campaign_id);
        
        const insights = await fbCampaign.getInsights(
          ['impressions', 'clicks', 'reach', 'spend', 'cpm', 'cpc', 'ctr', 'conversions'],
          { date_preset: 'last_7d', time_increment: 1 }
        );

        for (const insight of insights) {
          await pool.query(
            `INSERT INTO ad_analytics (campaign_id, date, impressions, clicks, reach, spend, cpm, cpc, ctr)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             ON CONFLICT (campaign_id, date) DO UPDATE SET
               impressions = EXCLUDED.impressions,
               clicks = EXCLUDED.clicks,
               reach = EXCLUDED.reach,
               spend = EXCLUDED.spend,
               cpm = EXCLUDED.cpm,
               cpc = EXCLUDED.cpc,
               ctr = EXCLUDED.ctr`,
            [id, insight.date_start, insight.impressions || 0, insight.clicks || 0, 
             insight.reach || 0, insight.spend || 0, insight.cpm || 0, insight.cpc || 0, insight.ctr || 0]
          );
        }

        // Update campaign spent amount
        const totalSpent = insights.reduce((sum, i) => sum + parseFloat(i.spend || 0), 0);
        await pool.query(
          'UPDATE ad_campaigns SET spent_amount = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          [totalSpent, id]
        );

        res.json({ success: true, message: 'تم مزامنة التحليلات بنجاح' });
      } catch (fbError) {
        console.error('Meta insights error:', fbError);
        res.status(400).json({ success: false, message: 'خطأ في جلب التحليلات من Meta' });
      }
    } else {
      // Generate demo analytics for simulation mode
      const today = new Date();
      for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const impressions = Math.floor(Math.random() * 5000) + 1000;
        const clicks = Math.floor(impressions * (Math.random() * 0.05 + 0.01));
        const spend = (Math.random() * 50 + 10).toFixed(2);
        
        await pool.query(
          `INSERT INTO ad_analytics (campaign_id, date, impressions, clicks, reach, spend, cpm, cpc, ctr)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT (campaign_id, date) DO UPDATE SET
             impressions = EXCLUDED.impressions,
             clicks = EXCLUDED.clicks,
             reach = EXCLUDED.reach,
             spend = EXCLUDED.spend`,
          [id, dateStr, impressions, clicks, Math.floor(impressions * 0.8), spend,
           (parseFloat(spend) / impressions * 1000).toFixed(2),
           clicks > 0 ? (parseFloat(spend) / clicks).toFixed(2) : 0,
           ((clicks / impressions) * 100).toFixed(2)]
        );
      }
      res.json({ success: true, message: 'تم إنشاء تحليلات تجريبية' });
    }
  } catch (error) {
    console.error('Sync analytics error:', error);
    res.status(500).json({ success: false, message: 'خطأ في مزامنة التحليلات' });
  }
});

// Create full Meta campaign with ad set and ad
router.post('/meta/create-full-campaign', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { 
      account_id, name, objective, daily_budget, 
      target_countries, target_age_min, target_age_max, target_genders,
      ad_headline, ad_text, ad_link, ad_image_url
    } = req.body;

    // Get ad account with access token
    const account = await pool.query(
      'SELECT * FROM ad_accounts WHERE id = $1 AND user_id = $2',
      [account_id, userId]
    );

    if (account.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'الحساب الإعلاني غير موجود' });
    }

    const acc = account.rows[0];

    if (!acc.access_token) {
      return res.status(400).json({ success: false, message: 'رمز الوصول غير متوفر للحساب' });
    }

    try {
      const bizSdk = require('facebook-nodejs-business-sdk');
      const api = bizSdk.FacebookAdsApi.init(acc.access_token);
      
      const AdAccount = bizSdk.AdAccount;
      const adAccount = new AdAccount(`act_${acc.ad_account_id}`);

      // 1. Create Campaign
      const campaign = await adAccount.createCampaign([], {
        name: name,
        objective: objective || 'OUTCOME_TRAFFIC',
        status: 'PAUSED',
        special_ad_categories: []
      });

      // 2. Create Ad Set
      const targeting = {
        geo_locations: { countries: target_countries || ['SA'] },
        age_min: target_age_min || 18,
        age_max: target_age_max || 65
      };

      if (target_genders && target_genders !== 'all') {
        targeting.genders = target_genders === 'male' ? [1] : [2];
      }

      const adSet = await adAccount.createAdSet([], {
        name: `${name} - مجموعة إعلانية`,
        campaign_id: campaign.id,
        daily_budget: (parseFloat(daily_budget) * 100).toString(), // Convert to cents
        billing_event: 'IMPRESSIONS',
        optimization_goal: 'LINK_CLICKS',
        targeting: targeting,
        status: 'PAUSED'
      });

      // Save to database
      const result = await pool.query(
        `INSERT INTO ad_campaigns 
          (user_id, ad_account_id, platform, external_campaign_id, name, objective, 
           budget_type, budget_amount, status, target_audience, creative_data)
         VALUES ($1, $2, 'meta', $3, $4, $5, 'daily', $6, 'paused', $7, $8)
         RETURNING *`,
        [userId, account_id, campaign.id, name, objective || 'OUTCOME_TRAFFIC',
         daily_budget, JSON.stringify(targeting), JSON.stringify({ headline: ad_headline, text: ad_text, link: ad_link })]
      );

      res.json({ 
        success: true, 
        message: 'تم إنشاء الحملة بنجاح على Meta',
        campaign: result.rows[0],
        meta_campaign_id: campaign.id,
        meta_adset_id: adSet.id
      });

    } catch (fbError) {
      console.error('Meta campaign creation error:', fbError);
      res.status(400).json({ 
        success: false, 
        message: 'خطأ في إنشاء الحملة على Meta: ' + (fbError.message || 'خطأ غير معروف')
      });
    }
  } catch (error) {
    console.error('Create full campaign error:', error);
    res.status(500).json({ success: false, message: 'خطأ في إنشاء الحملة' });
  }
});

// Disconnect ad account
router.delete('/accounts/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    await pool.query(
      'DELETE FROM ad_accounts WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    res.json({ success: true, message: 'تم إلغاء ربط الحساب' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'خطأ في إلغاء الربط' });
  }
});

// Get user's ad campaigns
router.get('/campaigns', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, platform } = req.query;

    let query = `
      SELECT c.*, p.name as product_name, p.image_url as product_image, 
             a.account_name, a.platform as account_platform, a.status as account_status,
             a.access_token IS NOT NULL as has_access_token
      FROM ad_campaigns c
      LEFT JOIN products p ON c.product_id = p.id
      LEFT JOIN ad_accounts a ON c.ad_account_id = a.id
      WHERE c.user_id = $1
    `;
    const params = [userId];
    let paramIndex = 2;

    if (status) {
      query += ` AND c.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (platform) {
      query += ` AND c.platform = $${paramIndex}`;
      params.push(platform);
    }

    query += ' ORDER BY c.created_at DESC';

    const campaigns = await pool.query(query, params);

    res.json({ success: true, campaigns: campaigns.rows });
  } catch (error) {
    console.error('Campaigns error:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب الحملات' });
  }
});

// Create ad campaign
router.post('/campaigns', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      name, platform, ad_account_id, product_id, objective,
      budget_type, budget_amount, start_date, end_date,
      target_audience, creative_data
    } = req.body;

    if (!name || !platform) {
      return res.status(400).json({ success: false, message: 'اسم الحملة والمنصة مطلوبان' });
    }

    let targetAudienceData = {};
    let creativeDataData = {};
    
    try {
      targetAudienceData = typeof target_audience === 'string' 
        ? JSON.parse(target_audience) 
        : (target_audience || {});
    } catch (e) {
      targetAudienceData = {};
    }
    
    try {
      creativeDataData = typeof creative_data === 'string' 
        ? JSON.parse(creative_data) 
        : (creative_data || {});
    } catch (e) {
      creativeDataData = {};
    }

    const result = await pool.query(
      `INSERT INTO ad_campaigns 
        (user_id, ad_account_id, product_id, platform, name, objective, 
         budget_type, budget_amount, start_date, end_date, target_audience, creative_data)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [userId, ad_account_id, product_id, platform, name, objective || 'CONVERSIONS',
       budget_type || 'daily', budget_amount || 0, start_date, end_date,
       targetAudienceData, creativeDataData]
    );

    res.json({ success: true, campaign: result.rows[0], message: 'تم إنشاء الحملة بنجاح' });
  } catch (error) {
    console.error('Create campaign error:', error);
    res.status(500).json({ success: false, message: 'خطأ في إنشاء الحملة' });
  }
});

// Update campaign
router.put('/campaigns/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const updates = req.body;

    // Check ownership
    const existing = await pool.query(
      'SELECT * FROM ad_campaigns WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'الحملة غير موجودة' });
    }

    const allowedFields = ['name', 'status', 'budget_amount', 'start_date', 'end_date', 'target_audience', 'creative_data'];
    const setClause = [];
    const values = [];
    let paramIndex = 1;

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        if (field === 'target_audience' || field === 'creative_data') {
          setClause.push(`${field} = $${paramIndex}`);
          let fieldValue = {};
          try {
            fieldValue = typeof updates[field] === 'string' 
              ? JSON.parse(updates[field]) 
              : updates[field];
          } catch (e) {
            fieldValue = {};
          }
          values.push(fieldValue);
        } else {
          setClause.push(`${field} = $${paramIndex}`);
          values.push(updates[field]);
        }
        paramIndex++;
      }
    }

    if (setClause.length === 0) {
      return res.status(400).json({ success: false, message: 'لا توجد تحديثات' });
    }

    setClause.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const result = await pool.query(
      `UPDATE ad_campaigns SET ${setClause.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    res.json({ success: true, campaign: result.rows[0], message: 'تم تحديث الحملة' });
  } catch (error) {
    console.error('Update campaign error:', error);
    res.status(500).json({ success: false, message: 'خطأ في تحديث الحملة' });
  }
});

// Launch campaign to platform
router.post('/campaigns/:id/launch', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const campaign = await pool.query(
      `SELECT c.*, a.access_token, a.ad_account_id as external_ad_account
       FROM ad_campaigns c
       LEFT JOIN ad_accounts a ON c.ad_account_id = a.id
       WHERE c.id = $1 AND c.user_id = $2`,
      [id, userId]
    );

    if (campaign.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'الحملة غير موجودة' });
    }

    const camp = campaign.rows[0];

    // Check marketing wallet balance
    const wallet = await pool.query(
      'SELECT * FROM marketing_wallets WHERE user_id = $1',
      [userId]
    );

    if (wallet.rows.length === 0 || parseFloat(wallet.rows[0].balance) < parseFloat(camp.budget_amount)) {
      return res.status(400).json({ success: false, message: 'رصيد التسويق غير كافي' });
    }

    // For Meta platform
    if (camp.platform === 'meta' && camp.access_token) {
      try {
        const bizSdk = require('facebook-nodejs-business-sdk');
        const api = bizSdk.FacebookAdsApi.init(camp.access_token);
        
        const AdAccount = bizSdk.AdAccount;
        const Campaign = bizSdk.Campaign;
        
        const adAccount = new AdAccount(`act_${camp.external_ad_account}`);
        
        // Create campaign on Meta
        const fbCampaign = await adAccount.createCampaign(
          [],
          {
            name: camp.name,
            objective: camp.objective || 'OUTCOME_TRAFFIC',
            status: 'PAUSED',
            special_ad_categories: []
          }
        );

        // Update local campaign with external ID
        await pool.query(
          `UPDATE ad_campaigns SET 
            external_campaign_id = $1, status = 'active', updated_at = CURRENT_TIMESTAMP
           WHERE id = $2`,
          [fbCampaign.id, id]
        );

        res.json({ 
          success: true, 
          message: 'تم إطلاق الحملة على Meta بنجاح',
          external_id: fbCampaign.id
        });
      } catch (fbError) {
        console.error('Meta campaign launch error:', fbError);
        return res.status(400).json({ success: false, message: 'خطأ في إطلاق الحملة على Meta: ' + fbError.message });
      }
    } else {
      // For demo/simulation mode
      await pool.query(
        `UPDATE ad_campaigns SET status = 'active', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [id]
      );
      
      res.json({ success: true, message: 'تم تفعيل الحملة (وضع المحاكاة)' });
    }
  } catch (error) {
    console.error('Launch campaign error:', error);
    res.status(500).json({ success: false, message: 'خطأ في إطلاق الحملة' });
  }
});

// Pause/Stop campaign
router.post('/campaigns/:id/pause', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    await pool.query(
      `UPDATE ad_campaigns SET status = 'paused', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );

    res.json({ success: true, message: 'تم إيقاف الحملة' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'خطأ في إيقاف الحملة' });
  }
});

// Delete campaign
router.delete('/campaigns/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    await pool.query(
      'DELETE FROM ad_campaigns WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    res.json({ success: true, message: 'تم حذف الحملة' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'خطأ في حذف الحملة' });
  }
});

// Get campaign analytics
router.get('/campaigns/:id/analytics', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { days = 7 } = req.query;

    const campaign = await pool.query(
      'SELECT * FROM ad_campaigns WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (campaign.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'الحملة غير موجودة' });
    }

    const analytics = await pool.query(
      `SELECT * FROM ad_analytics 
       WHERE campaign_id = $1 AND date >= CURRENT_DATE - INTERVAL '${parseInt(days)} days'
       ORDER BY date ASC`,
      [id]
    );

    // Calculate totals
    const totals = {
      impressions: 0,
      clicks: 0,
      reach: 0,
      conversions: 0,
      spend: 0
    };

    analytics.rows.forEach(row => {
      totals.impressions += parseInt(row.impressions);
      totals.clicks += parseInt(row.clicks);
      totals.reach += parseInt(row.reach);
      totals.conversions += parseInt(row.conversions);
      totals.spend += parseFloat(row.spend);
    });

    totals.ctr = totals.impressions > 0 ? ((totals.clicks / totals.impressions) * 100).toFixed(2) : 0;
    totals.cpc = totals.clicks > 0 ? (totals.spend / totals.clicks).toFixed(2) : 0;

    res.json({
      success: true,
      campaign: campaign.rows[0],
      analytics: analytics.rows,
      totals
    });
  } catch (error) {
    console.error('Campaign analytics error:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب التحليلات' });
  }
});

// Get marketing dashboard stats
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const [wallet, accounts, campaigns, recentCampaigns] = await Promise.all([
      pool.query('SELECT * FROM marketing_wallets WHERE user_id = $1', [userId]),
      pool.query('SELECT COUNT(*) FROM ad_accounts WHERE user_id = $1 AND is_active = true', [userId]),
      pool.query(`
        SELECT status, COUNT(*) as count, SUM(spent_amount) as total_spent
        FROM ad_campaigns WHERE user_id = $1
        GROUP BY status
      `, [userId]),
      pool.query(`
        SELECT c.*, p.name as product_name 
        FROM ad_campaigns c
        LEFT JOIN products p ON c.product_id = p.id
        WHERE c.user_id = $1
        ORDER BY c.created_at DESC LIMIT 5
      `, [userId])
    ]);

    const stats = {
      wallet_balance: wallet.rows[0]?.balance || 0,
      connected_accounts: parseInt(accounts.rows[0].count),
      active_campaigns: 0,
      total_campaigns: 0,
      total_spent: 0
    };

    campaigns.rows.forEach(row => {
      stats.total_campaigns += parseInt(row.count);
      if (row.status === 'active') {
        stats.active_campaigns = parseInt(row.count);
      }
      stats.total_spent += parseFloat(row.total_spent || 0);
    });

    res.json({
      success: true,
      stats,
      recent_campaigns: recentCampaigns.rows
    });
  } catch (error) {
    console.error('Marketing dashboard error:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب البيانات' });
  }
});

// Get available products for advertising
router.get('/products', authenticateToken, async (req, res) => {
  try {
    const products = await pool.query(
      `SELECT id, name, name_ar, description, image_url, selling_price 
       FROM products WHERE is_active = true
       ORDER BY name ASC`
    );

    res.json({ success: true, products: products.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'خطأ في جلب المنتجات' });
  }
});

module.exports = router;
