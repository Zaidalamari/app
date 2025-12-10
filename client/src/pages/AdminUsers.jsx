import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'

export default function AdminUsers({ user }) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [searchTerm, setSearchTerm] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'seller',
    initial_balance: 0
  })
  const navigate = useNavigate()

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/login')
      return
    }
    fetchUsers()
  }, [user])

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await axios.get('/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (res.data.success) {
        setUsers(res.data.data)
      }
    } catch (err) {
      console.error('Error fetching users:', err)
    }
    setLoading(false)
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'initial_balance' ? parseFloat(value) || 0 : value
    }))
  }

  const handleCreateUser = async (e) => {
    e.preventDefault()
    setCreating(true)
    try {
      const token = localStorage.getItem('token')
      const res = await axios.post('/api/admin/users/create', formData, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (res.data.success) {
        setMessage({ type: 'success', text: 'تم إنشاء المستخدم بنجاح' })
        setShowCreateModal(false)
        setFormData({
          name: '',
          email: '',
          phone: '',
          password: '',
          role: 'seller',
          initial_balance: 0
        })
        fetchUsers()
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'حدث خطأ' })
    }
    setCreating(false)
    setTimeout(() => setMessage({ type: '', text: '' }), 3000)
  }

  const filteredUsers = users.filter(u => 
    u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.phone?.includes(searchTerm)
  )

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
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">إدارة المستخدمين</h1>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-green-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-green-700 transition"
          >
            + إضافة مستخدم
          </button>
        </div>

        {message.text && (
          <div className={`p-4 rounded-lg mb-6 ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {message.text}
          </div>
        )}

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="mb-6">
            <input
              type="text"
              placeholder="بحث بالاسم أو البريد أو الجوال..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full p-3 border rounded-lg"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-3 text-right">#</th>
                  <th className="p-3 text-right">الاسم</th>
                  <th className="p-3 text-right">البريد الإلكتروني</th>
                  <th className="p-3 text-right">الجوال</th>
                  <th className="p-3 text-right">النوع</th>
                  <th className="p-3 text-right">الرصيد</th>
                  <th className="p-3 text-right">كود الإحالة</th>
                  <th className="p-3 text-right">تاريخ التسجيل</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u, index) => (
                  <tr key={u.id} className="border-b hover:bg-gray-50">
                    <td className="p-3">{index + 1}</td>
                    <td className="p-3 font-bold">{u.name}</td>
                    <td className="p-3">{u.email}</td>
                    <td className="p-3">{u.phone || '-'}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded text-xs ${
                        u.role === 'admin' ? 'bg-red-100 text-red-700' :
                        u.role === 'distributor' ? 'bg-purple-100 text-purple-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {u.role === 'admin' ? 'مشرف' : u.role === 'distributor' ? 'موزع' : 'بائع'}
                      </span>
                    </td>
                    <td className="p-3 font-bold text-green-600">{Number(u.balance || 0).toFixed(2)} ر.س</td>
                    <td className="p-3">
                      <code className="bg-gray-100 px-2 py-1 rounded text-sm">{u.referral_code || '-'}</code>
                    </td>
                    <td className="p-3">{new Date(u.created_at).toLocaleDateString('ar-SA')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredUsers.length === 0 && (
            <div className="text-center py-10 text-gray-500">
              لا توجد نتائج
            </div>
          )}
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-2xl font-bold mb-6">إضافة مستخدم جديد</h2>
            
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-gray-700 mb-2">الاسم الكامل *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full p-3 border rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-700 mb-2">البريد الإلكتروني *</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full p-3 border rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-700 mb-2">رقم الجوال</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="w-full p-3 border rounded-lg"
                />
              </div>

              <div>
                <label className="block text-gray-700 mb-2">كلمة المرور *</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full p-3 border rounded-lg"
                  required
                  minLength={6}
                />
              </div>

              <div>
                <label className="block text-gray-700 mb-2">نوع الحساب</label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  className="w-full p-3 border rounded-lg"
                >
                  <option value="seller">بائع</option>
                  <option value="distributor">موزع</option>
                  <option value="admin">مشرف</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-700 mb-2">الرصيد الابتدائي (ر.س)</label>
                <input
                  type="number"
                  name="initial_balance"
                  value={formData.initial_balance}
                  onChange={handleInputChange}
                  className="w-full p-3 border rounded-lg"
                  min="0"
                  step="0.01"
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 transition disabled:opacity-50"
                >
                  {creating ? 'جاري الإنشاء...' : 'إنشاء المستخدم'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-bold hover:bg-gray-300 transition"
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
