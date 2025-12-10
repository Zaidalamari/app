import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'

function SellerStore() {
  const { slug } = useParams()
  const [storefront, setStorefront] = useState(null)
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [showPurchaseModal, setShowPurchaseModal] = useState(false)
  const [purchaseForm, setPurchaseForm] = useState({ buyer_email: '', buyer_phone: '' })
  const [purchaseLoading, setPurchaseLoading] = useState(false)
  const [purchaseResult, setPurchaseResult] = useState(null)

  useEffect(() => {
    fetchStorefront()
  }, [slug])

  const fetchStorefront = async () => {
    try {
      const response = await fetch(`/api/storefront/public/${slug}`)
      const data = await response.json()
      
      if (data.success) {
        setStorefront(data.storefront)
        setProducts(data.products)
      } else {
        setError(data.message || 'المتجر غير موجود')
      }
    } catch (err) {
      setError('حدث خطأ في تحميل المتجر')
    } finally {
      setLoading(false)
    }
  }

  const handlePurchase = (product) => {
    setSelectedProduct(product)
    setPurchaseResult(null)
    setPurchaseForm({ buyer_email: '', buyer_phone: '' })
    setShowPurchaseModal(true)
  }

  const submitPurchase = async () => {
    if (!purchaseForm.buyer_email && !purchaseForm.buyer_phone) {
      setPurchaseResult({ success: false, message: 'يرجى إدخال البريد الإلكتروني أو رقم الهاتف' })
      return
    }
    setPurchaseLoading(true)
    try {
      const response = await fetch(`/api/storefront/public/${slug}/purchase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: selectedProduct.id,
          buyer_email: purchaseForm.buyer_email,
          buyer_phone: purchaseForm.buyer_phone
        })
      })
      const data = await response.json()
      setPurchaseResult(data)
    } catch (err) {
      setPurchaseResult({ success: false, message: 'حدث خطأ في الطلب' })
    } finally {
      setPurchaseLoading(false)
    }
  }

  const openWhatsApp = () => {
    if (storefront?.whatsapp) {
      const message = encodeURIComponent(`مرحباً، أريد شراء: ${selectedProduct?.name_ar || selectedProduct?.name}`)
      window.open(`https://wa.me/${storefront.whatsapp.replace(/[^0-9]/g, '')}?text=${message}`, '_blank')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-xl text-gray-600">جاري التحميل...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100" dir="rtl">
        <div className="text-2xl text-red-600 mb-4">{error}</div>
        <Link to="/" className="text-blue-600 hover:underline">العودة للرئيسية</Link>
      </div>
    )
  }

  const themeColor = storefront?.theme_color || '#3B82F6'
  const secondaryColor = storefront?.secondary_color || '#8B5CF6'

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <div 
        className="relative h-64 md:h-80"
        style={{ 
          background: storefront?.banner_url 
            ? `url(${storefront.banner_url}) center/cover` 
            : `linear-gradient(135deg, ${themeColor}, ${secondaryColor})`
        }}
      >
        <div className="absolute inset-0 bg-black/30"></div>
        <div className="absolute bottom-0 right-0 left-0 p-6">
          <div className="max-w-6xl mx-auto flex items-end gap-6">
            {storefront?.logo_url ? (
              <img 
                src={storefront.logo_url} 
                alt={storefront.store_name}
                className="w-24 h-24 md:w-32 md:h-32 rounded-2xl border-4 border-white shadow-lg object-cover"
              />
            ) : (
              <div 
                className="w-24 h-24 md:w-32 md:h-32 rounded-2xl border-4 border-white shadow-lg flex items-center justify-center text-4xl font-bold text-white"
                style={{ backgroundColor: themeColor }}
              >
                {(storefront?.store_name_ar || storefront?.store_name || 'م').charAt(0)}
              </div>
            )}
            <div className="text-white pb-2">
              <h1 className="text-2xl md:text-4xl font-bold drop-shadow-lg">
                {storefront?.store_name_ar || storefront?.store_name}
              </h1>
              {storefront?.description_ar && (
                <p className="text-sm md:text-base mt-2 opacity-90 max-w-lg">
                  {storefront.description_ar}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {(storefront?.whatsapp || storefront?.phone || storefront?.email || storefront?.twitter || storefront?.instagram) && (
          <div className="bg-white rounded-xl shadow-sm p-4 mb-6 flex flex-wrap gap-4 justify-center">
            {storefront?.whatsapp && (
              <a 
                href={`https://wa.me/${storefront.whatsapp.replace(/[^0-9]/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                <span>واتساب</span>
              </a>
            )}
            {storefront?.phone && (
              <a 
                href={`tel:${storefront.phone}`}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <span>اتصال</span>
              </a>
            )}
            {storefront?.twitter && (
              <a 
                href={`https://twitter.com/${storefront.twitter.replace('@', '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
                <span>X</span>
              </a>
            )}
            {storefront?.instagram && (
              <a 
                href={`https://instagram.com/${storefront.instagram.replace('@', '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:opacity-90 transition"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                </svg>
                <span>انستقرام</span>
              </a>
            )}
          </div>
        )}

        <h2 className="text-2xl font-bold text-gray-800 mb-6">المنتجات المتاحة</h2>

        {products.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <div className="text-gray-400 text-6xl mb-4">📦</div>
            <p className="text-gray-500 text-lg">لا توجد منتجات متاحة حالياً</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map(product => (
              <div 
                key={product.id} 
                className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-lg transition group"
              >
                <div className="aspect-video bg-gray-100 relative overflow-hidden">
                  {product.image_url ? (
                    <img 
                      src={product.image_url} 
                      alt={product.name_ar || product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition"
                    />
                  ) : (
                    <div 
                      className="w-full h-full flex items-center justify-center text-white text-4xl"
                      style={{ backgroundColor: themeColor }}
                    >
                      🎮
                    </div>
                  )}
                  {product.is_featured && (
                    <span className="absolute top-2 left-2 bg-yellow-500 text-white text-xs px-2 py-1 rounded">
                      مميز
                    </span>
                  )}
                </div>
                <div className="p-4">
                  <span className="text-xs text-gray-500">{product.category_name_ar || product.category_name}</span>
                  <h3 className="font-bold text-gray-800 mt-1">{product.name_ar || product.name}</h3>
                  <div className="flex items-center justify-between mt-4">
                    <span 
                      className="text-xl font-bold"
                      style={{ color: themeColor }}
                    >
                      {product.selling_price} ر.س
                    </span>
                    <button
                      onClick={() => handlePurchase(product)}
                      className="px-4 py-2 rounded-lg text-white transition hover:opacity-90"
                      style={{ backgroundColor: themeColor }}
                    >
                      شراء
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <footer className="mt-12 py-6 text-center text-gray-500 text-sm border-t">
        <p>متجر {storefront?.store_name_ar || storefront?.store_name}</p>
        <Link to="/" className="text-blue-600 hover:underline mt-2 inline-block">
          أنشئ متجرك الخاص على Alameri Digital
        </Link>
      </footer>

      {showPurchaseModal && selectedProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" dir="rtl">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-4 text-right">طلب شراء</h3>
            <div className="bg-gray-50 rounded-lg p-4 mb-4 text-right">
              <p className="font-semibold">{selectedProduct.name_ar || selectedProduct.name}</p>
              <p className="text-2xl font-bold mt-2" style={{ color: themeColor }}>
                {selectedProduct.selling_price} ر.س
              </p>
            </div>

            {purchaseResult ? (
              <div className={`p-4 rounded-lg mb-4 text-right ${purchaseResult.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                <p className="font-medium">{purchaseResult.message}</p>
                {purchaseResult.success && purchaseResult.storefront && (
                  <div className="mt-4 space-y-2">
                    <p className="text-sm text-gray-600">تواصل مع البائع لإتمام الشراء:</p>
                    {purchaseResult.storefront.whatsapp && (
                      <button onClick={openWhatsApp} className="w-full flex items-center justify-center gap-2 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition text-sm">
                        واتساب
                      </button>
                    )}
                    {purchaseResult.storefront.phone && (
                      <a href={`tel:${purchaseResult.storefront.phone}`} className="w-full flex items-center justify-center gap-2 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition text-sm">
                        اتصال
                      </a>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <>
                <p className="text-gray-600 mb-4 text-right">أدخل بياناتك للتواصل معك:</p>
                <div className="space-y-3 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 text-right">البريد الإلكتروني</label>
                    <input
                      type="email"
                      value={purchaseForm.buyer_email}
                      onChange={(e) => setPurchaseForm(prev => ({ ...prev, buyer_email: e.target.value }))}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-right"
                      placeholder="email@example.com"
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 text-right">رقم الهاتف</label>
                    <input
                      type="tel"
                      value={purchaseForm.buyer_phone}
                      onChange={(e) => setPurchaseForm(prev => ({ ...prev, buyer_phone: e.target.value }))}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-right"
                      placeholder="+966..."
                      dir="ltr"
                    />
                  </div>
                </div>
                <button
                  onClick={submitPurchase}
                  disabled={purchaseLoading}
                  className="w-full py-3 text-white rounded-lg font-medium transition disabled:opacity-50"
                  style={{ backgroundColor: themeColor }}
                >
                  {purchaseLoading ? 'جاري الإرسال...' : 'إرسال طلب الشراء'}
                </button>
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm text-gray-500 text-center mb-3">أو تواصل مباشرة:</p>
                  <div className="flex gap-2 justify-center">
                    {storefront?.whatsapp && (
                      <button onClick={openWhatsApp} className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition text-sm">
                        واتساب
                      </button>
                    )}
                    {storefront?.phone && (
                      <a href={`tel:${storefront.phone}`} className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition text-sm">
                        اتصال
                      </a>
                    )}
                  </div>
                </div>
              </>
            )}
            <button
              onClick={() => setShowPurchaseModal(false)}
              className="w-full mt-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
            >
              إغلاق
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default SellerStore
