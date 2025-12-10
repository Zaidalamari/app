import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'

export default function CurrencySettings({ user }) {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('currencies')
  const [currencies, setCurrencies] = useState([])
  const [countries, setCountries] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCurrencyModal, setShowCurrencyModal] = useState(false)
  const [showCountryModal, setShowCountryModal] = useState(false)
  const [editingCurrency, setEditingCurrency] = useState(null)
  const [editingCountry, setEditingCountry] = useState(null)
  const [saving, setSaving] = useState(false)

  const [currencyForm, setCurrencyForm] = useState({
    code: '', name: '', name_ar: '', symbol: '', exchange_rate: 1, is_active: true
  })

  const [countryForm, setCountryForm] = useState({
    code: '', name: '', name_ar: '', currency_id: '', flag: '', phone_code: '', display_order: 0, is_active: true
  })

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/login')
      return
    }
    fetchData()
  }, [user])

  const fetchData = async () => {
    try {
      const [currRes, countRes] = await Promise.all([
        fetch('/api/currencies/currencies/all', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }),
        fetch('/api/currencies/countries/all', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        })
      ])

      const currData = await currRes.json()
      const countData = await countRes.json()

      if (currData.success) setCurrencies(currData.currencies)
      if (countData.success) setCountries(countData.countries)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const openCurrencyModal = (currency = null) => {
    if (currency) {
      setEditingCurrency(currency)
      setCurrencyForm({
        code: currency.code,
        name: currency.name,
        name_ar: currency.name_ar,
        symbol: currency.symbol,
        exchange_rate: currency.exchange_rate,
        is_active: currency.is_active
      })
    } else {
      setEditingCurrency(null)
      setCurrencyForm({ code: '', name: '', name_ar: '', symbol: '', exchange_rate: 1, is_active: true })
    }
    setShowCurrencyModal(true)
  }

  const openCountryModal = (country = null) => {
    if (country) {
      setEditingCountry(country)
      setCountryForm({
        code: country.code,
        name: country.name,
        name_ar: country.name_ar,
        currency_id: country.currency_id || '',
        flag: country.flag || '',
        phone_code: country.phone_code || '',
        display_order: country.display_order || 0,
        is_active: country.is_active
      })
    } else {
      setEditingCountry(null)
      setCountryForm({ code: '', name: '', name_ar: '', currency_id: '', flag: '', phone_code: '', display_order: 0, is_active: true })
    }
    setShowCountryModal(true)
  }

  const saveCurrency = async () => {
    setSaving(true)
    try {
      const url = editingCurrency 
        ? `/api/currencies/currencies/${editingCurrency.id}` 
        : '/api/currencies/currencies'
      
      const response = await fetch(url, {
        method: editingCurrency ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(currencyForm)
      })

      const data = await response.json()
      if (data.success) {
        alert(data.message)
        setShowCurrencyModal(false)
        fetchData()
      } else {
        alert(data.message)
      }
    } catch (error) {
      alert('خطأ في الحفظ')
    } finally {
      setSaving(false)
    }
  }

  const saveCountry = async () => {
    setSaving(true)
    try {
      const url = editingCountry 
        ? `/api/currencies/countries/${editingCountry.id}` 
        : '/api/currencies/countries'
      
      const response = await fetch(url, {
        method: editingCountry ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(countryForm)
      })

      const data = await response.json()
      if (data.success) {
        alert(data.message)
        setShowCountryModal(false)
        fetchData()
      } else {
        alert(data.message)
      }
    } catch (error) {
      alert('خطأ في الحفظ')
    } finally {
      setSaving(false)
    }
  }

  const deleteCurrency = async (id) => {
    if (!confirm('هل أنت متأكد من حذف هذه العملة؟')) return
    try {
      const response = await fetch(`/api/currencies/currencies/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      })
      const data = await response.json()
      if (data.success) {
        fetchData()
      } else {
        alert(data.message)
      }
    } catch (error) {
      alert('خطأ في الحذف')
    }
  }

  const deleteCountry = async (id) => {
    if (!confirm('هل أنت متأكد من حذف هذه الدولة؟')) return
    try {
      const response = await fetch(`/api/currencies/countries/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      })
      const data = await response.json()
      if (data.success) {
        fetchData()
      } else {
        alert(data.message)
      }
    } catch (error) {
      alert('خطأ في الحذف')
    }
  }

  const setDefaultCurrency = async (id) => {
    try {
      const response = await fetch(`/api/currencies/currencies/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ is_default: true })
      })
      const data = await response.json()
      if (data.success) {
        fetchData()
      }
    } catch (error) {
      alert('خطأ في التحديث')
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
      <nav className="bg-gradient-to-r from-green-600 to-teal-600 text-white p-4 shadow-lg">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold">إدارة العملات والدول</h1>
          <Link to="/admin" className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition">
            العودة للوحة الإدارة
          </Link>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-6">
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab('currencies')}
            className={`px-6 py-3 rounded-lg font-medium transition ${
              activeTab === 'currencies' 
                ? 'bg-green-500 text-white' 
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            العملات
          </button>
          <button
            onClick={() => setActiveTab('countries')}
            className={`px-6 py-3 rounded-lg font-medium transition ${
              activeTab === 'countries' 
                ? 'bg-green-500 text-white' 
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            الدول / الأسواق
          </button>
        </div>

        {activeTab === 'currencies' && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-800">العملات</h2>
              <button
                onClick={() => openCurrencyModal()}
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition"
              >
                + إضافة عملة
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-right text-sm text-gray-600">الكود</th>
                    <th className="px-4 py-3 text-right text-sm text-gray-600">الاسم</th>
                    <th className="px-4 py-3 text-right text-sm text-gray-600">الاسم العربي</th>
                    <th className="px-4 py-3 text-right text-sm text-gray-600">الرمز</th>
                    <th className="px-4 py-3 text-right text-sm text-gray-600">سعر الصرف</th>
                    <th className="px-4 py-3 text-right text-sm text-gray-600">الحالة</th>
                    <th className="px-4 py-3 text-right text-sm text-gray-600">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {currencies.map(currency => (
                    <tr key={currency.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{currency.code}</td>
                      <td className="px-4 py-3">{currency.name}</td>
                      <td className="px-4 py-3">{currency.name_ar}</td>
                      <td className="px-4 py-3 text-xl">{currency.symbol}</td>
                      <td className="px-4 py-3">{parseFloat(currency.exchange_rate).toFixed(4)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded text-xs ${
                            currency.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {currency.is_active ? 'نشط' : 'معطل'}
                          </span>
                          {currency.is_default && (
                            <span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-800">افتراضي</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => openCurrencyModal(currency)}
                            className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm transition"
                          >
                            تعديل
                          </button>
                          {!currency.is_default && (
                            <>
                              <button
                                onClick={() => setDefaultCurrency(currency.id)}
                                className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded text-sm transition"
                              >
                                جعله افتراضي
                              </button>
                              <button
                                onClick={() => deleteCurrency(currency.id)}
                                className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm transition"
                              >
                                حذف
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'countries' && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-800">الدول / الأسواق</h2>
              <button
                onClick={() => openCountryModal()}
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition"
              >
                + إضافة دولة
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {countries.map(country => (
                <div key={country.id} className={`p-4 rounded-lg border-2 ${
                  country.is_active ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'
                }`}>
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-3xl">{country.flag}</span>
                      <div>
                        <h3 className="font-bold text-gray-800">{country.name_ar}</h3>
                        <p className="text-sm text-gray-500">{country.name}</p>
                      </div>
                    </div>
                    <span className="text-sm text-gray-400">{country.code}</span>
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg font-medium text-blue-600">{country.currency_symbol}</span>
                    <span className="text-sm text-gray-600">{country.currency_name_ar || 'غير محدد'}</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openCountryModal(country)}
                      className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm transition"
                    >
                      تعديل
                    </button>
                    <button
                      onClick={() => deleteCountry(country.id)}
                      className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm transition"
                    >
                      حذف
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {showCurrencyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-xl font-bold text-gray-800 mb-6">
              {editingCurrency ? 'تعديل العملة' : 'إضافة عملة جديدة'}
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">كود العملة</label>
                  <input
                    type="text"
                    value={currencyForm.code}
                    onChange={(e) => setCurrencyForm({ ...currencyForm, code: e.target.value.toUpperCase() })}
                    placeholder="SAR"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    maxLength={5}
                    disabled={!!editingCurrency}
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">الرمز</label>
                  <input
                    type="text"
                    value={currencyForm.symbol}
                    onChange={(e) => setCurrencyForm({ ...currencyForm, symbol: e.target.value })}
                    placeholder="ر.س"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    maxLength={10}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">الاسم بالإنجليزي</label>
                <input
                  type="text"
                  value={currencyForm.name}
                  onChange={(e) => setCurrencyForm({ ...currencyForm, name: e.target.value })}
                  placeholder="Saudi Riyal"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">الاسم بالعربي</label>
                <input
                  type="text"
                  value={currencyForm.name_ar}
                  onChange={(e) => setCurrencyForm({ ...currencyForm, name_ar: e.target.value })}
                  placeholder="ريال سعودي"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">سعر الصرف (نسبة للريال السعودي)</label>
                <input
                  type="number"
                  value={currencyForm.exchange_rate}
                  onChange={(e) => setCurrencyForm({ ...currencyForm, exchange_rate: parseFloat(e.target.value) || 0 })}
                  step="0.0001"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={currencyForm.is_active}
                  onChange={(e) => setCurrencyForm({ ...currencyForm, is_active: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="text-gray-700">نشط</span>
              </label>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={saveCurrency}
                disabled={saving}
                className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg transition disabled:opacity-50"
              >
                {saving ? 'جاري الحفظ...' : 'حفظ'}
              </button>
              <button
                onClick={() => setShowCurrencyModal(false)}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 py-2 rounded-lg transition"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {showCountryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-xl font-bold text-gray-800 mb-6">
              {editingCountry ? 'تعديل الدولة' : 'إضافة دولة جديدة'}
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">كود الدولة</label>
                  <input
                    type="text"
                    value={countryForm.code}
                    onChange={(e) => setCountryForm({ ...countryForm, code: e.target.value.toUpperCase() })}
                    placeholder="SA"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    maxLength={5}
                    disabled={!!editingCountry}
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">العلم (إيموجي)</label>
                  <input
                    type="text"
                    value={countryForm.flag}
                    onChange={(e) => setCountryForm({ ...countryForm, flag: e.target.value })}
                    placeholder="🇸🇦"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    maxLength={10}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">الاسم بالإنجليزي</label>
                <input
                  type="text"
                  value={countryForm.name}
                  onChange={(e) => setCountryForm({ ...countryForm, name: e.target.value })}
                  placeholder="Saudi Arabia"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">الاسم بالعربي</label>
                <input
                  type="text"
                  value={countryForm.name_ar}
                  onChange={(e) => setCountryForm({ ...countryForm, name_ar: e.target.value })}
                  placeholder="السعودية"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">العملة</label>
                <select
                  value={countryForm.currency_id}
                  onChange={(e) => setCountryForm({ ...countryForm, currency_id: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="">اختر العملة</option>
                  {currencies.filter(c => c.is_active).map(curr => (
                    <option key={curr.id} value={curr.id}>
                      {curr.symbol} - {curr.name_ar}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">كود الهاتف</label>
                  <input
                    type="text"
                    value={countryForm.phone_code}
                    onChange={(e) => setCountryForm({ ...countryForm, phone_code: e.target.value })}
                    placeholder="+966"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">ترتيب العرض</label>
                  <input
                    type="number"
                    value={countryForm.display_order}
                    onChange={(e) => setCountryForm({ ...countryForm, display_order: parseInt(e.target.value) || 0 })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={countryForm.is_active}
                  onChange={(e) => setCountryForm({ ...countryForm, is_active: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="text-gray-700">نشط (سوق مفتوح)</span>
              </label>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={saveCountry}
                disabled={saving}
                className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg transition disabled:opacity-50"
              >
                {saving ? 'جاري الحفظ...' : 'حفظ'}
              </button>
              <button
                onClick={() => setShowCountryModal(false)}
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
