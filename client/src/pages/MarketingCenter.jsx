import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'

export default function MarketingCenter({ user }) {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [wallet, setWallet] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [accounts, setAccounts] = useState([])
  const [campaigns, setCampaigns] = useState([])
  const [products, setProducts] = useState([])
  const [dashboardStats, setDashboardStats] = useState(null)
  const [analytics, setAnalytics] = useState([])
  const [topupAmount, setTopupAmount] = useState('')
  const [showCampaignModal, setShowCampaignModal] = useState(false)
  const [showAccountModal, setShowAccountModal] = useState(false)
  const [selectedPlatform, setSelectedPlatform] = useState('')
  const [accountCredentials, setAccountCredentials] = useState({ account_id: '', access_token: '' })
  const [actionLoading, setActionLoading] = useState(false)
  const [newCampaign, setNewCampaign] = useState({
    name: '',
    platform: 'meta',
    product_id: '',
    objective: 'CONVERSIONS',
    budget_type: 'daily',
    budget_amount: '',
    start_date: '',
    end_date: '',
    target_audience: {
      countries: ['SA'],
      age_min: 18,
      age_max: 65,
      genders: ['all']
    },
    creative_data: {
      headline: '',
      description: '',
      call_to_action: 'SHOP_NOW'
    }
  })

  const token = localStorage.getItem('token')

  useEffect(() => {
    const storedToken = localStorage.getItem('token')
    if (!storedToken) {
      navigate('/login')
      return
    }
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      await Promise.all([
        loadWallet(),
        loadAccounts(),
        loadCampaigns(),
        loadProducts(),
        loadDashboard()
      ])
    } catch (error) {
      console.error('Error loading data:', error)
    }
    setLoading(false)
  }

  const loadWallet = async () => {
    try {
      const res = await fetch('/api/marketing/wallet', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.success) {
        setWallet(data.wallet)
        setTransactions(data.transactions || [])
      }
    } catch (error) {
      console.error('Wallet error:', error)
    }
  }

  const loadAccounts = async () => {
    try {
      const res = await fetch('/api/marketing/accounts', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.success) {
        setAccounts(data.accounts || [])
      }
    } catch (error) {
      console.error('Accounts error:', error)
    }
  }

  const loadCampaigns = async () => {
    try {
      const res = await fetch('/api/marketing/campaigns', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.success) {
        setCampaigns(data.campaigns || [])
      }
    } catch (error) {
      console.error('Campaigns error:', error)
    }
  }

  const loadProducts = async () => {
    try {
      const res = await fetch('/api/marketing/products', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.success) {
        setProducts(data.products || [])
      }
    } catch (error) {
      console.error('Products error:', error)
    }
  }

  const loadDashboard = async () => {
    try {
      const res = await fetch('/api/marketing/dashboard', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.success) {
        setDashboardStats(data)
      }
    } catch (error) {
      console.error('Dashboard error:', error)
    }
  }

  const handleTopup = async () => {
    if (!topupAmount || parseFloat(topupAmount) <= 0) {
      alert('الرجاء إدخال مبلغ صحيح')
      return
    }

    try {
      const res = await fetch('/api/marketing/wallet/topup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ amount: parseFloat(topupAmount) })
      })
      const data = await res.json()
      if (data.success) {
        alert('تم شحن محفظة التسويق بنجاح')
        setTopupAmount('')
        loadWallet()
      } else {
        alert(data.message || 'حدث خطأ')
      }
    } catch (error) {
      alert('حدث خطأ في الاتصال')
    }
  }

  const connectAccount = async (platform) => {
    setSelectedPlatform(platform)
    setShowAccountModal(true)
  }

  const handleConnectAccount = async () => {
    if (!accountCredentials.account_id) {
      setError('الرجاء إدخال معرف الحساب الإعلاني')
      return
    }

    setActionLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/marketing/accounts/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          platform: selectedPlatform,
          account_name: `حساب ${getPlatformName(selectedPlatform)} - ${accountCredentials.account_id}`,
          account_id: accountCredentials.account_id,
          access_token: accountCredentials.access_token || null,
          ad_account_id: accountCredentials.account_id
        })
      })
      const data = await res.json()
      setActionLoading(false)
      if (data.success) {
        setShowAccountModal(false)
        setAccountCredentials({ account_id: '', access_token: '' })
        loadAccounts()
        // Show message to user about verification status
        if (data.message) {
          alert(data.message)
        }
      } else {
        setError(data.message || 'حدث خطأ في ربط الحساب')
      }
    } catch (error) {
      setActionLoading(false)
      setError('حدث خطأ في الاتصال بالخادم')
    }
  }

  const disconnectAccount = async (accountId) => {
    if (!confirm('هل أنت متأكد من إلغاء ربط هذا الحساب؟')) return

    try {
      const res = await fetch(`/api/marketing/accounts/${accountId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.success) {
        loadAccounts()
      }
    } catch (error) {
      alert('حدث خطأ')
    }
  }

  const createCampaign = async () => {
    if (!newCampaign.name || !newCampaign.budget_amount) {
      setError('الرجاء إدخال اسم الحملة والميزانية')
      return
    }

    if (parseFloat(newCampaign.budget_amount) <= 0) {
      setError('الميزانية يجب أن تكون أكبر من صفر')
      return
    }

    setActionLoading(true)
    setError(null)
    try {
      const campaignPayload = {
        ...newCampaign,
        budget_amount: parseFloat(newCampaign.budget_amount),
        target_audience: newCampaign.target_audience,
        creative_data: newCampaign.creative_data
      }
      
      const res = await fetch('/api/marketing/campaigns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(campaignPayload)
      })
      const data = await res.json()
      setActionLoading(false)
      if (data.success) {
        setShowCampaignModal(false)
        setNewCampaign({
          name: '',
          platform: 'meta',
          product_id: '',
          objective: 'CONVERSIONS',
          budget_type: 'daily',
          budget_amount: '',
          start_date: '',
          end_date: '',
          target_audience: {
            countries: ['SA'],
            age_min: 18,
            age_max: 65,
            genders: ['all']
          },
          creative_data: {
            headline: '',
            description: '',
            call_to_action: 'SHOP_NOW'
          }
        })
        loadCampaigns()
        loadDashboard()
      } else {
        setError(data.message || 'حدث خطأ في إنشاء الحملة')
      }
    } catch (error) {
      setActionLoading(false)
      setError('حدث خطأ في الاتصال بالخادم')
    }
  }

  const launchCampaign = async (campaignId) => {
    const campaign = campaigns.find(c => c.id === campaignId)
    if (campaign && wallet && parseFloat(wallet.balance) < parseFloat(campaign.budget_amount)) {
      setError(`رصيد محفظة التسويق غير كافي. الميزانية المطلوبة: ${campaign.budget_amount} ر.س، الرصيد المتاح: ${wallet.balance} ر.س`)
      return
    }

    setActionLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/marketing/campaigns/${campaignId}/launch`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      setActionLoading(false)
      if (data.success) {
        loadCampaigns()
        loadWallet()
        loadDashboard()
      } else {
        setError(data.message || 'حدث خطأ في إطلاق الحملة')
      }
    } catch (error) {
      setActionLoading(false)
      setError('حدث خطأ في الاتصال بالخادم')
    }
  }

  const pauseCampaign = async (campaignId) => {
    setActionLoading(true)
    try {
      const res = await fetch(`/api/marketing/campaigns/${campaignId}/pause`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      setActionLoading(false)
      if (data.success) {
        loadCampaigns()
      } else {
        setError(data.message || 'حدث خطأ في إيقاف الحملة')
      }
    } catch (error) {
      setActionLoading(false)
      setError('حدث خطأ في الاتصال')
    }
  }

  const deleteCampaign = async (campaignId) => {
    if (!confirm('هل أنت متأكد من حذف هذه الحملة؟')) return

    setActionLoading(true)
    try {
      const res = await fetch(`/api/marketing/campaigns/${campaignId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      setActionLoading(false)
      if (data.success) {
        loadCampaigns()
        loadDashboard()
      } else {
        setError(data.message || 'حدث خطأ في حذف الحملة')
      }
    } catch (error) {
      setActionLoading(false)
      setError('حدث خطأ')
    }
  }

  const loadCampaignAnalytics = async (campaignId) => {
    try {
      const res = await fetch(`/api/marketing/campaigns/${campaignId}/analytics`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.success) {
        setAnalytics(prev => [...prev.filter(a => a.campaign_id !== campaignId), ...data.analytics])
      }
    } catch (error) {
      console.error('Analytics error:', error)
    }
  }

  const syncCampaignAnalytics = async (campaignId, hasAccessToken = false) => {
    if (!hasAccessToken) {
      const proceed = confirm('هذا الحساب غير مربوط برمز وصول. سيتم إنشاء تحليلات تجريبية فقط.\n\nللحصول على تحليلات حقيقية، أضف رمز الوصول في إعدادات الحساب.\n\nهل تريد المتابعة؟')
      if (!proceed) return
    }
    
    setActionLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/marketing/campaigns/${campaignId}/sync-analytics`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      setActionLoading(false)
      if (data.success) {
        alert(data.message || 'تم مزامنة التحليلات بنجاح')
        loadCampaignAnalytics(campaignId)
        loadCampaigns()
      } else {
        setError(data.message || 'حدث خطأ في المزامنة')
      }
    } catch (error) {
      setActionLoading(false)
      setError('حدث خطأ في الاتصال')
    }
  }

  const getPlatformName = (platform) => {
    const names = {
      meta: 'Meta (Facebook/Instagram)',
      google: 'Google Ads',
      tiktok: 'TikTok',
      snapchat: 'Snapchat',
      twitter: 'X (Twitter)'
    }
    return names[platform] || platform
  }

  const getPlatformIcon = (platform) => {
    const icons = {
      meta: '📘',
      google: '🔍',
      tiktok: '🎵',
      snapchat: '👻',
      twitter: '🐦'
    }
    return icons[platform] || '📢'
  }

  const getStatusBadge = (status) => {
    const styles = {
      draft: 'bg-gray-100 text-gray-800',
      active: 'bg-green-100 text-green-800',
      paused: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-blue-100 text-blue-800',
      error: 'bg-red-100 text-red-800'
    }
    const labels = {
      draft: 'مسودة',
      active: 'نشط',
      paused: 'متوقف',
      completed: 'مكتمل',
      error: 'خطأ'
    }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || styles.draft}`}>
        {labels[status] || status}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-xl text-gray-600">جاري التحميل...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <nav className="bg-gradient-to-l from-purple-600 to-indigo-600 text-white p-4 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/dashboard" className="flex items-center gap-2 hover:opacity-80">
              <span className="text-2xl">📊</span>
              <span className="font-bold text-xl">مركز التسويق</span>
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <div className="bg-white/20 px-4 py-2 rounded-lg">
              <span className="text-sm opacity-80">رصيد التسويق:</span>
              <span className="font-bold mr-2">{wallet?.balance || 0} ر.س</span>
            </div>
            <Link to="/dashboard" className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition">
              العودة للوحة التحكم
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">×</button>
          </div>
        )}

        {actionLoading && (
          <div className="bg-indigo-50 border border-indigo-200 text-indigo-700 px-4 py-3 rounded-lg mb-4">
            جاري تنفيذ العملية...
          </div>
        )}

        <div className="flex gap-2 mb-6 overflow-x-auto">
          {[
            { id: 'dashboard', label: 'لوحة المعلومات', icon: '📊' },
            { id: 'wallet', label: 'المحفظة', icon: '💰' },
            { id: 'accounts', label: 'الحسابات', icon: '🔗' },
            { id: 'campaigns', label: 'الحملات', icon: '📢' },
            { id: 'analytics', label: 'التحليلات', icon: '📈' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 rounded-lg font-medium whitespace-nowrap transition ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white shadow-lg'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              <span className="ml-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm">إجمالي الحملات</p>
                    <p className="text-3xl font-bold text-gray-800">{dashboardStats?.totalCampaigns || 0}</p>
                  </div>
                  <div className="text-4xl">📢</div>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm">الحملات النشطة</p>
                    <p className="text-3xl font-bold text-green-600">{dashboardStats?.activeCampaigns || 0}</p>
                  </div>
                  <div className="text-4xl">✅</div>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm">إجمالي المصروفات</p>
                    <p className="text-3xl font-bold text-purple-600">{dashboardStats?.totalSpent || 0} ر.س</p>
                  </div>
                  <div className="text-4xl">💸</div>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm">الحسابات المربوطة</p>
                    <p className="text-3xl font-bold text-blue-600">{dashboardStats?.connectedAccounts || 0}</p>
                  </div>
                  <div className="text-4xl">🔗</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow p-6">
                <h3 className="text-lg font-bold mb-4">آخر الحملات</h3>
                {campaigns.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">لا توجد حملات بعد</p>
                ) : (
                  <div className="space-y-3">
                    {campaigns.slice(0, 5).map(campaign => (
                      <div key={campaign.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{getPlatformIcon(campaign.platform)}</span>
                          <div>
                            <p className="font-medium">{campaign.name}</p>
                            <p className="text-sm text-gray-500">{getPlatformName(campaign.platform)}</p>
                          </div>
                        </div>
                        {getStatusBadge(campaign.status)}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white rounded-xl shadow p-6">
                <h3 className="text-lg font-bold mb-4">آخر المعاملات</h3>
                {transactions.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">لا توجد معاملات بعد</p>
                ) : (
                  <div className="space-y-3">
                    {transactions.slice(0, 5).map(tx => (
                      <div key={tx.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium">{tx.description || tx.type}</p>
                          <p className="text-sm text-gray-500">{new Date(tx.created_at).toLocaleDateString('ar-SA')}</p>
                        </div>
                        <span className={`font-bold ${tx.type === 'topup' ? 'text-green-600' : 'text-red-600'}`}>
                          {tx.type === 'topup' ? '+' : '-'}{tx.amount} ر.س
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'wallet' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-l from-purple-600 to-indigo-600 rounded-2xl shadow-xl p-8 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/80 mb-2">رصيد محفظة التسويق</p>
                  <p className="text-5xl font-bold">{wallet?.balance || 0} ر.س</p>
                  <p className="text-white/60 mt-2">إجمالي المصروفات: {wallet?.total_spent || 0} ر.س</p>
                </div>
                <div className="text-8xl opacity-30">💰</div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow p-6">
              <h3 className="text-lg font-bold mb-4">شحن المحفظة</h3>
              <p className="text-gray-500 mb-4">التحويل من المحفظة الرئيسية إلى محفظة التسويق</p>
              <div className="flex gap-4">
                <input
                  type="number"
                  value={topupAmount}
                  onChange={(e) => setTopupAmount(e.target.value)}
                  placeholder="المبلغ"
                  className="flex-1 border rounded-lg px-4 py-3 text-lg"
                />
                <button
                  onClick={handleTopup}
                  className="bg-indigo-600 text-white px-8 py-3 rounded-lg hover:bg-indigo-700 transition font-medium"
                >
                  شحن المحفظة
                </button>
              </div>
              <div className="flex gap-2 mt-4">
                {[50, 100, 200, 500, 1000].map(amount => (
                  <button
                    key={amount}
                    onClick={() => setTopupAmount(amount.toString())}
                    className="px-4 py-2 border rounded-lg hover:bg-gray-50 transition"
                  >
                    {amount} ر.س
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow p-6">
              <h3 className="text-lg font-bold mb-4">سجل المعاملات</h3>
              {transactions.length === 0 ? (
                <p className="text-gray-500 text-center py-8">لا توجد معاملات بعد</p>
              ) : (
                <div className="space-y-3">
                  {transactions.map(tx => (
                    <div key={tx.id} className="flex items-center justify-between p-4 border-b last:border-0">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                          tx.type === 'topup' ? 'bg-green-100' : 'bg-red-100'
                        }`}>
                          {tx.type === 'topup' ? '⬆️' : '⬇️'}
                        </div>
                        <div>
                          <p className="font-medium">{tx.description || (tx.type === 'topup' ? 'شحن المحفظة' : 'صرف إعلاني')}</p>
                          <p className="text-sm text-gray-500">{new Date(tx.created_at).toLocaleString('ar-SA')}</p>
                          {tx.campaign_name && <p className="text-sm text-indigo-600">الحملة: {tx.campaign_name}</p>}
                        </div>
                      </div>
                      <div className="text-left">
                        <p className={`font-bold text-lg ${tx.type === 'topup' ? 'text-green-600' : 'text-red-600'}`}>
                          {tx.type === 'topup' ? '+' : '-'}{tx.amount} ر.س
                        </p>
                        <p className="text-sm text-gray-500">الرصيد: {tx.balance_after} ر.س</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'accounts' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow p-6">
              <h3 className="text-lg font-bold mb-4">ربط حسابات التواصل الاجتماعي</h3>
              <p className="text-gray-500 mb-6">اربط حساباتك الإعلانية لإدارة حملاتك من مكان واحد</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { id: 'meta', name: 'Meta (Facebook/Instagram)', icon: '📘', color: 'from-blue-500 to-blue-600' },
                  { id: 'google', name: 'Google Ads', icon: '🔍', color: 'from-red-500 to-yellow-500' },
                  { id: 'tiktok', name: 'TikTok', icon: '🎵', color: 'from-gray-800 to-gray-900' },
                  { id: 'snapchat', name: 'Snapchat', icon: '👻', color: 'from-yellow-400 to-yellow-500' },
                  { id: 'twitter', name: 'X (Twitter)', icon: '🐦', color: 'from-gray-700 to-gray-800' }
                ].map(platform => {
                  const connected = accounts.find(a => a.platform === platform.id)
                  return (
                    <div key={platform.id} className="border rounded-xl p-4">
                      <div className={`bg-gradient-to-l ${platform.color} rounded-lg p-4 text-white mb-4`}>
                        <div className="flex items-center gap-3">
                          <span className="text-3xl">{platform.icon}</span>
                          <span className="font-bold">{platform.name}</span>
                        </div>
                      </div>
                      {connected ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-green-600">
                            <span>✅</span>
                            <span>متصل</span>
                          </div>
                          <p className="text-sm text-gray-500">{connected.account_name}</p>
                          <button
                            onClick={() => disconnectAccount(connected.id)}
                            className="w-full mt-2 border border-red-300 text-red-600 px-4 py-2 rounded-lg hover:bg-red-50 transition"
                          >
                            إلغاء الربط
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => connectAccount(platform.id)}
                          className="w-full bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg transition"
                        >
                          ربط الحساب
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {accounts.length > 0 && (
              <div className="bg-white rounded-xl shadow p-6">
                <h3 className="text-lg font-bold mb-4">الحسابات المربوطة</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-right p-3">المنصة</th>
                        <th className="text-right p-3">اسم الحساب</th>
                        <th className="text-right p-3">الحالة</th>
                        <th className="text-right p-3">آخر مزامنة</th>
                        <th className="text-right p-3">الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {accounts.map(account => (
                        <tr key={account.id} className="border-t">
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <span>{getPlatformIcon(account.platform)}</span>
                              <span>{getPlatformName(account.platform)}</span>
                            </div>
                          </td>
                          <td className="p-3">{account.account_name}</td>
                          <td className="p-3">
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              account.status === 'connected' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {account.status === 'connected' ? 'متصل' : 'منفصل'}
                            </span>
                          </td>
                          <td className="p-3 text-sm text-gray-500">
                            {account.last_sync_at ? new Date(account.last_sync_at).toLocaleString('ar-SA') : 'لم تتم المزامنة'}
                          </td>
                          <td className="p-3">
                            <button
                              onClick={() => disconnectAccount(account.id)}
                              className="text-red-600 hover:text-red-800"
                            >
                              إلغاء الربط
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'campaigns' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">إدارة الحملات الإعلانية</h2>
              <button
                onClick={() => setShowCampaignModal(true)}
                className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition flex items-center gap-2"
              >
                <span>➕</span>
                إنشاء حملة جديدة
              </button>
            </div>

            {campaigns.length === 0 ? (
              <div className="bg-white rounded-xl shadow p-12 text-center">
                <div className="text-6xl mb-4">📢</div>
                <h3 className="text-xl font-bold mb-2">لا توجد حملات</h3>
                <p className="text-gray-500 mb-6">ابدأ بإنشاء حملتك الإعلانية الأولى</p>
                <button
                  onClick={() => setShowCampaignModal(true)}
                  className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition"
                >
                  إنشاء حملة جديدة
                </button>
              </div>
            ) : (
              <div className="grid gap-4">
                {campaigns.map(campaign => (
                  <div key={campaign.id} className="bg-white rounded-xl shadow p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div className="text-4xl">{getPlatformIcon(campaign.platform)}</div>
                        <div>
                          <h3 className="text-xl font-bold">{campaign.name}</h3>
                          <p className="text-gray-500">{getPlatformName(campaign.platform)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {getStatusBadge(campaign.status)}
                        <div className="flex gap-2">
                          {campaign.status === 'draft' && (
                            <button
                              onClick={() => launchCampaign(campaign.id)}
                              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition text-sm"
                            >
                              إطلاق
                            </button>
                          )}
                          {campaign.status === 'active' && (
                            <button
                              onClick={() => pauseCampaign(campaign.id)}
                              className="bg-yellow-500 text-white px-4 py-2 rounded-lg hover:bg-yellow-600 transition text-sm"
                            >
                              إيقاف
                            </button>
                          )}
                          {campaign.status === 'paused' && (
                            <button
                              onClick={() => launchCampaign(campaign.id)}
                              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition text-sm"
                            >
                              استئناف
                            </button>
                          )}
                          <button
                            onClick={() => syncCampaignAnalytics(campaign.id, campaign.has_access_token)}
                            className={`px-4 py-2 rounded-lg transition text-sm ${
                              campaign.has_access_token 
                                ? 'bg-blue-100 text-blue-600 hover:bg-blue-200' 
                                : 'bg-gray-100 text-gray-500'
                            }`}
                            title={campaign.has_access_token ? 'مزامنة التحليلات من المنصة' : 'إنشاء تحليلات تجريبية (لا يوجد رمز وصول)'}
                          >
                            🔄 {campaign.has_access_token ? 'مزامنة' : 'تجريبي'}
                          </button>
                          <button
                            onClick={() => deleteCampaign(campaign.id)}
                            className="bg-red-100 text-red-600 px-4 py-2 rounded-lg hover:bg-red-200 transition text-sm"
                          >
                            حذف
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-4 border-t">
                      <div>
                        <p className="text-gray-500 text-sm">الميزانية</p>
                        <p className="font-bold">{campaign.budget_amount} ر.س/{campaign.budget_type === 'daily' ? 'يوم' : 'إجمالي'}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-sm">المصروف</p>
                        <p className="font-bold text-purple-600">{campaign.spent_amount || 0} ر.س</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-sm">الهدف</p>
                        <p className="font-bold">{campaign.objective === 'CONVERSIONS' ? 'تحويلات' : campaign.objective}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-sm">تاريخ الإنشاء</p>
                        <p className="font-bold">{new Date(campaign.created_at).toLocaleDateString('ar-SA')}</p>
                      </div>
                    </div>

                    {campaign.metrics && Object.keys(campaign.metrics).length > 0 && (
                      <div className="grid grid-cols-4 gap-4 mt-4 pt-4 border-t bg-gray-50 rounded-lg p-4">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-blue-600">{campaign.metrics.impressions || 0}</p>
                          <p className="text-sm text-gray-500">مرات الظهور</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-green-600">{campaign.metrics.clicks || 0}</p>
                          <p className="text-sm text-gray-500">النقرات</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-purple-600">{campaign.metrics.reach || 0}</p>
                          <p className="text-sm text-gray-500">الوصول</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-orange-600">{campaign.metrics.conversions || 0}</p>
                          <p className="text-sm text-gray-500">التحويلات</p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">تحليلات الأداء</h2>
            
            {campaigns.length === 0 ? (
              <div className="bg-white rounded-xl shadow p-12 text-center">
                <div className="text-6xl mb-4">📈</div>
                <h3 className="text-xl font-bold mb-2">لا توجد بيانات</h3>
                <p className="text-gray-500">أنشئ حملات إعلانية لعرض التحليلات</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white rounded-xl shadow p-6">
                    <p className="text-gray-500 text-sm mb-2">إجمالي مرات الظهور</p>
                    <p className="text-3xl font-bold text-blue-600">
                      {campaigns.reduce((sum, c) => sum + (c.metrics?.impressions || 0), 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-white rounded-xl shadow p-6">
                    <p className="text-gray-500 text-sm mb-2">إجمالي النقرات</p>
                    <p className="text-3xl font-bold text-green-600">
                      {campaigns.reduce((sum, c) => sum + (c.metrics?.clicks || 0), 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-white rounded-xl shadow p-6">
                    <p className="text-gray-500 text-sm mb-2">إجمالي الوصول</p>
                    <p className="text-3xl font-bold text-purple-600">
                      {campaigns.reduce((sum, c) => sum + (c.metrics?.reach || 0), 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-white rounded-xl shadow p-6">
                    <p className="text-gray-500 text-sm mb-2">إجمالي التحويلات</p>
                    <p className="text-3xl font-bold text-orange-600">
                      {campaigns.reduce((sum, c) => sum + (c.metrics?.conversions || 0), 0).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow p-6">
                  <h3 className="text-lg font-bold mb-4">أداء الحملات</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-right p-3">الحملة</th>
                          <th className="text-right p-3">المنصة</th>
                          <th className="text-right p-3">الظهور</th>
                          <th className="text-right p-3">النقرات</th>
                          <th className="text-right p-3">CTR</th>
                          <th className="text-right p-3">المصروف</th>
                          <th className="text-right p-3">CPC</th>
                        </tr>
                      </thead>
                      <tbody>
                        {campaigns.map(campaign => {
                          const impressions = campaign.metrics?.impressions || 0
                          const clicks = campaign.metrics?.clicks || 0
                          const ctr = impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) : 0
                          const cpc = clicks > 0 ? (parseFloat(campaign.spent_amount || 0) / clicks).toFixed(2) : 0
                          
                          return (
                            <tr key={campaign.id} className="border-t hover:bg-gray-50">
                              <td className="p-3 font-medium">{campaign.name}</td>
                              <td className="p-3">
                                <span className="flex items-center gap-2">
                                  {getPlatformIcon(campaign.platform)}
                                  {getPlatformName(campaign.platform)}
                                </span>
                              </td>
                              <td className="p-3">{impressions.toLocaleString()}</td>
                              <td className="p-3">{clicks.toLocaleString()}</td>
                              <td className="p-3">{ctr}%</td>
                              <td className="p-3">{campaign.spent_amount || 0} ر.س</td>
                              <td className="p-3">{cpc} ر.س</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {showCampaignModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold">إنشاء حملة إعلانية جديدة</h3>
                <button onClick={() => setShowCampaignModal(false)} className="text-gray-500 hover:text-gray-700 text-2xl">×</button>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">اسم الحملة *</label>
                <input
                  type="text"
                  value={newCampaign.name}
                  onChange={(e) => setNewCampaign({...newCampaign, name: e.target.value})}
                  className="w-full border rounded-lg px-4 py-3"
                  placeholder="مثال: حملة رمضان 2024"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">المنصة الإعلانية</label>
                <select
                  value={newCampaign.platform}
                  onChange={(e) => setNewCampaign({...newCampaign, platform: e.target.value})}
                  className="w-full border rounded-lg px-4 py-3"
                >
                  <option value="meta">Meta (Facebook/Instagram)</option>
                  <option value="google">Google Ads</option>
                  <option value="tiktok">TikTok</option>
                  <option value="snapchat">Snapchat</option>
                  <option value="twitter">X (Twitter)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">المنتج (اختياري)</label>
                <select
                  value={newCampaign.product_id}
                  onChange={(e) => setNewCampaign({...newCampaign, product_id: e.target.value})}
                  className="w-full border rounded-lg px-4 py-3"
                >
                  <option value="">اختر منتج</option>
                  {products.map(product => (
                    <option key={product.id} value={product.id}>{product.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">هدف الحملة</label>
                <select
                  value={newCampaign.objective}
                  onChange={(e) => setNewCampaign({...newCampaign, objective: e.target.value})}
                  className="w-full border rounded-lg px-4 py-3"
                >
                  <option value="CONVERSIONS">التحويلات والمبيعات</option>
                  <option value="TRAFFIC">زيارات الموقع</option>
                  <option value="REACH">الوصول</option>
                  <option value="ENGAGEMENT">التفاعل</option>
                  <option value="AWARENESS">الوعي بالعلامة التجارية</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">نوع الميزانية</label>
                  <select
                    value={newCampaign.budget_type}
                    onChange={(e) => setNewCampaign({...newCampaign, budget_type: e.target.value})}
                    className="w-full border rounded-lg px-4 py-3"
                  >
                    <option value="daily">يومية</option>
                    <option value="lifetime">إجمالية</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">المبلغ (ر.س) *</label>
                  <input
                    type="number"
                    value={newCampaign.budget_amount}
                    onChange={(e) => setNewCampaign({...newCampaign, budget_amount: e.target.value})}
                    className="w-full border rounded-lg px-4 py-3"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">تاريخ البدء</label>
                  <input
                    type="date"
                    value={newCampaign.start_date}
                    onChange={(e) => setNewCampaign({...newCampaign, start_date: e.target.value})}
                    className="w-full border rounded-lg px-4 py-3"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">تاريخ الانتهاء</label>
                  <input
                    type="date"
                    value={newCampaign.end_date}
                    onChange={(e) => setNewCampaign({...newCampaign, end_date: e.target.value})}
                    className="w-full border rounded-lg px-4 py-3"
                  />
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium mb-3">الجمهور المستهدف</h4>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm mb-1">العمر من</label>
                    <input
                      type="number"
                      value={newCampaign.target_audience.age_min}
                      onChange={(e) => setNewCampaign({
                        ...newCampaign,
                        target_audience: {...newCampaign.target_audience, age_min: parseInt(e.target.value)}
                      })}
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-1">إلى</label>
                    <input
                      type="number"
                      value={newCampaign.target_audience.age_max}
                      onChange={(e) => setNewCampaign({
                        ...newCampaign,
                        target_audience: {...newCampaign.target_audience, age_max: parseInt(e.target.value)}
                      })}
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm mb-1">الجنس</label>
                    <select
                      value={newCampaign.target_audience.genders?.[0] || 'all'}
                      onChange={(e) => setNewCampaign({
                        ...newCampaign,
                        target_audience: {...newCampaign.target_audience, genders: [e.target.value]}
                      })}
                      className="w-full border rounded-lg px-3 py-2"
                    >
                      <option value="all">الكل</option>
                      <option value="male">ذكور</option>
                      <option value="female">إناث</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm mb-1">الدول المستهدفة</label>
                    <select
                      multiple
                      value={newCampaign.target_audience.countries || ['SA']}
                      onChange={(e) => setNewCampaign({
                        ...newCampaign,
                        target_audience: {
                          ...newCampaign.target_audience, 
                          countries: Array.from(e.target.selectedOptions, opt => opt.value)
                        }
                      })}
                      className="w-full border rounded-lg px-3 py-2 h-20"
                    >
                      <option value="SA">السعودية</option>
                      <option value="AE">الإمارات</option>
                      <option value="KW">الكويت</option>
                      <option value="BH">البحرين</option>
                      <option value="QA">قطر</option>
                      <option value="OM">عمان</option>
                      <option value="EG">مصر</option>
                      <option value="JO">الأردن</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="bg-purple-50 rounded-lg p-4">
                <h4 className="font-medium mb-3">بيانات الإعلان</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm mb-1">عنوان الإعلان</label>
                    <input
                      type="text"
                      value={newCampaign.creative_data.headline}
                      onChange={(e) => setNewCampaign({
                        ...newCampaign,
                        creative_data: {...newCampaign.creative_data, headline: e.target.value}
                      })}
                      className="w-full border rounded-lg px-3 py-2"
                      placeholder="عنوان جذاب للإعلان"
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-1">نص الإعلان</label>
                    <textarea
                      value={newCampaign.creative_data.description}
                      onChange={(e) => setNewCampaign({
                        ...newCampaign,
                        creative_data: {...newCampaign.creative_data, description: e.target.value}
                      })}
                      className="w-full border rounded-lg px-3 py-2"
                      rows={3}
                      placeholder="وصف جذاب للإعلان..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-1">دعوة للإجراء</label>
                    <select
                      value={newCampaign.creative_data.call_to_action}
                      onChange={(e) => setNewCampaign({
                        ...newCampaign,
                        creative_data: {...newCampaign.creative_data, call_to_action: e.target.value}
                      })}
                      className="w-full border rounded-lg px-3 py-2"
                    >
                      <option value="SHOP_NOW">تسوق الآن</option>
                      <option value="LEARN_MORE">اعرف المزيد</option>
                      <option value="SIGN_UP">سجل الآن</option>
                      <option value="DOWNLOAD">حمل الآن</option>
                      <option value="GET_OFFER">احصل على العرض</option>
                      <option value="CONTACT_US">تواصل معنا</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t bg-gray-50 flex gap-4 justify-end">
              <button
                onClick={() => setShowCampaignModal(false)}
                className="px-6 py-3 border rounded-lg hover:bg-gray-100 transition"
              >
                إلغاء
              </button>
              <button
                onClick={createCampaign}
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
              >
                إنشاء الحملة
              </button>
            </div>
          </div>
        </div>
      )}

      {showAccountModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold">ربط حساب {getPlatformName(selectedPlatform)}</h3>
                <button onClick={() => { setShowAccountModal(false); setAccountCredentials({ account_id: '', access_token: '' }); setError(null); }} className="text-gray-500 hover:text-gray-700 text-2xl">×</button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="text-center mb-6">
                <div className="text-6xl mb-4">{getPlatformIcon(selectedPlatform)}</div>
                <p className="text-gray-600">
                  أدخل بيانات حسابك الإعلاني على {getPlatformName(selectedPlatform)} لإدارة حملاتك.
                </p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
                  {error}
                </div>
              )}
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">معرف الحساب الإعلاني *</label>
                  <input
                    type="text"
                    value={accountCredentials.account_id}
                    onChange={(e) => setAccountCredentials({...accountCredentials, account_id: e.target.value})}
                    className="w-full border rounded-lg px-4 py-3"
                    placeholder={selectedPlatform === 'meta' ? 'act_123456789' : 'معرف الحساب'}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {selectedPlatform === 'meta' && 'يمكنك العثور عليه في مدير الإعلانات > الإعدادات'}
                    {selectedPlatform === 'google' && 'يمكنك العثور عليه في Google Ads > الإعدادات'}
                    {selectedPlatform === 'tiktok' && 'يمكنك العثور عليه في TikTok Ads Manager'}
                    {selectedPlatform === 'snapchat' && 'يمكنك العثور عليه في Snapchat Ads Manager'}
                    {selectedPlatform === 'twitter' && 'يمكنك العثور عليه في Twitter Ads'}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">رمز الوصول (اختياري)</label>
                  <input
                    type="password"
                    value={accountCredentials.access_token}
                    onChange={(e) => setAccountCredentials({...accountCredentials, access_token: e.target.value})}
                    className="w-full border rounded-lg px-4 py-3"
                    placeholder="Access Token"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    مطلوب للاتصال الفعلي بالمنصة
                  </p>
                </div>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                <p className="text-blue-800 text-sm">
                  💡 يمكنك إدخال معرف الحساب فقط للبدء، وإضافة رمز الوصول لاحقاً للاتصال الكامل.
                </p>
              </div>
            </div>

            <div className="p-6 border-t bg-gray-50 flex gap-4 justify-end">
              <button
                onClick={() => { setShowAccountModal(false); setAccountCredentials({ account_id: '', access_token: '' }); setError(null); }}
                className="px-6 py-3 border rounded-lg hover:bg-gray-100 transition"
                disabled={actionLoading}
              >
                إلغاء
              </button>
              <button
                onClick={handleConnectAccount}
                disabled={actionLoading || !accountCredentials.account_id}
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading ? 'جاري الربط...' : 'ربط الحساب'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
