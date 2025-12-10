import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { 
  CreditCard, ArrowLeft, Globe, Check, Zap, Building2, 
  FileText, Percent, ChevronDown, ExternalLink, Loader2, X
} from 'lucide-react'

export default function PaymentGateways({ user }) {
  const [gateways, setGateways] = useState([])
  const [myGateways, setMyGateways] = useState([])
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedCountry, setSelectedCountry] = useState('all')
  const [showApplyModal, setShowApplyModal] = useState(false)
  const [selectedGateway, setSelectedGateway] = useState(null)
  const [applying, setApplying] = useState(false)
  const [applicationForm, setApplicationForm] = useState({
    business_name: '',
    business_type: '',
    commercial_register: '',
    website_url: '',
    monthly_volume: '',
    notes: ''
  })
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
      const [gatewaysRes, myGatewaysRes, appsRes] = await Promise.all([
        axios.get('/api/gateways/list'),
        axios.get('/api/gateways/my-gateways', config).catch(() => ({ data: { gateways: [] } })),
        axios.get('/api/gateways/my-applications', config).catch(() => ({ data: { applications: [] } }))
      ])

      setGateways(gatewaysRes.data.gateways || [])
      setMyGateways(myGatewaysRes.data.gateways || [])
      setApplications(appsRes.data.applications || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const countries = [
    { code: 'all', name: 'جميع الدول' },
    { code: 'SA', name: 'السعودية' },
    { code: 'AE', name: 'الإمارات' },
    { code: 'KW', name: 'الكويت' },
    { code: 'BH', name: 'البحرين' },
    { code: 'QA', name: 'قطر' },
    { code: 'OM', name: 'عمان' },
    { code: 'EG', name: 'مصر' },
    { code: 'JO', name: 'الأردن' }
  ]

  const filteredGateways = selectedCountry === 'all' 
    ? gateways 
    : gateways.filter(g => g.supported_countries?.includes(selectedCountry))

  const isGatewayActive = (gatewayId) => {
    return myGateways.some(g => g.gateway_id === gatewayId && g.is_active)
  }

  const hasPendingApplication = (gatewayId) => {
    return applications.some(a => a.gateway_id === gatewayId && a.status === 'pending')
  }

  const handleActivateInstant = async (gateway) => {
    if (!confirm(`سيتم تفعيل بوابة ${gateway.name_ar} فوراً. متابعة؟`)) return

    const token = localStorage.getItem('token')
    try {
      const res = await axios.post('/api/gateways/activate', { gateway_id: gateway.id }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.data.success) {
        alert(`تم التفعيل بنجاح!\n\nAPI Key: ${res.data.api_key}\nAPI Secret: ${res.data.api_secret}\n\nاحفظ هذه البيانات في مكان آمن`)
        fetchData()
      }
    } catch (err) {
      alert(err.response?.data?.message || 'حدث خطأ')
    }
  }

  const handleApply = async (e) => {
    e.preventDefault()
    if (!selectedGateway) return

    setApplying(true)
    const token = localStorage.getItem('token')

    try {
      const res = await axios.post('/api/gateways/apply', {
        gateway_id: selectedGateway.id,
        ...applicationForm
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (res.data.success) {
        alert('تم إرسال الطلب بنجاح! سيتم مراجعته من قبل الإدارة')
        setShowApplyModal(false)
        setApplicationForm({
          business_name: '',
          business_type: '',
          commercial_register: '',
          website_url: '',
          monthly_volume: '',
          notes: ''
        })
        fetchData()
      }
    } catch (err) {
      alert(err.response?.data?.message || 'حدث خطأ')
    } finally {
      setApplying(false)
    }
  }

  if (!user) return null

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <nav className="bg-slate-800 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-4">
              <Link to="/dashboard" className="text-gray-400 hover:text-white transition">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                <CreditCard className="w-6 h-6 text-blue-500" />
                بوابات الدفع
              </h1>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-white mb-2">اختر بوابة الدفع المناسبة لمتجرك</h2>
          <p className="text-gray-400">اختر بوابات الدفع المناسبة لدول عملائك</p>
        </div>

        <div className="bg-slate-800 rounded-xl p-4 mb-8 border border-slate-700">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-gray-300 font-medium">تصفية حسب الدولة:</span>
            <select
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
              className="bg-slate-700 text-white border border-slate-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {countries.map(c => (
                <option key={c.code} value={c.code}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        {myGateways.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-bold text-white mb-4">بواباتي المفعلة</h3>
            <div className="grid md:grid-cols-3 gap-4">
              {myGateways.filter(g => g.is_active).map(gateway => (
                <div key={gateway.id} className="bg-gradient-to-br from-green-900/50 to-emerald-900/50 rounded-xl p-4 border border-green-700">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                      <Check className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white">{gateway.name_ar}</h4>
                      <span className="text-xs text-green-400">مفعلة</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredGateways.map(gateway => {
            const isActive = isGatewayActive(gateway.id)
            const hasPending = hasPendingApplication(gateway.id)

            return (
              <div 
                key={gateway.id} 
                className={`rounded-2xl p-6 border transition-all hover:shadow-xl ${
                  gateway.is_our_gateway 
                    ? 'bg-gradient-to-br from-orange-900/80 to-amber-900/80 border-orange-500 shadow-orange-500/20 shadow-lg' 
                    : 'bg-slate-800 border-slate-700 hover:border-slate-600'
                }`}
              >
                {gateway.is_our_gateway && (
                  <div className="absolute -top-2 -right-2">
                    <span className="bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                      موصى به
                    </span>
                  </div>
                )}

                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      gateway.is_our_gateway ? 'bg-orange-500' : 'bg-slate-700'
                    }`}>
                      <CreditCard className={`w-6 h-6 ${gateway.is_our_gateway ? 'text-white' : 'text-blue-400'}`} />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-lg">{gateway.name_ar}</h3>
                      <p className="text-sm text-gray-400">{gateway.name}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex items-start gap-2">
                    <FileText className="w-4 h-4 text-gray-500 mt-1 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-gray-500">المتطلبات</p>
                      <p className="text-sm text-gray-300">{gateway.requirements_ar || 'سجل تجاري'}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <Globe className="w-4 h-4 text-gray-500 mt-1 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-gray-500">الدول المدعومة</p>
                      <p className="text-sm text-gray-300">{gateway.supported_countries?.replace(/,/g, '، ') || 'SA'}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <Percent className="w-4 h-4 text-gray-500 mt-1 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-gray-500">العمولة</p>
                      <p className="text-sm text-gray-300">{gateway.commission_rate}%</p>
                    </div>
                  </div>
                </div>

                {isActive ? (
                  <div className="bg-green-900/50 text-green-400 py-3 px-4 rounded-xl text-center font-medium flex items-center justify-center gap-2">
                    <Check className="w-5 h-5" />
                    مفعلة
                  </div>
                ) : hasPending ? (
                  <div className="bg-yellow-900/50 text-yellow-400 py-3 px-4 rounded-xl text-center font-medium flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    قيد المراجعة
                  </div>
                ) : gateway.instant_activation ? (
                  <button
                    onClick={() => handleActivateInstant(gateway)}
                    className="w-full bg-gradient-to-r from-orange-500 to-amber-500 text-white py-3 px-4 rounded-xl font-medium hover:opacity-90 transition flex items-center justify-center gap-2"
                  >
                    <Zap className="w-5 h-5" />
                    تفعيل فوري
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setSelectedGateway(gateway)
                      setShowApplyModal(true)
                    }}
                    className="w-full bg-blue-600 text-white py-3 px-4 rounded-xl font-medium hover:bg-blue-700 transition flex items-center justify-center gap-2"
                  >
                    <ExternalLink className="w-5 h-5" />
                    التقديم الآن
                  </button>
                )}

                {gateway.integration_url && (
                  <a 
                    href={gateway.integration_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="mt-3 text-sm text-blue-400 hover:text-blue-300 flex items-center justify-center gap-1"
                  >
                    طريقة الربط مع ووكومرس
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            )
          })}
        </div>

        {applications.length > 0 && (
          <div className="mt-12">
            <h3 className="text-lg font-bold text-white mb-4">طلباتي السابقة</h3>
            <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-right py-3 px-4 font-medium text-gray-400">البوابة</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-400">اسم النشاط</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-400">الحالة</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-400">التاريخ</th>
                  </tr>
                </thead>
                <tbody>
                  {applications.map(app => (
                    <tr key={app.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                      <td className="py-3 px-4 text-white">{app.name_ar}</td>
                      <td className="py-3 px-4 text-gray-300">{app.business_name}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          app.status === 'approved' ? 'bg-green-900/50 text-green-400' :
                          app.status === 'rejected' ? 'bg-red-900/50 text-red-400' :
                          'bg-yellow-900/50 text-yellow-400'
                        }`}>
                          {app.status === 'approved' ? 'مقبول' : app.status === 'rejected' ? 'مرفوض' : 'قيد المراجعة'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-400 text-sm">
                        {new Date(app.created_at).toLocaleDateString('ar-SA')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {showApplyModal && selectedGateway && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-700 flex justify-between items-center">
              <h3 className="text-xl font-bold text-white">التقديم على {selectedGateway.name_ar}</h3>
              <button onClick={() => setShowApplyModal(false)} className="text-gray-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleApply} className="p-6 space-y-4">
              <div>
                <label className="block text-gray-300 mb-2 text-sm">اسم النشاط التجاري *</label>
                <input
                  type="text"
                  required
                  value={applicationForm.business_name}
                  onChange={(e) => setApplicationForm({...applicationForm, business_name: e.target.value})}
                  className="w-full p-3 bg-slate-700 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="مثال: شركة التقنية للتجارة"
                />
              </div>

              <div>
                <label className="block text-gray-300 mb-2 text-sm">نوع النشاط *</label>
                <select
                  required
                  value={applicationForm.business_type}
                  onChange={(e) => setApplicationForm({...applicationForm, business_type: e.target.value})}
                  className="w-full p-3 bg-slate-700 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">اختر نوع النشاط</option>
                  <option value="retail">تجارة تجزئة</option>
                  <option value="wholesale">تجارة جملة</option>
                  <option value="services">خدمات</option>
                  <option value="digital">منتجات رقمية</option>
                  <option value="saas">برمجيات SaaS</option>
                  <option value="other">أخرى</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-300 mb-2 text-sm">رقم السجل التجاري</label>
                <input
                  type="text"
                  value={applicationForm.commercial_register}
                  onChange={(e) => setApplicationForm({...applicationForm, commercial_register: e.target.value})}
                  className="w-full p-3 bg-slate-700 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="اختياري"
                />
              </div>

              <div>
                <label className="block text-gray-300 mb-2 text-sm">رابط الموقع الإلكتروني</label>
                <input
                  type="url"
                  value={applicationForm.website_url}
                  onChange={(e) => setApplicationForm({...applicationForm, website_url: e.target.value})}
                  className="w-full p-3 bg-slate-700 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://example.com"
                />
              </div>

              <div>
                <label className="block text-gray-300 mb-2 text-sm">حجم المبيعات الشهري المتوقع</label>
                <select
                  value={applicationForm.monthly_volume}
                  onChange={(e) => setApplicationForm({...applicationForm, monthly_volume: e.target.value})}
                  className="w-full p-3 bg-slate-700 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">اختر</option>
                  <option value="less_10k">أقل من 10,000 ر.س</option>
                  <option value="10k_50k">10,000 - 50,000 ر.س</option>
                  <option value="50k_100k">50,000 - 100,000 ر.س</option>
                  <option value="100k_500k">100,000 - 500,000 ر.س</option>
                  <option value="more_500k">أكثر من 500,000 ر.س</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-300 mb-2 text-sm">ملاحظات إضافية</label>
                <textarea
                  value={applicationForm.notes}
                  onChange={(e) => setApplicationForm({...applicationForm, notes: e.target.value})}
                  className="w-full p-3 bg-slate-700 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="أي معلومات إضافية تود مشاركتها..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={applying}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {applying ? 'جاري الإرسال...' : 'إرسال الطلب'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowApplyModal(false)}
                  className="px-6 bg-slate-700 text-gray-300 py-3 rounded-xl font-medium hover:bg-slate-600 transition"
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
