# Alameri Digital Platform - منصة العامري الرقمية

## Overview
منصة متكاملة لإعادة بيع البطاقات الرقمية مع نظام API للموزعين ومحفظة إلكترونية.

## Contact Information
- Email: zaid@alameri.digital
- Phone (Saudi): +966531832836
- Phone (Oman): +96890644452

## Project Structure
```
/
├── server/                 # Backend Express.js
│   ├── index.js           # Main server file
│   ├── config/
│   │   └── database.js    # PostgreSQL connection
│   ├── middleware/
│   │   └── auth.js        # JWT & API key authentication
│   └── routes/
│       ├── auth.js        # Authentication routes
│       ├── products.js    # Products management
│       ├── orders.js      # Orders & purchases
│       ├── wallet.js      # Wallet operations
│       ├── api.js         # External API for distributors
│       ├── admin.js       # Admin dashboard
│       ├── chat.js        # AI chatbot (OpenAI)
│       ├── payment.js     # Saudi payment gateways
│       ├── marketing.js   # Banners, promotions, notifications
│       ├── currencies.js  # Multi-currency & country markets
│       └── smmprovider.js # SMM Panel providers integration
├── client/                 # Frontend React + Vite
│   ├── src/
│   │   ├── pages/         # React pages
│   │   │   ├── Home.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Products.jsx
│   │   │   ├── Payment.jsx      # Wallet top-up page
│   │   │   ├── AdminDashboard.jsx
│   │   │   ├── JoinSeller.jsx
│   │   │   └── ApiDocs.jsx
│   │   ├── components/
│   │   │   ├── ChatBot.jsx         # AI support chatbot
│   │   │   ├── BannerSlider.jsx    # Marketing banners
│   │   │   ├── PromoBanner.jsx     # Promo codes banner
│   │   │   └── CountrySelector.jsx # Country/currency selector
│   │   └── App.jsx        # Main app with routing
│   └── dist/              # Built production files
└── package.json           # Root package.json
```

## Running the Project
- Development: `node server/index.js` (runs on port 5000)
- Build frontend: `cd client && npm run build`

## Database
PostgreSQL with tables:
- users, wallets, categories, products, card_codes, orders, transactions, api_logs, distributor_sites
- payment_transactions (payment records)
- banners, promotions, promotion_usage, notifications (marketing)
- currencies, countries, product_prices (multi-currency system)
- smm_providers, smm_services, smm_orders (SMM Panel integration)
- otp_codes (SMS OTP verification system)
- gift_cards (Gift card wallet top-up system)
- marketing_subscribers, marketing_campaigns, marketing_messages (SMS/Email marketing)
- reseller_products, reseller_sales (Reseller system)

## Default Admin
- Email: zaid@alameri.digital
- Password: admin123

## API Endpoints
### Authentication
- POST /api/auth/register
- POST /api/auth/login
- GET /api/auth/profile

### External API (for distributors)
- GET /api/v1/products
- POST /api/v1/purchase
- GET /api/v1/balance
Headers required: X-API-Key, X-API-Secret

### Chat (AI Support)
- POST /api/chat/message

### Payment
- GET /api/payment/gateways
- POST /api/payment/initiate
- POST /api/payment/simulate-success/:transactionId
- GET /api/payment/transactions

### Marketing
- GET /api/marketing/banners
- GET /api/marketing/promotions/active
- POST /api/marketing/promotions/validate
- GET /api/marketing/notifications

## Tech Stack
- Backend: Express.js 5, PostgreSQL, JWT, bcryptjs, OpenAI
- Frontend: React 18, Vite, Tailwind CSS 4, React Router
- Language: RTL Arabic interface

## Features
1. **Wallet System** - Balance management with transaction history
2. **API for Distributors** - Full API with authentication
3. **Saudi Payment Gateways** - MyFatoorah, Telr, Moyasar, HyperPay (simulation mode)
4. **AI Chatbot** - OpenAI-powered support bot
5. **Marketing System** - Banners, promo codes, notifications
6. **Multi-Currency System** - Support for SAR, AED, KWD, BHD, QAR, OMR, EGP, USD, EUR
7. **Country Markets** - Separate markets for SA, AE, KW, BH, QA, OM, EG with local pricing
8. **SMM Panel Integration** - Import services from SMM panels as products
9. **Referral System** - Commission-based referral program with withdraw to wallet
10. **Marketing Center** - Ad campaign management with Meta/Google/TikTok/Snapchat/Twitter integration
11. **External Supplier Integration** - IPTV ActiveCode panel API integration for auto-fulfillment
12. **Multi-Channel Notifications** - WhatsApp, SMS, Email notifications for order confirmations
13. **WordPress Plugin** - WooCommerce integration plugin for distributors

## User Preferences
- Arabic RTL interface
- Saudi payment gateways support
- AI chatbot for support
- Marketing system for social media

## Recent Changes
- Dec 2024: Added product management with individual and bulk codes from admin panel
- Dec 2024: Added AI chatbot with OpenAI integration
- Dec 2024: Added Saudi payment gateways (simulation mode)
- Dec 2024: Added marketing system (banners, promotions, notifications)
- Dec 2024: Added SMM Panel providers integration with service import
- Dec 2024: Added multi-currency system with country markets
- Dec 2024: Added referral system with commissions and user creation from admin
- Dec 2024: Added external supplier panel integration (IPTV ActiveCode) with auto-fulfillment
- Dec 2024: Added multi-channel notifications (WhatsApp, SMS, Email) for order confirmations
- Dec 2024: Added WordPress/WooCommerce plugin for distributor store integration

## Product Management (Admin)
- `GET /api/admin/products` - List all products with code counts
- `POST /api/admin/products` - Create product with optional bulk codes
- `PUT /api/admin/products/:id` - Update product
- `DELETE /api/admin/products/:id` - Delete product
- `GET /api/admin/products/:id/codes` - Get codes for a product
- `POST /api/admin/products/:id/codes` - Add single code
- `POST /api/admin/products/:id/codes/bulk` - Add bulk codes (newline separated)

## Admin Pages
- `/admin` - Main admin dashboard
- `/admin/wallets` - Wallet management
- `/admin/currencies` - Currency and country market settings
- `/admin/smm` - SMM Panel providers management
- `/admin/referrals` - Referral system and commission settings
- `/admin/users` - User management and creation
- `/admin/suppliers` - External supplier panel management (IPTV ActiveCode)
- `/admin/notifications` - Multi-channel notification settings (WhatsApp, SMS, Email)
- `/admin/api-settings` - API providers settings (Mintroute, etc.)
- `/admin/ai-chat` - AI command chat for admin (execute commands via natural language)

## External Supplier Integration
- `/api/supplier/list` - List configured suppliers
- `/api/supplier/add` - Add new supplier (host, username, password)
- `/api/supplier/test/:id` - Test supplier connection
- `/api/supplier/orders` - View supplier order history
- Auto-fulfillment on order completion for subscription products

## Notification System
- `/api/notifications/settings` - Configure notification providers
- `/api/notifications/logs` - View notification history
- `/api/notifications/test` - Test notification sending
- Supported providers: Twilio, UltraMsg (WhatsApp), SendGrid, Mailgun, Unifonic, Msegat

## WordPress Plugin
- Download: `/plugin` or `/downloads/alameri-digital-integration.zip`
- Features: Product display, automatic purchase, WooCommerce integration, shortcodes

## Referral System
- `/referrals` - User referral dashboard
- `GET /api/referrals/my-referrals` - User's referrals and stats
- `GET /api/referrals/commissions` - User's commission history
- `POST /api/referrals/withdraw` - Withdraw completed commissions to wallet
- `POST /api/admin/users/create` - Create user with initial balance (admin)

## Recent Branding Updates
- Dec 2024: Rebranded from DigiCards to Alameri Digital
- Updated admin email to zaid@alameri.digital
- Added WordPress plugin download link in user dashboard
- Contact: zaid@alameri.digital, +966531832836, +96890644452
