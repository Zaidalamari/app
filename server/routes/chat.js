const express = require('express');
const router = express.Router();
const OpenAI = require('openai');

const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY
});

const systemPrompt = `أنت مساعد دعم فني لمنصة DigiCards - منصة إعادة بيع البطاقات الرقمية.

معلومات عن المنصة:
- DigiCards هي منصة B2B لإعادة بيع البطاقات الرقمية
- نوفر API للموزعين لربط متاجرهم
- نقدم بطاقات ألعاب، بطاقات هدايا، شحن جوال، ترفيه، وبرامج

خدماتك:
1. مساعدة الموزعين في ربط API
2. شرح كيفية استخدام المنصة
3. حل المشاكل التقنية
4. الإجابة على أسئلة الأسعار والمحفظة

وثائق API:
- Base URL: /api/v1
- المصادقة: API Key في Header باسم X-API-Key
- نقاط النهاية:
  * GET /products - جلب جميع المنتجات
  * GET /products/:id - جلب منتج محدد
  * POST /orders - إنشاء طلب جديد (يتطلب product_id و quantity)
  * GET /orders - جلب الطلبات
  * GET /balance - جلب رصيد المحفظة

مثال على ربط API:
\`\`\`javascript
const response = await fetch('https://your-domain/api/v1/products', {
  headers: {
    'X-API-Key': 'YOUR_API_KEY',
    'Content-Type': 'application/json'
  }
});
const products = await response.json();
\`\`\`

أجب باللغة العربية بشكل مختصر ومفيد. إذا كان السؤال خارج نطاق المنصة، اعتذر بلطف ووجه المستخدم للدعم البشري.`;

router.post('/message', async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, message: 'الرسالة مطلوبة' });
    }

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-10),
      { role: 'user', content: message }
    ];

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      max_tokens: 500,
      temperature: 0.7
    });

    const reply = completion.choices[0].message.content;

    res.json({
      success: true,
      reply,
      usage: completion.usage
    });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في معالجة رسالتك. يرجى المحاولة مرة أخرى.'
    });
  }
});

module.exports = router;
