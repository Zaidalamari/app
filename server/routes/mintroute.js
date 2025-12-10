const express = require('express');
const crypto = require('crypto');
const pool = require('../config/database');
const { authenticateToken, isAdmin } = require('../middleware/auth');

const router = express.Router();

const MINTROUTE_API_URL = process.env.MINTROUTE_API_URL || 'https://api.mintroute.com';

const generateSignature = (data, secretKey) => {
  const dataString = JSON.stringify(data);
  return crypto.createHmac('sha256', secretKey).update(dataString).digest('hex');
};

const mintrouteRequest = async (endpoint, data = {}) => {
  const username = process.env.MINTROUTE_USERNAME;
  const secretKey = process.env.MINTROUTE_SECRET_KEY;

  if (!username || !secretKey) {
    throw new Error('بيانات Mintroute API غير مكونة');
  }

  const requestBody = {
    username,
    data
  };

  const signature = generateSignature(requestBody, secretKey);
  const timestamp = Math.floor(Date.now() / 1000);

  const response = await fetch(`${MINTROUTE_API_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Signature': signature,
      'X-Timestamp': timestamp.toString()
    },
    body: JSON.stringify(requestBody)
  });

  const result = await response.json();

  if (!result.status) {
    throw new Error(result.error || 'خطأ في Mintroute API');
  }

  return result;
};

router.get('/status', authenticateToken, isAdmin, async (req, res) => {
  try {
    const username = process.env.MINTROUTE_USERNAME;
    const secretKey = process.env.MINTROUTE_SECRET_KEY;

    if (!username || !secretKey) {
      return res.json({
        success: true,
        connected: false,
        message: 'لم يتم تكوين بيانات Mintroute API'
      });
    }

    res.json({
      success: true,
      connected: true,
      username,
      message: 'بيانات Mintroute مكونة'
    });
  } catch (error) {
    res.json({
      success: true,
      connected: false,
      message: error.message
    });
  }
});

router.get('/categories', authenticateToken, isAdmin, async (req, res) => {
  try {
    const result = await mintrouteRequest('/vendor/api/categories');
    
    res.json({
      success: true,
      categories: result.data || []
    });
  } catch (error) {
    console.error('Mintroute categories error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

router.get('/brands', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { category_id } = req.query;
    const data = category_id ? { category_id } : {};
    
    const result = await mintrouteRequest('/vendor/api/brands', data);
    
    res.json({
      success: true,
      brands: result.data || []
    });
  } catch (error) {
    console.error('Mintroute brands error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

router.get('/denominations', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { brand_id } = req.query;
    
    if (!brand_id) {
      return res.status(400).json({
        success: false,
        message: 'brand_id مطلوب'
      });
    }

    const result = await mintrouteRequest('/vendor/api/denominations', { brand_id });
    
    res.json({
      success: true,
      denominations: result.data || []
    });
  } catch (error) {
    console.error('Mintroute denominations error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

router.post('/check-stock', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { ean } = req.body;
    
    if (!ean) {
      return res.status(400).json({
        success: false,
        message: 'EAN code مطلوب'
      });
    }

    const result = await mintrouteRequest('/vendor/api/stock', { ean });
    
    res.json({
      success: true,
      available: result.status,
      message: result.message
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

router.post('/purchase', authenticateToken, async (req, res) => {
  try {
    const { ean, terminal_id, order_id } = req.body;
    
    if (!ean) {
      return res.status(400).json({
        success: false,
        message: 'EAN code مطلوب'
      });
    }

    const generatedOrderId = order_id || `ORD${Date.now()}`;
    const terminalId = terminal_id || `DIGI${req.user.id}`;

    const reserveResult = await mintrouteRequest('/voucher/v2/api/voucher', {
      ean,
      terminal_id: terminalId,
      request_type: 'reserve',
      order_id: generatedOrderId
    });

    if (!reserveResult.status) {
      throw new Error(reserveResult.error || 'فشل في حجز الكوبون');
    }

    const confirmResult = await mintrouteRequest('/voucher/v2/api/voucher', {
      ean,
      terminal_id: terminalId,
      request_type: 'confirm',
      order_id: generatedOrderId,
      reservation_id: reserveResult.data.reservation_id
    });

    await pool.query(`
      INSERT INTO api_logs (user_id, endpoint, request_data, response_data, status)
      VALUES ($1, $2, $3, $4, $5)
    `, [
      req.user.id,
      '/mintroute/purchase',
      JSON.stringify({ ean, order_id: generatedOrderId }),
      JSON.stringify(confirmResult),
      confirmResult.status ? 'success' : 'failed'
    ]);

    res.json({
      success: true,
      message: 'تم شراء الكوبون بنجاح',
      data: confirmResult.data
    });
  } catch (error) {
    console.error('Mintroute purchase error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

router.get('/order/:orderId', authenticateToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { response_type } = req.query;

    const result = await mintrouteRequest('/vendor/api/order_details', {
      order_id: orderId,
      response_type: response_type || 'short'
    });

    res.json({
      success: true,
      order: result.data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

router.get('/balance', authenticateToken, isAdmin, async (req, res) => {
  try {
    const result = await mintrouteRequest('/vendor/api/balance');

    res.json({
      success: true,
      balance: result.data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

router.post('/import-products', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { products } = req.body;

    if (!products || !Array.isArray(products)) {
      return res.status(400).json({
        success: false,
        message: 'قائمة المنتجات مطلوبة'
      });
    }

    let imported = 0;
    let errors = [];

    for (const product of products) {
      try {
        let categoryResult = await pool.query(
          'SELECT id FROM categories WHERE name = $1',
          [product.category || 'بطاقات Alameri Digital']
        );

        let categoryId;
        if (categoryResult.rows.length === 0) {
          const newCat = await pool.query(
            'INSERT INTO categories (name, description, icon) VALUES ($1, $2, $3) RETURNING id',
            [product.category || 'بطاقات Alameri Digital', 'بطاقات من Alameri Digital', '🎁']
          );
          categoryId = newCat.rows[0].id;
        } else {
          categoryId = categoryResult.rows[0].id;
        }

        const existingProduct = await pool.query(
          'SELECT id FROM products WHERE ean = $1',
          [product.ean]
        );

        if (existingProduct.rows.length > 0) {
          await pool.query(`
            UPDATE products 
            SET name = $1, price = $2, cost_price = $3, category_id = $4, 
                denomination_value = $5, denomination_currency = $6, 
                brand_name = $7, updated_at = CURRENT_TIMESTAMP
            WHERE ean = $8
          `, [
            product.name,
            product.price,
            product.cost_price || product.price * 0.9,
            categoryId,
            product.denomination_value,
            product.denomination_currency,
            product.brand_name,
            product.ean
          ]);
        } else {
          await pool.query(`
            INSERT INTO products (name, description, price, cost_price, category_id, 
                                  ean, denomination_value, denomination_currency, 
                                  brand_name, source, stock_type, is_active)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'mintroute', 'api', true)
          `, [
            product.name,
            product.description || `${product.brand_name} - ${product.denomination_value} ${product.denomination_currency}`,
            product.price,
            product.cost_price || product.price * 0.9,
            categoryId,
            product.ean,
            product.denomination_value,
            product.denomination_currency,
            product.brand_name
          ]);
        }

        imported++;
      } catch (err) {
        errors.push({ ean: product.ean, error: err.message });
      }
    }

    res.json({
      success: true,
      message: `تم استيراد ${imported} منتج بنجاح`,
      imported,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Import products error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

router.get('/orders', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { page, start_date, end_date } = req.query;

    const data = {};
    if (page) data.page = parseInt(page);
    if (start_date) data.start_date = start_date;
    if (end_date) data.end_date = end_date;

    const result = await mintrouteRequest('/vendor/api/orders', data);

    res.json({
      success: true,
      orders: result.data || []
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
