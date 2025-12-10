const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const pool = require('./config/database');
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const { router: orderRoutes } = require('./routes/orders');
const walletRoutes = require('./routes/wallet');
const apiRoutes = require('./routes/api');
const adminRoutes = require('./routes/admin');
const chatRoutes = require('./routes/chat');
const paymentRoutes = require('./routes/payment');
const marketingRoutes = require('./routes/marketing');
const pressableRoutes = require('./routes/pressable');
const mintrouteRoutes = require('./routes/mintroute');
const storefrontRoutes = require('./routes/storefront');
const smmProviderRoutes = require('./routes/smmprovider');
const currencyRoutes = require('./routes/currencies');
const deliveryRoutes = require('./routes/delivery');
const referralRoutes = require('./routes/referrals');
const subscriptionRoutes = require('./routes/subscriptions');
const storeRoutes = require('./routes/stores');
const domainRoutes = require('./routes/domains');
const gatewayRoutes = require('./routes/gateways');
const supportRoutes = require('./routes/support');
const integrationsRoutes = require('./routes/integrations');
const sharkiptvRoutes = require('./routes/sharkiptv');
const gatewayApplicationsRoutes = require('./routes/gatewayApplications');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

const initDatabase = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(50),
        role VARCHAR(50) DEFAULT 'seller',
        api_key VARCHAR(255) UNIQUE,
        api_secret VARCHAR(255),
        domain VARCHAR(255),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS wallets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        balance DECIMAL(15, 2) DEFAULT 0.00,
        currency VARCHAR(10) DEFAULT 'SAR',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        name_ar VARCHAR(255),
        description TEXT,
        icon VARCHAR(255),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS products (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
        name VARCHAR(255) NOT NULL,
        name_ar VARCHAR(255),
        description TEXT,
        image_url VARCHAR(500),
        base_price DECIMAL(15, 2) NOT NULL,
        selling_price DECIMAL(15, 2) NOT NULL,
        distributor_price DECIMAL(15, 2),
        stock_quantity INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS card_codes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_id UUID REFERENCES products(id) ON DELETE CASCADE,
        code VARCHAR(500) NOT NULL,
        serial_number VARCHAR(255),
        is_sold BOOLEAN DEFAULT false,
        sold_at TIMESTAMP,
        sold_to UUID REFERENCES users(id),
        order_id UUID,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add product_type column to products (digital or physical)
    await pool.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='product_type') THEN
          ALTER TABLE products ADD COLUMN product_type VARCHAR(20) DEFAULT 'digital';
        END IF;
      END $$;
    `);

    // Physical product deliveries with QR codes
    await pool.query(`
      CREATE TABLE IF NOT EXISTS physical_deliveries (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
        product_id UUID REFERENCES products(id) ON DELETE SET NULL,
        buyer_id UUID REFERENCES users(id) ON DELETE SET NULL,
        qr_code VARCHAR(500) UNIQUE NOT NULL,
        qr_secret VARCHAR(255) NOT NULL,
        delivery_status VARCHAR(50) DEFAULT 'pending',
        delivery_address TEXT,
        delivery_phone VARCHAR(50),
        delivery_notes TEXT,
        delivered_at TIMESTAMP,
        delivered_by UUID REFERENCES users(id),
        scan_location TEXT,
        scan_ip VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '7 days')
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        product_id UUID REFERENCES products(id) ON DELETE SET NULL,
        quantity INTEGER DEFAULT 1,
        total_price DECIMAL(15, 2) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        payment_method VARCHAR(50),
        api_order BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        wallet_id UUID REFERENCES wallets(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        type VARCHAR(50) NOT NULL,
        amount DECIMAL(15, 2) NOT NULL,
        balance_before DECIMAL(15, 2),
        balance_after DECIMAL(15, 2),
        description TEXT,
        reference_id UUID,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS api_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        endpoint VARCHAR(255),
        method VARCHAR(10),
        request_body TEXT,
        response_body TEXT,
        status_code INTEGER,
        ip_address VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS distributor_sites (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        domain VARCHAR(255) UNIQUE,
        subdomain VARCHAR(255) UNIQUE,
        site_name VARCHAR(255),
        logo_url VARCHAR(500),
        theme_color VARCHAR(20) DEFAULT '#3B82F6',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add username column to users if not exists
    await pool.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='username') THEN
          ALTER TABLE users ADD COLUMN username VARCHAR(100) UNIQUE;
        END IF;
      END $$;
    `);

    // Create seller_storefronts table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS seller_storefronts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
        slug VARCHAR(100) UNIQUE NOT NULL,
        store_name VARCHAR(255),
        store_name_ar VARCHAR(255),
        description TEXT,
        description_ar TEXT,
        logo_url VARCHAR(500),
        banner_url VARCHAR(500),
        theme_color VARCHAR(20) DEFAULT '#3B82F6',
        secondary_color VARCHAR(20) DEFAULT '#8B5CF6',
        phone VARCHAR(50),
        email VARCHAR(255),
        whatsapp VARCHAR(50),
        twitter VARCHAR(255),
        instagram VARCHAR(255),
        is_published BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create seller_products table for featured products
    await pool.query(`
      CREATE TABLE IF NOT EXISTS seller_products (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        storefront_id UUID REFERENCES seller_storefronts(id) ON DELETE CASCADE,
        product_id UUID REFERENCES products(id) ON DELETE CASCADE,
        custom_price DECIMAL(15, 2),
        is_featured BOOLEAN DEFAULT false,
        display_order INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(storefront_id, product_id)
      )
    `);

    // Create storefront_orders table for tracking purchases from seller stores
    await pool.query(`
      CREATE TABLE IF NOT EXISTS storefront_orders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        storefront_id UUID REFERENCES seller_storefronts(id) ON DELETE SET NULL,
        seller_id UUID REFERENCES users(id) ON DELETE SET NULL,
        product_id UUID REFERENCES products(id) ON DELETE SET NULL,
        product_name VARCHAR(255),
        price DECIMAL(15, 2),
        buyer_email VARCHAR(255),
        buyer_phone VARCHAR(50),
        status VARCHAR(50) DEFAULT 'pending',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Payment gateway applications for document uploads
    await pool.query(`
      CREATE TABLE IF NOT EXISTS payment_gateway_applications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        gateway_name VARCHAR(100) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        notes TEXT,
        reviewed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Gateway documents for uploaded files
    await pool.query(`
      CREATE TABLE IF NOT EXISTS gateway_documents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        application_id UUID REFERENCES payment_gateway_applications(id) ON DELETE CASCADE,
        document_type VARCHAR(100) NOT NULL,
        document_name VARCHAR(255),
        file_url VARCHAR(500) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const bcrypt = require('bcryptjs');
    const { v4: uuidv4 } = require('uuid');
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const apiKey = `dk_${uuidv4().replace(/-/g, '')}`;
    const apiSecret = `ds_${uuidv4().replace(/-/g, '')}`;

    const adminExists = await pool.query('SELECT id FROM users WHERE email = $1', ['admin@digicards.com']);
    if (adminExists.rows.length === 0) {
      const adminResult = await pool.query(
        `INSERT INTO users (email, password, name, role, api_key, api_secret) 
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        ['admin@digicards.com', hashedPassword, 'مدير النظام', 'admin', apiKey, apiSecret]
      );
      await pool.query('INSERT INTO wallets (user_id, balance) VALUES ($1, $2)', [adminResult.rows[0].id, 0]);
    }

    const categoriesExist = await pool.query('SELECT id FROM categories LIMIT 1');
    if (categoriesExist.rows.length === 0) {
      await pool.query(`
        INSERT INTO categories (name, name_ar, icon) VALUES 
        ('Gaming Cards', 'بطاقات الألعاب', '🎮'),
        ('Gift Cards', 'بطاقات الهدايا', '🎁'),
        ('Mobile Recharge', 'شحن الجوال', '📱'),
        ('Entertainment', 'الترفيه', '🎬'),
        ('Software', 'البرامج', '💻')
      `);
    }

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
  }
};

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/v1', apiRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/marketing', marketingRoutes);
app.use('/api/pressable', pressableRoutes);
app.use('/api/mintroute', mintrouteRoutes);
app.use('/api/storefront', storefrontRoutes);
app.use('/api/smm', smmProviderRoutes);
app.use('/api/currencies', currencyRoutes);
app.use('/api/delivery', deliveryRoutes);
app.use('/api/referrals', referralRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/stores', storeRoutes);
app.use('/api/domains', domainRoutes);
app.use('/api/gateways', gatewayRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/integrations', integrationsRoutes);
app.use('/api/shark', sharkiptvRoutes);
app.use('/api/gateway-applications', gatewayApplicationsRoutes);

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use(express.static(path.join(__dirname, '../client/dist')));

app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist', 'index.html'));
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'خطأ في الخادم' });
});

initDatabase().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
});
