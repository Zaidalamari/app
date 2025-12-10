import { Link } from 'react-router-dom'
import { Code, Key, ShoppingCart, Wallet, List } from 'lucide-react'

export default function ApiDocs({ user }) {
  const baseUrl = window.location.origin

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <nav className="bg-gray-800 p-4">
        <div className="container mx-auto flex justify-between items-center">
          <Link to="/" className="text-2xl font-bold text-blue-400">DigiCards API</Link>
          <div className="flex gap-4">
            <Link to="/api-tutorial" className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg transition">دليل الربط المصور</Link>
            <Link to="/" className="hover:text-blue-400">الرئيسية</Link>
            {user && <Link to="/dashboard" className="hover:text-blue-400">لوحة التحكم</Link>}
          </div>
        </div>
      </nav>

      <div className="container mx-auto p-6">
        <h1 className="text-4xl font-bold mb-8">وثائق API</h1>
        
        <div className="bg-gray-800 rounded-xl p-6 mb-8">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <Key className="text-yellow-400" /> المصادقة
          </h2>
          <p className="text-gray-300 mb-4">يجب إضافة مفاتيح API في كل طلب:</p>
          <pre className="bg-gray-900 p-4 rounded-lg overflow-x-auto">
{`Headers:
X-API-Key: dk_your_api_key_here
X-API-Secret: ds_your_api_secret_here`}
          </pre>
        </div>

        <div className="bg-gray-800 rounded-xl p-6 mb-8">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <List className="text-blue-400" /> الحصول على المنتجات
          </h2>
          <div className="mb-4">
            <span className="bg-green-600 px-3 py-1 rounded text-sm font-bold">GET</span>
            <code className="mr-2 text-green-400">/api/v1/products</code>
          </div>
          <p className="text-gray-300 mb-4">الاستجابة:</p>
          <pre className="bg-gray-900 p-4 rounded-lg overflow-x-auto text-sm">
{`{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "بطاقة ايتونز 10$",
      "price": 40.00,
      "available_stock": 100,
      "category_name": "بطاقات الألعاب"
    }
  ]
}`}
          </pre>
        </div>

        <div className="bg-gray-800 rounded-xl p-6 mb-8">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <ShoppingCart className="text-purple-400" /> شراء بطاقة
          </h2>
          <div className="mb-4">
            <span className="bg-yellow-600 px-3 py-1 rounded text-sm font-bold">POST</span>
            <code className="mr-2 text-yellow-400">/api/v1/purchase</code>
          </div>
          <p className="text-gray-300 mb-2">الطلب:</p>
          <pre className="bg-gray-900 p-4 rounded-lg overflow-x-auto text-sm mb-4">
{`{
  "product_id": "uuid-of-product",
  "quantity": 1
}`}
          </pre>
          <p className="text-gray-300 mb-2">الاستجابة:</p>
          <pre className="bg-gray-900 p-4 rounded-lg overflow-x-auto text-sm">
{`{
  "success": true,
  "data": {
    "order_id": "uuid",
    "codes": [
      { "code": "XXXX-XXXX-XXXX", "serial_number": "123456" }
    ],
    "new_balance": 960.00
  }
}`}
          </pre>
        </div>

        <div className="bg-gray-800 rounded-xl p-6 mb-8">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <Wallet className="text-green-400" /> رصيد المحفظة
          </h2>
          <div className="mb-4">
            <span className="bg-green-600 px-3 py-1 rounded text-sm font-bold">GET</span>
            <code className="mr-2 text-green-400">/api/v1/balance</code>
          </div>
          <pre className="bg-gray-900 p-4 rounded-lg overflow-x-auto text-sm">
{`{
  "success": true,
  "data": {
    "balance": 1000.00,
    "currency": "SAR"
  }
}`}
          </pre>
        </div>

        <div className="bg-gray-800 rounded-xl p-6">
          <h2 className="text-2xl font-bold mb-4">مثال باستخدام cURL</h2>
          <pre className="bg-gray-900 p-4 rounded-lg overflow-x-auto text-sm">
{`curl -X POST ${baseUrl}/api/v1/purchase \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: dk_your_api_key" \\
  -H "X-API-Secret: ds_your_api_secret" \\
  -d '{"product_id": "uuid", "quantity": 1}'`}
          </pre>
        </div>
      </div>
    </div>
  )
}
