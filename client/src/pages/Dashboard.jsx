import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { 
  Wallet, ShoppingCart, Key, History, ArrowLeft, Users, Store, 
  Globe, Crown, Plus, CheckCircle, Circle, Settings, ExternalLink,
  Zap, Shield, TrendingUp, Clock, AlertCircle, CreditCard
} from 'lucide-react'

export default function Dashboard({ user, setUser }) {
  const [balance, setBalance] = useState(0)
  const [orders, setOrders] = useState([])
  const [transactions, setTransactions] = useState([])
  const [apiKeys, setApiKeys] = useState({ api_key: '', api_secret: '' })
  const [activeTab, setActiveTab] = useState('overview')
  const [subscription, setSubscription] = useState(null)
  const [stores, setStores] = useState([])
  const [maxStores, setMaxStores] = useState(1)
  const [domains, setDomains] = useState([])
  const [plans, setPlans] = useState([])
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
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
      const [walletRes, ordersRes, transRes, profileRes, subRes, storesRes, domainsRes, plansRes, templatesRes] = await Promise.all([
        axios.get('/api/wallet/balance', config),
        axios.get('/api/orders', config),
        axios.get('/api/wallet/transactions', config),
        axios.get('/api/auth/profile', config),
        axios.get('/api/subscriptions/my-subscription', config).catch(() => ({ data: { subscription: null, plan: { name: 'Free', name_ar: 'مجاني', max_stores: 1, max_products: 10 } } })),
        axios.get('/api/stores/my-stores', config).catch(() => ({ data: { stores: [], max_stores: 1 } })),
        axios.get('/api/domains/my-domains', config).catch(() => ({ data: { domains: [] } })),
        axios.get('/api/subscriptions/plans').catch(() => ({ data: { plans: [] } })),
        axios.get('/api/stores/templates').catch(() => ({ data: { templates: [] } }))
      ])

      setBalance(walletRes.data.data?.balance || 0)
      setOrders(ordersRes.data.data || [])
      setTransactions(transRes.data.data || [])
      setApiKeys({
        api_key: profileRes.data.data?.user?.api_key || '',
        api_secret: profileRes.data.data?.user?.api_secret || ''
      })
      setSubscription(subRes.data.subscription || subRes.data.plan)
      setStores(storesRes.data.stores || [])
      setMaxStores(storesRes.data.max_stores || 1)
      setDomains(domainsRes.data.domains || [])
      setPlans(plansRes.data.plans || [])
      setTemplates(templatesRes.data.templates || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
    navigate('/')
  }

  const regenerateApiKeys = async () => {
    const token = localStorage.getItem('token')
    try {
      const res = await axios.post('/api/auth/regenerate-api-keys', {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.data.success) {
        setApiKeys(res.data.data)
        alert('تم تجديد مفاتيح API بنجاح')
      }
    } catch (err) {
      alert('خطأ في تجديد المفاتيح')
    }
  }

  const getOnboardingSteps = () => {
    return [
      { id: 1, title: 'إنشاء حساب', completed: true, icon: CheckCircle },
      { id: 2, title: 'اختيار خطة', completed: subscription?.plan_id || subscription?.name !== 'Free', icon: subscription?.plan_id ? CheckCircle : Circle },
      { id: 3, title: 'إنشاء متجر', completed: stores.length > 0, icon: stores.length > 0 ? CheckCircle : Circle },
      { id: 4, title: 'ربط نطاق', completed: domains.length > 0, icon: domains.length > 0 ? CheckCircle : Circle },
      { id: 5, title: 'إضافة منتجات', completed: orders.length > 0, icon: orders.length > 0 ? CheckCircle : Circle }
    ]
  }

  if (!user) return null

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const onboardingSteps = getOnboardingSteps()
  const completedSteps = onboardingSteps.filter(s => s.completed).length
  const progressPercent = (completedSteps / onboardingSteps.length) * 100

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link to="/" className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Alameri Digital
            </Link>
            <div className="flex items-center gap-6">
              <span className="text-gray-600">مرحباً، {user.name}</span>
              <Link to="/products" className="text-gray-600 hover:text-blue-600 transition">المنتجات</Link>
              {user.role === 'admin' && <Link to="/admin" className="text-purple-600 hover:text-purple-700 font-medium">الإدارة</Link>}
              <button onClick={handleLogout} className="text-red-500 hover:text-red-600 transition">خروج</button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-purple-700 rounded-2xl p-6 text-white shadow-lg">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-blue-100 text-sm mb-1">رصيد المحفظة</p>
                <p className="text-3xl font-bold">{parseFloat(balance).toFixed(2)} ر.س</p>
              </div>
              <div className="bg-white/20 p-3 rounded-xl">
                <Wallet className="w-6 h-6" />
              </div>
            </div>
            <Link 
              to="/payment" 
              className="mt-4 inline-flex items-center gap-2 bg-white text-blue-600 px-4 py-2 rounded-lg font-semibold hover:bg-blue-50 transition text-sm"
            >
              <Plus className="w-4 h-4" />
              شحن المحفظة
            </Link>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-gray-500 text-sm mb-1">خطة الاشتراك</p>
                <p className="text-xl font-bold text-gray-800">
                  {subscription?.plan_name_ar || subscription?.name_ar || 'مجاني'}
                </p>
              </div>
              <div className="bg-purple-100 p-3 rounded-xl">
                <Crown className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
              <Store className="w-4 h-4" />
              <span>{stores.length} / {maxStores === -1 ? '∞' : maxStores} متاجر</span>
            </div>
            <Link 
              to="/subscriptions" 
              className="text-purple-600 hover:text-purple-700 text-sm font-medium flex items-center gap-1"
            >
              ترقية الخطة
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-gray-500 text-sm mb-1">التقدم في الإعداد</p>
                <p className="text-xl font-bold text-gray-800">{completedSteps} / {onboardingSteps.length}</p>
              </div>
              <div className="bg-green-100 p-3 rounded-xl">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
              <div 
                className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-500">{progressPercent === 100 ? 'مكتمل!' : 'أكمل الخطوات للبدء'}</p>
          </div>
        </div>

        {progressPercent < 100 && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border mb-8">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-500" />
              خطوات البداية السريعة
            </h3>
            <div className="flex flex-wrap gap-4">
              {onboardingSteps.map((step, idx) => (
                <div 
                  key={step.id} 
                  className={`flex items-center gap-3 p-3 rounded-xl border-2 transition ${
                    step.completed 
                      ? 'border-green-200 bg-green-50' 
                      : 'border-gray-200 bg-gray-50 hover:border-blue-200'
                  }`}
                >
                  {step.completed ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <div className="w-5 h-5 rounded-full border-2 border-gray-300 flex items-center justify-center text-xs text-gray-500">
                      {idx + 1}
                    </div>
                  )}
                  <span className={step.completed ? 'text-green-700' : 'text-gray-700'}>{step.title}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-3 mb-6 bg-white p-2 rounded-xl shadow-sm border">
          <TabButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} icon={<TrendingUp className="w-4 h-4" />}>نظرة عامة</TabButton>
          <TabButton active={activeTab === 'stores'} onClick={() => setActiveTab('stores')} icon={<Store className="w-4 h-4" />}>متاجري</TabButton>
          <TabButton active={activeTab === 'domains'} onClick={() => setActiveTab('domains')} icon={<Globe className="w-4 h-4" />}>النطاقات</TabButton>
          <TabButton active={activeTab === 'orders'} onClick={() => setActiveTab('orders')} icon={<ShoppingCart className="w-4 h-4" />}>طلباتي</TabButton>
          <TabButton active={activeTab === 'transactions'} onClick={() => setActiveTab('transactions')} icon={<History className="w-4 h-4" />}>المعاملات</TabButton>
          <TabButton active={activeTab === 'api'} onClick={() => setActiveTab('api')} icon={<Key className="w-4 h-4" />}>API</TabButton>
          <Link to="/referrals" className="px-4 py-2 rounded-lg font-medium bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:opacity-90 transition flex items-center gap-2 text-sm">
            <Users className="w-4 h-4" />
            الإحالات
          </Link>
          <Link to="/gateways" className="px-4 py-2 rounded-lg font-medium bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:opacity-90 transition flex items-center gap-2 text-sm">
            <CreditCard className="w-4 h-4" />
            بوابات الدفع
          </Link>
          <Link to="/integrations" className="px-4 py-2 rounded-lg font-medium bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:opacity-90 transition flex items-center gap-2 text-sm">
            <Settings className="w-4 h-4" />
            التكاملات
          </Link>
        </div>

        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid md:grid-cols-4 gap-4">
              <StatCard title="إجمالي الطلبات" value={orders.length} icon={<ShoppingCart className="w-5 h-5" />} color="blue" />
              <StatCard title="المتاجر النشطة" value={stores.filter(s => s.is_active).length} icon={<Store className="w-5 h-5" />} color="purple" />
              <StatCard title="النطاقات المربوطة" value={domains.length} icon={<Globe className="w-5 h-5" />} color="green" />
              <StatCard title="المعاملات" value={transactions.length} icon={<History className="w-5 h-5" />} color="orange" />
            </div>

            {stores.length > 0 && (
              <div className="bg-white rounded-2xl p-6 shadow-sm border">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold">متاجري</h3>
                  <Link to="/create-store" className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1">
                    <Plus className="w-4 h-4" />
                    متجر جديد
                  </Link>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {stores.slice(0, 3).map(store => (
                    <StoreCard key={store.id} store={store} />
                  ))}
                </div>
              </div>
            )}

            {stores.length === 0 && (
              <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-8 text-center border border-blue-100">
                <Store className="w-16 h-16 text-blue-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-800 mb-2">أنشئ متجرك الأول</h3>
                <p className="text-gray-600 mb-4">ابدأ ببناء متجرك الإلكتروني واختر من بين القوالب الجاهزة</p>
                <button 
                  onClick={() => setActiveTab('stores')}
                  className="bg-blue-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-blue-700 transition inline-flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  إنشاء متجر
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'stores' && (
          <StoresTab 
            stores={stores} 
            maxStores={maxStores} 
            templates={templates}
            onRefresh={fetchData}
          />
        )}

        {activeTab === 'domains' && (
          <DomainsTab 
            domains={domains} 
            stores={stores}
            onRefresh={fetchData}
          />
        )}

        {activeTab === 'orders' && (
          <div className="bg-white rounded-2xl shadow-sm border p-6">
            <h3 className="text-xl font-bold mb-4">طلباتي</h3>
            {orders.length === 0 ? (
              <div className="text-center py-12">
                <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">لا توجد طلبات بعد</p>
              </div>
            ) : (
              <div className="space-y-3">
                {orders.map(order => (
                  <div key={order.id} className="border rounded-xl p-4 flex justify-between items-center hover:bg-gray-50 transition">
                    <div>
                      <p className="font-bold text-gray-800">{order.product_name}</p>
                      <p className="text-sm text-gray-500">الكمية: {order.quantity}</p>
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-green-600">{order.total_price} ر.س</p>
                      <p className="text-sm text-gray-500">{new Date(order.created_at).toLocaleDateString('ar-SA')}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'transactions' && (
          <div className="bg-white rounded-2xl shadow-sm border p-6">
            <h3 className="text-xl font-bold mb-4">سجل المعاملات</h3>
            {transactions.length === 0 ? (
              <div className="text-center py-12">
                <History className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">لا توجد معاملات بعد</p>
              </div>
            ) : (
              <div className="space-y-3">
                {transactions.map(t => (
                  <div key={t.id} className="border rounded-xl p-4 flex justify-between items-center hover:bg-gray-50 transition">
                    <div>
                      <p className="font-bold text-gray-800">{t.description}</p>
                      <p className="text-sm text-gray-500">
                        {t.type === 'deposit' ? 'إيداع' : t.type === 'withdrawal' ? 'سحب' : t.type === 'subscription' ? 'اشتراك' : t.type === 'domain' ? 'نطاق' : 'شراء'}
                      </p>
                    </div>
                    <div className="text-left">
                      <p className={`font-bold ${t.type === 'deposit' ? 'text-green-600' : 'text-red-600'}`}>
                        {t.type === 'deposit' ? '+' : '-'}{Math.abs(t.amount)} ر.س
                      </p>
                      <p className="text-sm text-gray-500">{new Date(t.created_at).toLocaleDateString('ar-SA')}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'api' && (
          <div className="bg-white rounded-2xl shadow-sm border p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-bold">مفاتيح API</h3>
                <p className="text-gray-600">استخدم هذه المفاتيح لربط متجرك مع منصتنا</p>
              </div>
              <Link 
                to="/api-tutorial" 
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition flex items-center gap-2"
              >
                <span>دليل الربط المصور</span>
                <ArrowLeft className="w-4 h-4" />
              </Link>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-gray-700 mb-2 font-medium">API Key (مفتاح الربط)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={apiKeys.api_key || 'لم يتم توليد مفتاح بعد'}
                    readOnly
                    className="flex-1 p-4 bg-gray-100 rounded-lg font-mono text-sm border border-gray-200"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(apiKeys.api_key)
                      alert('تم نسخ المفتاح')
                    }}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition"
                    disabled={!apiKeys.api_key}
                  >
                    نسخ
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-gray-700 mb-2 font-medium">API Secret (المفتاح السري)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={apiKeys.api_secret || 'لم يتم توليد مفتاح بعد'}
                    readOnly
                    className="flex-1 p-4 bg-gray-100 rounded-lg font-mono text-sm border border-gray-200"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(apiKeys.api_secret)
                      alert('تم نسخ المفتاح السري')
                    }}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition"
                    disabled={!apiKeys.api_secret}
                  >
                    نسخ
                  </button>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={regenerateApiKeys}
                  className="bg-red-500 text-white px-6 py-3 rounded-lg hover:bg-red-600 transition"
                >
                  تجديد المفاتيح
                </button>
                <Link
                  to="/api-docs"
                  className="bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 transition"
                >
                  وثائق API
                </Link>
              </div>
            </div>

            <div className="mt-8 grid md:grid-cols-2 gap-4">
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                <h4 className="font-bold mb-2 text-blue-800">كيفية الاستخدام</h4>
                <p className="text-sm text-gray-600 mb-3">أضف المفاتيح في headers الطلب:</p>
                <pre className="p-3 bg-gray-900 text-green-400 rounded text-sm overflow-x-auto">
{`X-API-Key: ${apiKeys.api_key || 'dk_xxx'}
X-API-Secret: ${apiKeys.api_secret || 'ds_xxx'}`}
                </pre>
              </div>
              
              <div className="p-4 bg-purple-50 rounded-xl border border-purple-100">
                <h4 className="font-bold mb-2 text-purple-800">الرابط الأساسي</h4>
                <p className="text-sm text-gray-600 mb-3">استخدم هذا الرابط للاتصال بالـ API:</p>
                <pre className="p-3 bg-gray-900 text-yellow-400 rounded text-sm overflow-x-auto">
{window.location.origin}/api/v1/
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function TabButton({ children, active, onClick, icon }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 text-sm ${
        active 
          ? 'bg-blue-600 text-white shadow-sm' 
          : 'text-gray-600 hover:bg-gray-100'
      }`}
    >
      {icon}
      {children}
    </button>
  )
}

function StatCard({ title, value, icon, color }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    purple: 'bg-purple-50 text-purple-600 border-purple-100',
    green: 'bg-green-50 text-green-600 border-green-100',
    orange: 'bg-orange-50 text-orange-600 border-orange-100'
  }

  const iconColors = {
    blue: 'bg-blue-100 text-blue-600',
    purple: 'bg-purple-100 text-purple-600',
    green: 'bg-green-100 text-green-600',
    orange: 'bg-orange-100 text-orange-600'
  }
  
  return (
    <div className={`rounded-xl p-4 border ${colors[color]}`}>
      <div className="flex justify-between items-center">
        <div>
          <p className="text-sm opacity-80">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
        <div className={`p-3 rounded-xl ${iconColors[color]}`}>{icon}</div>
      </div>
    </div>
  )
}

function StoreCard({ store }) {
  return (
    <div className="border rounded-xl p-4 hover:shadow-md transition bg-white">
      <div className="flex items-start justify-between mb-3">
        <div 
          className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
          style={{ backgroundColor: store.theme_color || '#6366f1' }}
        >
          {store.name?.charAt(0) || 'M'}
        </div>
        <span className={`text-xs px-2 py-1 rounded-full ${store.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
          {store.is_active ? 'نشط' : 'معطل'}
        </span>
      </div>
      <h4 className="font-bold text-gray-800 mb-1">{store.name}</h4>
      <p className="text-sm text-gray-500 mb-3">{store.template_name || 'قالب افتراضي'}</p>
      <div className="flex gap-2">
        <a 
          href={`/store/${store.slug}`} 
          target="_blank"
          className="flex-1 text-center text-sm py-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition flex items-center justify-center gap-1"
        >
          <ExternalLink className="w-3 h-3" />
          عرض
        </a>
        <button className="flex-1 text-center text-sm py-2 rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-100 transition flex items-center justify-center gap-1">
          <Settings className="w-3 h-3" />
          إعدادات
        </button>
      </div>
    </div>
  )
}

function StoresTab({ stores, maxStores, templates, onRefresh }) {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newStore, setNewStore] = useState({ name: '', template_id: '', description: '', theme_color: '#6366f1' })
  const [creating, setCreating] = useState(false)

  const canCreateStore = maxStores === -1 || stores.length < maxStores

  const handleCreateStore = async () => {
    if (!newStore.name.trim()) {
      alert('يرجى إدخال اسم المتجر')
      return
    }

    setCreating(true)
    const token = localStorage.getItem('token')
    
    try {
      const res = await axios.post('/api/stores/create', newStore, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      if (res.data.success) {
        alert('تم إنشاء المتجر بنجاح!')
        setShowCreateModal(false)
        setNewStore({ name: '', template_id: '', description: '', theme_color: '#6366f1' })
        onRefresh()
      }
    } catch (err) {
      alert(err.response?.data?.message || 'حدث خطأ')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 shadow-sm border">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-xl font-bold">متاجري</h3>
            <p className="text-gray-500 text-sm">{stores.length} / {maxStores === -1 ? '∞' : maxStores} متاجر</p>
          </div>
          {canCreateStore && (
            <button 
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              متجر جديد
            </button>
          )}
        </div>

        {stores.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-xl">
            <Store className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h4 className="text-lg font-bold text-gray-700 mb-2">لا توجد متاجر</h4>
            <p className="text-gray-500 mb-4">أنشئ متجرك الأول الآن</p>
            <button 
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-blue-700 transition"
            >
              إنشاء متجر
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stores.map(store => (
              <StoreCard key={store.id} store={store} />
            ))}
          </div>
        )}
      </div>

      {!canCreateStore && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-yellow-800">وصلت للحد الأقصى</h4>
            <p className="text-yellow-700 text-sm">قم بترقية خطتك لإنشاء المزيد من المتاجر</p>
            <Link to="/subscriptions" className="text-yellow-800 font-medium text-sm underline mt-1 inline-block">
              ترقية الخطة
            </Link>
          </div>
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">إنشاء متجر جديد</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">اسم المتجر *</label>
                <input
                  type="text"
                  value={newStore.name}
                  onChange={e => setNewStore({...newStore, name: e.target.value})}
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="متجري الإلكتروني"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">القالب</label>
                <select
                  value={newStore.template_id}
                  onChange={e => setNewStore({...newStore, template_id: e.target.value})}
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">قالب افتراضي</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.name_ar || t.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الوصف</label>
                <textarea
                  value={newStore.description}
                  onChange={e => setNewStore({...newStore, description: e.target.value})}
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="وصف مختصر للمتجر"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">لون المتجر</label>
                <input
                  type="color"
                  value={newStore.theme_color}
                  onChange={e => setNewStore({...newStore, theme_color: e.target.value})}
                  className="w-full h-12 rounded-lg cursor-pointer"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleCreateStore}
                disabled={creating}
                className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50"
              >
                {creating ? 'جاري الإنشاء...' : 'إنشاء'}
              </button>
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-200 transition"
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

function DomainsTab({ domains, stores, onRefresh }) {
  const [showLinkModal, setShowLinkModal] = useState(false)
  const [pricing, setPricing] = useState([])
  const [newDomain, setNewDomain] = useState({ store_id: '', domain: '', billing_cycle: 'monthly' })
  const [linking, setLinking] = useState(false)

  useEffect(() => {
    fetchPricing()
  }, [])

  const fetchPricing = async () => {
    try {
      const res = await axios.get('/api/domains/pricing')
      setPricing(res.data.pricing || [])
    } catch (err) {
      console.error(err)
    }
  }

  const handleLinkDomain = async () => {
    if (!newDomain.store_id || !newDomain.domain.trim()) {
      alert('يرجى اختيار المتجر وإدخال النطاق')
      return
    }

    setLinking(true)
    const token = localStorage.getItem('token')
    
    try {
      const res = await axios.post('/api/domains/link', newDomain, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      if (res.data.success) {
        alert(res.data.message)
        setShowLinkModal(false)
        setNewDomain({ store_id: '', domain: '', billing_cycle: 'monthly' })
        onRefresh()
      }
    } catch (err) {
      alert(err.response?.data?.message || 'حدث خطأ')
    } finally {
      setLinking(false)
    }
  }

  const handleVerify = async (id) => {
    const token = localStorage.getItem('token')
    try {
      await axios.post(`/api/domains/verify/${id}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
      alert('تم التحقق من النطاق')
      onRefresh()
    } catch (err) {
      alert('فشل التحقق')
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 shadow-sm border">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-xl font-bold">نطاقاتي</h3>
            <p className="text-gray-500 text-sm">{domains.length} نطاقات مربوطة</p>
          </div>
          {stores.length > 0 && (
            <button 
              onClick={() => setShowLinkModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              ربط نطاق
            </button>
          )}
        </div>

        {domains.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-xl">
            <Globe className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h4 className="text-lg font-bold text-gray-700 mb-2">لا توجد نطاقات</h4>
            <p className="text-gray-500 mb-4">اربط نطاقك المخصص بمتجرك</p>
            {stores.length > 0 ? (
              <button 
                onClick={() => setShowLinkModal(true)}
                className="bg-blue-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-blue-700 transition"
              >
                ربط نطاق
              </button>
            ) : (
              <p className="text-gray-400 text-sm">أنشئ متجراً أولاً</p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {domains.map(domain => (
              <div key={domain.id} className="border rounded-xl p-4 hover:shadow-md transition">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${domain.dns_verified ? 'bg-green-100' : 'bg-yellow-100'}`}>
                      {domain.dns_verified ? (
                        <Shield className="w-5 h-5 text-green-600" />
                      ) : (
                        <Clock className="w-5 h-5 text-yellow-600" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-800">{domain.domain}</h4>
                      <p className="text-sm text-gray-500">المتجر: {domain.store_name}</p>
                    </div>
                  </div>
                  <div className="text-left">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      domain.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {domain.status === 'active' ? 'نشط' : 'قيد التحقق'}
                    </span>
                    <p className="text-sm text-gray-500 mt-1">
                      ينتهي: {new Date(domain.expires_at).toLocaleDateString('ar-SA')}
                    </p>
                  </div>
                </div>
                
                {!domain.dns_verified && (
                  <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-100">
                    <p className="text-sm text-yellow-800 mb-2">أضف سجل CNAME في إعدادات DNS الخاصة بك:</p>
                    <code className="text-xs bg-gray-800 text-green-400 p-2 rounded block">
                      {domain.domain} CNAME stores.digicards.com
                    </code>
                    <button 
                      onClick={() => handleVerify(domain.id)}
                      className="mt-2 text-sm text-yellow-700 font-medium hover:underline"
                    >
                      التحقق الآن
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showLinkModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">ربط نطاق جديد</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">المتجر *</label>
                <select
                  value={newDomain.store_id}
                  onChange={e => setNewDomain({...newDomain, store_id: e.target.value})}
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">اختر المتجر</option>
                  {stores.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">النطاق *</label>
                <input
                  type="text"
                  value={newDomain.domain}
                  onChange={e => setNewDomain({...newDomain, domain: e.target.value})}
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="mystore.com"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">فترة الدفع</label>
                <select
                  value={newDomain.billing_cycle}
                  onChange={e => setNewDomain({...newDomain, billing_cycle: e.target.value})}
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {pricing.map(p => (
                    <option key={p.id} value={p.name}>
                      {p.name_ar} - {p.price} ر.س {p.discount_percentage > 0 && `(خصم ${p.discount_percentage}%)`}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleLinkDomain}
                disabled={linking}
                className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50"
              >
                {linking ? 'جاري الربط...' : 'ربط النطاق'}
              </button>
              <button
                onClick={() => setShowLinkModal(false)}
                className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-200 transition"
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
