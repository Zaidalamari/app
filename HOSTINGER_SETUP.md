# دليل تثبيت DigiCards على Hostinger

## 1. تحميل الملفات
- حمّل ملف `digicards-export.zip` من Replit
- ارفعه إلى خادم Hostinger وفك الضغط

## 2. إعداد قاعدة البيانات PostgreSQL
أنشئ قاعدة بيانات PostgreSQL في Hostinger واحفظ بيانات الاتصال.

## 3. متغيرات البيئة المطلوبة
أنشئ ملف `.env` في المجلد الرئيسي:

```env
DATABASE_URL=postgresql://username:password@hostname:5432/database_name
JWT_SECRET=your-secret-key-here-make-it-long-and-random
SESSION_SECRET=another-random-secret-key
PORT=3000
NODE_ENV=production
```

## 4. تثبيت التبعيات
```bash
npm install
cd client && npm install && npm run build && cd ..
```

## 5. إعداد OpenLiteSpeed
في لوحة تحكم OpenLiteSpeed:

### App Root
```
/home/username/domains/yourdomain.com/digicards
```

### Startup File
```
server/index.js
```

### Node.js Version
اختر Node.js 18 أو أحدث

## 6. تشغيل التطبيق
```bash
node server/index.js
```

أو باستخدام PM2 للتشغيل المستمر:
```bash
npm install -g pm2
pm2 start server/index.js --name digicards
pm2 save
pm2 startup
```

## 7. بيانات الدخول الافتراضية
- البريد: admin@digicards.com
- كلمة المرور: admin123

## ملاحظات مهمة
- تأكد من تغيير كلمة مرور الأدمن بعد أول تسجيل دخول
- غيّر قيم JWT_SECRET و SESSION_SECRET لقيم عشوائية قوية
- تأكد من أن المنفذ المحدد (PORT) مفتوح في جدار الحماية
