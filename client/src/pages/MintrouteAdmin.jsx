import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { 
  CreditCard, Plus, RefreshCw, Package, Layers, 
  ArrowLeft, CheckCircle, XCircle, DollarSign,
  Search, Upload, ShoppingCart, AlertCircle
} from 'lucide-react'

export default function MintrouteAdmin() {
  const [connectionStatus, setConnectionStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('products')
  const [categories, setCategories] = useState([])
  const [brands, setBrands] = useState([])
  const [denominations, setDenominations] = useState([])
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [selectedBrand, setSelectedBrand] = useState(null)
  const [balance, setBalance] = useState(null)
  const [orders, setOrders] = useState([])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [importing, setImporting] = useState(false)
  const [selectedProducts, setSelectedProducts] = useState([])
  const [stockCheckEan, setStockCheckEan] = useState('')
  const [stockResult, setStockResult] = useState(null)

  const token = localStorage.getItem('token')
  const headers = { Authorization: `Bearer ${token}` }

  useEffect(() => {
    checkConnection()
  }, [])

  const checkConnection = async () => {
    try {
      const res = await axios.get('/api/mintroute/status', { headers })
      setConnectionStatus(res.data)
      if (res.data.connected) {
        loadBalance()
      }
      setLoading(false)
    } catch (err) {
      setConnectionStatus({ connected: false, message: 'خطأ في الاتصال' })
      setLoading(false)
    }
  }

  const loadBalance = async () => {
    try {
      const res = await axios.get('/api/mintroute/balance', { headers })
      if (res.data.success) {
        setBalance(res.data.balance)
      }
    } catch (err) {
      console.log('Unable to fetch balance')
    }
  }

  const loadCategories = async () => {
    try {
      const res = await axios.get('/api/mintroute/categories', { headers })
      if (res.data.success) {
        setCategories(res.data.categories)
      }
    } catch (err) {
      setError('خطأ في تحميل الفئات')
    }
  }

  const loadBrands = async (categoryId = null) => {
    try {
      const url = categoryId 
        ? `/api/mintroute/brands?category_id=${categoryId}` 
        : '/api/mintroute/brands'
      const res = await axios.get(url, { headers })
      if (res.data.success) {
        setBrands(res.data.brands)
      }
    } catch (err) {
      setError('خطأ في تحميل العلامات التجارية')
    }
  }

  const loadDenominations = async (brandId) => {
    try {
      const res = await axios.get(`/api/mintroute/denominations?brand_id=${brandId}`, { headers })
      if (res.data.success) {
        setDenominations(res.data.denominations)
      }
    } catch (err) {
      setError('خطأ في تحميل الفئات السعرية')
    }
  }

  const loadOrders = async () => {
    try {
      const res = await axios.get('/api/mintroute/orders', { headers })
      if (res.data.success) {
        setOrders(res.data.orders)
      }
    } catch (err) {
      setError('خطأ في تحميل الطلبات')
    }
  }

  const checkStock = async () => {
    if (!stockCheckEan) return
    try {
      const res = await axios.post('/api/mintroute/check-stock', { ean: stockCheckEan }, { headers })
      setStockResult(res.data)
    } catch (err) {
      setStockResult({ available: false, message: err.response?.data?.message || 'خطأ' })
    }
  }

  const toggleProductSelection = (product) => {
    setSelectedProducts(prev => {
      const exists = prev.find(p => p.ean === product.ean)
      if (exists) {
        return prev.filter(p => p.ean !== product.ean)
      }
      return [...prev, product]
    })
  }

  const importSelectedProducts = async () => {
    if (selectedProducts.length === 0) {
      setError('اختر منتجات للاستيراد')
      return
    }

    setImporting(true)
    try {
      const products = selectedProducts.map(p => ({
        name: p.name || p.denomination_name,
        description: `${p.brand_name} - ${p.denomination_value} ${p.denomination_currency}`,
        price: parseFloat(p.selling_price || p.denomination_value) * 3.75,
        cost_price: parseFloat(p.contract_price || p.denomination_value) * 3.75,
        category: p.category_name || 'بطاقات Alameri Digital',
        ean: p.ean,
        denomination_value: p.denomination_value,
        denomination_currency: p.denomination_currency,
        brand_name: p.brand_name
      }))

      const res = await axios.post('/api/mintroute/import-products', { products }, { headers })
      
      if (res.data.success) {
        setSuccess(`تم استيراد ${res.data.imported} منتج بنجاح`)
        setSelectedProducts([])
      }
    } catch (err) {
      setError(err.response?.data?.message || 'خطأ في استيراد المنتجات')
    }
    setImporting(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 animate-spin text-orange-600 mx-auto mb-4" />
          <p className="text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    )
  }

  if (!connectionStatus?.connected) {
    return (
      <div className="min-h-screen bg-gray-50 p-8" dir="rtl">
        <div className="max-w-2xl mx-auto">
          <Link to="/admin" className="flex items-center gap-2 text-orange-600 mb-6 hover:underline">
            <ArrowLeft className="w-5 h-5" />
            العودة للوحة التحكم
          </Link>
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-4">غير متصل بـ Alameri Digital</h2>
            <p className="text-gray-600 mb-6">{connectionStatus?.message || 'لم يتم تكوين بيانات API'}</p>
            <div className="bg-gray-100 rounded-lg p-4 text-right text-sm">
              <p className="font-bold mb-2">لتفعيل الربط، أضف المتغيرات التالية:</p>
              <code className="block bg-gray-200 p-2 rounded mb-2">MINTROUTE_USERNAME</code>
              <code className="block bg-gray-200 p-2 rounded mb-2">MINTROUTE_SECRET_KEY</code>
              <code className="block bg-gray-200 p-2 rounded">MINTROUTE_API_URL</code>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <nav className="bg-white shadow p-4">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link to="/admin" className="flex items-center gap-2 text-gray-600 hover:text-orange-600">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <CreditCard className="w-6 h-6 text-orange-600" />
              إدارة Alameri Digital
            </h1>
          </div>
          <div className="flex items-center gap-4">
            {balance && (
              <div className="bg-green-100 text-green-700 px-4 py-2 rounded-lg flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                <span>الرصيد: {balance.amount} {balance.currency}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-green-600 text-sm">متصل</span>
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto p-6">
        {error && (
          <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-6 flex justify-between items-center">
            <span>{error}</span>
            <button onClick={() => setError('')}>&times;</button>
          </div>
        )}
        {success && (
          <div className="bg-green-100 text-green-700 p-4 rounded-lg mb-6 flex justify-between items-center">
            <span>{success}</span>
            <button onClick={() => setSuccess('')}>&times;</button>
          </div>
        )}

        <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-xl p-6 text-white mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold mb-2">Alameri Digital API</h2>
              <p className="opacity-80">منصة البطاقات الرقمية - اشترِ واستورد المنتجات</p>
            </div>
            <div className="text-left">
              <p className="text-sm opacity-80">المستخدم</p>
              <p className="font-bold">{connectionStatus?.username}</p>
            </div>
          </div>
        </div>

        <div className="flex gap-4 mb-6 border-b overflow-x-auto">
          <button
            onClick={() => { setActiveTab('products'); loadCategories(); }}
            className={`pb-3 px-4 font-medium whitespace-nowrap ${activeTab === 'products' ? 'border-b-2 border-orange-600 text-orange-600' : 'text-gray-600'}`}
          >
            <Package className="w-5 h-5 inline ml-2" />
            المنتجات
          </button>
          <button
            onClick={() => { setActiveTab('stock'); }}
            className={`pb-3 px-4 font-medium whitespace-nowrap ${activeTab === 'stock' ? 'border-b-2 border-orange-600 text-orange-600' : 'text-gray-600'}`}
          >
            <Search className="w-5 h-5 inline ml-2" />
            فحص المخزون
          </button>
          <button
            onClick={() => { setActiveTab('orders'); loadOrders(); }}
            className={`pb-3 px-4 font-medium whitespace-nowrap ${activeTab === 'orders' ? 'border-b-2 border-orange-600 text-orange-600' : 'text-gray-600'}`}
          >
            <ShoppingCart className="w-5 h-5 inline ml-2" />
            الطلبات
          </button>
        </div>

        {activeTab === 'products' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow p-6">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <Layers className="w-5 h-5 text-orange-600" />
                تصفح المنتجات
              </h3>
              
              <div className="grid md:grid-cols-3 gap-4 mb-6">
                <div>
                  <label className="block text-gray-700 mb-2 text-sm">الفئة</label>
                  <select
                    value={selectedCategory || ''}
                    onChange={(e) => {
                      setSelectedCategory(e.target.value)
                      if (e.target.value) {
                        loadBrands(e.target.value)
                      } else {
                        loadBrands()
                      }
                      setSelectedBrand(null)
                      setDenominations([])
                    }}
                    className="w-full p-3 border rounded-lg"
                  >
                    <option value="">كل الفئات</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-gray-700 mb-2 text-sm">العلامة التجارية</label>
                  <select
                    value={selectedBrand || ''}
                    onChange={(e) => {
                      setSelectedBrand(e.target.value)
                      if (e.target.value) {
                        loadDenominations(e.target.value)
                      } else {
                        setDenominations([])
                      }
                    }}
                    className="w-full p-3 border rounded-lg"
                    disabled={brands.length === 0}
                  >
                    <option value="">اختر علامة تجارية</option>
                    {brands.map(brand => (
                      <option key={brand.id} value={brand.id}>{brand.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end">
                  <button
                    onClick={() => { loadCategories(); loadBrands(); }}
                    className="w-full bg-gray-200 text-gray-700 p-3 rounded-lg hover:bg-gray-300 flex items-center justify-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    تحديث
                  </button>
                </div>
              </div>

              {denominations.length > 0 && (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-bold">الفئات السعرية ({denominations.length})</h4>
                    {selectedProducts.length > 0 && (
                      <button
                        onClick={importSelectedProducts}
                        disabled={importing}
                        className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 flex items-center gap-2 disabled:opacity-50"
                      >
                        {importing ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Upload className="w-4 h-4" />
                        )}
                        استيراد المحدد ({selectedProducts.length})
                      </button>
                    )}
                  </div>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {denominations.map(denom => (
                      <div 
                        key={denom.ean} 
                        className={`border rounded-xl p-4 cursor-pointer transition-all ${
                          selectedProducts.find(p => p.ean === denom.ean)
                            ? 'border-orange-500 bg-orange-50'
                            : 'border-gray-200 hover:border-orange-300'
                        }`}
                        onClick={() => toggleProductSelection(denom)}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h5 className="font-bold">{denom.name || denom.denomination_name}</h5>
                          <input
                            type="checkbox"
                            checked={!!selectedProducts.find(p => p.ean === denom.ean)}
                            onChange={() => {}}
                            className="w-5 h-5 text-orange-600"
                          />
                        </div>
                        <p className="text-sm text-gray-500 mb-2">{denom.brand_name}</p>
                        <div className="flex justify-between text-sm">
                          <span>القيمة: {denom.denomination_value} {denom.denomination_currency}</span>
                          <span className="text-green-600 font-bold">{denom.contract_price || denom.denomination_value} $</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-2">EAN: {denom.ean}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {denominations.length === 0 && selectedBrand && (
                <div className="text-center py-8 text-gray-500">
                  <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>لا توجد فئات سعرية لهذه العلامة التجارية</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'stock' && (
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <Search className="w-5 h-5 text-orange-600" />
              فحص توفر المخزون
            </h3>
            <div className="flex gap-4 mb-6">
              <input
                type="text"
                value={stockCheckEan}
                onChange={(e) => setStockCheckEan(e.target.value)}
                placeholder="أدخل EAN code"
                className="flex-1 p-3 border rounded-lg"
              />
              <button
                onClick={checkStock}
                className="bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700"
              >
                فحص
              </button>
            </div>
            
            {stockResult && (
              <div className={`p-4 rounded-lg ${stockResult.available ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                <div className="flex items-center gap-2">
                  {stockResult.available ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <AlertCircle className="w-5 h-5" />
                  )}
                  <span>{stockResult.message}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-orange-600" />
                طلبات Alameri Digital
              </h3>
              <button
                onClick={loadOrders}
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                تحديث
              </button>
            </div>
            
            {orders.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>لا توجد طلبات</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-right p-3">رقم الطلب</th>
                      <th className="text-right p-3">المنتج</th>
                      <th className="text-right p-3">السعر</th>
                      <th className="text-right p-3">التاريخ</th>
                      <th className="text-right p-3">الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map(order => (
                      <tr key={order.order_id} className="border-t">
                        <td className="p-3 font-mono text-sm">{order.order_id}</td>
                        <td className="p-3">{order.brand_name} - {order.denomination_name}</td>
                        <td className="p-3">{order.contract_price} $</td>
                        <td className="p-3 text-sm">{order.order_date}</td>
                        <td className="p-3">
                          <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-sm">مكتمل</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
