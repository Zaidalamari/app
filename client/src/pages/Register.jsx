import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import axios from 'axios'

export default function Register({ setUser }) {
  const [searchParams] = useSearchParams()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: 'seller',
    referral_code: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [referrerName, setReferrerName] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    const refCode = searchParams.get('ref')
    if (refCode) {
      setFormData(prev => ({ ...prev, referral_code: refCode }))
      fetchReferrerInfo(refCode)
    }
  }, [searchParams])

  const fetchReferrerInfo = async (code) => {
    try {
      const res = await axios.get(`/api/auth/referrer-info/${code}`)
      if (res.data.success && res.data.data) {
        setReferrerName(res.data.data.name)
      }
    } catch (err) {
      console.log('Could not fetch referrer info')
    }
  }

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (formData.password !== formData.confirmPassword) {
      setError('كلمات المرور غير متطابقة')
      setLoading(false)
      return
    }
    
    try {
      const res = await axios.post('/api/auth/register', formData)
      if (res.data.success) {
        localStorage.setItem('token', res.data.data.token)
        localStorage.setItem('user', JSON.stringify(res.data.data.user))
        setUser(res.data.data.user)
        navigate('/dashboard')
      }
    } catch (err) {
      setError(err.response?.data?.message || 'خطأ في التسجيل')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <h2 className="text-3xl font-bold text-center mb-8 text-gray-800">إنشاء حساب جديد</h2>
        
        {referrerName && (
          <div className="bg-green-100 text-green-700 p-4 rounded-lg mb-6 text-center">
            تمت دعوتك من قبل: <strong>{referrerName}</strong>
          </div>
        )}
        
        {error && (
          <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-6">{error}</div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-700 mb-2">الاسم الكامل</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-gray-700 mb-2">البريد الإلكتروني</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-gray-700 mb-2">رقم الجوال</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-gray-700 mb-2">نوع الحساب</label>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
            >
              <option value="seller">بائع</option>
              <option value="distributor">موزع</option>
            </select>
          </div>
          
          <div>
            <label className="block text-gray-700 mb-2">كلمة المرور</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-gray-700 mb-2">تأكيد كلمة المرور</label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {!searchParams.get('ref') && (
            <div>
              <label className="block text-gray-700 mb-2">كود الإحالة (اختياري)</label>
              <input
                type="text"
                name="referral_code"
                value={formData.referral_code}
                onChange={handleChange}
                placeholder="أدخل كود الإحالة إن وجد"
                className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-xl font-bold hover:opacity-90 transition disabled:opacity-50"
          >
            {loading ? 'جاري التسجيل...' : 'إنشاء الحساب'}
          </button>
        </form>
        
        <p className="text-center mt-6 text-gray-600">
          لديك حساب؟{' '}
          <Link to="/login" className="text-blue-600 font-bold hover:underline">تسجيل الدخول</Link>
        </p>
      </div>
    </div>
  )
}
