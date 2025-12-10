import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { 
  Plug, ArrowLeft, Check, X, Settings, Key, Eye, EyeOff, 
  ToggleLeft, ToggleRight, Trash2, AlertCircle, DollarSign
} from 'lucide-react'

export default function Integrations({ user }) {
  const [gateways, setGateways] = useState([])
  const [myIntegrations, setMyIntegrations] = useState([])
  const [commissions, setCommissions] = useState([])
  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState(true)
  const [selectedGateway, setSelectedGateway] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({})
  const [saving, setSaving] = useState(false)
  const [showSecrets, setShowSecrets] = useState({})
  const navigate = useNavigate()

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }
    fetchData()
  }, [user])

  const fetchData = async () => {
    const token = localStorage.getItem('token')
    const config = { headers: { Authorization: `Bearer ${token}` } }

    try {
      const [gatewaysRes, integrationsRes, commissionsRes] = await Promise.all([
        axios.get('/api/integrations/gateways', config),
        axios.get('/api/integrations/my-integrations', config),
        axios.get('/api/integrations/commissions', config).catch(() => ({ data: { transactions: [], stats: {} } }))
      ])

      setGateways(gatewaysRes.data.gateways || [])
      setMyIntegrations(integrationsRes.data.integrations || [])
      setCommissions(commissionsRes.data.transactions || [])
      setStats(commissionsRes.data.stats || {})
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleConnect = async (e) => {
    e.preventDefault()
    if (!selectedGateway) return

    setSaving(true)
    const token = localStorage.getItem('token')

    try {
      const res = await axios.post('/api/integrations/connect', {
        gateway_type: selectedGateway.type,
        api_key: formData.api_key || formData.secret_key || formData.profile_id,
        api_secret: formData.api_secret || formData.publishable_key || formData.server_key,
        merchant_id: formData.merchant_id || formData.entity_id || formData.api_id,
        is_live: formData.is_live || false,
        settings: formData
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (res.data.success) {
        alert('تم ربط البوابة بنجاح!')
        setShowForm(false)
        setSelectedGateway(null)
        setFormData({})
        fetchData()
      }
    } catch (err) {
      alert(err.response?.data?.message || 'حدث خطأ')
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async (gatewayType, currentState) => {
    const token = localStorage.getItem('token')
    try {
      await axios.post(`/api/integrations/toggle/${gatewayType}`, { is_active: !currentState }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      fetchData()
    } catch (err) {
      alert('حدث خطأ')
    }
  }

  const handleDisconnect = async (gatewayType) => {
    if (!confirm('هل أنت متأكد من فصل هذه البوابة؟')) return

    const token = localStorage.getItem('token')
    try {
      await axios.delete(`/api/integrations/disconnect/${gatewayType}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      fetchData()
    } catch (err) {
      alert('حدث خطأ')
    }
  }

  const isConnected = (gatewayType) => {
    return myIntegrations.some(i => i.gateway_type === gatewayType)
  }

  const getIntegration = (gatewayType) => {
    return myIntegrations.find(i => i.gateway_type === gatewayType)
  }

  if (!user) return null

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-4">
              <Link to="/dashboard" className="text-gray-600 hover:text-blue-600 transition">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Plug className="w-6 h-6 text-blue-600" />
                التكاملات وبوابات الدفع
              </h1>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-6 text-white mb-8">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2">اربط بوابات الدفع الخاصة بك</h2>
              <p className="text-blue-100">أضف مفاتيح API الخاصة بك لتفعيل الدفع المباشر في متجرك</p>
            </div>
            <div className="bg-white/20 p-4 rounded-xl">
              <DollarSign className="w-8 h-8" />
            </div>
          </div>
          <div className="mt-4 grid md:grid-cols-3 gap-4">
            <div className="bg-white/10 rounded-xl p-4">
              <p className="text-blue-100 text-sm">البوابات المربوطة</p>
              <p className="text-2xl font-bold">{myIntegrations.length}</p>
            </div>
            <div className="bg-white/10 rounded-xl p-4">
              <p className="text-blue-100 text-sm">إجمالي العمولات</p>
              <p className="text-2xl font-bold">{parseFloat(stats.total_commission || 0).toFixed(2)} ر.س</p>
            </div>
            <div className="bg-white/10 rounded-xl p-4">
              <p className="text-blue-100 text-sm">عدد المعاملات</p>
              <p className="text-2xl font-bold">{stats.total_transactions || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-8 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-amber-800 font-medium">ملاحظة هامة</p>
            <p className="text-amber-700 text-sm">يتم خصم عمولة 2.5% على كل عملية بيع لصالح المنصة عند استخدام بوابات الدفع الخاصة بك.</p>
          </div>
        </div>

        {myIntegrations.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-bold mb-4">البوابات المربوطة</h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myIntegrations.map(integration => (
                <div key={integration.id} className="bg-white rounded-xl border p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Plug className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-800">{integration.gateway_name}</h4>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${integration.is_live ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                          {integration.is_live ? 'وضع الإنتاج' : 'وضع الاختبار'}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleToggle(integration.gateway_type, integration.is_active)}
                      className={`${integration.is_active ? 'text-green-600' : 'text-gray-400'}`}
                    >
                      {integration.is_active ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
                    </button>
                  </div>
                  
                  <div className="space-y-2 text-sm mb-3">
                    <div className="flex justify-between">
                      <span className="text-gray-500">API Key:</span>
                      <span className="font-mono text-gray-700">{integration.api_key}</span>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setSelectedGateway(gateways.find(g => g.type === integration.gateway_type))
                        setFormData({})
                        setShowForm(true)
                      }}
                      className="flex-1 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition text-sm font-medium"
                    >
                      تحديث
                    </button>
                    <button
                      onClick={() => handleDisconnect(integration.gateway_type)}
                      className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <h3 className="text-lg font-bold mb-4">البوابات المتاحة</h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {gateways.map(gateway => {
              const connected = isConnected(gateway.type)
              
              return (
                <div 
                  key={gateway.type} 
                  className={`bg-white rounded-xl border p-4 shadow-sm transition hover:shadow-md ${connected ? 'border-green-300' : ''}`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${connected ? 'bg-green-100' : 'bg-gray-100'}`}>
                      {connected ? (
                        <Check className="w-5 h-5 text-green-600" />
                      ) : (
                        <Plug className="w-5 h-5 text-gray-500" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-800">{gateway.name_ar}</h4>
                      <p className="text-xs text-gray-500">{gateway.name}</p>
                    </div>
                  </div>
                  
                  {!connected && (
                    <button
                      onClick={() => {
                        setSelectedGateway(gateway)
                        setFormData({})
                        setShowForm(true)
                      }}
                      className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
                    >
                      ربط البوابة
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {commissions.length > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-bold mb-4">سجل العمولات</h3>
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-right py-3 px-4 font-medium text-gray-600">التاريخ</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-600">مبلغ الطلب</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-600">العمولة</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-600">البوابة</th>
                  </tr>
                </thead>
                <tbody>
                  {commissions.slice(0, 10).map(c => (
                    <tr key={c.id} className="border-t hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm">{new Date(c.created_at).toLocaleDateString('ar-SA')}</td>
                      <td className="py-3 px-4">{c.order_amount} ر.س</td>
                      <td className="py-3 px-4 text-red-600">-{c.commission_amount} ر.س</td>
                      <td className="py-3 px-4 text-sm text-gray-500">{c.gateway_type}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {showForm && selectedGateway && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex justify-between items-center">
              <h3 className="text-xl font-bold">ربط {selectedGateway.name_ar}</h3>
              <button onClick={() => { setShowForm(false); setSelectedGateway(null) }} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleConnect} className="p-6 space-y-4">
              {selectedGateway.fields.map(field => (
                <div key={field}>
                  <label className="block text-gray-700 mb-2 text-sm font-medium">{field.replace(/_/g, ' ').toUpperCase()}</label>
                  <div className="relative">
                    <input
                      type={showSecrets[field] ? 'text' : 'password'}
                      value={formData[field] || ''}
                      onChange={(e) => setFormData({...formData, [field]: e.target.value})}
                      className="w-full p-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                      placeholder={`أدخل ${field}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecrets({...showSecrets, [field]: !showSecrets[field]})}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    >
                      {showSecrets[field] ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              ))}
              
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <input
                  type="checkbox"
                  id="is_live"
                  checked={formData.is_live || false}
                  onChange={(e) => setFormData({...formData, is_live: e.target.checked})}
                  className="w-5 h-5"
                />
                <label htmlFor="is_live" className="text-gray-700">
                  تفعيل وضع الإنتاج (Live Mode)
                </label>
              </div>

              <div className="bg-amber-50 p-3 rounded-xl text-sm text-amber-700">
                <AlertCircle className="w-4 h-4 inline ml-1" />
                سيتم خصم 2.5% عمولة على كل عملية بيع
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {saving ? 'جاري الحفظ...' : 'ربط البوابة'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setSelectedGateway(null) }}
                  className="px-6 bg-gray-200 py-3 rounded-xl font-medium hover:bg-gray-300 transition"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
