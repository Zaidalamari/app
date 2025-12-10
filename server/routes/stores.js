const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken, isAdmin } = require('../middleware/auth');

router.get('/templates', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM store_templates WHERE is_active = true ORDER BY is_premium, name'
    );
    res.json({ success: true, templates: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/my-stores', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT us.*, st.name_ar as template_name,
             (SELECT COUNT(*) FROM custom_domains cd WHERE cd.store_id = us.id) as domain_count
      FROM user_stores us
      LEFT JOIN store_templates st ON us.template_id = st.id
      WHERE us.user_id = $1
      ORDER BY us.created_at DESC
    `, [req.user.userId]);

    const subResult = await pool.query(`
      SELECT sp.max_stores FROM user_subscriptions usub
      JOIN subscription_plans sp ON usub.plan_id = sp.id
      WHERE usub.user_id = $1 AND usub.status = 'active'
      LIMIT 1
    `, [req.user.userId]);

    const maxStores = subResult.rows[0]?.max_stores || 1;

    res.json({ 
      success: true, 
      stores: result.rows,
      max_stores: maxStores,
      current_count: result.rows.length
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/create', authenticateToken, async (req, res) => {
  try {
    const { name, template_id, description, theme_color } = req.body;
    const userId = req.user.userId;

    const subResult = await pool.query(`
      SELECT sp.max_stores FROM user_subscriptions usub
      JOIN subscription_plans sp ON usub.plan_id = sp.id
      WHERE usub.user_id = $1 AND usub.status = 'active'
      LIMIT 1
    `, [userId]);
    const maxStores = subResult.rows[0]?.max_stores || 1;

    const countResult = await pool.query(
      'SELECT COUNT(*) as count FROM user_stores WHERE user_id = $1',
      [userId]
    );
    const currentCount = parseInt(countResult.rows[0].count);

    if (maxStores !== -1 && currentCount >= maxStores) {
      return res.status(400).json({
        success: false,
        message: `وصلت للحد الأقصى من المتاجر (${maxStores}). قم بترقية خطتك.`
      });
    }

    let slug = name.toLowerCase()
      .replace(/[^\u0621-\u064Aa-z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 50);
    
    slug = `${slug}-${Date.now().toString(36)}`;

    const result = await pool.query(`
      INSERT INTO user_stores (user_id, template_id, name, slug, description, theme_color)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [userId, template_id || null, name, slug, description || '', theme_color || '#6366f1']);

    res.json({ success: true, store: result.rows[0], message: 'تم إنشاء المتجر بنجاح' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, theme_color, logo, is_active } = req.body;
    const userId = req.user.userId;

    const store = await pool.query(
      'SELECT * FROM user_stores WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (store.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'المتجر غير موجود' });
    }

    await pool.query(`
      UPDATE user_stores 
      SET name = COALESCE($1, name), description = COALESCE($2, description),
          theme_color = COALESCE($3, theme_color), logo = COALESCE($4, logo),
          is_active = COALESCE($5, is_active), updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
    `, [name, description, theme_color, logo, is_active, id]);

    res.json({ success: true, message: 'تم تحديث المتجر' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const result = await pool.query(
      'DELETE FROM user_stores WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'المتجر غير موجود' });
    }

    res.json({ success: true, message: 'تم حذف المتجر' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/admin/templates', authenticateToken, isAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM store_templates ORDER BY id');
    res.json({ success: true, templates: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/admin/templates', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { name, name_ar, description, preview_image, category, is_premium } = req.body;
    
    const result = await pool.query(`
      INSERT INTO store_templates (name, name_ar, description, preview_image, category, is_premium)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [name, name_ar, description, preview_image, category || 'general', is_premium || false]);

    res.json({ success: true, template: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/admin/templates/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, name_ar, description, preview_image, category, is_premium, is_active } = req.body;

    await pool.query(`
      UPDATE store_templates 
      SET name = COALESCE($1, name), name_ar = COALESCE($2, name_ar),
          description = COALESCE($3, description), preview_image = COALESCE($4, preview_image),
          category = COALESCE($5, category), is_premium = COALESCE($6, is_premium),
          is_active = COALESCE($7, is_active)
      WHERE id = $8
    `, [name, name_ar, description, preview_image, category, is_premium, is_active, id]);

    res.json({ success: true, message: 'تم تحديث القالب' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
