const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken, isAdmin } = require('../middleware/auth');

const initSupportTables = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS support_tickets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        subject VARCHAR(100),
        message TEXT NOT NULL,
        status VARCHAR(50) DEFAULT 'open',
        priority VARCHAR(20) DEFAULT 'normal',
        assigned_to UUID REFERENCES users(id),
        admin_notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS ticket_replies (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ticket_id UUID REFERENCES support_tickets(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        message TEXT NOT NULL,
        is_admin BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('Support tables initialized');
  } catch (error) {
    console.error('Error initializing support tables:', error);
  }
};

initSupportTables();

router.post('/ticket', async (req, res) => {
  const { name, email, subject, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ success: false, message: 'يرجى ملء جميع الحقول المطلوبة' });
  }

  try {
    const result = await pool.query(`
      INSERT INTO support_tickets (name, email, subject, message)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `, [name, email, subject || 'استفسار عام', message]);

    res.json({ success: true, ticket_id: result.rows[0].id, message: 'تم إرسال طلبك بنجاح' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'خطأ في إرسال الطلب' });
  }
});

router.get('/my-tickets', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM support_tickets 
      WHERE user_id = $1 OR email = (SELECT email FROM users WHERE id = $1)
      ORDER BY created_at DESC
    `, [req.user.id]);
    res.json({ success: true, tickets: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'خطأ في جلب التذاكر' });
  }
});

router.get('/admin/all', authenticateToken, isAdmin, async (req, res) => {
  try {
    const tickets = await pool.query(`
      SELECT st.*, u.name as assigned_name
      FROM support_tickets st
      LEFT JOIN users u ON st.assigned_to = u.id
      ORDER BY 
        CASE st.status WHEN 'open' THEN 1 WHEN 'in_progress' THEN 2 ELSE 3 END,
        st.created_at DESC
    `);

    const stats = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'open') as open_count,
        COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_count,
        COUNT(*) FILTER (WHERE status = 'closed') as closed_count,
        COUNT(*) as total_count
      FROM support_tickets
    `);

    res.json({ 
      success: true, 
      tickets: tickets.rows,
      stats: stats.rows[0]
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'خطأ في جلب التذاكر' });
  }
});

router.get('/admin/ticket/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const ticket = await pool.query('SELECT * FROM support_tickets WHERE id = $1', [req.params.id]);
    if (ticket.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'التذكرة غير موجودة' });
    }

    const replies = await pool.query(`
      SELECT tr.*, u.name as user_name
      FROM ticket_replies tr
      LEFT JOIN users u ON tr.user_id = u.id
      WHERE tr.ticket_id = $1
      ORDER BY tr.created_at ASC
    `, [req.params.id]);

    res.json({ success: true, ticket: ticket.rows[0], replies: replies.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'خطأ في جلب التذكرة' });
  }
});

router.put('/admin/ticket/:id', authenticateToken, isAdmin, async (req, res) => {
  const { status, priority, assigned_to, admin_notes } = req.body;

  try {
    await pool.query(`
      UPDATE support_tickets 
      SET status = COALESCE($1, status),
          priority = COALESCE($2, priority),
          assigned_to = COALESCE($3, assigned_to),
          admin_notes = COALESCE($4, admin_notes),
          updated_at = NOW()
      WHERE id = $5
    `, [status, priority, assigned_to, admin_notes, req.params.id]);

    res.json({ success: true, message: 'تم تحديث التذكرة' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'خطأ في التحديث' });
  }
});

router.post('/admin/ticket/:id/reply', authenticateToken, isAdmin, async (req, res) => {
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ success: false, message: 'يرجى كتابة الرد' });
  }

  try {
    await pool.query(`
      INSERT INTO ticket_replies (ticket_id, user_id, message, is_admin)
      VALUES ($1, $2, $3, true)
    `, [req.params.id, req.user.id, message]);

    await pool.query(`
      UPDATE support_tickets SET status = 'in_progress', updated_at = NOW() WHERE id = $1
    `, [req.params.id]);

    res.json({ success: true, message: 'تم إرسال الرد' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'خطأ في إرسال الرد' });
  }
});

module.exports = router;
