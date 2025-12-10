import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'

export default function AdminReferrals({ user }) {
  const [commissions, setCommissions] = useState([])
  const [stats, setStats] = useState({})
  const [settings, setSettings] = useState({
    commission_type: 'percentage',
    commission_value: 5,
    min_withdrawal: 50,
    is_active: true
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [activeTab, setActiveTab] = useState('commissions')
  const navigate = useNavigate()

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/login')
      return
    }
    fetchData()
  }, [user])

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token')
      const headers = { Authorization: `Bearer ${token}` }

      const [commissionsRes, settingsRes] = await Promise.all([
        axios.get('/api/referrals/all', { headers }),
        axios.get('/api/referrals/settings', { headers })
      ])

      if (commissionsRes.data.success) {
        setCommissions(commissionsRes.data.data)
        setStats(commissionsRes.data.stats || {})
      }

      if (settingsRes.data.success && settingsRes.data.data) {
        setSettings(settingsRes.data.data)
      }
    } catch (err) {
      console.error('Error fetching data:', err)
    }
    setLoading(false)
  }

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  const saveSettings = async () => {
    setSaving(true)
    try {
      const token = localStorage.getItem('token')
      const res = await axios.put('/api/referrals/settings', {
        commission_type: settings.commission_type,
        commission_value: settings.commission_value,
        min_withdrawal: settings.min_withdrawal,
        is_active: settings.is_active
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (res.data.success) {
        setMessage({ type: 'success', text: 'تم حفظ الإعدادات بنجاح' })
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'حدث خطأ' })
    }
    setSaving(false)
    setTimeout(() => setMessage({ type: '', text: '' }), 3000)
  }

  const updateCommissionStatus = async (commissionId, status) => {
    try {
      const token = localStorage.getItem('token')
      const res = await axios.put(`/api/referrals/commission/${commissionId}/status`, { status }, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (res.data.success) {
        setMessage({ type: 'success', text: 'تم تحديث الحالة' })
        fetchData()
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'حدث خطأ' })
    }
    setTimeout(() => setMessage({ type: '', text: '' }), 3000)
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
      <nav className="bg-gradient-to-r from-blue-600 to-purple-700 text-white p-4 shadow-lg">
        <div className="container mx-auto flex justify-between items-center">
          <Link to="/" className="text-2xl font-bold">DigiCards</Link>
          <div className="flex items-center gap-4">
            <Link to="/admin" className="hover:text-blue-200">لوحة التحكم</Link>
            <span>{user?.name}</span>
          </div>
        </div>
      </nav>

      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">إدارة نظام الإحالات</h1>

        {message.text && (
          <div className={`p-4 rounded-lg mb-6 ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {message.text}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl p-6">
            <div className="text-3xl font-bold">{stats.total_referrers || 0}</div>
            <div className="text-blue-100">المُحيلين النشطين</div>
          </div>
          <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-xl p-6">
            <div className="text-3xl font-bold">{stats.total_referred || 0}</div>
            <div className="text-green-100">إجمالي المُحالين</div>
          </div>
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-xl p-6">
            <div className="text-3xl font-bold">{Number(stats.total_commissions || 0).toFixed(2)} ر.س</div>
            <div className="text-purple-100">إجمالي العمولات</div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('commissions')}
              className={`flex-1 py-4 font-bold ${activeTab === 'commissions' ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
            >
              جميع العمولات
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex-1 py-4 font-bold ${activeTab === 'settings' ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
            >
              إعدادات العمولات
            </button>
          </div>

          <div className="p-6">
            {activeTab === 'commissions' && (
              <>
                {commissions.length === 0 ? (
                  <div className="text-center py-10 text-gray-500">
                    <div className="text-5xl mb-4">💰</div>
                    <p>لا توجد عمولات في النظام</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="p-3 text-right">المُحيل</th>
                          <th className="p-3 text-right">المُحال</th>
                          <th className="p-3 text-right">قيمة الطلب</th>
                          <th className="p-3 text-right">العمولة</th>
                          <th className="p-3 text-right">التاريخ</th>
                          <th className="p-3 text-right">الحالة</th>
                          <th className="p-3 text-right">إجراءات</th>
                        </tr>
                      </thead>
                      <tbody>
                        {commissions.map(comm => (
                          <tr key={comm.id} className="border-b hover:bg-gray-50">
                            <td className="p-3">
                              <div className="font-bold">{comm.referrer_name}</div>
                              <div className="text-sm text-gray-500">{comm.referrer_email}</div>
                            </td>
                            <td className="p-3">
                              <div className="font-bold">{comm.referred_name}</div>
                              <div className="text-sm text-gray-500">{comm.referred_email}</div>
                            </td>
                            <td className="p-3">{Number(comm.order_amount || 0).toFixed(2)} ر.س</td>
                            <td className="p-3 text-green-600 font-bold">{Number(comm.commission_amount || 0).toFixed(2)} ر.س</td>
                            <td className="p-3">{new Date(comm.created_at).toLocaleDateString('ar-SA')}</td>
                            <td className="p-3">
                              <span className={`px-2 py-1 rounded text-xs ${
                                comm.status === 'withdrawn' ? 'bg-green-100 text-green-700' :
                                comm.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                                comm.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                                'bg-yellow-100 text-yellow-700'
                              }`}>
                                {comm.status === 'withdrawn' ? 'مسحوب' : comm.status === 'completed' ? 'مكتمل' : comm.status === 'cancelled' ? 'ملغي' : 'قيد الانتظار'}
                              </span>
                            </td>
                            <td className="p-3">
                              {comm.status === 'pending' && (
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => updateCommissionStatus(comm.id, 'completed')}
                                    className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                                  >
                                    اعتماد
                                  </button>
                                  <button
                                    onClick={() => updateCommissionStatus(comm.id, 'cancelled')}
                                    className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                                  >
                                    إلغاء
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}

            {activeTab === 'settings' && (
              <div className="max-w-lg">
                <div className="space-y-6">
                  <div>
                    <label className="block text-gray-700 font-bold mb-2">تفعيل نظام الإحالات</label>
                    <select
                      value={settings.is_active ? 'true' : 'false'}
                      onChange={(e) => handleSettingChange('is_active', e.target.value === 'true')}
                      className="w-full p-3 border rounded-lg"
                    >
                      <option value="true">مفعل</option>
                      <option value="false">معطل</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-700 font-bold mb-2">نوع العمولة</label>
                    <select
                      value={settings.commission_type}
                      onChange={(e) => handleSettingChange('commission_type', e.target.value)}
                      className="w-full p-3 border rounded-lg"
                    >
                      <option value="percentage">نسبة مئوية</option>
                      <option value="fixed">مبلغ ثابت</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-700 font-bold mb-2">
                      {settings.commission_type === 'percentage' ? 'نسبة العمولة (%)' : 'مبلغ العمولة (ر.س)'}
                    </label>
                    <input
                      type="number"
                      min="0"
                      max={settings.commission_type === 'percentage' ? 100 : 10000}
                      step="0.5"
                      value={settings.commission_value}
                      onChange={(e) => handleSettingChange('commission_value', parseFloat(e.target.value))}
                      className="w-full p-3 border rounded-lg"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      {settings.commission_type === 'percentage' 
                        ? 'نسبة العمولة من قيمة كل عملية شراء' 
                        : 'مبلغ ثابت لكل عملية شراء'}
                    </p>
                  </div>

                  <div>
                    <label className="block text-gray-700 font-bold mb-2">الحد الأدنى للسحب (ر.س)</label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={settings.min_withdrawal}
                      onChange={(e) => handleSettingChange('min_withdrawal', parseFloat(e.target.value))}
                      className="w-full p-3 border rounded-lg"
                    />
                  </div>

                  <button
                    onClick={saveSettings}
                    disabled={saving}
                    className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition disabled:opacity-50"
                  >
                    {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
