const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// Get public storefront by slug
router.get('/public/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    
    const storefrontResult = await pool.query(`
      SELECT s.*, u.name as owner_name, u.email as owner_email
      FROM seller_storefronts s
      JOIN users u ON s.user_id = u.id
      WHERE s.slug = $1 AND s.is_published = true AND u.is_active = true
    `, [slug.toLowerCase()]);

    if (storefrontResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'المتجر غير موجود' });
    }

    const storefront = storefrontResult.rows[0];

    const productsResult = await pool.query(`
      SELECT p.*, sp.custom_price, sp.is_featured, sp.display_order,
             c.name as category_name, c.name_ar as category_name_ar
      FROM seller_products sp
      JOIN products p ON sp.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE sp.storefront_id = $1 AND sp.is_active = true AND p.is_active = true
      ORDER BY sp.is_featured DESC, sp.display_order ASC
    `, [storefront.id]);

    res.json({
      success: true,
      storefront: {
        id: storefront.id,
        slug: storefront.slug,
        store_name: storefront.store_name,
        store_name_ar: storefront.store_name_ar,
        description: storefront.description,
        description_ar: storefront.description_ar,
        logo_url: storefront.logo_url,
        banner_url: storefront.banner_url,
        theme_color: storefront.theme_color,
        secondary_color: storefront.secondary_color,
        phone: storefront.phone,
        email: storefront.email,
        whatsapp: storefront.whatsapp,
        twitter: storefront.twitter,
        instagram: storefront.instagram
      },
      products: productsResult.rows.map(p => ({
        ...p,
        selling_price: p.custom_price || p.selling_price
      }))
    });
  } catch (error) {
    console.error('Get storefront error:', error);
    res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

// Get my storefront (authenticated)
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const storefrontResult = await pool.query(`
      SELECT * FROM seller_storefronts WHERE user_id = $1
    `, [req.user.id]);

    if (storefrontResult.rows.length === 0) {
      return res.json({ success: true, storefront: null });
    }

    const storefront = storefrontResult.rows[0];

    const productsResult = await pool.query(`
      SELECT sp.*, p.name, p.name_ar, p.image_url, p.selling_price as original_price,
             c.name as category_name, c.name_ar as category_name_ar
      FROM seller_products sp
      JOIN products p ON sp.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE sp.storefront_id = $1
      ORDER BY sp.display_order ASC
    `, [storefront.id]);

    res.json({
      success: true,
      storefront,
      products: productsResult.rows
    });
  } catch (error) {
    console.error('Get my storefront error:', error);
    res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

// Create/Update storefront
router.post('/me', authenticateToken, async (req, res) => {
  try {
    const {
      slug,
      store_name,
      store_name_ar,
      description,
      description_ar,
      logo_url,
      banner_url,
      theme_color,
      secondary_color,
      phone,
      email,
      whatsapp,
      twitter,
      instagram,
      is_published
    } = req.body;

    const cleanSlug = slug?.toLowerCase().replace(/[^a-z0-9-]/g, '') || '';
    if (!cleanSlug || cleanSlug.length < 3) {
      return res.status(400).json({ success: false, message: 'اسم الرابط يجب أن يكون 3 أحرف على الأقل (حروف إنجليزية وأرقام فقط)' });
    }

    const reservedSlugs = ['admin', 'api', 'login', 'register', 'dashboard', 'products', 'payment', 'join-seller', 'api-docs', 'my-store', 'store', 'pressable', 'mintroute', 'wallets'];
    if (reservedSlugs.includes(cleanSlug)) {
      return res.status(400).json({ success: false, message: 'هذا الاسم محجوز، اختر اسماً آخر' });
    }

    const existingStorefront = await pool.query(
      'SELECT id FROM seller_storefronts WHERE user_id = $1',
      [req.user.id]
    );

    if (existingStorefront.rows.length > 0) {
      const slugCheck = await pool.query(
        'SELECT id FROM seller_storefronts WHERE slug = $1 AND user_id != $2',
        [cleanSlug, req.user.id]
      );
      if (slugCheck.rows.length > 0) {
        return res.status(400).json({ success: false, message: 'هذا الرابط مستخدم من بائع آخر' });
      }

      await pool.query(`
        UPDATE seller_storefronts SET
          slug = $1, store_name = $2, store_name_ar = $3, description = $4,
          description_ar = $5, logo_url = $6, banner_url = $7, theme_color = $8,
          secondary_color = $9, phone = $10, email = $11, whatsapp = $12,
          twitter = $13, instagram = $14, is_published = $15, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $16
      `, [cleanSlug, store_name, store_name_ar, description, description_ar,
          logo_url, banner_url, theme_color || '#3B82F6', secondary_color || '#8B5CF6',
          phone, email, whatsapp, twitter, instagram, is_published || false, req.user.id]);

      res.json({ success: true, message: 'تم تحديث المتجر بنجاح' });
    } else {
      const slugCheck = await pool.query(
        'SELECT id FROM seller_storefronts WHERE slug = $1',
        [cleanSlug]
      );
      if (slugCheck.rows.length > 0) {
        return res.status(400).json({ success: false, message: 'هذا الرابط مستخدم من بائع آخر' });
      }

      await pool.query(`
        INSERT INTO seller_storefronts (
          user_id, slug, store_name, store_name_ar, description, description_ar,
          logo_url, banner_url, theme_color, secondary_color, phone, email,
          whatsapp, twitter, instagram, is_published
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      `, [req.user.id, cleanSlug, store_name, store_name_ar, description, description_ar,
          logo_url, banner_url, theme_color || '#3B82F6', secondary_color || '#8B5CF6',
          phone, email, whatsapp, twitter, instagram, is_published || false]);

      res.json({ success: true, message: 'تم إنشاء المتجر بنجاح' });
    }
  } catch (error) {
    console.error('Create/update storefront error:', error);
    res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

// Add/Update products in storefront
router.post('/me/products', authenticateToken, async (req, res) => {
  try {
    const { products } = req.body;

    const storefrontResult = await pool.query(
      'SELECT id FROM seller_storefronts WHERE user_id = $1',
      [req.user.id]
    );

    if (storefrontResult.rows.length === 0) {
      return res.status(400).json({ success: false, message: 'يجب إنشاء متجر أولاً' });
    }

    const storefrontId = storefrontResult.rows[0].id;

    const existingProducts = await pool.query(
      'SELECT id, product_id FROM seller_products WHERE storefront_id = $1',
      [storefrontId]
    );
    const existingMap = new Map(existingProducts.rows.map(p => [p.product_id, p.id]));

    const incomingProductIds = new Set((products || []).map(p => p.product_id));
    const toDelete = existingProducts.rows.filter(p => !incomingProductIds.has(p.product_id));
    
    for (const p of toDelete) {
      await pool.query('DELETE FROM seller_products WHERE id = $1', [p.id]);
    }

    if (products && products.length > 0) {
      for (let i = 0; i < products.length; i++) {
        const p = products[i];
        const displayOrder = p.display_order !== undefined ? p.display_order : i;
        
        if (existingMap.has(p.product_id)) {
          await pool.query(`
            UPDATE seller_products SET 
              custom_price = $1, is_featured = $2, display_order = $3, is_active = $4
            WHERE storefront_id = $5 AND product_id = $6
          `, [p.custom_price || null, p.is_featured || false, displayOrder, p.is_active !== false, storefrontId, p.product_id]);
        } else {
          await pool.query(`
            INSERT INTO seller_products (storefront_id, product_id, custom_price, is_featured, display_order, is_active)
            VALUES ($1, $2, $3, $4, $5, $6)
          `, [storefrontId, p.product_id, p.custom_price || null, p.is_featured || false, displayOrder, p.is_active !== false]);
        }
      }
    }

    const updatedProducts = await pool.query(`
      SELECT id, product_id, custom_price, is_featured, display_order, is_active
      FROM seller_products WHERE storefront_id = $1 ORDER BY display_order ASC
    `, [storefrontId]);

    res.json({ 
      success: true, 
      message: 'تم تحديث المنتجات بنجاح',
      products: updatedProducts.rows
    });
  } catch (error) {
    console.error('Update storefront products error:', error);
    res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

// Check slug availability
router.get('/check-slug/:slug', authenticateToken, async (req, res) => {
  try {
    const { slug } = req.params;
    const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '');

    const reservedSlugs = ['admin', 'api', 'login', 'register', 'dashboard', 'products', 'payment', 'join-seller', 'api-docs', 'my-store', 'store', 'pressable', 'mintroute', 'wallets'];
    if (reservedSlugs.includes(cleanSlug)) {
      return res.json({ success: true, available: false, message: 'هذا الاسم محجوز' });
    }

    const result = await pool.query(
      'SELECT id FROM seller_storefronts WHERE slug = $1 AND user_id != $2',
      [cleanSlug, req.user.id]
    );

    res.json({
      success: true,
      available: result.rows.length === 0,
      slug: cleanSlug
    });
  } catch (error) {
    console.error('Check slug error:', error);
    res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

// Get all available products for seller to add
router.get('/available-products', authenticateToken, async (req, res) => {
  try {
    const productsResult = await pool.query(`
      SELECT p.*, c.name as category_name, c.name_ar as category_name_ar
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.is_active = true
      ORDER BY c.name, p.name
    `);

    res.json({ success: true, products: productsResult.rows });
  } catch (error) {
    console.error('Get available products error:', error);
    res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

// Purchase from storefront (for visitors)
router.post('/public/:slug/purchase', async (req, res) => {
  try {
    const { slug } = req.params;
    const { product_id, buyer_email, buyer_phone } = req.body;

    if (!buyer_email && !buyer_phone) {
      return res.status(400).json({ success: false, message: 'يرجى إدخال البريد الإلكتروني أو رقم الهاتف' });
    }

    const storefrontResult = await pool.query(`
      SELECT s.*, u.id as seller_id
      FROM seller_storefronts s
      JOIN users u ON s.user_id = u.id
      WHERE s.slug = $1 AND s.is_published = true
    `, [slug.toLowerCase()]);

    if (storefrontResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'المتجر غير موجود' });
    }

    const storefront = storefrontResult.rows[0];

    const productResult = await pool.query(`
      SELECT sp.*, p.name, p.name_ar, p.selling_price
      FROM seller_products sp
      JOIN products p ON sp.product_id = p.id
      WHERE sp.storefront_id = $1 AND sp.product_id = $2 AND sp.is_active = true
    `, [storefront.id, product_id]);

    if (productResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'المنتج غير متاح' });
    }

    const product = productResult.rows[0];
    const price = product.custom_price || product.selling_price;

    const orderResult = await pool.query(`
      INSERT INTO storefront_orders (storefront_id, seller_id, product_id, product_name, price, buyer_email, buyer_phone, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
      RETURNING id
    `, [storefront.id, storefront.seller_id, product_id, product.name_ar || product.name, price, buyer_email || null, buyer_phone || null]);

    res.json({
      success: true,
      message: 'تم تسجيل طلبك بنجاح! سيتواصل معك البائع قريباً',
      order_id: orderResult.rows[0].id,
      storefront: {
        store_name: storefront.store_name_ar || storefront.store_name,
        whatsapp: storefront.whatsapp,
        phone: storefront.phone,
        email: storefront.email
      },
      product: product.name_ar || product.name,
      price
    });
  } catch (error) {
    console.error('Purchase error:', error);
    res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

module.exports = router;
