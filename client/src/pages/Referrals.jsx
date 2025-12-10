import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'

export default function Referrals({ user }) {
  const [data, setData] = useState(null)
  const [commissions, setCommissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [withdrawing, setWithdrawing] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [activeTab, setActiveTab] = useState('overview')
  const navigate = useNavigate()

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
      const headers = { Authorization: `Bearer ${token}` }

      const [referralsRes, commissionsRes] = await Promise.all([
        axios.get('/api/referrals/my-referrals', { headers }),
        axios.get('/api/referrals/commissions', { headers })
      ])

      if (referralsRes.data.success) {
        setData(referralsRes.data.data)
      }

      if (commissionsRes.data.success) {
        setCommissions(commissionsRes.data.data)
      }
    } catch (err) {
      console.error('Error fetching referral data:', err)
    }
    setLoading(false)
  }

  const handleWithdraw = async () => {
    if (!data?.stats || data.stats.total_earned <= 0) {
      setMessage({ type: 'error', text: 'لا يوجد رصيد متاح للسحب' })
      return
    }

    setWithdrawing(true)
    try {
      const token = localStorage.getItem('token')
      const res = await axios.post('/api/referrals/withdraw', {}, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (res.data.success) {
        setMessage({ type: 'success', text: res.data.message })
        fetchData()
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'حدث خطأ' })
    }
    setWithdrawing(false)
  }

  const copyReferralLink = () => {
    const link = `${window.location.origin}/register?ref=${data?.referral_code}`
    navigator.clipboard.writeText(link)
    setMessage({ type: 'success', text: 'تم نسخ رابط الإحالة!' })
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
            <Link to="/dashboard" className="hover:text-blue-200">لوحة التحكم</Link>
            <span>{user?.name}</span>
          </div>
        </div>
      </nav>

      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">نظام الإحالات والعمولات</h1>

        {message.text && (
          <div className={`p-4 rounded-lg mb-6 ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {message.text}
          </div>
        )}

        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">رابط الإحالة الخاص بك</h2>
          <div className="flex gap-4 items-center">
            <input
              type="text"
              readOnly
              value={`${window.location.origin}/register?ref=${data?.referral_code || ''}`}
              className="flex-1 p-3 border rounded-lg bg-gray-50"
            />
            <button
              onClick={copyReferralLink}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
            >
              نسخ الرابط
            </button>
          </div>
          <p className="text-gray-500 mt-2 text-sm">
            شارك هذا الرابط مع أصدقائك واحصل على عمولة من كل عملية شراء يقومون بها!
          </p>
          <p className="text-blue-600 mt-1 text-sm">
            نسبة العمولة: {data?.settings?.commission_value || 5}%
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl p-6">
            <div className="text-3xl font-bold">{data?.stats?.total_referrals || 0}</div>
            <div className="text-blue-100">إجمالي الإحالات</div>
          </div>
          <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-xl p-6">
            <div className="text-3xl font-bold">{Number(data?.stats?.total_earned || 0).toFixed(2)} ر.س</div>
            <div className="text-green-100">إجمالي الأرباح</div>
          </div>
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-xl p-6">
            <div className="text-3xl font-bold">{Number(data?.stats?.pending_amount || 0).toFixed(2)} ر.س</div>
            <div className="text-orange-100">رصيد معلق</div>
          </div>
        </div>

        {data?.stats?.total_earned > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-bold text-lg">سحب الأرباح المكتملة</h3>
                <p className="text-gray-500">يمكنك تحويل أرباحك المكتملة إلى محفظتك (الحد الأدنى: {data?.settings?.min_withdrawal || 50} ر.س)</p>
              </div>
              <button
                onClick={handleWithdraw}
                disabled={withdrawing}
                className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition disabled:opacity-50"
              >
                {withdrawing ? 'جاري التحويل...' : `تحويل ${Number(data.stats.total_earned).toFixed(2)} ر.س`}
              </button>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex-1 py-4 font-bold ${activeTab === 'overview' ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
            >
              المحالين
            </button>
            <button
              onClick={() => setActiveTab('commissions')}
              className={`flex-1 py-4 font-bold ${activeTab === 'commissions' ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
            >
              العمولات
            </button>
          </div>

          <div className="p-6">
            {activeTab === 'overview' && (
              <>
                {!data?.referrals || data.referrals.length === 0 ? (
                  <div className="text-center py-10 text-gray-500">
                    <div className="text-5xl mb-4">👥</div>
                    <p>لم تقم بإحالة أي أعضاء بعد</p>
                    <p className="text-sm">شارك رابط الإحالة الخاص بك لكسب العمولات</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="p-3 text-right">الاسم</th>
                          <th className="p-3 text-right">البريد الإلكتروني</th>
                          <th className="p-3 text-right">تاريخ التسجيل</th>
                          <th className="p-3 text-right">عدد الطلبات</th>
                          <th className="p-3 text-right">العمولات المكتسبة</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.referrals.map(ref => (
                          <tr key={ref.id} className="border-b hover:bg-gray-50">
                            <td className="p-3">{ref.name}</td>
                            <td className="p-3">{ref.email}</td>
                            <td className="p-3">{new Date(ref.created_at).toLocaleDateString('ar-SA')}</td>
                            <td className="p-3">{ref.total_orders || 0}</td>
                            <td className="p-3 text-green-600 font-bold">{Number(ref.total_commission || 0).toFixed(2)} ر.س</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}

            {activeTab === 'commissions' && (
              <>
                {commissions.length === 0 ? (
                  <div className="text-center py-10 text-gray-500">
                    <div className="text-5xl mb-4">💰</div>
                    <p>لا توجد عمولات بعد</p>
                    <p className="text-sm">ستظهر العمولات هنا عندما يقوم المحالون بعمليات شراء</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="p-3 text-right">التاريخ</th>
                          <th className="p-3 text-right">المحال</th>
                          <th className="p-3 text-right">قيمة الطلب</th>
                          <th className="p-3 text-right">العمولة</th>
                          <th className="p-3 text-right">الحالة</th>
                        </tr>
                      </thead>
                      <tbody>
                        {commissions.map(comm => (
                          <tr key={comm.id} className="border-b hover:bg-gray-50">
                            <td className="p-3">{new Date(comm.created_at).toLocaleDateString('ar-SA')}</td>
                            <td className="p-3">{comm.referred_name}</td>
                            <td className="p-3">{Number(comm.order_amount || 0).toFixed(2)} ر.س</td>
                            <td className="p-3 text-green-600 font-bold">{Number(comm.commission_amount || 0).toFixed(2)} ر.س</td>
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
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
