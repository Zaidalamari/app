const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const initCurrencyTables = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS currencies (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      code VARCHAR(10) UNIQUE NOT NULL,
      name VARCHAR(100) NOT NULL,
      name_ar VARCHAR(100) NOT NULL,
      symbol VARCHAR(10) NOT NULL,
      exchange_rate DECIMAL(15, 6) DEFAULT 1,
      is_active BOOLEAN DEFAULT true,
      is_default BOOLEAN DEFAULT false,
      decimal_places INTEGER DEFAULT 2,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS countries (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      code VARCHAR(5) UNIQUE NOT NULL,
      name VARCHAR(100) NOT NULL,
      name_ar VARCHAR(100) NOT NULL,
      currency_id UUID REFERENCES currencies(id) ON DELETE SET NULL,
      flag VARCHAR(10),
      phone_code VARCHAR(10),
      is_active BOOLEAN DEFAULT true,
      display_order INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS product_prices (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      product_id UUID REFERENCES products(id) ON DELETE CASCADE,
      country_id UUID REFERENCES countries(id) ON DELETE CASCADE,
      selling_price DECIMAL(15, 2) NOT NULL,
      distributor_price DECIMAL(15, 2),
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(product_id, country_id)
    )
  `);

  await pool.query(`
    DO $$ 
    BEGIN 
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='country_id') THEN
        ALTER TABLE users ADD COLUMN country_id UUID REFERENCES countries(id);
      END IF;
    END $$;
  `);

  const currenciesExist = await pool.query('SELECT id FROM currencies LIMIT 1');
  if (currenciesExist.rows.length === 0) {
    const currencies = [
      { code: 'SAR', name: 'Saudi Riyal', name_ar: 'ريال سعودي', symbol: 'ر.س', rate: 1, is_default: true },
      { code: 'AED', name: 'UAE Dirham', name_ar: 'درهم إماراتي', symbol: 'د.إ', rate: 0.98 },
      { code: 'KWD', name: 'Kuwaiti Dinar', name_ar: 'دينار كويتي', symbol: 'د.ك', rate: 0.082 },
      { code: 'BHD', name: 'Bahraini Dinar', name_ar: 'دينار بحريني', symbol: 'د.ب', rate: 0.1 },
      { code: 'QAR', name: 'Qatari Riyal', name_ar: 'ريال قطري', symbol: 'ر.ق', rate: 0.97 },
      { code: 'OMR', name: 'Omani Rial', name_ar: 'ريال عماني', symbol: 'ر.ع', rate: 0.103 },
      { code: 'EGP', name: 'Egyptian Pound', name_ar: 'جنيه مصري', symbol: 'ج.م', rate: 13.2 },
      { code: 'USD', name: 'US Dollar', name_ar: 'دولار أمريكي', symbol: '$', rate: 0.267 },
      { code: 'EUR', name: 'Euro', name_ar: 'يورو', symbol: '€', rate: 0.246 }
    ];

    for (const curr of currencies) {
      await pool.query(`
        INSERT INTO currencies (code, name, name_ar, symbol, exchange_rate, is_default) 
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (code) DO NOTHING
      `, [curr.code, curr.name, curr.name_ar, curr.symbol, curr.rate, curr.is_default || false]);
    }
  }

  const countriesExist = await pool.query('SELECT id FROM countries LIMIT 1');
  if (countriesExist.rows.length === 0) {
    const currencyMap = {};
    const currResult = await pool.query('SELECT id, code FROM currencies');
    currResult.rows.forEach(c => currencyMap[c.code] = c.id);

    const countries = [
      { code: 'SA', name: 'Saudi Arabia', name_ar: 'السعودية', currency: 'SAR', flag: '🇸🇦', phone: '+966', order: 1 },
      { code: 'AE', name: 'United Arab Emirates', name_ar: 'الإمارات', currency: 'AED', flag: '🇦🇪', phone: '+971', order: 2 },
      { code: 'KW', name: 'Kuwait', name_ar: 'الكويت', currency: 'KWD', flag: '🇰🇼', phone: '+965', order: 3 },
      { code: 'BH', name: 'Bahrain', name_ar: 'البحرين', currency: 'BHD', flag: '🇧🇭', phone: '+973', order: 4 },
      { code: 'QA', name: 'Qatar', name_ar: 'قطر', currency: 'QAR', flag: '🇶🇦', phone: '+974', order: 5 },
      { code: 'OM', name: 'Oman', name_ar: 'عمان', currency: 'OMR', flag: '🇴🇲', phone: '+968', order: 6 },
      { code: 'EG', name: 'Egypt', name_ar: 'مصر', currency: 'EGP', flag: '🇪🇬', phone: '+20', order: 7 }
    ];

    for (const country of countries) {
      await pool.query(`
        INSERT INTO countries (code, name, name_ar, currency_id, flag, phone_code, display_order) 
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (code) DO NOTHING
      `, [country.code, country.name, country.name_ar, currencyMap[country.currency], country.flag, country.phone, country.order]);
    }
  }
};

initCurrencyTables();

router.get('/currencies', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, code, name, name_ar, symbol, exchange_rate, decimal_places
      FROM currencies 
      WHERE is_active = true 
      ORDER BY is_default DESC, name_ar
    `);
    res.json({ success: true, currencies: result.rows });
  } catch (error) {
    console.error('Get currencies error:', error);
    res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

router.get('/currencies/all', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'غير مصرح' });
    }
    const result = await pool.query('SELECT * FROM currencies ORDER BY is_default DESC, name_ar');
    res.json({ success: true, currencies: result.rows });
  } catch (error) {
    console.error('Get all currencies error:', error);
    res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

router.post('/currencies', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'غير مصرح' });
    }

    const { code, name, name_ar, symbol, exchange_rate, is_active } = req.body;

    if (!code || !name || !name_ar || !symbol) {
      return res.status(400).json({ success: false, message: 'جميع الحقول مطلوبة' });
    }

    const result = await pool.query(`
      INSERT INTO currencies (code, name, name_ar, symbol, exchange_rate, is_active)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [code.toUpperCase(), name, name_ar, symbol, exchange_rate || 1, is_active !== false]);

    res.json({ success: true, message: 'تمت إضافة العملة', currency: result.rows[0] });
  } catch (error) {
    console.error('Add currency error:', error);
    if (error.code === '23505') {
      return res.status(400).json({ success: false, message: 'كود العملة موجود مسبقاً' });
    }
    res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

router.put('/currencies/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'غير مصرح' });
    }

    const { name, name_ar, symbol, exchange_rate, is_active, is_default } = req.body;

    if (is_default) {
      await pool.query('UPDATE currencies SET is_default = false WHERE is_default = true');
    }

    const result = await pool.query(`
      UPDATE currencies SET 
        name = COALESCE($1, name),
        name_ar = COALESCE($2, name_ar),
        symbol = COALESCE($3, symbol),
        exchange_rate = COALESCE($4, exchange_rate),
        is_active = COALESCE($5, is_active),
        is_default = COALESCE($6, is_default),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING *
    `, [name, name_ar, symbol, exchange_rate, is_active, is_default, req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'العملة غير موجودة' });
    }

    res.json({ success: true, message: 'تم تحديث العملة', currency: result.rows[0] });
  } catch (error) {
    console.error('Update currency error:', error);
    res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

router.delete('/currencies/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'غير مصرح' });
    }

    const checkDefault = await pool.query('SELECT is_default FROM currencies WHERE id = $1', [req.params.id]);
    if (checkDefault.rows[0]?.is_default) {
      return res.status(400).json({ success: false, message: 'لا يمكن حذف العملة الافتراضية' });
    }

    await pool.query('DELETE FROM currencies WHERE id = $1', [req.params.id]);
    res.json({ success: true, message: 'تم حذف العملة' });
  } catch (error) {
    console.error('Delete currency error:', error);
    res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

router.get('/countries', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.id, c.code, c.name, c.name_ar, c.flag, c.phone_code, c.display_order,
             cu.code as currency_code, cu.symbol as currency_symbol, cu.name_ar as currency_name_ar,
             cu.exchange_rate
      FROM countries c
      LEFT JOIN currencies cu ON c.currency_id = cu.id
      WHERE c.is_active = true 
      ORDER BY c.display_order, c.name_ar
    `);
    res.json({ success: true, countries: result.rows });
  } catch (error) {
    console.error('Get countries error:', error);
    res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

router.get('/countries/all', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'غير مصرح' });
    }
    const result = await pool.query(`
      SELECT c.*, cu.code as currency_code, cu.symbol as currency_symbol, cu.name_ar as currency_name_ar
      FROM countries c
      LEFT JOIN currencies cu ON c.currency_id = cu.id
      ORDER BY c.display_order, c.name_ar
    `);
    res.json({ success: true, countries: result.rows });
  } catch (error) {
    console.error('Get all countries error:', error);
    res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

router.post('/countries', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'غير مصرح' });
    }

    const { code, name, name_ar, currency_id, flag, phone_code, display_order, is_active } = req.body;

    if (!code || !name || !name_ar) {
      return res.status(400).json({ success: false, message: 'جميع الحقول مطلوبة' });
    }

    const result = await pool.query(`
      INSERT INTO countries (code, name, name_ar, currency_id, flag, phone_code, display_order, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [code.toUpperCase(), name, name_ar, currency_id || null, flag || '', phone_code || '', display_order || 0, is_active !== false]);

    res.json({ success: true, message: 'تمت إضافة الدولة', country: result.rows[0] });
  } catch (error) {
    console.error('Add country error:', error);
    if (error.code === '23505') {
      return res.status(400).json({ success: false, message: 'كود الدولة موجود مسبقاً' });
    }
    res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

router.put('/countries/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'غير مصرح' });
    }

    const { name, name_ar, currency_id, flag, phone_code, display_order, is_active } = req.body;

    const result = await pool.query(`
      UPDATE countries SET 
        name = COALESCE($1, name),
        name_ar = COALESCE($2, name_ar),
        currency_id = COALESCE($3, currency_id),
        flag = COALESCE($4, flag),
        phone_code = COALESCE($5, phone_code),
        display_order = COALESCE($6, display_order),
        is_active = COALESCE($7, is_active),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $8
      RETURNING *
    `, [name, name_ar, currency_id, flag, phone_code, display_order, is_active, req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'الدولة غير موجودة' });
    }

    res.json({ success: true, message: 'تم تحديث الدولة', country: result.rows[0] });
  } catch (error) {
    console.error('Update country error:', error);
    res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

router.delete('/countries/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'غير مصرح' });
    }

    await pool.query('DELETE FROM countries WHERE id = $1', [req.params.id]);
    res.json({ success: true, message: 'تم حذف الدولة' });
  } catch (error) {
    console.error('Delete country error:', error);
    res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

router.get('/product-prices/:productId', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT pp.*, c.name_ar as country_name, c.flag, cu.code as currency_code, cu.symbol as currency_symbol
      FROM product_prices pp
      JOIN countries c ON pp.country_id = c.id
      LEFT JOIN currencies cu ON c.currency_id = cu.id
      WHERE pp.product_id = $1 AND pp.is_active = true
    `, [req.params.productId]);

    res.json({ success: true, prices: result.rows });
  } catch (error) {
    console.error('Get product prices error:', error);
    res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

router.post('/product-prices', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'غير مصرح' });
    }

    const { product_id, country_id, selling_price, distributor_price } = req.body;

    if (!product_id || !country_id || !selling_price) {
      return res.status(400).json({ success: false, message: 'جميع الحقول مطلوبة' });
    }

    const result = await pool.query(`
      INSERT INTO product_prices (product_id, country_id, selling_price, distributor_price)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (product_id, country_id) 
      DO UPDATE SET 
        selling_price = $3, 
        distributor_price = $4,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `, [product_id, country_id, selling_price, distributor_price || null]);

    res.json({ success: true, message: 'تم تحديث السعر', price: result.rows[0] });
  } catch (error) {
    console.error('Set product price error:', error);
    res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

router.post('/product-prices/bulk', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'غير مصرح' });
    }

    const { product_id, prices } = req.body;

    if (!product_id || !prices || !Array.isArray(prices)) {
      return res.status(400).json({ success: false, message: 'بيانات غير صالحة' });
    }

    let updated = 0;
    for (const price of prices) {
      if (price.country_id && price.selling_price) {
        await pool.query(`
          INSERT INTO product_prices (product_id, country_id, selling_price, distributor_price)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (product_id, country_id) 
          DO UPDATE SET 
            selling_price = $3, 
            distributor_price = $4,
            updated_at = CURRENT_TIMESTAMP
        `, [product_id, price.country_id, price.selling_price, price.distributor_price || null]);
        updated++;
      }
    }

    res.json({ success: true, message: `تم تحديث ${updated} سعر` });
  } catch (error) {
    console.error('Bulk update prices error:', error);
    res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

router.delete('/product-prices/:productId/:countryId', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'غير مصرح' });
    }

    await pool.query(
      'DELETE FROM product_prices WHERE product_id = $1 AND country_id = $2',
      [req.params.productId, req.params.countryId]
    );

    res.json({ success: true, message: 'تم حذف السعر' });
  } catch (error) {
    console.error('Delete product price error:', error);
    res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

router.get('/products-by-country/:countryId', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*, c.name as category_name, c.name_ar as category_name_ar, c.icon as category_icon,
             pp.selling_price as local_price, pp.distributor_price as local_distributor_price,
             cu.symbol as currency_symbol, cu.code as currency_code
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      JOIN product_prices pp ON p.id = pp.product_id
      JOIN countries co ON pp.country_id = co.id
      LEFT JOIN currencies cu ON co.currency_id = cu.id
      WHERE pp.country_id = $1 AND pp.is_active = true AND p.is_active = true
      ORDER BY c.name_ar, p.name_ar
    `, [req.params.countryId]);

    res.json({ success: true, products: result.rows });
  } catch (error) {
    console.error('Get products by country error:', error);
    res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

router.get('/default', async (req, res) => {
  try {
    const currencyResult = await pool.query('SELECT * FROM currencies WHERE is_default = true LIMIT 1');
    const countryResult = await pool.query(`
      SELECT c.*, cu.code as currency_code, cu.symbol as currency_symbol
      FROM countries c
      LEFT JOIN currencies cu ON c.currency_id = cu.id
      WHERE cu.is_default = true
      LIMIT 1
    `);

    res.json({ 
      success: true, 
      currency: currencyResult.rows[0] || null,
      country: countryResult.rows[0] || null
    });
  } catch (error) {
    console.error('Get default currency error:', error);
    res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

module.exports = router;
