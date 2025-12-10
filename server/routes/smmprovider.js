const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const initSmmTables = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS smm_providers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      api_url VARCHAR(500) NOT NULL,
      api_key VARCHAR(500) NOT NULL,
      is_active BOOLEAN DEFAULT true,
      balance DECIMAL(15, 4) DEFAULT 0,
      currency VARCHAR(10) DEFAULT 'USD',
      last_sync TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS smm_services (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      provider_id UUID REFERENCES smm_providers(id) ON DELETE CASCADE,
      service_id VARCHAR(50) NOT NULL,
      name VARCHAR(500) NOT NULL,
      category VARCHAR(255),
      type VARCHAR(100),
      rate DECIMAL(15, 6) NOT NULL,
      min_quantity INTEGER DEFAULT 1,
      max_quantity INTEGER DEFAULT 10000,
      description TEXT,
      refill BOOLEAN DEFAULT false,
      cancel BOOLEAN DEFAULT false,
      is_active BOOLEAN DEFAULT true,
      is_imported BOOLEAN DEFAULT false,
      product_id UUID REFERENCES products(id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(provider_id, service_id)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS smm_orders (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      provider_id UUID REFERENCES smm_providers(id) ON DELETE SET NULL,
      service_id UUID REFERENCES smm_services(id) ON DELETE SET NULL,
      local_order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
      remote_order_id VARCHAR(100),
      link TEXT,
      quantity INTEGER,
      charge DECIMAL(15, 6),
      status VARCHAR(50) DEFAULT 'pending',
      start_count INTEGER,
      remains INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
};

initSmmTables();

async function callSmmApi(apiUrl, apiKey, params) {
  const https = require('https');
  const http = require('http');
  const url = require('url');

  return new Promise((resolve, reject) => {
    const parsedUrl = url.parse(apiUrl);
    const isHttps = parsedUrl.protocol === 'https:';
    const client = isHttps ? https : http;

    const postData = new URLSearchParams({
      key: apiKey,
      ...params
    }).toString();

    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (isHttps ? 443 : 80),
      path: parsedUrl.path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error('Invalid JSON response: ' + data.substring(0, 200)));
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    req.write(postData);
    req.end();
  });
}

router.get('/providers', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'غير مصرح' });
    }

    const result = await pool.query(`
      SELECT p.*, 
        (SELECT COUNT(*) FROM smm_services WHERE provider_id = p.id) as services_count,
        (SELECT COUNT(*) FROM smm_services WHERE provider_id = p.id AND is_imported = true) as imported_count
      FROM smm_providers p
      ORDER BY p.created_at DESC
    `);

    res.json({ success: true, providers: result.rows });
  } catch (error) {
    console.error('Get providers error:', error);
    res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

router.post('/providers', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'غير مصرح' });
    }

    const { name, api_url, api_key } = req.body;

    if (!name || !api_url || !api_key) {
      return res.status(400).json({ success: false, message: 'جميع الحقول مطلوبة' });
    }

    try {
      const balanceData = await callSmmApi(api_url, api_key, { action: 'balance' });
      
      if (balanceData.error) {
        return res.status(400).json({ success: false, message: 'خطأ في API: ' + balanceData.error });
      }

      const result = await pool.query(`
        INSERT INTO smm_providers (name, api_url, api_key, balance, currency)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [name, api_url, api_key, balanceData.balance || 0, balanceData.currency || 'USD']);

      res.json({ 
        success: true, 
        message: 'تم إضافة المزود بنجاح', 
        provider: result.rows[0],
        balance: balanceData.balance
      });
    } catch (apiError) {
      return res.status(400).json({ success: false, message: 'فشل الاتصال بـ API: ' + apiError.message });
    }
  } catch (error) {
    console.error('Add provider error:', error);
    res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

router.delete('/providers/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'غير مصرح' });
    }

    await pool.query('DELETE FROM smm_providers WHERE id = $1', [req.params.id]);
    res.json({ success: true, message: 'تم حذف المزود بنجاح' });
  } catch (error) {
    console.error('Delete provider error:', error);
    res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

router.post('/providers/:id/sync', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'غير مصرح' });
    }

    const providerResult = await pool.query('SELECT * FROM smm_providers WHERE id = $1', [req.params.id]);
    if (providerResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'المزود غير موجود' });
    }

    const provider = providerResult.rows[0];

    const [balanceData, servicesData] = await Promise.all([
      callSmmApi(provider.api_url, provider.api_key, { action: 'balance' }),
      callSmmApi(provider.api_url, provider.api_key, { action: 'services' })
    ]);

    if (balanceData.error) {
      return res.status(400).json({ success: false, message: 'خطأ في API: ' + balanceData.error });
    }

    await pool.query(`
      UPDATE smm_providers SET balance = $1, currency = $2, last_sync = CURRENT_TIMESTAMP
      WHERE id = $3
    `, [balanceData.balance || 0, balanceData.currency || 'USD', provider.id]);

    if (Array.isArray(servicesData)) {
      let addedCount = 0;
      let updatedCount = 0;

      for (const service of servicesData) {
        const existingService = await pool.query(
          'SELECT id FROM smm_services WHERE provider_id = $1 AND service_id = $2',
          [provider.id, String(service.service)]
        );

        if (existingService.rows.length > 0) {
          await pool.query(`
            UPDATE smm_services SET
              name = $1, category = $2, type = $3, rate = $4,
              min_quantity = $5, max_quantity = $6, description = $7,
              refill = $8, cancel = $9, updated_at = CURRENT_TIMESTAMP
            WHERE id = $10
          `, [
            service.name,
            service.category || null,
            service.type || 'Default',
            parseFloat(service.rate) || 0,
            parseInt(service.min) || 1,
            parseInt(service.max) || 10000,
            service.description || null,
            service.refill === true || service.refill === 'true',
            service.cancel === true || service.cancel === 'true',
            existingService.rows[0].id
          ]);
          updatedCount++;
        } else {
          await pool.query(`
            INSERT INTO smm_services (provider_id, service_id, name, category, type, rate, min_quantity, max_quantity, description, refill, cancel)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          `, [
            provider.id,
            String(service.service),
            service.name,
            service.category || null,
            service.type || 'Default',
            parseFloat(service.rate) || 0,
            parseInt(service.min) || 1,
            parseInt(service.max) || 10000,
            service.description || null,
            service.refill === true || service.refill === 'true',
            service.cancel === true || service.cancel === 'true'
          ]);
          addedCount++;
        }
      }

      res.json({
        success: true,
        message: `تم المزامنة بنجاح - تمت إضافة ${addedCount} خدمة وتحديث ${updatedCount} خدمة`,
        balance: balanceData.balance,
        total_services: servicesData.length,
        added: addedCount,
        updated: updatedCount
      });
    } else {
      res.json({
        success: true,
        message: 'تم تحديث الرصيد',
        balance: balanceData.balance
      });
    }
  } catch (error) {
    console.error('Sync provider error:', error);
    res.status(500).json({ success: false, message: 'خطأ في المزامنة: ' + error.message });
  }
});

router.get('/providers/:id/services', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'غير مصرح' });
    }

    const { category, search, imported } = req.query;
    let query = `
      SELECT s.*, p.name as product_name
      FROM smm_services s
      LEFT JOIN products p ON s.product_id = p.id
      WHERE s.provider_id = $1
    `;
    const params = [req.params.id];

    if (category) {
      params.push(category);
      query += ` AND s.category = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (s.name ILIKE $${params.length} OR s.service_id ILIKE $${params.length})`;
    }

    if (imported === 'true') {
      query += ` AND s.is_imported = true`;
    } else if (imported === 'false') {
      query += ` AND s.is_imported = false`;
    }

    query += ` ORDER BY s.category, s.name`;

    const result = await pool.query(query, params);

    const categoriesResult = await pool.query(`
      SELECT DISTINCT category FROM smm_services WHERE provider_id = $1 AND category IS NOT NULL ORDER BY category
    `, [req.params.id]);

    res.json({ 
      success: true, 
      services: result.rows,
      categories: categoriesResult.rows.map(r => r.category)
    });
  } catch (error) {
    console.error('Get services error:', error);
    res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

router.post('/services/import', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'غير مصرح' });
    }

    const { service_ids, profit_margin = 20, category_id } = req.body;

    if (!service_ids || !Array.isArray(service_ids) || service_ids.length === 0) {
      return res.status(400).json({ success: false, message: 'يرجى تحديد الخدمات للاستيراد' });
    }

    let importedCount = 0;

    for (const serviceId of service_ids) {
      const serviceResult = await pool.query(`
        SELECT s.*, p.name as provider_name
        FROM smm_services s
        JOIN smm_providers p ON s.provider_id = p.id
        WHERE s.id = $1
      `, [serviceId]);

      if (serviceResult.rows.length === 0) continue;

      const service = serviceResult.rows[0];
      
      if (service.is_imported && service.product_id) {
        continue;
      }

      const basePrice = parseFloat(service.rate);
      const sellingPrice = basePrice * (1 + profit_margin / 100);
      const distributorPrice = basePrice * (1 + (profit_margin / 2) / 100);

      const productResult = await pool.query(`
        INSERT INTO products (category_id, name, name_ar, description, base_price, selling_price, distributor_price, stock_quantity, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
        RETURNING id
      `, [
        category_id || null,
        service.name,
        service.name,
        `${service.description || ''}\nMin: ${service.min_quantity} | Max: ${service.max_quantity}`,
        basePrice,
        sellingPrice,
        distributorPrice,
        service.max_quantity
      ]);

      await pool.query(`
        UPDATE smm_services SET is_imported = true, product_id = $1 WHERE id = $2
      `, [productResult.rows[0].id, serviceId]);

      importedCount++;
    }

    res.json({
      success: true,
      message: `تم استيراد ${importedCount} خدمة بنجاح`,
      imported_count: importedCount
    });
  } catch (error) {
    console.error('Import services error:', error);
    res.status(500).json({ success: false, message: 'خطأ في الاستيراد' });
  }
});

router.post('/services/:id/toggle', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'غير مصرح' });
    }

    const result = await pool.query(`
      UPDATE smm_services SET is_active = NOT is_active WHERE id = $1 RETURNING is_active
    `, [req.params.id]);

    res.json({ 
      success: true, 
      is_active: result.rows[0]?.is_active,
      message: result.rows[0]?.is_active ? 'تم تفعيل الخدمة' : 'تم تعطيل الخدمة'
    });
  } catch (error) {
    console.error('Toggle service error:', error);
    res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

module.exports = router;
