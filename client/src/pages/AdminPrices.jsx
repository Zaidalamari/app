import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { 
  DollarSign, Search, Filter, Save, RefreshCw, Upload,
  ChevronLeft, ChevronRight, TrendingUp, TrendingDown,
  Percent, Package, AlertCircle, CheckCircle
} from 'lucide-react'

export default function AdminPrices({ user }) {
  const navigate = useNavigate()
  const [products, setProducts] = useState([])
  const [brands, setBrands] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [importing, setImporting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedBrand, setSelectedBrand] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 50 })
  const [editedPrices, setEditedPrices] = useState({})
  const [message, setMessage] = useState({ type: '', text: '' })
  const [showBulkAdjust, setShowBulkAdjust] = useState(false)
  const [bulkAdjust, setBulkAdjust] = useState({
    adjustment_type: 'percentage',
    adjustment_value: 0,
    apply_to: 'selling_price',
    brand_name: '',
    category_id: ''
  })

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/login')
      return
    }
    fetchData()
  }, [user, page, search, selectedBrand, selectedCategory])

  const fetchData = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const headers = { Authorization: `Bearer ${token}` }

      const [pricesRes, brandsRes, catsRes] = await Promise.all([
        axios.get('/api/admin/products/prices', {
          headers,
          params: { page, limit: 50, search, brand_name: selectedBrand, category_id: selectedCategory }
        }),
        axios.get('/api/admin/products/brands', { headers }),
        axios.get('/api/products/categories', { headers })
      ])

      setProducts(pricesRes.data.data || [])
      setPagination(pricesRes.data.pagination || { total: 0, page: 1, limit: 50 })
      setBrands(brandsRes.data.data || [])
      setCategories(catsRes.data.data || [])
    } catch (err) {
      console.error(err)
      setMessage({ type: 'error', text: 'خطأ في تحميل البيانات' })
    } finally {
      setLoading(false)
    }
  }

  const handleImportExcel = async () => {
    setImporting(true)
    setMessage({ type: '', text: '' })
    try {
      const token = localStorage.getItem('token')
      const res = await axios.post('/api/admin/products/import-excel', {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setMessage({ type: 'success', text: res.data.message })
      fetchData()
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'خطأ في الاستيراد' })
    } finally {
      setImporting(false)
    }
  }

  const handlePriceChange = (productId, field, value) => {
    setEditedPrices(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        id: productId,
        [field]: parseFloat(value) || 0
      }
    }))
  }

  const handleSaveChanges = async () => {
    const updates = Object.values(editedPrices)
    if (updates.length === 0) {
      setMessage({ type: 'error', text: 'لا توجد تغييرات للحفظ' })
      return
    }

    setSaving(true)
    try {
      const token = localStorage.getItem('token')
      const res = await axios.put('/api/admin/products/prices/bulk', 
        { updates },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setMessage({ type: 'success', text: res.data.message })
      setEditedPrices({})
      fetchData()
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'خطأ في الحفظ' })
    } finally {
      setSaving(false)
    }
  }

  const handleBulkAdjust = async () => {
    if (bulkAdjust.adjustment_value === 0) {
      setMessage({ type: 'error', text: 'الرجاء إدخال قيمة التعديل' })
      return
    }

    setSaving(true)
    try {
      const token = localStorage.getItem('token')
      const res = await axios.put('/api/admin/products/prices/adjust',
        bulkAdjust,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setMessage({ type: 'success', text: res.data.message })
      setShowBulkAdjust(false)
      setBulkAdjust({ adjustment_type: 'percentage', adjustment_value: 0, apply_to: 'selling_price', brand_name: '', category_id: '' })
      fetchData()
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'خطأ في التعديل' })
    } finally {
      setSaving(false)
    }
  }

  if (!user || user.role !== 'admin') return null

  const totalPages = Math.ceil(pagination.total / pagination.limit)

  return (
    <div className="min-h-screen bg-gray-100" dir="rtl">
      <nav className="bg-gradient-to-r from-gray-800 to-gray-900 text-white p-4 shadow-lg">
        <div className="container mx-auto flex justify-between items-center">
          <Link to="/" className="text-2xl font-bold">DigiCards</Link>
          <div className="flex gap-4 items-center">
            <Link to="/admin" className="hover:text-blue-300">لوحة التحكم</Link>
            <span>مرحباً، {user.name}</span>
          </div>
        </div>
      </nav>

      <div className="container mx-auto p-6">
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-green-500 to-teal-600 p-6 text-white">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <DollarSign className="w-12 h-12" />
                <div>
                  <h1 className="text-2xl font-bold">إدارة الأسعار</h1>
                  <p className="opacity-90">تعديل أسعار المنتجات بسهولة</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleImportExcel}
                  disabled={importing}
                  className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg flex items-center gap-2 transition"
                >
                  <Upload className="w-5 h-5" />
                  {importing ? 'جاري الاستيراد...' : 'استيراد من Excel'}
                </button>
                <button
                  onClick={() => setShowBulkAdjust(true)}
                  className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg flex items-center gap-2 transition"
                >
                  <Percent className="w-5 h-5" />
                  تعديل جماعي
                </button>
              </div>
            </div>
          </div>

          {message.text && (
            <div className={`p-4 flex items-center gap-2 ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
              {message.text}
            </div>
          )}

          <div className="p-6 border-b">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="البحث عن منتج..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="w-full pr-10 pl-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>
              <select
                value={selectedBrand}
                onChange={(e) => { setSelectedBrand(e.target.value); setPage(1); }}
                className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
              >
                <option value="">كل الماركات</option>
                {brands.map(b => (
                  <option key={b.brand_name} value={b.brand_name}>{b.brand_name} ({b.count})</option>
                ))}
              </select>
              <select
                value={selectedCategory}
                onChange={(e) => { setSelectedCategory(e.target.value); setPage(1); }}
                className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
              >
                <option value="">كل الفئات</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name_ar || c.name}</option>
                ))}
              </select>
              <button
                onClick={fetchData}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition flex items-center gap-2"
              >
                <RefreshCw className="w-5 h-5" />
                تحديث
              </button>
            </div>
          </div>

          {Object.keys(editedPrices).length > 0 && (
            <div className="p-4 bg-amber-50 border-b flex items-center justify-between">
              <span className="text-amber-700">
                لديك {Object.keys(editedPrices).length} تغيير غير محفوظ
              </span>
              <button
                onClick={handleSaveChanges}
                disabled={saving}
                className="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 transition flex items-center gap-2"
              >
                <Save className="w-5 h-5" />
                {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
              </button>
            </div>
          )}

          <div className="overflow-x-auto">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-gray-500">جاري التحميل...</p>
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">لا توجد منتجات</p>
                <button
                  onClick={handleImportExcel}
                  className="mt-4 text-green-600 hover:underline"
                >
                  استيراد المنتجات من Excel
                </button>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">المنتج</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">الماركة</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">سعر التكلفة</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">سعر البيع</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">سعر الموزع</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">الهامش</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {products.map(p => {
                    const edited = editedPrices[p.id] || {}
                    const basePrice = edited.base_price ?? p.base_price
                    const sellingPrice = edited.selling_price ?? p.selling_price
                    const margin = sellingPrice > 0 ? ((sellingPrice - basePrice) / basePrice * 100).toFixed(1) : 0

                    return (
                      <tr key={p.id} className={editedPrices[p.id] ? 'bg-amber-50' : 'hover:bg-gray-50'}>
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-gray-900">{p.name}</p>
                            <p className="text-sm text-gray-500">{p.denomination_value} {p.denomination_currency}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{p.brand_name}</td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            step="0.01"
                            value={edited.base_price ?? p.base_price}
                            onChange={(e) => handlePriceChange(p.id, 'base_price', e.target.value)}
                            className="w-24 px-2 py-1 border rounded text-center focus:ring-2 focus:ring-green-500"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            step="0.01"
                            value={edited.selling_price ?? p.selling_price}
                            onChange={(e) => handlePriceChange(p.id, 'selling_price', e.target.value)}
                            className="w-24 px-2 py-1 border rounded text-center focus:ring-2 focus:ring-green-500"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            step="0.01"
                            value={edited.distributor_price ?? p.distributor_price}
                            onChange={(e) => handlePriceChange(p.id, 'distributor_price', e.target.value)}
                            className="w-24 px-2 py-1 border rounded text-center focus:ring-2 focus:ring-green-500"
                          />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-1 rounded text-sm ${margin > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {margin > 0 ? <TrendingUp className="w-4 h-4 inline ml-1" /> : <TrendingDown className="w-4 h-4 inline ml-1" />}
                            {margin}%
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>

          {totalPages > 1 && (
            <div className="p-4 border-t flex items-center justify-between">
              <p className="text-gray-600">
                صفحة {page} من {totalPages} ({pagination.total} منتج)
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 border rounded hover:bg-gray-100 disabled:opacity-50"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-2 border rounded hover:bg-gray-100 disabled:opacity-50"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {showBulkAdjust && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Percent className="w-6 h-6 text-green-600" />
              تعديل جماعي للأسعار
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">نوع التعديل</label>
                <select
                  value={bulkAdjust.adjustment_type}
                  onChange={(e) => setBulkAdjust(prev => ({ ...prev, adjustment_type: e.target.value }))}
                  className="w-full p-2 border rounded-lg"
                >
                  <option value="percentage">نسبة مئوية (%)</option>
                  <option value="fixed">مبلغ ثابت</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  القيمة {bulkAdjust.adjustment_type === 'percentage' ? '(موجب للزيادة، سالب للخصم)' : ''}
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={bulkAdjust.adjustment_value}
                  onChange={(e) => setBulkAdjust(prev => ({ ...prev, adjustment_value: parseFloat(e.target.value) || 0 }))}
                  className="w-full p-2 border rounded-lg"
                  placeholder={bulkAdjust.adjustment_type === 'percentage' ? 'مثال: 5 للزيادة، -5 للخصم' : 'مثال: 1.5'}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">تطبيق على</label>
                <select
                  value={bulkAdjust.apply_to}
                  onChange={(e) => setBulkAdjust(prev => ({ ...prev, apply_to: e.target.value }))}
                  className="w-full p-2 border rounded-lg"
                >
                  <option value="selling_price">سعر البيع</option>
                  <option value="distributor_price">سعر الموزع</option>
                  <option value="base_price">سعر التكلفة</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الماركة (اختياري)</label>
                <select
                  value={bulkAdjust.brand_name}
                  onChange={(e) => setBulkAdjust(prev => ({ ...prev, brand_name: e.target.value }))}
                  className="w-full p-2 border rounded-lg"
                >
                  <option value="">كل الماركات</option>
                  {brands.map(b => (
                    <option key={b.brand_name} value={b.brand_name}>{b.brand_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الفئة (اختياري)</label>
                <select
                  value={bulkAdjust.category_id}
                  onChange={(e) => setBulkAdjust(prev => ({ ...prev, category_id: e.target.value }))}
                  className="w-full p-2 border rounded-lg"
                >
                  <option value="">كل الفئات</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name_ar || c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowBulkAdjust(false)}
                className="flex-1 py-2 border rounded-lg hover:bg-gray-50"
              >
                إلغاء
              </button>
              <button
                onClick={handleBulkAdjust}
                disabled={saving}
                className="flex-1 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
              >
                {saving ? 'جاري التطبيق...' : 'تطبيق التعديل'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
