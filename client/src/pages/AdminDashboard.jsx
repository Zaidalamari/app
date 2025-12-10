import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { Users, Package, ShoppingCart, DollarSign, Plus, Wallet, Server, CreditCard, ExternalLink, UserPlus, Gift, Store, Crown } from 'lucide-react'

export default function AdminDashboard({ user }) {
  const [stats, setStats] = useState({})
  const [users, setUsers] = useState([])
  const [activeTab, setActiveTab] = useState('overview')
  const [showAddProduct, setShowAddProduct] = useState(false)
  const [showAddBalance, setShowAddBalance] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [balanceAmount, setBalanceAmount] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/')
      return
    }
    fetchData()
  }, [user])

  const fetchData = async () => {
    const token = localStorage.getItem('token')
    const config = { headers: { Authorization: `Bearer ${token}` } }

    try {
      const [statsRes, usersRes] = await Promise.all([
        axios.get('/api/admin/dashboard', config),
        axios.get('/api/admin/users', config)
      ])
      setStats(statsRes.data.data || {})
      setUsers(usersRes.data.data || [])
    } catch (err) {
      console.error(err)
    }
  }

  const addBalance = async () => {
    if (!selectedUser || !balanceAmount) return
    
    const token = localStorage.getItem('token')
    try {
      await axios.post('/api/wallet/add-balance', 
        { user_id: selectedUser.id, amount: parseFloat(balanceAmount) },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      alert('تم إضافة الرصيد بنجاح')
      setShowAddBalance(false)
      setBalanceAmount('')
      fetchData()
    } catch (err) {
      alert(err.response?.data?.message || 'خطأ')
    }
  }

  if (!user || user.role !== 'admin') return null

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-purple-700 text-white p-4">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold">لوحة تحكم المشرف</h1>
          <Link to="/" className="hover:underline">العودة للرئيسية</Link>
        </div>
      </nav>

      <div className="container mx-auto p-6">
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <StatCard title="المستخدمين" value={stats.total_users} icon={<Users />} color="blue" />
          <StatCard title="الموزعين" value={stats.total_distributors} icon={<Users />} color="purple" />
          <StatCard title="الطلبات" value={stats.total_orders} icon={<ShoppingCart />} color="green" />
          <StatCard title="الإيرادات" value={`${stats.total_revenue || 0} ر.س`} icon={<DollarSign />} color="yellow" />
        </div>

        <div className="flex flex-wrap gap-4 mb-6">
          <TabBtn active={activeTab === 'overview'} onClick={() => setActiveTab('overview')}>نظرة عامة</TabBtn>
          <TabBtn active={activeTab === 'users'} onClick={() => setActiveTab('users')}>المستخدمين</TabBtn>
          <TabBtn active={activeTab === 'products'} onClick={() => setActiveTab('products')}>المنتجات</TabBtn>
          <TabBtn active={activeTab === 'integrations'} onClick={() => setActiveTab('integrations')}>التكاملات</TabBtn>
          <Link to="/admin/wallets" className="px-6 py-3 rounded-lg font-bold bg-gradient-to-r from-green-500 to-green-600 text-white flex items-center gap-2 hover:from-green-600 hover:to-green-700">
            <Wallet className="w-5 h-5" /> إدارة المحافظ
          </Link>
          <Link to="/admin/currencies" className="px-6 py-3 rounded-lg font-bold bg-gradient-to-r from-teal-500 to-emerald-600 text-white flex items-center gap-2 hover:from-teal-600 hover:to-emerald-700">
            <DollarSign className="w-5 h-5" /> العملات والدول
          </Link>
          <Link to="/admin/smm" className="px-6 py-3 rounded-lg font-bold bg-gradient-to-r from-pink-500 to-rose-600 text-white flex items-center gap-2 hover:from-pink-600 hover:to-rose-700">
            <Server className="w-5 h-5" /> مزودي SMM
          </Link>
          <Link to="/admin/prices" className="px-6 py-3 rounded-lg font-bold bg-gradient-to-r from-amber-500 to-orange-600 text-white flex items-center gap-2 hover:from-amber-600 hover:to-orange-700">
            <DollarSign className="w-5 h-5" /> إدارة الأسعار
          </Link>
          <Link to="/admin/referrals" className="px-6 py-3 rounded-lg font-bold bg-gradient-to-r from-indigo-500 to-purple-600 text-white flex items-center gap-2 hover:from-indigo-600 hover:to-purple-700">
            <Gift className="w-5 h-5" /> نظام الإحالات
          </Link>
          <Link to="/admin/users" className="px-6 py-3 rounded-lg font-bold bg-gradient-to-r from-blue-500 to-cyan-600 text-white flex items-center gap-2 hover:from-blue-600 hover:to-cyan-700">
            <UserPlus className="w-5 h-5" /> إدارة المستخدمين
          </Link>
          <Link to="/admin/subscriptions" className="px-6 py-3 rounded-lg font-bold bg-gradient-to-r from-yellow-500 to-amber-600 text-white flex items-center gap-2 hover:from-yellow-600 hover:to-amber-700">
            <Crown className="w-5 h-5" /> الاشتراكات والقوالب
          </Link>
          <Link to="/admin/gateways" className="px-6 py-3 rounded-lg font-bold bg-gradient-to-r from-orange-500 to-red-600 text-white flex items-center gap-2 hover:from-orange-600 hover:to-red-700">
            <CreditCard className="w-5 h-5" /> بوابات الدفع
          </Link>
          <Link to="/join-seller" className="px-6 py-3 rounded-lg font-bold bg-gradient-to-r from-violet-500 to-fuchsia-600 text-white flex items-center gap-2 hover:from-violet-600 hover:to-fuchsia-700">
            <Store className="w-5 h-5" /> صفحة البائع
          </Link>
        </div>

        {activeTab === 'overview' && (
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="text-xl font-bold mb-4">ملخص النظام</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-bold mb-2">المنتجات النشطة</h4>
                <p className="text-3xl font-bold text-blue-600">{stats.total_products}</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <h4 className="font-bold mb-2">الأكواد المتوفرة</h4>
                <p className="text-3xl font-bold text-green-600">{stats.available_codes}</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="text-xl font-bold mb-4">إدارة المستخدمين</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-3 text-right">الاسم</th>
                    <th className="p-3 text-right">البريد</th>
                    <th className="p-3 text-right">النوع</th>
                    <th className="p-3 text-right">الرصيد</th>
                    <th className="p-3 text-right">الحالة</th>
                    <th className="p-3 text-right">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} className="border-b">
                      <td className="p-3">{u.name}</td>
                      <td className="p-3">{u.email}</td>
                      <td className="p-3">{u.role === 'distributor' ? 'موزع' : 'بائع'}</td>
                      <td className="p-3">{parseFloat(u.balance).toFixed(2)} ر.س</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {u.is_active ? 'نشط' : 'معطل'}
                        </span>
                      </td>
                      <td className="p-3">
                        <button 
                          onClick={() => { setSelectedUser(u); setShowAddBalance(true); }}
                          className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600"
                        >
                          <Wallet className="w-4 h-4 inline" /> إضافة رصيد
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'products' && (
          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">إدارة المنتجات</h3>
              <button 
                onClick={() => setShowAddProduct(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
              >
                <Plus className="w-5 h-5" /> إضافة منتج
              </button>
            </div>
            <p className="text-gray-500">المنتجات النشطة: {stats.total_products}</p>
          </div>
        )}

        {activeTab === 'integrations' && (
          <div className="space-y-6">
            <h3 className="text-xl font-bold">التكاملات الخارجية</h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Link to="/admin/mintroute" className="bg-white rounded-xl shadow p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl flex items-center justify-center">
                    <CreditCard className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg">Alameri Digital</h4>
                    <p className="text-sm text-gray-500">بطاقات رقمية</p>
                  </div>
                </div>
                <p className="text-gray-600 text-sm mb-4">
                  استيراد وإدارة البطاقات الرقمية من Alameri Digital API
                </p>
                <div className="flex items-center text-orange-600 text-sm font-medium">
                  <span>إدارة التكامل</span>
                  <ExternalLink className="w-4 h-4 mr-1" />
                </div>
              </Link>

              <Link to="/admin/pressable" className="bg-white rounded-xl shadow p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                    <Server className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg">Pressable</h4>
                    <p className="text-sm text-gray-500">استضافة WordPress</p>
                  </div>
                </div>
                <p className="text-gray-600 text-sm mb-4">
                  إدارة مواقع WordPress والاستضافة المُدارة
                </p>
                <div className="flex items-center text-purple-600 text-sm font-medium">
                  <span>إدارة التكامل</span>
                  <ExternalLink className="w-4 h-4 mr-1" />
                </div>
              </Link>
            </div>
          </div>
        )}

        {showAddBalance && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md">
              <h3 className="text-xl font-bold mb-4">إضافة رصيد لـ {selectedUser?.name}</h3>
              <input
                type="number"
                value={balanceAmount}
                onChange={(e) => setBalanceAmount(e.target.value)}
                placeholder="المبلغ"
                className="w-full p-4 border rounded-lg mb-4"
              />
              <div className="flex gap-4">
                <button onClick={addBalance} className="flex-1 bg-green-600 text-white py-3 rounded-lg">إضافة</button>
                <button onClick={() => setShowAddBalance(false)} className="flex-1 bg-gray-300 py-3 rounded-lg">إلغاء</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ title, value, icon, color }) {
  const colors = {
    blue: 'from-blue-500 to-blue-600',
    purple: 'from-purple-500 to-purple-600',
    green: 'from-green-500 to-green-600',
    yellow: 'from-yellow-500 to-orange-500'
  }
  
  return (
    <div className={`bg-gradient-to-r ${colors[color]} rounded-xl p-6 text-white`}>
      <div className="flex justify-between">
        <div>
          <p className="opacity-80">{title}</p>
          <p className="text-3xl font-bold">{value || 0}</p>
        </div>
        <div className="opacity-50">{icon}</div>
      </div>
    </div>
  )
}

function TabBtn({ children, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-6 py-3 rounded-lg font-bold ${active ? 'bg-purple-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
    >
      {children}
    </button>
  )
}
