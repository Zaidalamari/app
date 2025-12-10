import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { ShoppingCart, Search } from 'lucide-react'
import CountrySelector, { useCountry } from '../components/CountrySelector'

export default function Products({ user }) {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [selectedCategory, setSelectedCategory] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [purchasing, setPurchasing] = useState(null)
  const { country, setCountry, formatPrice } = useCountry()

  useEffect(() => {
    fetchProducts()
    fetchCategories()
  }, [selectedCategory, search])

  const fetchProducts = async () => {
    try {
      const params = new URLSearchParams()
      if (selectedCategory) params.append('category_id', selectedCategory)
      if (search) params.append('search', search)
      
      const res = await axios.get(`/api/products?${params}`)
      setProducts(res.data.data || [])
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  const fetchCategories = async () => {
    try {
      const res = await axios.get('/api/products/categories')
      setCategories(res.data.data || [])
    } catch (err) {
      console.error(err)
    }
  }

  const handlePurchase = async (productId) => {
    if (!user) {
      alert('يجب تسجيل الدخول أولاً')
      return
    }

    setPurchasing(productId)
    const token = localStorage.getItem('token')
    
    try {
      const res = await axios.post('/api/orders/purchase', 
        { product_id: productId, quantity: 1 },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      
      if (res.data.success) {
        alert(`تم الشراء بنجاح!\n\nالكود: ${res.data.data.codes[0]?.code || 'N/A'}`)
        fetchProducts()
      }
    } catch (err) {
      alert(err.response?.data?.message || 'خطأ في الشراء')
    }
    setPurchasing(null)
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-gradient-to-r from-blue-600 to-purple-700 text-white shadow-lg p-4">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link to="/" className="text-2xl font-bold">DigiCards</Link>
            <CountrySelector onCountryChange={setCountry} />
          </div>
          <div className="flex items-center gap-4">
            {user ? (
              <>
                <Link to="/dashboard" className="hover:text-blue-200">لوحة التحكم</Link>
                <span className="text-blue-100">{user.name}</span>
              </>
            ) : (
              <Link to="/login" className="bg-white text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-100">تسجيل الدخول</Link>
            )}
          </div>
        </div>
      </nav>

      <div className="container mx-auto p-6">
        <h2 className="text-3xl font-bold mb-8">المنتجات</h2>

        <div className="flex flex-wrap gap-4 mb-8">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="ابحث عن منتج..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pr-12 p-4 border rounded-xl focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="p-4 border rounded-xl focus:ring-2 focus:ring-blue-500"
          >
            <option value="">جميع الفئات</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.icon} {cat.name_ar || cat.name}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="text-center py-20">
            <div className="text-xl text-gray-500">جاري التحميل...</div>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-xl text-gray-500">لا توجد منتجات متاحة</div>
          </div>
        ) : (
          <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-6">
            {products.map(product => (
              <div key={product.id} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition">
                <div className="h-48 bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <span className="text-6xl">🎮</span>
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-lg mb-2">{product.name_ar || product.name}</h3>
                  <p className="text-gray-500 text-sm mb-3">{product.category_name}</p>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-2xl font-bold text-green-600">{formatPrice(product.selling_price)}</span>
                    <span className={`text-sm px-2 py-1 rounded ${product.available_stock > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {product.available_stock > 0 ? `متوفر (${product.available_stock})` : 'نفذ'}
                    </span>
                  </div>
                  <button
                    onClick={() => handlePurchase(product.id)}
                    disabled={purchasing === product.id || product.available_stock === 0}
                    className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <ShoppingCart className="w-5 h-5" />
                    {purchasing === product.id ? 'جاري الشراء...' : 'شراء الآن'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
