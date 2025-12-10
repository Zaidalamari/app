import { useState } from 'react'
import { Link } from 'react-router-dom'
import { 
  Play, Code, Key, ShoppingCart, Wallet, CheckCircle, 
  AlertCircle, Copy, ChevronDown, ChevronUp, Zap, 
  Settings, FileCode, Terminal, Globe, BookOpen
} from 'lucide-react'

export default function ApiTutorial({ user }) {
  const baseUrl = window.location.origin
  const [activeStep, setActiveStep] = useState(1)
  const [activeLanguage, setActiveLanguage] = useState('php')
  const [copiedCode, setCopiedCode] = useState(null)
  const [expandedSection, setExpandedSection] = useState('intro')

  const copyToClipboard = (code, id) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(id)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const steps = [
    {
      id: 1,
      title: 'إنشاء حساب موزع',
      icon: <Settings className="w-6 h-6" />,
      description: 'سجل حساب جديد وفعل صلاحيات الموزع'
    },
    {
      id: 2,
      title: 'الحصول على مفاتيح API',
      icon: <Key className="w-6 h-6" />,
      description: 'احصل على مفتاح API والمفتاح السري'
    },
    {
      id: 3,
      title: 'شحن المحفظة',
      icon: <Wallet className="w-6 h-6" />,
      description: 'اشحن رصيدك لتتمكن من الشراء'
    },
    {
      id: 4,
      title: 'اختبار الاتصال',
      icon: <Zap className="w-6 h-6" />,
      description: 'تأكد من عمل الربط بشكل صحيح'
    },
    {
      id: 5,
      title: 'دمج في موقعك',
      icon: <Globe className="w-6 h-6" />,
      description: 'ادمج API في موقعك الإلكتروني'
    }
  ]

  const codeExamples = {
    php: {
      name: 'PHP',
      color: 'bg-purple-600',
      getProducts: `<?php
// الحصول على قائمة المنتجات
$apiKey = 'dk_your_api_key';
$apiSecret = 'ds_your_api_secret';
$baseUrl = '${baseUrl}';

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $baseUrl . '/api/v1/products');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'X-API-Key: ' . $apiKey,
    'X-API-Secret: ' . $apiSecret,
    'Content-Type: application/json'
]);

$response = curl_exec($ch);
$products = json_decode($response, true);

if ($products['success']) {
    foreach ($products['data'] as $product) {
        echo $product['name'] . ' - ' . $product['price'] . ' ريال\\n';
    }
}
curl_close($ch);
?>`,
      purchase: `<?php
// شراء بطاقة
$apiKey = 'dk_your_api_key';
$apiSecret = 'ds_your_api_secret';
$baseUrl = '${baseUrl}';

$data = [
    'product_id' => 'uuid-of-product',
    'quantity' => 1
];

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $baseUrl . '/api/v1/purchase');
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'X-API-Key: ' . $apiKey,
    'X-API-Secret: ' . $apiSecret,
    'Content-Type: application/json'
]);

$response = curl_exec($ch);
$result = json_decode($response, true);

if ($result['success']) {
    // عرض الكود للعميل
    foreach ($result['data']['codes'] as $code) {
        echo 'الكود: ' . $code['code'] . '\\n';
        echo 'الرقم التسلسلي: ' . $code['serial_number'] . '\\n';
    }
    echo 'الرصيد المتبقي: ' . $result['data']['new_balance'] . ' ريال';
} else {
    echo 'خطأ: ' . $result['message'];
}
curl_close($ch);
?>`,
      balance: `<?php
// التحقق من الرصيد
$apiKey = 'dk_your_api_key';
$apiSecret = 'ds_your_api_secret';
$baseUrl = '${baseUrl}';

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $baseUrl . '/api/v1/balance');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'X-API-Key: ' . $apiKey,
    'X-API-Secret: ' . $apiSecret
]);

$response = curl_exec($ch);
$result = json_decode($response, true);

if ($result['success']) {
    echo 'رصيدك: ' . $result['data']['balance'] . ' ' . $result['data']['currency'];
}
curl_close($ch);
?>`,
      fullIntegration: `<?php
/**
 * صنف للتعامل مع DigiCards API
 * انسخ هذا الملف إلى مشروعك
 */
class DigiCardsAPI {
    private $apiKey;
    private $apiSecret;
    private $baseUrl;
    
    public function __construct($apiKey, $apiSecret) {
        $this->apiKey = $apiKey;
        $this->apiSecret = $apiSecret;
        $this->baseUrl = '${baseUrl}';
    }
    
    private function request($endpoint, $method = 'GET', $data = null) {
        $ch = curl_init();
        $url = $this->baseUrl . $endpoint;
        
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'X-API-Key: ' . $this->apiKey,
            'X-API-Secret: ' . $this->apiSecret,
            'Content-Type: application/json'
        ]);
        
        if ($method === 'POST') {
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        }
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        return [
            'status' => $httpCode,
            'data' => json_decode($response, true)
        ];
    }
    
    // الحصول على المنتجات
    public function getProducts() {
        return $this->request('/api/v1/products');
    }
    
    // شراء بطاقة
    public function purchase($productId, $quantity = 1) {
        return $this->request('/api/v1/purchase', 'POST', [
            'product_id' => $productId,
            'quantity' => $quantity
        ]);
    }
    
    // التحقق من الرصيد
    public function getBalance() {
        return $this->request('/api/v1/balance');
    }
}

// مثال الاستخدام
$api = new DigiCardsAPI('dk_your_key', 'ds_your_secret');

// عرض المنتجات
$products = $api->getProducts();
print_r($products);

// شراء بطاقة
$order = $api->purchase('product-uuid', 1);
print_r($order);
?>`
    },
    python: {
      name: 'Python',
      color: 'bg-yellow-600',
      getProducts: `import requests

# الحصول على قائمة المنتجات
api_key = 'dk_your_api_key'
api_secret = 'ds_your_api_secret'
base_url = '${baseUrl}'

headers = {
    'X-API-Key': api_key,
    'X-API-Secret': api_secret,
    'Content-Type': 'application/json'
}

response = requests.get(f'{base_url}/api/v1/products', headers=headers)
data = response.json()

if data['success']:
    for product in data['data']:
        print(f"{product['name']} - {product['price']} ريال")`,
      purchase: `import requests

# شراء بطاقة
api_key = 'dk_your_api_key'
api_secret = 'ds_your_api_secret'
base_url = '${baseUrl}'

headers = {
    'X-API-Key': api_key,
    'X-API-Secret': api_secret,
    'Content-Type': 'application/json'
}

data = {
    'product_id': 'uuid-of-product',
    'quantity': 1
}

response = requests.post(
    f'{base_url}/api/v1/purchase',
    json=data,
    headers=headers
)

result = response.json()

if result['success']:
    for code in result['data']['codes']:
        print(f"الكود: {code['code']}")
        print(f"الرقم التسلسلي: {code['serial_number']}")
    print(f"الرصيد المتبقي: {result['data']['new_balance']} ريال")
else:
    print(f"خطأ: {result['message']}")`,
      balance: `import requests

# التحقق من الرصيد
api_key = 'dk_your_api_key'
api_secret = 'ds_your_api_secret'
base_url = '${baseUrl}'

headers = {
    'X-API-Key': api_key,
    'X-API-Secret': api_secret
}

response = requests.get(f'{base_url}/api/v1/balance', headers=headers)
result = response.json()

if result['success']:
    print(f"رصيدك: {result['data']['balance']} {result['data']['currency']}")`,
      fullIntegration: `"""
صنف للتعامل مع DigiCards API
انسخ هذا الملف إلى مشروعك
"""
import requests
from typing import Optional, Dict, Any

class DigiCardsAPI:
    def __init__(self, api_key: str, api_secret: str):
        self.api_key = api_key
        self.api_secret = api_secret
        self.base_url = '${baseUrl}'
        
    def _get_headers(self) -> Dict[str, str]:
        return {
            'X-API-Key': self.api_key,
            'X-API-Secret': self.api_secret,
            'Content-Type': 'application/json'
        }
    
    def _request(self, endpoint: str, method: str = 'GET', 
                 data: Optional[Dict] = None) -> Dict[str, Any]:
        url = f'{self.base_url}{endpoint}'
        headers = self._get_headers()
        
        if method == 'GET':
            response = requests.get(url, headers=headers)
        else:
            response = requests.post(url, json=data, headers=headers)
        
        return {
            'status': response.status_code,
            'data': response.json()
        }
    
    def get_products(self) -> Dict[str, Any]:
        """الحصول على قائمة المنتجات"""
        return self._request('/api/v1/products')
    
    def purchase(self, product_id: str, quantity: int = 1) -> Dict[str, Any]:
        """شراء بطاقة"""
        return self._request('/api/v1/purchase', 'POST', {
            'product_id': product_id,
            'quantity': quantity
        })
    
    def get_balance(self) -> Dict[str, Any]:
        """التحقق من الرصيد"""
        return self._request('/api/v1/balance')


# مثال الاستخدام
if __name__ == '__main__':
    api = DigiCardsAPI('dk_your_key', 'ds_your_secret')
    
    # عرض المنتجات
    products = api.get_products()
    print(products)
    
    # شراء بطاقة
    order = api.purchase('product-uuid', 1)
    print(order)`
    },
    nodejs: {
      name: 'Node.js',
      color: 'bg-green-600',
      getProducts: `// الحصول على قائمة المنتجات
const axios = require('axios');

const apiKey = 'dk_your_api_key';
const apiSecret = 'ds_your_api_secret';
const baseUrl = '${baseUrl}';

async function getProducts() {
    try {
        const response = await axios.get(\`\${baseUrl}/api/v1/products\`, {
            headers: {
                'X-API-Key': apiKey,
                'X-API-Secret': apiSecret
            }
        });
        
        if (response.data.success) {
            response.data.data.forEach(product => {
                console.log(\`\${product.name} - \${product.price} ريال\`);
            });
        }
    } catch (error) {
        console.error('خطأ:', error.response?.data?.message);
    }
}

getProducts();`,
      purchase: `// شراء بطاقة
const axios = require('axios');

const apiKey = 'dk_your_api_key';
const apiSecret = 'ds_your_api_secret';
const baseUrl = '${baseUrl}';

async function purchaseCard(productId, quantity = 1) {
    try {
        const response = await axios.post(
            \`\${baseUrl}/api/v1/purchase\`,
            { product_id: productId, quantity },
            {
                headers: {
                    'X-API-Key': apiKey,
                    'X-API-Secret': apiSecret,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        if (response.data.success) {
            response.data.data.codes.forEach(code => {
                console.log(\`الكود: \${code.code}\`);
                console.log(\`الرقم التسلسلي: \${code.serial_number}\`);
            });
            console.log(\`الرصيد المتبقي: \${response.data.data.new_balance} ريال\`);
        }
    } catch (error) {
        console.error('خطأ:', error.response?.data?.message);
    }
}

purchaseCard('uuid-of-product', 1);`,
      balance: `// التحقق من الرصيد
const axios = require('axios');

const apiKey = 'dk_your_api_key';
const apiSecret = 'ds_your_api_secret';
const baseUrl = '${baseUrl}';

async function getBalance() {
    try {
        const response = await axios.get(\`\${baseUrl}/api/v1/balance\`, {
            headers: {
                'X-API-Key': apiKey,
                'X-API-Secret': apiSecret
            }
        });
        
        if (response.data.success) {
            console.log(\`رصيدك: \${response.data.data.balance} \${response.data.data.currency}\`);
        }
    } catch (error) {
        console.error('خطأ:', error.response?.data?.message);
    }
}

getBalance();`,
      fullIntegration: `/**
 * صنف للتعامل مع DigiCards API
 * انسخ هذا الملف إلى مشروعك
 */
const axios = require('axios');

class DigiCardsAPI {
    constructor(apiKey, apiSecret) {
        this.apiKey = apiKey;
        this.apiSecret = apiSecret;
        this.baseUrl = '${baseUrl}';
    }
    
    getHeaders() {
        return {
            'X-API-Key': this.apiKey,
            'X-API-Secret': this.apiSecret,
            'Content-Type': 'application/json'
        };
    }
    
    async request(endpoint, method = 'GET', data = null) {
        try {
            const config = {
                method,
                url: \`\${this.baseUrl}\${endpoint}\`,
                headers: this.getHeaders()
            };
            
            if (data) config.data = data;
            
            const response = await axios(config);
            return { status: response.status, data: response.data };
        } catch (error) {
            return { 
                status: error.response?.status || 500, 
                data: error.response?.data 
            };
        }
    }
    
    // الحصول على المنتجات
    async getProducts() {
        return this.request('/api/v1/products');
    }
    
    // شراء بطاقة
    async purchase(productId, quantity = 1) {
        return this.request('/api/v1/purchase', 'POST', {
            product_id: productId,
            quantity
        });
    }
    
    // التحقق من الرصيد
    async getBalance() {
        return this.request('/api/v1/balance');
    }
}

// مثال الاستخدام
async function main() {
    const api = new DigiCardsAPI('dk_your_key', 'ds_your_secret');
    
    // عرض المنتجات
    const products = await api.getProducts();
    console.log(products);
    
    // شراء بطاقة
    const order = await api.purchase('product-uuid', 1);
    console.log(order);
}

main();

module.exports = DigiCardsAPI;`
    },
    javascript: {
      name: 'JavaScript (Fetch)',
      color: 'bg-yellow-500',
      getProducts: `// الحصول على قائمة المنتجات (للمتصفح)
const apiKey = 'dk_your_api_key';
const apiSecret = 'ds_your_api_secret';
const baseUrl = '${baseUrl}';

async function getProducts() {
    const response = await fetch(\`\${baseUrl}/api/v1/products\`, {
        headers: {
            'X-API-Key': apiKey,
            'X-API-Secret': apiSecret
        }
    });
    
    const data = await response.json();
    
    if (data.success) {
        data.data.forEach(product => {
            console.log(\`\${product.name} - \${product.price} ريال\`);
        });
    }
}

getProducts();`,
      purchase: `// شراء بطاقة (للمتصفح)
const apiKey = 'dk_your_api_key';
const apiSecret = 'ds_your_api_secret';
const baseUrl = '${baseUrl}';

async function purchaseCard(productId, quantity = 1) {
    const response = await fetch(\`\${baseUrl}/api/v1/purchase\`, {
        method: 'POST',
        headers: {
            'X-API-Key': apiKey,
            'X-API-Secret': apiSecret,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ product_id: productId, quantity })
    });
    
    const result = await response.json();
    
    if (result.success) {
        result.data.codes.forEach(code => {
            console.log(\`الكود: \${code.code}\`);
            console.log(\`الرقم التسلسلي: \${code.serial_number}\`);
        });
        console.log(\`الرصيد المتبقي: \${result.data.new_balance} ريال\`);
    } else {
        console.error(\`خطأ: \${result.message}\`);
    }
}

purchaseCard('uuid-of-product', 1);`,
      balance: `// التحقق من الرصيد (للمتصفح)
const apiKey = 'dk_your_api_key';
const apiSecret = 'ds_your_api_secret';
const baseUrl = '${baseUrl}';

async function getBalance() {
    const response = await fetch(\`\${baseUrl}/api/v1/balance\`, {
        headers: {
            'X-API-Key': apiKey,
            'X-API-Secret': apiSecret
        }
    });
    
    const result = await response.json();
    
    if (result.success) {
        console.log(\`رصيدك: \${result.data.balance} \${result.data.currency}\`);
    }
}

getBalance();`,
      fullIntegration: `/**
 * صنف للتعامل مع DigiCards API (للمتصفح)
 * انسخ هذا الكود إلى مشروعك
 */
class DigiCardsAPI {
    constructor(apiKey, apiSecret) {
        this.apiKey = apiKey;
        this.apiSecret = apiSecret;
        this.baseUrl = '${baseUrl}';
    }
    
    async request(endpoint, method = 'GET', data = null) {
        const options = {
            method,
            headers: {
                'X-API-Key': this.apiKey,
                'X-API-Secret': this.apiSecret,
                'Content-Type': 'application/json'
            }
        };
        
        if (data) {
            options.body = JSON.stringify(data);
        }
        
        const response = await fetch(\`\${this.baseUrl}\${endpoint}\`, options);
        const result = await response.json();
        
        return { status: response.status, data: result };
    }
    
    // الحصول على المنتجات
    async getProducts() {
        return this.request('/api/v1/products');
    }
    
    // شراء بطاقة
    async purchase(productId, quantity = 1) {
        return this.request('/api/v1/purchase', 'POST', {
            product_id: productId,
            quantity
        });
    }
    
    // التحقق من الرصيد
    async getBalance() {
        return this.request('/api/v1/balance');
    }
}

// مثال الاستخدام
const api = new DigiCardsAPI('dk_your_key', 'ds_your_secret');

// عرض المنتجات
api.getProducts().then(console.log);

// شراء بطاقة
api.purchase('product-uuid', 1).then(console.log);`
    },
    wordpress: {
      name: 'WordPress',
      color: 'bg-blue-700',
      getProducts: `<?php
/**
 * DigiCards API - عرض المنتجات في ووردبريس
 * أضف هذا الكود في ملف functions.php أو إضافة مخصصة
 */

// إعدادات API
define('DIGICARDS_API_KEY', 'dk_your_api_key');
define('DIGICARDS_API_SECRET', 'ds_your_api_secret');
define('DIGICARDS_API_URL', '${baseUrl}');

// دالة للحصول على المنتجات
function digicards_get_products() {
    $response = wp_remote_get(DIGICARDS_API_URL . '/api/v1/products', array(
        'headers' => array(
            'X-API-Key' => DIGICARDS_API_KEY,
            'X-API-Secret' => DIGICARDS_API_SECRET,
            'Content-Type' => 'application/json'
        ),
        'timeout' => 30
    ));

    if (is_wp_error($response)) {
        return array('success' => false, 'message' => $response->get_error_message());
    }

    $body = wp_remote_retrieve_body($response);
    return json_decode($body, true);
}

// شورت كود لعرض المنتجات
add_shortcode('digicards_products', function() {
    $products = digicards_get_products();
    
    if (!$products['success']) {
        return '<p class="error">خطأ في تحميل المنتجات</p>';
    }
    
    $output = '<div class="digicards-products">';
    foreach ($products['data'] as $product) {
        $output .= '<div class="product-card">';
        $output .= '<h3>' . esc_html($product['name']) . '</h3>';
        $output .= '<p class="price">' . esc_html($product['price']) . ' ريال</p>';
        $output .= '<button onclick="purchaseCard(\\'' . esc_attr($product['id']) . '\\')">شراء</button>';
        $output .= '</div>';
    }
    $output .= '</div>';
    
    return $output;
});
?>`,
      purchase: `<?php
/**
 * DigiCards API - شراء البطاقات في ووردبريس
 * أضف هذا الكود مع كود المنتجات
 */

// دالة شراء بطاقة
function digicards_purchase($product_id, $quantity = 1) {
    $response = wp_remote_post(DIGICARDS_API_URL . '/api/v1/purchase', array(
        'headers' => array(
            'X-API-Key' => DIGICARDS_API_KEY,
            'X-API-Secret' => DIGICARDS_API_SECRET,
            'Content-Type' => 'application/json'
        ),
        'body' => json_encode(array(
            'product_id' => $product_id,
            'quantity' => $quantity
        )),
        'timeout' => 30
    ));

    if (is_wp_error($response)) {
        return array('success' => false, 'message' => $response->get_error_message());
    }

    $body = wp_remote_retrieve_body($response);
    return json_decode($body, true);
}

// معالج AJAX للشراء
add_action('wp_ajax_digicards_purchase', 'digicards_ajax_purchase');
add_action('wp_ajax_nopriv_digicards_purchase', 'digicards_ajax_purchase');

function digicards_ajax_purchase() {
    check_ajax_referer('digicards_nonce', 'nonce');
    
    $product_id = sanitize_text_field($_POST['product_id']);
    $quantity = intval($_POST['quantity'] ?? 1);
    
    $result = digicards_purchase($product_id, $quantity);
    
    if ($result['success']) {
        // حفظ الطلب في قاعدة البيانات
        global $wpdb;
        foreach ($result['data']['codes'] as $code) {
            $wpdb->insert(
                $wpdb->prefix . 'digicards_orders',
                array(
                    'user_id' => get_current_user_id(),
                    'product_id' => $product_id,
                    'code' => $code['code'],
                    'serial' => $code['serial_number'],
                    'created_at' => current_time('mysql')
                )
            );
        }
    }
    
    wp_send_json($result);
}
?>`,
      balance: `<?php
/**
 * DigiCards API - عرض الرصيد في ووردبريس
 */

// دالة للحصول على الرصيد
function digicards_get_balance() {
    $response = wp_remote_get(DIGICARDS_API_URL . '/api/v1/balance', array(
        'headers' => array(
            'X-API-Key' => DIGICARDS_API_KEY,
            'X-API-Secret' => DIGICARDS_API_SECRET
        ),
        'timeout' => 30
    ));

    if (is_wp_error($response)) {
        return array('success' => false, 'message' => $response->get_error_message());
    }

    $body = wp_remote_retrieve_body($response);
    return json_decode($body, true);
}

// شورت كود لعرض الرصيد (للمشرفين فقط)
add_shortcode('digicards_balance', function() {
    if (!current_user_can('manage_options')) {
        return '';
    }
    
    $balance = digicards_get_balance();
    
    if (!$balance['success']) {
        return '<p class="error">خطأ في تحميل الرصيد</p>';
    }
    
    return '<div class="digicards-balance">' .
           '<strong>رصيد API:</strong> ' . 
           esc_html($balance['data']['balance']) . ' ' . 
           esc_html($balance['data']['currency']) .
           '</div>';
});

// إضافة الرصيد في لوحة التحكم
add_action('wp_dashboard_setup', function() {
    wp_add_dashboard_widget(
        'digicards_balance_widget',
        'رصيد DigiCards',
        function() {
            $balance = digicards_get_balance();
            if ($balance['success']) {
                echo '<h2 style="font-size: 32px; color: #0073aa;">' . 
                     esc_html($balance['data']['balance']) . ' ' . 
                     esc_html($balance['data']['currency']) . '</h2>';
            } else {
                echo '<p>خطأ في تحميل الرصيد</p>';
            }
        }
    );
});
?>`,
      fullIntegration: `<?php
/**
 * Plugin Name: DigiCards API Integration
 * Description: إضافة ربط DigiCards API لبيع البطاقات الرقمية
 * Version: 1.0.0
 * Author: DigiCards
 * Text Domain: digicards
 */

if (!defined('ABSPATH')) exit;

class DigiCards_Plugin {
    
    private $api_key;
    private $api_secret;
    private $api_url = '${baseUrl}';
    
    public function __construct() {
        $this->api_key = get_option('digicards_api_key', '');
        $this->api_secret = get_option('digicards_api_secret', '');
        
        add_action('admin_menu', array($this, 'add_admin_menu'));
        add_action('admin_init', array($this, 'register_settings'));
        add_action('wp_enqueue_scripts', array($this, 'enqueue_scripts'));
        add_action('wp_ajax_digicards_purchase', array($this, 'ajax_purchase'));
        add_action('wp_ajax_nopriv_digicards_purchase', array($this, 'ajax_purchase'));
        
        add_shortcode('digicards_products', array($this, 'products_shortcode'));
        add_shortcode('digicards_balance', array($this, 'balance_shortcode'));
    }
    
    // إضافة صفحة الإعدادات
    public function add_admin_menu() {
        add_options_page(
            'إعدادات DigiCards',
            'DigiCards API',
            'manage_options',
            'digicards-settings',
            array($this, 'settings_page')
        );
    }
    
    public function register_settings() {
        register_setting('digicards_settings', 'digicards_api_key');
        register_setting('digicards_settings', 'digicards_api_secret');
    }
    
    public function settings_page() {
        ?>
        <div class="wrap" dir="rtl">
            <h1>إعدادات DigiCards API</h1>
            <form method="post" action="options.php">
                <?php settings_fields('digicards_settings'); ?>
                <table class="form-table">
                    <tr>
                        <th scope="row">مفتاح API</th>
                        <td>
                            <input type="text" name="digicards_api_key" 
                                   value="<?php echo esc_attr(get_option('digicards_api_key')); ?>" 
                                   class="regular-text" placeholder="dk_xxxx" />
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">المفتاح السري</th>
                        <td>
                            <input type="password" name="digicards_api_secret" 
                                   value="<?php echo esc_attr(get_option('digicards_api_secret')); ?>" 
                                   class="regular-text" placeholder="ds_xxxx" />
                        </td>
                    </tr>
                </table>
                <?php submit_button('حفظ الإعدادات'); ?>
            </form>
            
            <h2>طريقة الاستخدام</h2>
            <p>استخدم الشورت كودات التالية في صفحاتك:</p>
            <ul>
                <li><code>[digicards_products]</code> - عرض قائمة المنتجات</li>
                <li><code>[digicards_balance]</code> - عرض الرصيد (للمشرفين)</li>
            </ul>
        </div>
        <?php
    }
    
    // طلب API
    private function api_request($endpoint, $method = 'GET', $data = null) {
        $args = array(
            'headers' => array(
                'X-API-Key' => $this->api_key,
                'X-API-Secret' => $this->api_secret,
                'Content-Type' => 'application/json'
            ),
            'timeout' => 30
        );
        
        if ($method === 'POST' && $data) {
            $args['body'] = json_encode($data);
            $response = wp_remote_post($this->api_url . $endpoint, $args);
        } else {
            $response = wp_remote_get($this->api_url . $endpoint, $args);
        }
        
        if (is_wp_error($response)) {
            return array('success' => false, 'message' => $response->get_error_message());
        }
        
        return json_decode(wp_remote_retrieve_body($response), true);
    }
    
    // الحصول على المنتجات
    public function get_products() {
        return $this->api_request('/api/v1/products');
    }
    
    // شراء بطاقة
    public function purchase($product_id, $quantity = 1) {
        return $this->api_request('/api/v1/purchase', 'POST', array(
            'product_id' => $product_id,
            'quantity' => $quantity
        ));
    }
    
    // الحصول على الرصيد
    public function get_balance() {
        return $this->api_request('/api/v1/balance');
    }
    
    // شورت كود المنتجات
    public function products_shortcode($atts) {
        $products = $this->get_products();
        
        if (!$products['success']) {
            return '<div class="digicards-error">خطأ في تحميل المنتجات</div>';
        }
        
        ob_start();
        ?>
        <div class="digicards-products" dir="rtl">
            <?php foreach ($products['data'] as $product): ?>
            <div class="digicards-product">
                <h3><?php echo esc_html($product['name']); ?></h3>
                <div class="price"><?php echo esc_html($product['price']); ?> ريال</div>
                <div class="stock">المتوفر: <?php echo esc_html($product['available_stock']); ?></div>
                <button class="digicards-buy" data-id="<?php echo esc_attr($product['id']); ?>">
                    شراء الآن
                </button>
            </div>
            <?php endforeach; ?>
        </div>
        <?php
        return ob_get_clean();
    }
    
    // شورت كود الرصيد
    public function balance_shortcode() {
        if (!current_user_can('manage_options')) return '';
        
        $balance = $this->get_balance();
        if (!$balance['success']) return '<div class="error">خطأ</div>';
        
        return '<div class="digicards-balance">الرصيد: ' . 
               esc_html($balance['data']['balance']) . ' ' . 
               esc_html($balance['data']['currency']) . '</div>';
    }
    
    // معالج AJAX
    public function ajax_purchase() {
        check_ajax_referer('digicards_nonce', 'nonce');
        
        $product_id = sanitize_text_field($_POST['product_id']);
        $result = $this->purchase($product_id, 1);
        
        wp_send_json($result);
    }
    
    // تحميل الأصول
    public function enqueue_scripts() {
        wp_enqueue_style('digicards-style', plugins_url('style.css', __FILE__));
        wp_enqueue_script('digicards-script', plugins_url('script.js', __FILE__), array('jquery'), '1.0', true);
        wp_localize_script('digicards-script', 'digicards', array(
            'ajax_url' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('digicards_nonce')
        ));
    }
}

// تشغيل الإضافة
new DigiCards_Plugin();

/**
 * CSS (style.css):
 * 
 * .digicards-products { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 20px; }
 * .digicards-product { background: #fff; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); text-align: center; }
 * .digicards-product h3 { margin: 0 0 10px; color: #333; }
 * .digicards-product .price { font-size: 24px; font-weight: bold; color: #0073aa; margin: 10px 0; }
 * .digicards-buy { background: #0073aa; color: #fff; border: none; padding: 10px 30px; border-radius: 5px; cursor: pointer; }
 * .digicards-buy:hover { background: #005a87; }
 */

/**
 * JavaScript (script.js):
 * 
 * jQuery(document).ready(function($) {
 *     $('.digicards-buy').on('click', function() {
 *         var productId = $(this).data('id');
 *         var button = $(this);
 *         
 *         button.prop('disabled', true).text('جاري الشراء...');
 *         
 *         $.post(digicards.ajax_url, {
 *             action: 'digicards_purchase',
 *             nonce: digicards.nonce,
 *             product_id: productId
 *         }, function(response) {
 *             if (response.success) {
 *                 var codes = response.data.codes.map(c => c.code).join('\\n');
 *                 alert('تم الشراء بنجاح!\\n\\nالأكواد:\\n' + codes);
 *             } else {
 *                 alert('خطأ: ' + response.message);
 *             }
 *             button.prop('disabled', false).text('شراء الآن');
 *         });
 *     });
 * });
 */
?>`
    },
    zid: {
      name: 'Zid (زد)',
      color: 'bg-emerald-600',
      getProducts: `/**
 * ربط DigiCards API مع منصة زد
 * الخطوات:
 * 1. ادخل لوحة تحكم زد
 * 2. اذهب إلى: الإعدادات > التكاملات > Webhooks
 * 3. أضف Webhook جديد للطلبات الجديدة
 */

// في تطبيقك أو خادمك، استقبل Webhook من زد
app.post('/webhooks/zid-order', async (req, res) => {
  const order = req.body;
  
  // تحقق من المنتج إذا كان بطاقة رقمية
  if (order.products.some(p => p.sku.startsWith('DIGICARDS_'))) {
    const productId = order.products[0].sku.replace('DIGICARDS_', '');
    
    // اشتري البطاقة من DigiCards
    const response = await fetch('${baseUrl}/api/v1/purchase', {
      method: 'POST',
      headers: {
        'X-API-Key': 'dk_your_api_key',
        'X-API-Secret': 'ds_your_api_secret',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        product_id: productId,
        quantity: order.products[0].quantity
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      // أرسل الكود للعميل عبر البريد أو SMS
      await sendCodeToCustomer(order.customer.email, result.data.codes);
    }
  }
  
  res.json({ received: true });
});`,
      purchase: `/**
 * إعداد المنتجات في زد
 * 
 * 1. أنشئ منتج جديد في زد
 * 2. اجعل SKU = DIGICARDS_[product_uuid]
 *    مثال: DIGICARDS_abc123-def456
 * 3. فعّل "منتج رقمي" في إعدادات المنتج
 * 
 * عند شراء العميل، سيتم:
 * - استلام Webhook من زد
 * - شراء البطاقة تلقائياً من DigiCards
 * - إرسال الكود للعميل
 */

// دالة إرسال الكود للعميل
async function sendCodeToCustomer(email, codes) {
  // استخدم خدمة البريد الإلكتروني الخاصة بك
  await sendEmail({
    to: email,
    subject: 'تم استلام طلبك - كود البطاقة',
    html: \`
      <div dir="rtl" style="font-family: Arial;">
        <h2>شكراً لطلبك!</h2>
        <p>إليك كود البطاقة الخاص بك:</p>
        \${codes.map(c => \`
          <div style="background: #f0f0f0; padding: 15px; margin: 10px 0; border-radius: 8px;">
            <strong>الكود:</strong> \${c.code}<br>
            <strong>الرقم التسلسلي:</strong> \${c.serial_number || 'غير متوفر'}
          </div>
        \`).join('')}
      </div>
    \`
  });
}`
    },
    salla: {
      name: 'Salla (سلة)',
      color: 'bg-purple-600',
      getProducts: `/**
 * ربط DigiCards API مع منصة سلة
 * 
 * الخطوات:
 * 1. ادخل لوحة تحكم سلة
 * 2. اذهب إلى: التطبيقات > تطبيقاتي
 * 3. أنشئ تطبيق جديد أو استخدم Webhooks
 * 4. أضف Webhook لحدث "طلب جديد"
 */

// Webhook endpoint لاستقبال الطلبات من سلة
app.post('/webhooks/salla-order', async (req, res) => {
  const { event, data } = req.body;
  
  if (event === 'order.created') {
    const order = data;
    
    // تحقق من المنتجات الرقمية
    for (const item of order.items) {
      if (item.sku && item.sku.startsWith('DC_')) {
        const productId = item.sku.replace('DC_', '');
        
        // شراء من DigiCards API
        const result = await purchaseFromDigiCards(productId, item.quantity);
        
        if (result.success) {
          // إرسال الكود للعميل
          await notifyCustomer(order.customer, result.data.codes);
        }
      }
    }
  }
  
  res.status(200).json({ success: true });
});

async function purchaseFromDigiCards(productId, quantity) {
  const response = await fetch('${baseUrl}/api/v1/purchase', {
    method: 'POST',
    headers: {
      'X-API-Key': process.env.DIGICARDS_API_KEY,
      'X-API-Secret': process.env.DIGICARDS_API_SECRET,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ product_id: productId, quantity })
  });
  
  return response.json();
}`,
      purchase: `/**
 * إعداد منتجات سلة للعمل مع DigiCards
 * 
 * 1. أنشئ منتج رقمي في سلة
 * 2. في حقل SKU، أدخل: DC_[معرف_المنتج_من_DigiCards]
 * 3. مثال: DC_550e8400-e29b-41d4-a716-446655440000
 * 
 * إعدادات Webhook في سلة:
 * - URL: https://yourserver.com/webhooks/salla-order
 * - الأحداث: order.created, order.updated
 * - Secret: أنشئ مفتاح سري للتحقق
 */

// التحقق من توقيع Webhook (للأمان)
function verifySallaWebhook(req, secret) {
  const signature = req.headers['x-salla-signature'];
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(req.body))
    .digest('hex');
  
  return signature === expectedSignature;
}

// إرسال إشعار للعميل
async function notifyCustomer(customer, codes) {
  // إرسال SMS عبر خدمة مثل Twilio أو Unifonic
  if (customer.mobile) {
    await sendSMS(customer.mobile, 
      \`تم تفعيل طلبك! كود البطاقة: \${codes[0].code}\`
    );
  }
  
  // إرسال بريد إلكتروني
  if (customer.email) {
    await sendEmail({
      to: customer.email,
      subject: 'كود البطاقة الرقمية',
      body: codes.map(c => \`الكود: \${c.code}\`).join('\\n')
    });
  }
}`
    },
    dashu: {
      name: 'Dashu (دشو)',
      color: 'bg-orange-600',
      getProducts: `/**
 * ربط DigiCards API مع منصة دشو
 * 
 * دشو تدعم تكامل API للمنتجات الرقمية
 * 
 * الخطوات:
 * 1. سجل دخول إلى لوحة تحكم دشو
 * 2. اذهب إلى: الإعدادات > التكاملات
 * 3. فعّل "API للمنتجات الرقمية"
 * 4. أضف رابط Webhook الخاص بك
 */

// استقبال طلبات دشو
app.post('/webhooks/dashu', async (req, res) => {
  const { type, order } = req.body;
  
  if (type === 'order.completed') {
    // معالجة الطلب
    for (const product of order.products) {
      // تحقق إذا كان المنتج من DigiCards
      if (product.metadata?.digicards_id) {
        const result = await fetch('${baseUrl}/api/v1/purchase', {
          method: 'POST',
          headers: {
            'X-API-Key': 'dk_your_api_key',
            'X-API-Secret': 'ds_your_api_secret',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            product_id: product.metadata.digicards_id,
            quantity: product.quantity
          })
        }).then(r => r.json());
        
        if (result.success) {
          // حفظ الكود في الطلب
          await updateDashuOrder(order.id, {
            digital_codes: result.data.codes
          });
        }
      }
    }
  }
  
  res.json({ ok: true });
});`,
      purchase: `/**
 * إعداد المنتجات في دشو
 * 
 * 1. أنشئ منتج جديد من نوع "رقمي"
 * 2. في "البيانات الإضافية" (metadata):
 *    digicards_id: "معرف_المنتج_من_DigiCards"
 * 
 * 3. اختر طريقة التسليم: "تلقائي عبر API"
 * 
 * مميزات دشو للمنتجات الرقمية:
 * - عرض الكود مباشرة بعد الدفع
 * - إرسال تلقائي عبر البريد
 * - سجل الأكواد المباعة
 */

// دالة تحديث الطلب في دشو بالأكواد
async function updateDashuOrder(orderId, data) {
  // استخدم API دشو لتحديث الطلب
  await fetch(\`https://api.dashu.sa/v1/orders/\${orderId}\`, {
    method: 'PATCH',
    headers: {
      'Authorization': 'Bearer ' + process.env.DASHU_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      fulfillment_status: 'fulfilled',
      notes: 'تم تسليم الكود تلقائياً',
      ...data
    })
  });
}

// عرض الأكواد للعميل في صفحة الطلب
function renderDigitalCodes(codes) {
  return \`
    <div class="digital-codes" dir="rtl">
      <h3>🎉 تم تفعيل طلبك!</h3>
      \${codes.map(code => \`
        <div class="code-card">
          <p><strong>الكود:</strong></p>
          <code>\${code.code}</code>
          <button onclick="copyCode('\${code.code}')">نسخ الكود</button>
        </div>
      \`).join('')}
    </div>
  \`;
}`
    }
  }

  const errorCodes = [
    { code: 401, message: 'Unauthorized', description: 'مفاتيح API غير صحيحة أو منتهية الصلاحية', solution: 'تحقق من مفتاح API والمفتاح السري' },
    { code: 402, message: 'Insufficient Balance', description: 'رصيد المحفظة غير كافٍ', solution: 'اشحن رصيد محفظتك' },
    { code: 404, message: 'Product Not Found', description: 'المنتج غير موجود أو غير متاح', solution: 'تحقق من معرف المنتج' },
    { code: 409, message: 'Out of Stock', description: 'المنتج غير متوفر حالياً', solution: 'جرب منتج آخر أو انتظر التوفر' },
    { code: 429, message: 'Rate Limited', description: 'تجاوزت حد الطلبات المسموح', solution: 'انتظر دقيقة ثم حاول مجدداً' },
    { code: 500, message: 'Server Error', description: 'خطأ في الخادم', solution: 'تواصل مع الدعم الفني' }
  ]

  const CodeBlock = ({ code, id, language }) => (
    <div className="relative group">
      <pre className="bg-gray-900 p-4 rounded-lg overflow-x-auto text-sm text-gray-100 leading-relaxed">
        {code}
      </pre>
      <button
        onClick={() => copyToClipboard(code, id)}
        className="absolute top-2 left-2 bg-gray-700 hover:bg-gray-600 p-2 rounded-lg opacity-0 group-hover:opacity-100 transition"
      >
        {copiedCode === id ? (
          <CheckCircle className="w-4 h-4 text-green-400" />
        ) : (
          <Copy className="w-4 h-4 text-gray-300" />
        )}
      </button>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900" dir="rtl">
      <nav className="bg-gray-800/80 backdrop-blur-sm border-b border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">دليل ربط API</h1>
              <p className="text-xs text-gray-400">للموزعين والمطورين</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Link to="/api-docs" className="text-gray-400 hover:text-white transition text-sm">
              وثائق API
            </Link>
            <Link to="/" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition text-sm">
              الرئيسية
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-blue-500/20 text-blue-400 px-4 py-2 rounded-full text-sm mb-4">
            <Play className="w-4 h-4" />
            <span>فيديو تعليمي مكتوب</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            كيف تربط موقعك بـ <span className="text-blue-400">DigiCards API</span>
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            دليل شامل خطوة بخطوة لربط موقعك الإلكتروني وبيع البطاقات الرقمية تلقائياً
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-2 mb-12">
          {steps.map((step, index) => (
            <button
              key={step.id}
              onClick={() => setActiveStep(step.id)}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl transition ${
                activeStep === step.id 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                activeStep === step.id ? 'bg-white/20' : 'bg-gray-700'
              }`}>
                {step.id}
              </span>
              <span className="hidden md:block">{step.title}</span>
            </button>
          ))}
        </div>

        <div className="bg-gray-800/50 rounded-2xl border border-gray-700 p-6 md:p-8 mb-12">
          {activeStep === 1 && (
            <div className="space-y-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center">
                  <Settings className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">الخطوة 1: إنشاء حساب موزع</h2>
                  <p className="text-gray-400">سجل حساب جديد وفعل صلاحيات الموزع</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-700">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <span className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-xs">1</span>
                    سجل حساب جديد
                  </h3>
                  <ul className="space-y-3 text-gray-300">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                      <span>اذهب لصفحة التسجيل واملأ البيانات</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                      <span>اختر "موزع" كنوع الحساب</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                      <span>فعّل حسابك من رسالة التأكيد</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-700">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <span className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-xs">2</span>
                    تفعيل صلاحيات الموزع
                  </h3>
                  <ul className="space-y-3 text-gray-300">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                      <span>اذهب للوحة التحكم</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                      <span>انقر على "الانضمام كموزع"</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                      <span>انتظر موافقة الإدارة</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-500 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-yellow-500">ملاحظة مهمة</h4>
                    <p className="text-gray-300 text-sm">يجب الموافقة على طلبك كموزع قبل الحصول على مفاتيح API</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeStep === 2 && (
            <div className="space-y-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-2xl flex items-center justify-center">
                  <Key className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">الخطوة 2: الحصول على مفاتيح API</h2>
                  <p className="text-gray-400">احصل على مفتاح API والمفتاح السري</p>
                </div>
              </div>

              <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-700">
                <h3 className="text-lg font-bold text-white mb-4">من لوحة التحكم</h3>
                <ol className="space-y-4 text-gray-300">
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-sm flex-shrink-0">1</span>
                    <span>اذهب إلى <code className="bg-gray-800 px-2 py-1 rounded text-blue-400">لوحة التحكم</code> → <code className="bg-gray-800 px-2 py-1 rounded text-blue-400">إعدادات API</code></span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-sm flex-shrink-0">2</span>
                    <span>ستجد مفتاحين:
                      <ul className="mt-2 mr-4 space-y-1">
                        <li>• <strong className="text-yellow-400">API Key:</strong> يبدأ بـ <code className="bg-gray-800 px-2 py-1 rounded">dk_</code></li>
                        <li>• <strong className="text-yellow-400">API Secret:</strong> يبدأ بـ <code className="bg-gray-800 px-2 py-1 rounded">ds_</code></li>
                      </ul>
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-sm flex-shrink-0">3</span>
                    <span>انسخ المفاتيح واحفظها في مكان آمن</span>
                  </li>
                </ol>
              </div>

              <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-700">
                <h3 className="text-lg font-bold text-white mb-4">كيف تستخدم المفاتيح</h3>
                <CodeBlock
                  id="headers"
                  code={`// أضف هذه الـ Headers في كل طلب
X-API-Key: dk_xxxxxxxxxxxxxxxxxxxx
X-API-Secret: ds_xxxxxxxxxxxxxxxxxxxx
Content-Type: application/json`}
                />
              </div>

              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-red-500">تحذير أمني</h4>
                    <p className="text-gray-300 text-sm">لا تشارك مفاتيحك مع أي شخص. إذا تسربت، يمكنك إعادة توليدها من لوحة التحكم.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeStep === 3 && (
            <div className="space-y-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center">
                  <Wallet className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">الخطوة 3: شحن المحفظة</h2>
                  <p className="text-gray-400">اشحن رصيدك لتتمكن من الشراء عبر API</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-700">
                  <h3 className="text-lg font-bold text-white mb-4">طرق الشحن المتاحة</h3>
                  <ul className="space-y-3 text-gray-300">
                    <li className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg">
                      <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                        <span className="text-lg">🏦</span>
                      </div>
                      <span>تحويل بنكي</span>
                    </li>
                    <li className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg">
                      <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                        <span className="text-lg">💳</span>
                      </div>
                      <span>بطاقة ائتمانية</span>
                    </li>
                    <li className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg">
                      <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                        <span className="text-lg">📱</span>
                      </div>
                      <span>Apple Pay / مدى</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-700">
                  <h3 className="text-lg font-bold text-white mb-4">الحد الأدنى للشحن</h3>
                  <div className="text-center py-6">
                    <div className="text-5xl font-bold text-green-400 mb-2">100</div>
                    <div className="text-gray-400">ريال سعودي</div>
                  </div>
                  <p className="text-sm text-gray-400 text-center">
                    كلما زاد رصيدك، حصلت على خصومات أكبر!
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeStep === 4 && (
            <div className="space-y-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center">
                  <Zap className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">الخطوة 4: اختبار الاتصال</h2>
                  <p className="text-gray-400">تأكد من عمل الربط بشكل صحيح</p>
                </div>
              </div>

              <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-700">
                <h3 className="text-lg font-bold text-white mb-4">اختبار سريع باستخدام cURL</h3>
                <CodeBlock
                  id="test-curl"
                  code={`# اختبر الاتصال بتشغيل هذا الأمر في Terminal
curl -X GET "${baseUrl}/api/v1/balance" \\
  -H "X-API-Key: dk_your_api_key" \\
  -H "X-API-Secret: ds_your_api_secret"

# إذا نجح الاتصال، ستحصل على:
{
  "success": true,
  "data": {
    "balance": 1000.00,
    "currency": "SAR"
  }
}`}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <h4 className="font-bold text-green-500">نجاح الاتصال</h4>
                  </div>
                  <p className="text-gray-300 text-sm">إذا حصلت على <code className="bg-gray-800 px-1 rounded">"success": true</code></p>
                </div>
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                    <h4 className="font-bold text-red-500">فشل الاتصال</h4>
                  </div>
                  <p className="text-gray-300 text-sm">تحقق من المفاتيح وراجع قسم الأخطاء</p>
                </div>
              </div>
            </div>
          )}

          {activeStep === 5 && (
            <div className="space-y-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center">
                  <Globe className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">الخطوة 5: دمج API في موقعك</h2>
                  <p className="text-gray-400">انسخ الكود الجاهز واستخدمه في مشروعك</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-6">
                {Object.entries(codeExamples).map(([key, lang]) => (
                  <button
                    key={key}
                    onClick={() => setActiveLanguage(key)}
                    className={`px-4 py-2 rounded-lg font-medium transition ${
                      activeLanguage === key
                        ? `${lang.color} text-white`
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {lang.name}
                  </button>
                ))}
              </div>

              <div className="space-y-6">
                <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-700">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <FileCode className="w-5 h-5 text-blue-400" />
                    الحصول على المنتجات
                  </h3>
                  <CodeBlock
                    id={`${activeLanguage}-products`}
                    code={codeExamples[activeLanguage].getProducts}
                    language={activeLanguage}
                  />
                </div>

                <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-700">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5 text-purple-400" />
                    شراء بطاقة
                  </h3>
                  <CodeBlock
                    id={`${activeLanguage}-purchase`}
                    code={codeExamples[activeLanguage].purchase}
                    language={activeLanguage}
                  />
                </div>

                <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-700">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-green-400" />
                    التحقق من الرصيد
                  </h3>
                  <CodeBlock
                    id={`${activeLanguage}-balance`}
                    code={codeExamples[activeLanguage].balance}
                    language={activeLanguage}
                  />
                </div>

                <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-xl p-6 border border-blue-500/30">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Code className="w-5 h-5 text-yellow-400" />
                    الكود الكامل الجاهز للاستخدام
                  </h3>
                  <p className="text-gray-300 mb-4">انسخ هذا الصنف واستخدمه مباشرة في مشروعك:</p>
                  <CodeBlock
                    id={`${activeLanguage}-full`}
                    code={codeExamples[activeLanguage].fullIntegration}
                    language={activeLanguage}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="bg-gray-800/50 rounded-2xl border border-gray-700 p-6 md:p-8 mb-12">
          <button
            onClick={() => setExpandedSection(expandedSection === 'errors' ? '' : 'errors')}
            className="w-full flex items-center justify-between text-xl font-bold text-white"
          >
            <span className="flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-red-400" />
              أكواد الأخطاء وكيفية التعامل معها
            </span>
            {expandedSection === 'errors' ? <ChevronUp /> : <ChevronDown />}
          </button>
          
          {expandedSection === 'errors' && (
            <div className="mt-6 overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-right py-3 px-4 text-gray-400 font-medium">الكود</th>
                    <th className="text-right py-3 px-4 text-gray-400 font-medium">الرسالة</th>
                    <th className="text-right py-3 px-4 text-gray-400 font-medium">الوصف</th>
                    <th className="text-right py-3 px-4 text-gray-400 font-medium">الحل</th>
                  </tr>
                </thead>
                <tbody>
                  {errorCodes.map(error => (
                    <tr key={error.code} className="border-b border-gray-700/50">
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded text-sm font-mono ${
                          error.code >= 500 ? 'bg-red-500/20 text-red-400' :
                          error.code >= 400 ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-green-500/20 text-green-400'
                        }`}>
                          {error.code}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-300 font-mono text-sm">{error.message}</td>
                      <td className="py-3 px-4 text-gray-400">{error.description}</td>
                      <td className="py-3 px-4 text-green-400 text-sm">{error.solution}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">هل تحتاج مساعدة؟</h2>
          <p className="text-blue-100 mb-6 max-w-xl mx-auto">
            فريق الدعم الفني جاهز لمساعدتك في ربط API مع موقعك
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              to="/api-docs"
              className="bg-white text-blue-600 hover:bg-blue-50 px-6 py-3 rounded-xl font-bold transition"
            >
              وثائق API الكاملة
            </Link>
            <a
              href="https://wa.me/966500000000"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-xl font-bold transition"
            >
              تواصل عبر واتساب
            </a>
          </div>
        </div>
      </div>

      <footer className="bg-gray-900 border-t border-gray-800 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 text-center text-gray-500 text-sm">
          <p>جميع الحقوق محفوظة Alameri Digital 2024</p>
        </div>
      </footer>
    </div>
  )
}
