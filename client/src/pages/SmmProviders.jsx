import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'

export default function SmmProviders({ user }) {
  const navigate = useNavigate()
  const [providers, setProviders] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState(null)
  const [services, setServices] = useState([])
  const [categories, setCategories] = useState([])
  const [selectedServices, setSelectedServices] = useState([])
  const [syncing, setSyncing] = useState(false)
  const [importing, setImporting] = useState(false)
  const [filters, setFilters] = useState({ category: '', search: '', imported: '' })
  const [profitMargin, setProfitMargin] = useState(20)
  const [productCategories, setProductCategories] = useState([])
  const [selectedCategoryId, setSelectedCategoryId] = useState('')

  const [newProvider, setNewProvider] = useState({
    name: '',
    api_url: '',
    api_key: ''
  })

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/login')
      return
    }
    fetchProviders()
    fetchProductCategories()
  }, [user])

  const fetchProviders = async () => {
    try {
      const response = await fetch('/api/smm/providers', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      })
      const data = await response.json()
      if (data.success) {
        setProviders(data.providers)
      }
    } catch (error) {
      console.error('Error fetching providers:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchProductCategories = async () => {
    try {
      const response = await fetch('/api/products/categories', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      })
      const data = await response.json()
      if (data.success) {
        setProductCategories(data.categories)
      }
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  const fetchServices = async (providerId) => {
    try {
      const params = new URLSearchParams()
      if (filters.category) params.append('category', filters.category)
      if (filters.search) params.append('search', filters.search)
      if (filters.imported) params.append('imported', filters.imported)

      const response = await fetch(`/api/smm/providers/${providerId}/services?${params}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      })
      const data = await response.json()
      if (data.success) {
        setServices(data.services)
        setCategories(data.categories)
      }
    } catch (error) {
      console.error('Error fetching services:', error)
    }
  }

  const addProvider = async () => {
    try {
      const response = await fetch('/api/smm/providers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(newProvider)
      })
      const data = await response.json()
      if (data.success) {
        alert(data.message)
        setShowAddModal(false)
        setNewProvider({ name: '', api_url: '', api_key: '' })
        fetchProviders()
      } else {
        alert(data.message)
      }
    } catch (error) {
      alert('خطأ في الاتصال')
    }
  }

  const deleteProvider = async (id) => {
    if (!confirm('هل أنت متأكد من حذف هذا المزود؟')) return
    try {
      const response = await fetch(`/api/smm/providers/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      })
      const data = await response.json()
      if (data.success) {
        fetchProviders()
      }
    } catch (error) {
      alert('خطأ في الحذف')
    }
  }

  const syncProvider = async (id) => {
    setSyncing(true)
    try {
      const response = await fetch(`/api/smm/providers/${id}/sync`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      })
      const data = await response.json()
      if (data.success) {
        alert(data.message)
        fetchProviders()
        if (selectedProvider?.id === id) {
          fetchServices(id)
        }
      } else {
        alert(data.message)
      }
    } catch (error) {
      alert('خطأ في المزامنة')
    } finally {
      setSyncing(false)
    }
  }

  const selectProvider = (provider) => {
    setSelectedProvider(provider)
    setSelectedServices([])
    setFilters({ category: '', search: '', imported: '' })
    fetchServices(provider.id)
  }

  useEffect(() => {
    if (selectedProvider) {
      fetchServices(selectedProvider.id)
    }
  }, [filters])

  const toggleServiceSelection = (serviceId) => {
    setSelectedServices(prev => 
      prev.includes(serviceId) 
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId]
    )
  }

  const selectAllServices = () => {
    const nonImportedIds = services.filter(s => !s.is_imported).map(s => s.id)
    setSelectedServices(nonImportedIds)
  }

  const clearSelection = () => {
    setSelectedServices([])
  }

  const importServices = async () => {
    if (selectedServices.length === 0) {
      alert('يرجى تحديد خدمات للاستيراد')
      return
    }

    setImporting(true)
    try {
      const response = await fetch('/api/smm/services/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          service_ids: selectedServices,
          profit_margin: profitMargin,
          category_id: selectedCategoryId || null
        })
      })
      const data = await response.json()
      if (data.success) {
        alert(data.message)
        setSelectedServices([])
        fetchServices(selectedProvider.id)
        fetchProviders()
      } else {
        alert(data.message)
      }
    } catch (error) {
      alert('خطأ في الاستيراد')
    } finally {
      setImporting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-xl text-gray-600">جاري التحميل...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100" dir="rtl">
      <nav className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 shadow-lg">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold">مزودي خدمات SMM</h1>
          <Link to="/admin" className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition">
            العودة للوحة الإدارة
          </Link>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800">المزودين</h2>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm transition"
                >
                  + إضافة مزود
                </button>
              </div>

              <div className="space-y-4">
                {providers.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">لا يوجد مزودين حالياً</p>
                ) : (
                  providers.map(provider => (
                    <div
                      key={provider.id}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition ${
                        selectedProvider?.id === provider.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => selectProvider(provider)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-gray-800">{provider.name}</h3>
                        <span className={`px-2 py-1 rounded text-xs ${
                          provider.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {provider.is_active ? 'نشط' : 'معطل'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mb-2 truncate">{provider.api_url}</p>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-blue-600 font-medium">
                          الرصيد: {parseFloat(provider.balance).toFixed(2)} {provider.currency}
                        </span>
                        <span className="text-gray-500">
                          {provider.services_count} خدمة ({provider.imported_count} مستورد)
                        </span>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={(e) => { e.stopPropagation(); syncProvider(provider.id); }}
                          disabled={syncing}
                          className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm transition disabled:opacity-50"
                        >
                          {syncing ? 'جاري...' : 'مزامنة'}
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteProvider(provider.id); }}
                          className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm transition"
                        >
                          حذف
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            {selectedProvider ? (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-gray-800">
                    خدمات: {selectedProvider.name}
                  </h2>
                  <div className="flex gap-2">
                    {selectedServices.length > 0 && (
                      <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                        محدد: {selectedServices.length}
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <select
                    value={filters.category}
                    onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                    className="border border-gray-300 rounded-lg px-3 py-2"
                  >
                    <option value="">جميع التصنيفات</option>
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="بحث..."
                    value={filters.search}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    className="border border-gray-300 rounded-lg px-3 py-2"
                  />
                  <select
                    value={filters.imported}
                    onChange={(e) => setFilters({ ...filters, imported: e.target.value })}
                    className="border border-gray-300 rounded-lg px-3 py-2"
                  >
                    <option value="">الكل</option>
                    <option value="true">مستورد</option>
                    <option value="false">غير مستورد</option>
                  </select>
                  <div className="flex gap-2">
                    <button
                      onClick={selectAllServices}
                      className="flex-1 bg-gray-200 hover:bg-gray-300 px-3 py-2 rounded-lg text-sm transition"
                    >
                      تحديد الكل
                    </button>
                    <button
                      onClick={clearSelection}
                      className="flex-1 bg-gray-200 hover:bg-gray-300 px-3 py-2 rounded-lg text-sm transition"
                    >
                      إلغاء
                    </button>
                  </div>
                </div>

                {selectedServices.length > 0 && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                    <h3 className="font-bold text-green-800 mb-3">استيراد الخدمات المحددة</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">نسبة الربح %</label>
                        <input
                          type="number"
                          value={profitMargin}
                          onChange={(e) => setProfitMargin(parseInt(e.target.value) || 0)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">التصنيف</label>
                        <select
                          value={selectedCategoryId}
                          onChange={(e) => setSelectedCategoryId(e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        >
                          <option value="">بدون تصنيف</option>
                          {productCategories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name_ar || cat.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-end">
                        <button
                          onClick={importServices}
                          disabled={importing}
                          className="w-full bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition disabled:opacity-50"
                        >
                          {importing ? 'جاري الاستيراد...' : `استيراد ${selectedServices.length} خدمة`}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="max-h-[500px] overflow-y-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-right text-sm text-gray-600">تحديد</th>
                        <th className="px-3 py-2 text-right text-sm text-gray-600">ID</th>
                        <th className="px-3 py-2 text-right text-sm text-gray-600">الاسم</th>
                        <th className="px-3 py-2 text-right text-sm text-gray-600">التصنيف</th>
                        <th className="px-3 py-2 text-right text-sm text-gray-600">السعر</th>
                        <th className="px-3 py-2 text-right text-sm text-gray-600">الحد</th>
                        <th className="px-3 py-2 text-right text-sm text-gray-600">الحالة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {services.map(service => (
                        <tr 
                          key={service.id} 
                          className={`border-b hover:bg-gray-50 ${service.is_imported ? 'bg-green-50' : ''}`}
                        >
                          <td className="px-3 py-2">
                            <input
                              type="checkbox"
                              checked={selectedServices.includes(service.id)}
                              onChange={() => toggleServiceSelection(service.id)}
                              disabled={service.is_imported}
                              className="w-4 h-4"
                            />
                          </td>
                          <td className="px-3 py-2 text-sm text-gray-600">{service.service_id}</td>
                          <td className="px-3 py-2 text-sm">
                            <div className="max-w-xs truncate" title={service.name}>
                              {service.name}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-sm text-gray-600">{service.category || '-'}</td>
                          <td className="px-3 py-2 text-sm font-medium text-blue-600">
                            ${parseFloat(service.rate).toFixed(4)}
                          </td>
                          <td className="px-3 py-2 text-sm text-gray-600">
                            {service.min_quantity} - {service.max_quantity}
                          </td>
                          <td className="px-3 py-2">
                            {service.is_imported ? (
                              <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                                مستورد
                              </span>
                            ) : (
                              <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs">
                                جديد
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {services.length === 0 && (
                    <p className="text-center text-gray-500 py-8">
                      لا توجد خدمات - اضغط على "مزامنة" لجلب الخدمات
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-lg p-12 text-center">
                <div className="text-6xl mb-4">📦</div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">اختر مزود لعرض الخدمات</h3>
                <p className="text-gray-500">اضغط على أحد المزودين من القائمة لعرض وإدارة خدماته</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-xl font-bold text-gray-800 mb-6">إضافة مزود جديد</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">اسم المزود</label>
                <input
                  type="text"
                  value={newProvider.name}
                  onChange={(e) => setNewProvider({ ...newProvider, name: e.target.value })}
                  placeholder="مثال: SMM Panel"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">رابط API</label>
                <input
                  type="text"
                  value={newProvider.api_url}
                  onChange={(e) => setNewProvider({ ...newProvider, api_url: e.target.value })}
                  placeholder="https://panel.example.com/api/v2"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">مفتاح API</label>
                <input
                  type="text"
                  value={newProvider.api_key}
                  onChange={(e) => setNewProvider({ ...newProvider, api_key: e.target.value })}
                  placeholder="أدخل مفتاح API"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  dir="ltr"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={addProvider}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg transition"
              >
                إضافة
              </button>
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 py-2 rounded-lg transition"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
