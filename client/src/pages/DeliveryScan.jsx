import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { 
  QrCode, Shield, AlertTriangle, CheckCircle, 
  XCircle, Package, User, Phone, MapPin, Camera
} from 'lucide-react'

export default function DeliveryScan({ user }) {
  const navigate = useNavigate()
  const [qrCode, setQrCode] = useState('')
  const [qrSecret, setQrSecret] = useState('')
  const [verifiedDelivery, setVerifiedDelivery] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [step, setStep] = useState(1)
  const inputRef = useRef(null)

  useEffect(() => {
    if (!user) {
      navigate('/login')
    }
  }, [user])

  const handleVerifyScan = async () => {
    if (!qrCode.trim()) {
      setError('الرجاء إدخال كود QR')
      return
    }

    setLoading(true)
    setError('')
    
    try {
      const token = localStorage.getItem('token')
      const res = await axios.post('/api/delivery/verify-scan', 
        { qr_code: qrCode.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      )

      if (res.data.success) {
        setVerifiedDelivery(res.data.data)
        setStep(2)
      }
    } catch (err) {
      setError(err.response?.data?.message || 'خطأ في التحقق من الكود')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmDelivery = async () => {
    if (!qrSecret.trim()) {
      setError('الرجاء إدخال الرمز السري')
      return
    }

    setLoading(true)
    setError('')

    try {
      const token = localStorage.getItem('token')
      const res = await axios.post('/api/delivery/confirm-delivery',
        { 
          qr_code: qrCode.trim(), 
          qr_secret: qrSecret.trim(),
          location: null
        },
        { headers: { Authorization: `Bearer ${token}` } }
      )

      if (res.data.success) {
        setSuccess('تم تأكيد التسليم بنجاح!')
        setStep(3)
      }
    } catch (err) {
      setError(err.response?.data?.message || 'خطأ في تأكيد التسليم')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setQrCode('')
    setQrSecret('')
    setVerifiedDelivery(null)
    setError('')
    setSuccess('')
    setStep(1)
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-gray-100" dir="rtl">
      <nav className="bg-gradient-to-r from-blue-600 to-purple-700 text-white p-4 shadow-lg">
        <div className="container mx-auto flex justify-between items-center">
          <Link to="/" className="text-2xl font-bold">DigiCards</Link>
          <div className="flex gap-4">
            <Link to="/dashboard" className="hover:text-blue-200">لوحة التحكم</Link>
            <span>مرحباً، {user.name}</span>
          </div>
        </div>
      </nav>

      <div className="container mx-auto p-6 max-w-2xl">
        {/* تحذير أمني رئيسي */}
        <div className="bg-red-50 border-2 border-red-500 rounded-2xl p-6 mb-8">
          <div className="flex items-start gap-4">
            <div className="bg-red-500 p-3 rounded-full">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-red-700 mb-2">تحذير أمني هام</h2>
              <ul className="text-red-600 space-y-2">
                <li className="flex items-center gap-2">
                  <XCircle className="w-5 h-5 flex-shrink-0" />
                  <span>لا تشارك كود QR مع أي شخص عبر أي وسيلة تواصل</span>
                </li>
                <li className="flex items-center gap-2">
                  <XCircle className="w-5 h-5 flex-shrink-0" />
                  <span>لا ترسل صورة الكود عبر واتساب أو تيليجرام أو البريد</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <span className="text-green-700">اعرض الكود للمندوب فقط أثناء الاستلام الفعلي</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-teal-500 to-cyan-600 p-6 text-white">
            <div className="flex items-center gap-4">
              <QrCode className="w-12 h-12" />
              <div>
                <h1 className="text-2xl font-bold">نظام تسليم المنتجات الملموسة</h1>
                <p className="opacity-90">مسح وتأكيد التسليم بأمان</p>
              </div>
            </div>
          </div>

          {/* Steps indicator */}
          <div className="flex border-b">
            <div className={`flex-1 p-4 text-center ${step >= 1 ? 'bg-teal-50 text-teal-700' : 'text-gray-400'}`}>
              <span className="font-bold">1. مسح الكود</span>
            </div>
            <div className={`flex-1 p-4 text-center ${step >= 2 ? 'bg-teal-50 text-teal-700' : 'text-gray-400'}`}>
              <span className="font-bold">2. التحقق</span>
            </div>
            <div className={`flex-1 p-4 text-center ${step >= 3 ? 'bg-green-50 text-green-700' : 'text-gray-400'}`}>
              <span className="font-bold">3. تم التسليم</span>
            </div>
          </div>

          <div className="p-6">
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                {error}
              </div>
            )}

            {step === 1 && (
              <div className="space-y-6">
                <div className="bg-gray-50 p-6 rounded-xl text-center">
                  <Camera className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">قم بمسح كود QR من جهاز العميل أو أدخله يدوياً</p>
                  
                  <div className="max-w-md mx-auto">
                    <label className="block text-right text-gray-700 mb-2 font-medium">كود QR</label>
                    <input
                      ref={inputRef}
                      type="text"
                      value={qrCode}
                      onChange={(e) => setQrCode(e.target.value)}
                      placeholder="QR_XXXXXXXXXXXXXXXX"
                      className="w-full p-4 border-2 rounded-xl font-mono text-center text-lg focus:border-teal-500 focus:outline-none"
                      dir="ltr"
                    />
                  </div>
                </div>

                <button
                  onClick={handleVerifyScan}
                  disabled={loading || !qrCode.trim()}
                  className="w-full bg-teal-500 text-white py-4 rounded-xl font-bold text-lg hover:bg-teal-600 transition disabled:opacity-50"
                >
                  {loading ? 'جاري التحقق...' : 'التحقق من الكود'}
                </button>
              </div>
            )}

            {step === 2 && verifiedDelivery && (
              <div className="space-y-6">
                <div className="bg-green-50 p-6 rounded-xl">
                  <div className="flex items-center gap-3 mb-4">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                    <span className="text-xl font-bold text-green-700">تم التحقق من الكود بنجاح</span>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-3 bg-white rounded-lg">
                      <Package className="w-6 h-6 text-teal-600" />
                      <div>
                        <p className="text-sm text-gray-500">المنتج</p>
                        <p className="font-bold">{verifiedDelivery.product_name}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-white rounded-lg">
                      <User className="w-6 h-6 text-teal-600" />
                      <div>
                        <p className="text-sm text-gray-500">اسم العميل</p>
                        <p className="font-bold">{verifiedDelivery.buyer_name || 'غير متوفر'}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-white rounded-lg">
                      <Phone className="w-6 h-6 text-teal-600" />
                      <div>
                        <p className="text-sm text-gray-500">رقم الهاتف</p>
                        <p className="font-bold">{verifiedDelivery.buyer_phone || 'غير متوفر'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* طلب الرمز السري من العميل */}
                <div className="bg-amber-50 border-2 border-amber-400 p-6 rounded-xl">
                  <div className="flex items-start gap-3 mb-4">
                    <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0" />
                    <div>
                      <p className="font-bold text-amber-800">للتأكيد، اطلب الرمز السري من العميل</p>
                      <p className="text-amber-700 text-sm">الرمز السري موجود مع كود QR في تطبيق العميل</p>
                    </div>
                  </div>
                  
                  <input
                    type="text"
                    value={qrSecret}
                    onChange={(e) => setQrSecret(e.target.value)}
                    placeholder="أدخل الرمز السري"
                    className="w-full p-4 border-2 rounded-xl font-mono text-center text-lg focus:border-amber-500 focus:outline-none"
                    dir="ltr"
                  />
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={resetForm}
                    className="flex-1 bg-gray-200 text-gray-700 py-4 rounded-xl font-bold hover:bg-gray-300 transition"
                  >
                    إلغاء
                  </button>
                  <button
                    onClick={handleConfirmDelivery}
                    disabled={loading || !qrSecret.trim()}
                    className="flex-1 bg-green-500 text-white py-4 rounded-xl font-bold text-lg hover:bg-green-600 transition disabled:opacity-50"
                  >
                    {loading ? 'جاري التأكيد...' : 'تأكيد التسليم'}
                  </button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="text-center py-8">
                <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="w-16 h-16 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-green-700 mb-2">تم التسليم بنجاح!</h2>
                <p className="text-gray-600 mb-8">تم تسجيل عملية التسليم في النظام</p>
                
                <button
                  onClick={resetForm}
                  className="bg-teal-500 text-white px-8 py-4 rounded-xl font-bold hover:bg-teal-600 transition"
                >
                  تسليم طلب آخر
                </button>
              </div>
            )}
          </div>
        </div>

        {/* معلومات إضافية */}
        <div className="mt-8 bg-blue-50 rounded-xl p-6">
          <h3 className="font-bold text-blue-800 mb-4">كيف يعمل نظام التسليم الآمن؟</h3>
          <div className="space-y-3 text-blue-700">
            <div className="flex items-start gap-3">
              <span className="bg-blue-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm flex-shrink-0">1</span>
              <p>يحصل العميل على كود QR فريد عند شراء منتج ملموس</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="bg-blue-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm flex-shrink-0">2</span>
              <p>عند التسليم، يعرض العميل الكود للمندوب من جهازه فقط</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="bg-blue-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm flex-shrink-0">3</span>
              <p>يمسح المندوب الكود ويطلب الرمز السري من العميل</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="bg-blue-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm flex-shrink-0">4</span>
              <p>بعد إدخال الرمز السري الصحيح، يتم تأكيد التسليم</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
