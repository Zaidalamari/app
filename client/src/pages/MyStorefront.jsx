import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'

function MyStorefront({ user }) {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [storefront, setStorefront] = useState(null)
  const [storeProducts, setStoreProducts] = useState([])
  const [availableProducts, setAvailableProducts] = useState([])
  const [activeTab, setActiveTab] = useState('settings')
  const [slugAvailable, setSlugAvailable] = useState(null)
  const [message, setMessage] = useState({ type: '', text: '' })

  const [formData, setFormData] = useState({
    slug: '',
    store_name: '',
    store_name_ar: '',
    description: '',
    description_ar: '',
    logo_url: '',
    banner_url: '',
    theme_color: '#3B82F6',
    secondary_color: '#8B5CF6',
    phone: '',
    email: '',
    whatsapp: '',
    twitter: '',
    instagram: '',
    is_published: false
  })

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }
    fetchData()
  }, [user])

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token')
      const [storefrontRes, productsRes] = await Promise.all([
        fetch('/api/storefront/me', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/storefront/available-products', { headers: { Authorization: `Bearer ${token}` } })
      ])

      const storefrontData = await storefrontRes.json()
      const productsData = await productsRes.json()

      if (storefrontData.success && storefrontData.storefront) {
        setStorefront(storefrontData.storefront)
        setStoreProducts(storefrontData.products || [])
        setFormData({
          slug: storefrontData.storefront.slug || '',
          store_name: storefrontData.storefront.store_name || '',
          store_name_ar: storefrontData.storefront.store_name_ar || '',
          description: storefrontData.storefront.description || '',
          description_ar: storefrontData.storefront.description_ar || '',
          logo_url: storefrontData.storefront.logo_url || '',
          banner_url: storefrontData.storefront.banner_url || '',
          theme_color: storefrontData.storefront.theme_color || '#3B82F6',
          secondary_color: storefrontData.storefront.secondary_color || '#8B5CF6',
          phone: storefrontData.storefront.phone || '',
          email: storefrontData.storefront.email || '',
          whatsapp: storefrontData.storefront.whatsapp || '',
          twitter: storefrontData.storefront.twitter || '',
          instagram: storefrontData.storefront.instagram || '',
          is_published: storefrontData.storefront.is_published || false
        })
      }

      if (productsData.success) {
        setAvailableProducts(productsData.products)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const checkSlug = async (slug) => {
    if (!slug || slug.length < 3) {
      setSlugAvailable(null)
      return
    }
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/storefront/check-slug/${slug}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await response.json()
      setSlugAvailable(data.available)
    } catch (error) {
      console.error('Error checking slug:', error)
    }
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    const newValue = type === 'checkbox' ? checked : value
    setFormData(prev => ({ ...prev, [name]: newValue }))
    
    if (name === 'slug') {
      checkSlug(value)
    }
  }

  const handleSaveSettings = async (e) => {
    e.preventDefault()
    setSaving(true)
    setMessage({ type: '', text: '' })

    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/storefront/me', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      })

      const data = await response.json()
      if (data.success) {
        setMessage({ type: 'success', text: data.message })
        fetchData()
      } else {
        setMessage({ type: 'error', text: data.message })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'حدث خطأ في الحفظ' })
    } finally {
      setSaving(false)
    }
  }

  const toggleProduct = (productId) => {
    const existing = storeProducts.find(p => p.product_id === productId)
    if (existing) {
      setStoreProducts(prev => prev.filter(p => p.product_id !== productId))
    } else {
      const product = availableProducts.find(p => p.id === productId)
      const maxOrder = storeProducts.length > 0 
        ? Math.max(...storeProducts.map(p => p.display_order || 0)) + 1 
        : 0
      setStoreProducts(prev => [...prev, {
        product_id: productId,
        custom_price: null,
        is_featured: false,
        is_active: true,
        display_order: maxOrder,
        name: product?.name,
        name_ar: product?.name_ar,
        original_price: product?.selling_price
      }])
    }
  }

  const updateProductPrice = (productId, price) => {
    setStoreProducts(prev => prev.map(p => 
      p.product_id === productId ? { ...p, custom_price: price ? parseFloat(price) : null } : p
    ))
  }

  const toggleFeatured = (productId) => {
    setStoreProducts(prev => prev.map(p => 
      p.product_id === productId ? { ...p, is_featured: !p.is_featured } : p
    ))
  }

  const handleSaveProducts = async () => {
    setSaving(true)
    setMessage({ type: '', text: '' })

    try {
      const token = localStorage.getItem('token')
      const productsToSave = storeProducts.map((p, index) => ({
        id: p.id,
        product_id: p.product_id,
        custom_price: p.custom_price,
        is_featured: p.is_featured,
        is_active: p.is_active !== false,
        display_order: p.display_order !== undefined ? p.display_order : index
      }))
      
      const response = await fetch('/api/storefront/me/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ products: productsToSave })
      })

      const data = await response.json()
      if (data.success) {
        setMessage({ type: 'success', text: 'تم حفظ المنتجات بنجاح' })
        if (data.products) {
          setStoreProducts(prev => prev.map(p => {
            const updated = data.products.find(up => up.product_id === p.product_id)
            return updated ? { ...p, id: updated.id, display_order: updated.display_order } : p
          }))
        }
      } else {
        setMessage({ type: 'error', text: data.message })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'حدث خطأ في حفظ المنتجات' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-xl text-gray-600">جاري التحميل...</div>
      </div>
    )
  }

  const storeUrl = formData.slug ? `${window.location.origin}/store/${formData.slug}` : null

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <nav className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/dashboard" className="text-gray-600 hover:text-gray-800">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-xl font-bold text-gray-800">إدارة متجري</h1>
          </div>
          {storeUrl && formData.is_published && (
            <a 
              href={`/store/${formData.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-blue-600 hover:underline"
            >
              <span>معاينة المتجر</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          )}
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {message.text && (
          <div className={`mb-6 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {message.text}
          </div>
        )}

        <div className="flex gap-2 mb-6 border-b">
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-6 py-3 font-medium transition ${activeTab === 'settings' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            إعدادات المتجر
          </button>
          <button
            onClick={() => setActiveTab('products')}
            className={`px-6 py-3 font-medium transition ${activeTab === 'products' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            المنتجات ({storeProducts.length})
          </button>
        </div>

        {activeTab === 'settings' && (
          <form onSubmit={handleSaveSettings} className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-bold mb-4">الرابط الخاص بمتجرك</h2>
              <div className="flex items-center gap-2">
                <span className="text-gray-500">{window.location.origin}/store/</span>
                <input
                  type="text"
                  name="slug"
                  value={formData.slug}
                  onChange={handleChange}
                  placeholder="username"
                  className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  pattern="[a-z0-9-]+"
                  dir="ltr"
                />
                {slugAvailable !== null && (
                  <span className={slugAvailable ? 'text-green-600' : 'text-red-600'}>
                    {slugAvailable ? '✓ متاح' : '✗ غير متاح'}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-2">استخدم أحرف إنجليزية صغيرة وأرقام وشرطات فقط</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-bold mb-4">معلومات المتجر</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">اسم المتجر (عربي)</label>
                  <input
                    type="text"
                    name="store_name_ar"
                    value={formData.store_name_ar}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="متجر الألعاب"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">اسم المتجر (إنجليزي)</label>
                  <input
                    type="text"
                    name="store_name"
                    value={formData.store_name}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Games Store"
                    dir="ltr"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">وصف المتجر (عربي)</label>
                  <textarea
                    name="description_ar"
                    value={formData.description_ar}
                    onChange={handleChange}
                    rows={3}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="وصف قصير لمتجرك..."
                  />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-bold mb-4">المظهر</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">رابط الشعار</label>
                  <input
                    type="url"
                    name="logo_url"
                    value={formData.logo_url}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="https://..."
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">رابط البانر</label>
                  <input
                    type="url"
                    name="banner_url"
                    value={formData.banner_url}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="https://..."
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">اللون الرئيسي</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      name="theme_color"
                      value={formData.theme_color}
                      onChange={handleChange}
                      className="w-12 h-10 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={formData.theme_color}
                      onChange={e => handleChange({ target: { name: 'theme_color', value: e.target.value } })}
                      className="flex-1 px-4 py-2 border rounded-lg"
                      dir="ltr"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">اللون الثانوي</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      name="secondary_color"
                      value={formData.secondary_color}
                      onChange={handleChange}
                      className="w-12 h-10 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={formData.secondary_color}
                      onChange={e => handleChange({ target: { name: 'secondary_color', value: e.target.value } })}
                      className="flex-1 px-4 py-2 border rounded-lg"
                      dir="ltr"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-bold mb-4">معلومات التواصل</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">رقم الهاتف</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="+966..."
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">واتساب</label>
                  <input
                    type="tel"
                    name="whatsapp"
                    value={formData.whatsapp}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="+966..."
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">البريد الإلكتروني</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="store@example.com"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">X (تويتر)</label>
                  <input
                    type="text"
                    name="twitter"
                    value={formData.twitter}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="@username"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">انستقرام</label>
                  <input
                    type="text"
                    name="instagram"
                    value={formData.instagram}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="@username"
                    dir="ltr"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold">نشر المتجر</h2>
                  <p className="text-sm text-gray-500">عند التفعيل، سيكون متجرك متاحاً للجميع</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    name="is_published"
                    checked={formData.is_published}
                    onChange={handleChange}
                    className="sr-only peer"
                  />
                  <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-8 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50"
              >
                {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
              </button>
            </div>
          </form>
        )}

        {activeTab === 'products' && (
          <div className="space-y-6">
            {!storefront && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-800">
                يجب حفظ إعدادات المتجر أولاً قبل إضافة المنتجات
              </div>
            )}

            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-bold mb-4">المنتجات المضافة ({storeProducts.length})</h2>
              {storeProducts.length === 0 ? (
                <p className="text-gray-500 text-center py-8">لم تقم بإضافة أي منتجات بعد</p>
              ) : (
                <div className="space-y-3">
                  {storeProducts.map(product => {
                    const fullProduct = availableProducts.find(p => p.id === product.product_id)
                    return (
                      <div key={product.product_id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium">{product.name_ar || product.name || fullProduct?.name_ar || fullProduct?.name}</p>
                          <p className="text-sm text-gray-500">السعر الأصلي: {product.original_price || fullProduct?.selling_price} ر.س</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={product.custom_price || ''}
                            onChange={(e) => updateProductPrice(product.product_id, e.target.value)}
                            placeholder="سعر مخصص"
                            className="w-28 px-3 py-2 border rounded-lg text-sm text-left"
                            dir="ltr"
                          />
                          <button
                            type="button"
                            onClick={() => toggleFeatured(product.product_id)}
                            className={`p-2 rounded-lg ${product.is_featured ? 'bg-yellow-100 text-yellow-600' : 'bg-gray-100 text-gray-400'}`}
                            title="منتج مميز"
                          >
                            ⭐
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleProduct(product.product_id)}
                            className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
              
              {storeProducts.length > 0 && (
                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={handleSaveProducts}
                    disabled={saving || !storefront}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition disabled:opacity-50"
                  >
                    {saving ? 'جاري الحفظ...' : 'حفظ المنتجات'}
                  </button>
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-bold mb-4">المنتجات المتاحة للإضافة</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {availableProducts.map(product => {
                  const isAdded = storeProducts.some(p => p.product_id === product.id)
                  return (
                    <div 
                      key={product.id}
                      className={`p-4 border rounded-lg cursor-pointer transition ${isAdded ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
                      onClick={() => toggleProduct(product.id)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-2xl shrink-0">
                          {product.image_url ? (
                            <img src={product.image_url} alt="" className="w-full h-full object-cover rounded-lg" />
                          ) : '🎮'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{product.name_ar || product.name}</p>
                          <p className="text-sm text-gray-500">{product.category_name_ar || product.category_name}</p>
                          <p className="text-blue-600 font-bold">{product.selling_price} ر.س</p>
                        </div>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${isAdded ? 'bg-blue-500 text-white' : 'border-2 border-gray-300'}`}>
                          {isAdded && '✓'}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default MyStorefront
